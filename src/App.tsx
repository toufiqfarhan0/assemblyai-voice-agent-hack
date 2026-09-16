import { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import OrbCore from './components/OrbCore';
import WaveformRibbon from './components/WaveformRibbon';
import QuickActions from './components/QuickActions';
import TelemetryDrawer from './components/TelemetryDrawer';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { LayoutDashboard, Mic, MicOff, Send, Sparkles, Cpu, Wifi, Activity } from 'lucide-react';
import type { ScreenshotResult, RunningProcess, NetworkStatus } from './vite-env';

export default function App() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('listening');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('Plot online and listening in real-time...');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');

  // Telemetry state
  const [screenshot, setScreenshot] = useState<ScreenshotResult | null>(null);
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;

  // Initialize Voice Agent Hook
  const voiceAgent = useVoiceAgent({
    onStatusChange: (newStatus) => {
      setStatus(newStatus);
    },
    onAudioLevel: setAudioLevel,
    onTranscript: (text) => {
      setTranscript(text);
    },
    onScreenshotCaptured: (res) => {
      setScreenshot(res);
      setIsDrawerOpen(true);
    },
    onProcessesUpdated: (procs) => {
      setProcesses(procs);
      setIsDrawerOpen(true);
    },
    onNetworkUpdated: (net) => {
      setNetwork(net);
      setIsDrawerOpen(true);
    },
  });

  const voiceAgentRef = useRef(voiceAgent);
  voiceAgentRef.current = voiceAgent;

  // Toggle voice session using stable refs to prevent re-renders
  const handleToggleVoice = useCallback(() => {
    if (statusRef.current === 'idle') {
      voiceAgentRef.current.startSession();
    } else {
      voiceAgentRef.current.stopSession();
    }
  }, []);

  // Auto-connect voice session on mount for a real-time, always-on experience
  useEffect(() => {
    const timer = setTimeout(() => {
      voiceAgentRef.current.startSession();
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Fetch initial telemetry and bind global hotkey ONCE on mount
  useEffect(() => {
    if (window.plotAPI) {
      window.plotAPI.checkNetwork().then(setNetwork).catch(console.error);
      window.plotAPI.getRunningApps(5).then(setProcesses).catch(console.error);

      // Listen for global hotkey trigger (Ctrl+Shift+Space)
      const cleanupHotkey = window.plotAPI.onHotkeyTriggered(() => {
        handleToggleVoice();
      });

      return () => {
        cleanupHotkey();
      };
    }
  }, [handleToggleVoice]);

  const handleQuickAction = async (action: 'screenshot' | 'processes' | 'network' | 'health') => {
    setStatus('thinking');
    setTranscript(`Executing ${action}...`);

    if (action === 'screenshot' || action === 'health') {
      const res = await window.plotAPI?.takeScreenshot();
      if (res?.success) {
        setScreenshot(res);
        setIsDrawerOpen(true);
        setStatus('speaking');
        setTranscript('Captured primary monitor display.');
      }
    }

    if (action === 'processes' || action === 'health') {
      const procs = await window.plotAPI?.getRunningApps(6);
      if (procs) {
        setProcesses(procs);
        setIsDrawerOpen(true);
        setStatus('speaking');
        setTranscript(`Found ${procs.length} top resource-intensive processes.`);
      }
    }

    if (action === 'network' || action === 'health') {
      const net = await window.plotAPI?.checkNetwork();
      if (net) {
        setNetwork(net);
        setIsDrawerOpen(true);
        setStatus('speaking');
        setTranscript(`Wi-Fi connected to ${net.ssid} (${net.signal}% signal quality).`);
      }
    }

    setTimeout(() => {
      setStatus('listening');
    }, 2800);
  };

  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const query = inputVal.toLowerCase();
    const rawText = inputVal;
    setInputVal('');

    if (voiceAgent.isConnected) {
      voiceAgent.sendTextMessage(rawText);
      return;
    }

    if (query.includes('screenshot') || query.includes('screen')) {
      handleQuickAction('screenshot');
    } else if (query.includes('app') || query.includes('process') || query.includes('memory') || query.includes('ram')) {
      handleQuickAction('processes');
    } else if (query.includes('wifi') || query.includes('network') || query.includes('internet') || query.includes('ping')) {
      handleQuickAction('network');
    } else {
      handleQuickAction('health');
    }
  };

  // Compute total memory of top apps for real-time vitals
  const totalTopMemoryMB = processes.reduce((acc, p) => acc + p.memoryMB, 0);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center p-4">
      {/* Frosted Glass Floating Command Card */}
      <div className="glass-panel relative flex h-full max-h-[710px] w-full max-w-[980px] flex-col justify-between overflow-hidden rounded-[32px] border border-white/15 bg-slate-950/80 shadow-2xl">
        {/* TitleBar & Drag Area */}
        <TitleBar status={status} />

        {/* Central Content Area */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
          {/* Subtle Ambient Radial Lighting */}
          <div className="pointer-events-none absolute -top-16 h-64 w-96 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-3xl" />

          {/* Realtime Live Vitals Badge Strip */}
          <div className="mb-2.5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold tracking-wide">Realtime Active</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1 text-slate-400">
              <Cpu className="h-3 w-3 text-purple-400" />
              <span>{totalTopMemoryMB > 0 ? `${Math.round(totalTopMemoryMB)} MB` : 'Monitoring RAM'}</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1 text-slate-400">
              <Wifi className="h-3 w-3 text-cyan-400" />
              <span>{network ? `${network.gatewayPingMs}ms ping` : 'Connected'}</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Voice Powers <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">Instant Desktop</span> & System Actions
          </h1>

          {/* Subtitle / Dynamic Real-Time Spoken Caption */}
          <div className="mt-2.5 flex max-w-lg items-center justify-center gap-1.5 min-h-[26px]">
            <Activity className="h-3.5 w-3.5 text-purple-400 animate-pulse shrink-0" />
            <p className="text-sm text-slate-200 font-medium transition-all duration-150">
              {transcript}
            </p>
          </div>

          {/* 3D Iridescent Holographic Orb */}
          <div className="my-1.5">
            <OrbCore
              status={status}
              audioLevel={audioLevel}
              onClick={handleToggleVoice}
            />
          </div>

          {/* Quick Action Diagnostic Pills */}
          <div className="z-10">
            <QuickActions onAction={handleQuickAction} />
          </div>
        </div>

        {/* Bottom Section: Fluid Waveform + Input Deck */}
        <div className="relative z-10 flex flex-col items-center border-t border-white/10 bg-slate-950/40 pb-5 pt-1 backdrop-blur-md">
          {/* Siri-style Fluid Waveform Ribbon */}
          <div className="w-full">
            <WaveformRibbon
              isActive={status === 'listening' || status === 'speaking'}
              audioLevel={audioLevel}
              height={50}
            />
          </div>

          {/* Floating Command Input Deck */}
          <form
            onSubmit={handleSubmitText}
            className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/80 p-1.5 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center pl-3 text-slate-400">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask Plot anything or speak commands..."
              className="flex-1 bg-transparent px-2 text-sm text-white placeholder-slate-500 outline-none"
            />

            {/* Telemetry Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="View Telemetry & Artifacts"
            >
              <LayoutDashboard className="h-4 w-4 text-cyan-400" />
            </button>

            {/* Realtime Live Voice Pill Toggle */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                status === 'listening' || status === 'speaking'
                  ? 'bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 text-white shadow-md'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {status === 'listening' || status === 'speaking' ? (
                <>
                  <Mic className="h-3.5 w-3.5 text-emerald-200 animate-pulse" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <MicOff className="h-3.5 w-3.5 text-slate-400" />
                  <span>Muted</span>
                </>
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md transition hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Telemetry Slide-Over Drawer */}
        <TelemetryDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          screenshot={screenshot}
          processes={processes}
          network={network}
          onRefreshProcesses={() => window.plotAPI?.getRunningApps(6).then(setProcesses)}
          onRefreshNetwork={() => window.plotAPI?.checkNetwork().then(setNetwork)}
        />
      </div>
    </div>
  );
}
