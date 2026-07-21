// ==========================================================================
// Nexus IDE — Plugins de utilidad (módulo separado de app.js)
// Color Studio · Encoder/Decoder · Hash & UUID · Timestamp · Diff Checker
// Depende de globals de app.js: window.NexusWindow y showToast().
// Debe cargarse en index.html DESPUÉS de app.js.
// ==========================================================================
        // ==========================================
        // UTILIDAD COMÚN DE PLUGINS: COPIAR AL PORTAPAPELES
        // ==========================================
        window.nxCopyText = (text) => {
            if (text === undefined || text === null || text === '') {
                showToast("No hay nada que copiar.", "warning");
                return;
            }
            try {
                navigator.clipboard.writeText(String(text)).then(
                    () => showToast("Copiado al portapapeles", "success"),
                    () => showToast("No se pudo copiar", "error")
                );
            } catch (e) {
                showToast("No se pudo copiar: " + e.message, "error");
            }
        };

        // ==========================================
        // PLUGIN: 🎨 COLOR STUDIO
        // ==========================================
        function openColorStudioPlugin() {
            const htmlContent = `
                <div style="padding:18px; color:#c9d1d9; background:#0d1117; font-family:'Segoe UI',system-ui,sans-serif; height:calc(100% - 36px); display:flex; flex-direction:column; gap:16px;">
                    <div style="display:flex; align-items:center; gap:14px;">
                        <input type="color" id="cs-picker" value="#7c3aed" style="width:64px; height:64px; border:none; background:transparent; cursor:pointer;">
                        <div id="cs-preview" style="flex:1; height:64px; border-radius:8px; border:1px solid #30363d; background:#7c3aed;"></div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${['HEX','RGB','HSL'].map(fmt => `
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="width:38px; font-size:11px; color:#8b949e; font-weight:bold;">${fmt}</span>
                                <input type="text" id="cs-${fmt.toLowerCase()}" readonly style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:8px 10px; outline:none;">
                                <button onclick="window.nxCopyText(document.getElementById('cs-${fmt.toLowerCase()}').value)" class="dash-btn" style="padding:6px 10px; font-size:11px;">Copiar</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="font-size:10px; color:#6e7681; line-height:1.4; border-top:1px solid #21262d; padding-top:10px;">
                        Elige un color con el selector para convertirlo automáticamente entre formatos.
                    </div>
                </div>
            `;

            new NexusWindow({ id: 'nexus-win-color-studio', title: 'Color Studio', icon: '🎨', width: 420, height: 340, content: htmlContent });

            const hexToRgb = (hex) => {
                const m = hex.replace('#','').match(/.{1,2}/g);
                return { r: parseInt(m[0],16), g: parseInt(m[1],16), b: parseInt(m[2],16) };
            };
            const rgbToHsl = (r,g,b) => {
                r/=255; g/=255; b/=255;
                const max=Math.max(r,g,b), min=Math.min(r,g,b);
                let h,s,l=(max+min)/2;
                if (max===min){ h=s=0; }
                else {
                    const d=max-min;
                    s = l>0.5 ? d/(2-max-min) : d/(max+min);
                    switch(max){
                        case r: h=(g-b)/d+(g<b?6:0); break;
                        case g: h=(b-r)/d+2; break;
                        default: h=(r-g)/d+4;
                    }
                    h/=6;
                }
                return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
            };
            const update = () => {
                const hex = (document.getElementById('cs-picker')?.value || '#000000').toLowerCase();
                const { r,g,b } = hexToRgb(hex);
                const { h,s,l } = rgbToHsl(r,g,b);
                const preview = document.getElementById('cs-preview');
                if (preview) preview.style.background = hex;
                const set = (id,val) => { const el=document.getElementById(id); if(el) el.value=val; };
                set('cs-hex', hex.toUpperCase());
                set('cs-rgb', `rgb(${r}, ${g}, ${b})`);
                set('cs-hsl', `hsl(${h}, ${s}%, ${l}%)`);
            };
            setTimeout(() => {
                document.getElementById('cs-picker')?.addEventListener('input', update);
                update();
            }, 60);
        }

        // ==========================================
        // PLUGIN: 🔐 ENCODER / DECODER
        // ==========================================
        function openEncoderDecoderPlugin() {
            const htmlContent = `
                <div style="padding:16px; color:#c9d1d9; background:#0d1117; font-family:'Segoe UI',system-ui,sans-serif; height:calc(100% - 32px); display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-height:0;">
                        <span style="font-size:10px; color:#8b949e;">Entrada</span>
                        <textarea id="enc-input" placeholder="Escribe o pega texto aquí..." style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:8px; outline:none; resize:none;"></textarea>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button onclick="window.nxEncDec('b64enc')" class="dash-btn" style="font-size:11px; padding:6px 10px;">Base64 ▶ Codificar</button>
                        <button onclick="window.nxEncDec('b64dec')" class="dash-btn" style="font-size:11px; padding:6px 10px;">Base64 ◀ Decodificar</button>
                        <button onclick="window.nxEncDec('urlenc')" class="dash-btn" style="font-size:11px; padding:6px 10px;">URL ▶ Codificar</button>
                        <button onclick="window.nxEncDec('urldec')" class="dash-btn" style="font-size:11px; padding:6px 10px;">URL ◀ Decodificar</button>
                        <button onclick="window.nxEncDec('jwt')" class="dash-btn dash-primary-btn" style="font-size:11px; padding:6px 10px;">Decodificar JWT</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-height:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; color:#8b949e;">Resultado</span>
                            <button onclick="window.nxCopyText(document.getElementById('enc-output').value)" class="dash-btn" style="font-size:10px; padding:3px 8px;">Copiar</button>
                        </div>
                        <textarea id="enc-output" readonly style="flex:1; background:#010409; border:1px solid #30363d; border-radius:6px; color:#c9d1d9; font-family:monospace; font-size:12px; padding:8px; outline:none; resize:none;"></textarea>
                    </div>
                </div>
            `;

            new NexusWindow({ id: 'nexus-win-encoder-decoder', title: 'Encoder / Decoder', icon: '🔐', width: 560, height: 480, content: htmlContent });

            // btoa/atob seguros para UTF-8
            const b64EncodeUtf8 = (str) => btoa(unescape(encodeURIComponent(str)));
            const b64DecodeUtf8 = (str) => decodeURIComponent(escape(atob(str)));
            const b64UrlDecode = (str) => {
                let s = str.replace(/-/g,'+').replace(/_/g,'/');
                while (s.length % 4) s += '=';
                return b64DecodeUtf8(s);
            };

            window.nxEncDec = (mode) => {
                const input = document.getElementById('enc-input')?.value ?? '';
                const out = document.getElementById('enc-output');
                if (!out) return;
                try {
                    if (mode === 'b64enc') out.value = b64EncodeUtf8(input);
                    else if (mode === 'b64dec') out.value = b64DecodeUtf8(input.trim());
                    else if (mode === 'urlenc') out.value = encodeURIComponent(input);
                    else if (mode === 'urldec') out.value = decodeURIComponent(input);
                    else if (mode === 'jwt') {
                        const parts = input.trim().split('.');
                        if (parts.length < 2) throw new Error('No parece un JWT válido (se esperan 3 partes separadas por puntos).');
                        const header = JSON.parse(b64UrlDecode(parts[0]));
                        const payload = JSON.parse(b64UrlDecode(parts[1]));
                        out.value = '// HEADER\n' + JSON.stringify(header, null, 2) + '\n\n// PAYLOAD\n' + JSON.stringify(payload, null, 2);
                    }
                } catch (e) {
                    out.value = '⚠️ Error: ' + e.message;
                }
            };
        }

        // ==========================================
        // PLUGIN: #️⃣ HASH & UUID GENERATOR
        // ==========================================
        function openHashUuidPlugin() {
            const htmlContent = `
                <div style="padding:16px; color:#c9d1d9; background:#0d1117; font-family:'Segoe UI',system-ui,sans-serif; height:calc(100% - 32px); display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:10px; color:#8b949e;">Texto a hashear</span>
                        <textarea id="hash-input" placeholder="Escribe el texto..." style="height:90px; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:8px; outline:none; resize:none;"></textarea>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${[['MD5','md5'],['SHA-1','sha1'],['SHA-256','sha256']].map(([label,algo]) => `
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="width:64px; font-size:11px; color:#8b949e; font-weight:bold;">${label}</span>
                                <input type="text" id="hash-${algo}" readonly style="flex:1; background:#010409; border:1px solid #30363d; border-radius:6px; color:#7ee787; font-family:monospace; font-size:11px; padding:7px 9px; outline:none;">
                                <button onclick="window.nxCopyText(document.getElementById('hash-${algo}').value)" class="dash-btn" style="font-size:10px; padding:6px 9px;">Copiar</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="border-top:1px solid #21262d; padding-top:12px; display:flex; align-items:center; gap:8px;">
                        <button onclick="window.nxGenUuid()" class="dash-btn dash-primary-btn" style="font-size:11px; padding:7px 12px;">🆔 Generar UUID v4</button>
                        <input type="text" id="uuid-output" readonly placeholder="Aquí aparecerá el UUID..." style="flex:1; background:#010409; border:1px solid #30363d; border-radius:6px; color:#a5d6ff; font-family:monospace; font-size:12px; padding:7px 9px; outline:none;">
                        <button onclick="window.nxCopyText(document.getElementById('uuid-output').value)" class="dash-btn" style="font-size:10px; padding:6px 9px;">Copiar</button>
                    </div>
                </div>
            `;

            new NexusWindow({ id: 'nexus-win-hash-uuid', title: 'Hash & UUID Generator', icon: '#️⃣', width: 560, height: 400, content: htmlContent });

            let crypto;
            try { crypto = require('crypto'); } catch (e) { crypto = null; }

            const updateHashes = () => {
                const text = document.getElementById('hash-input')?.value ?? '';
                const set = (id,val) => { const el=document.getElementById(id); if(el) el.value=val; };
                if (!crypto) { set('hash-md5','(crypto no disponible)'); return; }
                try {
                    set('hash-md5', crypto.createHash('md5').update(text).digest('hex'));
                    set('hash-sha1', crypto.createHash('sha1').update(text).digest('hex'));
                    set('hash-sha256', crypto.createHash('sha256').update(text).digest('hex'));
                } catch (e) {
                    set('hash-md5', '⚠️ ' + e.message);
                }
            };
            window.nxGenUuid = () => {
                let uuid;
                if (crypto && crypto.randomUUID) uuid = crypto.randomUUID();
                else uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.floor(Math.random()*16), v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
                const el = document.getElementById('uuid-output');
                if (el) el.value = uuid;
            };
            setTimeout(() => {
                document.getElementById('hash-input')?.addEventListener('input', updateHashes);
                updateHashes();
            }, 60);
        }

        // ==========================================
        // PLUGIN: 🕐 TIMESTAMP CONVERTER
        // ==========================================
        function openTimestampConverterPlugin() {
            const htmlContent = `
                <div style="padding:16px; color:#c9d1d9; background:#0d1117; font-family:'Segoe UI',system-ui,sans-serif; height:calc(100% - 32px); display:flex; flex-direction:column; gap:14px;">
                    <div style="background:#161b22; border:1px solid #30363d; border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <div style="font-size:10px; color:#8b949e;">Epoch actual (segundos)</div>
                            <div id="ts-now" style="font-size:18px; color:#7ee787; font-family:monospace;">—</div>
                        </div>
                        <button onclick="window.nxCopyText(document.getElementById('ts-now').textContent)" class="dash-btn" style="font-size:10px; padding:6px 10px;">Copiar</button>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span style="font-size:11px; color:#8b949e; font-weight:bold;">Timestamp ▶ Fecha</span>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="ts-input" placeholder="Ej: 1773177870 (s o ms)" style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:8px 10px; outline:none;">
                            <button onclick="window.nxTsToDate()" class="dash-btn dash-primary-btn" style="font-size:11px; padding:7px 12px;">Convertir</button>
                        </div>
                        <div id="ts-date-out" style="background:#010409; border:1px solid #30363d; border-radius:6px; padding:10px; font-family:monospace; font-size:11px; color:#c9d1d9; line-height:1.6; min-height:56px;">—</div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span style="font-size:11px; color:#8b949e; font-weight:bold;">Fecha ▶ Timestamp</span>
                        <div style="display:flex; gap:8px;">
                            <input type="datetime-local" id="ts-date-input" step="1" style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:7px 10px; outline:none;">
                            <button onclick="window.nxDateToTs()" class="dash-btn dash-primary-btn" style="font-size:11px; padding:7px 12px;">Convertir</button>
                        </div>
                        <div id="ts-epoch-out" style="background:#010409; border:1px solid #30363d; border-radius:6px; padding:10px; font-family:monospace; font-size:11px; color:#a5d6ff; min-height:20px;">—</div>
                    </div>
                </div>
            `;

            const win = new NexusWindow({ id: 'nexus-win-timestamp', title: 'Timestamp Converter', icon: '🕐', width: 500, height: 470, content: htmlContent });

            const pad = (n) => String(n).padStart(2,'0');
            window.nxTsToDate = () => {
                const raw = (document.getElementById('ts-input')?.value || '').trim();
                const out = document.getElementById('ts-date-out');
                if (!out) return;
                if (!/^\d+$/.test(raw)) { out.textContent = '⚠️ Introduce un número entero (segundos o milisegundos).'; return; }
                let ms = Number(raw);
                if (raw.length <= 11) ms *= 1000; // asumir segundos si es corto
                const d = new Date(ms);
                if (isNaN(d.getTime())) { out.textContent = '⚠️ Timestamp fuera de rango.'; return; }
                out.innerHTML =
                    '<b>Local:</b> ' + d.toString() + '<br>' +
                    '<b>UTC:</b>   ' + d.toUTCString() + '<br>' +
                    '<b>ISO:</b>   ' + d.toISOString();
            };
            window.nxDateToTs = () => {
                const val = document.getElementById('ts-date-input')?.value;
                const out = document.getElementById('ts-epoch-out');
                if (!out) return;
                if (!val) { out.textContent = '⚠️ Selecciona una fecha y hora.'; return; }
                const d = new Date(val);
                if (isNaN(d.getTime())) { out.textContent = '⚠️ Fecha inválida.'; return; }
                const secs = Math.floor(d.getTime()/1000);
                out.innerHTML = secs + ' s&nbsp;&nbsp;·&nbsp;&nbsp;' + d.getTime() + ' ms';
            };

            const tick = () => {
                const el = document.getElementById('ts-now');
                if (!el) return false;
                el.textContent = Math.floor(Date.now()/1000);
                return true;
            };
            const timer = setInterval(() => { if (!tick()) clearInterval(timer); }, 1000);
            setTimeout(tick, 60);
            if (win) win.onClose = () => clearInterval(timer);
        }

        // ==========================================
        // PLUGIN: 🔀 DIFF CHECKER
        // ==========================================
        function openDiffCheckerPlugin() {
            const htmlContent = `
                <div style="padding:16px; color:#c9d1d9; background:#0d1117; font-family:'Segoe UI',system-ui,sans-serif; height:calc(100% - 32px); display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; gap:10px; flex:1; min-height:0;">
                        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-height:0;">
                            <span style="font-size:10px; color:#8b949e;">Texto original (A)</span>
                            <textarea id="diff-a" placeholder="Pega aquí el texto A..." style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:8px; outline:none; resize:none;"></textarea>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-height:0;">
                            <span style="font-size:10px; color:#8b949e;">Texto modificado (B)</span>
                            <textarea id="diff-b" placeholder="Pega aquí el texto B..." style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; font-family:monospace; font-size:12px; padding:8px; outline:none; resize:none;"></textarea>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button onclick="window.nxRunDiff()" class="dash-btn dash-primary-btn" style="font-size:11px; padding:7px 14px;">Comparar</button>
                        <span id="diff-stats" style="font-size:11px; color:#8b949e;"></span>
                    </div>
                    <div id="diff-output" style="flex:1; overflow:auto; background:#010409; border:1px solid #30363d; border-radius:6px; padding:10px; font-family:monospace; font-size:12px; line-height:1.5; white-space:pre-wrap;"></div>
                </div>
            `;

            new NexusWindow({ id: 'nexus-win-diff-checker', title: 'Diff Checker', icon: '🔀', width: 720, height: 540, content: htmlContent });

            const escapeHtml = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

            // Diff línea a línea basado en la subsecuencia común más larga (LCS).
            const lineDiff = (aLines, bLines) => {
                const n = aLines.length, m = bLines.length;
                const dp = Array.from({length:n+1}, () => new Array(m+1).fill(0));
                for (let i=n-1;i>=0;i--)
                    for (let j=m-1;j>=0;j--)
                        dp[i][j] = aLines[i]===bLines[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
                const res = [];
                let i=0,j=0;
                while (i<n && j<m) {
                    if (aLines[i]===bLines[j]) { res.push(['eq',aLines[i]]); i++; j++; }
                    else if (dp[i+1][j] >= dp[i][j+1]) { res.push(['del',aLines[i]]); i++; }
                    else { res.push(['add',bLines[j]]); j++; }
                }
                while (i<n) { res.push(['del',aLines[i]]); i++; }
                while (j<m) { res.push(['add',bLines[j]]); j++; }
                return res;
            };

            window.nxRunDiff = () => {
                const a = document.getElementById('diff-a')?.value ?? '';
                const b = document.getElementById('diff-b')?.value ?? '';
                const out = document.getElementById('diff-output');
                const stats = document.getElementById('diff-stats');
                if (!out) return;
                const diff = lineDiff(a.split('\n'), b.split('\n'));
                let added=0, removed=0;
                const rows = diff.map(([type,line]) => {
                    const safe = escapeHtml(line) || '&nbsp;';
                    if (type === 'add') { added++; return `<div style="background:rgba(46,160,67,0.15); color:#7ee787;">+ ${safe}</div>`; }
                    if (type === 'del') { removed++; return `<div style="background:rgba(248,81,73,0.15); color:#ff7b72;">- ${safe}</div>`; }
                    return `<div style="color:#8b949e;">&nbsp;&nbsp;${safe}</div>`;
                });
                out.innerHTML = rows.join('');
                if (stats) stats.innerHTML = `<span style="color:#7ee787;">+${added} añadidas</span> · <span style="color:#ff7b72;">-${removed} eliminadas</span>`;
            };
        }
