import { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, ZoomIn, ZoomOut } from 'lucide-react';

interface TitleBarProps {
  zoomFactor?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export default function TitleBar({
  zoomFactor = 100,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.plotAPI?.isMaximized().then(setIsMaximized).catch(() => {});
  }, []);

  const handleMinimize = () => {
    window.plotAPI?.minimizeWindow();
  };

  const handleToggleMaximize = async () => {
    if (window.plotAPI) {
      const state = await window.plotAPI.toggleMaximize();
      setIsMaximized(state);
    }
  };

  const handleClose = () => {
    window.plotAPI?.closeWindow();
  };

  return (
    <div className="flex items-center gap-2 select-none" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {/* Zoom Controls Pill */}
      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs text-slate-300">
        <button
          onClick={onZoomOut}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Zoom Out (Ctrl -)"
        >
          <ZoomOut className="h-3 w-3" />
        </button>

        <button
          onClick={onResetZoom}
          className="px-1.5 font-mono text-[11px] font-semibold text-slate-300 hover:text-cyan-400 transition"
          title="Reset Zoom to 100% (Ctrl 0)"
        >
          {zoomFactor}%
        </button>

        <button
          onClick={onZoomIn}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Zoom In (Ctrl +)"
        >
          <ZoomIn className="h-3 w-3" />
        </button>
      </div>

      <div className="h-4 w-[1px] bg-white/10" />

      {/* Window Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleMinimize}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleToggleMaximize}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3 rotate-180" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>

        <button
          onClick={handleClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/90 hover:text-white"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
