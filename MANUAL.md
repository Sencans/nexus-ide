# 📖 Manual de Usuario — Nexus IDE

> **Nexus IDE** es un entorno de desarrollo integrado de escritorio construido con Electron, diseñado para desarrolladores que quieren potencia local, IA integrada, colaboración multi-agente y herramientas premium todo en un solo lugar.

---

## Tabla de Contenidos

1. [Inicio Rápido](#1-inicio-rápido)
2. [Interfaz Principal](#2-interfaz-principal)
3. [Editor de Código (Monaco)](#3-editor-de-código-monaco)
4. [Explorador de Archivos](#4-explorador-de-archivos)
5. [Terminal Integrada](#5-terminal-integrada)
6. [Chat con IA — Modo Chat](#6-chat-con-ia--modo-chat)
7. [Modo Agente Autónomo](#7-modo-agente-autónomo)
8. [Colaboración Multi-Agente](#8-colaboración-multi-agente)
9. [Selector de Modelos de IA](#9-selector-de-modelos-de-ia)
10. [Proveedores de IA Compatibles](#10-proveedores-de-ia-compatibles)
11. [Configuración de API Keys](#11-configuración-de-api-keys)
12. [Acompañante Virtual AIRI (Avatar 3D)](#12-acompañante-virtual-airi-avatar-3d)
13. [Base de Conocimiento RAG (Odysseus)](#13-base-de-conocimiento-rag-odysseus)
14. [RAG Local In-Memory (Indexación del Workspace)](#14-rag-local-in-memory-indexación-del-workspace)
15. [Motor 3D (BabylonJS)](#15-motor-3d-babylonjs)
16. [Integración con Godot Engine](#16-integración-con-godot-engine)
17. [Gestor Docker](#17-gestor-docker)
18. [OpenClaw — Gateway de Agentes Remotos](#18-openclaw--gateway-de-agentes-remotos)
19. [RAMS — Telemetría del Sistema](#19-rams--telemetría-del-sistema)
20. [Plantillas de Proyectos](#20-plantillas-de-proyectos)
21. [Gestor de Proyectos / Dashboard](#21-gestor-de-proyectos--dashboard)
22. [Marketplace de Plugins](#22-marketplace-de-plugins)
23. [Ajustes y Configuración](#23-ajustes-y-configuración)
24. [Atajos de Teclado](#24-atajos-de-teclado)
25. [Command Palette](#25-command-palette)
26. [Barra de Estado](#26-barra-de-estado)
27. [Conexiones VPS Remotas (SSH/SFTP)](#27-conexiones-vps-remotas-ssh-sftp)
28. [Generador de Video AI (ComfyUI)](#28-generador-de-video-ai-comfyui)
29. [Función de Voz a Texto Rápida](#29-función-de-voz-a-texto-rápida)

---

## 1. Inicio Rápido

### Requisitos del Sistema
Al iniciar el IDE por primera vez, se muestra una pantalla de verificación que comprueba si tienes instalados:
- **Git SCM** — control de versiones y descarga de plugins
- **Node.js & NPM** — runtime JavaScript local
- **Python 3** — scripts de base de datos SQLite
- **Docker Desktop** — gestión de contenedores
- **Godot Engine** — editor de juegos 3D

Si falta alguno, puedes hacer clic en **"Instalar Faltantes"** y el IDE los instalará usando `winget` de Windows automáticamente.

### Primera Ejecución
1. Abre **Nexus IDE** desde el ejecutable.
2. El **Centro de Inicio** se mostrará automáticamente.
3. Abre una carpeta de proyecto con **Archivo → Abrir Carpeta** o `Ctrl+O`.
4. Configura tu primera API Key en **⚙ Configuración → 🤖 APIs**.

---

## 2. Interfaz Principal

La interfaz de Nexus IDE está dividida en las siguientes zonas:

```
┌────────────────────────────────────────────────────────────┐
│  🔝 Barra de Menú (Archivo | Ver | Ejecutar | Ventana)     │
├────┬───────────────────────────────────────┬───────────────┤
│ 🔲 │      Editor Monaco (zona central)     │ 💬 Chat / IA  │
│    │                                       │               │
│ Si │      Pestañas de archivos abiertos    │ Agente ←      │
│ de │                                       │               │
│ ba │    📝 Área de edición de código       │  Mensajes     │
│ r  │                                       │  Chat         │
│    ├───────────────────────────────────────┤               │
│    │  🖥 Terminal Integrada (panel bajo)   │               │
├────┴───────────────────────────────────────┴───────────────┤
│  📊 Barra de Estado inferior                               │
└────────────────────────────────────────────────────────────┘
```

### Paneles de la Barra Lateral (Sidebar)
Haz clic en los iconos de la barra lateral izquierda para abrir/cerrar cada panel:

| Icono | Panel | Descripción |
|-------|-------|-------------|
| 📁 | Explorador | Árbol de archivos del proyecto |
| 🔍 | Búsqueda | Búsqueda global en el proyecto |
| 🐙 | Git | Estado y control de versiones |
| 🔌 | Plugins | Marketplace de extensiones |
| 🐳 | Docker | Gestor de contenedores |
| 📚 | RAG | Base de conocimiento Odysseus |
| 📡 | Telemetría | Panel RAMS (oculto por defecto) |

---

## 3. Editor de Código (Monaco)

El editor central utiliza **Monaco Editor** (el mismo motor de VS Code).

### Características
- **Sintaxis resaltada** para más de 40 lenguajes de programación.
- **IntelliSense y Autocompletado** inteligente por lenguaje.
- **Snippets Rápidos** integrados (ver tabla abajo).
- **Minimapa** lateral para navegación rápida (activable en config).
- **Word Wrap** — ajuste de línea configurable.
- **Formato al Guardar** — formatea automáticamente el código al usar `Ctrl+S`.
- **Múltiples Pestañas** — abre varios archivos simultáneamente.
- **División de Paneles** — divide el editor en dos zonas de edición.

### Snippets Disponibles por Lenguaje

#### JavaScript / TypeScript
| Snippet | Descripción |
|---------|-------------|
| `rafce` | React Arrow Function Component con export |
| `useState` | Hook de React `useState` |
| `useEffect` | Hook de React `useEffect` |
| `fetchapi` | Llamada `fetch` con async/await |
| `cl` | `console.log()` |
| `afn` | Función async con try/catch |

#### Python
| Snippet | Descripción |
|---------|-------------|
| `main` | Bloque `if __name__ == '__main__'` |
| `class` | Clase con `__init__` y `__str__` |
| `fastapi` | Endpoint básico de FastAPI |
| `flask` | App básica de Flask |
| `dataclass` | Clase con el decorator `@dataclass` |

#### HTML
| Snippet | Descripción |
|---------|-------------|
| `html5` | Estructura HTML5 completa |
| `nav` | Barra de navegación con `<ul>` |
| `form` | Formulario básico con input y botón |

#### SQL
| Snippet | Descripción |
|---------|-------------|
| `select` | `SELECT ... FROM ... WHERE` |
| `create` | `CREATE TABLE` con ID y timestamp |
| `join` | `INNER JOIN` entre dos tablas |

#### GDScript (Godot)
| Snippet | Descripción |
|---------|-------------|
| `ready` | Función `_ready()` |
| `process` | Función `_process(delta)` |
| `signal` | Declaración de señal |
| `export` | Variable exportada `@export` |

### Lenguajes Soportados (40+)
JavaScript, TypeScript, Python, Rust, Go, C, C++, C#, Java, Kotlin, Swift, PHP, Ruby, Perl, R, Dart, Lua, Shell/Bash, PowerShell, GDScript, GLSL/HLSL (Shaders), SQL, HTML, CSS, SCSS/SASS, JSON, YAML, TOML, XML, Markdown, Dockerfile, Docker Compose, Makefile, Assembly (ASM), Zig, Nim, Elixir, y más.

---

## 4. Explorador de Archivos

### Funciones del Explorador
- **Árbol de carpetas** expandible con detección automática del proyecto abierto.
- **Clic derecho** sobre un archivo para: Renombrar, Eliminar, Copiar ruta.
- **Clic derecho** sobre una carpeta para: Crear archivo nuevo, Crear subcarpeta.
- **Doble clic** para abrir archivos en el editor.
- **Actualización automática** cuando se crean/eliminan archivos desde la terminal.

### Crear Archivos y Carpetas
- Menú contextual en la sidebar: clic derecho → `Nueva Carpeta` / `Nuevo Archivo`.
- Desde el menú **Archivo → Nuevo Archivo** (`Ctrl+N`).

---

## 5. Terminal Integrada

La terminal corre directamente dentro del IDE y conecta con el shell del sistema.

### Shells Disponibles
- **PowerShell** (Windows — por defecto)
- **Símbolo del Sistema (cmd.exe)**
- **Bash**

> Cambia el shell en **⚙ Configuración → 🐚 Terminal**.

### Funciones
- Ejecuta cualquier comando del sistema operativo.
- Muestra la salida de compiladores, servidores de desarrollo y scripts.
- La IA en modo Agente puede escribir y ejecutar comandos automáticamente en la terminal.
- Soporte de colores ANSI para output de herramientas como `git`, `npm`, `python`, etc.

---

## 6. Chat con IA — Modo Chat

El panel de chat en la parte derecha permite interactuar con cualquier modelo de IA configurado.

### Cómo Usar
1. Escribe tu pregunta o instrucción en el campo de texto.
2. Presiona **Enviar** o usa `Enter`.
3. La IA responderá en el panel de mensajes con formato Markdown renderizado.

### Características del Chat
- **Historial de conversación** — la IA recuerda los últimos mensajes de la sesión.
- **Adjuntos de Archivos** — adjunta archivos de código o imágenes haciendo clic en el botón de clip 📎.
  - Los archivos de texto se inyectan como contexto en el prompt.
  - Las imágenes se envían como datos multimodales en base64 (compatible con Gemini, GPT-4o, Claude).
- **Formato Markdown** — las respuestas con código se muestran con bloques resaltados.
- **Acciones Autónomas** — si la IA responde con bloques de acción, el IDE los ejecuta:
  - `[WRITE_FILE: ruta/archivo.ext]` — crea o modifica archivos automáticamente.
  - `[RUN_COMMAND]` — ejecuta comandos en la terminal integrada.
  - `[RUN_3D_SCRIPT]` — ejecuta scripts en el Motor 3D de BabylonJS.
- **Contexto del Lenguaje Activo** — el prompt del sistema se enriquece automáticamente con directrices específicas del lenguaje del archivo que tienes abierto en el editor.

### Adjuntar Archivos al Chat
1. Haz clic en el botón **📎** junto al campo de texto.
2. Selecciona uno o más archivos desde el explorador del sistema.
3. Los archivos aparecen como chips en el área de adjuntos.
4. Al enviar el mensaje, el contenido de los archivos se incluye en el contexto.

---

## 7. Modo Agente Autónomo

Activa el **Modo Agente** con el botón `Agente ←` en la parte superior del panel de chat.

### Diferencias con el Modo Chat
- La IA actúa proactivamente para resolver tareas completas.
- El IDE ejecuta automáticamente las acciones propuestas por la IA.
- Ideal para tareas como: "Crea una API REST en Python con FastAPI y las rutas CRUD para usuarios."

### Sistema de Permisos
El comportamiento de ejecución se controla en **⚙ Configuración → Editor → Permisos de Ejecución del Agente**:

| Modo | Comportamiento |
|------|----------------|
| ⚠️ Pedir confirmación | Muestra un modal antes de cada acción para aprobar o denegar |
| ⚡ Ejecutar directo | Ejecuta todas las acciones sin confirmación (modo experto) |

Cuando está en modo confirmación, un **Modal de Permisos** muestra cada acción propuesta (crear archivo, ejecutar comando, script 3D) con un visualizador de código en acordeón para revisar antes de aprobar.

---

## 8. Colaboración Multi-Agente

El sistema Multi-Agente permite que **tres roles de IA trabajen juntos** en pipeline para resolver tareas complejas.

### Los Tres Agentes
| Agente | Emoji | Función |
|--------|-------|---------|
| **Planificador** | 🧠 | Analiza la solicitud y diseña el plan de trabajo |
| **Desarrollador** | ✍️ | Escribe el código y crea los archivos |
| **Revisor** | 🔍 | Audita el código del Desarrollador, busca bugs |

### Cómo Activar
1. En el panel de chat, activa el checkbox **👥 Colaboración de Agentes**.
2. El badge cambiará a `ACTIVO`.
3. Escribe tu tarea y envía normalmente.

### Estrategias de Asignación de Modelos
Selecciona una estrategia en el dropdown **Estrategia**:

| Estrategia | Descripción |
|------------|-------------|
| 🪙 Economía de Tokens | Usa modelos rápidos y económicos (Gemini Flash) |
| ⚡ Alto Rendimiento | Usa modelos premium (Claude Sonnet, GPT-4o) |
| 🌐 Multiproveedor Óptimo | Asigna automáticamente el mejor modelo por rol |
| ⚙️ Personalizado | Tú eliges qué modelo usa cada agente |

### Panel de Progreso
Durante la ejecución, un panel visual muestra el progreso de cada agente:
- 🟡 **Amarillo** — Agente trabajando actualmente (con borde iluminado).
- 🟢 **Verde** — Agente completado con éxito.
- ⚪ **Gris** — Agente en espera.

---

## 9. Selector de Modelos de IA

El selector de modelos en la parte superior del panel de chat permite elegir qué modelo usar.

### Funciones del Selector
- **Búsqueda en tiempo real** — escribe el nombre del modelo para filtrarlo.
- **Agrupamiento por proveedor** — los modelos están organizados por Google, Anthropic, OpenAI, Groq, etc.
- **Indicadores de estado** (LED de color):
  - 🟢 **Verde** — API Key configurada y activa.
  - ⚪ **Gris** — Sin API Key configurada.
- **Metadatos de cada modelo** — ventana de contexto, velocidad y descripción.

---

## 10. Proveedores de IA Compatibles

| Proveedor | Modelos Destacados | Endpoint |
|-----------|-------------------|---------|
| **Google AI** | Gemini 2.5 Pro/Flash, Gemini 2.0 Flash | `generativelanguage.googleapis.com` |
| **Anthropic** | Claude 3.5 Sonnet/Haiku | `api.anthropic.com` |
| **OpenAI** | GPT-4o, o3-mini | `api.openai.com` |
| **Groq** | Llama 3.3, DeepSeek R1 | `api.groq.com` |
| **Mistral** | Mistral Large, Codestral | `api.mistral.ai` |
| **DeepSeek** | DeepSeek V3, R1 | `api.deepseek.com` |
| **Moonshot (Kimi)** | Kimi 8k/32k | `api.moonshot.cn` |
| **xAI (Grok)** | Grok 2, Grok Beta | `api.x.ai` |
| **OpenRouter** | Cientos de modelos | `openrouter.ai` |
| **Ollama (Local)** | Cualquier modelo local | `http://127.0.0.1:11434` |

---

## 11. Configuración de API Keys

Accede a la configuración en **⚙ (engranaje)** → Tab **🤖 APIs**.

### Pasos para Configurar una API Key
1. Abre **⚙ Configuración** desde la barra superior.
2. Ve al tab **🤖 APIs** (seleccionado por defecto).
3. Haz clic en el proveedor deseado en la lista lateral.
4. Pega tu API Key en el campo de texto (la puedes mostrar/ocultar con el botón 👁).
5. Haz clic en **Guardar** — el indicador cambiará a 🟢.

### Configurar Ollama Local
1. Selecciona **Ollama (Local)** en la lista de proveedores.
2. Ingresa la **URL del servidor** (por defecto: `http://127.0.0.1:11434`).
3. Especifica el **nombre del modelo** (ej. `qwen2.5-coder:7b`, `llama3:8b`).
4. Haz clic en **Guardar**.

> **Nota**: Ollama no requiere API Key. Asegúrate de tener el daemon de Ollama corriendo con `ollama serve` antes de usarlo.

---

## 12. Acompañante Virtual AIRI (Avatar 3D)

AIRI es el **asistente virtual interactivo** de Nexus IDE, con avatar 3D animado y capacidades de voz en tiempo real.

### Activar AIRI
1. Ve a **⚙ Configuración → Editor** y activa el checkbox **👤 Habilitar Acompañante 3D AIRI**.
2. O bien, haz clic en el botón **👤 Acompañante AIRI** en el encabezado del Modal del Asistente.
3. El avatar aparecerá en la parte superior del panel de chat.

### El Avatar 3D
- **Canvas animado** con renderizado en tiempo real.
- El avatar responde visualmente cuando la IA está **hablando** (ondas en la boca, pulso violeta).
- Cuando el **micrófono** está activo, el avatar se ilumina en **verde**.
- Cambia entre estados: `Reposo`, `Escuchando`, `Hablando`.

### Síntesis de Voz (Text-to-Speech)
Configura en el tab **👤 AIRI** del Modal del Asistente:
- **Motor de Voz**: selecciona entre `Navegador (Web Speech API)` o `ElevenLabs TTS (Premium)`.
- **Voz del Sistema**: elige la voz de tu preferencia de la lista de voces instaladas.
- **Prueba de Voz**: escribe un texto y presiona 🔊 **Probar** para escuchar a AIRI.
- **Toggle de Voz**: activa o desactiva la lectura en voz alta de las respuestas del chat.

### Reconocimiento de Voz (Speech-to-Text)
- Haz clic en el icono **🎤** en el panel del avatar para activar el micrófono.
- AIRI escuchará tu voz y transcribirá automáticamente el texto al campo del chat.
- Al terminar de hablar, el texto se envía automáticamente al modelo de IA.

### Personalidad de AIRI
En el tab **👤 AIRI** → sección **🧠 Personalidad y Comportamiento**:
- Escribe instrucciones personalizadas para definir cómo se comporta AIRI (ej. "Sé sarcástica y ultra-técnica").
- Presiona **Actualizar Personalidad** para guardar los cambios.
- Las instrucciones se inyectan automáticamente en el prompt del sistema de todos los chats.

---

## 13. Base de Conocimiento RAG (Odysseus)

**Odysseus** es el sistema de RAG (Retrieval-Augmented Generation) que permite indexar documentos locales para que la IA los use como contexto.

### Requisito
El daemon de Odysseus debe estar corriendo localmente en el **puerto 8000**. Ejecuta `odysseus` desde la terminal para iniciarlo.

### Panel RAG (Sidebar)
Accede desde el icono **📚** en la barra lateral izquierda.

#### Funciones
- **Estado del Daemon**: indicador LED que muestra si Odysseus está Activo/Inactivo.
- **Arrastrar Archivos**: arrastra PDFs, Markdown, TXT, JSON o archivos de código directamente al panel para indexarlos.
- **Lista de Archivos Indexados**: muestra todos los documentos en la base vectorial con opciones para eliminarlos.
- **Buscador**: filtra los archivos indexados por nombre.
- **Sincronizar**: recarga el estado del daemon con el botón ↻.
- **Indexar Proyecto Completo**: botón "🔄 Indexar Proyecto Completo" para indexar todo el workspace de una sola vez.

### Inyección Automática en el Chat
Cuando la IA responde a una consulta, el IDE automáticamente:
1. Busca fragmentos relevantes en la base Odysseus que coincidan con tu pregunta.
2. Añade esos fragmentos como **contexto adicional** antes de enviar la petición al LLM.
3. La IA usa esa información para darte respuestas más precisas y contextualizadas al proyecto.

---

## 14. RAG Local In-Memory (Indexación del Workspace)

El **Modal del Asistente IA** (`Ctrl+Alt+A`) incluye un sistema RAG completamente local que funciona sin ningún servidor externo.

### Cómo Acceder
1. Abre el Modal con `Ctrl+Alt+A` o desde el menú **🤖 Asistente**.
2. Ve al tab **📚 RAG**.

### Funciones
- **⚡ Indexar Workspace**: escanea y carga todos los archivos del proyecto directamente en memoria.
- **Estadísticas**: muestra el número de archivos indexados y de fragmentos (chunks) disponibles.
- **Buscador Semántico**: escribe una consulta y presiona 🔍 para buscar fragmentos relevantes en la base local; los resultados se muestran con el nombre del archivo, número de línea y el contenido del código.
- **Sin servidor requerido**: toda la indexación ocurre en el navegador, sin enviar datos a ningún servidor.

---

## 15. Motor 3D (BabylonJS)

El IDE incluye un **Motor 3D interactivo** basado en BabylonJS/WebGL accesible desde la barra lateral o el menú.

### Plantillas 3D Incluidas
- **Cubo** — Un cubo básico rotando con luces. Punto de partida para experimentar con scripting.
- **Rebotes** — Simulación de gravedad con múltiples objetos rebotando.
- **Discoteca** — Escena con luces dinámicas multicolor para probar materiales y shaders.

### Scripting 3D desde el Chat
La IA puede escribir y ejecutar código BabylonJS directamente en el motor 3D usando el tag:
```
[RUN_3D_SCRIPT]
// Código JavaScript / BabylonJS aquí
[/RUN_3D_SCRIPT]
```

Esto permite pedirle a la IA cosas como "Crea un sistema solar con planetas orbitando" y verlos aparecer en tiempo real.

---

## 16. Integración con Godot Engine

Nexus IDE puede abrirse en paralelo con **Godot Engine 4** para desarrollo de juegos.

### Funciones
- **Abrir en Godot**: botón para lanzar el editor de Godot con el proyecto activo.
- **GDScript Editor**: Monaco con soporte de sintaxis para GDScript 4.x y snippets integrados.
- **Ejecución del Juego**: lanza el juego directamente desde el IDE.
- **Bridge Blender-Godot**: integración con Blender para exportar activos 3D al proyecto de Godot.

### Snippets de GDScript
Consulta la sección [Editor de Código → Snippets GDScript](#gdscript-godot).

---

## 17. Gestor Docker

Accede al gestor desde el icono **🐳** en la barra lateral o con `Ctrl+Alt+D`.

### Funciones
- **Listar Contenedores**: muestra todos los contenedores Docker con su estado (corriendo/detenido).
- **Controles por Contenedor**:
  - ▶️ **Iniciar** un contenedor detenido.
  - ⏸️ **Pausar** un contenedor en ejecución.
  - 🗑️ **Eliminar** un contenedor.
  - 📋 **Ver Logs** — muestra los logs del contenedor en tiempo real.
- **Crear Nuevo Contenedor**: formulario con campos para Imagen, Puertos (ej. `80:80`) y Variables de Entorno.

---

## 18. OpenClaw — Gateway de Agentes Remotos

**OpenClaw** es el daemon local que conecta Nexus IDE con aplicaciones de mensajería (Telegram, WhatsApp, Discord) para control remoto.

### Estado del Gateway
- En el Centro de Inicio y en la barra de estado inferior verás el indicador **🤖 OpenClaw: Apagado/Encendido**.
- Haz clic en el indicador para alternar el estado.

### Funciones
- **Control Remoto**: envía comandos desde tu teléfono a través de Telegram/WhatsApp.
- **Respuestas Remotas**: la IA procesa el comando y responde directamente al canal de mensajería.
- **Aplicación de Cambios en el Proyecto**: los cambios propuestos por la IA remota se pueden aplicar al código local bajo los límites de seguridad de RAMS.

---

## 19. RAMS — Telemetría del Sistema

El módulo **RAMS** (Reliability, Availability, Maintainability, Safety) monitorea el rendimiento del sistema en tiempo real.

### Dónde Verlo
- **Barra de Estado inferior**: muestra `📊 CPU: X% | GPU: X% | VRAM: X.XGB` en tiempo real.
- Haz clic sobre el indicador para ver el panel completo de telemetría.

### Métricas Monitoreadas
- **CPU** — porcentaje de uso del procesador.
- **GPU** — porcentaje de uso de la tarjeta gráfica.
- **VRAM** — gigabytes de memoria de video utilizados (especialmente útil con modelos locales de Ollama).

---

## 20. Plantillas de Proyectos

Crea proyectos estructurados desde cero con las plantillas predefinidas.

### Cómo Acceder
- Menú: **Archivo → Nuevo Proyecto desde Plantilla** (`Ctrl+Shift+N`).
- Panel Home: botón **🚀 Nueva Plantilla**.

### Plantillas Disponibles

| Plantilla | Descripción | Archivos |
|-----------|-------------|---------|
| 🟨 **Node.js API** | Servidor Express básico con rutas REST | `package.json`, `server.js` |
| ⚛️ **React App** | Aplicación React con Vite | `index.html`, `main.jsx`, `App.jsx` |
| 🐍 **Python FastAPI** | API REST con FastAPI y endpoints CRUD | `main.py`, `requirements.txt` |
| 🦀 **Rust CLI** | Aplicación de línea de comandos en Rust | `src/main.rs`, `Cargo.toml` |
| ⚡ **C++ CMake** | Proyecto C++ con sistema de build CMake | `main.cpp`, `CMakeLists.txt` |
| 🎮 **Godot 4 Game** | Plantilla de juego 2D con controlador | `Main.gd`, `Player.gd`, `README.md` |
| 🌐 **Three.js 3D** | Escena 3D interactiva en el navegador | `index.html`, `main.js` |
| 🐳 **Docker + API** | App dockerizada con `docker-compose` | `docker-compose.yml`, `Dockerfile`, `.env` |
| 🤖 **Agent Extension** | Script de extensión para agentes Nexus | `agent_extension.py`, `README.md` |

### Proceso de Creación
1. Selecciona la plantilla deseada.
2. Ingresa el nombre del nuevo proyecto.
3. Elige la carpeta contenedora (o cámbiala con **"Cambiar..."**).
4. Marca **"Cargar como espacio de trabajo activo"** si quieres abrirlo inmediatamente.
5. Haz clic en **Crear Proyecto**.

---

## 21. Gestor de Proyectos / Dashboard

El **Centro de Inicio** es la pantalla de bienvenida y gestión de proyectos.

### Cómo Acceder
- Se abre automáticamente al iniciar el IDE.
- Menú: **Archivo → Gestor de Proyectos** (`Ctrl+Alt+P`).

### Panel Izquierdo — Workspace Actual
- Nombre y ruta absoluta del espacio de trabajo activo.
- Estadísticas del proyecto (archivos, carpetas).
- Botón para subir un nivel en el árbol de directorios.
- Lista de **IAs Configuradas** con badges LED de colores.
- Botón **⬇️ Descargar Ejecutable** para ir a las releases de GitHub.

### Panel Derecho — Proyectos Disponibles
- Lista de subcarpetas del directorio raíz (proyectos locales detectados automáticamente).
- **Historial de Carpetas** abiertas recientemente (guardado en `localStorage`).
- Cada proyecto muestra un botón **Abrir** para cambiar de workspace instantáneamente.
- Opciones para crear nuevas carpetas y eliminar entradas del historial.

---

## 22. Marketplace de Plugins

Instala extensiones para añadir funcionalidades extra al IDE.

### Cómo Acceder
- `Ctrl+Alt+M` o menú **Ver → Marketplace de Plugins**.
- Icono **🔌** en la barra lateral.

### Instalar un Plugin desde Git
1. Ingresa la URL del repositorio Git (ej. `https://github.com/usuario/mi-plugin.git`).
2. Haz clic en **Clonar e Instalar**.
3. El IDE ejecuta `git clone` y activa el plugin dinámicamente.

### Plugins Predefinidos (Biblioteca Curada)

| Plugin | Descripción |
|--------|-------------|
| 📊 **Visual Git Graph** | Grafo visual del historial de commits del repositorio |
| 🗄️ **Database Client (SQLite)** | Editor SQL interactivo para consultar bases de datos SQLite |
| 🎨 **Excalidraw Sketchpad** | Pizarra de diagramas y dibujos integrada |
| 🔍 **RegEx Sandbox** | Probador de expresiones regulares con resaltado visual |
| 🎵 **Spotify Controller** | Controlador de música Spotify integrado |
| 📦 **JSON Formatter** | Validador, formateador y minificador de JSON |

---

## 23. Ajustes y Configuración

Accede con `Ctrl+,` o el icono **⚙** en la barra superior.

### Tabs de Configuración

#### 🤖 APIs — Gestión de Claves de IA
- Configura, actualiza o elimina API Keys de todos los proveedores de IA.
- Cada proveedor muestra un indicador 🟢/⚪ según si tiene clave configurada.

#### 📝 Editor
| Opción | Descripción |
|--------|-------------|
| Tamaño de Fuente | Ajusta el tamaño del texto en el editor (px) |
| Familia de Fuente | Cambia la fuente monoespaciada (ej. `Fira Code`, `JetBrains Mono`) |
| Tamaño de Tab | 2, 4 u 8 espacios |
| Minimapa | Activa/desactiva el minimapa lateral |
| Word Wrap | Ajuste de línea largo activado/desactivado |
| Formato al Guardar | Formatea el código automáticamente con `Ctrl+S` |
| Permisos del Agente | `⚠️ Pedir confirmación` / `⚡ Ejecutar directo` |
| Avatar AIRI | Activa/desactiva el acompañante 3D y voz |

#### 🐚 Terminal
- Selecciona el shell predeterminado: PowerShell, CMD o Bash.

#### 🎨 Temas
Elige entre los temas de color:
- **Nexus Classic Dark** (Púrpura oscuro — por defecto)
- **Dracula Theme** (Premium)
- **One Dark Atom** (Suave)
- **Catppuccin Mocha** (Pastel)
- **Nord Theme** (Ártico)

#### 🌍 Idioma
Cambia el idioma de la interfaz:
- Español (es) — por defecto
- English (en)
- Português (pt)
- Français (fr)
- Deutsch (de)

---

## 24. Atajos de Teclado

### Generales

| Atajo | Función |
|-------|---------|
| `Ctrl+N` | Nuevo archivo |
| `Ctrl+O` | Abrir carpeta |
| `Ctrl+S` | Guardar archivo activo |
| `Ctrl+Shift+S` | Guardar todos los archivos |
| `Ctrl+W` | Cerrar pestaña activa |
| `Ctrl+,` | Abrir Configuración |
| `Ctrl+Shift+P` | Abrir Command Palette |
| `Ctrl+Shift+N` | Nuevo Proyecto desde Plantilla |

### Editor

| Atajo | Función |
|-------|---------|
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` | Rehacer |
| `Ctrl+C` | Copiar selección |
| `Ctrl+V` | Pegar |
| `Ctrl+X` | Cortar selección |
| `Ctrl+A` | Seleccionar todo |
| `Ctrl+F` | Buscar en el archivo |
| `Ctrl+H` | Buscar y reemplazar |
| `Ctrl+G` | Ir a línea |
| `F1` | Abrir Command Palette de Monaco |
| `F7` | Alternar Minimapa |

### Paneles

| Atajo | Función |
|-------|---------|
| `Ctrl+Alt+A` | Abrir Modal del Asistente IA |
| `Ctrl+Alt+C` | Alternar Panel de Chat |
| `Ctrl+Alt+D` | Abrir Gestor Docker |
| `Ctrl+Alt+M` | Abrir Marketplace de Plugins |
| `Ctrl+Alt+P` | Abrir Dashboard / Gestor de Proyectos |
| `` Ctrl+` `` | Alternar Terminal Integrada |

---

## 25. Command Palette

La **Command Palette** (`Ctrl+Shift+P`) ofrece acceso rápido por texto a todas las funciones del IDE.

### Comandos Disponibles (selección)
- `Nuevo Archivo`
- `Abrir Carpeta`
- `Guardar Todo`
- `Abrir Configuración`
- `Nuevo Proyecto desde Plantilla`
- `Asistente de IA (Multimodal)`
- `Gestor Docker`
- `Marketplace de Plugins`
- `Gestor de Proyectos`
- `Buscar en Proyecto`
- `Ir a Línea...`
- `Formatear Documento`
- `Alternar Minimapa`
- `Cambiar Idioma de Interfaz`
- `Cambiar Tema`

---

## 26. Barra de Estado

La **barra de estado inferior** muestra información del contexto actual del IDE.

### Sección Izquierda
| Indicador | Descripción |
|-----------|-------------|
| `main ⎇` | Rama Git activa |
| `0 errores 0 advertencias` | Errores y advertencias del linter |
| `💾 Auto` | Indicador de guardado automático activo |
| `🤖 OpenClaw: Apagado/Encendido` | Estado del gateway OpenClaw (clic para alternar) |

### Sección Central
| Indicador | Descripción |
|-----------|-------------|
| Nombre del archivo | Archivo actualmente abierto en el editor |
| Lenguaje | Lenguaje detectado del archivo activo |
| `📊 CPU: X% \| GPU: X% \| VRAM: X.XGB` | Telemetría RAMS en tiempo real |

### Sección Derecha
| Indicador | Descripción |
|-----------|-------------|
| `🗺️ Minimap: ON/OFF` | Estado del minimapa (clic para alternar) |
| Nombre del modelo | Modelo de IA activo (clic para cambiar) |
| Línea : Columna | Posición del cursor en el editor |

## 27. Conexiones VPS Remotas (SSH/SFTP)

Nexus IDE incluye un módulo avanzado para gestionar y desarrollar directamente sobre servidores VPS remotos.

### Características
- **Panel Lateral VPS**: Configura el host, puerto, método de autenticación (contraseña o llave privada SSH local) y directorio raíz del servidor.
- **Explorador SFTP**: Navega de forma nativa por las carpetas del VPS y abre archivos remotos directamente en Monaco.
- **Guardado Automático y Sincronizado**: Al presionar `Ctrl + S`, el archivo editado se guarda localmente y se sube automáticamente al servidor VPS por SFTP.
- **Terminal SSH Integrada**: Abre consolas SSH interactivas directamente conectadas al shell de tu servidor Linux.

---

## 28. Generador de Video AI (ComfyUI)

El panel lateral de Generador de Video AI permite orquestar y generar clips cinematográficos conectándote a un servidor local o remoto de ComfyUI.

### Características
- **Detección inteligente de Modelos**: Comprueba de manera automatizada si los modelos pesados están instalados en las subcarpetas del proyecto o en la ruta de almacenamiento compartida de ComfyUI-Desktop (`ComfyUI-Shared/models/`).
- **Compatibilidad de Workflows**:
  - **LTX-Video GGUF (Ligero)** y **LTX-Video SFT (Pesado)**: Generación rápida basada en el codificador de texto Gemma 2 y CLIP-L.
  - **Hunyuan-Video GGUF (Ligero)** y **Hunyuan-Video FP8 (Pesado)**: Generación premium de alta resolución.
  - **SVD XT (Imagen a Video)**: Carga una imagen semilla desde tu sistema y genera un video en bucle con interpolación de frames.
- **Descargas Públicas Sin Restricciones**: Si faltan archivos como el VAE o codificadores de texto, el IDE ofrece un enlace de descarga con mirrors públicos que evitan los tokens gated de Hugging Face.

---

## 29. Función de Voz a Texto Rápida

Usa tu micrófono para dictar prompts de forma rápida y autónoma en el chat principal de la IA.

### Cómo Usar
1. Haz clic en el botón de micrófono **🎤** al lado del botón de adjuntos.
2. Si es la primera vez que lo utilizas, Electron solicitará automáticamente los permisos de captura de audio (aprobados por defecto en el proceso principal).
3. El botón cambiará de color a rojo parpadeante **🔴** y el prompt indicará `"Escuchando... Habla ahora..."`.
4. Dicta tu consulta. Al terminar, la transcripción se insertará de forma limpia en la caja de texto y se enviará de manera automática a la IA tras 300ms.

---

## Glosario

| Término | Definición |
|---------|------------|
| **RAG** | Retrieval-Augmented Generation — técnica de inyectar documentos relevantes como contexto al LLM |
| **LLM** | Large Language Model — modelo de lenguaje grande (GPT, Gemini, Claude, etc.) |
| **TTS** | Text-to-Speech — conversión de texto a voz sintetizada |
| **STT** | Speech-to-Text — conversión de voz a texto |
| **Ollama** | Runtime local para ejecutar modelos de IA sin conexión a internet |
| **IPC** | Inter-Process Communication — comunicación entre el proceso de Node y el renderer de Electron |
| **GLSL** | OpenGL Shading Language — lenguaje de shaders para programación gráfica |
| **Workspace** | Carpeta raíz del proyecto activo en el IDE |
| **Daemon** | Proceso de servidor corriendo en segundo plano (Odysseus, OpenClaw, Ollama) |
| **Vector DB** | Base de datos vectorial para búsqueda semántica por similitud de embeddings |

---

*Manual generado para Nexus IDE — Versión actual del proyecto en `c:\Users\gwmki\.openclaw\workspace`.*
