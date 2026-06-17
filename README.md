# 🌌 Nexus IDE

Nexus IDE es un entorno de desarrollo integrado (IDE) de escritorio de última generación, construido sobre **Electron**, **HTML5/CSS3 (Glassmorphism)** y **Node.js**. Combina un rendimiento fuera de línea ultrarrápido con herramientas avanzadas para desarrollo de software, modelado y renderizado 3D, y asistencia interactiva mediante Inteligencia Artificial multi-proveedor.

![Electron](https://img.shields.io/badge/Electron-28.0.0-blueviolet?style=flat-safe)
![Monaco](https://img.shields.io/badge/Monaco_Editor-0.43.0-blue?style=flat-safe)

---

## ✨ Características Principales

### 💻 Editor de Código de Alto Rendimiento
* **Monaco Editor Integrado**: Soporte completo fuera de línea (offline) para resaltado de sintaxis y búsqueda inteligente con atajo visual de 🔍 Buscar.
* **Autocompletado Local**: Autocompletado local nativo sin consumo de IA para **GDScript (Godot)** y **C++ (Unreal Engine 5)** con palabras clave, macros y APIs estándar.
* **40+ Lenguajes**: Detección inteligente de extensiones y visualización dinámica en la barra de estado con paletas dedicadas.
* **Snippets Inteligentes**: Plantillas y snippets integrados listos para agilizar la escritura en múltiples lenguajes (JS, Python, Rust, C++, etc.).
* **Gestor de Plantillas**: Crea estructuras de proyectos desde cero (Node, Python, HTML5, etc.) en segundos.

### 🤖 Asistencia de Inteligencia Artificial & AIRI
* **Proveedores Compatibles**: Soporte nativo para APIs de **Google Gemini** (incluyendo los últimos modelos Thinking, Pro y Flash), **OpenAI**, **Anthropic Claude**, **Groq**, **Mistral**, **DeepSeek**, **Moonshot (Kimi)**, **xAI (Grok)** y **Ollama** (para ejecución 100% local).
* **Agentes Colaborativos**: Genera dinámicas de equipo donde múltiples modelos de IA discuten y colaboran simultáneamente para solucionar problemas de código.
* **Seguridad de Datos**: Tus claves API y configuraciones se guardan localmente en el almacenamiento aislado de tu máquina (`localStorage`).
* **Burbuja de Notificaciones**: Notificaciones de estado de tareas y solicitud interactiva de permisos directo sobre el avatar 3D de AIRI.

### 🎮 Integración de Motores 3D (Godot y Unreal Engine 5)
* **Godot & Unreal Engine IPC Bridge**: Ejecuta proyectos y abre editores desde el IDE con flujos de trabajo e hilos asíncronos y sockets portables.
* **Conversor Imagen-a-3D (Blender)**: Displaza mallas 3D usando imágenes y un control de relieve.
* **Visor 3D Interactivo**: Ventana flotante de vista previa 3D interactiva (BabylonJS) para inspeccionar y rotar los modelos GLB generados antes de importarlos a tu motor.

### 📱 Control Remoto de AIRI
* **Bot de Telegram Integrado**: Chatea con la IA de AIRI y dale órdenes a tu terminal remotamente mediante un Bot de Telegram con niveles de seguridad configurables (Restringido, Con Confirmación de terminal, o Acceso Total).

### 🐳 Gestor de Docker Integrado (Ctrl+Alt+D)
* **Control de Ciclo de Vida**: Gestiona tus contenedores locales (Iniciar, Pausar, Reiniciar, Eliminar) desde un panel dedicado.
* **Visor de Logs en Vivo**: Lee la salida de consola de tus servicios de base de datos o APIs en ejecución en tiempo real.
* **Creación de Contenedores**: Despliega imágenes directamente configurando puertos y variables de entorno.

### 🔌 Galería de Plugins y Marketplace (Ctrl+Alt+M)
* **Instalador Git Directo**: Instala cualquier extensión externa clonando repositorios de Git directamente a la carpeta de plugins del IDE.
* **Biblioteca Curada Incluida**:
  * **📊 Visual Git Graph**: Grafo interactivo del historial de commits local.
  * **🗄️ Database Client (SQLite)**: Consulta bases de datos SQLite integradas con visor de tablas.
  * **🎨 Excalidraw Sketchpad**: Dibuja diagramas de flujo y esquemas directamente.
  * **🔍 RegEx Sandbox**: Valida expresiones regulares en caliente.
  * **📦 JSON Formatter**: Formatea, valida y minifica estructuras JSON.
  * **🎵 Spotify Controller**: Medidor y reproductor multimedia integrado.

---

## 🛠️ Requisitos e Instalación

Para ejecutar este proyecto en modo desarrollo, necesitas tener instalado **Node.js** (versión 18 o superior).

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/Sencans/nexus-ide.git
   cd nexus-ide
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Inicia el IDE localmente:**
   ```bash
   npm start
   ```

---

## 📦 Compilación y Distribución

Para empaquetar Nexus IDE en un ejecutable portátil autónomo (`.exe`) para Windows sin necesidad de instalar dependencias externas en el equipo destino:

```bash
npm run dist
```

El resultado se generará en la carpeta `./nexus-ide-win32-x64/nexus-ide.exe`. Compila la carpeta completa en un archivo ZIP para compartirla.

---

## 🔒 Privacidad y API Keys
Toda la configuración del usuario, las rutas de directorios abiertas y las claves de API se persisten de manera aislada en el `localStorage` del cliente. **Ninguna clave de API ni archivo personal se envía a servidores externos ni se empaqueta en la distribución ejecutable.**
