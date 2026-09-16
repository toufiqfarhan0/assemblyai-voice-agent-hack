# Plot

Autonomous, voice-directed desktop intelligence powered by the AssemblyAI Voice Agent API and native Electron OS automation.

---

## Overview

Plot is an autonomous desktop companion that transforms spoken voice into native operating system actions. Built as a native desktop application combining Electron, React 19, and the AssemblyAI Voice Agent API, Plot leverages bidirectional WebSocket streaming and JSON-Schema Tool Calling to diagnose system performance, inspect active processes, monitor network health, and capture live desktop screenshots in real time.

Built for the AssemblyAI Voice Agent Hackathon hosted on lablab.ai.

---

## Core Capabilities

- **Real-Time Full-Duplex Voice**: Low-latency bidirectional audio streaming using AssemblyAI Universal-3 Pro and Voice Activity Detection (VAD).
- **JSON-Schema Tool Calling**: Dynamic intent detection that triggers native operating system automation tools autonomously.
- **Desktop Screen Capture**: Spoken commands trigger native desktop screenshots for instant visual context and diagnostic review.
- **Process & Memory Telemetry**: Query active applications, locate runaway background processes, and inspect resource utilization hands-free.
- **Network & Connectivity Diagnostics**: Real-time Wi-Fi signal inspection, gateway ping latency, and IP telemetry spoken back to the user.
- **Global Push-to-Talk Hotkey**: System-wide shortcut (`Ctrl+Shift+Space`) activates the voice agent from any application.
- **Spoken Audio Synthesis**: Natural turn-taking with synthesized vocal responses played through the Web Audio API with instant barge-in flushing.

---

## System Architecture

```text
+-------------------------------------------------------------------------------+
|                            OPERATING SYSTEM (WINDOWS)                         |
|   Screens  •  Processes  •  Wi-Fi Adapter  •  Microphone  •  Global Hotkeys   |
+-------------------------------------------------------------------------------+
                                        ▲
                                        │ Native OS Calls
                                        ▼
+-------------------------------------------------------------------------------+
|                           MAIN PROCESS (Node.js Runtime)                      |
|                                                                               |
|   - Window Manager: Controls transparent, frameless, always-on-top HUD        |
|   - Global Hotkey Manager: Registers system-wide 'Ctrl+Shift+Space'           |
|   - Token Dispatcher: Securely holds ASSEMBLYAI_API_KEY (never exposed to UI) |
|   - Native Action Handlers:                                                   |
|       * Screen Capture: native desktop display buffer capture                 |
|       * Process Manager: Windows PowerShell Get-Process / taskkill            |
|       * Network Telemetry: netsh wlan show interfaces & gateway ping          |
+-------------------------------------------------------------------------------+
                                        ▲
                                        │ IPC (ipcMain <--> ipcRenderer)
                                        ▼
+-------------------------------------------------------------------------------+
|                     PRELOAD SCRIPT (Context Isolation Bridge)                 |
|                                                                               |
|   contextBridge.exposeInMainWorld('plotAPI', {                                |
|     takeScreenshot: () => ipcRenderer.invoke('os:take-screenshot'),           |
|     getRunningApps: (limit) => ipcRenderer.invoke('os:get-apps', limit),      |
|     checkNetwork: () => ipcRenderer.invoke('os:check-network'),               |
|     getToken: () => ipcRenderer.invoke('auth:get-token'),                     |
|     onHotkeyTriggered: (callback) => ipcRenderer.on('hotkey:voice', callback) |
|   })                                                                          |
+-------------------------------------------------------------------------------+
                                        ▲
                                        │ Safe Typed API (window.plotAPI)
                                        ▼
+-------------------------------------------------------------------------------+
|                     RENDERER PROCESS (React 19 + Tailwind CSS)                |
|                                                                               |
|   - UI: Frosted glass command card with iridescent 3D orb & fluid waveform    |
|   - Web Audio Pipeline: 24kHz PCM16 Mono capture & gapless audio playback     |
|   - WebSocket Controller: Direct connection to AssemblyAI Voice Agent         |
|   - Tool Calling Dispatcher: Bridges AssemblyAI 'tool.call' to 'plotAPI'      |
+-------------------------------------------------------------------------------+
                                        ▲
                                        │ Full-Duplex WebSocket
                                        ▼
+-------------------------------------------------------------------------------+
|                        ASSEMBLYAI VOICE AGENT ENGINE                          |
|             Universal-3 Pro  •  VAD  •  Tool Calling  •  TTS                  |
+-------------------------------------------------------------------------------+
```

---

## Tool Calling Protocol

Plot registers structured JSON-schema tools over the AssemblyAI WebSocket session:

### 1. `take_screenshot`
Captures the primary display buffer and renders the preview inside the desktop console.
- **Parameters**: `None`
- **Output**: Base64 image payload and capture timestamp.

### 2. `get_running_apps`
Queries the operating system for active processes sorted by memory consumption.
- **Parameters**: `limit` (integer, default: 5)
- **Output**: Array of active processes, PID, and memory usage in MB.

### 3. `check_network_status`
Measures interface connectivity, adapter name, signal quality, and gateway latency.
- **Parameters**: `None`
- **Output**: Wi-Fi SSID, signal percentage, IP address, and ping latency in ms.

---

## Technology Stack

- **Desktop Framework**: Electron 35
- **Voice Intelligence**: AssemblyAI Voice Agent API (Universal-3 Pro, VAD, JSON-Schema Tool Calling)
- **User Interface**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Icons**: Lucide React
- **Audio Capture & Synthesis**: Web Audio API (PCM16 24kHz mono encoder, AudioBufferSourceNode)
- **OS Automation**: Node.js `child_process`, Windows PowerShell, Netsh

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
   Ensure a `.env` file exists in the project root:
   ```env
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
   ```

4. Launch the desktop application:
   ```bash
   pnpm dev
   ```

---

## Security Architecture

The client renderer process operates in a sandbox with context isolation enabled. The permanent `ASSEMBLYAI_API_KEY` resides strictly within the Electron Main process and is never exposed to the frontend DOM. Ephemeral session tokens (`expires_in_seconds=300`) are generated on demand for WebSocket negotiation.

---

## License

MIT License. Built for the AssemblyAI Voice Agent Hackathon.
