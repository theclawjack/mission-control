'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Users, Cpu, CheckCircle, Clock, AlertCircle, MinusCircle, Target, Pencil, Save, type LucideIcon } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  current_task: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  active: {
    label: 'Active',
    color: 'text-green-400',
    bg: 'bg-green-900/40 border border-green-700',
    icon: CheckCircle,
  },
  idle: {
    label: 'Idle',
    color: 'text-slate-400',
    bg: 'bg-slate-800 border border-slate-600',
    icon: MinusCircle,
  },
  busy: {
    label: 'Busy',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/40 border border-yellow-700',
    icon: Clock,
  },
  offline: {
    label: 'Offline',
    color: 'text-red-400',
    bg: 'bg-red-900/40 border border-red-700',
    icon: AlertCircle,
  },
};

const MODEL_BADGE: Record<string, string> = {
  'claude-opus-4-6': 'bg-violet-900/40 text-violet-300 border border-violet-700',
  'claude-sonnet-4-6': 'bg-blue-900/40 text-blue-300 border border-blue-700',
  'claude-haiku-4-5': 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
};

function getModelBadge(model: string) {
  return MODEL_BADGE[model] || 'bg-slate-800 text-slate-300 border border-slate-600';
}

function getAvatarColors(name: string): string {
  const colors = [
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-green-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-yellow-500 to-amber-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const emptyForm = {
  name: '',
  role: '',
  model: 'claude-sonnet-4-6',
  status: 'idle',
  current_task: '',
};

const DEFAULT_MISSION = 'Building an autonomous AI operations team that proactively manages, researches, and delivers value.';

export default function TeamsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Mission statement state
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [editingMission, setEditingMission] = useState(false);
  const [missionDraft, setMissionDraft] = useState('');
  const [savingMission, setSavingMission] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMission = useCallback(async () => {
    try {
      const res = await fetch('/api/settings?key=mission_statement');
      const data = await res.json();
      if (data.value) setMission(data.value);
    } catch {
      // keep default
    }
  }, []);

  async function saveMission() {
    setSavingMission(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'mission_statement', value: missionDraft }),
      });
      setMission(missionDraft);
      setEditingMission(false);
    } catch {
      // ignore
    } finally {
      setSavingMission(false);
    }
  }

  useEffect(() => {
    fetchMembers();
    fetchMission();
  }, [fetchMembers, fetchMission]);

  function openCreate() {
    setEditingMember(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  }

  function openEdit(member: TeamMember) {
    setEditingMember(member);
    setForm({
      name: member.name,
      role: member.role,
      model: member.model,
      status: member.status,
      current_task: member.current_task || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.role.trim() || !form.model.trim()) {
      setError('Name, role, and model are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingMember) {
        await fetch(`/api/team/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      fetchMembers();
    } catch {
      setError('Failed to save agent');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this agent from the roster?')) return;
    await fetch(`/api/team/${id}`, { method: 'DELETE' });
    fetchMembers();
  }

  const activeCount = members.filter((m) => m.status === 'active').length;
  const busyCount = members.filter((m) => m.status === 'busy').length;

  return (
    <div className="p-6">
      {/* Mission Statement */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-cyan-400" />
            <h2 className="font-semibold text-white text-sm">Mission Statement</h2>
          </div>
          {!editingMission ? (
            <button
              onClick={() => { setMissionDraft(mission); setEditingMission(true); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
              title="Edit mission"
            >
              <Pencil size={14} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingMission(false)}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveMission}
                disabled={savingMission}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                {savingMission ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          )}
        </div>
        {editingMission ? (
          <textarea
            value={missionDraft}
            onChange={(e) => setMissionDraft(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
            autoFocus
          />
        ) : (
          <p className="text-slate-300 text-sm leading-relaxed italic">&ldquo;{mission}&rdquo;</p>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-cyan-400" size={24} />
            Teams
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {members.length} agent{members.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-green-400">{activeCount} active</span>
            {busyCount > 0 && <>, <span className="text-yellow-400">{busyCount} busy</span></>}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Add Agent
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((member) => {
            const statusConf = STATUS_CONFIG[member.status] || STATUS_CONFIG.idle;
            const StatusIcon = statusConf.icon;
            const avatarGradient = getAvatarColors(member.name);

            return (
              <div
                key={member.id}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-colors group relative"
              >
                {/* Edit/delete buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(member)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base leading-tight">{member.name}</h3>
                    <p className="text-slate-400 text-sm truncate">{member.role}</p>
                  </div>
                </div>

                {/* Model badge */}
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={12} className="text-slate-500 flex-shrink-0" />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${getModelBadge(member.model)}`}>
                    {member.model}
                  </span>
                </div>

                {/* Status badge */}
                <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                  <StatusIcon size={11} />
                  {statusConf.label}
                </div>

                {/* Current task */}
                {member.current_task && (
                  <div className="mt-3 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Current task</p>
                    <p className="text-xs text-slate-300 line-clamp-2">{member.current_task}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingMember ? 'Edit Agent' : 'Add Agent'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Agent name"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Role *</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Planning & Strategy"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Model *</label>
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="claude-opus-4-6">claude-opus-4-6</option>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                  <option value="claude-opus-4-5">claude-opus-4-5</option>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gemini-pro">gemini-pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Task</label>
                <textarea
                  value={form.current_task}
                  onChange={(e) => setForm({ ...form, current_task: e.target.value })}
                  placeholder="What is this agent working on?"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingMember ? 'Save Changes' : 'Add Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
