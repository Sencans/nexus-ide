// ==========================================================================
// Nexus IDE — Compañero avatar flotante "AIRI" (módulo separado de app.js)
// Overlay de escritorio: imagen/GIF, modelo 3D/VTuber (BabylonJS) y holograma.
// Arrastre, rotación, zoom y refresco en caliente.
// Depende de globals de app.js: loadBabylonJS, getAssistantConfig,
//   processAssistantInput, openPersonalAssistantConfigModal/Plugin (todas
//   function-decl globales) y window.nexusAssistantIsSpeaking.
// Se carga en index.html DESPUÉS de app.js.
// ==========================================================================
        // Determina el tipo de avatar a partir de la ruta/URL configurada.
        function nexusAvatarKind(p) {
            if (!p) return 'none';
            const s = String(p).toLowerCase().split('?')[0].split('#')[0];
            if (/\.(glb|gltf|vrm|babylon|obj|stl)$/.test(s)) return 'model';
            if (/\.(png|jpe?g|gif|webp|svg|apng|bmp|avif)$/.test(s)) return 'image';
            if (s.startsWith('blob:') || s.startsWith('data:image')) return 'image';
            // Por defecto tratamos rutas desconocidas como imagen.
            return 'image';
        }

        // Convierte una ruta de Windows/absoluta en una URL file:// utilizable por
        // <img> o el cargador de BabylonJS. Deja intactas blob:/data:/http/file.
        function nexusToFileUrl(p) {
            if (!p) return p;
            if (/^(blob:|data:|https?:|file:)/i.test(p)) return p;
            let np = String(p).replace(/\\/g, '/');
            if (!np.startsWith('/')) np = '/' + np;
            return 'file://' + encodeURI(np);
        }

        // Holograma por defecto (esfera + anillos), escalable a cualquier canvas.
        function startVtuberAnimation(canvas) {
            const ctx = canvas.getContext('2d');
            let angle1 = 0, angle2 = 0, pulse = 0;

            function draw() {
                if (!canvas.isConnected) return; // se detiene solo al quitar el canvas

                const W = canvas.width, H = canvas.height;
                const cx = W / 2, cy = H / 2;
                const base = Math.min(W, H) * 0.25;

                ctx.clearRect(0, 0, W, H);

                const speaking = window.nexusAssistantIsSpeaking;
                const speedMult = speaking ? 3.0 : 1.0;
                const scaleMult = speaking ? (1.0 + Math.sin(pulse) * 0.15) : (1.0 + Math.sin(pulse) * 0.05);

                pulse += speaking ? 0.2 : 0.05;
                angle1 += 0.02 * speedMult;
                angle2 -= 0.03 * speedMult;

                const grad = ctx.createRadialGradient(cx, cy, base * 0.08, cx, cy, base * scaleMult);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.2, '#a78bfa');
                grad.addColorStop(0.6, 'rgba(124, 58, 237, 0.3)');
                grad.addColorStop(1, 'rgba(124, 58, 237, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, base * scaleMult, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, base * 1.4 * scaleMult, base * 0.48 * scaleMult, angle1, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(cx, cy, base * 1.68 * scaleMult, base * 0.6 * scaleMult, angle2, 0, Math.PI * 2);
                ctx.stroke();

                requestAnimationFrame(draw);
            }
            draw();
        }

        // Carga un modelo 3D (GLB/GLTF/VRM/OBJ) sobre un canvas transparente con
        // BabylonJS. Devuelve un objeto de estado con dispose para limpiar.
        function startCompanionModel(canvas, cfg) {
            // yaw/pitch: rotación del modelo (controlable con el ratón).
            // interacting: true mientras el usuario arrastra para rotar (pausa el giro idle).
            const state = { engine: null, scene: null, camera: null, root: null, disposed: false, cleanupResize: null, yaw: 0, pitch: 0, interacting: false };

            loadBabylonJS((useFallback) => {
                if (state.disposed) return;
                if (useFallback || !window.BABYLON) {
                    startVtuberAnimation(canvas); // sin Babylon, usar holograma
                    return;
                }
                try {
                    const engine = new BABYLON.Engine(canvas, true, {
                        preserveDrawingBuffer: true,
                        stencil: true,
                        alpha: true,
                        antialias: true
                    });
                    const scene = new BABYLON.Scene(engine);
                    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // fondo transparente

                    const camera = new BABYLON.ArcRotateCamera('camAvatar', Math.PI / 2, Math.PI / 2.3, 3, BABYLON.Vector3.Zero(), scene);
                    const hemi = new BABYLON.HemisphericLight('hemiAvatar', new BABYLON.Vector3(0, 1, 0), scene);
                    hemi.intensity = 1.05;
                    const dir = new BABYLON.DirectionalLight('dirAvatar', new BABYLON.Vector3(-0.5, -1, -0.5), scene);
                    dir.intensity = 0.55;

                    state.engine = engine;
                    state.scene = scene;
                    state.camera = camera; // expuesta para el zoom con la rueda

                    const url = nexusToFileUrl(cfg.customAvatarPath);
                    const lower = String(cfg.customAvatarPath || '').toLowerCase();
                    // VRM es un contenedor glTF/glb; forzamos el plugin .glb para leer la malla.
                    const forceExt = lower.endsWith('.vrm') ? '.glb' : null;
                    const slash = url.lastIndexOf('/');
                    const rootUrl = url.substring(0, slash + 1);
                    const fileName = url.substring(slash + 1);

                    BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, fileName, scene, null, forceExt)
                        .then((result) => {
                            if (state.disposed) return;
                            state.root = result.meshes[0];

                            // Encuadrar el modelo automáticamente.
                            let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
                            let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
                            result.meshes.forEach(m => {
                                if (!m.getBoundingInfo || !m.getTotalVertices || m.getTotalVertices() === 0) return;
                                const bb = m.getBoundingInfo().boundingBox;
                                min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
                                max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
                            });
                            if (isFinite(min.x)) {
                                const center = min.add(max).scale(0.5);
                                const extent = max.subtract(min);
                                const radius = Math.max(extent.x, extent.y, extent.z) || 1;
                                camera.setTarget(center);
                                camera.radius = radius * 2.1;
                                camera.lowerRadiusLimit = radius * 0.7;
                                camera.upperRadiusLimit = radius * 6;
                            }

                            // Reproducir animaciones incluidas en el modelo (idle, etc.).
                            if (result.animationGroups && result.animationGroups.length) {
                                result.animationGroups.forEach(g => g.start(true));
                            }
                        })
                        .catch((err) => {
                            console.error('Companion 3D: fallo al cargar el modelo:', err);
                            if (!state.disposed) startVtuberAnimation(canvas);
                        });

                    engine.runRenderLoop(() => {
                        if (state.disposed) return;
                        const speaking = window.nexusAssistantIsSpeaking;
                        // Giro idle sólo cuando el usuario NO está rotando manualmente.
                        if (!state.interacting) state.yaw += speaking ? 0.02 : 0.006;
                        if (state.root) {
                            state.root.rotation.y = state.yaw;
                            state.root.rotation.x = state.pitch;
                        }
                        scene.render();
                    });

                    const onResize = () => { if (!state.disposed && state.engine) state.engine.resize(); };
                    window.addEventListener('resize', onResize);
                    state.cleanupResize = onResize;
                } catch (e) {
                    console.error('Companion 3D: error inicializando Babylon:', e);
                    if (!state.disposed) startVtuberAnimation(canvas);
                }
            });

            return state;
        }

        // Libera los recursos del modelo 3D del companion (si los hubiera).
        function disposeCompanionModel(state) {
            if (!state) return;
            state.disposed = true;
            try { if (state.cleanupResize) window.removeEventListener('resize', state.cleanupResize); } catch (e) {}
            try { if (state.scene) state.scene.dispose(); } catch (e) {}
            try { if (state.engine) state.engine.dispose(); } catch (e) {}
        }
        window.toggleAssistantVTuber = (enable) => {
            const existing = document.getElementById('nexus-vtuber-companion');
            if (existing) {
                // Liberar recursos (modelo 3D / intervalos / listeners) antes de quitar el nodo.
                if (existing._nexusAbort) existing._nexusAbort.abort();
                if (existing._nexus3d) disposeCompanionModel(existing._nexus3d);
                if (existing._nexusInterval) clearInterval(existing._nexusInterval);
                existing.remove();
            }
            const existingMenu = document.getElementById('nexus-vtuber-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            if (!enable) return;

            const cfg = getAssistantConfig();
            const isCompMode = window.location.search.includes('mode=companion');
            const ipc = (() => { try { return require('electron').ipcRenderer; } catch (e) { return null; } })();

            const sizePx = isCompMode
                ? Math.max(120, Math.min(900, parseInt(cfg.avatarSize) || 340))
                : 120;

            // Overlay a pantalla completa que NO captura el ratón (click-through).
            const container = document.createElement('div');
            container.id = 'nexus-vtuber-companion';
            container.style.cssText = `
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                z-index: 99999;
                pointer-events: none;
                background: transparent;
            `;

            // El "stage" es la caja del avatar: es lo único interactivo/arrastrable.
            const stage = document.createElement('div');
            stage.id = 'nexus-vtuber-stage';
            stage.style.cssText = `
                position: absolute;
                bottom: ${isCompMode ? '48px' : '60px'};
                right: ${isCompMode ? '48px' : '30px'};
                width: ${sizePx}px;
                height: ${sizePx}px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
                user-select: none;
                pointer-events: auto;
                background: transparent;
            `;
            container.appendChild(stage);
            // Insertar el overlay en el DOM ANTES de construir el avatar, para que los
            // canvas queden "conectados" y su animación (requestAnimationFrame) arranque.
            document.body.appendChild(container);

            // Tipo de avatar (imagen / modelo 3D / holograma). Decide si arrastrar el
            // cuerpo del avatar lo MUEVE (imagen/holograma) o lo ROTA (modelo 3D).
            const kind = nexusAvatarKind(cfg.customAvatarPath);
            const isModel = kind === 'model';

            // Un AbortController agrupa todos los listeners globales de esta instancia
            // para quitarlos de golpe al cerrar o recrear el companion (hot-reload).
            const ac = new AbortController();
            const sig = ac.signal;
            container._nexusAbort = ac;

            // -------- Click-through: interactivo sólo al pasar sobre el avatar --------
            let hoverCount = 0;
            let isDragging = false;
            let interactiveOn = false;
            const setInteractive = (on) => {
                if (!isCompMode || !ipc) return;
                if (on === interactiveOn) return;
                interactiveOn = on;
                ipc.send('companion-set-ignore-mouse', !on); // ignorar = no interactivo
            };
            // Ocupado = moviéndose o rotando el modelo: no devolver el click-through.
            const isBusy = () => isDragging || !!(container._nexus3d && container._nexus3d.interacting);
            const regionEnter = () => { hoverCount++; setInteractive(true); };
            const regionLeave = () => { hoverCount = Math.max(0, hoverCount - 1); if (hoverCount === 0 && !isBusy()) setInteractive(false); };

            // -------- Mover el avatar por toda la pantalla --------
            let startX = 0, startY = 0;
            const beginMove = (e) => {
                isDragging = true;
                setInteractive(true);
                stage.style.cursor = 'grabbing';
                startX = e.clientX - stage.offsetLeft;
                startY = e.clientY - stage.offsetTop;
                e.preventDefault();
                e.stopPropagation();
            };
            // Imagen/holograma: se mueven arrastrando el cuerpo. Modelo 3D: el cuerpo
            // rota, así que para moverlo se usa el tirador (grip) superior.
            if (!isModel) {
                stage.addEventListener('mousedown', (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    beginMove(e);
                });
            }
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                stage.style.left = (e.clientX - startX) + 'px';
                stage.style.top = (e.clientY - startY) + 'px';
                stage.style.right = 'auto';
                stage.style.bottom = 'auto';
            }, { signal: sig });
            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                stage.style.cursor = isModel ? 'default' : 'grab';
                if (hoverCount === 0 && !isBusy()) setInteractive(false);
            }, { signal: sig });

            // -------- Tirador para mover (aparece al pasar el ratón sobre el avatar) --------
            const grip = document.createElement('div');
            grip.id = 'nexus-vtuber-grip';
            grip.title = 'Arrastra para mover el avatar';
            grip.style.cssText = `
                position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
                width: 48px; height: 16px; border-radius: 8px;
                background: rgba(124,58,237,0.55); border: 1px solid rgba(167,139,250,0.7);
                cursor: move; pointer-events: auto; display: none;
                align-items: center; justify-content: center;
                z-index: 6; backdrop-filter: blur(4px);
            `;
            grip.innerHTML = '<span style="display:block;width:22px;height:3px;border-radius:2px;background:rgba(255,255,255,0.9);box-shadow:0 5px 0 rgba(255,255,255,0.9);"></span>';
            grip.addEventListener('mousedown', beginMove);
            stage.appendChild(grip);
            stage.addEventListener('mouseenter', () => { grip.style.display = 'flex'; });
            stage.addEventListener('mouseleave', () => { if (!isDragging) grip.style.display = 'none'; });

            // -------- Burbuja de diálogo (compatible con speakText) --------
            const bubble = document.createElement('div');
            bubble.id = 'nexus-vtuber-bubble';
            bubble.style.cssText = `
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%);
                background: rgba(20, 20, 25, 0.85);
                border: 1px solid rgba(167, 139, 250, 0.5);
                border-radius: 8px;
                padding: 6px 10px;
                font-size: 11px;
                color: #e6edf3;
                width: 180px;
                max-height: 90px;
                overflow-y: auto;
                backdrop-filter: blur(8px);
                display: none;
                pointer-events: auto;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', system-ui, sans-serif;
                text-align: center;
            `;
            stage.appendChild(bubble);

            // -------- Visual del avatar según su tipo (imagen / 3D / holograma) --------
            // Crea el canvas del holograma. IMPORTANTE: el llamador debe añadirlo
            // al DOM ANTES de llamar a startVtuberAnimation (el bucle se detiene si
            // el canvas aún no está conectado).
            const buildSphere = () => {
                const c = document.createElement('canvas');
                c.id = 'nexus-vtuber-canvas';
                c.width = sizePx;
                c.height = sizePx;
                c.style.cssText = 'width:100%;height:100%;pointer-events:none;';
                return c;
            };
            const mountSphere = (parent) => {
                const c = buildSphere();
                parent.appendChild(c);
                startVtuberAnimation(c);
                return c;
            };

            if (kind === 'image') {
                const img = document.createElement('img');
                img.id = 'nexus-vtuber-img';
                img.src = nexusToFileUrl(cfg.customAvatarPath);
                img.draggable = false;
                img.style.cssText = `
                    width: 100%; height: 100%;
                    object-fit: contain;
                    pointer-events: none;
                    filter: drop-shadow(0 8px 22px rgba(124,58,237,0.35));
                    animation: nexusBreathe 3.5s ease-in-out infinite;
                    will-change: transform;
                `;
                img.onerror = () => {
                    console.error('Companion: no se pudo cargar la imagen del avatar:', img.src);
                    if (!img.isConnected) return;
                    const c = buildSphere();
                    img.replaceWith(c);
                    startVtuberAnimation(c);
                };
                stage.appendChild(img);
                // Acelerar la "respiración" cuando el asistente habla.
                container._nexusInterval = setInterval(() => {
                    if (!img.isConnected) return;
                    img.style.animationDuration = window.nexusAssistantIsSpeaking ? '0.9s' : '3.5s';
                }, 250);
            } else if (kind === 'model') {
                const c = document.createElement('canvas');
                c.id = 'nexus-vtuber-3d';
                c.width = sizePx;
                c.height = sizePx;
                c.style.cssText = 'width:100%;height:100%;pointer-events:auto;cursor:grab;';
                stage.appendChild(c);
                const st = startCompanionModel(c, cfg);
                container._nexus3d = st;

                // Rotar el modelo arrastrando el ratón sobre él (horizontal=yaw, vertical=pitch).
                const rot = { active: false, lx: 0, ly: 0 };
                c.addEventListener('mousedown', (e) => {
                    rot.active = true;
                    st.interacting = true;      // pausa el giro idle
                    setInteractive(true);       // mantiene el overlay interactivo
                    c.style.cursor = 'grabbing';
                    rot.lx = e.clientX; rot.ly = e.clientY;
                    e.preventDefault();
                    e.stopPropagation();
                });
                document.addEventListener('mousemove', (e) => {
                    if (!rot.active) return;
                    st.yaw += (e.clientX - rot.lx) * 0.01;
                    st.pitch = Math.max(-1.2, Math.min(1.2, st.pitch + (e.clientY - rot.ly) * 0.01));
                    rot.lx = e.clientX; rot.ly = e.clientY;
                }, { signal: sig });
                document.addEventListener('mouseup', () => {
                    if (!rot.active) return;
                    rot.active = false;
                    st.interacting = false;
                    c.style.cursor = 'grab';
                    if (hoverCount === 0 && !isBusy()) setInteractive(false);
                }, { signal: sig });

                // Zoom con la rueda: acerca/aleja la cámara respetando los límites.
                c.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const cam = st.camera;
                    if (!cam) return;
                    const factor = e.deltaY > 0 ? 1.1 : 0.9;
                    const lo = cam.lowerRadiusLimit || 0.1;
                    const hi = cam.upperRadiusLimit || Infinity;
                    cam.radius = Math.max(lo, Math.min(hi, cam.radius * factor));
                }, { passive: false });
            } else {
                mountSphere(stage);
            }

            const inputContainer = document.createElement('div');
            inputContainer.id = 'nexus-vtuber-input-container';
            inputContainer.style.cssText = `
                display: none;
                position: absolute;
                top: calc(100% + 6px);
                left: 50%;
                transform: translateX(-50%);
                background: rgba(20, 20, 25, 0.9);
                border: 1px solid rgba(167, 139, 250, 0.4);
                border-radius: 6px;
                padding: 4px;
                width: 200px;
                gap: 4px;
                backdrop-filter: blur(8px);
                z-index: 100000;
                pointer-events: auto;
            `;
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Habla con el Asistente...';
            input.style.cssText = `
                flex: 1;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 4px;
                color: #fff;
                font-size: 11px;
                padding: 4px 6px;
                outline: none;
                width: 100%;
                box-sizing: border-box;
            `;
            inputContainer.appendChild(input);
            stage.appendChild(inputContainer);

            const ctxMenu = document.createElement('div');
            ctxMenu.id = 'nexus-vtuber-context-menu';
            ctxMenu.style.cssText = `
                display: none;
                position: fixed;
                background: rgba(20, 20, 25, 0.95);
                border: 1px solid rgba(167, 139, 250, 0.5);
                border-radius: 6px;
                padding: 6px 0;
                width: 170px;
                z-index: 100001;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                backdrop-filter: blur(8px);
                font-family: 'Segoe UI', system-ui, sans-serif;
                -webkit-app-region: no-drag;
            `;
            
            ctxMenu.innerHTML = `
                <div class="ctx-item" onclick="window.vtuberCtxAction('chat')" style="padding: 6px 12px; font-size: 11px; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">💬 Hablar por Chat</div>
                <div class="ctx-item" onclick="window.vtuberCtxAction('window')" style="padding: 6px 12px; font-size: 11px; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">🤖 Abrir Ventana</div>
                <div class="ctx-item" onclick="window.vtuberCtxAction('config')" style="padding: 6px 12px; font-size: 11px; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">⚙️ Configurar</div>
                ${isCompMode ? 
                    `<div class="ctx-item" onclick="window.vtuberCtxAction('ide')" style="padding: 6px 12px; font-size: 11px; color: #a78bfa; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">💻 Abrir Nexus IDE</div>` : 
                    `<div class="ctx-item" onclick="window.vtuberCtxAction('popout')" style="padding: 6px 12px; font-size: 11px; color: #a78bfa; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">📌 Flotar en Windows</div>`
                }
                <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0;"></div>
                <div class="ctx-item" onclick="window.vtuberCtxAction('close')" style="padding: 6px 12px; font-size: 11px; color: #ff7b72; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">❌ Cerrar Asistente</div>
            `;
            
            if (!document.getElementById('nexus-vtuber-ctx-styles')) {
                const style = document.createElement('style');
                style.id = 'nexus-vtuber-ctx-styles';
                style.textContent = `
                    .ctx-item:hover { background: rgba(167, 139, 250, 0.15) !important; }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(ctxMenu);

            // Mantener el overlay interactivo mientras el ratón está sobre cualquier
            // región activa (avatar, burbuja, input o menú).
            [stage, bubble, inputContainer, ctxMenu].forEach((el) => {
                el.addEventListener('mouseenter', regionEnter);
                el.addEventListener('mouseleave', regionLeave);
            });

            stage.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setInteractive(true);
                // Posicionar el menú dentro de la pantalla.
                const mw = 180, mh = 190;
                const px = Math.min(e.clientX, window.innerWidth - mw);
                const py = Math.min(e.clientY, window.innerHeight - mh);
                ctxMenu.style.left = Math.max(4, px) + 'px';
                ctxMenu.style.top = Math.max(4, py) + 'px';
                ctxMenu.style.display = 'block';
            });

            stage.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            window.vtuberCtxAction = (action) => {
                ctxMenu.style.display = 'none';
                if (action === 'chat') {
                    if (inputContainer.style.display === 'none') {
                        inputContainer.style.display = 'block';
                        input.focus();
                    } else {
                        inputContainer.style.display = 'none';
                    }
                } else if (action === 'window') {
                    openPersonalAssistantPlugin();
                } else if (action === 'config') {
                    openPersonalAssistantConfigModal();
                } else if (action === 'popout') {
                    window.toggleAssistantVTuber(false);
                    try {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('open-assistant-companion');
                    } catch(e) {
                        console.error("IPC popout failed:", e);
                    }
                } else if (action === 'ide') {
                    try {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('open-main-window');
                    } catch(e) {
                        console.error("IPC failed:", e);
                    }
                } else if (action === 'close') {
                    if (window.location.search.includes('mode=companion')) {
                        try {
                            const { ipcRenderer } = require('electron');
                            ipcRenderer.send('close-assistant-companion');
                        } catch(e) {
                            window.close();
                        }
                    } else {
                        window.toggleAssistantVTuber(false);
                    }
                }
            };

            document.addEventListener('click', () => {
                ctxMenu.style.display = 'none';
            }, { signal: sig });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = input.value.trim();
                    if (val) {
                        input.value = '';
                        inputContainer.style.display = 'none';
                        processAssistantInput(val);
                    }
                }
            });

            input.addEventListener('mousedown', (e) => e.stopPropagation());

            // El overlay ya fue insertado en el DOM antes de construir el avatar.
        };
        // Refresco en caliente: cuando se guarda la configuración del asistente en
        // cualquier ventana, re-renderiza el avatar aquí según el modo actual, sin
        // necesidad de cerrar y volver a abrir el widget flotante.
        if (!window._assistantCfgListenerBound) {
            window._assistantCfgListenerBound = true;
            try {
                require('electron').ipcRenderer.on('assistant-config-updated', () => {
                    if (typeof window.toggleAssistantVTuber !== 'function') return;
                    const cfg = getAssistantConfig();
                    const inCompanion = window.location.search.includes('mode=companion');
                    if (inCompanion || cfg.displayMode === 'vtuber') {
                        window.toggleAssistantVTuber(true); // recrea con la nueva config
                    } else {
                        window.toggleAssistantVTuber(false);
                    }
                });
            } catch (e) { /* fuera de Electron */ }
        }
