import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('plotAPI', {
  ping: () => 'pong',
  takeScreenshot: () => ipcRenderer.invoke('os:take-screenshot'),
  getRunningApps: (limit?: number) => ipcRenderer.invoke('os:get-apps', limit),
  checkNetwork: () => ipcRenderer.invoke('os:check-network'),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  onHotkeyTriggered: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('hotkey:voice', subscription);
    return () => ipcRenderer.removeListener('hotkey:voice', subscription);
  },
});
