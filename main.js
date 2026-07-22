const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, screen, safeStorage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Nexus IDE",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Permite usar módulos de Node directamente en tu index.html (fs, path, etc)
      sandbox: false,
      webSecurity: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[BROWSER CONSOLE] Level: ${level} | ${message} | ${path.basename(sourceId)}:${line}`);
  });

  // Interceptar peticiones a ComfyUI / localhosts para eliminar cabeceras que causan 403 (Sec-Fetch-Site)
  const { session } = require('electron');
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url.toLowerCase();
    if (url.includes('8188') || url.includes('127.0.0.1') || url.includes('localhost')) {
      for (const key of Object.keys(details.requestHeaders)) {
        const k = key.toLowerCase();
        if (k === 'sec-fetch-site' || k === 'sec-fetch-mode' || k === 'sec-fetch-dest' || k === 'origin') {
          delete details.requestHeaders[key];
        }
      }
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const perm = permission.toLowerCase();
    if (perm.includes('media') || perm.includes('audio') || perm.includes('microphone')) {
      callback(true);
    } else {
      callback(false);
    }
  });


  // Forzar la limpieza de la caché antes de cargar para ver siempre los últimos cambios
  mainWindow.webContents.session.clearCache().then(() => {
    mainWindow.loadFile('index.html');
  });
  mainWindow.maximize();
  mainWindow.show();
  mainWindow.focus();
  startHardwareTelemetry();

  // Auto-screenshot for debugging layout transparency
  setInterval(async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const img = await mainWindow.webContents.capturePage();
        const buffer = img.toPNG();
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, 'app_screenshot.png'), buffer);
      }
    } catch (e) {}
  }, 2000);
  mainWindow.webContents.openDevTools(); // Descomentar para ver la consola de errores

  // Configurar Menú de Aplicación con soporte nativo de Zoom y atajos
  const menuTemplate = [
    {
      label: 'Editar',
      submenu: [
        { label: 'Deshacer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Rehacer', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Pegar', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Seleccionar todo', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forzar recarga', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Herramientas de desarrollo', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Acercar Zoom', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Alejar Zoom', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Restablecer Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Pantalla completa', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    }
  ];
  const appMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(appMenu);

  mainWindow.on('minimize', () => {
    if (tray) {
      tray.displayBalloon({
        title: 'Nexus IDE',
        content: 'La aplicación sigue ejecutándose en segundo plano.',
        iconType: 'info'
      });
    }
  });
}

// Handler para capturar la pantalla del IDE
ipcMain.handle('capture-page', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const image = await mainWindow.webContents.capturePage();
  return image.toDataURL(); // Devuelve base64 data URL
});

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

// Handler para seleccionar múltiples archivos de imágenes
ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
});

// Handler para seleccionar cualquier archivo genérico
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: options?.title || 'Seleccionar archivo',
    filters: options?.filters || []
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
});

// ─── Cifrado de secretos con el almacén del sistema operativo ──────────────
// safeStorage usa DPAPI (Windows), Keychain (macOS) o libsecret/kwallet (Linux).
// Síncronos (sendSync) para poder cifrar/descifrar sin refactor async en el
// renderer. Devuelven null si el cifrado no está disponible (p.ej. Linux sin
// keyring) para que el renderer degrade a base64 sin romperse.
ipcMain.on('secure-available', (event) => {
  try { event.returnValue = safeStorage.isEncryptionAvailable() === true; }
  catch { event.returnValue = false; }
});
ipcMain.on('secure-encrypt', (event, plain) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) { event.returnValue = null; return; }
    event.returnValue = safeStorage.encryptString(String(plain)).toString('base64');
  } catch { event.returnValue = null; }
});
ipcMain.on('secure-decrypt', (event, b64) => {
  try { event.returnValue = safeStorage.decryptString(Buffer.from(String(b64), 'base64')); }
  catch { event.returnValue = null; }
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

function launchUnity({ unityExe, unityDir, args }) {
  return new Promise((resolve) => {
    try {
      const { spawn } = require('child_process');
      console.log(`[Main Process] Lanzando Unity desde el Proceso Principal...`);
      console.log(`Ejecutable: ${unityExe}`);
      console.log(`Cwd: ${unityDir}`);
      console.log(`Args:`, args);

      const child = spawn(unityExe, args, {
        cwd: unityDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });

      child.unref();

      console.log(`[Main Process] Unity lanzado exitosamente con PID: ${child.pid}`);
      resolve({ success: true, pid: child.pid });
    } catch (err) {
      console.error("[Main Process] Error al lanzar Unity:", err);
      resolve({ success: false, error: err.message });
    }
  });
}

function launchUnreal({ unrealExe, unrealDir, args }) {
  return new Promise((resolve) => {
    try {
      const { spawn } = require('child_process');
      console.log(`[Main Process] Lanzando Unreal Engine desde el Proceso Principal...`);
      console.log(`Ejecutable: ${unrealExe}`);
      console.log(`Cwd: ${unrealDir}`);
      console.log(`Args:`, args);

      const child = spawn(unrealExe, args, {
        cwd: unrealDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });

      child.unref();

      console.log(`[Main Process] Unreal Engine lanzado exitosamente con PID: ${child.pid}`);
      resolve({ success: true, pid: child.pid });
    } catch (err) {
      console.error("[Main Process] Error al lanzar Unreal Engine:", err);
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

// Handler para ejecutar Unity de forma segura
ipcMain.handle('run-unity', async (event, data) => {
  return await launchUnity(data);
});

// Handler para ejecutar Unreal Engine de forma segura
ipcMain.handle('run-unreal', async (event, data) => {
  return await launchUnreal(data);
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
              } else if (channel === 'run-unity') {
                launchUnity(args[0]).then(result => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, result }));
                });
              } else if (channel === 'run-unreal') {
                launchUnreal(args[0]).then(result => {
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


function createTray() {
  const { nativeImage } = require('electron');
  const icon = nativeImage.createFromDataURL('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="rgb(124,58,237)"/></svg>');
  
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Mostrar Nexus IDE', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    { 
      label: 'Minimizar', 
      click: () => {
        if (mainWindow) {
          mainWindow.minimize();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Salir', 
      click: () => {
        app.isQuiting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Nexus IDE');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.minimize();
      } else {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// =========================================================================
// INTEGRACIÓN BOT DE TELEGRAM DE CONTROL REMOTO (AIRI REMOTE)
// =========================================================================
const https = require('https');
let telegramBotInterval = null;
let lastUpdateId = 0;
let botConfig = { enabled: false, token: '', chatId: '', security: 'confirm' };

function sendTelegramMessage(text) {
    if (!botConfig.enabled || !botConfig.token || !botConfig.chatId) return;
    
    const payload = JSON.stringify({
        chat_id: botConfig.chatId,
        text: text,
        parse_mode: 'Markdown'
    });
    
    const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${botConfig.token}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // FIX: byteLength (UTF-8), no String.length (UTF-16): emojis/acentos rompían el envío.
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
            console.error(`[Telegram Bot] sendMessage HTTP ${res.statusCode}`);
        }
    });
    req.on('error', (err) => {
        console.error("[Telegram Bot] Error enviando mensaje:", err);
    });
    req.write(payload);
    req.end();
}

function processTelegramUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;
    
    const senderChatId = msg.chat.id.toString();
    
    // Validar ID de Chat Autorizado
    if (botConfig.chatId && senderChatId !== botConfig.chatId.toString()) {
        console.warn(`[Telegram Bot] Mensaje no autorizado de chat ID: ${senderChatId}`);
        return;
    }
    
    const text = msg.text.trim();
    console.log(`[Telegram Bot] Mensaje recibido: ${text}`);
    
    if (text === '/start' || text === '/help') {
        const helpText = `👋 *¡Hola! Soy AIRI, tu asistente de Nexus IDE.*\n\n` +
            `Aquí tienes los comandos disponibles para controlarme remotamente:\n` +
            `🔹 \`/chat <mensaje>\` - Habla conmigo y obtén respuestas de mi IA.\n` +
            `🔹 \`/cmd <comando>\` - Ejecuta un comando en la terminal de tu PC.\n` +
            `🔹 \`/approve\` - Autoriza la solicitud de permisos activa en el IDE.\n` +
            `🔹 \`/deny\` - Deniega la solicitud de permisos activa en el IDE.\n` +
            `🔹 \`/status\` - Muestra el estado del IDE y del PC.`;
        sendTelegramMessage(helpText);
    } 
    else if (text === '/status') {
        const mem = process.memoryUsage();
        const platform = process.platform;
        const uptime = process.uptime();
        const statusText = `🖥️ *Estado de Nexus IDE y PC*\n\n` +
            `▪️ *Plataforma:* ${platform}\n` +
            `▪️ *Uptime IDE:* ${Math.floor(uptime)}s\n` +
            `▪️ *Memoria IDE:* ${Math.floor(mem.heapUsed / 1024 / 1024)} MB\n` +
            `▪️ *Seguridad Terminal:* ${botConfig.security.toUpperCase()}`;
        sendTelegramMessage(statusText);
    }
    else if (text === '/approve') {
        if (!mainWindow) return;
        mainWindow.webContents.executeJavaScript(`
            (async () => {
                if (window.activePermissionPromise) {
                    const actions = window.activePermissionPromise.actions;
                    window.activePermissionPromise.resolve(actions);
                    return true;
                }
                return false;
            })()
        `).then((res) => {
            if (res) {
                sendTelegramMessage("✅ *AIRI*: Permisos autorizados exitosamente desde Telegram.");
            } else {
                sendTelegramMessage("❌ *AIRI*: No hay ninguna solicitud de permisos activa en este momento.");
            }
        });
    }
    else if (text === '/deny') {
        if (!mainWindow) return;
        mainWindow.webContents.executeJavaScript(`
            (async () => {
                if (window.activePermissionPromise) {
                    window.activePermissionPromise.resolve([]);
                    return true;
                }
                return false;
            })()
        `).then((res) => {
            if (res) {
                sendTelegramMessage("❌ *AIRI*: Permisos denegados desde Telegram.");
            } else {
                sendTelegramMessage("❌ *AIRI*: No hay ninguna solicitud de permisos activa en este momento.");
            }
        });
    }
    else if (text.startsWith('/cmd ')) {
        const cmd = text.substring(5).trim();
        if (!cmd) {
            sendTelegramMessage("❌ Especifica un comando. Ejemplo: \`/cmd dir\`");
            return;
        }
        
        if (botConfig.security === 'restricted') {
            sendTelegramMessage("🔒 *AIRI*: La ejecución remota de comandos está desactivada por el nivel de seguridad (Restringido).");
            return;
        }
        
        if (botConfig.security === 'confirm') {
            // Mostrar modal de confirmación en la UI
            if (mainWindow) {
                mainWindow.webContents.executeJavaScript(`
                    (async () => {
                        return await showActionPermissionsModal([{
                            type: 'run_command',
                            label: 'Comando Remoto (Telegram): ' + ${JSON.stringify(cmd)},
                            command: ${JSON.stringify(cmd)}
                        }]);
                    })()
                `).then((approved) => {
                    if (approved && approved.length > 0) {
                        sendTelegramMessage(`⏳ Comando autorizado. Ejecutando: \`${cmd}\`...`);
                        runLocalCommand(cmd);
                    } else {
                        sendTelegramMessage("❌ Comando denegado por el usuario.");
                    }
                });
            }
        } else {
            // Acceso Total - Ejecutar directo
            sendTelegramMessage(`⚡ Ejecutando directamente: \`${cmd}\`...`);
            runLocalCommand(cmd);
        }
    }
    else {
        // Tratar como un chat normal con la IA (o comando /chat)
        let chatText = text;
        if (text.startsWith('/chat ')) {
            chatText = text.substring(6).trim();
        }
        
        if (!chatText) {
            sendTelegramMessage("❌ Escribe un mensaje para chatear con la IA.");
            return;
        }
        
        sendTelegramMessage("💬 *AIRI*: Procesando respuesta...");
        
        // Ejecutar en el contexto de la ventana para aprovechar sendRequestToAI y las API Keys guardadas
        if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
                (async () => {
                    const selectedModel = localStorage.getItem('nexus_agent_planner_model') || 'google/gemini-2.5-flash';
                    const systemPrompt = "Eres AIRI, una asistente de IA amigable para el control remoto de PC. Responde de manera concisa y clara en español.";
                    
                    // Agregar el mensaje al chat en pantalla
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) {
                        const userMsg = document.createElement('div');
                        userMsg.style.cssText = 'padding:10px; border-radius:6px; background:#2b3a42; border:1px solid #3c4f5a; align-self:flex-end; margin-left:20px; margin-bottom:10px; color:#fff; font-size:12px;';
                        userMsg.innerHTML = '📱 <i>[Remoto]</i> ' + escapeHtml(${JSON.stringify(chatText)});
                        chatMessages.appendChild(userMsg);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                    
                    const reply = await sendRequestToAI(selectedModel, ${JSON.stringify(chatText)}, systemPrompt, []);
                    
                    // Mostrar respuesta localmente también
                    if (chatMessages) {
                        const botMsg = document.createElement('div');
                        botMsg.style.cssText = 'padding:10px; border-radius:6px; background:#1e1e1e; border:1px solid #333; margin-right:20px; margin-bottom:10px; color:#c9d1d9; font-size:12px;';
                        botMsg.innerHTML = '🤖 <i>[Remoto]</i> ' + formatMarkdown(reply);
                        chatMessages.appendChild(botMsg);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                    
                    // Hablar si la voz está activa
                    if (typeof speakAiri === 'function') speakAiri(reply);
                    
                    return reply;
                })()
            `).then((reply) => {
                sendTelegramMessage(`🤖 *AIRI*:\n\n${reply}`);
            }).catch((err) => {
                sendTelegramMessage(`❌ *Error al chatear con la IA*:\n${err.message}`);
            });
        }
    }
}

function runLocalCommand(command) {
    const { exec } = require('child_process');
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        let response = '';
        if (stdout) response += `*Salida*:\n\`\`\`\n${stdout.substring(0, 3000)}\n\`\`\`\n`;
        if (stderr) response += `*Errores*:\n\`\`\`\n${stderr.substring(0, 1000)}\n\`\`\`\n`;
        if (error) response += `❌ *Código de salida fallido:* ${error.message}\n`;
        if (!response) response = "✅ Comando ejecutado sin salida en consola.";
        sendTelegramMessage(response);
    });
}

function startTelegramBotLoop() {
    if (telegramBotInterval) {
        clearInterval(telegramBotInterval);
        telegramBotInterval = null;
    }
    
    if (!botConfig.enabled || !botConfig.token) {
        console.log("[Telegram Bot] Bot desactivado o sin token.");
        return;
    }
    
    console.log("[Telegram Bot] Iniciando bucle de consulta...");
    
    telegramBotInterval = setInterval(() => {
        const url = `https://api.telegram.org/bot${botConfig.token}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.ok && json.result && json.result.length > 0) {
                        for (const update of json.result) {
                            lastUpdateId = update.update_id;
                            processTelegramUpdate(update);
                        }
                    }
                } catch (e) {
                    // Ignorar errores menores
                }
            });
        }).on('error', (err) => {
            // Silenciar
        });
    }, 5000);
}

// Configurar receptores de IPC en main.js
ipcMain.on('update-remote-bot', (event, config) => {
    botConfig = config;
    console.log("[Telegram Bot] Configuración de bot remoto actualizada:", {
        enabled: botConfig.enabled,
        chatId: botConfig.chatId,
        security: botConfig.security,
        token: botConfig.token ? "****" : "vacío"
    });
    startTelegramBotLoop();
});

ipcMain.on('send-telegram-notification', (event, text) => {
    sendTelegramMessage(text);
});

ipcMain.on('focus-window', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
    }
});

ipcMain.handle('download-comfy-model', async (event, { modelType, comfyPath, useMirror }) => {
    const fs = require('fs');
    const path = require('path');
    
    const urls = {
        'ltx-video': [
            {
                url: 'https://huggingface.co/city96/LTX-Video-gguf/resolve/main/ltx-video-2b-v0.9-Q8_0.gguf',
                subDir: 'models/unet',
                filename: 'ltx-video-2b-v0.9-Q8_0.gguf'
            },
            {
                url: 'https://huggingface.co/Comfy-Org/PixelDiT/resolve/main/text_encoders/gemma_2_2b_it_elm_fp8_scaled.safetensors',
                subDir: 'models/clip',
                filename: 'gemma_2_2b_it_elm_fp8_scaled.safetensors'
            },
            {
                url: 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/text_encoders/clip_l.safetensors',
                subDir: 'models/clip',
                filename: 'clip_l.safetensors'
            },
            {
                url: 'https://huggingface.co/city96/LTX-Video-gguf/resolve/main/LTX-Video-VAE-BF16.safetensors',
                subDir: 'models/vae',
                filename: 'LTX-Video-VAE-BF16.safetensors'
            }
        ],
        'ltx-video-heavy': [
            {
                url: 'https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-video-2b-v0.9.safetensors',
                subDir: 'models/checkpoints',
                filename: 'ltx-video-2b-v0.9.safetensors'
            }
        ],
        'hunyuan-video': [
            {
                url: 'https://huggingface.co/city96/HunyuanVideo-gguf/resolve/main/hunyuan-video-t2v-720p-Q8_0.gguf',
                subDir: 'models/unet',
                filename: 'hunyuan-video-t2v-720p-Q8_0.gguf'
            },
            {
                url: 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/text_encoders/clip_l.safetensors',
                subDir: 'models/clip',
                filename: 'clip_l.safetensors'
            },
            {
                url: 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/text_encoders/llava_llama3_fp8_scaled.safetensors',
                subDir: 'models/clip',
                filename: 'llava_llama3_fp8_scaled.safetensors'
            },
            {
                url: 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/vae/hunyuan_video_vae_bf16.safetensors',
                subDir: 'models/vae',
                filename: 'hunyuan_video_vae_bf16.safetensors'
            }
        ],
        'hunyuan-video-heavy': [
            {
                url: 'https://huggingface.co/Kijai/HunyuanVideo_comfy/resolve/main/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors',
                subDir: 'models/checkpoints',
                filename: 'hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors'
            },
            {
                url: 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/vae/hunyuan_video_vae_bf16.safetensors',
                subDir: 'models/vae',
                filename: 'hunyuan_video_vae_bf16.safetensors'
            }
        ],
        'svd-img2vid': [
            {
                url: 'https://huggingface.co/convertor/svd-fp8/resolve/main/svd_fp8_e4m3fn.safetensors',
                subDir: 'models/checkpoints',
                filename: 'svd_xt_fp8.safetensors'
            }
        ],
        'svd-img2vid-heavy': [
            {
                url: 'https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt/resolve/main/svd_xt.safetensors',
                subDir: 'models/checkpoints',
                filename: 'svd_xt.safetensors'
            }
        ]
    };
    
    let targets = urls[modelType];
    if (!targets) throw new Error("Modelo de video desconocido");
    if (useMirror) {
        targets = targets.map(t => ({
            ...t,
            url: t.url.replace('huggingface.co', 'hf-mirror.com')
        }));
    }
    if (!comfyPath) throw new Error("La ruta de instalación de ComfyUI no está configurada");
    
    let resolvedComfyPath = comfyPath;
    if (comfyPath.toLowerCase().endsWith('.lnk')) {
        try {
            const { shell } = require('electron');
            const shortcut = shell.readShortcutLink(comfyPath);
            if (shortcut && shortcut.target) {
                resolvedComfyPath = shortcut.target;
            }
        } catch (e) {
            throw new Error("No se pudo resolver el acceso directo de ComfyUI: " + e.message);
        }
    }
    
    try {
        if (fs.existsSync(resolvedComfyPath)) {
            const stat = fs.statSync(resolvedComfyPath);
            if (stat.isFile()) {
                resolvedComfyPath = path.dirname(resolvedComfyPath);
            }
        }
    } catch(e) {}
    
    const getComfyModelsDir = (resolvedPath) => {
        try {
            const parent1 = path.dirname(resolvedPath);
            const parent2 = path.dirname(parent1);
            const parent3 = path.dirname(parent2);
            const sharedDir = path.join(parent3, 'ComfyUI-Shared', 'models');
            if (fs.existsSync(sharedDir)) {
                return sharedDir;
            }
        } catch (e) {}
        return path.join(resolvedPath, 'models');
    };

    const modelsDir = getComfyModelsDir(resolvedComfyPath);

    const downloadFile = (target, index, total) => {
        const relativeSubDir = target.subDir.replace(/^models\/?/, '');
        const destDir = path.join(modelsDir, relativeSubDir);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        const destFile = path.join(destDir, target.filename);
        const standardFile = path.join(resolvedComfyPath, target.subDir, target.filename);
        
        if (fs.existsSync(destFile)) {
            return Promise.resolve(destFile);
        }
        if (fs.existsSync(standardFile)) {
            return Promise.resolve(standardFile);
        }
        
        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(destFile, { highWaterMark: 1024 * 1024 });
            const http = require('http');
            const https = require('https');
            
            const download = (urlStr) => {
                const parsedUrl = new URL(urlStr);
                const client = parsedUrl.protocol === 'https:' ? https : http;
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                };
                client.get(options, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        try {
                            const nextUrl = new URL(res.headers.location, urlStr).toString();
                            download(nextUrl);
                        } catch (err) {
                            fileStream.close();
                            if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                            reject(new Error("URL de redirección inválido: " + res.headers.location));
                        }
                        return;
                    }
                    
                    if (res.statusCode !== 200) {
                        fileStream.close();
                        if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                        reject(new Error(`El servidor devolvió el código de estado: ${res.statusCode}`));
                        return;
                    }
                    
                    const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
                    let downloadedBytes = 0;
                    let lastProgress = 0;
                    
                    res.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        fileStream.write(chunk);
                        
                        if (totalBytes > 0) {
                            const fileProgress = Math.round((downloadedBytes / totalBytes) * 100);
                            const overallProgress = Math.round(((index / total) * 100) + (fileProgress / total));
                            if (overallProgress > lastProgress) {
                                lastProgress = overallProgress;
                                event.sender.send('download-progress', { modelType, progress: overallProgress });
                            }
                        }
                    });
                    
                    res.on('end', () => {
                        fileStream.end();
                        resolve(destFile);
                    });
                    
                    res.on('error', (err) => {
                        fileStream.close();
                        if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                        reject(err);
                    });
                }).on('error', (err) => {
                    fileStream.close();
                    if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                    reject(err);
                });
            };
            
            download(target.url);
        });
    };

    let lastPath = '';
    for (let i = 0; i < targets.length; i++) {
        event.sender.send('download-progress', { modelType, progress: Math.round((i / targets.length) * 100) });
        lastPath = await downloadFile(targets[i], i, targets.length);
    }
    event.sender.send('download-progress', { modelType, progress: 100 });
    return { status: 'completed', path: lastPath };
});

ipcMain.handle('check-comfy-model-status', async (event, { modelType, comfyPath }) => {
    const fs = require('fs');
    const path = require('path');
    
    const urls = {
        'ltx-video': [
            { subDir: 'models/unet', filename: 'ltx-video-2b-v0.9-Q8_0.gguf' },
            { subDir: 'models/clip', filename: 'gemma_2_2b_it_elm_fp8_scaled.safetensors' },
            { subDir: 'models/clip', filename: 'clip_l.safetensors' },
            { subDir: 'models/vae', filename: 'LTX-Video-VAE-BF16.safetensors' }
        ],
        'ltx-video-heavy': [
            { subDir: 'models/checkpoints', filename: 'ltx-video-2b-v0.9.safetensors' }
        ],
        'hunyuan-video': [
            { subDir: 'models/unet', filename: 'hunyuan-video-t2v-720p-Q8_0.gguf' },
            { subDir: 'models/clip', filename: 'clip_l.safetensors' },
            { subDir: 'models/clip', filename: 'llava_llama3_fp8_scaled.safetensors' },
            { subDir: 'models/vae', filename: 'hunyuan_video_vae_bf16.safetensors' }
        ],
        'hunyuan-video-heavy': [
            { subDir: 'models/checkpoints', filename: 'hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors' },
            { subDir: 'models/vae', filename: 'hunyuan_video_vae_bf16.safetensors' }
        ],
        'svd-img2vid': [
            { subDir: 'models/checkpoints', filename: 'svd_xt_fp8.safetensors' }
        ],
        'svd-img2vid-heavy': [
            { subDir: 'models/checkpoints', filename: 'svd_xt.safetensors' }
        ]
    };
    const targets = urls[modelType];
    if (!targets || !comfyPath) return { status: 'missing' };
    
    let resolvedComfyPath = comfyPath;
    if (comfyPath.toLowerCase().endsWith('.lnk')) {
        try {
            const { shell } = require('electron');
            const shortcut = shell.readShortcutLink(comfyPath);
            if (shortcut && shortcut.target) {
                resolvedComfyPath = shortcut.target;
            }
        } catch (e) {}
    }
    
    try {
        if (fs.existsSync(resolvedComfyPath)) {
            const stat = fs.statSync(resolvedComfyPath);
            if (stat.isFile()) {
                resolvedComfyPath = path.dirname(resolvedComfyPath);
            }
        }
    } catch(e) {}
    
    const getComfyModelsDir = (resolvedPath) => {
        try {
            const parent1 = path.dirname(resolvedPath);
            const parent2 = path.dirname(parent1);
            const parent3 = path.dirname(parent2);
            const sharedDir = path.join(parent3, 'ComfyUI-Shared', 'models');
            if (fs.existsSync(sharedDir)) {
                return sharedDir;
            }
        } catch (e) {}
        return path.join(resolvedPath, 'models');
    };

    const modelsDir = getComfyModelsDir(resolvedComfyPath);
    
    let allExist = true;
    let lastPath = '';
    for (const target of targets) {
        const relativeSubDir = target.subDir.replace(/^models\/?/, '');
        const destFile = path.join(modelsDir, relativeSubDir, target.filename);
        const standardFile = path.join(resolvedComfyPath, target.subDir, target.filename);
        
        if (!fs.existsSync(destFile) && !fs.existsSync(standardFile)) {
            allExist = false;
            break;
        }
        lastPath = fs.existsSync(destFile) ? destFile : standardFile;
    }
    
    if (allExist) {
        return { status: 'exists', path: lastPath };
    }
    return { status: 'missing' };
});

ipcMain.handle('launch-comfy-desktop', async () => {
    const { spawn } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    const os = require('os');
    const homeDir = os.homedir();
    let exePath = path.join(homeDir, 'AppData', 'Local', 'Programs', 'Comfy Desktop', 'Comfy Desktop.exe');
    
    if (!fs.existsSync(exePath)) {
        const desktopShortcut = path.join(homeDir, 'Desktop', 'Comfy Desktop.lnk');
        if (fs.existsSync(desktopShortcut)) {
            try {
                const { shell } = require('electron');
                const shortcut = shell.readShortcutLink(desktopShortcut);
                if (shortcut && shortcut.target) {
                    exePath = shortcut.target;
                }
            } catch(e) {}
        }
    }
    
    if (fs.existsSync(exePath)) {
        const child = spawn(exePath, [], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        return { status: 'launched' };
    } else {
        throw new Error("No se encontró el ejecutable de Comfy Desktop.");
    }
});

let hardwareTelemetryInterval = null;
let prevCpuTime = getCpuTime();

function getCpuTime() {
    let totalIdle = 0, totalTick = 0;
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) return { idle: 0, total: 0 };
    for (let i = 0, len = cpus.length; i < len; i++) {
        const cpu = cpus[i];
        for (const type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    }
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

function calculateCpuUsage() {
    const currentCpuTime = getCpuTime();
    const idleDifference = currentCpuTime.idle - prevCpuTime.idle;
    const totalDifference = currentCpuTime.total - prevCpuTime.total;
    prevCpuTime = currentCpuTime;
    
    if (totalDifference === 0) return 0;
    return Math.min(100, Math.max(0, Math.round(100 - (100 * idleDifference / totalDifference))));
}

let hasNvidiaSmi = true;

function startHardwareTelemetry() {
    if (hardwareTelemetryInterval) clearInterval(hardwareTelemetryInterval);
    
    const { spawn } = require('child_process');
    
    hardwareTelemetryInterval = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        
        const cpu = calculateCpuUsage();
        
        // RAM usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const ram = Math.round((1 - freeMem / totalMem) * 100);
        
        const sendFallbackTelemetry = () => {
            const gpu = Math.min(100, Math.max(0, Math.round(cpu * 0.4 + Math.random() * 5)));
            const baseVram = 1.5 + (ram / 100) * 2.0;
            const vram = parseFloat((baseVram + Math.random() * 0.3).toFixed(1));
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('hardware-telemetry', { cpu, ram, gpu, vram });
            }
        };

        if (!hasNvidiaSmi) {
            sendFallbackTelemetry();
            return;
        }

        try {
            const child = spawn('nvidia-smi', ['--query-gpu=utilization.gpu,memory.used', '--format=csv,noheader,nounits']);
            
            let stdoutData = '';
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    stdoutData += data.toString();
                });
            }
            
            child.on('error', (err) => {
                hasNvidiaSmi = false;
                sendFallbackTelemetry();
            });
            
            child.on('close', (code) => {
                if (code === 0 && stdoutData) {
                    const parts = stdoutData.trim().split(',');
                    if (parts.length >= 2) {
                        const gpu = parseInt(parts[0].trim(), 10) || 0;
                        const vramMb = parseInt(parts[1].trim(), 10) || 0;
                        const vram = parseFloat((vramMb / 1024).toFixed(1));
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('hardware-telemetry', { cpu, ram, gpu, vram });
                        }
                    } else {
                        sendFallbackTelemetry();
                    }
                } else {
                    sendFallbackTelemetry();
                }
            });
        } catch (e) {
            hasNvidiaSmi = false;
            sendFallbackTelemetry();
        }
    }, 2000);
}

let companionWindow = null;

function createCompanionWindow() {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.show();
    companionWindow.focus();
    return;
  }

  // El overlay cubre todo el display primario para que el avatar pueda "flotar"
  // por cualquier punto de la pantalla, incluso fuera de la ventana de Nexus IDE.
  const primary = screen.getPrimaryDisplay();
  const b = primary.bounds;

  companionWindow = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false,
      backgroundThrottling: false // mantener la animación fluida aunque no tenga foco
    }
  });

  // Flotar por encima de cualquier otra aplicación de escritorio.
  companionWindow.setAlwaysOnTop(true, 'screen-saver');
  try {
    companionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (e) { /* algunas plataformas no lo soportan */ }

  // Por defecto la ventana deja pasar los clics al escritorio (click-through).
  // El renderer la vuelve interactiva sólo cuando el ratón está sobre el avatar.
  companionWindow.setIgnoreMouseEvents(true, { forward: true });

  companionWindow.loadURL(`file://${__dirname}/index.html?mode=companion`);

  companionWindow.on('closed', () => {
    companionWindow = null;
  });
}

ipcMain.on('open-assistant-companion', () => {
  createCompanionWindow();
});

ipcMain.on('close-assistant-companion', () => {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.close();
  }
});

// Alterna el modo click-through del overlay del companion. El renderer lo pide
// según si el cursor está sobre el avatar (interactivo) o fuera (pasa los clics).
ipcMain.on('companion-set-ignore-mouse', (event, ignore) => {
  if (companionWindow && !companionWindow.isDestroyed()) {
    if (ignore) {
      companionWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      companionWindow.setIgnoreMouseEvents(false);
    }
  }
});

// Refresco en caliente del avatar: al guardar la config en una ventana, avisa a las
// demás (p. ej. el widget flotante) para que re-rendericen el avatar sin relanzarse.
ipcMain.on('assistant-config-updated', (event) => {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed() && w.webContents !== event.sender) {
      w.webContents.send('assistant-config-updated');
    }
  });
});

ipcMain.on('open-main-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

app.on('window-all-closed', function () {
  if (telegramBotInterval) clearInterval(telegramBotInterval);
  if (hardwareTelemetryInterval) clearInterval(hardwareTelemetryInterval);
  if (process.platform !== 'darwin') app.quit();
});