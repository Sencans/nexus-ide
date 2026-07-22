// Tests del cliente MCP (modules/mcp-client.js).
//   npm test   (= node --test)
// Incluye un test de integración que lanza un servidor MCP SIMULADO (un pequeño
// script Node escrito a un temporal) y ejercita el ciclo initialize → tools/list →
// tools/call, todo sin dependencias ni red.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MCP = require('../modules/mcp-client.js');

// ─────────────────────────────────────────────────────────────────────────────
// frameMessages (puro): troceado de mensajes JSON-RPC por línea
// ─────────────────────────────────────────────────────────────────────────────
test('frameMessages: separa líneas completas y devuelve la parcial', () => {
    const r = MCP.frameMessages('{"a":1}\n{"b":2}\n');
    assert.deepStrictEqual(r.messages, [{ a: 1 }, { b: 2 }]);
    assert.strictEqual(r.rest, '');
});

test('frameMessages: conserva la última línea incompleta como resto', () => {
    const r = MCP.frameMessages('{"a":1}\n{"b":');
    assert.deepStrictEqual(r.messages, [{ a: 1 }]);
    assert.strictEqual(r.rest, '{"b":');
});

test('frameMessages: ignora líneas vacías y no-JSON (logs)', () => {
    const r = MCP.frameMessages('\n[info] arrancando\n{"c":3}\n');
    assert.deepStrictEqual(r.messages, [{ c: 3 }]);
    assert.strictEqual(r.rest, '');
});

// ─────────────────────────────────────────────────────────────────────────────
// Integración: cliente contra un servidor MCP simulado (stdio)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_SERVER = `
let buf = '';
process.stdin.on('data', (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === 'initialize') {
      respond(msg.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mock', version: '0.1' } });
    } else if (msg.method === 'tools/list') {
      respond(msg.id, { tools: [{ name: 'echo', description: 'Devuelve el mensaje', inputSchema: { type: 'object', properties: { msg: { type: 'string' } } } }] });
    } else if (msg.method === 'tools/call') {
      const args = (msg.params && msg.params.arguments) || {};
      if (msg.params.name === 'echo') respond(msg.id, { content: [{ type: 'text', text: 'echo: ' + (args.msg || '') }] });
      else respondError(msg.id, 'herramienta desconocida');
    }
    // notifications/initialized: sin respuesta (es una notificación)
  }
});
function respond(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\\n'); }
function respondError(id, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message } }) + '\\n'); }
`;

function writeMockServer() {
    const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-mcp-')), 'server.js');
    fs.writeFileSync(p, MOCK_SERVER);
    return p;
}

test('cliente MCP: handshake, tools/list y tools/call contra un servidor simulado', async () => {
    const serverPath = writeMockServer();
    const client = MCP.makeClient({ timeout: 8000 });
    try {
        const info = await client.connect(process.execPath, [serverPath]);
        assert.strictEqual(info.serverInfo.name, 'mock', 'initialize devuelve el serverInfo');

        const tools = await client.listTools();
        assert.strictEqual(tools.length, 1);
        assert.strictEqual(tools[0].name, 'echo');
        assert.deepStrictEqual(client.getTools(), tools, 'las tools quedan cacheadas');

        const res = await client.callTool('echo', { msg: 'hola MCP' });
        assert.strictEqual(res.content[0].text, 'echo: hola MCP');
    } finally {
        client.close();
        fs.rmSync(path.dirname(serverPath), { recursive: true, force: true });
    }
});

test('cliente MCP: una herramienta desconocida rechaza con error', async () => {
    const serverPath = writeMockServer();
    const client = MCP.makeClient({ timeout: 8000 });
    try {
        await client.connect(process.execPath, [serverPath]);
        await assert.rejects(() => client.callTool('no_existe', {}), /desconocida/);
    } finally {
        client.close();
        fs.rmSync(path.dirname(serverPath), { recursive: true, force: true });
    }
});
