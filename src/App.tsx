import { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import MeetingNotepad, { ActionItem } from './components/MeetingNotepad';
import TranscriptFeed from './components/TranscriptFeed';
import VoiceCopilotWidget from './components/VoiceCopilotWidget';
import OrbCore from './components/OrbCore';
import QuickActions from './components/QuickActions';
import TelemetryDrawer from './components/TelemetryDrawer';
import WaveformRibbon from './components/WaveformRibbon';
import { useRealtimeSTT } from './hooks/useRealtimeSTT';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import {
  FileText,
  Cpu,
  Wifi,
  Bot,
} from 'lucide-react';
import type { ScreenshotResult, RunningProcess, NetworkStatus, EnrichedMeetingNotes } from './vite-env';

export default function App() {
  // Workspace Mode: 'meeting' (Granola AI Notepad) or 'copilot' (Desktop J.A.R.V.I.S.)
  const [workspaceMode, setWorkspaceMode] = useState<'meeting' | 'copilot'>('meeting');

  // Meeting State (Granola)
  const [meetingTitle, setMeetingTitle] = useState('Product & Engineering Sprint Sync');
  const [rawNotes, setRawNotes] = useState(
    `• alex: WebSocket streaming STT is deployed and tested\n• sarah: finished the Granola split-pane UI\n• david: enterprise demo Friday at 2 PM, need action items locked in\n• budget cap for infrastructure: $50k\n• follow up on slide exports tomorrow morning`
  );
  const [enrichedNotes, setEnrichedNotes] = useState<EnrichedMeetingNotes | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [slides, setSlides] = useState<ScreenshotResult[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { id: 'act-1', text: 'Finalize Granola split-pane typography and export', assignee: 'Sarah', done: false },
    { id: 'act-2', text: 'Review infrastructure budget allocation ($50k)', assignee: 'David', done: false },
    { id: 'act-3', text: 'Verify 24kHz audio capture buffer with zero latency', assignee: 'Alex', done: true },
  ]);

  // Telemetry & Desktop state
  const [screenshot, setScreenshot] = useState<ScreenshotResult | null>(null);
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Voice Agent State
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [voiceAudioLevel, setVoiceAudioLevel] = useState<number>(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [sttAudioLevel, setSttAudioLevel] = useState<number>(0);

  // Refs for stable callbacks
  const rawNotesRef = useRef(rawNotes);
  rawNotesRef.current = rawNotes;

  // Real-time Streaming STT Hook (Ambient meeting listener)
  const realtimeSTT = useRealtimeSTT({
    sampleRate: 16000,
    onAudioLevel: setSttAudioLevel,
  });

  const fullTranscriptRef = useRef('');
  fullTranscriptRef.current = realtimeSTT.fullTranscriptText;

  // Action Item Handlers
  const handleToggleActionItem = useCallback((id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  }, []);

  const handleAddActionItem = useCallback((text: string, assignee: string) => {
    const newItem: ActionItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text,
      assignee: assignee || 'Team',
      done: false,
    };
    setActionItems((prev) => [...prev, newItem]);
  }, []);

  // Snap slide screenshot handler
  const handleSnapSlide = useCallback(async () => {
    const res = await window.plotAPI?.takeScreenshot();
    if (res?.success) {
      setSlides((prev) => [res, ...prev]);
      setScreenshot(res);
    }
  }, []);

  // Note Enhancement (Granola Synthesis)
  const handleEnhanceNotes = useCallback(async () => {
    setIsEnhancing(true);
    try {
      const result = await window.plotAPI?.enhanceNotes(
        rawNotesRef.current,
        fullTranscriptRef.current
      );
      if (result) {
        setEnrichedNotes(result);
        if (result.actionItems && result.actionItems.length > 0) {
          setActionItems((prev) => [...prev, ...result.actionItems]);
        }
      }
    } catch (err) {
      console.error('Failed to enhance notes:', err);
    } finally {
      setIsEnhancing(false);
    }
  }, []);

  // Voice Agent Hook (Interactive Voice Copilot)
  const voiceAgent = useVoiceAgent({
    onStatusChange: setVoiceStatus,
    onAudioLevel: setVoiceAudioLevel,
    onTranscript: (text) => setVoiceTranscript(text),
    onScreenshotCaptured: (res) => {
      setSlides((prev) => [res, ...prev]);
      setScreenshot(res);
    },
    onProcessesUpdated: (procs) => {
      setProcesses(procs);
      setIsDrawerOpen(true);
    },
    onNetworkUpdated: (net) => {
      setNetwork(net);
      setIsDrawerOpen(true);
    },
    onAddActionItem: handleAddActionItem,
    onTriggerEnhance: handleEnhanceNotes,
    getActiveMeetingTranscript: () => fullTranscriptRef.current,
    getActiveNotes: () => rawNotesRef.current,
  });

  const voiceAgentRef = useRef(voiceAgent);
  voiceAgentRef.current = voiceAgent;

  const handleToggleVoice = useCallback(() => {
    if (voiceStatus === 'idle') {
      voiceAgentRef.current.startSession();
    } else {
      voiceAgentRef.current.stopSession();
    }
  }, [voiceStatus]);

  // Global hotkey binding
  useEffect(() => {
    if (window.plotAPI) {
      window.plotAPI.checkNetwork().then(setNetwork).catch(console.error);
      window.plotAPI.getRunningApps(5).then(setProcesses).catch(console.error);

      const cleanupHotkey = window.plotAPI.onHotkeyTriggered(() => {
        handleToggleVoice();
      });

      return () => {
        cleanupHotkey();
      };
    }
  }, [handleToggleVoice]);

  // Zoom state & handlers
  const [zoomFactor, setZoomFactor] = useState(100);

  const handleZoomIn = useCallback(() => {
    if (window.plotAPI?.zoomIn) {
      const z = window.plotAPI.zoomIn();
      setZoomFactor(z);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (window.plotAPI?.zoomOut) {
      const z = window.plotAPI.zoomOut();
      setZoomFactor(z);
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (window.plotAPI?.resetZoom) {
      const z = window.plotAPI.resetZoom();
      setZoomFactor(z);
    }
  }, []);

  // Keyboard shortcut listener: Ctrl + / Ctrl - / Ctrl 0
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleResetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetZoom]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Fullscreen Top Navigation Bar */}
      <div className="flex h-12 w-full shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-md" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* Brand Emblem & Mode Selector */}
          <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center gap-2">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/20">
                <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950 font-bold text-xs tracking-wider text-white">
                  P
                </div>
              </div>
              <span className="text-sm font-bold tracking-wide text-white">Plot</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setWorkspaceMode('meeting')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                  workspaceMode === 'meeting'
                    ? 'bg-purple-600/80 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Meeting Notepad (Granola)</span>
              </button>
              <button
                onClick={() => setWorkspaceMode('copilot')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                  workspaceMode === 'copilot'
                    ? 'bg-cyan-600/80 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="h-3 w-3" />
                <span>Desktop Copilot</span>
              </button>
            </div>
          </div>

          {/* Vitals Strip */}
          <div className="hidden items-center gap-3 text-xs text-slate-300 md:flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium text-emerald-300">
                {realtimeSTT.isRecording ? 'Meeting Stream Live' : 'Voice Pipeline Ready'}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <Cpu className="h-3 w-3 text-purple-400" />
              <span>{processes.length > 0 ? `${Math.round(processes.reduce((a, p) => a + p.memoryMB, 0))} MB` : 'Monitoring'}</span>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <Wifi className="h-3 w-3 text-cyan-400" />
              <span>{network ? `${network.gatewayPingMs}ms` : 'Connected'}</span>
            </div>
          </div>

          {/* Zoom and Window Controls */}
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <TitleBar
              zoomFactor={zoomFactor}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
            />
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="relative flex flex-1 overflow-hidden">
          {workspaceMode === 'meeting' ? (
            /* Granola Split-Pane Workspace */
            <div className="flex h-full w-full divide-x divide-white/10">
              {/* Left 53%: Human Notepad + AI Enriched Notes */}
              <div className="h-full w-[53%] overflow-hidden">
                <MeetingNotepad
                  meetingTitle={meetingTitle}
                  onMeetingTitleChange={setMeetingTitle}
                  rawNotes={rawNotes}
                  onRawNotesChange={setRawNotes}
                  enrichedNotes={enrichedNotes}
                  actionItems={actionItems}
                  onToggleActionItem={handleToggleActionItem}
                  onAddActionItem={handleAddActionItem}
                  slides={slides}
                  isEnhancing={isEnhancing}
                  onEnhance={handleEnhanceNotes}
                  onSnapSlide={handleSnapSlide}
                />
              </div>

              {/* Right 47%: Live AssemblyAI Streaming Transcript Feed */}
              <div className="h-full w-[47%] overflow-hidden">
                <TranscriptFeed
                  isRecording={realtimeSTT.isRecording}
                  isConnected={realtimeSTT.isConnected}
                  currentUtterance={realtimeSTT.currentUtterance}
                  turns={realtimeSTT.turns}
                  formattedDuration={realtimeSTT.formattedDuration}
                  onStartRecording={realtimeSTT.startRecording}
                  onStopRecording={realtimeSTT.stopRecording}
                  onSimulateDemo={realtimeSTT.simulateDemoMeeting}
                  audioLevel={sttAudioLevel}
                />
              </div>

              {/* Floating Voice Copilot Widget */}
              <VoiceCopilotWidget
                status={voiceStatus}
                audioLevel={voiceAudioLevel}
                transcript={voiceTranscript}
                isConnected={voiceAgent.isConnected}
                onToggleVoice={handleToggleVoice}
              />
            </div>
          ) : (
            /* Desktop Copilot Workspace (Classic Plot) */
            <div className="relative flex flex-1 flex-col items-center justify-between p-6">
              <div className="relative flex flex-1 flex-col items-center justify-center text-center">
                <div className="pointer-events-none absolute -top-16 h-64 w-96 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-3xl" />

                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Autonomous <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">Desktop Voice</span> Intelligence
                </h1>

                <p className="mt-2 text-sm text-slate-300 font-medium">
                  {voiceTranscript || 'Voice Agent active. Press Ctrl+Shift+Space to speak or trigger system actions.'}
                </p>

                <div className="my-3">
                  <OrbCore
                    status={voiceStatus}
                    audioLevel={voiceAudioLevel}
                    onClick={handleToggleVoice}
                  />
                </div>

                <div className="z-10 mt-2">
                  <QuickActions
                    onAction={async (action) => {
                      if (action === 'screenshot') handleSnapSlide();
                      if (action === 'processes') {
                        const procs = await window.plotAPI?.getRunningApps(6);
                        if (procs) {
                          setProcesses(procs);
                          setIsDrawerOpen(true);
                        }
                      }
                      if (action === 'network') {
                        const net = await window.plotAPI?.checkNetwork();
                        if (net) {
                          setNetwork(net);
                          setIsDrawerOpen(true);
                        }
                      }
                      if (action === 'health') {
                        handleSnapSlide();
                        const procs = await window.plotAPI?.getRunningApps(6);
                        if (procs) setProcesses(procs);
                        setIsDrawerOpen(true);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Waveform Ribbon */}
              <div className="w-full">
                <WaveformRibbon
                  isActive={voiceStatus === 'listening' || voiceStatus === 'speaking'}
                  audioLevel={voiceAudioLevel}
                  height={50}
                />
              </div>
            </div>
          )}
        </div>

      {/* Telemetry Slide Drawer */}
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
  );
}
