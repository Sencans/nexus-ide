#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Nexus IDE — Benchmark real (sin números inventados).
//
//   npm run bench            # modo OFFLINE: no requiere API key
//   npm run bench -- --svg   # además regenera docs/benchmark.svg
//
// Modo ONLINE (opcional, mide latencia real de un proveedor OpenAI-compatible):
//   NEXUS_BENCH_KEY=sk-...  [NEXUS_BENCH_URL=...] [NEXUS_BENCH_MODEL=...]  npm run bench
//
// Mide velocidad REAL de las funciones del núcleo agéntico, el tiempo de la suite
// de tests y (si hay key) la latencia de la IA. Escribe docs/benchmark.json y,
// con --svg, un gráfico docs/benchmark.svg a partir de esos números.
// ─────────────────────────────────────────────────────────────────────────────

const { performance } = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const AC = require(path.join(ROOT, 'modules', 'agent-core.js'));

const WANT_SVG = process.argv.includes('--svg');

// ── Helper de micro-benchmark: warm-up + N iteraciones cronometradas ──────────
function bench(name, fn, iters = 50000, warm = 2000) {
    for (let i = 0; i < warm; i++) fn();
    const t0 = performance.now();
    for (let i = 0; i < iters; i++) fn();
    const ms = performance.now() - t0;
    return { name, iters, ms: +ms.toFixed(2), opsSec: Math.round(iters / (ms / 1000)) };
}

// ── Muestras de entrada realistas ─────────────────────────────────────────────
const CODE_SAMPLE = [
    'const config = {',
    '  apiKey: "sk-proj-ABCDEF1234567890abcdef1234567890",',
    '  db: "postgres://user:s3cr3tPass@host:5432/mydb",',
    '  ghToken: "ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD",',
    '  google: "AIzaSyD3aBcDeFgHiJkLmNoPqRsTuVwXyZ012345"',
    '};',
    'function main() { return fetch("/api/data").then(r => r.json()); }',
    ''
].join('\n').repeat(4);

const SSE_SAMPLE = 'data: {"choices":[{"delta":{"content":"Hola "}}]}\n'.repeat(25) + 'data: [DONE]\n';

const MD_SAMPLE = [
    'Voy a crear el archivo y ejecutarlo.',
    '```js',
    '// app.js',
    'console.log("hola");',
    '```',
    'Y luego:',
    '```bash',
    'npm test',
    '```'
].join('\n');

const ACTIONS_SAMPLE = '[WRITE_FILE: src/app.js]\nconsole.log(1);\n[END_WRITE_FILE]\n[RUN_COMMAND]\nnpm test\n[END_RUN_COMMAND]\n[READ_FILE: README.md]';

const TOOLCALLS_SAMPLE = [
    { function: { name: 'write_file', arguments: JSON.stringify({ path: 'a.js', content: 'x = 1' }) } },
    { function: { name: 'run_command', arguments: JSON.stringify({ command: 'npm run build' }) } },
    { function: { name: 'grep', arguments: JSON.stringify({ pattern: 'TODO' }) } }
];

const NOW = new Date();

// ── 1) Micro-benchmarks de las funciones puras del núcleo ─────────────────────
function runMicro() {
    return [
        bench('redactSecrets (2 KB de código)', () => AC.redactSecrets(CODE_SAMPLE), 20000),
        bench('parseSSEDeltas (25 deltas SSE)', () => AC.parseSSEDeltas(SSE_SAMPLE, 'openai'), 40000),
        bench('normalizeAgentResponse (markdown)', () => AC.normalizeAgentResponse(MD_SAMPLE), 40000),
        bench('parseAgentActions (3 acciones)', () => AC.parseAgentActions(ACTIONS_SAMPLE), 60000),
        bench('toolCallsToTags (3 tool_calls)', () => AC.toolCallsToTags(TOOLCALLS_SAMPLE), 100000),
        bench('cronMatches (5 campos)', () => AC.cronMatches('*/15 9-17 * * 1-5', NOW), 200000)
    ];
}

// ── 2) Tiempo de carga del módulo del núcleo ──────────────────────────────────
function moduleLoadMs() {
    const modPath = require.resolve(path.join(ROOT, 'modules', 'agent-core.js'));
    delete require.cache[modPath];
    const t0 = performance.now();
    require(modPath);
    return +(performance.now() - t0).toFixed(2);
}

// ── 3) Tiempo de la suite de tests (spawn real de `node --test`) ──────────────
function testSuiteMs() {
    try {
        const t0 = performance.now();
        const out = cp.execFileSync(process.execPath, ['--test'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
        const ms = +(performance.now() - t0).toFixed(0);
        const m = out.match(/tests (\d+)/);
        return { ms, tests: m ? parseInt(m[1], 10) : null, ok: true };
    } catch (e) {
        return { ms: null, tests: null, ok: false };
    }
}

// ── 4) Latencia de IA (opcional; solo si hay NEXUS_BENCH_KEY) ──────────────────
function aiLatency() {
    return new Promise((resolve) => {
        const key = process.env.NEXUS_BENCH_KEY;
        if (!key) return resolve(null);
        const url = new URL(process.env.NEXUS_BENCH_URL || 'https://api.openai.com/v1/chat/completions');
        const model = process.env.NEXUS_BENCH_MODEL || 'gpt-4o-mini';
        const body = JSON.stringify({ model, messages: [{ role: 'user', content: 'Responde solo: OK' }], stream: true, max_tokens: 16 });
        const https = require('node:https');
        const t0 = performance.now();
        let ttft = null;
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            res.on('data', () => { if (ttft === null) ttft = +(performance.now() - t0).toFixed(0); });
            res.on('end', () => resolve({ provider: url.hostname, model, status: res.statusCode, ttftMs: ttft, totalMs: +(performance.now() - t0).toFixed(0) }));
        });
        req.on('error', (e) => resolve({ provider: url.hostname, model, error: String(e.message || e) }));
        req.write(body); req.end();
    });
}

// ── Salida: tabla + JSON + SVG ────────────────────────────────────────────────
function fmt(n) { return n == null ? '—' : n.toLocaleString('en-US'); }

function makeSvg(micro) {
    const W = 900, rowH = 46, top = 92, pad = 40;
    const H = top + micro.length * rowH + 60;
    const max = Math.max(...micro.map(m => m.opsSec));
    const barMaxW = 470;
    const bars = micro.map((m, i) => {
        const y = top + i * rowH;
        const w = Math.max(4, Math.round((m.opsSec / max) * barMaxW));
        return `
    <text x="${pad}" y="${y + 16}" font-size="13" fill="#c9d1d9">${m.name}</text>
    <rect x="${pad}" y="${y + 22}" width="${barMaxW}" height="14" rx="7" fill="#21262d"/>
    <rect x="${pad}" y="${y + 22}" width="${w}" height="14" rx="7" fill="url(#g)"/>
    <text x="${pad + barMaxW + 12}" y="${y + 33}" font-size="13" font-weight="700" fill="#a78bfa">${fmt(m.opsSec)} ops/s</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI',Roboto,Helvetica,Arial,sans-serif" role="img" aria-label="Benchmark del núcleo de Nexus IDE">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#3fb950"/></linearGradient></defs>
  <rect width="${W}" height="${H}" rx="16" fill="#0b0f19"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#7c3aed" stroke-opacity="0.35"/>
  <text x="${pad}" y="46" font-size="22" font-weight="700" fill="#f3f4f6">⚡ Rendimiento del núcleo agéntico</text>
  <text x="${pad}" y="70" font-size="13" fill="#8b949e">Operaciones por segundo (medido con node:perf_hooks · más alto = mejor)</text>
  ${bars}
  <text x="${pad}" y="${H - 20}" font-size="11" fill="#6e7681">Generado por \`npm run bench\` — números reales de esta máquina, no benchmarks inventados.</text>
</svg>`;
}

(async () => {
    console.log('\n⚡ Nexus IDE — Benchmark (números reales de esta máquina)\n');

    const micro = runMicro();
    console.log('  Núcleo agéntico (velocidad de las funciones puras):');
    for (const m of micro) console.log(`   • ${m.name.padEnd(38)} ${fmt(m.opsSec).padStart(12)} ops/s`);

    const load = moduleLoadMs();
    console.log(`\n  Carga del módulo agent-core:            ${load} ms`);

    const suite = testSuiteMs();
    console.log(`  Suite de tests (${suite.tests ?? '?'} tests):             ${suite.ok ? suite.ms + ' ms' : 'no ejecutada'}`);

    const ai = await aiLatency();
    if (ai) {
        if (ai.error) console.log(`\n  IA (${ai.provider}): error — ${ai.error}`);
        else console.log(`\n  IA (${ai.model} @ ${ai.provider}):  TTFT ${ai.ttftMs} ms · total ${ai.totalMs} ms  [HTTP ${ai.status}]`);
    } else {
        console.log('\n  IA: omitida (define NEXUS_BENCH_KEY para medir la latencia real).');
    }

    const results = { generatedAt: new Date().toISOString(), node: process.version, platform: process.platform, micro, moduleLoadMs: load, testSuite: suite, ai };
    const outDir = path.join(ROOT, 'docs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'benchmark.json'), JSON.stringify(results, null, 2));
    console.log('\n  ✔ docs/benchmark.json escrito.');

    if (WANT_SVG) {
        fs.writeFileSync(path.join(outDir, 'benchmark.svg'), makeSvg(micro));
        console.log('  ✔ docs/benchmark.svg regenerado.');
    } else {
        console.log('  (usa `npm run bench -- --svg` para regenerar el gráfico docs/benchmark.svg)');
    }
    console.log('');
})();
