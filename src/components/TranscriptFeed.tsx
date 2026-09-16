import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Play,
  Square,
  Search,
  Clock,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { TranscriptTurn } from '../hooks/useRealtimeSTT';

interface TranscriptFeedProps {
  isRecording: boolean;
  isConnected: boolean;
  currentUtterance: string;
  turns: TranscriptTurn[];
  formattedDuration: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSimulateDemo: () => void;
  audioLevel?: number;
}

export default function TranscriptFeed({
  isRecording,
  isConnected,
  currentUtterance,
  turns,
  formattedDuration,
  onStartRecording,
  onStopRecording,
  onSimulateDemo,
  audioLevel = 0,
}: TranscriptFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new turns or utterance updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, currentUtterance]);

  const filteredTurns = turns.filter(
    (t) =>
      t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40 p-5 backdrop-blur-xl">
      {/* Top Controls Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
              <Radio className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">Live Meeting Stream</span>
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-400 border border-cyan-500/20">
                  Universal-3.5 Pro
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* 1-Click Demo Simulator */}
            <button
              onClick={onSimulateDemo}
              className="flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20 shadow-sm"
              title="Simulate a live 3-person standup meeting for instant demo"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Simulate Standup</span>
            </button>

            {/* Record Toggle Button */}
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1 text-xs font-bold transition shadow-md ${
                isRecording
                  ? 'bg-rose-500/90 text-white hover:bg-rose-600 shadow-rose-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 shadow-emerald-500/20'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-3 w-3 fill-current" />
                  <span>Stop Stream</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current" />
                  <span>Start Stream</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status & Audio Activity Bar */}
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="font-mono font-semibold">{formattedDuration}</span>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${isRecording ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-slate-400">
                {isRecording ? (isConnected ? 'Ambient STT Active' : 'Connecting...') : 'Offline'}
              </span>
            </div>
          </div>

          {/* Dynamic Voice Level Visualizer */}
          <div className="flex items-center gap-1.5">
            <Volume2 className="h-3 w-3 text-slate-400" />
            <div className="flex h-3 w-20 items-center gap-0.5 rounded-full bg-slate-900 px-1">
              {[0.1, 0.25, 0.45, 0.65, 0.85].map((thresh, idx) => (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-all duration-75 ${
                    audioLevel > thresh
                      ? idx > 3
                        ? 'bg-rose-400'
                        : 'bg-cyan-400'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript keywords, speakers..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Transcript Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
        {turns.length === 0 && !currentUtterance && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <MicOff className="h-8 w-8 mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">Meeting transcript will stream here</p>
            <p className="mt-1 text-xs text-slate-600 max-w-xs">
              Click <strong className="text-emerald-400">Start Stream</strong> to transcribe your microphone and computer audio in real-time, or tap <strong className="text-purple-400">Simulate Standup</strong>.
            </p>
          </div>
        )}

        {/* Finalized Turns */}
        {filteredTurns.map((turn) => (
          <div
            key={turn.id}
            className="rounded-xl border border-white/5 bg-slate-900/50 p-3 transition hover:border-white/15"
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-cyan-400">{turn.speaker}</span>
                <span className="text-white/20">•</span>
                <span className="font-mono text-slate-400">{turn.timestamp}</span>
              </div>
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
                Finalized
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-200">
              {turn.text}
            </p>
          </div>
        ))}

        {/* Word-by-word streaming partial utterance */}
        {currentUtterance && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 animate-pulse">
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-semibold mb-1">
              <Mic className="h-3 w-3 animate-bounce" />
              <span>Speaking now...</span>
            </div>
            <p className="text-xs leading-relaxed text-cyan-100 font-medium italic">
              {currentUtterance}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
