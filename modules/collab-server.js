// modules/collab-server.js
// ─────────────────────────────────────────────────────────────────────────────
// Servidor de colaboración en tiempo real para trabajar en un mismo proyecto por
// LAN o VPN, sin dependencias. Implementa el protocolo WebSocket (RFC 6455) sobre
// el `http` de Node. Un peer aloja la sesión (este servidor); los demás se conectan
// con `new WebSocket("ws://<ip-del-host>:<puerto>?token=…")` desde su renderer.
//
// El servidor es un HUB que retransmite (relay) los mensajes de un cliente a todos
// los demás, valida un token de sesión y notifica altas/bajas. La semántica (chat,
// sincronización de archivos, presencia) la implementa el renderer.
//
// Se cargan en Node (main process). Las funciones de protocolo (computeAcceptKey,
// encodeFrame, decodeFrames) son puras y testeables.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const crypto = require('crypto');
const http = require('http');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Clave de aceptación del handshake: base64(sha1(clave-del-cliente + GUID)).
function computeAcceptKey(secWebSocketKey) {
    return crypto.createHash('sha1').update(String(secWebSocketKey) + WS_GUID).digest('base64');
}

// Codifica un frame del SERVIDOR (sin máscara). opcode 0x1 = texto.
function encodeFrame(str, opcode) {
    opcode = opcode || 0x1;
    const payload = Buffer.from(String(str), 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

// Decodifica los frames completos de un buffer (cliente→servidor, enmascarados).
// Devuelve { frames: [{opcode, payload:Buffer}], rest: Buffer } (rest = incompleto).
function decodeFrames(buf) {
    const frames = [];
    let offset = 0;
    while (offset + 2 <= buf.length) {
        const b0 = buf[offset];
        const b1 = buf[offset + 1];
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
        let p = offset + 2;
        if (len === 126) { if (p + 2 > buf.length) break; len = buf.readUInt16BE(p); p += 2; }
        else if (len === 127) { if (p + 8 > buf.length) break; len = Number(buf.readBigUInt64BE(p)); p += 8; }
        let mask = null;
        if (masked) { if (p + 4 > buf.length) break; mask = buf.slice(p, p + 4); p += 4; }
        if (p + len > buf.length) break; // frame incompleto → espera más datos
        let payload = buf.slice(p, p + len);
        if (masked) {
            const out = Buffer.alloc(len);
            for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
            payload = out;
        }
        frames.push({ opcode, payload });
        offset = p + len;
    }
    return { frames, rest: buf.slice(offset) };
}

class CollabServer {
    constructor(opts) {
        opts = opts || {};
        this.token = opts.token || null;      // si se define, los clientes deben aportarlo
        this.clients = new Set();
        this.server = null;
        this._nextId = 1;
        this.onMessage = null;                 // (client, text) => void
        this.onJoin = null;                    // (client) => void
        this.onLeave = null;                   // (client) => void
    }

    start(port) {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => { res.writeHead(426); res.end('Solo WebSocket'); });
            this.server.on('upgrade', (req, socket) => this._handleUpgrade(req, socket));
            this.server.on('error', reject);
            this.server.listen(port, () => resolve(this.server.address().port));
        });
    }

    _handleUpgrade(req, socket) {
        const key = req.headers['sec-websocket-key'];
        if (!key) { socket.destroy(); return; }
        // Validación de token de sesión (?token=… en la URL).
        if (this.token) {
            let provided = '';
            try { provided = new URL(req.url, 'http://localhost').searchParams.get('token') || ''; } catch (e) {}
            if (provided !== this.token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
        }
        socket.write(
            'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            'Sec-WebSocket-Accept: ' + computeAcceptKey(key) + '\r\n\r\n'
        );
        const client = { socket, id: this._nextId++, buf: Buffer.alloc(0), meta: {} };
        this.clients.add(client);
        if (this.onJoin) { try { this.onJoin(client); } catch (e) {} }

        socket.on('data', (chunk) => {
            client.buf = Buffer.concat([client.buf, chunk]);
            const { frames, rest } = decodeFrames(client.buf);
            client.buf = rest;
            for (const f of frames) {
                if (f.opcode === 0x8) { this._remove(client); return; }       // close
                if (f.opcode === 0x9) { try { socket.write(encodeFrame(f.payload.toString(), 0xA)); } catch (e) {} continue; } // ping→pong
                if (f.opcode === 0x1) {
                    const text = f.payload.toString('utf8');
                    // Relay a los demás clientes.
                    this.broadcast(text, client);
                    if (this.onMessage) { try { this.onMessage(client, text); } catch (e) {} }
                }
            }
        });
        socket.on('close', () => this._remove(client));
        socket.on('error', () => this._remove(client));
    }

    _remove(client) {
        if (!this.clients.has(client)) return;
        this.clients.delete(client);
        try { client.socket.destroy(); } catch (e) {}
        if (this.onLeave) { try { this.onLeave(client); } catch (e) {} }
    }

    // Envía a todos los clientes (opcionalmente excepto uno).
    broadcast(text, except) {
        const frame = encodeFrame(text);
        for (const c of this.clients) {
            if (c === except) continue;
            try { c.socket.write(frame); } catch (e) {}
        }
    }

    send(client, text) { try { client.socket.write(encodeFrame(text)); } catch (e) {} }

    // Envía solo al cliente con ese id (para alinear a un recién llegado sin tocar al resto).
    sendToId(id, text) {
        for (const c of this.clients) if (c.id === id) { this.send(c, text); return true; }
        return false;
    }

    count() { return this.clients.size; }

    stop() {
        for (const c of this.clients) { try { c.socket.destroy(); } catch (e) {} }
        this.clients.clear();
        if (this.server) { try { this.server.close(); } catch (e) {} }
        this.server = null;
    }
}

const NexusCollab = { computeAcceptKey, encodeFrame, decodeFrames, CollabServer, WS_GUID };
if (typeof module !== 'undefined' && module.exports) module.exports = NexusCollab;
