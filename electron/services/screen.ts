import { desktopCapturer, screen } from 'electron';

export interface ScreenshotResult {
  success: boolean;
  base64: string;
  timestamp: string;
  error?: string;
}

export async function capturePrimaryScreen(): Promise<ScreenshotResult> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(width, 1920),
        height: Math.min(height, 1080),
      },
    });

    const primarySource = sources[0];
    if (!primarySource) {
      throw new Error('No screen display source detected');
    }

    const dataUrl = primarySource.thumbnail.toDataURL();

    return {
      success: true,
      base64: dataUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  } catch (err) {
    return {
      success: false,
      base64: '',
      timestamp: new Date().toLocaleTimeString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
