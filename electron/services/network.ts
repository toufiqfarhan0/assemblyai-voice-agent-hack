import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface NetworkStatus {
  ssid: string;
  signal: number;
  ip: string;
  gatewayPingMs: number;
  state: string;
}

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

let cachedNetwork: NetworkStatus | null = null;
let lastNetFetch = 0;
const NET_CACHE_TTL = 4000;

export async function checkNetworkStatus(): Promise<NetworkStatus> {
  const now = Date.now();
  if (cachedNetwork && now - lastNetFetch < NET_CACHE_TTL) {
    return cachedNetwork;
  }

  const ip = getLocalIpAddress();
  let ssid = 'Wi-Fi / Ethernet';
  let signal = 100;
  let state = 'Connected';
  let gatewayPingMs = 18;

  try {
    if (process.platform === 'win32') {
      try {
        const { stdout: wlanOut } = await execAsync('netsh wlan show interfaces', { timeout: 1000 });
        const ssidMatch = wlanOut.match(/^\s*SSID\s*:\s*(.+)$/m);
        const signalMatch = wlanOut.match(/^\s*Signal\s*:\s*(\d+)%/m);
        const stateMatch = wlanOut.match(/^\s*State\s*:\s*(.+)$/m);

        if (ssidMatch && ssidMatch[1]) ssid = ssidMatch[1].trim();
        if (signalMatch && signalMatch[1]) signal = parseInt(signalMatch[1], 10);
        if (stateMatch && stateMatch[1]) state = stateMatch[1].trim();
      } catch {
        // May be on wired ethernet or virtual adapter
        state = 'Connected (Ethernet)';
      }

      // Quick non-blocking ping test with 300ms timeout
      try {
        const { stdout: pingOut } = await execAsync('ping -n 1 -w 300 8.8.8.8', { timeout: 600 });
        const timeMatch = pingOut.match(/time[=<](\d+)ms/i);
        if (timeMatch && timeMatch[1]) {
          gatewayPingMs = parseInt(timeMatch[1], 10);
        }
      } catch {
        gatewayPingMs = 999;
        state = 'High Latency / Packet Drop';
      }
    }
  } catch (err) {
    console.error('Failed to query network status:', err);
  }

  cachedNetwork = {
    ssid,
    signal,
    ip,
    gatewayPingMs,
    state,
  };
  lastNetFetch = now;
  return cachedNetwork;
}
