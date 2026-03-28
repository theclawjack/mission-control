'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Search, Wrench, FlaskConical, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface Memo {
  id: number;
  title: string;
  summary: string | null;
  visionary_input: string | null;
  analyst_input: string | null;
  pragmatist_input: string | null;
  debate: string | null;
  recommendations: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

const agents = [
  {
    name: 'Visionary',
    model: 'Opus 4.6',
    icon: Lightbulb,
    accent: 'purple',
    description: 'Bold ideas & emerging trends',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
  },
  {
    name: 'Analyst',
    model: 'Sonnet 4.6',
    icon: Search,
    accent: 'blue',
    description: 'Critical analysis & gap finding',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  {
    name: 'Pragmatist',
    model: 'GPT Codex',
    icon: Wrench,
    accent: 'green',
    description: 'Feasibility & revenue optimization',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    iconBg: 'bg-green-500/20',
  },
];

function StatusBadge({ status }: { status: Memo['status'] }) {
  const map = {
    pending: { label: 'Pending', cls: 'bg-slate-700 text-slate-300', icon: Clock },
    in_progress: { label: 'In Progress', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', icon: Loader2 },
    completed: { label: 'Completed', cls: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: CheckCircle2 },
  };
  const { label, cls, icon: Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function MemoSection({
  emoji,
  title,
  content,
  accentClass,
  borderClass,
  bgClass,
}: {
  emoji: string;
  title: string;
  content: string | null;
  accentClass: string;
  borderClass: string;
  bgClass: string;
}) {
  if (!content) return null;
  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-4`}>
      <h4 className={`text-sm font-semibold ${accentClass} mb-2`}>
        {emoji} {title}
      </h4>
      <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  );
}

function MemoCard({ memo }: { memo: Memo }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dt: string) => {
    return new Date(dt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasDetails =
    memo.visionary_input ||
    memo.analyst_input ||
    memo.pragmatist_input ||
    memo.debate ||
    memo.recommendations;

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-600/70">
      {/* Card header */}
      <button
        onClick={() => hasDetails && setExpanded((e) => !e)}
        className={`w-full text-left px-5 py-4 flex items-start gap-3 ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h3 className="text-white font-semibold text-sm">{memo.title}</h3>
            <StatusBadge status={memo.status} />
          </div>
          {memo.summary && (
            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{memo.summary}</p>
          )}
          <p className="text-slate-600 text-xs mt-2">{formatDate(memo.created_at)}</p>
        </div>
        {hasDetails && (
          <div className="text-slate-500 mt-1 flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </button>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-700/50 pt-4">
          <MemoSection
            emoji="💡"
            title="Visionary's Ideas"
            content={memo.visionary_input}
            accentClass="text-purple-400"
            borderClass="border-purple-500/30"
            bgClass="bg-purple-500/5"
          />
          <MemoSection
            emoji="🔍"
            title="Analyst's Critique"
            content={memo.analyst_input}
            accentClass="text-blue-400"
            borderClass="border-blue-500/30"
            bgClass="bg-blue-500/5"
          />
          <MemoSection
            emoji="🔧"
            title="Pragmatist's Plan"
            content={memo.pragmatist_input}
            accentClass="text-green-400"
            borderClass="border-green-500/30"
            bgClass="bg-green-500/5"
          />
          <MemoSection
            emoji="⚔️"
            title="Debate Summary"
            content={memo.debate}
            accentClass="text-orange-400"
            borderClass="border-orange-500/30"
            bgClass="bg-orange-500/5"
          />
          {memo.recommendations && (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
              <h4 className="text-sm font-semibold text-cyan-400 mb-2">✅ Final Recommendations</h4>
              <div className="text-cyan-100 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                {memo.recommendations}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RDLabPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/memos')
      .then((r) => r.json())
      .then((data) => {
        setMemos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function triggerCycle() {
    setTriggering(true);
    try {
      const res = await fetch('/api/memos/trigger', { method: 'POST' });
      if (res.ok) {
        const newMemo = await res.json();
        setMemos((prev) => [newMemo, ...prev]);
        setToast('🧪 R&D cycle triggered');
        setTimeout(() => setToast(''), 3000);
      } else {
        setToast('❌ Failed to trigger cycle');
        setTimeout(() => setToast(''), 3000);
      }
    } catch {
      setToast('❌ Network error');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-4 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur-sm animate-fade-in">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center">
                  <FlaskConical className="text-cyan-400" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-white">🧪 R&amp;D Lab</h1>
              </div>
              <p className="text-slate-400 text-sm ml-13 pl-0.5">AI Research &amp; Development Team</p>
            </div>
            <button
              onClick={triggerCycle}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-500/60 text-cyan-300 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-60"
            >
              <RefreshCw size={15} className={triggering ? 'animate-spin' : ''} />
              {triggering ? 'Triggering…' : 'Run R&D Cycle'}
            </button>
          </div>
        </div>

        {/* Agent Team Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.name}
                className={`rounded-xl border ${agent.border} ${agent.bg} p-4`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 ${agent.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon size={16} className={agent.text} />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${agent.text}`}>{agent.name}</div>
                    <div className="text-slate-500 text-xs">{agent.model}</div>
                  </div>
                </div>
                <p className="text-slate-400 text-xs leading-snug">{agent.description}</p>
              </div>
            );
          })}
        </div>

        {/* Memos Section */}
        <div>
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Research Memos
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading memos…
            </div>
          ) : memos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🔬</div>
              <h3 className="text-slate-300 font-semibold text-lg mb-2">No R&amp;D memos yet</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                The team runs automatically every 12 hours, or trigger a cycle manually using the button above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {memos.map((memo) => (
                <MemoCard key={memo.id} memo={memo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
