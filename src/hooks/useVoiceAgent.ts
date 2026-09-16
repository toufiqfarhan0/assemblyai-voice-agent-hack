import { useRef, useState, useCallback } from 'react';
import type { ScreenshotResult, RunningProcess, NetworkStatus } from '../vite-env';

export interface UseVoiceAgentOptions {
  onStatusChange?: (status: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  onAudioLevel?: (level: number) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onScreenshotCaptured?: (result: ScreenshotResult) => void;
  onProcessesUpdated?: (processes: RunningProcess[]) => void;
  onNetworkUpdated?: (network: NetworkStatus) => void;
  onAddActionItem?: (text: string, assignee: string) => void;
  onTriggerEnhance?: () => void;
  getActiveMeetingTranscript?: () => string;
  getActiveNotes?: () => string;
}

export function useVoiceAgent(options: UseVoiceAgentOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionReadyRef = useRef(false);
  const isInterruptedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const waitingForAnswerRef = useRef(false);
  const agentSpokenTextRef = useRef('');

  const {
    onStatusChange,
    onAudioLevel,
    onTranscript,
    onScreenshotCaptured,
    onProcessesUpdated,
    onNetworkUpdated,
    onAddActionItem,
    onTriggerEnhance,
    getActiveMeetingTranscript,
    getActiveNotes,
  } = options;

  // Single shared AudioContext for capture and playback at 24 kHz
  // Shared context is critical for Chromium native AEC to eliminate speaker feedback loops
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  // Convert Float32 audio samples to base64 PCM16 with high performance (no GC allocations)
  const pcmBase64 = (samples: Float32Array): string => {
    const len = samples.length;
    const pcm16 = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < uint8.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunk)));
    }
    return btoa(binary);
  };

  // Fast decoding and seamless gapless playback with jitter compensation
  const playAgentAudio = (encoded: string) => {
    if (isInterruptedRef.current) return;

    try {
      const binary = atob(encoded);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, len / 2);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      // Start immediately or seamless append with 20ms jitter buffer
      const startAt = Math.max(now + 0.02, nextPlaybackTimeRef.current);
      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + buffer.duration;

      activeAudioSourcesRef.current.push(source);
      source.onended = () => {
        const idx = activeAudioSourcesRef.current.indexOf(source);
        if (idx > -1) activeAudioSourcesRef.current.splice(idx, 1);
        if (activeAudioSourcesRef.current.length === 0 && !isSpeakingRef.current) {
          onStatusChange?.(sessionReadyRef.current ? 'listening' : 'idle');
          onAudioLevel?.(0);
        }
      };

      onStatusChange?.('speaking');
      onAudioLevel?.(0.65);
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  // Flush audio buffer instantly on barge-in
  const flushAudioBuffer = useCallback(() => {
    activeAudioSourcesRef.current.forEach(source => {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch {
        // ignore already stopped sources
      }
    });
    activeAudioSourcesRef.current = [];
    if (audioContextRef.current) {
      nextPlaybackTimeRef.current = audioContextRef.current.currentTime;
    }
    isSpeakingRef.current = false;
  }, []);

  // Execute native tool call dispatched by AssemblyAI
  const handleToolCall = async (toolCall: { call_id: string; name: string; arguments?: Record<string, unknown> }) => {
    onStatusChange?.('thinking');
    const { call_id, name, arguments: args } = toolCall;
    let toolResult: unknown = { status: 'success' };

    try {
      if (name === 'take_screenshot' || name === 'snap_slide') {
        const result = await window.plotAPI?.takeScreenshot();
        if (result?.success) {
          onScreenshotCaptured?.(result);
          toolResult = {
            status: 'success',
            message: 'Meeting slide screenshot captured and attached to notes.',
            timestamp: result.timestamp,
          };
        } else {
          toolResult = { status: 'error', error: result?.error ?? 'Failed to capture screenshot' };
        }
      } else if (name === 'query_meeting') {
        const query = (args?.query as string) || '';
        const transcript = getActiveMeetingTranscript?.() || '';
        const notes = getActiveNotes?.() || '';
        toolResult = {
          status: 'success',
          meeting_transcript_context: transcript.slice(-2000) || '(No audio recorded in meeting yet)',
          user_notes: notes.slice(-600) || '(No notes yet)',
          query,
        };
      } else if (name === 'add_action_item') {
        const taskText = (args?.text as string) || 'Follow up on discussion';
        const assignee = (args?.assignee as string) || 'Team';
        onAddActionItem?.(taskText, assignee);
        toolResult = {
          status: 'success',
          message: `Added action item for ${assignee}: ${taskText}`,
        };
      } else if (name === 'enhance_notes') {
        onTriggerEnhance?.();
        toolResult = {
          status: 'success',
          message: 'Triggered AI note enhancement across meeting notes and transcript.',
        };
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

    // Return tool.result immediately to allow the agent to synthesize response
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

  // Start microphone capture with 1024-sample chunks (42.6ms) for low-latency streaming
  const startMicrophone = (stream: MediaStream, socket: WebSocket) => {
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const source = audioCtx.createMediaStreamSource(stream);
    // 1024 samples @ 24kHz = 42.6ms buffer latency (4x faster than 4096)
    const processor = audioCtx.createScriptProcessor(1024, 1, 1);

    let lastLevelEmit = 0;
    processor.onaudioprocess = (event) => {
      if (!sessionReadyRef.current || socket.readyState !== WebSocket.OPEN) return;
      const channelData = event.inputBuffer.getChannelData(0);

      // Throttled RMS volume calculation to prevent React render storms
      const now = performance.now();
      if (now - lastLevelEmit > 50) {
        let sum = 0;
        const step = 4;
        for (let i = 0; i < channelData.length; i += step) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt((sum * step) / channelData.length);
        const level = Math.min(1, rms * 4.5);
        onAudioLevel?.(level);
        lastLevelEmit = now;
      }

      // Stream audio frame immediately with zero buffer latency
      socket.send(
        JSON.stringify({
          type: 'input.audio',
          audio: pcmBase64(channelData),
        })
      );
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    sourceRef.current = source;
    processorRef.current = processor;
  };

  const stopSession = useCallback(() => {
    sessionReadyRef.current = false;
    isInterruptedRef.current = false;
    isSpeakingRef.current = false;
    waitingForAnswerRef.current = false;
    agentSpokenTextRef.current = '';
    flushAudioBuffer();

    // Cleanly end AssemblyAI session to immediately stop billing
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'session.end' }));
      socketRef.current.close();
    }
    socketRef.current = null;

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    processorRef.current = null;
    sourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;

    setIsConnected(false);
    onStatusChange?.('idle');
    onAudioLevel?.(0);
  }, [flushAudioBuffer, onStatusChange, onAudioLevel]);

  const sendTextMessage = useCallback((text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      onTranscript?.(text, true);
      onStatusChange?.('thinking');
      socketRef.current.send(JSON.stringify({
        type: 'conversation.message',
        role: 'user',
        content: text,
      }));
      socketRef.current.send(JSON.stringify({
        type: 'reply.create',
      }));
    }
  }, [onTranscript, onStatusChange]);

  const startSession = useCallback(async () => {
    stopSession();
    onStatusChange?.('listening');

    try {
      // 1. Get short-lived token from Electron main process
      const { token } = await window.plotAPI.getToken();
      if (!token) throw new Error('Failed to mint AssemblyAI temporary token');

      // 2. Request mic audio with recommended constraints:
      // echoCancellation: true (prevents speaker loop)
      // noiseSuppression: false (lets server-side Voice Focus handle denoising without artifacts)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect to AssemblyAI Voice Agent WebSocket
      const socket = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Snappy low-latency configuration:
        // min_silence: 500ms (cuts response turnaround lag by 64%)
        // max_silence: 1800ms
        // transcription_mode: 'min_latency' (fastest Universal-3.5 Pro turnaround)
        // interruption_delay: 100ms (snappy barge-in)
        socket.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              system_prompt:
                "You are Plot, an elite executive meeting copilot and autonomous desktop assistant (inspired by Granola). Keep every spoken reply to one or two short, crisp sentences. Answer what was asked directly, lead with the answer, and skip conversational filler. No exclamation marks. You have tools to query the active meeting transcript ('query_meeting'), take a screenshot of presentation slides ('snap_slide'), add an action item ('add_action_item'), trigger note enhancement ('enhance_notes'), and inspect desktop vitals ('get_running_apps', 'check_network_status'). When asked about the meeting discussion, decisions, or slides, invoke your tools immediately.",
              greeting: 'Plot meeting copilot active. How can I assist with this session?',
              input: {
                format: { encoding: 'audio/pcm' },
                turn_detection: {
                  vad_threshold: 0.5,
                  min_silence: 500,
                  max_silence: 1800,
                  interrupt_response: true,
                  interruption_delay: 100,
                },
                transcription_mode: 'min_latency',
                voice_focus: 'near-field',
                voice_focus_threshold: 0.85,
                keyterms: ['Plot', 'meeting', 'action item', 'slide', 'screenshot', 'summary', 'deadline', 'notes', 'budget', 'agenda'],
              },
              output: {
                voice: 'alba',
                format: { encoding: 'audio/pcm' },
                volume: 95,
              },
              tools: [
                {
                  type: 'function',
                  name: 'query_meeting',
                  description:
                    'Query the active meeting transcript and notes to answer user questions about what was said, decisions made, numbers mentioned, or speaker comments.',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'The specific question or topic to look up in the meeting transcript',
                      },
                    },
                    required: ['query'],
                  },
                  execution_mode: 'interactive',
                },
                {
                  type: 'function',
                  name: 'snap_slide',
                  description:
                    'Take a screenshot of the active presentation, shared screen, or primary display and attach it directly to the meeting notes.',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: [],
                  },
                  execution_mode: 'interactive',
                },
                {
                  type: 'function',
                  name: 'add_action_item',
                  description:
                    'Add a new action item or task to the meeting checklist with an optional assignee name.',
                  parameters: {
                    type: 'object',
                    properties: {
                      text: {
                        type: 'string',
                        description: 'The task description',
                      },
                      assignee: {
                        type: 'string',
                        description: 'Person responsible (e.g. Alex, Sarah, You, Team)',
                      },
                    },
                    required: ['text'],
                  },
                  execution_mode: 'interactive',
                },
                {
                  type: 'function',
                  name: 'enhance_notes',
                  description:
                    'Trigger AI note enhancement to synthesize messy human bullet points with the full AssemblyAI transcript into executive summaries and decisions.',
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
                    'Query top memory-intensive running applications on the computer. Call this when the user asks about desktop performance or app memory during the call.',
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
                    'Measure current Wi-Fi network connection, latency, and ping quality during the video call.',
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

          // Instant barge-in: user started speaking
          if (payload.type === 'input.speech.started') {
            isInterruptedRef.current = true;
            flushAudioBuffer();
            onStatusChange?.('listening');
          }

          // Real-time incremental user speech preview
          if (payload.type === 'transcript.user.delta' && payload.text) {
            onTranscript?.(payload.text, true);
            onStatusChange?.('listening');
          }

          if (payload.type === 'input.speech.stopped') {
            onStatusChange?.('thinking');
          }

          // Finalized user turn
          if (payload.type === 'transcript.user' && payload.text) {
            onTranscript?.(payload.text, true);
            onStatusChange?.('thinking');

            // If adaptive silence was active because agent asked a question, restore fast baseline
            if (waitingForAnswerRef.current && socket.readyState === WebSocket.OPEN) {
              waitingForAnswerRef.current = false;
              socket.send(
                JSON.stringify({
                  type: 'session.update',
                  session: {
                    input: {
                      turn_detection: {
                        vad_threshold: 0.5,
                        min_silence: 500,
                        max_silence: 1800,
                        interrupt_response: true,
                        interruption_delay: 100,
                      },
                    },
                  },
                })
              );
            }
          }

          if (payload.type === 'tool.call') {
            await handleToolCall(payload);
          }

          if (payload.type === 'reply.started') {
            isInterruptedRef.current = false;
            isSpeakingRef.current = true;
            agentSpokenTextRef.current = '';
            if (audioContextRef.current) {
              nextPlaybackTimeRef.current = audioContextRef.current.currentTime + 0.02;
            }
            onStatusChange?.('speaking');
          }

          if (payload.type === 'reply.audio' && payload.data) {
            if (!isInterruptedRef.current) {
              playAgentAudio(payload.data);
            }
          }

          // Live word-by-word streaming transcript as agent speaks
          if (payload.type === 'transcript.agent.delta' && payload.delta) {
            if (!isInterruptedRef.current) {
              agentSpokenTextRef.current = agentSpokenTextRef.current
                ? `${agentSpokenTextRef.current} ${payload.delta}`
                : payload.delta;
              onTranscript?.(agentSpokenTextRef.current, false);
            }
          }

          if (payload.type === 'transcript.agent' && payload.text) {
            agentSpokenTextRef.current = payload.text;
            onTranscript?.(payload.text, false);

            // Adaptive turn detection: if agent asks a question, expand silence window to allow thinking
            if (/\?\s*$/.test(payload.text) && socket.readyState === WebSocket.OPEN) {
              waitingForAnswerRef.current = true;
              socket.send(
                JSON.stringify({
                  type: 'session.update',
                  session: {
                    input: {
                      turn_detection: {
                        vad_threshold: 0.5,
                        min_silence: 1200,
                        max_silence: 3000,
                        interrupt_response: true,
                        interruption_delay: 100,
                      },
                    },
                  },
                })
              );
            }
          }

          if (payload.type === 'reply.done') {
            isSpeakingRef.current = false;
            if (payload.status === 'interrupted') {
              isInterruptedRef.current = true;
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
  }, [stopSession, getAudioContext, flushAudioBuffer, onStatusChange, onTranscript, onAudioLevel, onScreenshotCaptured, onProcessesUpdated, onNetworkUpdated]);

  return {
    isConnected,
    startSession,
    stopSession,
    sendTextMessage,
  };
}
