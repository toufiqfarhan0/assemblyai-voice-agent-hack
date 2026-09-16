import { Camera, Cpu, Wifi, Activity } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: 'screenshot' | 'processes' | 'network' | 'health') => void;
  disabled?: boolean;
}

export default function QuickActions({ onAction, disabled = false }: QuickActionsProps) {
  const actions = [
    { id: 'screenshot' as const, label: 'Screen Audit', icon: Camera, desc: 'Capture & diagnose display' },
    { id: 'processes' as const, label: 'Memory Hogs', icon: Cpu, desc: 'Top RAM-consuming apps' },
    { id: 'network' as const, label: 'Wi-Fi Latency', icon: Wifi, desc: 'Signal & ping diagnostics' },
    { id: 'health' as const, label: 'System Vitals', icon: Activity, desc: 'Full OS performance check' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 select-none">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            onClick={() => onAction(act.id)}
            disabled={disabled}
            className="glass-pill group flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-slate-300 shadow-sm transition hover:text-white disabled:opacity-50"
            title={act.desc}
          >
            <Icon className="h-3.5 w-3.5 text-indigo-400 transition-transform duration-200 group-hover:scale-110 group-hover:text-cyan-300" />
            <span>{act.label}</span>
          </button>
        );
      })}
    </div>
  );
}
