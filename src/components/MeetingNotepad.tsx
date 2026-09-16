import { useState } from 'react';
import {
  Sparkles,
  Camera,
  CheckSquare,
  Copy,
  Check,
  FileText,
  Calendar,
  Users,
  Image as ImageIcon,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import type { EnrichedMeetingNotes, ScreenshotResult } from '../vite-env';

export interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  done: boolean;
}

interface MeetingNotepadProps {
  meetingTitle: string;
  onMeetingTitleChange: (title: string) => void;
  rawNotes: string;
  onRawNotesChange: (notes: string) => void;
  enrichedNotes: EnrichedMeetingNotes | null;
  actionItems: ActionItem[];
  onToggleActionItem: (id: string) => void;
  onAddActionItem: (text: string, assignee: string) => void;
  slides: ScreenshotResult[];
  isEnhancing: boolean;
  onEnhance: () => void;
  onSnapSlide: () => void;
}

export default function MeetingNotepad({
  meetingTitle,
  onMeetingTitleChange,
  rawNotes,
  onRawNotesChange,
  enrichedNotes,
  actionItems,
  onToggleActionItem,
  onAddActionItem,
  slides,
  isEnhancing,
  onEnhance,
  onSnapSlide,
}: MeetingNotepadProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'enriched'>(enrichedNotes ? 'enriched' : 'editor');
  const [copied, setCopied] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('You');
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);

  // Switch to enriched tab when new enriched notes arrive
  if (enrichedNotes && activeTab === 'editor' && rawNotes.trim().length > 0 && !isEnhancing) {
    // leave it accessible via tab
  }

  const handleCopy = () => {
    const textToCopy = enrichedNotes?.rawMarkdown || rawNotes;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    onAddActionItem(newActionText.trim(), newActionAssignee);
    setNewActionText('');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/60 p-5 backdrop-blur-xl border-r border-white/10">
      {/* Header Area */}
      <div className="flex flex-col gap-2 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => onMeetingTitleChange(e.target.value)}
              className="bg-transparent text-lg font-bold tracking-tight text-white placeholder-slate-500 outline-none hover:border-b hover:border-white/20 focus:border-b focus:border-purple-400"
              placeholder="Meeting Title..."
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Copy notes as markdown"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={onSnapSlide}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 shadow-sm"
              title="Capture meeting presentation screen"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Snap Slide</span>
            </button>

            <button
              onClick={onEnhance}
              disabled={isEnhancing}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500 px-3.5 py-1 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
              title="Synthesize human notes with AssemblyAI transcript"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
              <span>{isEnhancing ? 'Enhancing...' : 'Enhance (AI)'}</span>
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-500" />
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-slate-500" />
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-300">You</span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-300">Alex</span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-300">Sarah</span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mt-1 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1 text-xs">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 rounded-lg py-1 font-semibold transition ${
              activeTab === 'editor'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Notes (Raw)
          </button>
          <button
            onClick={() => setActiveTab('enriched')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 font-semibold transition ${
              activeTab === 'enriched'
                ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-white border border-purple-400/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>AI Enriched Notes</span>
            {enrichedNotes && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto py-3 pr-1">
        {activeTab === 'editor' ? (
          <div className="flex h-full flex-col">
            <textarea
              value={rawNotes}
              onChange={(e) => onRawNotesChange(e.target.value)}
              placeholder="Type your sparse, messy notes during the call...&#10;&#10;• alex needs pricing estimates by friday&#10;• budget confirmed at $50k&#10;• follow up with sarah on UI specs&#10;&#10;When ready, click 'Enhance (AI)' to blend your bullets with what was actually said in the AssemblyAI transcript!"
              className="h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Executive Summary Card */}
            {enrichedNotes ? (
              <>
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/40 p-4 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Executive Summary</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-100 font-medium">
                    {enrichedNotes.summary}
                  </p>
                </div>

                {/* Key Decisions */}
                {enrichedNotes.decisions?.length > 0 && (
                  <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span>Key Decisions</span>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                      {enrichedNotes.decisions.map((dec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                          <span>{dec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Enriched Sections (Original vs Transcript Context) */}
                {enrichedNotes.enhancedSections?.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Detailed Discussions
                    </span>
                    {enrichedNotes.enhancedSections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs"
                      >
                        <div className="font-semibold text-white">
                          {sec.originalNote}
                        </div>
                        <div className="mt-1 text-slate-300 leading-relaxed">
                          {sec.enrichedContext}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Sparkles className="h-8 w-8 text-purple-400/60 mb-2" />
                <p className="text-sm font-medium text-slate-300">No enriched notes yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Type bullet points in My Notes, start the meeting transcript, then click <strong className="text-purple-300">Enhance (AI)</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Items Section */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <ListTodo className="h-3.5 w-3.5 text-emerald-400" />
              <span>Action Items ({actionItems.filter((a) => a.done).length}/{actionItems.length})</span>
            </div>
          </div>

          {/* Checklist */}
          <div className="mt-2.5 space-y-1.5">
            {actionItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No action items recorded yet.</p>
            ) : (
              actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onToggleActionItem(item.id)}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                        item.done
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                          : 'border-white/30 bg-transparent text-transparent hover:border-white/50'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>
                    <span className={item.done ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {item.text}
                    </span>
                  </div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {item.assignee}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Add Action Item Bar */}
          <form onSubmit={handleCreateAction} className="mt-2.5 flex items-center gap-1.5">
            <input
              type="text"
              value={newActionText}
              onChange={(e) => setNewActionText(e.target.value)}
              placeholder="Add action item..."
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-purple-400"
            />
            <input
              type="text"
              value={newActionAssignee}
              onChange={(e) => setNewActionAssignee(e.target.value)}
              placeholder="Assignee"
              className="w-20 rounded-xl border border-white/10 bg-slate-900/60 px-2 py-1.5 text-center text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-purple-600 hover:text-white"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Attached Slide Snaps */}
        {slides.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
              <span>Meeting Slide Captures ({slides.length})</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {slides.map((slide, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedSlide(slide.base64)}
                  className="group relative overflow-hidden rounded-xl border border-white/15 bg-slate-900/80 cursor-pointer"
                >
                  <img
                    src={slide.base64}
                    alt={`Slide ${idx + 1}`}
                    className="h-24 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-1.5 text-[10px] text-slate-300">
                    Snap {idx + 1} • {slide.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Slide Modal Preview */}
      {selectedSlide && (
        <div
          onClick={() => setSelectedSlide(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-8 backdrop-blur-md cursor-pointer"
        >
          <div className="relative max-w-4xl overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
            <img src={selectedSlide} alt="Slide Preview" className="max-h-[80vh] w-auto object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
