import { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import OrbCore from './components/OrbCore';
import WaveformRibbon from './components/WaveformRibbon';
import QuickActions from './components/QuickActions';
import TelemetryDrawer from './components/TelemetryDrawer';
import { LayoutDashboard, Mic, MicOff, Send, Sparkles } from 'lucide-react';
import type { ScreenshotResult, RunningProcess, NetworkStatus } from './vite-env';

export default function App() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('What can I help you with?');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');

  // Telemetry state
  const [screenshot, setScreenshot] = useState<ScreenshotResult | null>(null);
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);

  // Initial network & process query
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
  }, []);

  const handleToggleVoice = () => {
    if (status === 'idle') {
      setStatus('listening');
      setTranscript('Listening for your command...');
      // Simulated audio level activity for UI responsiveness
      setAudioLevel(0.65);
    } else {
      setStatus('idle');
      setAudioLevel(0);
      setTranscript('What can I help you with?');
    }
  };

  const handleQuickAction = async (action: 'screenshot' | 'processes' | 'network' | 'health') => {
    setStatus('thinking');
    setTranscript(`Executing ${action}...`);

    if (action === 'screenshot' || action === 'health') {
      const res = await window.plotAPI?.takeScreenshot();
      if (res?.success) {
        setScreenshot(res);
        setIsDrawerOpen(true);
        setStatus('speaking');
        setTranscript('Captured primary monitor. Visual telemetry is ready.');
      }
    }

    if (action === 'processes' || action === 'health') {
      const procs = await window.plotAPI?.getRunningApps(6);
      if (procs) {
        setProcesses(procs);
        setIsDrawerOpen(true);
        setStatus('speaking');
        setTranscript(`Found ${procs.length} top resource-intensive background processes.`);
      }
    }

    if (action === 'network' || action === 'health') {
      const net = await window.plotAPI?.checkNetwork();
      if (net) {
        setNetwork(net);
        setIsDrawerOpen(true);
        setStatus('speaking');
        setTranscript(`Wi-Fi connected to ${net.ssid} with ${net.signal}% signal quality.`);
      }
    }

    setTimeout(() => {
      setStatus('idle');
    }, 4000);
  };

  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const query = inputVal.toLowerCase();
    setInputVal('');

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

          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Voice Powers <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">Instant Desktop</span> & System Actions
          </h1>

          {/* Subtitle / Dynamic Spoken Caption */}
          <p className="mt-2.5 max-w-lg text-sm text-slate-300/90 font-medium transition-all duration-300 min-h-[22px]">
            {transcript}
          </p>

          {/* 3D Iridescent Holographic Orb */}
          <div className="my-2">
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

            {/* Voice Toggle Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                status === 'listening'
                  ? 'bg-rose-500/80 text-white animate-pulse'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {status === 'listening' ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-purple-300" />}
              <span>{status === 'listening' ? 'Stop' : 'Voice'}</span>
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
