'use strict';

const { app, BrowserWindow, ipcMain, Menu, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULT_STATE = { width: 1280, height: 800, x: undefined, y: undefined };

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function sidebarStateFile() {
  return path.join(app.getPath('userData'), 'folder-sidebar.json');
}

function loadWindowState() {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(stateFile(), 'utf8')) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveWindowState(win) {
  if (win.isMaximized() || win.isFullScreen()) return;
  const { width, height, x, y } = win.getBounds();
  fs.writeFileSync(stateFile(), JSON.stringify({ width, height, x, y }));
}

function createWindow() {
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    frame: false,
    backgroundColor: '#0e0e0e',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    minWidth: 400,
    minHeight: 300,
  });

  Menu.setApplicationMenu(null);
  win.loadFile('index.html');

  const sendMaximized = () => win.webContents.send('window:maximized', win.isMaximized());
  const sendFullscreen = () => win.webContents.send('window:fullscreened', win.isFullScreen());

  win.on('maximize', sendMaximized);
  win.on('unmaximize', sendMaximized);
  win.on('enter-full-screen', sendFullscreen);
  win.on('leave-full-screen', sendFullscreen);
  win.on('resize', () => saveWindowState(win));
  win.on('move', () => saveWindowState(win));

  return win;
}

// Resolve the window a renderer IPC message came from (each window is independent).
function senderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

// IPC handlers are registered once at module scope — registering them per-window
// would throw on duplicate `ipcMain.handle` and double-fire the `ipcMain.on` calls.
function registerIpc() {
  ipcMain.on('window:minimize', (e) => senderWindow(e)?.minimize());
  ipcMain.on('window:maximize', (e) => {
    const win = senderWindow(e);
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window:close', (e) => senderWindow(e)?.close());
  ipcMain.on('window:fullscreen', (e) => {
    const win = senderWindow(e);
    if (win) win.setFullScreen(!win.isFullScreen());
  });
  ipcMain.on('window:new', () => createWindow());

  const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.avif']);

  ipcMain.handle('folder:pick-root', async (e) => {
    const result = await dialog.showOpenDialog(senderWindow(e), {
      properties: ['openDirectory'],
      title: 'Select a folder root',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const folderPath = result.filePaths[0];
    return { path: folderPath, name: path.basename(folderPath) };
  });

  ipcMain.handle('folder:list-dir', (_event, dirPath) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries
        .filter(e => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
        .map(e => path.join(dirPath, e.name));
      const dirs = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => {
          const full = path.join(dirPath, e.name);
          let mtime = 0;
          try { mtime = fs.statSync(full).mtimeMs; } catch { /* keep 0 */ }
          return { name: e.name, path: full, mtime };
        });
      return { files, dirs };
    } catch {
      return null;
    }
  });

  ipcMain.handle('folder:load-state', () => {
    try {
      return JSON.parse(fs.readFileSync(sidebarStateFile(), 'utf8'));
    } catch {
      return null;
    }
  });

  ipcMain.handle('folder:save-state', (_event, state) => {
    try {
      fs.writeFileSync(sidebarStateFile(), JSON.stringify(state));
    } catch { /* best-effort */ }
  });
}

app.whenReady().then(() => {
  const IMAGE_MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml', '.avif': 'image/avif',
  };

  protocol.handle('local-file', (request) => {
    try {
      const filePath = decodeURIComponent(request.url.slice('local-file://'.length));
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return new Response(data, {
        headers: { 'Content-Type': IMAGE_MIME[ext] ?? 'application/octet-stream' },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
