// modules/agent-core.js
// ─────────────────────────────────────────────────────────────────────────────
// Núcleo agéntico PURO y testeable de Nexus IDE.
//
// Reúne la lógica sin estado (parsing de acciones, redacción de secretos,
// conversión de tool_calls, normalización de respuestas y confinamiento de rutas)
// en un único sitio con cobertura de tests (test/agent-core.test.js).
//
// Dual-mode:
//   • En el navegador (Electron renderer): expone `window.AgentCore`. app.js usa
//     wrappers finos que delegan aquí, así los secretos/parsing viven en un solo
//     lugar probado.
//   • En Node (tests): `module.exports = AgentCore`.
//
// No depende de ningún estado del renderer (DOM, localStorage, workspaceRoot). Las
// funciones que necesitan el workspace lo reciben como parámetro.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';
    const path = require('path');
    const fs = require('fs');

    // Redacta secretos (API keys, tokens, contraseñas, claves privadas, connection
    // strings) de un texto antes de enviarlo a un proveedor de IA en la nube.
    function redactSecrets(text) {
        if (!text || typeof text !== 'string') return text;
        const R = '«SECRETO_REDACTADO»';
        let out = text;
        out = out.replace(/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g, R);
        out = out.replace(/\bsk-ant-[a-zA-Z0-9\-_]{20,}/g, R);              // Anthropic
        out = out.replace(/\bsk-(?:proj-)?[a-zA-Z0-9\-_]{20,}/g, R);        // OpenAI (incl. sk-proj-)
        out = out.replace(/\bAIza[0-9A-Za-z\-_]{20,}/g, R);               // Google API
        out = out.replace(/\bgh[posru]_[A-Za-z0-9]{30,}\b/g, R);           // GitHub tokens
        out = out.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, R);          // Slack
        out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, R);                     // AWS access key id
        out = out.replace(/\bgsk_[A-Za-z0-9]{20,}/g, R);                   // Groq
        out = out.replace(/\bxai-[A-Za-z0-9]{20,}/g, R);                   // xAI
        out = out.replace(/\bsk-or-v1-[A-Za-z0-9]{20,}/g, R);             // OpenRouter
        out = out.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, R); // JWT
        out = out.replace(/\b(Bearer|Authorization:\s*Bearer)\s+[A-Za-z0-9._\-]{16,}/gi, '$1 ' + R);
        out = out.replace(/\b([a-z][a-z0-9+.\-]*:\/\/[^:\/\s]+:)[^@\s]{3,}@/gi, '$1' + R + '@');
        out = out.replace(/\b([A-Z0-9_]*(?:API[_-]?KEY|SECRET|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|TOKEN)[A-Z0-9_]*)(\s*[:=]\s*)(["']?)([^\s"'`,;]{6,})\3/gi,
            (m, key, sep, q, val) => {
                if (/^(process\.env|import\.meta|os\.environ|System\.getenv|None|null|undefined|true|false|\$\{|\$\(|process|env\.)/.test(val)) return m;
                return key + sep + q + R + q;
            });
        return out;
    }

    // Convierte los tool_calls (formato OpenAI) a las etiquetas de texto del pipeline.
    function toolCallsToTags(toolCalls) {
        let tags = '';
        for (const tc of (toolCalls || [])) {
            const fn = (tc && tc.function) || {};
            let args = {};
            try { args = JSON.parse(fn.arguments || '{}'); } catch { args = {}; }
            if (fn.name === 'write_file' && args.path) tags += `\n[WRITE_FILE: ${args.path}]\n${args.content || ''}\n[END_WRITE_FILE]\n`;
            else if (fn.name === 'run_command' && args.command) tags += `\n[RUN_COMMAND]\n${args.command}\n[END_RUN_COMMAND]\n`;
            else if (fn.name === 'read_file' && args.path) tags += `\n[READ_FILE: ${args.path}]\n`;
            else if (fn.name === 'list_dir') tags += `\n[LIST_DIR: ${args.path || ''}]\n`;
            else if (fn.name === 'grep' && args.pattern) tags += `\n[GREP: ${args.pattern}]\n`;
            else if (fn.name === 'run_3d_script' && args.code) tags += `\n[RUN_3D_SCRIPT]\n${args.code}\n[END_RUN_3D_SCRIPT]\n`;
        }
        return tags;
    }

    // Normaliza una respuesta del modelo: convierte bloques de código Markdown en
    // etiquetas de acción ejecutables ([WRITE_FILE]/[RUN_COMMAND]) cuando procede.
    function normalizeAgentResponse(text) {
        if (!text) return '';

        const markdownCodeBlockRegex = /```([a-zA-Z0-9+#\-]+)?\n([\s\S]*?)```/g;
        let lastIndex = 0;
        let result = '';
        let match;

        while ((match = markdownCodeBlockRegex.exec(text)) !== null) {
            const startIndex = match.index;
            const lang = match[1] ? match[1].trim() : '';
            const content = match[2];

            result += text.substring(lastIndex, startIndex);

            let fileName = null;
            const lines = content.split('\n');
            if (lines.length > 0) {
                const commentRegex = /^\s*(?:\/\/#?|#|<!--|\/\*)\s*([\w\-\./\\]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?\s*$/;
                for (let i = 0; i < Math.min(2, lines.length); i++) {
                    const m = lines[i].match(commentRegex);
                    if (m) {
                        fileName = m[1].trim();
                        break;
                    }
                }
            }

            if (!fileName) {
                const searchArea = text.substring(Math.max(0, startIndex - 150), startIndex);
                const fileInTextRegex = /(?:archivo|file|crear|escribir|guardar|en|para|código\s+de)\s+(?:el\s+|la\s+)?`?([\w\-\./\\]+\.[a-zA-Z0-9]+)`?/i;
                const mText = searchArea.match(fileInTextRegex);
                if (mText) {
                    fileName = mText[1].trim();
                }
            }

            if (fileName) {
                const prevTextSlice = text.substring(Math.max(0, startIndex - 50), startIndex);
                if (prevTextSlice.includes('[WRITE_FILE:') || content.includes('[END_WRITE_FILE]')) {
                    result += match[0];
                } else {
                    result += `[WRITE_FILE: ${fileName}]\n${content}\n[END_WRITE_FILE]`;
                }
            } else if (lang && ['bash', 'sh', 'powershell', 'cmd', 'shell', 'terminal'].includes(lang.toLowerCase())) {
                const prevTextSlice = text.substring(Math.max(0, startIndex - 50), startIndex);
                if (prevTextSlice.includes('[RUN_COMMAND]') || content.includes('[END_RUN_COMMAND]')) {
                    result += match[0];
                } else {
                    const cmdText = content.trim();
                    if (cmdText && cmdText.split('\n').length <= 5) {
                        result += `[RUN_COMMAND]\n${cmdText}\n[END_RUN_COMMAND]`;
                    } else {
                        result += match[0];
                    }
                }
            } else {
                result += match[0];
            }

            lastIndex = markdownCodeBlockRegex.lastIndex;
        }

        result += text.substring(lastIndex);
        return result;
    }

    // Extrae las acciones de escritura/ejecución/3D/skill de una respuesta.
    function parseAgentActions(text) {
        const actions = [];
        const run3DScriptRegex = /\[RUN_3D_SCRIPT\]([\s\S]*?)\[END_RUN_3D_SCRIPT\]/g;
        let match;
        while ((match = run3DScriptRegex.exec(text)) !== null) {
            actions.push({ type: '3d_script', content: match[1].trim(), label: 'Ejecutar Script en el Motor 3D' });
        }

        const writeFileRegex = /\[WRITE_FILE:\s*(.+?)\]([\s\S]*?)\[END_WRITE_FILE\]/g;
        while ((match = writeFileRegex.exec(text)) !== null) {
            actions.push({ type: 'write_file', path: match[1].trim(), content: match[2], label: `Escribir archivo: ${match[1].trim()}` });
        }

        const runCommandRegex = /\[RUN_COMMAND\]([\s\S]*?)\[END_RUN_COMMAND\]/g;
        while ((match = runCommandRegex.exec(text)) !== null) {
            actions.push({ type: 'run_command', command: match[1].trim(), label: `Ejecutar comando: ${match[1].trim()}` });
        }

        const skillRegex = /\[SKILL:\s*([a-zA-Z0-9_]+?)(?:\s+([\s\S]*?))?\]/g;
        while ((match = skillRegex.exec(text)) !== null) {
            const skillId = match[1].trim();
            const args = match[2] ? match[2].trim() : '';
            actions.push({ type: 'run_skill', skillId: skillId, args: args, label: `Ejecutar Habilidad IA: ${skillId}` });
        }

        return actions;
    }

    // Extrae las herramientas de LECTURA solicitadas ([READ_FILE]/[LIST_DIR]/[GREP]).
    function parseReadToolActions(text) {
        const actions = [];
        if (!text) return actions;
        let m;
        const reRead = /\[READ_FILE:\s*([^\]]+?)\]/g;
        while ((m = reRead.exec(text)) !== null) actions.push({ type: 'read_file', arg: m[1].trim() });
        const reList = /\[LIST_DIR:\s*([^\]]*?)\]/g;
        while ((m = reList.exec(text)) !== null) actions.push({ type: 'list_dir', arg: m[1].trim() });
        const reGrep = /\[GREP:\s*([^\]]+?)\]/g;
        while ((m = reGrep.exec(text)) !== null) actions.push({ type: 'grep', arg: m[1].trim() });
        return actions;
    }

    // Resuelve una ruta y GARANTIZA que queda dentro de `root` (confinamiento anti
    // path-traversal). Devuelve la ruta absoluta, o null si escapa/no hay root.
    function resolveInWorkspace(root, p) {
        if (!root) return null;
        const base = path.resolve(root);
        const resolved = path.resolve(base, p || '.');
        if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
        return resolved;
    }

    // Búsqueda de texto recursiva y acotada dentro de `root`. Redacta los secretos
    // de las líneas coincidentes.
    function grepWorkspace(root, pattern) {
        if (!root || !pattern) return '(sin patrón o sin workspace abierto)';
        let rx = null;
        try { rx = new RegExp(pattern, 'i'); } catch { rx = null; }
        const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.next']);
        const BIN = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|exe|dll|so|bin|mp4|mp3|wav|ttf|woff2?|glb|gltf)$/i;
        const hits = [];
        const MAX_HITS = 60, MAX_FILES = 2000;
        let filesScanned = 0;
        const baseRoot = path.resolve(root);
        const walk = (dir) => {
            if (hits.length >= MAX_HITS || filesScanned >= MAX_FILES) return;
            let entries;
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
            for (const e of entries) {
                if (hits.length >= MAX_HITS || filesScanned >= MAX_FILES) return;
                if (SKIP.has(e.name)) continue;
                const full = path.join(dir, e.name);
                if (e.isDirectory()) { walk(full); }
                else if (e.isFile() && !BIN.test(e.name)) {
                    filesScanned++;
                    let text;
                    try { if (fs.statSync(full).size > 524288) continue; text = fs.readFileSync(full, 'utf8'); } catch { continue; }
                    const lines = text.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const hit = rx ? rx.test(lines[i]) : lines[i].includes(pattern);
                        if (hit) {
                            const rel = path.relative(baseRoot, full).replace(/\\/g, '/');
                            hits.push(`${rel}:${i + 1}: ${redactSecrets(lines[i].trim().slice(0, 200))}`);
                            if (hits.length >= MAX_HITS) break;
                        }
                    }
                }
            }
        };
        walk(baseRoot);
        if (!hits.length) return '(sin coincidencias)';
        return hits.join('\n') + (hits.length >= MAX_HITS ? '\n… (más resultados omitidos)' : '');
    }

    // Ejecuta las herramientas de LECTURA solicitadas dentro de `root` (confinado) y
    // devuelve un texto con los secretos redactados para el modelo. `fsImpl` es
    // inyectable (tests). Delega en resolveInWorkspace/grepWorkspace/redactSecrets.
    async function executeReadTools(root, actions, fsImpl) {
        const fsMod = fsImpl || fs;
        const MAX_FILE = 24000;
        const parts = [];
        for (const act of (actions || [])) {
            try {
                if (act.type === 'read_file') {
                    const abs = resolveInWorkspace(root, act.arg);
                    if (!abs) { parts.push(`[READ_FILE: ${act.arg}] → ⛔ fuera del workspace (denegado)`); continue; }
                    if (!fsMod.existsSync(abs) || !fsMod.statSync(abs).isFile()) { parts.push(`[READ_FILE: ${act.arg}] → no existe o no es un archivo`); continue; }
                    let content = fsMod.readFileSync(abs, 'utf8');
                    let extra = '';
                    if (content.length > MAX_FILE) { content = content.slice(0, MAX_FILE); extra = `\n… (truncado a ${MAX_FILE} caracteres)`; }
                    parts.push(`[READ_FILE: ${act.arg}]\n\`\`\`\n${redactSecrets(content)}${extra}\n\`\`\``);
                } else if (act.type === 'list_dir') {
                    const abs = resolveInWorkspace(root, act.arg || '.');
                    if (!abs) { parts.push(`[LIST_DIR: ${act.arg}] → ⛔ fuera del workspace (denegado)`); continue; }
                    if (!fsMod.existsSync(abs) || !fsMod.statSync(abs).isDirectory()) { parts.push(`[LIST_DIR: ${act.arg}] → no existe o no es un directorio`); continue; }
                    const entries = fsMod.readdirSync(abs, { withFileTypes: true })
                        .filter(e => e.name !== 'node_modules' && e.name !== '.git')
                        .slice(0, 200)
                        .map(e => (e.isDirectory() ? e.name + '/' : e.name));
                    parts.push(`[LIST_DIR: ${act.arg || '.'}]\n${entries.join('\n') || '(vacío)'}`);
                } else if (act.type === 'grep') {
                    parts.push(`[GREP: ${act.arg}]\n${grepWorkspace(root, act.arg)}`);
                }
            } catch (e) {
                parts.push(`[${act.type}: ${act.arg}] → error: ${String((e && e.message) || e)}`);
            }
        }
        return parts.join('\n\n');
    }

    // Ejecuta un comando capturando su salida (stdout/stderr + código). Dependencias
    // inyectables para tests: opts.cp (child_process), opts.cwd, opts.onOutput(text),
    // opts.platform. Timeout de 120 s; la salida se recorta a 8000 caracteres.
    function runCommandCaptured(command, opts) {
        opts = opts || {};
        const cp = opts.cp || require('child_process');
        const onOutput = (typeof opts.onOutput === 'function') ? opts.onOutput : function () {};
        const isWin = (opts.platform || process.platform) === 'win32';
        return new Promise((resolve) => {
            try {
                onOutput(`\n$ ${command}\n`);
                cp.exec(command, {
                    cwd: opts.cwd || undefined,
                    shell: isWin ? 'powershell.exe' : '/bin/bash',
                    timeout: 120000,
                    maxBuffer: 2 * 1024 * 1024,
                    windowsHide: true
                }, (err, stdout, stderr) => {
                    let out = '';
                    if (stdout) out += String(stdout);
                    if (stderr) out += (out ? '\n' : '') + String(stderr);
                    const timedOut = !!(err && err.killed);
                    const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
                    onOutput((out || '(sin salida)') + '\n');
                    if (timedOut) out += `\n⏱️ [terminado por timeout de 120s]`;
                    else if (code !== 0) out += `\n[código de salida: ${code}]`;
                    resolve({ output: (out || '(sin salida)').slice(0, 8000), code });
                });
            } catch (e) {
                resolve({ output: `Error al ejecutar: ${String((e && e.message) || e)}`, code: 1 });
            }
        });
    }

    const AgentCore = {
        redactSecrets,
        toolCallsToTags,
        normalizeAgentResponse,
        parseAgentActions,
        parseReadToolActions,
        resolveInWorkspace,
        grepWorkspace,
        executeReadTools,
        runCommandCaptured
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AgentCore;               // Node (tests)
    }
    if (typeof window !== 'undefined') {
        window.AgentCore = AgentCore;             // Navegador (Electron renderer)
    }
})();
