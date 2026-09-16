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

export interface EnrichedMeetingNotes {
  summary: string;
  decisions: string[];
  actionItems: { id: string; text: string; assignee: string; done: boolean }[];
  enhancedSections: { originalNote: string; enrichedContext: string }[];
  rawMarkdown: string;
}

export interface PlotAPI {
  takeScreenshot: () => Promise<ScreenshotResult>;
  getRunningApps: (limit?: number) => Promise<RunningProcess[]>;
  killProcess: (target: number | string) => Promise<{ success: boolean; message: string }>;
  launchApp: (appQuery: string) => Promise<{ success: boolean; message: string }>;
  checkNetwork: () => Promise<NetworkStatus>;
  getToken: () => Promise<{ token: string; expiresInSeconds: number }>;
  getSTTToken: () => Promise<{ token: string }>;
  enhanceNotes: (rawNotes: string, transcript: string) => Promise<EnrichedMeetingNotes>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  onHotkeyTriggered: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    plotAPI: PlotAPI;
  }
}
