'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import {
  ArrowLeft, Edit2, Trash2, FolderKanban, GitCommit, GitPullRequest,
  GitMerge, CheckSquare, Clock, CheckCircle2, Loader2, X, Save,
} from 'lucide-react';

function renderMd(text: string): string {
  if (!text) return '';
  return marked(text, { async: false }) as string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'med' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  project_id: number | null;
  parent_id: number | null;
  subtask_count: number;
  blocked_by: number | null;
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

interface ProjectDetail {
  id: number;
  name: string;
  description: string;
  status: string;
  progress: number;
  priority: string;
  created_at: string;
  updated_at: string;
  tasks: Task[];
  git_events: GitEvent[];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function GitIcon({ type }: { type: string }) {
  if (type === 'pr_merged') return <GitMerge size={12} className="text-purple-400 shrink-0" />;
  if (type === 'pr_opened' || type === 'pr_closed') return <GitPullRequest size={12} className="text-blue-400 shrink-0" />;
  return <GitCommit size={12} className="text-green-400 shrink-0" />;
}

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
  low: 'Low', med: 'Medium', high: 'High',
};

const PROGRESS_COLOR: Record<string, string> = {
  active: 'bg-cyan-500',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  archived: 'bg-slate-500',
};

const TASK_STATUS_BADGE: Record<string, string> = {
  todo: 'bg-slate-700 text-slate-300 border-slate-600',
  in_progress: 'bg-yellow-900/40 text-yellow-400 border-yellow-700',
  done: 'bg-green-900/40 text-green-400 border-green-700',
};

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  todo: <CheckSquare size={14} className="text-slate-400" />,
  in_progress: <Clock size={14} className="text-yellow-400" />,
  done: <CheckCircle2 size={14} className="text-green-400" />,
};

const TASK_GROUPS: { id: string; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'active', progress: 0, priority: 'med' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        setError('Project not found');
        return;
      }
      const data = await res.json() as ProjectDetail;
      setProject(data);
      setForm({
        name: data.name,
        description: data.description || '',
        status: data.status,
        progress: data.progress,
        priority: data.priority,
      });
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function handleSave() {
    if (!form.name.trim()) {
      setEditError('Name is required');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowEdit(false);
      fetchProject();
    } catch {
      setEditError('Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this project? Tasks will be unlinked but not deleted.')) return;
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    router.push('/projects');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 mb-4">{error || 'Project not found'}</p>
        <Link href="/projects" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 justify-center">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>
    );
  }

  const grouped = TASK_GROUPS.reduce<Record<string, Task[]>>((acc, g) => {
    acc[g.id] = project.tasks.filter((t) => t.status === g.id);
    return acc;
  }, { todo: [], in_progress: [], done: [] });

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm transition-colors">
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban size={20} className="text-cyan-400 flex-shrink-0" />
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_BADGE[project.status] || STATUS_BADGE.active}`}>
                {project.status}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_BADGE[project.priority] || PRIORITY_BADGE.med}`}>
                {PRIORITY_LABEL[project.priority] || project.priority}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                {project.tasks.filter((t) => t.status === 'done').length}/{project.tasks.length} tasks
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-900/20 hover:bg-cyan-900/30 border border-cyan-800/50 rounded-xl transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
              title="Delete project"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-medium text-slate-300">{project.progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${PROGRESS_COLOR[project.status] || PROGRESS_COLOR.active}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content: 2 columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Description + Tasks (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Description</h2>
              <div
                className="prose-dark text-slate-200 text-sm leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-200 [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5 [&_li]:text-slate-300 [&_code]:bg-slate-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-cyan-300 [&_code]:text-xs [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-cyan-400 [&_a]:underline [&_strong]:text-white [&_hr]:border-slate-700 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-500 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic"
                dangerouslySetInnerHTML={{ __html: renderMd(project.description) }}
              />
            </div>
          )}

          {/* Tasks grouped by status */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Tasks</h2>
            {project.tasks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No tasks linked to this project</p>
            ) : (
              <div className="space-y-4">
                {TASK_GROUPS.map((group) => {
                  const tasks = grouped[group.id];
                  if (tasks.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <div className="flex items-center gap-2 mb-2">
                        {TASK_STATUS_ICON[group.id]}
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label}</span>
                        <span className="text-xs text-slate-600">({tasks.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {tasks.map((task) => (
                          <Link
                            key={task.id}
                            href="/tasks"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/40 hover:bg-slate-700/70 transition-colors group"
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'med' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${TASK_STATUS_BADGE[task.status]}`}>
                              {task.status === 'in_progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Done'}
                            </span>
                            <span className="text-xs text-slate-600 hidden group-hover:block">@{task.assignee}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Git + Metadata (1/3) */}
        <div className="space-y-6">
          {/* Git activity */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Git Activity</h2>
            {project.git_events.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-4">No git events</p>
            ) : (
              <div className="space-y-3">
                {project.git_events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <GitIcon type={ev.type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 leading-snug line-clamp-2">{ev.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-slate-500">{ev.sha.slice(0, 7)}</span>
                        {ev.author && <span>· {ev.author}</span>}
                        <span>· {relativeTime(ev.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Project ID</span>
                <span className="text-slate-300 font-mono">#{project.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-300 text-xs">{new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Updated</span>
                <span className="text-slate-300 text-xs">{new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tasks</span>
                <span className="text-slate-300">{project.tasks.filter((t) => t.status === 'done').length} / {project.tasks.length} done</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Edit Project</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-red-400 text-sm">{editError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500">
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Progress</label>
                  <input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowEdit(false)} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
