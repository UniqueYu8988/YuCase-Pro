const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getRules: () => ipcRenderer.invoke('get-rules'),
  saveRules: (rules) => ipcRenderer.invoke('save-rules', rules),
  windowMin: () => ipcRenderer.send('window-min'),
  windowMax: () => ipcRenderer.send('window-max'),
  windowClose: () => ipcRenderer.send('window-close'),
  invokePython: (action) => ipcRenderer.invoke('invoke-python', action),
  onFillingStateUpdate: (callback) => ipcRenderer.on('filling-state-update', (_event, value) => {
    console.log(`[Preload Debug] 🚀 收到原子信号: ${value}`);
    callback(value);
  }),
  onGlobalF8Trigger: (callback) => ipcRenderer.on('global-f8-trigger', () => callback()),
});
