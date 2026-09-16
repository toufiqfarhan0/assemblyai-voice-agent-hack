import { useRef, useState, useCallback } from 'react';
import type { ScreenshotResult, RunningProcess, NetworkStatus } from '../vite-env';

export interface UseVoiceAgentOptions {
  onStatusChange?: (status: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  onAudioLevel?: (level: number) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onScreenshotCaptured?: (result: ScreenshotResult) => void;
  onProcessesUpdated?: (processes: RunningProcess[]) => void;
  onNetworkUpdated?: (network: NetworkStatus) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionReadyRef = useRef(false);

  const {
    onStatusChange,
    onAudioLevel,
    onTranscript,
    onScreenshotCaptured,
    onProcessesUpdated,
    onNetworkUpdated,
  } = options;

  // Convert Float32 audio samples to base64 PCM16
  const pcmBase64 = (samples: Float32Array): string => {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Decode base64 PCM16 into AudioBuffer and schedule gapless playback
  const playAgentAudio = (encoded: string) => {
    try {
      const binary = atob(encoded);
      const samples = new Int16Array(binary.length / 2);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
      }

      const ctx = playbackContextRef.current ?? new AudioContext({ sampleRate: 24000 });
      playbackContextRef.current = ctx;

      const buffer = ctx.createBuffer(1, samples.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        channel[i] = samples[i] / 0x7fff;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startAt = Math.max(now, nextPlaybackTimeRef.current);
      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + buffer.duration;

      activeAudioSourcesRef.current.push(source);
      source.onended = () => {
        const index = activeAudioSourcesRef.current.indexOf(source);
        if (index > -1) activeAudioSourcesRef.current.splice(index, 1);
        if (activeAudioSourcesRef.current.length === 0) {
          onStatusChange?.('idle');
          onAudioLevel?.(0);
        }
      };

      onStatusChange?.('speaking');
      onAudioLevel?.(0.65);
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  // Flush audio buffer on barge-in
  const flushAudioBuffer = () => {
    activeAudioSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore already stopped sources
      }
    });
    activeAudioSourcesRef.current = [];
    if (playbackContextRef.current) {
      nextPlaybackTimeRef.current = playbackContextRef.current.currentTime;
    }
  };

  // Execute native tool call dispatched by AssemblyAI
  const handleToolCall = async (toolCall: { call_id: string; name: string; arguments?: Record<string, unknown> }) => {
    onStatusChange?.('thinking');
    const { call_id, name, arguments: args } = toolCall;
    let toolResult: unknown = { status: 'success' };

    try {
      if (name === 'take_screenshot') {
        const result = await window.plotAPI?.takeScreenshot();
        if (result?.success) {
          onScreenshotCaptured?.(result);
          toolResult = {
            status: 'success',
            message: 'Screenshot successfully captured from the primary monitor.',
            timestamp: result.timestamp,
          };
        } else {
          toolResult = { status: 'error', error: result?.error ?? 'Failed to capture screenshot' };
        }
      } else if (name === 'get_running_apps') {
        const limit = typeof args?.limit === 'number' ? args.limit : 5;
        const processes = await window.plotAPI?.getRunningApps(limit);
        if (processes) {
          onProcessesUpdated?.(processes);
          toolResult = {
            status: 'success',
            count: processes.length,
            top_processes: processes.map(p => `${p.name} (PID: ${p.pid}, Memory: ${p.memoryMB} MB)`),
          };
        }
      } else if (name === 'check_network_status') {
        const network = await window.plotAPI?.checkNetwork();
        if (network) {
          onNetworkUpdated?.(network);
          toolResult = {
            status: 'success',
            ssid: network.ssid,
            signal_percentage: network.signal,
            ip_address: network.ip,
            ping_latency_ms: network.gatewayPingMs,
            connection_health: network.gatewayPingMs < 60 ? 'Optimal' : 'Elevated Latency',
          };
        }
      }
    } catch (err) {
      toolResult = { status: 'error', error: String(err) };
    }

    // Return tool.result immediately
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'tool.result',
          call_id,
          result: JSON.stringify(toolResult),
        })
      );
    }
  };

  // Start microphone capture and stream audio frames
  const startMicrophone = (stream: MediaStream, socket: WebSocket) => {
    const audioCtx = new AudioContext({ sampleRate: 24000 });
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      if (!sessionReadyRef.current || socket.readyState !== WebSocket.OPEN) return;
      const channelData = event.inputBuffer.getChannelData(0);

      // Compute RMS volume for visualizer
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      const level = Math.min(1, rms * 5);
      onAudioLevel?.(level);

      // Send audio chunk
      socket.send(
        JSON.stringify({
          type: 'input.audio',
          audio: pcmBase64(channelData),
        })
      );
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    audioContextRef.current = audioCtx;
    sourceRef.current = source;
    processorRef.current = processor;
  };

  const stopSession = useCallback(() => {
    sessionReadyRef.current = false;
    flushAudioBuffer();

    // Cleanly end AssemblyAI session
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'session.end' }));
      socketRef.current.close();
    }
    socketRef.current = null;

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    playbackContextRef.current?.close();

    processorRef.current = null;
    sourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    playbackContextRef.current = null;

    setIsConnected(false);
    onStatusChange?.('idle');
    onAudioLevel?.(0);
  }, [onStatusChange, onAudioLevel]);

  const startSession = useCallback(async () => {
    stopSession();
    onStatusChange?.('listening');

    try {
      // 1. Get short-lived token from Electron main process
      const { token } = await window.plotAPI.getToken();
      if (!token) throw new Error('Failed to mint AssemblyAI temporary token');

      // 2. Request mic audio with recommended constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,    // ON
          noiseSuppression: false,   // OFF (AssemblyAI Voice Focus handles server-side)
          autoGainControl: true,     // ON
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect to AssemblyAI Voice Agent WebSocket
      const socket = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Register agent prompt, voice, VAD turn-detection, and native tool schemas
        socket.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              system_prompt:
                "You are Plot, an autonomous, voice-directed desktop intelligence copilot. You have real native tools to inspect and diagnose the user's operating system: 'take_screenshot' to capture the active monitor, 'get_running_apps' to check memory and background processes, and 'check_network_status' to inspect Wi-Fi signal and ping latency. When the user asks about their screen, lag, slow computer, internet, or asks you to look at something, invoke your tools immediately. Keep your spoken responses concise, direct, helpful, and natural.",
              greeting: 'Plot online. What can I help you with?',
              input: {
                format: { encoding: 'audio/pcm' },
                turn_detection: {
                  vad_threshold: 0.5,
                  min_silence: 1400,
                  max_silence: 4000,
                  interrupt_response: true,
                },
                keyterms: ['Plot', 'screenshot', 'Wi-Fi', 'processes', 'RAM', 'memory', 'latency', 'ping'],
              },
              output: {
                voice: 'anna',
                format: { encoding: 'audio/pcm' },
                volume: 90,
              },
              tools: [
                {
                  type: 'function',
                  name: 'take_screenshot',
                  description:
                    'Capture a live screenshot of the user desktop display. Call this when the user asks you to take a screenshot, look at their screen, check what is displayed, or diagnose a visual issue.',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: [],
                  },
                  execution_mode: 'interactive',
                },
                {
                  type: 'function',
                  name: 'get_running_apps',
                  description:
                    'Query the top memory-intensive running applications and background processes on the operating system. Call this when the user asks why their computer is slow, what apps are open, or asks about memory/RAM usage.',
                  parameters: {
                    type: 'object',
                    properties: {
                      limit: {
                        type: 'integer',
                        description: 'Number of top processes to return (default 5)',
                      },
                    },
                    required: [],
                  },
                  execution_mode: 'interactive',
                },
                {
                  type: 'function',
                  name: 'check_network_status',
                  description:
                    'Measure the current Wi-Fi network connection, signal percentage, local IP, and ping round-trip latency. Call this when the user asks about their internet speed, Wi-Fi quality, or connection status.',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: [],
                  },
                  execution_mode: 'interactive',
                },
              ],
            },
          })
        );
      };

      socket.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data as string);

          if (payload.type === 'session.ready') {
            sessionReadyRef.current = true;
            onStatusChange?.('listening');
            startMicrophone(stream, socket);
            return;
          }

          if (payload.type === 'input.speech.started') {
            // Instant barge-in: flush active audio playback immediately
            flushAudioBuffer();
            onStatusChange?.('listening');
          }

          if (payload.type === 'transcript.user' && payload.text) {
            onTranscript?.(payload.text, true);
            onStatusChange?.('thinking');
          }

          if (payload.type === 'tool.call') {
            await handleToolCall(payload);
          }

          if (payload.type === 'reply.audio' && payload.data) {
            playAgentAudio(payload.data);
          }

          if (payload.type === 'transcript.agent' && payload.text) {
            onTranscript?.(payload.text, false);
          }

          if (payload.type === 'reply.done') {
            if (payload.status === 'interrupted') {
              flushAudioBuffer();
            }
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('AssemblyAI WebSocket error:', err);
        stopSession();
      };

      socket.onclose = () => {
        sessionReadyRef.current = false;
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to start voice agent session:', error);
      stopSession();
    }
  }, [stopSession, onStatusChange, onTranscript, onAudioLevel, onScreenshotCaptured, onProcessesUpdated, onNetworkUpdated]);

  return {
    isConnected,
    startSession,
    stopSession,
  };
}
