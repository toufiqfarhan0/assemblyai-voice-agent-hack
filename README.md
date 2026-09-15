# Plot

Autonomous, voice-directed desktop intelligence powered by the AssemblyAI Voice Agent API.

---

## Overview

Plot is an autonomous desktop companion that transforms spoken voice into native operating system actions. Rather than functioning as a passive conversational chatbot, Plot leverages AssemblyAI's JSON-Schema Tool Calling engine over WebSocket to diagnose operating system performance, inspect active processes, monitor network health, and capture live desktop screenshots in real time.

Built for the AssemblyAI Voice Agent Hackathon hosted on lablab.ai.

---

## Core Capabilities

- **Real-Time Full-Duplex Voice**: Low-latency bidirectional audio streaming using AssemblyAI Universal-3 Pro and Voice Activity Detection (VAD).
- **JSON-Schema Tool Calling**: Dynamic intent detection that triggers client-side and system-level tools autonomously.
- **Desktop Screen Capture**: Spoken commands trigger native desktop screenshots for instant visual context and diagnostic review.
- **Process & Memory Telemetry**: Query active applications, locate runaway background processes, and inspect resource utilization hands-free.
- **Network & Connectivity Diagnostics**: Real-time Wi-Fi signal inspection, gateway ping latency, and IP telemetry spoken back to the user.
- **Spoken Audio Synthesis**: Natural turn-taking with synthesized vocal responses played through the Web Audio API.

---

## System Architecture

```text
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|                                                                               |
|  +---------------------+   +---------------------+   +---------------------+  |
|  | Live Voice Capture  |   | Screen Preview Box  |   | System Diagnostics  |  |
|  | (24kHz PCM16 Mono)  |   | (Live Screenshot)   |   | (Apps, CPU, Wi-Fi)  |  |
|  +----------+----------+   +----------^----------+   +----------^----------+  |
+-------------|-------------------------|-------------------------|-------------+
              |                         |                         |
              | 1. Audio Stream         | 4. Tool Execution       | 4. Spoken
              v    (PCM16 Frames)       |    (Screenshot / Net)   |    Diagnosis
+---------------------------------------+-------------------------+-------------+
|                           LOCAL SYSTEM CONTROLLER                             |
|                        Node.js Runtime & OS Bridge                            |
|                                                                               |
|   - Generates ephemeral AssemblyAI session tokens                             |
|   - Executes system tools: screenshot, tasklist, netsh                        |
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

Plot exposes structured JSON-schema tools over the AssemblyAI WebSocket session:

### 1. `take_screenshot`
Captures the primary monitor buffer and displays the preview inside the desktop console.
- **Parameters**: `None`
- **Output**: Base64 image payload and file URI.

### 2. `get_running_apps`
Queries the operating system for active processes sorted by memory consumption.
- **Parameters**: `limit` (integer, default: 5)
- **Output**: Array of active processes, PID, memory usage (MB), and CPU time.

### 3. `check_network_status`
Measures interface connectivity, adapter name, signal quality, and gateway latency.
- **Parameters**: `ping_target` (string, optional)
- **Output**: Wi-Fi SSID, signal percentage, IP address, and latency (ms).

---

## Technology Stack

- **Speech & Voice Agent**: AssemblyAI Voice Agent API (WebSocket, Universal-3 Pro, VAD, Tool Calling)
- **Frontend Interface**: React 19, TypeScript, Vite, Tailwind CSS
- **Audio Processing**: Web Audio API (PCM16 encoder, 24kHz downsampler, AudioBuffer queue)
- **System Bridge**: Node.js, Express, PowerShell native bindings
- **Icons & Styling**: Lucide React, Tailwind CSS

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
