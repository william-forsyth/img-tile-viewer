'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:         () => ipcRenderer.send('window:minimize'),
  maximize:         () => ipcRenderer.send('window:maximize'),
  close:            () => ipcRenderer.send('window:close'),
  toggleFullscreen: () => ipcRenderer.send('window:fullscreen'),
  onMaximizeChange: (cb) => ipcRenderer.on('window:maximized', (_, val) => cb(val)),
  onFullscreenChange: (cb) => ipcRenderer.on('window:fullscreened', (_, val) => cb(val)),
});
