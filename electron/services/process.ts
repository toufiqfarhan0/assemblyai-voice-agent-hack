import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RunningProcess {
  name: string;
  pid: number;
  memoryMB: number;
}

export async function getTopProcesses(limit: number = 6): Promise<RunningProcess[]> {
  try {
    if (process.platform === 'win32') {
      const psCommand = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' -or $_.WorkingSet64 -gt 50MB } | Sort-Object WorkingSet64 -Descending | Select-Object -First ${limit} ProcessName, Id, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json -Compress`;
      
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCommand}"`);
      
      if (!stdout.trim()) return [];
      
      const parsed = JSON.parse(stdout.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      
      return items.map((item: { ProcessName?: string; Id?: number; MemoryMB?: number }) => ({
        name: item.ProcessName ?? 'Unknown',
        pid: item.Id ?? 0,
        memoryMB: typeof item.MemoryMB === 'number' ? item.MemoryMB : 0,
      }));
    } else {
      // Fallback for macOS / Linux
      const { stdout } = await execAsync(`ps -eo comm,pid,rss --sort=-rss | head -n ${limit + 1}`);
      const lines = stdout.trim().split('\n').slice(1);
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0] || 'Unknown';
        const pid = parseInt(parts[1] || '0', 10);
        const memoryMB = Math.round((parseInt(parts[2] || '0', 10) / 1024) * 10) / 10;
        return { name, pid, memoryMB };
      });
    }
  } catch (error) {
    console.error('Failed to query system processes:', error);
    return [];
  }
}
