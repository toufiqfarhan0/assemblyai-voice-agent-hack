import { Mic, Sparkles } from 'lucide-react';

interface OrbCoreProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioLevel?: number; // 0 to 1
  onClick?: () => void;
}

export default function OrbCore({ status, audioLevel = 0, onClick }: OrbCoreProps) {
  // Compute dynamic scale based on status and audio level
  const dynamicScale = status === 'listening' ? 1 + audioLevel * 0.25 : 1;

  return (
    <div className="relative flex items-center justify-center p-8 select-none">
      {/* Outer Pulse Rings */}
      <div
        className={`absolute h-72 w-72 rounded-full border border-purple-500/20 transition-all duration-700 ${
          status === 'listening' ? 'animate-pulse-ring border-purple-400/40' : 'opacity-40'
        }`}
      />
      <div
        className={`absolute h-56 w-56 rounded-full border border-cyan-400/20 transition-all duration-500 ${
          status === 'thinking' ? 'animate-spin border-dashed border-cyan-400/60' : 'opacity-30'
        }`}
        style={{ animationDuration: '10s' }}
      />

      {/* Atmospheric Background Glow */}
      <div
        className={`absolute h-48 w-48 rounded-full blur-3xl transition-opacity duration-700 ${
          status === 'listening'
            ? 'bg-gradient-to-tr from-purple-600/50 via-pink-500/40 to-cyan-400/50 opacity-90'
            : status === 'speaking'
            ? 'bg-gradient-to-tr from-cyan-500/50 via-indigo-600/40 to-purple-500/50 opacity-80'
            : status === 'thinking'
            ? 'bg-gradient-to-tr from-amber-500/40 via-purple-600/40 to-pink-500/40 opacity-80'
            : 'bg-gradient-to-tr from-purple-700/30 via-indigo-700/20 to-cyan-700/30 opacity-40'
        }`}
      />

      {/* 3D Iridescent Holographic Orb */}
      <button
        onClick={onClick}
        type="button"
        title={status === 'idle' ? 'Click to Start Voice Session' : 'Listening... Click to Stop'}
        className="group relative flex h-40 w-40 cursor-pointer items-center justify-center rounded-full outline-none transition-transform duration-300 hover:scale-105 active:scale-95"
        style={{ transform: `scale(${dynamicScale})` }}
      >
        {/* Core Sphere Surface */}
        <div className="animate-orb relative h-full w-full rounded-full p-[1px] shadow-2xl shadow-purple-900/50">
          <div
            className="relative h-full w-full overflow-hidden rounded-full border border-white/30"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(244, 114, 182, 0.7) 25%, rgba(168, 85, 247, 0.8) 55%, rgba(14, 165, 233, 0.9) 85%, rgba(15, 23, 42, 1) 100%)',
              boxShadow:
                'inset 0 4px 15px rgba(255, 255, 255, 0.7), inset 0 -8px 25px rgba(0, 0, 0, 0.7), 0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Top-Left Glass Reflection Highlights */}
            <div
              className="absolute top-2 left-4 h-14 w-20 rounded-full opacity-70 blur-[1px]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 70%)',
                transform: 'rotate(-25deg)',
              }}
            />

            {/* Bottom-Right Subsurface Reflection */}
            <div
              className="absolute bottom-2 right-4 h-12 w-16 rounded-full opacity-60 blur-[3px]"
              style={{
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.8) 0%, rgba(56, 189, 248, 0) 75%)',
              }}
            />

            {/* Center Symbol / State Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {status === 'thinking' ? (
                <Sparkles className="h-8 w-8 animate-pulse text-white/90 drop-shadow-md" />
              ) : (
                <Mic
                  className={`h-8 w-8 text-white/90 transition-transform duration-300 drop-shadow-md group-hover:scale-110 ${
                    status === 'listening' ? 'animate-bounce text-white' : 'opacity-80'
                  }`}
                />
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
