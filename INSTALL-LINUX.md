# 🐧 Nexus IDE en Linux (Fedora, Arch, Debian/Ubuntu y más)

Nexus IDE está construido sobre **Electron**, por lo que funciona de forma nativa en Linux. Esta guía cubre cómo **ejecutarlo desde el código** y cómo **generar paquetes instalables** para las principales distribuciones.

---

## 1. Requisitos previos

Necesitas **Node.js 18+** y **git**.

| Distro | Comando |
|--------|---------|
| **Fedora / RHEL** | `sudo dnf install nodejs git` |
| **Arch / Manjaro** | `sudo pacman -S nodejs npm git` |
| **Debian / Ubuntu** | `sudo apt install nodejs npm git` |
| **openSUSE** | `sudo zypper install nodejs git` |

> Electron necesita algunas librerías del sistema (normalmente ya presentes en entornos de escritorio):
> - **Fedora:** `sudo dnf install nss atk at-spi2-atk gtk3 libdrm mesa-libgbm alsa-lib libXScrnSaver`
> - **Arch:** `sudo pacman -S nss atk at-spi2-atk gtk3 libdrm mesa alsa-lib libxss`
> - **Debian/Ubuntu:** `sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 libgbm1 libasound2 libxss1`

---

## 2. Ejecutar en modo desarrollo

```bash
git clone https://github.com/Sencans/nexus-ide.git
cd nexus-ide
npm install
npm start
```

---

## 3. Generar paquetes instalables

El proyecto usa **electron-builder**. Instala las dependencias de desarrollo una vez:

```bash
npm install
```

Luego genera el paquete para tu distro (los artefactos aparecen en `./dist/`):

| Objetivo | Comando | Resultado |
|----------|---------|-----------|
| **Fedora / RHEL** (RPM) | `npm run dist:fedora` | `dist/Nexus IDE-1.0.0.x86_64.rpm` |
| **Arch / Manjaro** (pacman) | `npm run dist:arch` | `dist/Nexus IDE-1.0.0.pacman` |
| **Universal** (AppImage) | `npm run dist:appimage` | `dist/Nexus IDE-1.0.0-x86_64.AppImage` |
| **Todos los de Linux** | `npm run dist:linux` | AppImage + deb + rpm + pacman + tar.gz |

### Instalar el paquete generado

```bash
# Fedora
sudo dnf install ./dist/Nexus\ IDE-1.0.0.x86_64.rpm

# Arch
sudo pacman -U ./dist/Nexus\ IDE-1.0.0.pacman

# Debian / Ubuntu
sudo apt install ./dist/Nexus\ IDE-1.0.0.deb

# AppImage (sin instalación, portable)
chmod +x ./dist/Nexus\ IDE-1.0.0-x86_64.AppImage
./dist/Nexus\ IDE-1.0.0-x86_64.AppImage
```

---

## 4. Notas específicas de Linux

- **Terminal integrada:** en Linux usa `bash` por defecto (configurable a `zsh`, `fish` o `sh` desde Ajustes → Terminal).
- **Apagado del PC** (skill del asistente): usa `systemctl poweroff`, con reserva a `shutdown -h now`.
- **Compañero avatar flotante:** el overlay transparente *siempre encima* funciona en la mayoría de compositores (GNOME/Mutter, KDE/KWin). En algunos compositores de **Wayland** el "click-through" o el "siempre encima" pueden variar; si notas problemas, prueba una sesión de **X11**.
- **GPU / telemetría:** la utilización de GPU se lee con `nvidia-smi` (si tienes drivers NVIDIA). En GPUs AMD/Intel esa métrica puede no mostrarse.
- **Modelos de IA locales:** Ollama, LM Studio, Jan, llama.cpp y vLLM funcionan igual en Linux apuntando a `127.0.0.1` en sus puertos por defecto.

---

## 5. Solución de problemas

| Problema | Solución |
|----------|----------|
| `error while loading shared libraries: libXScrnSaver` | Instala la librería (`libXScrnSaver` en Fedora, `libxss` en Arch). |
| La ventana no es transparente | Cambia a una sesión **X11** o revisa el compositor. |
| `npm start` no abre ventana | Verifica las librerías del sistema del paso 1. |
| Sandbox de Electron falla | Ejecuta con `npm start -- --no-sandbox` (solo si es necesario). |
