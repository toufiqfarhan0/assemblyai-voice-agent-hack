/// <reference types="vite/client" />

export interface RunningProcess {
  name: string;
  pid: number;
  memoryMB: number;
}

export interface NetworkStatus {
  ssid: string;
  signal: number;
  ip: string;
  gatewayPingMs: number;
  state: string;
}

export interface ScreenshotResult {
  success: boolean;
  base64: string;
  timestamp: string;
  error?: string;
}

export interface PlotAPI {
  takeScreenshot: () => Promise<ScreenshotResult>;
  getRunningApps: (limit?: number) => Promise<RunningProcess[]>;
  checkNetwork: () => Promise<NetworkStatus>;
  getToken: () => Promise<{ token: string; expiresInSeconds: number }>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  onHotkeyTriggered: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    plotAPI: PlotAPI;
  }
}
