/**
 * preload.js — Electron preload script
 *
 * Exposes a minimal, safe API from the main process to the renderer via
 * the context bridge.  All sensitive Node/Electron APIs remain locked
 * behind contextIsolation.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  // Example IPC helpers – extend as needed
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) =>
    ipcRenderer.on(channel, (_event, ...args) => callback(...args)),
});
