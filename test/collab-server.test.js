// Tests del servidor de colaboración (modules/collab-server.js).
//   npm test   (= node --test)
// Incluye protocolo puro (handshake RFC 6455, codec de frames) y una integración
// real: un servidor + dos clientes raw sobre localhost (simula dos máquinas en LAN).
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const crypto = require('node:crypto');

const C = require('../modules/collab-server.js');

// ── Protocolo puro ────────────────────────────────────────────────────────────
test('computeAcceptKey: vector oficial de la RFC 6455', () => {
    // Ejemplo canónico de la especificación.
    assert.strictEqual(C.computeAcceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('encodeFrame: cabecera correcta para payload corto (FIN + texto, sin máscara)', () => {
    const f = C.encodeFrame('hi');
    assert.strictEqual(f[0], 0x81);           // FIN=1, opcode=0x1
    assert.strictEqual(f[1], 2);              // len=2, sin máscara
    assert.strictEqual(f.slice(2).toString(), 'hi');
});

test('decodeFrames: decodifica un frame enmascarado (cliente→servidor) y respeta el resto', () => {
    const payload = Buffer.from('hola');
    const mask = Buffer.from([1, 2, 3, 4]);
    const masked = Buffer.alloc(4);
    for (let i = 0; i < 4; i++) masked[i] = payload[i] ^ mask[i & 3];
    const frame = Buffer.concat([Buffer.from([0x81, 0x84]), mask, masked]);
    // frame completo + 3 bytes de un segundo frame incompleto
    const buf = Buffer.concat([frame, Buffer.from([0x81, 0x84, 0x00])]);
    const { frames, rest } = C.decodeFrames(buf);
    assert.strictEqual(frames.length, 1);
    assert.strictEqual(frames[0].payload.toString(), 'hola');
    assert.strictEqual(rest.length, 3, 'el frame incompleto queda en rest');
});

// ── Cliente WebSocket mínimo para los tests de integración ────────────────────
function maskFrame(str) {
    const payload = Buffer.from(str, 'utf8');
    const len = payload.length;
    const mask = crypto.randomBytes(4);
    let header;
    if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
    else { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
    return Buffer.concat([header, mask, masked]);
}

function makeRawClient(port, opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
        const key = crypto.randomBytes(16).toString('base64');
        const sock = net.connect(port, '127.0.0.1', () => {
            const p = opts.token ? `/?token=${opts.token}` : '/';
            sock.write(`GET ${p} HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
        });
        let handshook = false;
        let buf = Buffer.alloc(0);
        const messages = [];
        const client = { messages, onMsg: null, send: (s) => sock.write(maskFrame(s)), close: () => sock.destroy() };
        sock.on('data', (chunk) => {
            buf = Buffer.concat([buf, chunk]);
            if (!handshook) {
                const idx = buf.indexOf('\r\n\r\n');
                if (idx === -1) return;
                const head = buf.slice(0, idx).toString();
                if (!/ 101 /.test(head)) { reject(new Error('handshake fail: ' + head.split('\r\n')[0])); sock.destroy(); return; }
                handshook = true;
                buf = buf.slice(idx + 4);
                resolve(client);
            }
            const { frames, rest } = C.decodeFrames(buf);
            buf = rest;
            for (const f of frames) if (f.opcode === 0x1) { const t = f.payload.toString(); messages.push(t); if (client.onMsg) client.onMsg(t); }
        });
        sock.on('error', reject);
    });
}

// ── Integración: servidor + 2 clientes (hub / relay) ──────────────────────────
test('CollabServer: retransmite el mensaje de un cliente a los demás (no al emisor)', async () => {
    const srv = new C.CollabServer();
    const port = await srv.start(0); // 0 = puerto libre asignado por el SO
    try {
        const a = await makeRawClient(port);
        const b = await makeRawClient(port);
        const got = new Promise((res) => { b.onMsg = res; });
        a.send('hola equipo');
        assert.strictEqual(await got, 'hola equipo');
        await new Promise((r) => setTimeout(r, 60));
        assert.strictEqual(a.messages.length, 0, 'el emisor NO recibe su propio mensaje');
        assert.strictEqual(srv.count(), 2);
        a.close(); b.close();
    } finally { srv.stop(); }
});

test('CollabServer: exige el token de sesión (rechaza el incorrecto)', async () => {
    const srv = new C.CollabServer({ token: 'secreto-123' });
    const port = await srv.start(0);
    try {
        await assert.rejects(() => makeRawClient(port, { token: 'malo' }), /handshake fail|401/);
        const ok = await makeRawClient(port, { token: 'secreto-123' });
        assert.ok(ok, 'con el token correcto sí conecta');
        ok.close();
    } finally { srv.stop(); }
});
