import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('plotAPI', {
  takeScreenshot: () => ipcRenderer.invoke('os:take-screenshot'),
  getRunningApps: (limit?: number) => ipcRenderer.invoke('os:get-apps', limit),
  checkNetwork: () => ipcRenderer.invoke('os:check-network'),
  killProcess: (target: number | string) => ipcRenderer.invoke('os:kill-process', target),
  launchApp: (appQuery: string) => ipcRenderer.invoke('os:launch-app', appQuery),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  getSTTToken: () => ipcRenderer.invoke('auth:get-stt-token'),
  enhanceNotes: (rawNotes: string, transcript: string) => ipcRenderer.invoke('notes:enhance', rawNotes, transcript),
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
