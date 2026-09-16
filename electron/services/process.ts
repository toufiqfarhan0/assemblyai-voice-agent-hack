import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RunningProcess {
  name: string;
  pid: number;
  memoryMB: number;
}

// In-memory cache to prevent continuous process querying
let cachedProcesses: RunningProcess[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 3000;

export async function getTopProcesses(limit: number = 6): Promise<RunningProcess[]> {
  const now = Date.now();
  if (cachedProcesses.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedProcesses.slice(0, limit);
  }

  try {
    if (process.platform === 'win32') {
      // Use lightweight native tasklist (50ms) instead of heavy PowerShell (.NET CLR 1500ms)
      const { stdout } = await execAsync('tasklist /FO CSV /NH', { maxBuffer: 10 * 1024 * 1024 });
      const lines = stdout.split(/\r?\n/);
      const processMap = new Map<string, { pid: number; memoryMB: number }>();

      for (const line of lines) {
        if (!line.trim()) continue;
        // Format: "ImageName","PID","Session Name","Session#","Mem Usage"
        const parts = line.split('","');
        if (parts.length >= 5) {
          const rawName = parts[0].replace(/^"/, '').trim();
          const pid = parseInt(parts[1], 10) || 0;
          const memKb = parseInt(parts[4].replace(/[^\d]/g, ''), 10) || 0;
          const memoryMB = Math.round((memKb / 1024) * 10) / 10;

          // Skip system idle and tiny helper tasks
          if (rawName.toLowerCase() === 'system idle process') continue;

          // Aggregate memory by application name
          const existing = processMap.get(rawName);
          if (existing) {
            existing.memoryMB = Math.round((existing.memoryMB + memoryMB) * 10) / 10;
          } else {
            processMap.set(rawName, { pid, memoryMB });
          }
        }
      }

      const list: RunningProcess[] = [];
      processMap.forEach((val, name) => {
        list.push({ name, pid: val.pid, memoryMB: val.memoryMB });
      });

      list.sort((a, b) => b.memoryMB - a.memoryMB);
      cachedProcesses = list;
      lastFetchTime = now;
      return cachedProcesses.slice(0, limit);
    } else {
      // Fallback for macOS / Linux
      const { stdout } = await execAsync(`ps -eo comm,pid,rss --sort=-rss | head -n ${limit + 1}`);
      const lines = stdout.trim().split('\n').slice(1);
      const list = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0] || 'Unknown';
        const pid = parseInt(parts[1] || '0', 10);
        const memoryMB = Math.round((parseInt(parts[2] || '0', 10) / 1024) * 10) / 10;
        return { name, pid, memoryMB };
      });
      cachedProcesses = list;
      lastFetchTime = now;
      return cachedProcesses.slice(0, limit);
    }
  } catch (error) {
    console.error('Failed to query system processes:', error);
    return cachedProcesses.slice(0, limit);
  }
}
