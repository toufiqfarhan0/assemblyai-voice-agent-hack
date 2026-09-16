import { useState, useRef, useCallback, useEffect } from 'react';

export interface TranscriptTurn {
  id: string;
  timestamp: string;
  timeSeconds: number;
  speaker: string;
  text: string;
  isFinal: boolean;
}

export interface UseRealtimeSTTOptions {
  onTurn?: (turn: TranscriptTurn) => void;
  onAudioLevel?: (level: number) => void;
  sampleRate?: number;
}

export function useRealtimeSTT(options: UseRealtimeSTTOptions = {}) {
  const { onTurn, onAudioLevel, sampleRate = 16000 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState('');
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef(0);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Convert Float32 to 16-bit PCM Linear Binary
  const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output.buffer;
  };

  // Stop recording and close connections
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ terminate_session: true }));
          socketRef.current.close();
        }
      } catch {
        // ignore close error
      }
      socketRef.current = null;
    }

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    processorRef.current = null;
    sourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;

    setIsRecording(false);
    setIsConnected(false);
    setCurrentUtterance('');
    onAudioLevel?.(0);
  }, [onAudioLevel]);

  // Start real-time microphone & system audio transcription
  const startRecording = useCallback(async () => {
    stopRecording();
    setDurationSeconds(0);
    durationRef.current = 0;

    try {
      // 1. Get temporary token for AssemblyAI streaming STT
      const { token } = await window.plotAPI.getSTTToken();
      if (!token) throw new Error('Failed to acquire AssemblyAI STT token');

      // 2. Request microphone audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect to AssemblyAI Streaming v3 WebSocket
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(
        token
      )}&sample_rate=${sampleRate}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setIsRecording(true);

        // Start meeting duration timer
        timerRef.current = setInterval(() => {
          durationRef.current += 1;
          setDurationSeconds(durationRef.current);
        }, 1000);

        // Audio capture pipeline
        const audioCtx = new AudioContext({ sampleRate });
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(2048, 1, 1);

        let lastLevel = 0;
        processor.onaudioprocess = (e) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const channel = e.inputBuffer.getChannelData(0);

          // Audio level metering
          const now = performance.now();
          if (now - lastLevel > 60) {
            let sum = 0;
            for (let i = 0; i < channel.length; i += 4) {
              sum += channel[i] * channel[i];
            }
            const rms = Math.sqrt((sum * 4) / channel.length);
            onAudioLevel?.(Math.min(1, rms * 4));
            lastLevel = now;
          }

          // Send raw binary PCM16 chunk
          const pcm = floatTo16BitPCM(channel);
          socket.send(pcm);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
        sourceRef.current = source;
        processorRef.current = processor;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          // Handle v3 Turn Event
          if (data.type === 'Turn' || data.message_type === 'PartialTranscript' || data.message_type === 'FinalTranscript') {
            const text = data.transcript || data.text || '';
            const isFinal = data.end_of_turn === true || data.message_type === 'FinalTranscript';

            if (!isFinal) {
              setCurrentUtterance(text);
            } else if (text.trim()) {
              const turn: TranscriptTurn = {
                id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: formatTime(durationRef.current),
                timeSeconds: durationRef.current,
                speaker: data.speaker ? `Speaker ${data.speaker}` : 'You',
                text: text.trim(),
                isFinal: true,
              };

              setTurns((prev) => [...prev, turn]);
              onTurn?.(turn);
              setCurrentUtterance('');
            }
          }
        } catch (err) {
          console.error('Error parsing STT message:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('AssemblyAI Streaming STT WebSocket error:', err);
        stopRecording();
      };

      socket.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
      };
    } catch (err) {
      console.error('Failed to start streaming STT:', err);
      stopRecording();
    }
  }, [stopRecording, sampleRate, onAudioLevel, onTurn]);

  // Demo Standup Meeting Simulator for instant review and judge demonstration
  const simulateDemoMeeting = useCallback(() => {
    stopRecording();
    setTurns([]);
    setCurrentUtterance('');
    setDurationSeconds(0);
    durationRef.current = 0;
    setIsRecording(true);
    setIsConnected(true);

    const script = [
      {
        speaker: 'Alex (Engineering)',
        text: "Good morning team. Let's do our quick sync. The AssemblyAI Real-time Streaming STT integration is running at sub-300ms latency.",
        delay: 1000,
      },
      {
        speaker: 'Sarah (Design)',
        text: 'Awesome. I finished the Granola split-pane workspace. The notes editor separates original human bullet points from AI-enriched summaries.',
        delay: 4500,
      },
      {
        speaker: 'David (Product)',
        text: 'Fantastic work. Remember our enterprise client demo is on Friday at 2 PM. We must lock in the action items checklist by Thursday night.',
        delay: 9000,
      },
      {
        speaker: 'Alex (Engineering)',
        text: 'Understood. I will also wire up the Voice Agent API so the user can ask spoken questions directly over the meeting notes.',
        delay: 14000,
      },
      {
        speaker: 'Sarah (Design)',
        text: 'I will finalize the slide snapshot capture and export to Markdown. Let us wrap up and get building.',
        delay: 18500,
      },
    ];

    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDurationSeconds(durationRef.current);
    }, 1000);

    script.forEach((item, index) => {
      // Partial streaming preview
      setTimeout(() => {
        setCurrentUtterance(item.text.slice(0, Math.floor(item.text.length * 0.45)) + '...');
        onAudioLevel?.(0.5);
      }, item.delay);

      // Finalized turn
      setTimeout(() => {
        const turn: TranscriptTurn = {
          id: `demo-${index}-${Date.now()}`,
          timestamp: formatTime(durationRef.current),
          timeSeconds: durationRef.current,
          speaker: item.speaker,
          text: item.text,
          isFinal: true,
        };
        setTurns((prev) => [...prev, turn]);
        onTurn?.(turn);
        setCurrentUtterance('');
        onAudioLevel?.(0);

        if (index === script.length - 1) {
          setIsRecording(false);
          setIsConnected(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, item.delay + 2200);
    });
  }, [stopRecording, onAudioLevel, onTurn]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const fullTranscriptText = turns.map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`).join('\n');

  return {
    isRecording,
    isConnected,
    currentUtterance,
    turns,
    fullTranscriptText,
    durationSeconds,
    formattedDuration: formatTime(durationSeconds),
    startRecording,
    stopRecording,
    simulateDemoMeeting,
    clearTranscript: () => setTurns([]),
  };
}
