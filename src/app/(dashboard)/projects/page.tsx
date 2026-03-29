'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, Loader2, FolderKanban, GitCommit, GitPullRequest, GitMerge, RefreshCw } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  progress: number;
  priority: 'low' | 'med' | 'high';
  task_count: number;
  done_task_count: number;
  created_at: string;
  updated_at: string;
}

interface GitEvent {
  id: number;
  type: string;
  repo: string;
  branch: string;
  title: string;
  author: string;
  sha: string;
  url: string;
  project_id: number | null;
  created_at: string;
}

function GitIcon({ type }: { type: string }) {
  if (type === 'pr_merged') return <GitMerge size={12} className="text-purple-400 shrink-0" />;
  if (type === 'pr_opened' || type === 'pr_closed') return <GitPullRequest size={12} className="text-blue-400 shrink-0" />;
  return <GitCommit size={12} className="text-green-400 shrink-0" />;
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

type FilterTab = 'all' | 'active' | 'completed' | 'archived';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-900/40 text-green-400 border border-green-700',
  paused: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700',
  completed: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700',
  archived: 'bg-slate-700 text-slate-400 border border-slate-600',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-green-900/40 text-green-400 border border-green-800',
  med: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  high: 'bg-red-900/40 text-red-400 border border-red-800',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  med: 'Medium',
  high: 'High',
};

const PROGRESS_COLOR: Record<string, string> = {
  active: 'bg-cyan-500',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  archived: 'bg-slate-500',
};

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
];

const emptyForm = {
  name: '',
  description: '',
  status: 'active',
  progress: 0,
  priority: 'med',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [gitEvents, setGitEvents] = useState<GitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json() as Project[];
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGitEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/git');
      if (res.ok) {
        const data = await res.json() as GitEvent[];
        setGitEvents(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchGitEvents();
  }, [fetchProjects, fetchGitEvents]);

  const filtered = filter === 'all'
    ? projects
    : projects.filter((p) => p.status === filter);

  function openCreate() {
    setEditingProject(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description || '',
      status: project.status,
      progress: project.progress,
      priority: project.priority,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingProject) {
        await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      fetchProjects();
    } catch {
      setError('Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    fetchProjects();
  }

  async function handleGitSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/git/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { synced: number };
        await fetchGitEvents();
        alert(`Synced ${data.synced} new commit${data.synced !== 1 ? 's' : ''} from GitHub`);
      } else {
        alert('Sync failed. Check gh CLI auth.');
      }
    } catch {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderKanban className="text-cyan-400" size={24} />
            Projects
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGitSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync GitHub'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => {
          const count = tab.id === 'all' ? projects.length : projects.filter((p) => p.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FolderKanban size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">No projects {filter !== 'all' ? `with status "${filter}"` : 'yet'}</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors group relative"
            >
              {/* Title + actions */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <Link href={`/projects/${project.id}`} className="font-semibold text-white text-base leading-snug flex-1 hover:text-cyan-300 transition-colors">
                  {project.name}
                </Link>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Progress</span>
                  <span className="text-xs font-medium text-slate-300">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${PROGRESS_COLOR[project.status] || PROGRESS_COLOR.active}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center flex-wrap gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[project.status]}`}>
                  {project.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[project.priority]}`}>
                  {PRIORITY_LABEL[project.priority]}
                </span>
                {project.task_count > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                    {project.done_task_count}/{project.task_count} tasks
                  </span>
                )}
              </div>

              {/* Git Activity */}
              {(() => {
                const events = gitEvents.filter((e) => e.project_id === project.id).slice(0, 3);
                if (events.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="text-xs text-slate-500 font-medium mb-2">Recent Activity</div>
                    <div className="space-y-2">
                      {events.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2">
                          <GitIcon type={ev.type} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-300 truncate leading-snug">{ev.title}</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              <span className="font-mono text-slate-500">{ev.sha.slice(0, 7)}</span>
                              {ev.author && <span className="ml-1">by {ev.author}</span>}
                              <span className="ml-1">{relativeTime(ev.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingProject ? 'Edit Project' : 'New Project'}
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Project name"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Progress</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress}
                    onChange={(e) => setForm({ ...form, progress: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
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
                {editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
