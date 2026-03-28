'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckSquare, Clock, CheckCircle2, Users, Plus, CalendarDays,
  Loader2, Activity, ArrowRight, Circle, Zap,
} from 'lucide-react';

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
  current_activity: string;
  last_seen: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  model: string;
  status: string;
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

const ACTIVITY_ICON: Record<string, string> = {
  task_created: '📋',
  task_moved: '↔️',
  task_completed: '✅',
  agent_status_change: '🤖',
  project_created: '📁',
  rd_cycle_started: '🧪',
};

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

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  med: 'bg-yellow-500',
  low: 'bg-green-500',
};

const STATUS_TEXT: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const STATUS_BADGE: Record<string, string> = {
  todo: 'bg-slate-700 text-slate-300',
  in_progress: 'bg-yellow-900/40 text-yellow-400',
  done: 'bg-green-900/40 text-green-400',
};

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, statusRes, teamRes, activityRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/status'),
        fetch('/api/team'),
        fetch('/api/activity'),
      ]);
      const [tasksData, statusData, teamData, activityData] = await Promise.all([
        tasksRes.json(),
        statusRes.json(),
        teamRes.json(),
        activityRes.json(),
      ]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setAgents(Array.isArray(statusData) ? statusData : []);
      setTeam(Array.isArray(teamData) ? teamData : []);
      setActivity(Array.isArray(activityData) ? activityData.slice(0, 10) : []);
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

  const totalTasks = tasks.length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const teamCount = team.length;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  const stats = [
    { label: 'Total Tasks', value: totalTasks, icon: CheckSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Completed', value: done, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: 'Team Members', value: teamCount, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Operations overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`${stat.bg} border rounded-xl p-4 flex items-center gap-4`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} bg-slate-800/50`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-slate-400 text-xs">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agent Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              Agent Status
            </h2>
            <span className="text-xs text-slate-500">Live</span>
          </div>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Circle
                    size={10}
                    className={`fill-current ${STATUS_DOT[agent.status] || STATUS_DOT.idle}`}
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{agent.agent_name}</div>
                    {agent.current_activity && (
                      <div className="text-xs text-slate-500 truncate max-w-[180px]">{agent.current_activity}</div>
                    )}
                  </div>
                </div>
                <span className={`text-xs ${STATUS_DOT[agent.status] || 'text-slate-500'}`}>
                  {STATUS_LABEL[agent.status] || agent.status}
                </span>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">No agents registered</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <CheckSquare size={16} className="text-cyan-400" />
              Recent Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.med}`} />
                  <span className="text-sm text-slate-200 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[task.status] || STATUS_BADGE.todo}`}>
                    {STATUS_TEXT[task.status] || task.status}
                  </span>
                  <span className="text-xs text-slate-600">@{task.assignee}</span>
                </div>
              </div>
            ))}
            {recentTasks.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8">No tasks yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Zap size={16} className="text-cyan-400" />
            Recent Activity
          </h2>
          <span className="text-xs text-slate-500">Last 10 events</span>
        </div>
        {activity.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">No activity yet</div>
        ) : (
          <div className="space-y-2">
            {activity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-1.5 border-b border-slate-700/40 last:border-0">
                <span className="text-base flex-shrink-0 mt-0.5">{ACTIVITY_ICON[entry.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{entry.message}</div>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 mt-0.5">{timeAgo(entry.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/tasks"
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} /> New Task
        </Link>
        <Link
          href="/calendar"
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <CalendarDays size={16} /> Calendar
        </Link>
        <Link
          href="/projects"
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <CheckSquare size={16} /> Projects
        </Link>
        <Link
          href="/teams"
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Users size={16} /> Team
        </Link>
      </div>
    </div>
  );
}
