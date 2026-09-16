import { useState } from 'react';
import { Bot, ChevronUp, ChevronDown } from 'lucide-react';
import OrbCore from './OrbCore';

interface VoiceCopilotWidgetProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioLevel: number;
  transcript: string;
  isConnected: boolean;
  onToggleVoice: () => void;
}

export default function VoiceCopilotWidget({
  status,
  audioLevel,
  transcript,
  isConnected,
  onToggleVoice,
}: VoiceCopilotWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Voice Agent Card */}
      {isExpanded ? (
        <div className="flex w-80 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/90 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3.5 py-2 select-none">
            <div className="flex items-center gap-2">
              <div className="relative flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1px]">
                <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-slate-950">
                  <Bot className="h-3 w-3 text-cyan-300" />
                </div>
              </div>
              <span className="text-xs font-bold tracking-wide text-white">Voice Copilot</span>
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 border border-purple-500/30">
                Voice Agent API
              </span>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Orb Core & Spoken Feedback */}
          <div className="flex flex-col items-center p-3 text-center">
            {/* 3D Orb */}
            <div className="relative my-1">
              <OrbCore
                status={status}
                audioLevel={audioLevel}
                onClick={onToggleVoice}
              />
            </div>

            {/* Status Pill */}
            <div className="mt-1 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status === 'listening'
                    ? 'bg-emerald-400 animate-ping'
                    : status === 'speaking'
                    ? 'bg-cyan-400 animate-pulse'
                    : status === 'thinking'
                    ? 'bg-purple-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
              <span className="capitalize font-medium">{isConnected ? status : 'Offline'}</span>
            </div>

            {/* Spoken Transcript / Live Answer */}
            <div className="mt-2.5 min-h-[36px] w-full rounded-xl border border-white/5 bg-slate-900/60 p-2 text-left">
              <p className="text-[11px] leading-relaxed text-slate-300 line-clamp-3">
                {transcript || 'Ask anything aloud about the meeting discussion or slides...'}
              </p>
            </div>

            {/* Hotkey hint */}
            <div className="mt-2.5 flex items-center justify-between w-full text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px]">
                  Ctrl+Shift+Space
                </kbd>
              </span>
              <button
                onClick={onToggleVoice}
                className="flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300"
              >
                {status === 'idle' ? 'Connect Voice' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Floating Pill */
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/90 py-2 px-3.5 shadow-2xl backdrop-blur-xl transition hover:scale-105"
        >
          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950">
              <Bot className="h-3 w-3 text-cyan-300" />
            </div>
          </div>
          <span className="text-xs font-semibold text-white">Voice Copilot</span>
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        </button>
      )}
    </div>
  );
}
