const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Nexus IDE",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Permite usar módulos de Node directamente en tu index.html (fs, path, etc)
      sandbox: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[BROWSER CONSOLE] Level: ${level} | ${message} | ${path.basename(sourceId)}:${line}`);
  });

  // Forzar la limpieza de la caché antes de cargar para ver siempre los últimos cambios
  mainWindow.webContents.session.clearCache().then(() => {
    mainWindow.loadFile('index.html');
  });
  // mainWindow.webContents.openDevTools(); // Descomentar para ver la consola de errores
}

// Handler para abrir carpetas
ipcMain.handle('open-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Handler para seleccionar archivos de modelos 3D
ipcMain.handle('select-3d-model', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Modelos 3D', extensions: ['glb', 'gltf', 'obj', 'stl'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Handler para ejecutar Godot de forma segura y transparente desde el Main Process (sin restricciones de Chromium Sandbox)
ipcMain.handle('run-godot', async (event, { mode, godotExe, godotDir, args }) => {
  return new Promise((resolve) => {
    try {
      const { spawn } = require('child_process');
      console.log(`[Main Process] Lanzando Godot desde el Proceso Principal...`);
      console.log(`Ejecutable: ${godotExe}`);
      console.log(`Cwd: ${godotDir}`);
      console.log(`Args:`, args);

      // Usamos spawn con detached: true, stdio: 'ignore' y windowsHide: false
      // para iniciar Godot de forma totalmente independiente del proceso de Electron.
      const child = spawn(godotExe, args, {
        cwd: godotDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });

      child.unref();

      console.log(`[Main Process] Godot lanzado exitosamente con PID: ${child.pid}`);
      resolve({ success: true, pid: child.pid });
    } catch (err) {
      console.error("[Main Process] Error al lanzar Godot:", err);
      resolve({ success: false, error: err.message });
    }
  });
});

// Handler para ejecutar Blender de forma segura y transparente desde el Main Process (sin restricciones de Chromium Sandbox)
ipcMain.handle('run-blender', async (event, { blenderExe, blenderDir, args }) => {
  return new Promise((resolve) => {
    try {
      const { spawn } = require('child_process');
      console.log(`[Main Process] Lanzando Blender desde el Proceso Principal...`);
      console.log(`Ejecutable: ${blenderExe}`);
      console.log(`Cwd: ${blenderDir}`);
      console.log(`Args:`, args);

      const child = spawn(blenderExe, args, {
        cwd: blenderDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });

      child.unref();

      console.log(`[Main Process] Blender lanzado exitosamente con PID: ${child.pid}`);
      resolve({ success: true, pid: child.pid });
    } catch (err) {
      console.error("[Main Process] Error al lanzar Blender:", err);
      resolve({ success: false, error: err.message });
    }
  });
});


app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});