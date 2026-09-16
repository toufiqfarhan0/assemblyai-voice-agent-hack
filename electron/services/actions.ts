import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ActionResponse {
  success: boolean;
  message: string;
}

export async function launchDesktopApp(appQuery: string): Promise<ActionResponse> {
  const query = appQuery.toLowerCase().trim();

  try {
    if (process.platform === 'win32') {
      let command = '';

      if (query.includes('notepad') || query.includes('note')) {
        command = 'start notepad.exe';
      } else if (query.includes('calc') || query.includes('calculator')) {
        command = 'start calc.exe';
      } else if (query.includes('terminal') || query.includes('cmd') || query.includes('command')) {
        command = 'start cmd.exe';
      } else if (query.includes('powershell')) {
        command = 'start powershell.exe';
      } else if (query.includes('browser') || query.includes('edge') || query.includes('chrome') || query.includes('web') || query.includes('internet')) {
        command = 'start msedge.exe || start https://google.com';
      } else if (query.includes('task manager') || query.includes('taskmgr')) {
        command = 'start taskmgr.exe';
      } else if (query.includes('explorer') || query.includes('file') || query.includes('folder')) {
        command = 'start explorer.exe';
      } else if (query.includes('paint')) {
        command = 'start mspaint.exe';
      } else if (query.includes('setting')) {
        command = 'start ms-settings:';
      } else {
        // Generic launch attempt
        command = `start ${query.replace(/[^a-zA-Z0-9_\-.]/g, '')}`;
      }

      await execAsync(command, { shell: 'cmd.exe' });
      return { success: true, message: `Launched ${query} successfully` };
    } else if (process.platform === 'darwin') {
      await execAsync(`open -a "${query}"`);
      return { success: true, message: `Launched ${query}` };
    } else {
      await execAsync(`xdg-open "${query}"`);
      return { success: true, message: `Launched ${query}` };
    }
  } catch (err) {
    return {
      success: false,
      message: `Failed to launch ${appQuery}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
