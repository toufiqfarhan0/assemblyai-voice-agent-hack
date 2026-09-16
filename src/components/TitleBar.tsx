import { Minus, X, Radio, Command } from 'lucide-react';

interface TitleBarProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export default function TitleBar({ status }: TitleBarProps) {
  const handleMinimize = () => {
    window.plotAPI?.minimizeWindow();
  };

  const handleClose = () => {
    window.plotAPI?.closeWindow();
  };

  const statusLabel = {
    idle: 'Standby',
    listening: 'Listening...',
    thinking: 'Analyzing System...',
    speaking: 'Plot Speaking',
  }[status];

  const statusColor = {
    idle: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    listening: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse',
    thinking: 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse',
    speaking: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  }[status];

  return (
    <div className="flex h-12 w-full items-center justify-between px-5 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* Brand Emblem */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950 font-bold text-xs tracking-wider text-white">
            P
          </div>
        </div>
        <span className="text-sm font-semibold tracking-wide text-white/90">Plot</span>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md ${statusColor}`}>
          <Radio className="h-3 w-3 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Center Hotkey Hint */}
      <div className="hidden items-center gap-1 text-[11px] text-slate-400/80 md:flex">
        <span className="flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
          <Command className="h-2.5 w-2.5" /> Shift Space
        </span>
        <span className="ml-1 text-slate-400/70">Push-to-Talk</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/80 hover:text-white"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
