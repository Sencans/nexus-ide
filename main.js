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

// Helper para obtener la dirección IP local de la red WiFi/Ethernet
const os = require('os');
const http = require('http');
const fs = require('fs');

let remoteServer = null;
let serverPort = 9090;

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function launchGodot({ mode, godotExe, godotDir, args }) {
  return new Promise((resolve) => {
    try {
      const { spawn } = require('child_process');
      console.log(`[Main Process] Lanzando Godot desde el Proceso Principal...`);
      console.log(`Ejecutable: ${godotExe}`);
      console.log(`Cwd: ${godotDir}`);
      console.log(`Args:`, args);

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
}

function launchBlender({ blenderExe, blenderDir, args }) {
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
}

// Handler para ejecutar Godot de forma segura
ipcMain.handle('run-godot', async (event, data) => {
  return await launchGodot(data);
});

// Handler para ejecutar Blender de forma segura
ipcMain.handle('run-blender', async (event, data) => {
  return await launchBlender(data);
});

// Handler para iniciar el servidor de control remoto
ipcMain.handle('start-remote-server', async (event, { port }) => {
  serverPort = port || 9090;
  if (remoteServer) {
    return { success: true, port: serverPort, ip: getLocalIpAddress() };
  }
  try {
    remoteServer = http.createServer((req, res) => {
      // Configuración de CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      if (req.method === 'GET') {
        let filePath = '';
        if (pathname === '/' || pathname === '/index.html') {
          filePath = path.join(__dirname, 'index.html');
        } else {
          filePath = path.join(__dirname, pathname);
        }

        filePath = path.normalize(filePath);
        if (!filePath.startsWith(__dirname)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Acceso denegado');
          return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          let contentType = 'text/html';
          const ext = path.extname(filePath);
          if (ext === '.js') contentType = 'text/javascript';
          else if (ext === '.css') contentType = 'text/css';
          else if (ext === '.json') contentType = 'application/json';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg') contentType = 'image/jpeg';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          else if (ext === '.ico') contentType = 'image/x-icon';

          res.writeHead(200, { 'Content-Type': contentType });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Archivo no encontrado');
        }
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (pathname === '/api/fs') {
              const { action, args } = data;
              if (action === 'existsSync') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, result: fs.existsSync(args[0]) }));
              } else if (action === 'readFileSync') {
                const content = fs.readFileSync(args[0], args[1] || 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, result: content }));
              } else if (action === 'writeFileSync') {
                fs.writeFileSync(args[0], args[1], args[2] || 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'readdirSync') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, result: fs.readdirSync(args[0]) }));
              } else if (action === 'statSync') {
                const s = fs.statSync(args[0]);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  result: { isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size }
                }));
              } else if (action === 'mkdirSync') {
                fs.mkdirSync(args[0], args[1]);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } else {
                throw new Error("Acción fs no implementada: " + action);
              }
            } else if (pathname === '/api/exec') {
              const { command, cwd } = data;
              const { exec: cpExec } = require('child_process');
              cpExec(command, { cwd: cwd || __dirname, timeout: 15000 }, (error, stdout, stderr) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: !error,
                  stdout,
                  stderr,
                  error: error ? error.message : null
                }));
              });
            } else if (pathname === '/api/ipc') {
              const { channel, args } = data;
              if (channel === 'run-godot') {
                launchGodot(args[0]).then(result => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, result }));
                });
              } else if (channel === 'run-blender') {
                launchBlender(args[0]).then(result => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, result }));
                });
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Canal de IPC remoto no soportado' }));
              }
            } else {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Endpoint de API no encontrado');
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      }
    });

    remoteServer.listen(serverPort, () => {
      console.log(`[Remote Server] Servidor remoto corriendo en puerto ${serverPort}`);
    });
    return { success: true, port: serverPort, ip: getLocalIpAddress() };
  } catch (err) {
    console.error("Error al iniciar el servidor HTTP remoto:", err);
    return { success: false, error: err.message };
  }
});

// Handler para detener el servidor de control remoto
ipcMain.handle('stop-remote-server', async () => {
  if (!remoteServer) return { success: true };
  return new Promise((resolve) => {
    remoteServer.close(() => {
      remoteServer = null;
      console.log(`[Remote Server] Servidor remoto detenido`);
      resolve({ success: true });
    });
  });
});

// Handler para obtener estado actual del servidor remoto
ipcMain.handle('get-remote-server-status', async () => {
  if (remoteServer) {
    return { active: true, port: serverPort, ip: getLocalIpAddress() };
  }
  return { active: false };
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