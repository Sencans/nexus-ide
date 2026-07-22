# Changelog

Todas las novedades notables de **Nexus IDE**. El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Seguridad
- **Cifrado de secretos en reposo**: las claves de API y las contraseñas SSH ya no se guardan en base64 reversible, sino **cifradas con el almacén de credenciales del sistema operativo** (DPAPI en Windows, Keychain en macOS, libsecret/kwallet en Linux) mediante el `safeStorage` de Electron. Formato nuevo con prefijo `v2:`; las claves antiguas en base64 se leen y **migran automáticamente** a cifrado al arrancar. Si el sistema no ofrece almacén seguro (p. ej. Linux sin keyring), degrada a base64 sin romperse.

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
