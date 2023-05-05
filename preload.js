const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  on_print_full: (callback) => ipcRenderer.on('print_full', callback),
  on_print_tags: (callback) => ipcRenderer.on('print_tags', callback),
  run: () => ipcRenderer.invoke('run'),
  clientExit: ( clients ) => ipcRenderer.invoke('clientExit', clients),
  clientDisconnect: ( connections ) => ipcRenderer.invoke('clientDisconnect', connections),
  restart: ( args ) => ipcRenderer.invoke('restart', args),
})