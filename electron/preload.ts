import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('plotAPI', {
  takeScreenshot: () => ipcRenderer.invoke('os:take-screenshot'),
  getRunningApps: (limit?: number) => ipcRenderer.invoke('os:get-apps', limit),
  checkNetwork: () => ipcRenderer.invoke('os:check-network'),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  onHotkeyTriggered: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey:voice', handler);
    return () => {
      ipcRenderer.removeListener('hotkey:voice', handler);
    };
  },
});
