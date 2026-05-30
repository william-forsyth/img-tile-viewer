'use strict';

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULT_STATE = { width: 1280, height: 800, x: undefined, y: undefined };

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
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

  ipcMain.on('window:minimize', () => win.minimize());
  ipcMain.on('window:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
  ipcMain.on('window:close', () => win.close());
  ipcMain.on('window:fullscreen', () => win.setFullScreen(!win.isFullScreen()));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());
