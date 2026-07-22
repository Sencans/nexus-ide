<div align="center">

# 📖 Guía de Funciones y Configuración — Nexus IDE

**Manual completo de todo lo que hace Nexus IDE y cómo configurarlo.**

[![Versión](https://img.shields.io/badge/versión-2.1.0-7c3aed?style=flat-square)](CHANGELOG.md)

</div>

---

Nexus IDE es un entorno de desarrollo de escritorio (Electron) que combina un editor de código potente con asistencia de IA multi-proveedor, un compañero virtual (AIRI), generación multimedia, control remoto y un ecosistema de plugins. Esta guía recorre **cada función** y **cómo configurarla**.

> 💡 La mayoría de ajustes se abren con **`Alt+Espacio`** (Ajustes) o el icono de engranaje ⚙. Tus claves de API y preferencias se guardan **localmente** en tu equipo (`localStorage`), nunca se envían a servidores externos.

## 📑 Índice

- [Editor, espacio de trabajo y terminal](#editor-espacio-de-trabajo-y-terminal)
- [IA: chat, proveedores y colaboración multi-agente](#ia-chat-proveedores-y-colaboración-multi-agente)
- [AIRI: asistente, compañero avatar y Cardinal](#airi-asistente-compañero-avatar-y-cardinal)
- [Control remoto: bots de Telegram y Discord](#control-remoto-bots-de-telegram-y-discord)
- [Generación multimedia, 3D y conexiones remotas](#generación-multimedia-3d-y-conexiones-remotas)
- [Plugins, personalización y sistema](#plugins-personalización-y-sistema)

---

## 🖥️ Editor, espacio de trabajo y terminal

El corazón de Nexus IDE es su editor de código profesional (basado en **Monaco**, el mismo motor de VS Code), acompañado de un explorador de archivos, pestañas, un terminal real integrado y plantillas de proyecto listas para usar. Todo funciona sin conexión.

### El editor de código

Al abrir un archivo, Nexus detecta automáticamente el lenguaje por su extensión y aplica **resaltado de sintaxis** para más de 40 tipos de archivo, organizados en categorías:

| Categoría | Lenguajes incluidos |
|---|---|
| Web | HTML, CSS, SCSS, SASS, LESS, JavaScript, JSX, TypeScript, TSX, Vue, Svelte |
| Backend | Python, Ruby, PHP, Go, Rust, Java, Kotlin, Swift, C#, C, C++ (y cabeceras `.h`/`.hpp`) |
| Scripting | Bash/Shell, PowerShell, Batch, Lua, R, Dart |
| Datos/Config | JSON, YAML, TOML, XML, CSV, SQL, GraphQL, `.env`, INI, Dockerfile |
| Documentos | Markdown, MDX, Texto, RST |
| Videojuegos | GDScript, GDShader, GLSL, HLSL |

El lenguaje detectado y la posición del cursor (`Ln 1, Col 1`) se muestran en la **barra de estado** inferior.

#### Autocompletado y snippets (locales, sin IA)

Al escribir, el editor sugiere fragmentos de código. Incluye snippets integrados para:

- **JavaScript/TypeScript**: `rafce` (componente React), `useState`, `useEffect`, `fetchapi`, `cl` (`console.log`), `afn` (función async con try/catch).
- **Python**: `main`, `class`, `fastapi`, `flask`, `dataclass`.
- **HTML**: `html5`, `nav`, `form`. **SQL**: `select`, `create`, `join`.
- **GDScript (Godot 4)**: `ready`, `process`, `signal`, `export`, además de palabras clave como `extends`, `func`, `onready`, `@export`, y tipos como `Vector3`, `Vector2`, `Color`.
- **C++**: autocompletado orientado a **Unreal Engine** — `UCLASS`, `GENERATED_BODY`, `UPROPERTY`, `UFUNCTION`, `BeginPlay`, `Tick`, `FVector`, `FRotator`.

#### Editor dividido (split)

Puedes trabajar con dos archivos lado a lado. Pulsa `Ctrl+\` (o menú **Ver → Dividir Editor**) para abrir el segundo panel.

### Cómo configurar el editor

1. Abre **Ajustes** con `Alt+Espacio` y entra en la pestaña **Editor**.
2. Ajusta estas opciones (se guardan en `localStorage` bajo la clave `nexus_settings`):

| Opción | Valor por defecto |
|---|---|
| Tamaño de fuente | `14` |
| Familia de fuente | `Consolas, monospace` |
| Tamaño de tabulación | `4` (elige entre 2, 4 u 8) |
| Minimapa | Desactivado (alterna también con `F7`) |
| Ajuste de línea (word wrap) | Desactivado |
| Formatear al guardar | Desactivado |

3. Pulsa **Guardar Configuración**. También puedes fijar aquí el **Tipo de Proyecto** (Web / Código / Juego).

### El explorador de archivos

El panel lateral izquierdo muestra el árbol de archivos de tu carpeta de trabajo (icono de carpeta, "Explorador de Archivos").

#### Cómo usar

1. Haz clic en un archivo del árbol para abrirlo en una pestaña.
2. Para crear archivos o carpetas usa el menú **Archivo** de la barra superior: **Nuevo Archivo** (`Ctrl+N`) o **Nueva Carpeta**.
3. El conmutador **Local / VPS** (arriba del panel) permite explorar la carpeta local o un servidor remoto por SSH/SFTP cuando hay conexión configurada.

### Las pestañas

Cada archivo abierto aparece como una pestaña sobre el editor, con una barra de **breadcrumbs** (migas de ruta) debajo. Al dividir el editor, cada panel tiene su propia fila de pestañas independiente. Cierra la pestaña activa con `Ctrl+W`.

### El terminal integrado

Nexus incluye un **terminal real** (no simulado) en el panel inferior, que lanza el shell de tu sistema con la carpeta de trabajo actual como directorio.

#### Cómo usar

1. Muestra u oculta el terminal con `Ctrl+` `` ` `` (o menú **Ver → Mostrar/Ocultar Terminal**).
2. Escribe tu comando en el campo inferior (prefijo `PS >`) y pulsa `Enter`.
3. Ciérralo con el botón `✖` de su barra de pestañas.

Si el entorno no permite lanzar procesos, Nexus recurre a un **terminal de simulación** con comandos emulados básicos (`ls`, `clear`, `cat <archivo>`). En Windows fuerza codificación UTF-8 automáticamente.

### Cómo configurar el shell del terminal

El shell disponible depende de tu sistema operativo. Por defecto se usa **PowerShell** en Windows y **Bash** en Linux/macOS.

1. Abre **Ajustes** (`Alt+Espacio`) → pestaña **Terminal**.
2. Elige el shell en el desplegable según tu SO:

| Sistema | Opciones de shell |
|---|---|
| Windows | PowerShell (`powershell.exe`), Símbolo del Sistema (`cmd.exe`), Bash (Git Bash / WSL) |
| macOS | Zsh (por defecto), Bash, sh (POSIX) |
| Linux | Bash (por defecto), Zsh, Fish, sh (POSIX) |

3. Pulsa **Guardar Configuración**. El terminal se **reinicia al instante** con el nuevo shell (clave guardada: `terminalShell`).

### Plantillas de proyecto

Para empezar un proyecto con estructura y archivos base ya creados, usa el modal de plantillas.

#### Cómo usar

1. Menú **Archivo → Nuevo Proyecto desde Plantilla** (o el botón **Nuevo Proyecto** del Centro de Inicio).
2. Elige una de las tarjetas disponibles:

| Web/Front | Backend/API | Escritorio/Móvil | Juegos/3D | Datos/IA/Otros |
|---|---|---|---|---|
| Web Vanilla, React App, Vue 3 App, Mobile Responsive UI | Python FastAPI, Node.js Express, Go REST API, ASP.NET Core API, Azure Functions | .NET Desktop Console, WinUI 3 App, Mobile C++ NDK, Office Add-in M365 | Godot 4 Game, Three.js 3D, C++ Game (Raylib), Embedded Arduino C++ | Rust CLI, C++ Console (CMake), Docker + API, Database SQLite, AI Agent Script, Science & Analytics, Agent Extension, Cross-platform Script |

3. Indica el **nombre** del proyecto y la **carpeta destino**. Nexus crea los archivos y abre el proyecto en el editor.

### Cambiar la carpeta de trabajo (~/NexusProjects)

Al arrancar por primera vez, Nexus crea y usa la carpeta **`NexusProjects`** dentro de tu carpeta de usuario (por ejemplo, `C:\Users\TuUsuario\NexusProjects`).

Para trabajar en otra carpeta:

1. Menú **Archivo → Abrir Carpeta** o pulsa `Ctrl+O`.
2. Selecciona la carpeta en el diálogo del sistema (si no hay diálogo nativo, escribe la ruta absoluta).
3. El explorador y el control de versiones (Git) se recargan con la nueva ubicación. La ruta se recuerda para el próximo arranque.

### Atajos de teclado

Estos atajos están confirmados en el código (manejador global de `keydown` en `app.js`):

| Atajo | Acción |
|---|---|
| `Alt+Espacio` | Abrir Ajustes |
| `Ctrl+P` | Paleta de comandos |
| `Ctrl+N` | Nuevo archivo |
| `Ctrl+O` | Abrir carpeta / espacio de trabajo |
| `Ctrl+S` | Guardar archivo |
| `Ctrl+W` | Cerrar archivo activo |
| `Ctrl+\` | Dividir el editor |
| `Ctrl+` `` ` `` | Mostrar/ocultar el terminal |
| `Alt+Shift+F` | Formatear el código |
| `F7` | Alternar el minimapa |
| `Ctrl+K` y luego `Z` | Alternar Modo Zen (requiere la extensión "Modo Zen" instalada) |
| `Ctrl+Alt+C` | Alternar el panel de Chat |
| `Ctrl+Alt+P` | Centro de Inicio / Proyectos |
| `Ctrl+Alt+M` | Marketplace de plugins |
| `Ctrl+Alt+D` | Gestor Docker |
| `F9` | Ejecutar el juego en Godot |
| `Ctrl+F9` | Abrir el editor de Godot |
| `F1` o `Ctrl+F1` | Abrir el Manual de Usuario |
| `Ctrl++` / `Ctrl+=` | Acercar zoom de la interfaz |
| `Ctrl+-` | Alejar zoom de la interfaz |
| `Ctrl+0` | Restablecer el zoom |
| `Escape` | Cerrar la paleta de comandos |

> Nota: los menús superiores **Archivo**, **Editar** y **Ver** muestran junto a cada opción su atajo (p. ej. Deshacer `Ctrl+Z`, Buscar en archivo `Ctrl+F`, que son funciones nativas del editor). La **paleta de comandos** (`Ctrl+P`) da acceso rápido a acciones como Guardar Archivo, Formatear Código, Dividir Editor, Vista en Vivo, Configuración, Gestor Docker o Manual de Usuario.

---

## 🤖 IA: chat, proveedores y colaboración multi-agente

Nexus IDE integra un asistente de IA en el panel derecho con acceso a tu proyecto. Puedes elegir entre **18 proveedores** (13 en la nube y 5 locales) y hasta poner a **varios modelos a trabajar en equipo** sobre la misma tarea.

### Cómo usar

**El chat y sus dos modos**

En la cabecera del panel derecho hay dos pestañas:

1. **`Chat`** — conversas con la IA, le haces preguntas y adjuntas archivos, imágenes, vídeos o notas de voz. No modifica nada por su cuenta.
2. **`Agente ←`** — el asistente puede **crear/editar archivos y ejecutar comandos** de terminal de forma autónoma (siempre con tu aprobación, según el nivel de seguridad configurado).

Para enviar un mensaje escribe en la caja de texto y pulsa `Enter`; usa `Shift+Enter` para saltar de línea sin enviar.

Justo encima de la caja de escritura tienes el selector **`Contexto:`**, que decide qué código ve la IA:

| Opción | Qué envía a la IA |
|---|---|
| `Completo (Archivo Activo)` | Todo el contenido del archivo abierto |
| `Selección (Monaco)` | Solo el texto que tengas seleccionado en el editor |
| `Sin Contexto` | Nada del código; solo tu mensaje |

**El selector de modelos**

Arriba del todo, en la cabecera del chat, está el botón del modelo activo (muestra el icono 🤖, el nombre del modelo y su ventana de contexto). Al pulsarlo se abre un desplegable con:

1. Un **buscador** ("Buscar modelo (ej. gemini, sonnet, grok)…") que filtra por nombre, proveedor o descripción.
2. La lista de modelos **agrupada por proveedor**, cada uno con su ventana de contexto y su velocidad.
3. Un **punto de estado** por modelo: verde = "● Configurado", gris = "○ Sin API key".

Haz clic en cualquier modelo para activarlo. El nombre del modelo elegido también aparece en la **barra de estado inferior**. Los modelos **locales** siempre aparecen como disponibles porque **no necesitan clave** (basta con tener su servidor encendido).

### Proveedores disponibles

**Proveedores en la nube (requieren API key):**

Google Gemini, Anthropic (Claude), OpenAI, Groq, Mistral, DeepSeek, Moonshot (Kimi), xAI (Grok), OpenRouter, Together AI, Perplexity, Fireworks AI y Cerebras. Perplexity destaca por incluir **búsqueda web en tiempo real** (modelos Sonar).

**Proveedores locales (NO requieren clave, corren en tu equipo):**

| Servidor local | URL por defecto | Modelo por defecto |
|---|---|---|
| Ollama | `http://127.0.0.1:11434` | `qwen2.5-coder:7b` |
| LM Studio | `http://127.0.0.1:1234` | `local-model` |
| Jan | `http://127.0.0.1:1337` | `llama3.2:3b` |
| llama.cpp (llama-server) | `http://127.0.0.1:8080` | `default` |
| vLLM | `http://127.0.0.1:8000` | `default` |

Todos los locales se consumen por el estándar compatible con OpenAI (`/v1/chat/completions`), así que puedes cargar cualquier modelo que soporte tu servidor.

### Cómo configurar las API keys

1. Abre el **Gestor de Configuración** con el botón del engranaje **⚙** de la interfaz, o con el atajo `Alt+Espacio`.
2. En la barra lateral, entra en la pestaña **`🤖 APIs`** (pestaña por defecto).
3. Selecciona el proveedor que quieras en la lista de la izquierda.
4. Pega tu clave en el campo **API Key** (el botón `👁` alterna mostrar/ocultar la clave) y pulsa **Guardar**. Para borrarla usa **Eliminar**.
5. Al guardar, el punto de estado del proveedor pasa a verde 🟢 y el modelo queda listo para usarse.

Cada proveedor incluye un enlace directo a la página donde generar la clave. Referencia rápida del prefijo y de dónde obtenerla:

| Proveedor | Prefijo de clave | Dónde obtenerla |
|---|---|---|
| Google Gemini | `AIzaSy...` | aistudio.google.com/apikey |
| Anthropic (Claude) | `sk-ant-...` | console.anthropic.com/api-keys |
| OpenAI | `sk-proj-...` | platform.openai.com/api-keys |
| Groq | `gsk_...` | console.groq.com/keys |
| Mistral | (clave de API) | console.mistral.ai/api-keys |
| DeepSeek | `sk-...` | platform.deepseek.com/api_keys |
| Moonshot (Kimi) | `sk-...` | platform.moonshot.cn/console/api-keys |
| xAI (Grok) | `xai-...` | console.x.ai |
| OpenRouter | `sk-or-v1-...` | openrouter.ai/keys |
| Together AI | (clave de API) | api.together.xyz/settings/api-keys |
| Perplexity | `pplx-...` | perplexity.ai/settings/api |
| Fireworks AI | `fw_...` | fireworks.ai/account/api-keys |
| Cerebras | `csk-...` | cloud.cerebras.ai |

> Las claves se guardan **solo en tu equipo** (almacenamiento local del navegador, codificadas en base64), no se envían a ningún servidor de Nexus.

**Configurar un proveedor local (URLs):**

1. En **⚙ → 🤖 APIs**, selecciona el servidor local (Ollama, LM Studio, Jan, llama.cpp o vLLM).
2. Rellena **URL del servidor** (por ejemplo `http://127.0.0.1:11434`) y **Modelo** (el nombre exacto que tengas cargado). Si lo dejas vacío, se usa el valor por defecto de la tabla anterior.
3. Pulsa **Guardar**. No hace falta ninguna clave.
4. **Solo Ollama:** dispone de un **Descargador Rápido de Modelos** integrado; elige un modelo de la lista (Gemma 2, Qwen 2.5 Coder, CodeGemma…) y pulsa **Descargar** para instalarlo con barra de progreso.

### Colaboración multi-agente (Dev Team)

En lugar de un solo modelo, puedes montar un **equipo de IA** con tres roles que colaboran en tu petición:

- **Planificador (Planner):** analiza el requisito y traza el plan de acción.
- **Desarrollador (Coder):** implementa el plan (escribe código, archivos y comandos).
- **Revisor (Reviewer):** audita y controla la calidad de lo que produjo el Coder.

**Cómo activarlo:**

1. Cambia a la pestaña **`Agente ←`**. *(La colaboración solo funciona en modo Agente; en modo Chat el checkbox no tiene efecto.)*
2. En el panel superior del chat, marca la casilla **👥 Colaboración de Agentes**. La insignia cambiará de `INACTIVO` a `Activo` y se desplegará el panel de configuración.
3. Elige una **Estrategia**:

| Estrategia (menú) | Cómo asigna los modelos |
|---|---|
| **⚖️ Economía de Tokens (Gemini Flash)** | Usa modelos rápidos y baratos (Gemini Flash u Ollama local) para los tres roles. Es la opción por defecto. |
| **⚡ Alto Rendimiento (Claude / Pro)** | Emplea los modelos más potentes que tengas configurados (Claude Sonnet, GPT-4o, Gemini Pro). |
| **Multiproveedor Óptimo** | Reparte cada rol entre proveedores distintos según su fortaleza (razonamiento para el Planner, código para el Coder, auditoría para el Reviewer). |
| **Personalizado (Roles)** | Se muestran tres desplegables para que **elijas manualmente** el modelo de cada rol (Coder, Planner y Reviewer). |

4. Debajo verás la lista de **Proveedores Activos** (los que tengas configurados). Necesitas **al menos un proveedor configurado**; si no hay ninguno, aparece el aviso "⚠️ Configura APIs en el engranaje ⚙" y la colaboración no arrancará.
5. Escribe tu petición y envíala: verás el progreso paso a paso de cada agente (Planner → Coder → Reviewer) hasta completar la tarea.

> Consejo: las estrategias automáticas se apoyan en los proveedores que tengas dados de alta. Cuantos más configures (o cuantos más modelos locales tengas encendidos), mejor podrá repartir Nexus cada rol al modelo más idóneo.

---

Archivos de referencia usados (rutas absolutas):
- `C:/Users/USER/Documents/xz/nexus-ide/modules/ai-providers.js` — registro de modelos (`AI_MODELS_FULL`), URLs de nube (`CLOUD_OPENAI_URLS`), puertos/modelos locales por defecto (`LOCAL_AI_DEFAULT_URLS`, `LOCAL_AI_DEFAULT_MODELS`), claves de localStorage (`localUrlKey`/`localModelKey`).
- `C:/Users/USER/Documents/xz/nexus-ide/app.js` — selector de modelos (`createModelSelector`), gestor de claves (`openConfigWindow`/`selectProvider`/`verifyAndSaveKey`/`deleteKey`), colaboración (`getModelsForCollaboration`, estrategias, `getStrategyName`), toggle Chat/Agente y `isMultiAgent`.
- `C:/Users/USER/Documents/xz/nexus-ide/index.html` — UI del chat, pestañas Chat/Agente, selector de contexto y panel multi-agente.

---

## 🤖 AIRI: asistente, compañero avatar y Cardinal

Nexus IDE integra tres piezas de inteligencia artificial que trabajan juntas: **AIRI**, tu asistente personal con voz, visión y habilidades; su **compañero avatar flotante** (opcional, arrastrable por toda la pantalla); y **Cardinal**, el supervisor que vigila y repara tu código de forma automática.

---

### 🧠 AIRI — Asistente personal

AIRI es un copiloto de IA que puede conversar contigo, hablar en voz alta, mirar tu pantalla o tu cámara, controlar la música y ordenar tus archivos. Elige un modelo de IA distinto según el tipo de tarea, para equilibrar velocidad, calidad y coste.

#### Cómo usar

1. **Actívala**: en la barra superior del panel de IA pulsa el botón **`Acompañante AIRI: OFF`** para ponerlo en **`ON`** (o marca *👤 Habilitar Acompañante 3D AIRI* en la configuración general). Al activarla aparece también la campana de **notificaciones de AIRI** (abajo a la derecha).
2. **Abre su ventana de chat**: ve a *Plugins Instalados → Asistente Personal Core → **Ejecutar***. Se abre la ventana **Asistente Personal (AIRI)** con:
   - Un **chat** ("Haz una pregunta o dale un comando…" + botón **Enviar**).
   - Botones **Ajustes**, **Limpiar Chat**, un **Planificador** y un panel de **Memoria y Aprendizaje** (errores aprendidos y recordatorios activos).
3. **Háblale por escrito o por voz**. Según tu petición, AIRI ejecuta habilidades automáticamente. Ejemplos:
   - "Mira mi pantalla y dime qué falla" → captura la pantalla y la analiza (habilidad **Visión**).
   - "Pon la siguiente canción" → controla Spotify.
   - "Recuérdame revisar el build en 10 minutos" → crea una alarma.

#### Cómo configurar

Abre **Ajustes → Configurar Asistente Personal**. Ahí encontrarás cinco bloques:

**1. Proveedores de IA (un modelo por tipo de tarea).** AIRI cambia de proveedor automáticamente según la complejidad del mensaje:

| Selector | Cuándo se usa | Por defecto |
|---|---|---|
| **1. Chat Normal** (conversación diaria) | Mensajes normales | Google AI (Gemini) |
| **2. Tareas Complejas** (visión y archivos) | Al pedir ver la pantalla/cámara, fotos, archivos, carpetas o plugins | Anthropic (Claude) |
| **3. Alto Consumo** (mucha ventana de contexto) | Al indexar, RAG, "buscar en proyecto", "leer todo", o tras muchos mensajes | Google AI (Gemini) |

Hay **18 proveedores** disponibles, en la nube y locales:

- **Nube**: Google (Gemini), Anthropic (Claude), OpenAI (GPT), Groq, DeepSeek, Mistral, Moonshot (Kimi), xAI (Grok), OpenRouter, Together AI, Perplexity, Fireworks, Cerebras.
- **Locales**: Ollama, LM Studio, Jan, llama.cpp, vLLM.

También eliges el **Tipo de Interacción**: `Híbrido (Chat + Voz)`, `Solo Chat (Silencioso)` o `Solo Voz`.

**2. Ajustes de Voz (TTS).** Selecciona una **voz del sistema** o escribe la ruta de una **voz personalizada/clonada** (un `.wav` de 5–15 s, procesado por un backend como XTTS o Coqui). *Nota:* la pestaña **AIRI** del panel de IA ofrece además un motor de voz alternativo: **Navegador (Web Speech API)** o **ElevenLabs TTS (Premium)** (requiere tu *API Key* y, opcionalmente, un *Voice ID*), un campo para definir su **personalidad/rol** y un botón **Probar** la voz.

**3. Aspecto del Asistente.** Formato visual: **Ventana Estándar en IDE** o **Holograma VTuber Flotante y Transparente** (ver la sección del avatar más abajo).

**4. Habilidades (Skills).** Actívalas o desactívalas con las casillas:

| Habilidad | Qué hace | Por defecto |
|---|---|---|
| **Visión en Tiempo Real** | Analiza capturas de pantalla a petición | Activada |
| **DJ Spotify** | Reproducir/pausar/siguiente/anterior | Activada |
| **⚠️ Control Total de Entorno** | Ejecutar comandos y **apagar el PC** | Desactivada |
| **Organizar Archivos** | Crear, mover y ordenar ficheros | Activada |
| **Memoria y Aprendizaje** | Recordar notas, aprender de errores, crear alarmas | Activada |
| **Acceso a Cámara Web** | Ver por la webcam cuando lo pidas | Desactivada |
| **Conexión Total con Nexus IDE** | Generar código y autoprogramarse habilidades | Activada |

> ⚠️ La habilidad *Control Total de Entorno* permite que la IA apague el equipo y lance comandos de terminal; actívala solo si confías en ella. Las funciones de visión, webcam y control de entorno hacen capturas y llamadas de bajo nivel: **ciertos anticheats (Vanguard, EAC, BattlEye) pueden marcarlas como sospechosas**; cierra Nexus antes de jugar títulos competitivos.

**5. Control Remoto (Telegram / Discord).** Marca *Activar Enlace Externo* y pega tu **Token de Telegram** y/o tu **Token de Discord (Bot)** (+ *Channel ID* opcional para avisos proactivos). Desde el chat directo del bot puedes usar `/help`, `/chat`, `/cmd`, `/approve`, `/deny` y `/status`.

Pulsa **Guardar Configuración** para aplicar todo (se propaga en caliente al resto de ventanas).

---

### 🎭 Compañero avatar flotante

AIRI puede mostrarse como un avatar que **flota sobre todo el escritorio** y con el que interactúas sin tener el editor visible. Admite imágenes, GIF animados, modelos 3D/VTuber y un holograma por defecto.

#### Cómo usar

1. En **Configurar Asistente Personal → Aspecto**, elige **Holograma VTuber Flotante y Transparente** y **Guardar**: el avatar aparece flotando (o pulsa **Lanzar Widget de Escritorio** para abrirlo como un **proceso independiente y transparente**, sin el IDE).
2. **Muévelo por la pantalla**: arrástralo con el ratón. En imágenes y holograma arrastras el propio cuerpo; en modelos 3D usa el **tirador (barra superior)** que aparece al pasar el ratón.
3. **Manipula un modelo 3D**: arrastra sobre el cuerpo para **rotarlo** (horizontal = giro, vertical = inclinación) y usa la **rueda del ratón** para **acercar/alejar (zoom)**.
4. **Menú (clic derecho)** sobre el avatar: *💬 Hablar por Chat*, *🤖 Abrir Ventana*, *⚙️ Configurar*, *📌 Flotar en Windows* (sacarlo como widget de escritorio) y *❌ Cerrar Asistente*.
5. El avatar **respira o gira suavemente** y **se anima más rápido cuando AIRI habla**; su respuesta aparece en una burbuja sobre él.

El overlay es **click-through**: es totalmente transparente y deja pasar los clics al escritorio; solo la zona del avatar (o su burbuja, menú y campo de texto) captura el ratón, así que no estorba mientras trabajas.

#### Cómo configurar

En **Configurar Asistente Personal → Avatar / VTuber Personalizado**:

1. Escribe la ruta o pulsa **Examinar…** para elegir el archivo. Formatos admitidos:
   - **Imágenes**: PNG, JPG, **GIF animado**, WEBP, SVG, APNG, BMP, AVIF.
   - **Modelos 3D / VTuber**: **GLB, GLTF, VRM**, OBJ (y STL/babylon).
   - Déjalo **vacío** para usar el **holograma** por defecto (esfera con anillos).
2. Ajusta el **Tamaño flotante** con el deslizador (de `120` a `700 px`, por defecto `340 px`); aplica al widget de escritorio.
3. **Guardar**: el avatar se **refresca en caliente** en todas las ventanas, sin cerrarlo ni relanzarlo.

---

### 🛡️ Cardinal — Supervisor de código

Cardinal es un auditor de IA que **revisa tu código y corrige errores de forma autónoma**. Actúa en tres momentos: cuando **guardas** un archivo, cuando la **terminal lanza un error**, y cuando tú se lo pides.

#### Cómo usar

Cardinal trabaja **solo y en segundo plano** (viene activado por defecto). Su panel se titula **Cardinal Supervisor** y muestra un indicador de estado: **🟢 Activo**, **🟡 Analizando…** o **🔴 Reparando…**.

1. **Al guardar (`Ctrl+S`)**: si *Análisis al guardar* está activo, Cardinal audita el archivo en segundo plano; si *Auto-corrección al guardar* también lo está, **aplica todas las correcciones** él mismo, en silencio.
2. **Ante errores de terminal**: detecta automáticamente trazas de **Python, Node.js, C++ y GDScript**, resalta la línea culpable en el editor, diagnostica el fallo y **repara el archivo afectado**.
3. **Auditoría manual**: pulsa **🔍 Auditar Archivo Activo** para revisar el archivo abierto en ese momento.
4. **Sugerencias**: cada hallazgo aparece en *Sugerencias de Cardinal* con su gravedad; puedes **Aplicar** o **Descartar** cada una. El *Registro de Intervención (Errores)* deja constancia de cada acción.
5. **Verificación previa (pre-flight)**: cuando el Agente de IA propone código, Cardinal comprueba antes de aplicarlo que las funciones invocadas existan o estén declaradas, y le pide reescribirlo si detecta llamadas rotas.

#### Cómo configurar

En el panel **Cardinal Supervisor**:

| Opción | Función | Por defecto |
|---|---|---|
| **Análisis al guardar** | Auditar automáticamente cada archivo al guardarlo | Activado |
| **Auto-corrección al guardar** | Aplicar las correcciones sin preguntar | Activado |
| **Motor de IA Supervisor** | Modelo que hace la auditoría | Modelo de Chat Activo |

El **Motor de IA Supervisor** ofrece tres opciones: **Modelo de Chat Activo** (el que ya usas en el chat), **Google Gemini Pro** (`gemini-2.5-pro`) u **OpenAI GPT-4o** (`gpt-4o`).

> Si prefieres revisar los cambios tú mismo antes de que se apliquen, desactiva *Auto-corrección al guardar*: Cardinal seguirá listando sus sugerencias para que las apliques a mano con el botón **Aplicar**.

---

Notas de referencia (rutas absolutas): la lógica de AIRI y Cardinal está en `C:\Users\USER\Documents\xz\nexus-ide\app.js`; el avatar flotante (arrastre, rotación, zoom, click-through, `toggleAssistantVTuber`) en `C:\Users\USER\Documents\xz\nexus-ide\modules\companion.js`; los proveedores de IA en `C:\Users\USER\Documents\xz\nexus-ide\modules\ai-providers.js`; el bot de Discord en `C:\Users\USER\Documents\xz\nexus-ide\modules\discord-bot.js`; y la interfaz (pestaña **AIRI**, panel **Cardinal Supervisor**) en `C:\Users\USER\Documents\xz\nexus-ide\index.html`.

---

## 📱 Control remoto: bots de Telegram y Discord

Nexus IDE deja que controles a **AIRI** (tu asistente) desde el móvil o cualquier equipo, usando un **bot de Telegram** y/o un **bot de Discord**. Con ellos puedes chatear con la IA, ejecutar comandos en la terminal de tu PC y aprobar o denegar las solicitudes de permisos del IDE, todo a distancia.

Ambos bots comparten exactamente los mismos comandos. La gran diferencia práctica es cómo hablas con cada uno:

| | Telegram | Discord |
|---|---|---|
| Cómo le hablas | Chat directo con tu bot | **Mensaje directo (DM)** al bot |
| Filtro de seguridad | Solo procesa tu **Chat ID** autorizado | Ignora otros bots y a sí mismo |
| Notificaciones proactivas | Al chat autorizado | Requiere un **Channel ID** |
| Sondeo | Long-polling a `api.telegram.org` cada 5 s | WebSocket permanente (Discord Gateway) |

> 💡 El bot de Discord se controla por **mensaje directo (DM)**. El contenido de los DMs llega **sin** necesitar el intent privilegiado `MESSAGE_CONTENT`, así que el bot funciona nada más pegar el token, sin activar permisos especiales en el portal de Discord.

### Comandos disponibles (Telegram y Discord)

| Comando | Qué hace |
|---|---|
| `/help` (o `/start`) | Muestra la lista de comandos. |
| `/status` | Estado del IDE y el PC: plataforma, *uptime*, memoria y nivel de seguridad actual. |
| `/chat <mensaje>` | Habla con la IA y recibe su respuesta. También puedes escribir el mensaje **sin** `/chat`: cualquier texto suelto se trata como chat. |
| `/cmd <comando>` | Ejecuta un comando en la terminal de tu PC (sujeto al nivel de seguridad, ver abajo). Ej.: `/cmd dir`. |
| `/approve` | Autoriza la solicitud de permisos que esté activa en el IDE en ese momento. |
| `/deny` | Deniega la solicitud de permisos activa. |

La salida de `/cmd` se recorta (unos 3000 caracteres en Telegram / 1500 en Discord) y los comandos tienen un límite de 30 segundos de ejecución.

### Niveles de seguridad para `/cmd`

La ejecución remota de comandos está protegida por tres niveles. En **Telegram** los eliges tú directamente en un desplegable; en **Discord** (y cuando enlazas desde los Ajustes del Asistente) el nivel se deriva del interruptor **⚠️ Control Total de Entorno**:

| Nivel | Comportamiento de `/cmd` | Cómo se activa |
|---|---|---|
| 🔒 **Restringido** | Bloqueado. Solo se permite chatear con la IA. | Telegram: opción del desplegable · Discord: con "Control Total de Entorno" **desactivado**. |
| ⚠️ **Con confirmación** | Antes de ejecutar, aparece un **modal de permisos en el IDE**. Debes aprobarlo ahí (o con `/approve`). | Telegram: opción del desplegable · Discord: con "Control Total de Entorno" **activado**. |
| ⚡ **Acceso total** | Ejecuta el comando **directamente**, sin preguntar. | Solo Telegram, desde el desplegable. |

> ⚠️ El **Acceso total** deja que cualquier mensaje `/cmd` corra al instante en tu PC. Úsalo únicamente si confías plenamente en tu configuración.

---

## 🔵 Telegram: puesta en marcha

### Cómo crear el bot y obtener el token

1. En Telegram, abre un chat con **@BotFather**.
2. Envía `/newbot` y sigue las instrucciones (nombre y usuario del bot).
3. BotFather te dará un **token** con el formato `123456789:ABCdefGhIJKlmNoPQRsT...`. Guárdalo.
4. Averigua **tu Chat ID** (por ejemplo, escribiendo a **@userinfobot**). Es un número como `987654321`.

### Cómo configurar en Nexus

1. Abre la **Configuración** de Nexus IDE y ve a la pestaña **📱 Control Remoto**.
2. Marca **Habilitar Bot de Telegram (Control Remoto)**.
3. Pega el **Token del Bot de Telegram**.
4. Escribe tu **Chat ID de Telegram Autorizado**. Por seguridad, **solo se procesan los mensajes de ese ID**; los de cualquier otro usuario se descartan.
5. Elige el **Nivel de Seguridad del Terminal** (Restringido / Con confirmación / Acceso total).
6. Pulsa **Guardar y Reiniciar Bot**.

El bot arranca de inmediato y vuelve a arrancar solo cada vez que abres Nexus (mientras siga habilitado). Para comprobarlo, escríbele `/help` desde tu chat de Telegram.

---

## 🟣 Discord: puesta en marcha

### Cómo crear el bot y obtener el token

1. Entra en el **Discord Developer Portal** (`discord.com/developers/applications`) y pulsa **New Application**.
2. Ve a la sección **Bot** y crea el bot; copia su **token** con **Reset Token / Copy**.
3. **No** necesitas activar el intent privilegiado *Message Content*: el control por DM funciona sin él.
4. Para poder enviarle mensajes directos, comparte un servidor con el bot: en **OAuth2 → URL Generator** marca el scope `bot`, genera el enlace e invítalo a un servidor (idealmente uno privado solo tuyo).
5. (Opcional, solo para avisos proactivos) Obtén el **Channel ID**: activa el *Modo Desarrollador* en Discord (Ajustes → Avanzado), haz clic derecho sobre el canal y elige **Copiar ID**.

### Cómo configurar en Nexus

1. Abre los **Ajustes del Asistente Personal** (icono 🤖 del asistente).
2. En la sección **🌐 Configuración de Control Remoto**, marca **Activar Enlace Externo (Telegram / Discord)**.
3. Pega el **Token de Discord (Bot)**.
4. (Opcional) Rellena el **Channel ID de Discord**. Solo hace falta para que AIRI te envíe **avisos proactivos**; para darle órdenes por DM **no** es necesario.
5. El nivel de seguridad de `/cmd` en Discord depende del interruptor **⚠️ Control Total de Entorno** de esa misma ventana: desactivado = 🔒 *Restringido*; activado = ⚠️ *Con confirmación*.
6. Pulsa **Guardar Configuración**. El bot de Discord se conecta al instante (y también al iniciar Nexus, si el enlace externo sigue activo).
7. Para usarlo, **envíale un mensaje directo** a tu bot con `/help`.

> 🔒 A diferencia de Telegram, el bot de Discord no filtra por un ID de usuario concreto: procesa los DM de cualquier persona (no-bot) que pueda escribirle. Mantén el bot en un servidor privado y no compartas su token ni su invitación.

---

Notas sobre las rutas de código verificadas (para el editor de la guía, no para publicar): comandos de Telegram en `C:/Users/USER/Documents/xz/nexus-ide/main.js` (`processTelegramUpdate`, líneas ~580-745) y de Discord en `C:/Users/USER/Documents/xz/nexus-ide/modules/discord-bot.js` (`processCommand`, líneas ~93-157). La UI de la pestaña "Control Remoto" de Telegram está en `app.js` (~4241-4301) y la sección de Control Remoto de los Ajustes del Asistente en `app.js` (~9752-9877).

---

## 🎬 Generación multimedia, 3D y conexiones remotas

Nexus IDE integra generación de imagen y vídeo con IA, motores de videojuegos reales, conversión de imágenes a modelos 3D y herramientas de infraestructura (SSH/SFTP y Docker) sin salir del editor. Todas estas funciones dependen de programas externos que debes tener instalados en tu equipo (o en tu servidor); el IDE actúa como puente y panel de control.

### 🖼️ Generación de imagen y vídeo con ComfyUI

Nexus se conecta a un servidor **ComfyUI local** para crear imágenes y vídeos. Por defecto espera el servidor en `http://127.0.0.1:8188`.

**Requisitos**
- Tener **ComfyUI** o **Comfy Desktop** instalado y en ejecución.
- Para vídeo, descargar previamente los modelos desde el gestor integrado.

#### Cómo usar (generar desde el chat, en segundo plano)

Puedes pedir imágenes o vídeos escribiendo directamente en el chat con lenguaje natural. El IDE detecta la intención y lanza la generación en una burbuja con barra de progreso, sin bloquear la conversación.

1. Escribe una orden reconocida, por ejemplo:
   - Imagen: `dibuja un gato astronauta`, `genera una imagen de una ciudad futurista`, `crea un dibujo de...`.
   - Vídeo: `genera un video de olas rompiendo en la playa`, `crea un video de...`.
2. La burbuja muestra el estado (`Verificando servidor de ComfyUI...`, `En cola de ComfyUI...`, porcentaje).
3. Para vídeo, el IDE primero comprueba que el modelo esté descargado; si falta, verás `❌ Descarga los modelos de video primero en el Gestor`.
4. El resultado se incrusta al terminar. Si el servidor no responde en 5 minutos, la generación se aborta con un aviso de tiempo agotado.

> El icono de barra lateral **Generador de Video (ComfyUI)** abre el panel dedicado con más control (modelo, resolución, fotogramas, etc.).

#### Panel Generador de Video AI

Pestañas: **Generar** y **Modelos**.

| Parámetro | Valor por defecto |
|---|---|
| Resolución | `768x512` |
| Fotogramas | `41` |
| Pasos (steps) | `20` |
| CFG | `3.0` |

Modelos de vídeo disponibles: `ltx-video`, `ltx-video-heavy`, `hunyuan-video`, `hunyuan-video-heavy`, `svd-img2vid` y `svd-img2vid-heavy`. Los modelos `svd-img2vid*` parten de una **imagen semilla** (se sube al servidor antes de generar). Los vídeos se guardan como `comfy_video_<marca de tiempo>.mp4`.

#### Gestor / descargador de modelos

1. En el panel, abre la pestaña **Modelos**: cada modelo muestra `🟢 Instalado` o un botón `⬇️ Descargar`.
2. Pulsa **Descargar**; el registro muestra el progreso en vivo.
3. Casilla **Mirror**: activa la descarga desde `hf-mirror.com` (útil si Hugging Face va lento); desactivada usa Hugging Face directamente.

#### Cómo configurar ComfyUI

1. En el panel, indica la **URL del servidor** (por defecto `http://127.0.0.1:8188`) y la **ruta local** de instalación de ComfyUI. Se guardan en `nexus_comfy_url` y `nexus_comfy_path`.
2. Si dejas la ruta vacía, el IDE intenta autodetectar la instalación estándar en `%LOCALAPPDATA%\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI`.
3. Botón de estado: comprueba la conexión (`/system_stats`) y muestra `Conectado` o `Desconectado`.
4. Si está desconectado, el botón **Iniciar Comfy Desktop** arranca la app (busca `Comfy Desktop.exe` en `%LOCALAPPDATA%\Programs\Comfy Desktop`) y reintenta conectar automáticamente.

### 🎮 Motores 3D (Godot, Unreal, Blender y visor BabylonJS)

El panel **Motores de Videojuegos (Godot, Unity, Unreal)** de la barra lateral centraliza estas herramientas.

#### Cómo acceder

- Cambia a la perspectiva **Game** (botones de perspectiva Code / Game / AI en la parte superior): revela y abre el panel de motores.

#### Puente a Godot / Unreal / Unity (por IPC)

Los motores se lanzan desde el **proceso principal de Electron** mediante IPC (`run-godot`, `run-unreal`, `run-unity`, `run-blender`). Esto es necesario en Windows para que las ventanas gráficas del motor no queden ocultas ni se cuelguen por las restricciones de seguridad de Chromium.

1. Configura las rutas de los ejecutables en el panel (**Ruta Godot**, **Ruta Unreal Engine**); se autodetectan si es posible y se guardan en `nexus_godot_path`, `nexus_unreal_path`, `nexus_unity_path`.
2. Pulsa **🎮 Iniciar Godot Editor** o **🔥 Iniciar Unreal Editor**.
3. Para Godot, si el proyecto no existe, el IDE genera automáticamente un `project.godot` y una escena `main.tscn` con el nodo puente `GeometryBridge3D` (GDExtension). El puente Blender↔Godot vive en la carpeta `blender_godot_bridge/` y su estado se monitoriza en tiempo real (`🤖 Godot Engine`, `🔥 Unreal Engine 5`).
4. Botones de IA: **💡 Crear script GDScript (Godot)** y **💡 Crear C++ Class / Blueprint (Unreal)** generan código para el motor con ayuda del asistente.

#### Conversor Imagen a 3D (Blender)

Convierte una o varias imágenes en un modelo 3D usando Blender en segundo plano.

**Requisito:** Blender instalado (ruta en `nexus_blender_path`).

1. En **Conversor Imagen a 3D (Blender)**, pulsa 📂 para seleccionar imágenes.
2. Ajusta la escala de altura y pulsa **🔮 Convertir a Modelo 3D**.
3. El IDE ejecuta Blender en modo consola con el script `image_to_3d.py` y genera `generated_model.glb` en la carpeta del proyecto.
4. Al terminar se abre la vista previa; también puedes usar **👁️ Ver Vista Previa 3D**.

#### Visor 3D interactivo (BabylonJS)

Abre la ventana **Motor 3D Real (BabylonJS)** para inspeccionar y montar escenas 3D dentro del propio IDE.

- Carga modelos `.glb`, `.gltf`, `.obj`, `.stl` y `.babylon`.
- Cámara orbital: **rota** y **haz zoom** con el ratón.
- Crea primitivas (cubo, esfera, cilindro, toroide, plano) y aplica materiales.
- Ejecuta scripts JavaScript personalizados con acceso a `mesh`, `scene` y `BABYLON`, además de plantillas (física, animación, etc.).
- Usa BabylonJS local (`node_modules`) y, si falla, recurre al CDN.

### 🌐 Conexiones Remotas VPS (SSH / SFTP)

Icono de barra lateral **Conexiones Remotas VPS (SSH/SFTP)** (recién revelado). Permite conectarte a un servidor por SSH, explorar y editar sus archivos por SFTP y abrir una terminal remota. Internamente usa la librería `ssh2` (`Client`).

**Requisitos:** un servidor accesible por SSH y sus credenciales (contraseña o clave privada).

#### Cómo usar

1. Rellena el formulario: **Nombre**, **Dirección IP / Host**, **Puerto** (por defecto `22`) y **Usuario SSH**.
2. Elige el **método de autenticación**:
   - **Contraseña**, o
   - **Llave privada** (`.pem` / `.key` / `id_rsa`) mediante el selector 📂.
3. Pulsa **💾 Guardar** para almacenar la conexión (se guardan en `nexus_vps_servers`) o **🔌 Conectar**. El indicador cambia a `Conectado` y se inicializa la sesión SFTP.
4. Define el **Directorio Remoto de Trabajo** (por defecto `/root`) y pulsa **Establecer**.
5. Explorador de archivos: cambia el explorador al **modo VPS** para navegar el servidor. Al abrir un archivo remoto lo edita en local; al guardar con `Ctrl + S` se sube automáticamente por SFTP.
6. **🖥️ Abrir Terminal SSH**: abre un shell remoto (`xterm-color`) dentro de la terminal integrada del IDE.

El panel **Consola de Conexión** muestra el registro de la sesión (autenticación, SFTP, errores).

### 🐳 Gestor de Docker

Abre el gestor con `Ctrl+Alt+D` (o desde la paleta de comandos → **Gestor Docker**). Administra el demonio, imágenes y contenedores usando la CLI de Docker.

**Requisito:** Docker instalado y con el demonio en ejecución (`docker info`). Si está inactivo, verás `Daemon inactivo o no instalado` y las acciones quedan deshabilitadas.

#### Cómo usar

| Acción | Qué hace |
|---|---|
| **Build Image** | `docker build -t <nombre>:latest .` sobre la carpeta del proyecto actual |
| **Compose Up** | `docker-compose up -d` (crea y levanta los contenedores del proyecto) |
| **Compose Down** | `docker-compose down` (detiene y elimina los servicios) |
| **Start / Stop / Restart** | Controla cada contenedor individualmente |
| **Logs** | Muestra los registros del contenedor |
| **🗑️ (imágenes)** | Elimina una imagen local |

1. **Contenedores:** la lista se llena con `docker ps -a` (nombre, imagen, estado). Cada tarjeta ofrece **Start**, **Stop**, **Restart** y **Logs**.
2. **Crear/levantar contenedores:** si el proyecto incluye un `docker-compose.yml` (se detecta con `✓ Compose detectado`), usa **Compose Up** para crearlos y arrancarlos; también puedes construir una imagen con **Build Image** desde el `Dockerfile` del proyecto.
3. **Imágenes:** la lista se obtiene con `docker images`; puedes borrarlas desde ahí.
4. **Logs / Salida Docker:** consola en vivo con la salida de cada comando; el botón **Limpiar** la vacía.
5. Botón **↻** para refrescar el estado del demonio, contenedores e imágenes.

---

Archivos de referencia (rutas absolutas): lógica del renderer en `C:/Users/USER/Documents/xz/nexus-ide/app.js`, procesos nativos e IPC en `C:/Users/USER/Documents/xz/nexus-ide/main.js`, interfaz/paneles en `C:/Users/USER/Documents/xz/nexus-ide/index.html`, puente 3D en `C:/Users/USER/Documents/xz/nexus-ide/blender_godot_bridge/` y el conversor en `C:/Users/USER/Documents/xz/nexus-ide/image_to_3d.py`.

---

## 🧩 Plugins, personalización y sistema

Nexus IDE es ampliable y totalmente personalizable: puedes instalar utilidades desde una galería incluida o desde cualquier repositorio Git, cambiar el aspecto de la interfaz (temas, fondos animados, colores y logo), vigilar tu hardware en tiempo real y usar el IDE en cinco idiomas. Todo se guarda de forma local en tu equipo.

### 🔌 Galería de Plugins / Marketplace (`Ctrl+Alt+M`)

La galería es el centro de plugins. Ábrela de dos formas:

- Atajo de teclado `Ctrl+Alt+M`.
- Menú **Plugins → Galería de Plugins / Marketplace**.

Desde el mismo menú, **Plugins → Plugins Instalados** abre la lista de lo que tienes activo, con un botón **Ejecutar** para cada plugin.

#### Cómo usar

1. Pulsa `Ctrl+Alt+M` para abrir la galería.
2. Usa el buscador (**Buscar plugin...**) para filtrar por nombre o descripción.
3. En la tarjeta del plugin que quieras, pulsa **Instalar Plugin**. El botón cambia a **✓ Activo (Desinstalar)** y se crea una carpeta del plugin (`plugin.json` + `README.md`) dentro de `plugins/` en tu espacio de trabajo, visible en el Explorador.
4. Para ejecutarlo, abre **Plugins → Plugins Instalados** y pulsa **Ejecutar**, o simplemente vuelve a lanzarlo (muchos plugins están siempre disponibles aunque no aparezcan como "instalados").
5. Para quitarlo, pulsa **✓ Activo (Desinstalar)** en su tarjeta.

> Nota: los plugins base y las utilidades (Git Graph, Database Client, Excalidraw, Visual Blueprints, Asistente Personal, Color Studio, Encoder/Decoder, Hash & UUID, Timestamp Converter y Diff Checker) se pueden ejecutar en cualquier momento. En cambio, **RegEx Sandbox**, **Spotify Controller** y **JSON Formatter** deben instalarse antes de poder ejecutarlos.

#### Instalar desde un repositorio Git externo

En la parte superior de la galería, sección **📥 Instalar desde Repositorio Git Externo**:

1. Pega la URL del repositorio (por ejemplo `https://github.com/usuario/nexus-plugin.git`).
2. Pulsa **Clonar e Instalar**. Nexus ejecuta `git clone` y descarga el plugin dentro de `plugins/<nombre-del-repo>` en tu espacio de trabajo.
3. Si el repositorio no trae un `plugin.json`, se genera uno automáticamente con metadatos básicos. Necesitas tener **Git instalado** para que la clonación funcione.

#### Biblioteca de plugins incluida

| Plugin | Qué hace | Cómo abrirlo |
|--------|----------|--------------|
| 📊 **Visual Git Graph** | Muestra el árbol de ramas y commits del repositorio (`git log --graph`), con hashes y ramas coloreados. Botón **Actualizar** para refrescar. | Siempre disponible |
| 🗄️ **Database Client (SQLite)** | Cliente SQL con interfaz visual. Soporta **SQLite** (archivo local) y conexiones remotas **SQL Server/Azure SQL, MySQL, PostgreSQL**. Escribe la consulta y pulsa **Ejecutar SQL**. | Siempre disponible |
| 🤖 **Asistente Personal** | Copiloto de IA (AIRI) con voz, visión y comandos rápidos. Botones **Ejecutar** y **Configurar** en la lista de instalados. | Siempre disponible |
| 🎨 **Excalidraw Sketchpad** | Pizarra para dibujar diagramas de arquitectura y bocetos dentro del IDE. | Siempre disponible |
| 🔍 **RegEx Sandbox & Tester** | Prueba y depura expresiones regulares en tiempo real con resaltado de coincidencias. | Instalar primero |
| 🎵 **Spotify Controller** | Controla la reproducción de música desde la barra inferior. | Instalar primero |
| 📦 **JSON Formatter & Parser** | Formatea, valida y minifica JSON con detección de errores. | Instalar primero |
| ⚡ **Visual Blueprints** | Programación visual por nodos (inicio, condicionales, bucles, variables, archivos, APIs) que compila a código JavaScript. | Siempre disponible |
| 🎨 **Color Studio** | Selector de color con conversión instantánea entre **HEX / RGB / HSL**, vista previa y copiado al portapapeles. | Siempre disponible |
| 🔐 **Encoder / Decoder** | Codifica/decodifica **Base64** y **URL**, y decodifica **tokens JWT** mostrando cabecera y payload. | Siempre disponible |
| #️⃣ **Hash & UUID Generator** | Genera hashes **MD5, SHA-1 y SHA-256** de cualquier texto y crea **UUID v4**. | Siempre disponible |
| 🕐 **Timestamp Converter** | Convierte marcas Unix (segundos o milisegundos) a fecha **Local / UTC / ISO** y viceversa. Muestra el epoch actual en vivo. | Siempre disponible |
| 🔀 **Diff Checker** | Compara dos textos línea a línea y resalta añadidos, eliminados e iguales, con estadísticas. | Siempre disponible |

**Uso rápido de las utilidades nuevas:**

- **Color Studio**: elige un color con el selector; los campos HEX/RGB/HSL se rellenan solos y cada uno tiene su botón **Copiar**.
- **Encoder/Decoder**: escribe el texto en **Entrada**, pulsa el botón de la operación (Base64 ▶/◀, URL ▶/◀ o **Decodificar JWT**) y copia el **Resultado**.
- **Hash & UUID**: escribe el texto y los tres hashes se calculan en tiempo real; pulsa **🆔 Generar UUID v4** para un identificador único.
- **Timestamp Converter**: pega un timestamp y pulsa **Convertir** (detecta automáticamente si son segundos o milisegundos), o elige una fecha para obtener el epoch.
- **Diff Checker**: pega el texto **A** y el **B** y pulsa **Comparar**.

### ✨ Personalización de la interfaz

Toda la personalización vive en la ventana de **Ajustes**. Ábrela con el menú **Ver → Ajustes** (`Alt+Espacio`) o el botón de configuración. En la barra lateral izquierda de esa ventana verás las pestañas: 🤖 APIs, 📝 Editor, 🐚 Terminal, 🎨 Temas, 🌍 Idioma, 📱 Control Remoto y ✨ Personalización.

#### Temas (pestaña 🎨 Temas)

1. Abre **Ajustes → 🎨 Temas**.
2. Elige un tema del desplegable; la vista previa se aplica al instante:
   - **Nexus Classic Dark (Purple)** — tema por defecto.
   - **Dracula Theme**
   - **One Dark Atom**
   - **Catppuccin Mocha**
   - **Nord Theme**
3. Pulsa **Guardar** para conservarlo.

#### Personalización avanzada (pestaña ✨ Personalización)

Esta pestaña permite rediseñar la app por completo. Los cambios se previsualizan en vivo; al final pulsa **Guardar Personalización**, o **Restablecer Todo** para volver a los valores por defecto.

**1. Logotipo** — Elige entre:
- **Predeterminado (SVG)** con selector de color.
- **Texto Personalizado** (escribe el nombre que quieras mostrar).
- **Imagen** (ruta local, URL o botón **Examinar** para elegir un archivo).

**2. Fondo de la aplicación** — En **Tipo de Fondo** puedes elegir:

| Opción | Efecto |
|--------|--------|
| Ninguno | Fondo por defecto del tema |
| Imagen de Fondo | Una imagen tuya (ruta/URL o **Examinar**) |
| Video Personalizado | Un vídeo **MP4 / WebM** de fondo |
| Gradiente Animado | Auroras en movimiento |
| Lluvia de Estrellas | Campo de estrellas (canvas) |
| Lluvia Digital | Efecto tipo Matrix |
| Ondas de Partículas | Constelación de partículas conectadas |

Cuando hay un fondo activo se habilitan dos deslizadores: **Opacidad de Paneles (Velo)** y **Difuminado (Blur)**, para que el contenido siga siendo legible.

**3. Colores de la aplicación** — En **Modo de Color** elige **Predefinido** (usa el tema) o **Color Personalizado**, que despliega una paleta editable: color acento, acento al pasar el ratón, fondo principal, barra lateral, paneles, pestañas, texto y bordes. También puedes fijar una **fuente** propia para toda la app.

### 📊 Telemetría de hardware

En la esquina inferior derecha, la barra de estado muestra la telemetría de tu equipo, que se actualiza **cada 2 segundos**:

```
📊 CPU: 12% | RAM: 45% | GPU: 8% | VRAM: 2.3GB
```

- **CPU** y **RAM** se miden con datos reales del sistema.
- **GPU** y **VRAM** se leen de tarjetas **NVIDIA** mediante `nvidia-smi` si está disponible; si no, Nexus muestra una estimación aproximada.

No requiere configuración: funciona automáticamente al iniciar la app.

### 🌍 Idiomas / Localización

Nexus IDE está traducido a **cinco idiomas** mediante el sistema interno `NexusLocalization`.

#### Cómo configurar

1. Abre **Ajustes → 🌍 Idioma**.
2. Elige el idioma: **Español**, **English**, **Português**, **Français** o **Deutsch**.
3. Pulsa **Guardar**. La interfaz se recarga y aplica el nuevo idioma de inmediato.

El idioma por defecto es **Español**. Si a algún texto le falta traducción en el idioma elegido, se muestra en inglés y, en último caso, en español.

### 🔒 Dónde se guardan tus datos (privacidad)

Nexus IDE **guarda toda tu configuración de forma local**, en el almacenamiento del propio equipo (`localStorage` del renderer). No se envía a ningún servidor. Claves de almacenamiento principales:

| Clave | Contenido |
|-------|-----------|
| `nexus_settings` | Tema, idioma y ajustes de editor y terminal |
| `nexus_installed_plugins` | Lista de plugins instalados |
| `nexus_custom_logo_*` | Logo personalizado (tipo, color, texto, imagen) |
| `nexus_custom_bg_*` | Fondo (tipo, imagen/vídeo, opacidad, blur) |
| `nexus_custom_accent`, `nexus_custom_bg_main`, `nexus_custom_text`, `nexus_custom_font_family`… | Colores y fuente personalizados |
| `nexus_remote_*` | Ajustes del bot de Telegram (control remoto) |

Además, cada plugin instalado crea una carpeta en `plugins/<id>/` dentro de tu espacio de trabajo. La telemetría de hardware se calcula y se muestra localmente; **no se transmite** a ningún sitio. Las claves de API de los proveedores de IA también se almacenan solo en tu equipo.

> Consejo de privacidad: como los datos viven en `localStorage`, si limpias los datos de la aplicación perderás temas, personalización, plugins e idioma configurados. Para reiniciar solo el aspecto visual, usa **Restablecer Todo** en la pestaña ✨ Personalización.

---

Archivos fuente de referencia (rutas absolutas):
- `C:/Users/USER/Documents/xz/nexus-ide/app.js` — `MARKETPLACE_PLUGINS` (línea ~7134), galería/instalador, `runPlugin`, temas (`applyThemeCSS` ~2514), pestaña de personalización (~3821), idioma/`NexusLocalization` (~11027), receptor de telemetría (~42).
- `C:/Users/USER/Documents/xz/nexus-ide/modules/plugins-utils.js` — Color Studio, Encoder/Decoder, Hash & UUID, Timestamp Converter y Diff Checker.
- `C:/Users/USER/Documents/xz/nexus-ide/main.js` — `startHardwareTelemetry` (~1207, intervalo de 2 s, `nvidia-smi` con fallback).
- `C:/Users/USER/Documents/xz/nexus-ide/index.html` — elemento de la barra de estado `#status-rams-telemetry`.
