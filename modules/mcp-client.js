// modules/mcp-client.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente mínimo de MCP (Model Context Protocol) sobre stdio, sin dependencias.
//
// MCP es un estándar abierto para conectar un agente a "servidores" de herramientas
// (sistemas de archivos, GitHub, bases de datos, navegadores…) sin recompilar. La
// comunicación es JSON-RPC 2.0, un mensaje por línea, sobre el stdin/stdout de un
// proceso servidor que se lanza (transport stdio).
//
// Flujo: spawn del servidor → initialize → notifications/initialized → tools/list →
// tools/call. Este cliente cubre ese ciclo.
//
// Dual-mode: window.NexusMCP en el navegador (Electron renderer) y module.exports en
// Node (tests). `frameMessages` es puro (testeable); `makeClient` acepta un `spawn`
// inyectable para poder probar con un servidor MCP simulado.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    // Divide un buffer de texto (stdout del servidor) en mensajes JSON-RPC completos
    // (uno por línea) y devuelve el resto (posible línea incompleta) para el siguiente
    // fragmento. Ignora líneas vacías o no-JSON (algunos servidores logean a stdout).
    function frameMessages(buffer) {
        const parts = String(buffer).split('\n');
        const rest = parts.pop();
        const messages = [];
        for (const line of parts) {
            const t = line.trim();
            if (!t) continue;
            try { messages.push(JSON.parse(t)); } catch { /* no-JSON: ignorar */ }
        }
        return { messages, rest };
    }

    function makeClient(opts) {
        opts = opts || {};
        const spawnFn = opts.spawn || require('child_process').spawn;
        let proc = null;
        let buf = '';
        let nextId = 1;
        const pending = new Map();
        let tools = [];
        let serverInfo = null;

        function handleMessage(msg) {
            if (msg && msg.id != null && pending.has(msg.id)) {
                const { resolve, reject } = pending.get(msg.id);
                pending.delete(msg.id);
                if (msg.error) reject(new Error((msg.error && msg.error.message) || 'MCP error'));
                else resolve(msg.result);
            }
            // Las notificaciones (sin id) se ignoran en este cliente mínimo.
        }

        function rpc(method, params, isNotification) {
            const req = { jsonrpc: '2.0', method };
            if (params !== undefined) req.params = params;
            if (isNotification) {
                proc.stdin.write(JSON.stringify(req) + '\n');
                return Promise.resolve();
            }
            const id = nextId++;
            req.id = id;
            const p = new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject });
                if (opts.timeout !== 0) {
                    setTimeout(() => {
                        if (pending.has(id)) { pending.delete(id); reject(new Error(`MCP timeout: ${method}`)); }
                    }, opts.timeout || 15000);
                }
            });
            proc.stdin.write(JSON.stringify(req) + '\n');
            return p;
        }

        return {
            // Lanza el servidor y hace el handshake (initialize + initialized).
            async connect(command, args) {
                proc = spawnFn(command, args || [], { stdio: ['pipe', 'pipe', 'pipe'] });
                proc.stdout.on('data', (d) => {
                    buf += d.toString();
                    const framed = frameMessages(buf);
                    buf = framed.rest;
                    for (const m of framed.messages) handleMessage(m);
                });
                proc.on('error', () => {
                    for (const { reject } of pending.values()) reject(new Error('MCP: proceso no disponible'));
                    pending.clear();
                });
                serverInfo = await rpc('initialize', {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'nexus-ide', version: '1.0' }
                });
                await rpc('notifications/initialized', {}, true);
                return serverInfo;
            },
            // Pide la lista de herramientas del servidor y la cachea.
            async listTools() {
                const res = await rpc('tools/list', {});
                tools = (res && res.tools) || [];
                return tools;
            },
            // Invoca una herramienta del servidor.
            async callTool(name, args) {
                return rpc('tools/call', { name: name, arguments: args || {} });
            },
            getTools() { return tools; },
            getServerInfo() { return serverInfo; },
            close() { try { if (proc) proc.kill(); } catch { /* noop */ } }
        };
    }

    const NexusMCP = { frameMessages, makeClient };
    if (typeof module !== 'undefined' && module.exports) module.exports = NexusMCP;
    if (typeof window !== 'undefined') window.NexusMCP = NexusMCP;
})();
