'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, DollarSign, Cpu, Loader2, Plus, X } from 'lucide-react';

interface AgentUsage {
  agent: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

interface DayUsage {
  date: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

interface UsageData {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_agent: AgentUsage[];
  by_day: DayUsage[];
}

type Period = 'today' | 'week' | 'month' | 'all';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

const AGENT_COLORS = [
  'bg-cyan-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-orange-500',
];

const AGENT_TEXT_COLORS = [
  'text-cyan-400',
  'text-purple-400',
  'text-green-400',
  'text-yellow-400',
  'text-pink-400',
  'text-orange-400',
];

function formatUSD(val: number): string {
  return `$${val.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const AGENT_OPTIONS = ['Jack', 'Planner', 'Coder', 'Reviewer'];
const MODEL_OPTIONS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-5.1-codex'];

interface LogForm {
  agent: string;
  model: string;
  input_tokens: string;
  output_tokens: string;
  cost_usd: string;
  task_ref: string;
}

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>({
    agent: 'Jack', model: 'claude-opus-4-6',
    input_tokens: '', output_tokens: '', cost_usd: '', task_ref: '',
  });
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState('');

  const fetchUsage = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?period=${p}`);
      if (res.ok) {
        const json = await res.json() as UsageData;
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(period);
  }, [period, fetchUsage]);

  async function handleLogSubmit() {
    setLogError('');
    const input = parseInt(logForm.input_tokens, 10);
    const output = parseInt(logForm.output_tokens, 10);
    const cost = parseFloat(logForm.cost_usd);
    if (!logForm.agent || !logForm.model || isNaN(input) || isNaN(output) || isNaN(cost)) {
      setLogError('All fields except task ref are required');
      return;
    }
    setLogSaving(true);
    try {
      const res = await fetch('/api/usage/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: logForm.agent,
          model: logForm.model,
          input_tokens: input,
          output_tokens: output,
          cost_usd: cost,
          task_ref: logForm.task_ref,
        }),
      });
      if (res.ok) {
        setShowLogModal(false);
        setLogForm({ agent: 'Jack', model: 'claude-opus-4-6', input_tokens: '', output_tokens: '', cost_usd: '', task_ref: '' });
        fetchUsage(period);
      } else {
        const err = await res.json() as { error: string };
        setLogError(err.error ?? 'Failed to log usage');
      }
    } catch {
      setLogError('Failed to log usage');
    } finally {
      setLogSaving(false);
    }
  }

  const maxAgentCost = data?.by_agent.length
    ? Math.max(...data.by_agent.map((a) => a.cost))
    : 1;

  const maxDayCost = data?.by_day.length
    ? Math.max(...data.by_day.map((d) => d.cost))
    : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-cyan-400" size={24} />
            Usage & Costs
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">API token usage and cost tracking per agent</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={15} /> Log Usage
        </button>
      </div>

      {/* Log Usage Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Log Usage</h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Agent</label>
                  <select
                    value={logForm.agent}
                    onChange={(e) => setLogForm({ ...logForm, agent: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {AGENT_OPTIONS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Model</label>
                  <select
                    value={logForm.model}
                    onChange={(e) => setLogForm({ ...logForm, model: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {MODEL_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Input Tokens</label>
                  <input
                    type="number" min={0}
                    value={logForm.input_tokens}
                    onChange={(e) => setLogForm({ ...logForm, input_tokens: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Output Tokens</label>
                  <input
                    type="number" min={0}
                    value={logForm.output_tokens}
                    onChange={(e) => setLogForm({ ...logForm, output_tokens: e.target.value })}
                    placeholder="e.g. 8000"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Cost (USD)</label>
                  <input
                    type="number" min={0} step="0.001"
                    value={logForm.cost_usd}
                    onChange={(e) => setLogForm({ ...logForm, cost_usd: e.target.value })}
                    placeholder="e.g. 0.270"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Task Ref (optional)</label>
                  <input
                    type="text"
                    value={logForm.task_ref}
                    onChange={(e) => setLogForm({ ...logForm, task_ref: e.target.value })}
                    placeholder="e.g. Batch 2 build"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              {logError && <p className="text-red-400 text-sm">{logError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLogModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogSubmit}
                disabled={logSaving}
                className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {logSaving ? 'Saving…' : 'Log Usage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Tabs */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.id
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Cost */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-cyan-400" />
                <span className="text-slate-400 text-sm font-medium">Total Cost</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {data ? `$${(data.total_cost).toFixed(4)}` : '$0.0000'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {PERIODS.find((p) => p.id === period)?.label}
              </div>
            </div>

            {/* Total Tokens */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={16} className="text-purple-400" />
                <span className="text-slate-400 text-sm font-medium">Total Tokens</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {data ? formatTokens(data.total_input_tokens + data.total_output_tokens) : '0'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {data ? (
                  <span>
                    <span className="text-slate-400">{formatTokens(data.total_input_tokens)}</span>
                    {' in · '}
                    <span className="text-slate-400">{formatTokens(data.total_output_tokens)}</span>
                    {' out'}
                  </span>
                ) : '0 in · 0 out'}
              </div>
            </div>

            {/* Agents active */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-green-400" />
                <span className="text-slate-400 text-sm font-medium">Agents Active</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {data?.by_agent.length ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {data?.by_agent.map((a) => a.agent).join(', ') || 'None'}
              </div>
            </div>
          </div>

          {/* Per-agent breakdown */}
          {data && data.by_agent.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-base font-semibold text-white mb-4">Cost by Agent</h2>
              <div className="space-y-4">
                {data.by_agent.map((a, i) => {
                  const pct = maxAgentCost > 0 ? (a.cost / maxAgentCost) * 100 : 0;
                  const colorBar = AGENT_COLORS[i % AGENT_COLORS.length];
                  const colorText = AGENT_TEXT_COLORS[i % AGENT_TEXT_COLORS.length];
                  const share = data.total_cost > 0 ? ((a.cost / data.total_cost) * 100).toFixed(0) : '0';
                  return (
                    <div key={a.agent}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${colorText}`}>{a.agent}</span>
                          <span className="text-xs text-slate-500">{share}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-white">{formatUSD(a.cost)}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            {formatTokens(a.input_tokens + a.output_tokens)} tokens
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colorBar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily trend */}
          {data && data.by_day.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-base font-semibold text-white mb-4">Daily Cost Trend</h2>
              <div className="flex items-end gap-1.5 h-32">
                {data.by_day.map((d) => {
                  const heightPct = maxDayCost > 0 ? (d.cost / maxDayCost) * 100 : 0;
                  const label = d.date.slice(5); // MM-DD
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group min-w-0" title={`${d.date}: ${formatUSD(d.cost)}`}>
                      <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                        <div
                          className="w-full bg-cyan-500/60 hover:bg-cyan-400/80 rounded-t transition-colors cursor-default"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-600 truncate w-full text-center">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>$0</span>
                <span>{formatUSD(maxDayCost)}</span>
              </div>
            </div>
          )}

          {data && data.by_agent.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg">No usage data for this period</p>
              <p className="text-sm mt-1">Usage will appear here as agents process tasks</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
