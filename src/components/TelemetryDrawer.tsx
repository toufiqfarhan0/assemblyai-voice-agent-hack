import { X, ExternalLink, Wifi, Cpu, Clock, RefreshCw } from 'lucide-react';
import type { ScreenshotResult, RunningProcess, NetworkStatus } from '../vite-env';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  screenshot: ScreenshotResult | null;
  processes: RunningProcess[];
  network: NetworkStatus | null;
  onRefreshProcesses: () => void;
  onRefreshNetwork: () => void;
}

export default function TelemetryDrawer({
  isOpen,
  onClose,
  screenshot,
  processes,
  network,
  onRefreshProcesses,
  onRefreshNetwork,
}: TelemetryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-md transition-all duration-300">
      <div className="h-full w-full max-w-md border-l border-white/10 bg-slate-900/90 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <h2 className="text-base font-semibold text-white">System Telemetry & Artifacts</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Screenshot Section */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                Latest Display Capture
              </span>
              {screenshot?.timestamp && <span className="text-[11px] font-mono">{screenshot.timestamp}</span>}
            </div>

            {screenshot?.base64 ? (
              <div className="group relative overflow-hidden rounded-xl border border-white/15 bg-slate-950 shadow-inner">
                <img
                  src={screenshot.base64}
                  alt="Desktop Screen Capture"
                  className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-md">
                    <ExternalLink className="h-3 w-3" /> Screen Audited
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-xs text-slate-500">
                No screenshot captured yet. Say "Take a screenshot"
              </div>
            )}
          </div>

          {/* Network & Wi-Fi Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Wifi className="h-3.5 w-3.5 text-cyan-400" />
                Wi-Fi & Connectivity
              </span>
              <button onClick={onRefreshNetwork} className="text-slate-500 hover:text-white" title="Refresh">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {network ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>{network.ssid}</span>
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] text-cyan-300 border border-cyan-500/30">
                    {network.signal}% Signal
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-slate-400">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Local IP</span>
                    <span className="font-mono text-slate-300">{network.ip}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Ping Latency</span>
                    <span className="font-mono text-slate-300">{network.gatewayPingMs} ms</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">
                Network status unavailable
              </div>
            )}
          </div>

          {/* Running Processes Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                Top Memory Hogs
              </span>
              <button onClick={onRefreshProcesses} className="text-slate-500 hover:text-white" title="Refresh">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {processes.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {processes.map((proc, index) => (
                  <div
                    key={`${proc.pid}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-slate-500">#{proc.pid}</span>
                      <span className="font-medium text-slate-200 truncate">{proc.name}</span>
                    </div>
                    <span className="font-mono text-slate-300 font-semibold">{proc.memoryMB} MB</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">
                Say "What apps are running?" to inspect
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/10 pt-4 text-[11px] text-slate-500 text-center">
          Plot Native OS Bridge • Windows Execution
        </div>
      </div>
    </div>
  );
}
