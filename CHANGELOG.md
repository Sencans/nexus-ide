# Changelog

Todas las novedades notables de **Nexus IDE**. El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Interno
- **Base de tests del núcleo agéntico**: la lógica del agente (redacción de secretos, parsing de acciones y de herramientas de lectura, conversión de *tool calls*, normalización de respuestas, confinamiento de rutas al workspace, ejecución de las herramientas de lectura y ejecución de comandos con captura de salida) se centraliza en un módulo testeable `modules/agent-core.js` con inyección de dependencias — `app.js` la usa mediante *wrappers* finos (sin cambiar comportamiento). Nueva suite `test/agent-core.test.js` con **32 tests** usando el runner nativo de Node (`node --test`, cero dependencias): `npm test`. Cubre casos límite con mocks (`child_process` para comandos: stderr, código de salida, timeout, excepciones, truncado; y `fs` para errores de lectura). Nuevo workflow de CI (`.github/workflows/test.yml`) que ejecuta sintaxis + tests en cada push/PR.

### Añadido
- **Memoria persistente del proyecto**: (1) el agente puede guardar hechos duraderos con `[REMEMBER: hecho]` (p. ej. «este proyecto usa Vite», «el estilo de commits es X»), que se persisten por proyecto y se **inyectan en el prompt en cada sesión** — memoria real cross-session; (2) la **ventana de contexto** que se envía al modelo pasa de **6 a 12 mensajes** y el historial en memoria/persistido por proyecto de 10 a 40, para no perder el hilo en tareas largas.
- **Multi-agente en paralelo — Mixture-of-Agents (`/moa`)**: además del pipeline secuencial Planner→Coder→Reviewer, ahora se puede escribir `/moa <consulta>` en el chat para lanzar la consulta a **varios modelos a la vez** (reusa los 3 modelos del multi-agente configurados, sin duplicar) y que un **sintetizador** combine lo mejor de cada respuesta en una final superior. La orquestación (`runMixtureOfAgents`) vive en `agent-core.js` y está testeada, incluida la **verificación de que las consultas corren en paralelo**.
- **Streaming de respuestas (SSE)** *(opt-in)*: el chat puede mostrar la respuesta **token a token** según se genera, en vez de esperar al POST completo. Nuevo parser SSE en `agent-core.js` para los tres formatos (OpenAI-compat, Google, Anthropic), `onChunk` en el cliente HTTP y un `onToken` en `sendRequestToAI` que emite los deltas y acumula el texto (que se devuelve intacto, así el pipeline de acciones no cambia). Se activa en Ajustes (`nexus_streaming`); por defecto desactivado.
- **Cliente MCP (Model Context Protocol)**: Nexus puede conectarse a **servidores MCP** (el estándar abierto para dar herramientas a agentes: sistemas de archivos, GitHub, bases de datos, navegadores…) sin recompilar. Nuevo módulo `modules/mcp-client.js` (JSON-RPC 2.0 sobre stdio, sin dependencias) que hace el ciclo `initialize → tools/list → tools/call`. Los servidores se configuran en Ajustes (JSON `[{name, command, args}]`); sus herramientas se inyectan en el *system prompt* y el agente las invoca con `[MCP: servidor herramienta {args}]`, resueltas automáticamente en el bucle agéntico (con la salida redactada de secretos).
- **Bucle agéntico ReAct: el agente OBSERVA el resultado de sus acciones y continúa**. Antes ejecutaba una sola pasada (respuesta → parse → ejecuta) y no veía qué pasó. Ahora los comandos se ejecutan **capturando su salida** (stdout/stderr, código de salida, con timeout de 120 s), y esa salida —junto con el resultado de las escrituras— se le devuelve al modelo para que revise, **corrija errores** (p. ej. un test que falla) o continúe con el siguiente paso, hasta 4 iteraciones. Cada acción sigue pasando por el **gate de permisos**, y la salida se **redacta** de secretos antes de enviarla al modelo.
- **Tool-calling nativo (function calling) para proveedores OpenAI-compat** *(opt-in)*: además del protocolo de etiquetas de texto (universal, sigue por defecto), el agente puede usar el *function calling* nativo de los proveedores en la nube. Los `tool_calls` del modelo se convierten a las mismas etiquetas del pipeline, así que la ejecución, el gate de permisos y el bucle de lectura no cambian. Incluye **fallback automático**: si un proveedor rechaza el parámetro `tools`, se reintenta sin él. Se activa con `nexus_native_tools=true` (por defecto desactivado, ya que su aceptación depende del proveedor y conviene probarlo con tu propia clave).
- **El agente ahora puede LEER y explorar el repositorio** (antes solo podía escribir y ejecutar, trabajando a ciegas). Tres herramientas de lectura que el modelo invoca por su cuenta: `[READ_FILE: ruta]`, `[LIST_DIR: ruta]` y `[GREP: patrón]`. Son **seguras** (solo lectura y **confinadas al workspace**: se rechaza cualquier ruta que escape, p. ej. `../../.ssh/id_rsa`), así que se **auto-ejecutan sin pedir permiso**. Un **bucle agéntico** devuelve los resultados al modelo (hasta 5 iteraciones) para que investigue el código antes de modificarlo; las escrituras/comandos siguen pasando por el gate de permisos. Los resultados de lectura también se **redactan** de secretos.
- **Redacción de secretos antes de enviar contexto a la IA en la nube**: el IDE manda el archivo activo, los fragmentos de RAG y los adjuntos al modelo; ahora un filtro (`redactSecrets`) sustituye por `«SECRETO_REDACTADO»` las API keys (OpenAI, Anthropic, Google, GitHub, Groq, xAI, OpenRouter, AWS, Slack), los JWT, los tokens `Bearer`, las contraseñas embebidas en *connection strings*, los bloques de clave privada PEM y las asignaciones tipo `.env` con valor literal. Conservador: no toca referencias a variables (`process.env.X`), `null`, ni identificadores cortos. Verificado: 10/10 secretos redactados, 0 falsos positivos en código legítimo.

### Seguridad
- **Sandbox de ejecución (Docker)**: opción para que los comandos del agente se ejecuten **aislados dentro de un contenedor Docker** en vez de directamente en el host, montando solo el workspace en `/workspace`. Mitiga el riesgo de que una acción del agente (o un *prompt-injection* incrustado en un archivo) dañe la máquina. Configurable en Ajustes (imagen Docker elegible, p. ej. `node:20-slim` o `python:3.12-slim`); si Docker no está disponible, avisa y ejecuta en el host. Por defecto desactivado.
- **Cifrado de secretos en reposo**: las claves de API y las contraseñas SSH ya no se guardan en base64 reversible, sino **cifradas con el almacén de credenciales del sistema operativo** (DPAPI en Windows, Keychain en macOS, libsecret/kwallet en Linux) mediante el `safeStorage` de Electron. Formato nuevo con prefijo `v2:`; las claves antiguas en base64 se leen y **migran automáticamente** a cifrado al arrancar. Si el sistema no ofrece almacén seguro (p. ej. Linux sin keyring), degrada a base64 sin romperse.
- **Endurecimiento de las ventanas de Electron** (defensa en profundidad contra inyección de contenido, ya que el renderer usa Node):
  - **Contención de navegación**: `setWindowOpenHandler` bloquea la apertura de ventanas nuevas y abre los enlaces externos en el navegador del SO; guard de `will-navigate` que impide que la app navegue fuera del contenido local; se rechaza cualquier `<webview>` (`webviewTag: false` + guard). Aplicado a la ventana principal y a la del compañero.
  - **Content-Security-Policy**: nueva política que bloquea `<object>/<embed>`, restringe `base-uri`/`form-action` y limita los orígenes de script/estilo/frame a los locales y a los CDN de confianza (Monaco, Babylon, fuentes, Excalidraw; `frame-src file:` para la Vista en Vivo). Verificada para no romper Monaco, Babylon 3D, la Vista en Vivo, las fuentes ni las llamadas a las APIs de IA.
  - **Permisos y dispositivos**: se añade `setPermissionCheckHandler` (la ruta síncrona que el request handler no cubría) con la misma allowlist (solo cámara/micrófono), se deniegan WebUSB/Serial/HID/Bluetooth (`setDevicePermissionHandler` + eventos `select-*-device`), y el guard de navegación cubre también los redirects 30x (`will-redirect`).
  - **Artefactos de depuración fuera de producción**: las DevTools y el volcado periódico de capturas a disco (`app_screenshot.png` cada 2 s) ahora solo se activan con `NEXUS_DEV=1`. Antes las DevTools se abrían siempre (un REPL de Node con `nodeIntegration`) y las capturas se escribían continuamente.

## [2.1.0] — 2026-07-21

Ronda de calidad: implementación real del bot de Discord, reparación de varios subsistemas que "parecían vivos pero estaban rotos", y más modularización del código.

### Añadido
- **Bot de Discord funcional** (antes era un campo de token sin nada detrás): nuevo módulo `modules/discord-bot.js` que conecta al Discord Gateway (WebSocket) y envía por REST, sin dependencias. Control por **mensaje directo** con `/help`, `/status`, `/chat`, `/cmd`, `/approve`, `/deny`; notificaciones proactivas de AIRI también por Discord. Nuevo campo **Channel ID** en la config.
- **Guía de usuario completa** ([`GUIA.md`](GUIA.md)) que documenta todas las funciones y cómo configurarlas.

### Arreglado
- **Cardinal Code Supervisor** (auto-revisión/corrección de código) estaba **muerto por defecto**: usaba una variable fuera de scope (`ReferenceError` silencioso). Ahora funciona; además aplica **todas** las correcciones al **archivo correcto**, respeta el checkbox de auto-corrección, es `$`-safe, y el pre-flight ya no rechaza código válido (`if/for/while`/métodos).
- **SSH/VPS inalcanzable**: el icono de la barra lateral estaba oculto sin otra entrada → **revelado** (todo el subsistema SSH/SFTP/terminal ya funcionaba).
- **Colaboración multi-agente** rota out-of-the-box: dejaba de fijar el rol *Coder* a un Ollama local inexistente para usuarios solo-nube.
- **ComfyUI**: los generadores ya no se cuelgan para siempre ante errores de ejecución (manejo de `execution_error` + timeout).
- **Telegram**: `Content-Length` en bytes UTF-8 (los mensajes con emojis/acentos ya no fallan).

### Seguridad
- El **Coder del equipo multi-agente** ejecutaba escrituras de archivos y comandos de shell (incluso en rutas absolutas fuera del workspace) **sin respetar los permisos del agente**. Ahora, si el usuario tiene activada la confirmación (por defecto), **aprueba todas las acciones** antes de tocar el disco o ejecutar nada.
- **SSH**: se añadió **verificación de host key (TOFU)** — memoriza la huella SHA-256 del servidor en la primera conexión y rechaza si cambia (protección contra ataques *man-in-the-middle*).

### Cambiado
- **Modularización (fases 2 y 3)**: el avatar/compañero se movió a `modules/companion.js` y el registro/motor de IA a `modules/ai-providers.js`. `app.js` baja a ~20k líneas.

## [2.0.0] — 2026-07-20

Versión mayor: la app evoluciona de editor con IA a un **IDE multiplataforma** con compañero virtual, ecosistema de plugins y una arquitectura de código modular.

### Añadido
- **Compañero avatar flotante (AIRI)**: overlay de escritorio transparente y *siempre encima* que funciona fuera de la ventana del IDE. Soporta **imágenes/GIF**, **modelos 3D/VTuber (GLB, GLTF, VRM)** y un holograma por defecto. Arrastrable por toda la pantalla, con **rotación y zoom** del modelo 3D y **refresco en caliente** al guardar la configuración.
- **5 plugins de utilidad** (offline y autocontenidos): Color Studio, Encoder/Decoder (Base64/URL/JWT), Hash & UUID (MD5/SHA), Timestamp Converter y Diff Checker.
- **8 proveedores de IA nuevos**:
  - Nube: **Together AI, Perplexity, Fireworks, Cerebras**.
  - Local: **LM Studio, Jan, llama.cpp, vLLM**.
- **Compatibilidad con Linux**: empaquetado para **Fedora (rpm), Arch (pacman), Debian (deb), AppImage y tar.gz** con electron-builder; icono de app; comandos por SO (apagado, shell del terminal). Guía [`INSTALL-LINUX.md`](INSTALL-LINUX.md).
- **CI/CD**: workflow de GitHub Actions que compila y publica los paquetes de Linux (incl. contenedor Arch) y Windows en cada release.

### Cambiado
- **Arquitectura modular**: `index.html` (antes ~23.5k líneas) se separa en `index.html` (shell), `styles.css`, `app.js` y `modules/` — sin cambios de comportamiento.
- Motor de IA refactorizado a un **registro de proveedores** OpenAI-compatibles; manejo de servidores locales generalizado (URL + modelo configurables por proveedor).
- README profesional, `LICENSE` (MIT) y `.gitignore` mejorado.

## [1.4.0] — Supervisión, generación multimedia y personalización

### Añadido
- **Cardinal Code Supervisor**: panel y bucle silencioso de correcciones/auditorías con captura visual para la IA.
- Generación de **imágenes y vídeos desde el chat** en segundo plano (ComfyUI).
- **Visual Blueprints** (scripting visual por nodos) y cliente **SQL universal** (SQL Server / Azure SQL).
- **Tour de onboarding**, autoinstalador de ComfyUI, **Modo Lite**, modelos locales de Google Gemma y descargador con *streaming*.
- Pestaña de **Personalización** (temas y fondos personalizados) y panel de autocompletado estilo **Codex**.

## [1.3.0] — Multimedia, remoto y voz

### Añadido
- Generador de vídeo **ComfyUI** con descargador de modelos y ejecutor por WebSocket.
- **Conexiones VPS remotas (SSH/SFTP)**, terminal SSH y edición de archivos por SFTP.
- **Dictado de voz a texto** en el chat.

## [1.2.0] — Multi-agente, telemetría y motores

### Añadido
- Selector de modelos premium, **dropdown de agentes personalizados** y **colaboración multi-agente híbrida** con IPC de Electron.
- Autocompletado local con Monaco, **burbuja de notificaciones de AIRI**, **bot remoto de Telegram** y modal de previsualización 3D.
- **Autodetección de motores de juego multiplataforma** (Windows, macOS, Linux).
- Historiales de chat por proyecto, notificaciones nativas de permisos y **telemetría de hardware** (CPU/RAM/GPU/VRAM).

## [1.1.0] — Dashboard, plantillas y proveedores en la nube

### Añadido
- Pantalla de inicio (dashboard) a pantalla completa, cambio de proyecto y carpeta de trabajo vinculada.
- Modal de **plantillas de proyecto**, selector de modelos con búsqueda, **proveedores de IA en la nube** y adjuntos en el chat.
- Auto-instalador de requisitos, acciones en modo chat y compilación de ejecutables.

## [1.0.0] — Lanzamiento inicial

### Añadido
- Editor de código de escritorio (Electron) con Monaco, explorador de archivos y espacio de trabajo por defecto en `~/NexusProjects`.

[2.0.0]: https://github.com/Sencans/nexus-ide/releases/tag/v2.0.0
