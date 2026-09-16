# Plot

Autonomous, voice-directed desktop intelligence powered by the AssemblyAI Voice Agent API.

---

## Overview

Plot is an autonomous desktop companion that transforms spoken voice into native operating system actions. Rather than functioning as a passive conversational chatbot, Plot leverages AssemblyAI's JSON-Schema Tool Calling engine over WebSocket to diagnose operating system performance, inspect active processes, monitor network health, and capture live desktop screenshots in real time.

Built for the AssemblyAI Voice Agent Hackathon hosted on lablab.ai.

---

## Interface Design

Plot features an ambient, frosted-glass interface optimized for hands-free desktop interaction:

- **Iridescent Pearl Core**: A central procedural orb that pulses organically in response to audio input, vocal frequency, and agent states (idle, listening, thinking, speaking).
- **Undulating Audio Waveform**: A fluid sinusoidal audio visualizer that reflects real-time audio volume and turn-taking states.
- **Glassmorphic Command Capsule**: A floating bottom input pill with quick diagnostic action chips (Take Screenshot, Inspect RAM, Check Wi-Fi, Full Audit).
- **Live Telemetry Panels**: Non-intrusive frosted cards displaying desktop screenshots, running process tables, and network signal gauges.

---

## Core Capabilities

- **Real-Time Full-Duplex Voice**: Low-latency bidirectional audio streaming using AssemblyAI Universal-3 Pro and Voice Activity Detection (VAD).
- **JSON-Schema Tool Calling**: Dynamic intent detection that triggers client-side and system-level tools autonomously.
- **Desktop Screen Capture**: Spoken commands trigger native desktop screenshots for instant visual context and diagnostic review.
- **Process & Memory Telemetry**: Query active applications, locate runaway background processes, and inspect resource utilization hands-free.
- **Network & Connectivity Diagnostics**: Real-time Wi-Fi signal inspection, gateway ping latency, and IP telemetry spoken back to the user.
- **Spoken Audio Synthesis**: Natural turn-taking with synthesized vocal responses played through the Web Audio API with instant barge-in interruption flushing.

---

## System Architecture

```text
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|                   React 19  •  Vite  •  Tailwind CSS                          |
|                                                                               |
|  +---------------------+   +---------------------+   +---------------------+  |
|  | Iridescent Pearl    |   | Live Screen Preview |   | Process & Network   |  |
|  | & Audio Waveform    |   | (Native Screenshot) |   | Telemetry Cards     |  |
|  +----------+----------+   +----------^----------+   +----------^----------+  |
+-------------|-------------------------|-------------------------|-------------+
              |                         |                         |
              | 1. PCM16 Audio Stream   | 4. Tool Execution       | 4. Spoken
              v    (24kHz Mono Base64)  |    (Screenshot / Net)   |    Diagnosis
+---------------------------------------+-------------------------+-------------+
|                           LOCAL SYSTEM CONTROLLER                             |
|                        Node.js Runtime & OS Bridge                            |
|                                                                               |
|   - Generates ephemeral AssemblyAI session tokens (/api/voice-agent-token)    |
|   - Executes system tools: screenshot, PowerShell tasklist, netsh             |
+---------------------------------------+---------------------------------------+
                                        |
                                        | 2. WebSocket Connection
                                        |    w/ Defined Tool Schemas
                                        v
+-------------------------------------------------------------------------------+
|                        ASSEMBLYAI VOICE AGENT ENGINE                          |
|                                                                               |
|   - Real-time Speech-to-Text (Universal-3 Pro)                                |
|   - Turn-taking and Voice Activity Detection (VAD)                            |
|   - Tool Calling Classifier (JSON Schema evaluation)                          |
|   - Real-time Text-to-Speech (TTS) audio response generation                  |
+-------------------------------------------------------------------------------+
```

---

## Tool Calling Protocol

Plot registers structured JSON-schema tools with the AssemblyAI Voice Agent session:

### 1. `take_screenshot`
Captures the primary monitor buffer and displays the preview inside the desktop console.
- **Parameters**: `None`
- **Output**: Base64 image payload and local file path.

### 2. `get_running_apps`
Queries the operating system for active processes sorted by memory consumption.
- **Parameters**: `limit` (integer, default: 5)
- **Output**: Array of active processes, PID, memory usage (MB), and CPU time.

### 3. `check_network_status`
Measures interface connectivity, adapter name, signal quality, and gateway latency.
- **Parameters**: `ping_target` (string, optional)
- **Output**: Wi-Fi SSID, signal percentage, IP address, and latency (ms).

### 4. `kill_process`
Terminates a specific unresponsive or resource-heavy application.
- **Parameters**: `process_name` (string, required)
- **Output**: Process termination status and memory freed.

---

## Voice Commands to Try

- "Take a screenshot of my screen."
- "What apps are running right now, and what is eating up my RAM?"
- "Check my Wi-Fi connection and ping latency."
- "Close Chrome if it's lagging the computer."
- "Run a complete diagnostic on my machine."

---

## Technology Stack

- **Speech & Voice Agent**: AssemblyAI Voice Agent API (WebSocket, Universal-3 Pro, VAD, Tool Calling)
- **Frontend Interface**: React 19, TypeScript, Vite, Tailwind CSS
- **Audio Processing**: Web Audio API (PCM16 encoder, 24kHz downsampler, AudioBuffer queue, barge-in flusher)
- **System Bridge**: Node.js, Express, PowerShell native bindings
- **Visuals**: Procedural CSS/Canvas Iridescent Sphere, Sinusoidal Waveform Canvas, Lucide Icons

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm 9 or higher
- AssemblyAI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/toufiqfarhan0/assemblyai-voice-agent-hack.git
   cd assemblyai-voice-agent-hack
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   Create a `.env` file in the project root:
   ```env
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
   PORT=3000
   ```

4. Launch development environment:
   ```bash
   pnpm dev
   ```

---

## Security Model

The client interface never receives or exposes the permanent `ASSEMBLYAI_API_KEY`. The local backend issues short-lived, ephemeral session tokens (`expires_in_seconds=300`), which the browser utilizes to establish the authenticated WebSocket connection directly with AssemblyAI.

---

## License

MIT License. Built for the AssemblyAI Voice Agent Hackathon.
