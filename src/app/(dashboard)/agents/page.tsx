'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, ChevronDown, ChevronUp, Loader2,
  CheckCircle, XCircle, Wrench, FileCode, Terminal,
  Clock, Cpu, DollarSign,
} from 'lucide-react';

interface ToolCall {
  tool: string;
  args_summary: string;
  result_summary: string;
}

interface AgentSession {
  id: number;
  agent: string;
  session_type: string;
  title: string;
  summary: string;
  tool_calls: string;
  files_changed: string;
  commands_run: string;
  tokens_used: number;
  cost_usd: number;
  duration_seconds: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

const AGENT_TABS = ['All', 'Jack', 'Planner', 'Coder', 'Reviewer'];

const AGENT_COLORS: Record<string, string> = {
  Jack: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  Planner: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  Coder: 'bg-green-500/20 text-green-400 border-green-500/40',
  Reviewer: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
};

const AGENT_AVATARS: Record<string, string> = {
  Jack: '🌀',
  Planner: '🧠',
  Coder: '💻',
  Reviewer: '🔍',
};

const SESSION_TYPE_BADGE: Record<string, string> = {
  task: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700',
  heartbeat: 'bg-slate-700 text-slate-400 border border-slate-600',
  rd_cycle: 'bg-purple-900/40 text-purple-400 border border-purple-700',
  chat: 'bg-blue-900/40 text-blue-400 border border-blue-700',
};

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1.5 text-blue-400 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        Running
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
        <XCircle size={12} />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
      <CheckCircle size={12} />
      Completed
    </span>
  );
}

function SessionCard({ session }: { session: AgentSession }) {
  const [expanded, setExpanded] = useState(false);

  let toolCalls: ToolCall[] = [];
  let filesChanged: string[] = [];
  let commandsRun: string[] = [];
  try { toolCalls = JSON.parse(session.tool_calls) as ToolCall[]; } catch { /* ignore */ }
  try { filesChanged = JSON.parse(session.files_changed) as string[]; } catch { /* ignore */ }
  try { commandsRun = JSON.parse(session.commands_run) as string[]; } catch { /* ignore */ }

  const agentColor = AGENT_COLORS[session.agent] ?? 'bg-slate-700 text-slate-300 border-slate-600';
  const avatar = AGENT_AVATARS[session.agent] ?? '🤖';
  const typeBadge = SESSION_TYPE_BADGE[session.session_type] ?? SESSION_TYPE_BADGE.task;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Agent avatar + info */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base flex-shrink-0 ${agentColor}`}>
              {avatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${agentColor}`}>
                  {session.agent}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-lg ${typeBadge}`}>
                  {session.session_type.replace('_', ' ')}
                </span>
                <StatusIndicator status={session.status} />
              </div>
              <h3 className="text-sm font-semibold text-white leading-tight">{session.title}</h3>
              {session.summary && (
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{session.summary}</p>
              )}
            </div>
          </div>
          {/* Timestamp */}
          <div className="text-slate-500 text-xs flex-shrink-0 text-right">
            {relativeTime(session.started_at)}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/60">
          <span className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock size={12} />
            {formatDuration(session.duration_seconds)}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Cpu size={12} />
            {session.tokens_used.toLocaleString()} tokens
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 text-xs">
            <DollarSign size={12} />
            ${session.cost_usd.toFixed(3)}
          </span>

          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 text-slate-500 hover:text-cyan-400 text-xs transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-4 bg-slate-900/30">
          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={13} className="text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">Tool Calls ({toolCalls.length})</span>
              </div>
              <div className="space-y-1.5">
                {toolCalls.map((tc, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-cyan-400 font-mono font-semibold flex-shrink-0">{tc.tool}</span>
                    <span className="text-slate-400 flex-1">{tc.args_summary}</span>
                    {tc.result_summary && (
                      <span className="text-green-400 flex-shrink-0">{tc.result_summary}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files changed */}
          {filesChanged.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCode size={13} className="text-purple-400" />
                <span className="text-xs font-semibold text-slate-300">Files Changed ({filesChanged.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filesChanged.map((f, i) => (
                  <span key={i} className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Commands run */}
          {commandsRun.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal size={13} className="text-green-400" />
                <span className="text-xs font-semibold text-slate-300">Commands Run ({commandsRun.length})</span>
              </div>
              <div className="space-y-1">
                {commandsRun.map((cmd, i) => (
                  <div key={i} className="text-xs font-mono bg-slate-950 text-green-300 px-3 py-1.5 rounded-lg">
                    $ {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  const fetchSessions = useCallback(async (agent: string, off: number, append = false) => {
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (agent !== 'All') params.set('agent', agent);
      const res = await fetch(`/api/agent-sessions?${params}`);
      if (res.ok) {
        const data = await res.json() as { sessions: AgentSession[]; total: number };
        setSessions(prev => append ? [...prev, ...data.sessions] : data.sessions);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setSessions([]);
    fetchSessions(activeTab, 0, false).finally(() => setLoading(false));
  }, [activeTab, fetchSessions]);

  async function loadMore() {
    setLoadingMore(true);
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    await fetchSessions(activeTab, newOffset, true);
    setLoadingMore(false);
  }

  const hasMore = sessions.length < total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center">
            <ScrollText size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agent Logs</h1>
            <p className="text-slate-400 text-sm">Session timeline — what agents actually did</p>
          </div>
        </div>
        <div className="text-slate-500 text-sm">{total} sessions</div>
      </div>

      {/* Agent selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {AGENT_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeTab === tab
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {tab === 'All' ? '🌐 All' : `${AGENT_AVATARS[tab] ?? '🤖'} ${tab}`}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-cyan-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ScrollText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sessions found{activeTab !== 'All' ? ` for ${activeTab}` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                Show more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
