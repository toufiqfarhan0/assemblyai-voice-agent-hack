import { contextBridge, ipcRenderer, webFrame } from 'electron';

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
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  zoomIn: () => {
    const next = Math.min(webFrame.getZoomFactor() + 0.1, 2.5);
    webFrame.setZoomFactor(next);
    return Math.round(next * 100);
  },
  zoomOut: () => {
    const next = Math.max(webFrame.getZoomFactor() - 0.1, 0.5);
    webFrame.setZoomFactor(next);
    return Math.round(next * 100);
  },
  resetZoom: () => {
    webFrame.setZoomFactor(1.0);
    return 100;
  },
  getZoomFactor: () => Math.round(webFrame.getZoomFactor() * 100),
  onHotkeyTriggered: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey:voice', handler);
    return () => {
      ipcRenderer.removeListener('hotkey:voice', handler);
    };
  },
});
