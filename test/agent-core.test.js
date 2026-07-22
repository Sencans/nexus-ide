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
