'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckSquare, CheckCircle2, Activity, ArrowRight, Circle, Loader2,
  FolderKanban, FlaskConical, Plus, MessageSquare, BarChart3,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  updated_at: string;
}

interface AgentStatus {
  id: number;
  agent_name: string;
  status: string;
  effective_status?: string;
  current_activity: string;
  last_seen: string;
}

interface ActivityEntry {
  id: number;
  type: string;
  message: string;
  metadata: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ActivityIcon({ type }: { type: string }) {
  const cls = 'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0';
  switch (type) {
    case 'task_created':
      return <div className={`${cls} bg-cyan-900/30`}><CheckSquare size={14} className="text-cyan-400" /></div>;
    case 'task_moved':
      return <div className={`${cls} bg-slate-700/60`}><ArrowRight size={14} className="text-slate-400" /></div>;
    case 'task_completed':
      return <div className={`${cls} bg-green-900/30`}><CheckCircle2 size={14} className="text-green-400" /></div>;
    case 'agent_status_change':
      return <div className={`${cls} bg-yellow-900/30`}><Activity size={14} className="text-yellow-400" /></div>;
    case 'project_created':
      return <div className={`${cls} bg-purple-900/30`}><FolderKanban size={14} className="text-purple-400" /></div>;
    case 'rd_cycle_started':
      return <div className={`${cls} bg-blue-900/30`}><FlaskConical size={14} className="text-blue-400" /></div>;
    default:
      return <div className={`${cls} bg-slate-700/60`}><CheckSquare size={14} className="text-slate-400" /></div>;
  }
}

const STATUS_DOT: Record<string, string> = {
  active: 'text-green-400',
  working: 'text-yellow-400',
  idle: 'text-slate-500',
  busy: 'text-yellow-400',
  offline: 'text-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Online',
  working: 'Working',
  idle: 'Idle',
  busy: 'Busy',
  offline: 'Offline',
};

export default function HomePage() {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [todayCost, setTodayCost] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rdLoading, setRdLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, statusRes, activityRes, usageRes, notifRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/status'),
        fetch('/api/activity'),
        fetch('/api/usage?period=today'),
        fetch('/api/notifications'),
      ]);

      const [tasksData, statusData, activityData, usageData, notifData] = await Promise.all([
        tasksRes.json(),
        statusRes.json(),
        activityRes.json(),
        usageRes.json(),
        notifRes.json(),
      ]);

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setAgents(Array.isArray(statusData) ? statusData : []);
      setActivity(Array.isArray(activityData) ? activityData.slice(0, 10) : []);
      setTodayCost(typeof usageData?.total_cost === 'number' ? usageData.total_cost : null);
      setUnreadCount(Array.isArray(notifData) ? notifData.length : 0);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function triggerRdCycle() {
    setRdLoading(true);
    try {
      const res = await fetch('/api/memos/trigger', { method: 'POST' });
      if (res.ok) {
        addToast('R&D cycle started', 'success');
        fetchData();
      } else {
        addToast('Failed to trigger R&D cycle', 'error');
      }
    } catch {
      addToast('Failed to trigger R&D cycle', 'error');
    } finally {
      setRdLoading(false);
    }
  }

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const activeAgents = agents.filter((a) => (a.effective_status || a.status) !== 'offline').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-slate-400 text-sm mt-0.5">Operations overview — live</p>
      </div>

      {/* Top row: 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Link href="/tasks" className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/50">
              <CheckSquare size={18} className="text-cyan-400" />
            </div>
            <span className="text-slate-400 text-xs font-medium">Total Tasks</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{tasks.length}</div>
          <div className="text-xs text-slate-500 space-x-2">
            <span className="text-slate-400">{todoCount} todo</span>
            <span>·</span>
            <span className="text-yellow-400">{inProgressCount} active</span>
            <span>·</span>
            <span className="text-green-400">{doneCount} done</span>
          </div>
        </Link>

        {/* Today's Cost */}
        <Link href="/usage" className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 hover:border-green-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/50">
              <BarChart3 size={18} className="text-green-400" />
            </div>
            <span className="text-slate-400 text-xs font-medium">Today&apos;s Cost</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {todayCost !== null ? `$${todayCost.toFixed(4)}` : '—'}
          </div>
          <div className="text-xs text-slate-500">API usage today</div>
        </Link>

        {/* Active Agents */}
        <Link href="/teams" className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/50">
              <Activity size={18} className="text-purple-400" />
            </div>
            <span className="text-slate-400 text-xs font-medium">Active Agents</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{activeAgents}</div>
          <div className="text-xs text-slate-500">of {agents.length} registered</div>
        </Link>

        {/* Unread Notifications */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/50">
              <CheckCircle2 size={18} className="text-yellow-400" />
            </div>
            <span className="text-slate-400 text-xs font-medium">Notifications</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{unreadCount}</div>
          <div className="text-xs text-slate-500">unread alerts</div>
        </div>
      </div>

      {/* Middle: Activity + Agent Status */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity (2/3) */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              Recent Activity
            </h2>
            <span className="text-xs text-slate-500">Last 10 events</span>
          </div>
          {activity.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">No activity yet</div>
          ) : (
            <div className="space-y-1">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-slate-700/40 last:border-0">
                  <ActivityIcon type={entry.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{entry.message}</div>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Status (1/3) */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Circle size={8} className="fill-current text-green-400" />
              Agent Status
            </h2>
            <span className="text-xs text-slate-500">Live</span>
          </div>
          <div className="space-y-3">
            {agents.map((agent) => {
              const effectiveStatus = agent.effective_status || agent.status;
              return (
                <div key={agent.id} className="flex items-start gap-3">
                  <Circle
                    size={8}
                    className={`fill-current mt-1.5 flex-shrink-0 ${STATUS_DOT[effectiveStatus] || STATUS_DOT.idle}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200">{agent.agent_name}</span>
                      <span className={`text-xs flex-shrink-0 ${STATUS_DOT[effectiveStatus] || 'text-slate-500'}`}>
                        {STATUS_LABEL[effectiveStatus] || effectiveStatus}
                      </span>
                    </div>
                    {agent.current_activity && (
                      <div className="text-xs text-slate-500 truncate mt-0.5">{agent.current_activity}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {agents.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">No agents registered</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Quick Actions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tasks?create=true"
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={16} /> New Task
          </Link>
          <button
            onClick={triggerRdCycle}
            disabled={rdLoading}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            {rdLoading ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            Run R&amp;D Cycle
          </button>
          <Link
            href="/chat"
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            <MessageSquare size={16} /> Open Chat
          </Link>
          <Link
            href="/usage"
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            <BarChart3 size={16} /> View Usage
          </Link>
        </div>
      </div>
    </div>
  );
}
