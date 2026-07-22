// Tests del núcleo agéntico de Nexus IDE (modules/agent-core.js).
// Runner nativo, sin dependencias:  npm test   (=  node --test)
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const AC = require('../modules/agent-core.js');

// ─────────────────────────────────────────────────────────────────────────────
// redactSecrets
// ─────────────────────────────────────────────────────────────────────────────
test('redactSecrets: redacta claves de proveedores con prefijo', () => {
    const cases = [
        "const k='sk-proj-abc123DEF456ghi789JKL012mno345';",
        'ANTHROPIC_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx',
        "key: 'AIzaSyD3aBcDeFgHiJkLmNoPqRsTuVwXyZ012345'",
        'token=ghp_1234567890abcdefghijklmnopqrstuvwxyz',
        'AKIAIOSFODNN7EXAMPLE',
        'gsk_1234567890abcdefghijklmnop',
        'xai-1234567890abcdefghijklmnop',
        'sk-or-v1-1234567890abcdefghijklmnop',
        'xoxb-1234567890-abcdefghij',
    ];
    for (const c of cases) {
        assert.ok(AC.redactSecrets(c).includes('«SECRETO_REDACTADO»'), `debería redactar: ${c}`);
    }
});

test('redactSecrets: JWT, Bearer, connection string y clave privada PEM', () => {
    assert.ok(AC.redactSecrets('auth=eyJhbGciOiJIUzI1Nidd.eyJzdWIiOjEyMzQ1Njc4.SflKxwRJSMeKKF2QT4').includes('«SECRETO_REDACTADO»'));
    assert.ok(AC.redactSecrets("Authorization: Bearer abcdef1234567890ABCDEF").includes('«SECRETO_REDACTADO»'));
    const conn = AC.redactSecrets('mongodb://admin:SuperSecret123@db.example.com:27017');
    assert.ok(conn.includes('«SECRETO_REDACTADO»') && !conn.includes('SuperSecret123'));
    const pem = AC.redactSecrets('-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK\n-----END RSA PRIVATE KEY-----');
    assert.strictEqual(pem, '«SECRETO_REDACTADO»');
});

test('redactSecrets: .env con valor literal se redacta, referencias a variable NO', () => {
    assert.ok(AC.redactSecrets('DB_PASSWORD=MyR3alP@sswordHere').includes('«SECRETO_REDACTADO»'));
    // No debe tocar código legítimo:
    for (const legit of [
        'API_KEY = process.env.API_KEY',
        'SECRET_TOKEN=process.env.SECRET_TOKEN',
        'password: null,',
        'function login(user, password) { return auth(user, password); }',
        "const name = 'sk';",
        '// set your PASSWORD in the .env file',
    ]) {
        assert.ok(!AC.redactSecrets(legit).includes('«SECRETO_REDACTADO»'), `NO debería redactar: ${legit}`);
    }
});

test('redactSecrets: entradas no-string se devuelven tal cual', () => {
    assert.strictEqual(AC.redactSecrets(null), null);
    assert.strictEqual(AC.redactSecrets(undefined), undefined);
    assert.strictEqual(AC.redactSecrets(42), 42);
    assert.strictEqual(AC.redactSecrets(''), '');
});

// ─────────────────────────────────────────────────────────────────────────────
// parseAgentActions
// ─────────────────────────────────────────────────────────────────────────────
test('parseAgentActions: parsea write_file, run_command, 3d_script y skill', () => {
    const text = [
        '[WRITE_FILE: src/app.js]\nconsole.log(1)\n[END_WRITE_FILE]',
        '[RUN_COMMAND]\nnpm test\n[END_RUN_COMMAND]',
        '[RUN_3D_SCRIPT]\nmesh.rotation.y+=0.1\n[END_RUN_3D_SCRIPT]',
        '[SKILL: gen_imagen un gato]',
    ].join('\n');
    const actions = AC.parseAgentActions(text);
    const types = actions.map(a => a.type).sort();
    assert.deepStrictEqual(types, ['3d_script', 'run_command', 'run_skill', 'write_file']);
    const wf = actions.find(a => a.type === 'write_file');
    assert.strictEqual(wf.path, 'src/app.js');
    assert.match(wf.content, /console\.log\(1\)/);
    assert.strictEqual(actions.find(a => a.type === 'run_command').command, 'npm test');
    const sk = actions.find(a => a.type === 'run_skill');
    assert.strictEqual(sk.skillId, 'gen_imagen');
    assert.strictEqual(sk.args, 'un gato');
});

test('parseAgentActions: sin acciones devuelve []', () => {
    assert.deepStrictEqual(AC.parseAgentActions('solo texto normal, sin tags'), []);
    assert.deepStrictEqual(AC.parseAgentActions(''), []);
});

test('parseAgentActions: múltiples write_file', () => {
    const text = '[WRITE_FILE: a.js]\nA\n[END_WRITE_FILE]\n[WRITE_FILE: b.js]\nB\n[END_WRITE_FILE]';
    const actions = AC.parseAgentActions(text).filter(a => a.type === 'write_file');
    assert.strictEqual(actions.length, 2);
    assert.deepStrictEqual(actions.map(a => a.path), ['a.js', 'b.js']);
});

// ─────────────────────────────────────────────────────────────────────────────
// parseReadToolActions
// ─────────────────────────────────────────────────────────────────────────────
test('parseReadToolActions: parsea read_file, list_dir y grep', () => {
    const actions = AC.parseReadToolActions('mira [READ_FILE: a.js] y [LIST_DIR: src] y [GREP: TODO]');
    assert.deepStrictEqual(actions, [
        { type: 'read_file', arg: 'a.js' },
        { type: 'list_dir', arg: 'src' },
        { type: 'grep', arg: 'TODO' },
    ]);
});

test('parseReadToolActions: list_dir con path vacío y sin tags', () => {
    assert.deepStrictEqual(AC.parseReadToolActions('[LIST_DIR: ]'), [{ type: 'list_dir', arg: '' }]);
    assert.deepStrictEqual(AC.parseReadToolActions('respuesta sin lecturas'), []);
    assert.deepStrictEqual(AC.parseReadToolActions(''), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// toolCallsToTags  (+ round-trip con los parsers)
// ─────────────────────────────────────────────────────────────────────────────
test('toolCallsToTags: convierte los 6 tipos y el round-trip lo reconocen los parsers', () => {
    const tcs = [
        { function: { name: 'write_file', arguments: JSON.stringify({ path: 'x.js', content: 'ok' }) } },
        { function: { name: 'run_command', arguments: JSON.stringify({ command: 'ls' }) } },
        { function: { name: 'read_file', arguments: JSON.stringify({ path: 'r.md' }) } },
        { function: { name: 'list_dir', arguments: JSON.stringify({ path: 'src' }) } },
        { function: { name: 'grep', arguments: JSON.stringify({ pattern: 'foo' }) } },
        { function: { name: 'run_3d_script', arguments: JSON.stringify({ code: 'a=1' }) } },
    ];
    const tags = AC.toolCallsToTags(tcs);
    const actionTypes = AC.parseAgentActions(tags).map(a => a.type).sort();
    assert.deepStrictEqual(actionTypes, ['3d_script', 'run_command', 'write_file']);
    const readTypes = AC.parseReadToolActions(tags).map(a => a.type).sort();
    assert.deepStrictEqual(readTypes, ['grep', 'list_dir', 'read_file']);
});

test('toolCallsToTags: vacío y argumentos malformados no rompen', () => {
    assert.strictEqual(AC.toolCallsToTags([]), '');
    assert.strictEqual(AC.toolCallsToTags(null), '');
    assert.doesNotThrow(() => AC.toolCallsToTags([{ function: { name: 'write_file', arguments: '{json roto' } }]));
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeAgentResponse
// ─────────────────────────────────────────────────────────────────────────────
test('normalizeAgentResponse: fence con comentario de nombre → WRITE_FILE', () => {
    const md = 'Aquí tienes:\n```js\n// config.js\nmodule.exports = {}\n```';
    const out = AC.normalizeAgentResponse(md);
    assert.ok(out.includes('[WRITE_FILE: config.js]'));
    assert.ok(out.includes('[END_WRITE_FILE]'));
});

test('normalizeAgentResponse: fence bash/powershell → RUN_COMMAND', () => {
    const out = AC.normalizeAgentResponse('Ejecuta:\n```bash\nnpm install\n```');
    assert.ok(out.includes('[RUN_COMMAND]') && out.includes('[END_RUN_COMMAND]'));
});

test('normalizeAgentResponse: fence sin nombre ni lenguaje shell se deja igual', () => {
    const md = 'Ejemplo:\n```\nalgun texto plano\n```';
    const out = AC.normalizeAgentResponse(md);
    assert.ok(!out.includes('[WRITE_FILE'));
    assert.ok(!out.includes('[RUN_COMMAND'));
});

test('normalizeAgentResponse: no re-envuelve contenido ya etiquetado; vacío → ""', () => {
    const already = '[WRITE_FILE: a.js]\n```js\ncode\n```\n[END_WRITE_FILE]';
    // No debe generar un WRITE_FILE anidado nuevo (mantiene el bloque original).
    const out = AC.normalizeAgentResponse(already);
    assert.strictEqual((out.match(/\[WRITE_FILE:/g) || []).length, 1);
    assert.strictEqual(AC.normalizeAgentResponse(''), '');
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveInWorkspace  (confinamiento anti path-traversal)
// ─────────────────────────────────────────────────────────────────────────────
test('resolveInWorkspace: resuelve rutas dentro del root', () => {
    const root = path.resolve('/proyecto');
    assert.strictEqual(AC.resolveInWorkspace(root, 'src/app.js'), path.join(root, 'src', 'app.js'));
    assert.strictEqual(AC.resolveInWorkspace(root, ''), root);
    assert.strictEqual(AC.resolveInWorkspace(root, '.'), root);
});

test('resolveInWorkspace: RECHAZA path traversal y root ausente', () => {
    const root = path.resolve('/proyecto');
    assert.strictEqual(AC.resolveInWorkspace(root, '../../etc/passwd'), null);
    assert.strictEqual(AC.resolveInWorkspace(root, '../secreto'), null);
    assert.strictEqual(AC.resolveInWorkspace(null, 'a.js'), null);
    assert.strictEqual(AC.resolveInWorkspace('', 'a.js'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// grepWorkspace  (búsqueda acotada + redacción)
// ─────────────────────────────────────────────────────────────────────────────
test('grepWorkspace: encuentra coincidencias, salta node_modules y redacta secretos', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-grep-'));
    try {
        fs.writeFileSync(path.join(dir, 'a.js'), 'const x = 1; // TODO: revisar\nconst k = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX";');
        fs.mkdirSync(path.join(dir, 'sub'));
        fs.writeFileSync(path.join(dir, 'sub', 'b.txt'), 'otra TODO aquí');
        fs.mkdirSync(path.join(dir, 'node_modules'));
        fs.writeFileSync(path.join(dir, 'node_modules', 'c.js'), 'TODO no debería aparecer');

        const todo = AC.grepWorkspace(dir, 'TODO');
        assert.ok(todo.includes('a.js:1'), 'encuentra en a.js');
        assert.ok(todo.includes('sub/b.txt'), 'encuentra recursivo');
        assert.ok(!todo.includes('node_modules'), 'NO escanea node_modules');

        const key = AC.grepWorkspace(dir, 'sk-proj');
        assert.ok(key.includes('«SECRETO_REDACTADO»') && !key.includes('sk-proj-ABCDEF'), 'redacta el secreto en la línea');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('grepWorkspace: sin coincidencias / sin patrón / sin root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-grep2-'));
    try {
        fs.writeFileSync(path.join(dir, 'a.js'), 'nada interesante');
        assert.strictEqual(AC.grepWorkspace(dir, 'zzz_no_existe'), '(sin coincidencias)');
        assert.match(AC.grepWorkspace(dir, ''), /sin patrón/);
        assert.match(AC.grepWorkspace('', 'x'), /sin patrón|workspace/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// executeReadTools  (read_file / list_dir / grep, confinamiento y redacción)
// ─────────────────────────────────────────────────────────────────────────────
test('executeReadTools: read_file devuelve contenido y REDACTA secretos', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-rt-'));
    try {
        fs.writeFileSync(path.join(dir, 'h.js'), 'const k="sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX";\nsaluda();');
        const out = await AC.executeReadTools(dir, [{ type: 'read_file', arg: 'h.js' }]);
        assert.ok(out.includes('[READ_FILE: h.js]'));
        assert.ok(out.includes('saluda();'));
        assert.ok(out.includes('«SECRETO_REDACTADO»') && !out.includes('sk-proj-ABCDEF'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('executeReadTools: read_file trunca ficheros grandes', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-rt2-'));
    try {
        fs.writeFileSync(path.join(dir, 'big.txt'), 'x'.repeat(30000));
        const out = await AC.executeReadTools(dir, [{ type: 'read_file', arg: 'big.txt' }]);
        assert.ok(out.includes('truncado a 24000 caracteres'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('executeReadTools: RECHAZA lectura fuera del workspace (path traversal)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-rt3-'));
    try {
        const out = await AC.executeReadTools(dir, [{ type: 'read_file', arg: '../../../etc/passwd' }]);
        assert.ok(out.includes('fuera del workspace') && out.includes('denegado'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('executeReadTools: read_file inexistente y list_dir (filtra node_modules/.git)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-rt4-'));
    try {
        fs.writeFileSync(path.join(dir, 'a.js'), '1');
        fs.mkdirSync(path.join(dir, 'src'));
        fs.mkdirSync(path.join(dir, 'node_modules'));
        fs.mkdirSync(path.join(dir, '.git'));
        const noExiste = await AC.executeReadTools(dir, [{ type: 'read_file', arg: 'nope.js' }]);
        assert.ok(noExiste.includes('no existe o no es un archivo'));
        const list = await AC.executeReadTools(dir, [{ type: 'list_dir', arg: '' }]);
        assert.ok(list.includes('a.js') && list.includes('src/'));
        assert.ok(!list.includes('node_modules') && !list.includes('.git'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('executeReadTools: grep delega en grepWorkspace', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-rt5-'));
    try {
        fs.writeFileSync(path.join(dir, 'a.js'), 'hola BUSCAME adios');
        const out = await AC.executeReadTools(dir, [{ type: 'grep', arg: 'BUSCAME' }]);
        assert.ok(out.includes('[GREP: BUSCAME]') && out.includes('a.js:1'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('executeReadTools: un error de fs (mock) no rompe, lo reporta', async () => {
    // fsImpl mockeado que finge existir pero lanza al leer.
    const fsMock = {
        existsSync: () => true,
        statSync: () => ({ isFile: () => true, isDirectory: () => false }),
        readFileSync: () => { throw new Error('EACCES boom'); },
    };
    const out = await AC.executeReadTools(path.resolve('/proj'), [{ type: 'read_file', arg: 'x.js' }], fsMock);
    assert.ok(out.includes('error:') && out.includes('EACCES boom'));
});

// ─────────────────────────────────────────────────────────────────────────────
// runCommandCaptured  (mock de child_process)
// ─────────────────────────────────────────────────────────────────────────────
// Helper: crea un cp falso cuyo exec responde con (err, stdout, stderr) dados,
// y registra las opciones con las que fue llamado.
function fakeCp(err, stdout, stderr, capture) {
    return {
        exec(cmd, opts, cb) {
            if (capture) { capture.cmd = cmd; capture.opts = opts; }
            cb(err, stdout, stderr);
        }
    };
}

test('runCommandCaptured: salida normal → output y code 0', async () => {
    const r = await AC.runCommandCaptured('echo hi', { cp: fakeCp(null, 'hola\n', '') });
    assert.strictEqual(r.code, 0);
    assert.ok(r.output.includes('hola'));
    assert.ok(!r.output.includes('código de salida'));
});

test('runCommandCaptured: incluye stderr', async () => {
    const r = await AC.runCommandCaptured('build', { cp: fakeCp(null, 'ok', 'aviso importante') });
    assert.ok(r.output.includes('ok') && r.output.includes('aviso importante'));
});

test('runCommandCaptured: código de salida distinto de 0', async () => {
    const r = await AC.runCommandCaptured('falla', { cp: fakeCp({ code: 2 }, '', 'boom') });
    assert.strictEqual(r.code, 2);
    assert.ok(r.output.includes('[código de salida: 2]'));
});

test('runCommandCaptured: timeout (killed) se marca', async () => {
    const r = await AC.runCommandCaptured('server', { cp: fakeCp({ killed: true, code: null }, 'parcial', '') });
    assert.ok(r.output.includes('parcial'));
    assert.ok(r.output.includes('timeout'));
});

test('runCommandCaptured: sin salida → "(sin salida)"; se recorta a 8000', async () => {
    const vacio = await AC.runCommandCaptured('nada', { cp: fakeCp(null, '', '') });
    assert.ok(vacio.output.includes('(sin salida)'));
    const enorme = await AC.runCommandCaptured('spam', { cp: fakeCp(null, 'y'.repeat(20000), '') });
    assert.ok(enorme.output.length <= 8000);
});

test('runCommandCaptured: exec que lanza → code 1, no rompe', async () => {
    const cpThrows = { exec() { throw new Error('spawn ENOENT'); } };
    const r = await AC.runCommandCaptured('x', { cp: cpThrows });
    assert.strictEqual(r.code, 1);
    assert.ok(r.output.includes('Error al ejecutar') && r.output.includes('ENOENT'));
});

// ─────────────────────────────────────────────────────────────────────────────
// parseSSEDeltas  (streaming SSE, 3 formatos de proveedor)
// ─────────────────────────────────────────────────────────────────────────────
test('parseSSEDeltas: OpenAI-compat extrae los deltas de choices[].delta.content', () => {
    const buf = 'data: {"choices":[{"delta":{"content":"Ho"}}]}\ndata: {"choices":[{"delta":{"content":"la"}}]}\n';
    const r = AC.parseSSEDeltas(buf, 'openai');
    assert.deepStrictEqual(r.deltas, ['Ho', 'la']);
    assert.strictEqual(r.done, false);
});

test('parseSSEDeltas: [DONE] marca done; línea incompleta va a rest', () => {
    const r = AC.parseSSEDeltas('data: {"choices":[{"delta":{"content":"x"}}]}\ndata: [DONE]\ndata: {"cho', 'openai');
    assert.deepStrictEqual(r.deltas, ['x']);
    assert.strictEqual(r.done, true);
    assert.strictEqual(r.rest, 'data: {"cho');
});

test('parseSSEDeltas: Google extrae candidates[].content.parts[].text', () => {
    const buf = 'data: {"candidates":[{"content":{"parts":[{"text":"Hola"}]}}]}\n';
    assert.deepStrictEqual(AC.parseSSEDeltas(buf, 'google').deltas, ['Hola']);
});

test('parseSSEDeltas: Anthropic solo content_block_delta aporta texto', () => {
    const buf = [
        'data: {"type":"message_start"}',
        'data: {"type":"content_block_delta","delta":{"text":"Hi"}}',
        'data: {"type":"content_block_delta","delta":{"text":" there"}}',
        'data: {"type":"message_stop"}',
        ''
    ].join('\n');
    assert.deepStrictEqual(AC.parseSSEDeltas(buf, 'anthropic').deltas, ['Hi', ' there']);
});

test('parseSSEDeltas: ignora comentarios keep-alive, event: y JSON inválido', () => {
    const buf = ': keep-alive\nevent: message\ndata: {roto\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n';
    assert.deepStrictEqual(AC.parseSSEDeltas(buf, 'openai').deltas, ['ok']);
});

// ─────────────────────────────────────────────────────────────────────────────
// Mixture-of-Agents (buildMoASynthesisPrompt / runMixtureOfAgents)
// ─────────────────────────────────────────────────────────────────────────────
test('buildMoASynthesisPrompt: incluye la consulta y todas las respuestas', () => {
    const p = AC.buildMoASynthesisPrompt('¿cómo ordenar un array?', ['usa sort()', 'usa lodash']);
    assert.ok(p.includes('¿cómo ordenar un array?'));
    assert.ok(p.includes('usa sort()') && p.includes('usa lodash'));
    assert.ok(/SINTETIZAD/.test(p));
});

test('runMixtureOfAgents: consulta los modelos EN PARALELO y luego sintetiza', async () => {
    let active = 0, maxActive = 0;
    const calls = [];
    const send = (model, prompt) => new Promise((resolve) => {
        calls.push({ model, prompt });
        active++; maxActive = Math.max(maxActive, active);
        setTimeout(() => { active--; resolve(/SINTETIZAD/.test(prompt) ? 'RESPUESTA FINAL' : `draft-${model}`); }, 20);
    });
    const res = await AC.runMixtureOfAgents('consulta X', ['a', 'b', 'c'], { synthesizer: 'a', send });
    assert.ok(maxActive >= 3, 'los 3 drafts corren en paralelo (concurrencia >= 3)');
    assert.deepStrictEqual(res.drafts, ['draft-a', 'draft-b', 'draft-c']);
    assert.strictEqual(res.final, 'RESPUESTA FINAL');
    const synthCall = calls[calls.length - 1];
    assert.ok(synthCall.prompt.includes('draft-a') && synthCall.prompt.includes('draft-c'), 'el sintetizador ve las 3 respuestas');
});

test('runMixtureOfAgents: onDraft se llama por cada modelo', async () => {
    const seen = [];
    const send = (m) => Promise.resolve(`r-${m}`);
    await AC.runMixtureOfAgents('q', ['x', 'y'], { synthesizer: 'x', send, onDraft: (i, m, t) => seen.push(m + ':' + t) });
    assert.deepStrictEqual(seen.sort(), ['x:r-x', 'y:r-y']);
});

test('runMixtureOfAgents: un modelo que falla no rompe (su draft es el error)', async () => {
    const send = (m) => m === 'bad' ? Promise.reject(new Error('boom')) : Promise.resolve(`ok-${m}`);
    const res = await AC.runMixtureOfAgents('q', ['good', 'bad'], { synthesizer: 'good', send });
    assert.strictEqual(res.drafts[0], 'ok-good');
    assert.ok(res.drafts[1].includes('bad') && res.drafts[1].includes('boom'));
});

test('runMixtureOfAgents: valida send y lista de modelos', async () => {
    await assert.rejects(() => AC.runMixtureOfAgents('q', ['a'], {}), /falta opts\.send/);
    await assert.rejects(() => AC.runMixtureOfAgents('q', [], { send: () => {} }), /no hay modelos/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox (dockerWrap / checkDockerAvailable / runCommandCaptured con sandbox)
// ─────────────────────────────────────────────────────────────────────────────
test('dockerWrap: envuelve el comando en docker run con mount, imagen y base64', () => {
    const w = AC.dockerWrap('npm test', { image: 'node:20-slim', workspace: '/proj' });
    assert.ok(w.startsWith('docker run --rm'));
    assert.ok(w.includes('-v "/proj:/workspace"'));
    assert.ok(w.includes('-w /workspace'));
    assert.ok(w.includes('node:20-slim'));
    assert.ok(w.includes(Buffer.from('npm test').toString('base64')), 'comando en base64 (sin problemas de escaping)');
    assert.ok(!w.includes('--network none'), 'red permitida por defecto');
});

test('dockerWrap: network:false añade --network none; imagen por defecto', () => {
    const w = AC.dockerWrap('ls', { workspace: '/p', network: false });
    assert.ok(w.includes('--network none'));
    assert.ok(w.includes('node:20-slim'), 'imagen por defecto');
});

test('runCommandCaptured: con sandbox ejecuta el comando docker-wrapped; onOutput muestra el original', async () => {
    const cap = {};
    const logs = [];
    await AC.runCommandCaptured('npm test', {
        cp: fakeCp(null, 'ok', '', cap),
        sandbox: { image: 'node:20', workspace: '/w' },
        onOutput: (t) => logs.push(t),
    });
    assert.ok(cap.cmd.startsWith('docker run'), 'exec recibe el comando docker-wrapped');
    assert.ok(cap.cmd.includes('node:20'));
    assert.ok(logs.some(l => l.includes('npm test') && !l.includes('docker run')), 'onOutput muestra el comando ORIGINAL, no el wrapper');
});

test('checkDockerAvailable: true si docker responde, false si error', async () => {
    const ok = await AC.checkDockerAvailable({ exec: (c, o, cb) => cb(null, 'Docker version 24.0.5', '') });
    assert.strictEqual(ok, true);
    const no = await AC.checkDockerAvailable({ exec: (c, o, cb) => cb(new Error('not found'), '', '') });
    assert.strictEqual(no, false);
});

test('runCommandCaptured: onOutput recibe comando y salida; cwd/shell según platform', async () => {
    const cap = {};
    const logs = [];
    await AC.runCommandCaptured('mycmd', {
        cp: fakeCp(null, 'RESULT', '', cap),
        cwd: '/mi/proyecto',
        platform: 'win32',
        onOutput: (t) => logs.push(t),
    });
    assert.ok(logs.some(l => l.includes('mycmd')), 'onOutput recibe el comando');
    assert.ok(logs.some(l => l.includes('RESULT')), 'onOutput recibe la salida');
    assert.strictEqual(cap.opts.cwd, '/mi/proyecto');
    assert.strictEqual(cap.opts.shell, 'powershell.exe');
});
