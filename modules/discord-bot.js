// ==========================================================================
// Nexus IDE — Bot de Discord para control remoto de AIRI (módulo del renderer)
// Usa el WebSocket nativo del navegador (Discord Gateway) y fetch (REST).
// Sin dependencias externas. Espeja los comandos del bot de Telegram.
//
// Control por MENSAJE DIRECTO (DM) al bot: el contenido de los DMs llega sin el
// intent privilegiado MESSAGE_CONTENT, así que conecta sin configuración extra.
// Comandos: /help  /status  /chat <msg>  /cmd <comando>  /approve  /deny
// Se carga en index.html DESPUÉS de app.js (usa sendRequestToAI, getApiKeyForModel,
// showActionPermissionsModal, window.activePermissionPromise).
// ==========================================================================
window.NexusDiscord = (function () {
    const API = 'https://discord.com/api/v10';
    const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
    // Intents NO privilegiados: GUILDS(1) + GUILD_MESSAGES(512) + DIRECT_MESSAGES(4096).
    // No pedimos MESSAGE_CONTENT (privilegiado) para no ser rechazados en el IDENTIFY;
    // el contenido de los DMs se recibe igualmente.
    const INTENTS = 1 | 512 | 4096;

    let ws = null, hbTimer = null, lastSeq = null, botUserId = null;
    let cfg = { token: '', channelId: '', security: 'confirm' };
    let running = false, reconnectTimer = null, lastChannel = '';

    const log = (m) => console.log('[Discord Bot]', m);

    // Elige un modelo cuyo proveedor tenga clave configurada (o local).
    function pickModel() {
        try {
            const models = window.AI_MODELS_FULL || [];
            for (const m of models) {
                const k = (typeof getApiKeyForModel === 'function') ? getApiKeyForModel(m.id) : null;
                if (k) return m.id;
            }
        } catch (e) {}
        return 'gemini-3.5-flash';
    }

    async function send(text, channelId) {
        const ch = channelId || cfg.channelId || lastChannel;
        if (!cfg.token || !ch || !text) return;
        try {
            const res = await fetch(`${API}/channels/${ch}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${cfg.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: String(text).slice(0, 1900) })
            });
            if (!res.ok) log(`sendMessage HTTP ${res.status}`);
        } catch (e) { log('Error enviando: ' + e.message); }
    }

    const gwSend = (obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

    function startHeartbeat(interval) {
        clearInterval(hbTimer);
        hbTimer = setInterval(() => gwSend({ op: 1, d: lastSeq }), interval);
    }

    function identify() {
        gwSend({ op: 2, d: { token: cfg.token, intents: INTENTS, properties: { os: 'nexus', browser: 'Nexus IDE', device: 'Nexus IDE' } } });
    }

    function connect() {
        if (!cfg.token) return;
        try { ws = new WebSocket(GATEWAY); } catch (e) { log('WS error: ' + e.message); return; }
        ws.onmessage = (ev) => {
            let p; try { p = JSON.parse(ev.data); } catch (e) { return; }
            if (p.s != null) lastSeq = p.s;
            if (p.op === 10) { startHeartbeat(p.d.heartbeat_interval); identify(); }
            else if (p.op === 1) { gwSend({ op: 1, d: lastSeq }); }        // el gateway pide heartbeat
            else if (p.op === 7 || p.op === 9) { reconnect(); }            // reconnect / invalid session
            else if (p.op === 0) {                                          // dispatch
                if (p.t === 'READY') { botUserId = p.d.user && p.d.user.id; log('conectado como ' + (p.d.user && p.d.user.username)); }
                else if (p.t === 'MESSAGE_CREATE') { handleMessage(p.d); }
            }
        };
        ws.onclose = () => { clearInterval(hbTimer); if (running) reconnect(); };
        ws.onerror = () => {};
    }

    function reconnect() {
        try { if (ws) ws.close(); } catch (e) {}
        clearTimeout(reconnectTimer);
        if (running) reconnectTimer = setTimeout(connect, 5000);
    }

    function handleMessage(msg) {
        if (!msg || !msg.content) return;
        if (msg.author && (msg.author.bot || msg.author.id === botUserId)) return; // ignora bots y a sí mismo
        lastChannel = msg.channel_id;
        processCommand(msg.content.trim(), msg.channel_id);
    }

    async function processCommand(text, channelId) {
        const reply = (t) => send(t, channelId);

        if (text === '/start' || text === '/help') {
            reply('👋 **AIRI en Discord** — comandos disponibles:\n' +
                  '`/chat <mensaje>` — habla con la IA\n' +
                  '`/cmd <comando>` — ejecuta un comando en tu terminal\n' +
                  '`/approve` · `/deny` — responde a la solicitud de permisos activa del IDE\n' +
                  '`/status` — estado del IDE y el PC');
            return;
        }
        if (text === '/status') {
            const p = (typeof process !== 'undefined') ? process : {};
            reply('🖥️ **Estado de Nexus IDE**\n' +
                  `Plataforma: ${p.platform || '?'}\n` +
                  `Uptime: ${p.uptime ? Math.floor(p.uptime()) + 's' : '?'}\n` +
                  `Seguridad: ${cfg.security}`);
            return;
        }
        if (text === '/approve' || text === '/deny') {
            if (window.activePermissionPromise) {
                const actions = text === '/approve' ? window.activePermissionPromise.actions : [];
                window.activePermissionPromise.resolve(actions);
                window.activePermissionPromise = null;
                reply(text === '/approve' ? '✅ Permisos autorizados desde Discord.' : '❌ Permisos denegados desde Discord.');
            } else {
                reply('❌ No hay ninguna solicitud de permisos activa.');
            }
            return;
        }
        if (text.startsWith('/cmd ')) {
            const cmd = text.slice(5).trim();
            if (!cmd) { reply('❌ Especifica un comando. Ej: `/cmd dir`'); return; }
            if (cfg.security === 'restricted') { reply('🔒 Ejecución remota desactivada (activa el Control de Entorno).'); return; }
            const doRun = () => {
                try {
                    const { exec } = require('child_process');
                    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
                        let out = '';
                        if (stdout) out += '```\n' + String(stdout).slice(0, 1500) + '\n```';
                        if (stderr) out += '\n**stderr:** ```\n' + String(stderr).slice(0, 800) + '\n```';
                        if (err) out += `\n❌ ${err.message}`;
                        reply(out || '✅ Ejecutado sin salida.');
                    });
                } catch (e) { reply('❌ ' + e.message); }
            };
            if (cfg.security === 'confirm' && typeof showActionPermissionsModal === 'function') {
                const approved = await showActionPermissionsModal([{ type: 'run_command', label: 'Comando remoto (Discord): ' + cmd, command: cmd }]);
                if (approved && approved.length) { reply('⏳ Ejecutando: `' + cmd + '`'); doRun(); }
                else reply('❌ Comando denegado en el IDE.');
            } else {
                reply('⚡ Ejecutando: `' + cmd + '`'); doRun();
            }
            return;
        }
        // Chat con la IA (comando /chat o texto suelto)
        let chatText = text.startsWith('/chat ') ? text.slice(6).trim() : text;
        if (!chatText) return;
        reply('💬 Procesando…');
        try {
            const sys = 'Eres AIRI, asistente de IA para el control remoto del PC. Responde de forma concisa y clara en español.';
            const r = await sendRequestToAI(pickModel(), chatText, sys, []);
            reply('🤖 ' + r);
        } catch (e) { reply('❌ Error de IA: ' + e.message); }
    }

    return {
        start(newCfg) {
            this.stop();
            cfg = Object.assign({ token: '', channelId: '', security: 'confirm' }, newCfg || {});
            if (!cfg.token) { log('sin token, no se inicia'); return; }
            running = true;
            connect();
            log('iniciado');
        },
        stop() {
            running = false;
            clearInterval(hbTimer); clearTimeout(reconnectTimer);
            try { if (ws) ws.close(); } catch (e) {}
            ws = null;
        },
        notify(text) { if (running) send(text); },
        isRunning() { return running; },
        _processCommand: processCommand,   // expuesto para pruebas
        _setSendHook(fn) { send = fn; }     // permite mockear el envío en pruebas
    };
})();
