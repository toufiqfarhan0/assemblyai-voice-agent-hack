import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { capturePrimaryScreen } from './services/screen';
import { getTopProcesses, killProcess } from './services/process';
import { checkNetworkStatus } from './services/network';
import { mintVoiceAgentToken } from './services/auth';
import { mintStreamingSTTToken } from './services/sttAuth';
import { launchDesktopApp } from './services/actions';
import { enhanceMeetingNotes } from './services/enhancer';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1060,
    height: 740,
    minWidth: 840,
    minHeight: 620,
    transparent: true,
    frame: false,
    hasShadow: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register global hotkey for push-to-talk
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('hotkey:voice');
    }
  });
}

// IPC Handlers for OS Automation Tools
ipcMain.handle('os:take-screenshot', async () => {
  return await capturePrimaryScreen();
});

ipcMain.handle('os:get-apps', async (_event, limit: number = 6) => {
  return await getTopProcesses(limit);
});

ipcMain.handle('os:check-network', async () => {
  return await checkNetworkStatus();
});

ipcMain.handle('os:kill-process', async (_event, pidOrName: number | string) => {
  return await killProcess(pidOrName);
});

ipcMain.handle('os:launch-app', async (_event, appQuery: string) => {
  return await launchDesktopApp(appQuery);
});

ipcMain.handle('auth:get-token', async () => {
  return await mintVoiceAgentToken();
});

ipcMain.handle('auth:get-stt-token', async () => {
  return await mintStreamingSTTToken();
});

ipcMain.handle('notes:enhance', async (_event, rawNotes: string, transcript: string) => {
  return await enhanceMeetingNotes(rawNotes, transcript);
});

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
