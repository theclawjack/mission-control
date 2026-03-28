'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, X, Loader2, FolderKanban, ListTree, ChevronDown } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

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
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

type Status = 'todo' | 'in_progress' | 'done';

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'border-slate-600' },
  { id: 'in_progress', label: 'In Progress', color: 'border-yellow-600' },
  { id: 'done', label: 'Done', color: 'border-green-700' },
];

const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done'];

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-green-500',
  med: 'border-l-yellow-500',
  high: 'border-l-red-500',
};
const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-green-900/40 text-green-400 border border-green-800',
  med: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  high: 'bg-red-900/40 text-red-400 border border-red-800',
};
const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-green-500',
  med: 'bg-yellow-500',
  high: 'bg-red-500',
};

const COLUMN_HEADER_STYLE: Record<Status, string> = {
  todo: 'bg-slate-800/60 border-slate-600',
  in_progress: 'bg-yellow-900/20 border-yellow-700/50',
  done: 'bg-green-900/20 border-green-700/50',
};
const COLUMN_HEADER_TEXT: Record<Status, string> = {
  todo: 'text-slate-300',
  in_progress: 'text-yellow-400',
  done: 'text-green-400',
};

const emptyForm = {
  title: '',
  description: '',
  assignee: 'Jet',
  priority: 'med',
  status: 'todo',
  project_id: '' as string | number,
};

// ─── Task Detail Modal ─────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  task: Task;
  assignees: string[];
  projects: Project[];
  onClose: () => void;
  onUpdated: () => void;
}

function TaskDetailModal({ task, assignees, projects, onClose, onUpdated }: TaskDetailModalProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(true);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [savingSubtask, setSavingSubtask] = useState(false);

  const fetchSubtasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      const data = await res.json();
      setSubtasks(Array.isArray(data.subtasks) ? data.subtasks : []);
    } catch {
      setSubtasks([]);
    } finally {
      setLoadingSubtasks(false);
    }
  }, [task.id]);

  useEffect(() => { fetchSubtasks(); }, [fetchSubtasks]);

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;
    setSavingSubtask(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          parent_id: task.id,
          status: 'todo',
          assignee: task.assignee,
          priority: task.priority,
          project_id: task.project_id,
        }),
      });
      setNewSubtaskTitle('');
      setAddingSubtask(false);
      fetchSubtasks();
      onUpdated();
    } catch {
      // ignore
    } finally {
      setSavingSubtask(false);
    }
  }

  async function handleDeleteSubtask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchSubtasks();
    onUpdated();
  }

  const projectName = projects.find((p) => p.id === task.project_id)?.name;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white truncate pr-4">{task.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PRIORITY_DOT[task.priority]}`} />
              {task.priority === 'med' ? 'Medium' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
              @{task.assignee}
            </span>
            {projectName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800 flex items-center gap-1">
                <FolderKanban size={10} /> {projectName}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-slate-300 text-sm leading-relaxed">{task.description}</p>
          )}

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <ListTree size={14} /> Subtasks
              </h3>
              <button
                onClick={() => setAddingSubtask(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {loadingSubtasks ? (
              <div className="text-slate-500 text-xs text-center py-3">
                <Loader2 size={14} className="animate-spin inline mr-1" /> Loading…
              </div>
            ) : subtasks.length === 0 && !addingSubtask ? (
              <div className="text-slate-600 text-xs text-center py-3 border border-dashed border-slate-700 rounded-lg">
                No subtasks yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2 group">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[sub.priority]}`} />
                    <span className="text-sm text-slate-200 flex-1 truncate">{sub.title}</span>
                    <button
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addingSubtask && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') setAddingSubtask(false); }}
                  placeholder="Subtask title…"
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={savingSubtask || !newSubtaskTitle.trim()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white rounded-lg text-sm"
                >
                  {savingSubtask ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                </button>
                <button
                  onClick={() => setAddingSubtask(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex-shrink-0 border-t border-slate-700 pt-4">
          <div className="text-xs text-slate-500">
            Created {new Date(task.created_at).toLocaleDateString()}
            {' · '}Updated {new Date(task.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  projects: Project[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onMove: (task: Task, direction: 'left' | 'right') => void;
  onOpenDetail: (task: Task) => void;
  statusIdx: number;
}

function TaskCard({ task, projects, onEdit, onDelete, onMove, onOpenDetail, statusIdx }: TaskCardProps) {
  const projectName = projects.find((p) => p.id === task.project_id)?.name;

  return (
    <div
      className={`bg-slate-800 border border-slate-700 border-l-4 ${PRIORITY_BORDER[task.priority]} rounded-xl p-4 hover:border-slate-600 transition-colors group`}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          onClick={() => onOpenDetail(task)}
          className="font-semibold text-slate-100 text-sm leading-snug flex-1 text-left hover:text-cyan-400 transition-colors"
        >
          {task.title}
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-700"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Badges */}
      <div className="flex items-center flex-wrap gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PRIORITY_DOT[task.priority]}`} />
          {task.priority === 'med' ? 'Medium' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
          @{task.assignee}
        </span>
        {projectName && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800 flex items-center gap-1">
            <FolderKanban size={10} /> {projectName}
          </span>
        )}
        {task.subtask_count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400 border border-purple-800 flex items-center gap-1">
            <ListTree size={10} /> {task.subtask_count}
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div className="flex gap-1.5">
        {statusIdx > 0 && (
          <button
            onClick={() => onMove(task, 'left')}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            <ChevronLeft size={12} />
            {COLUMNS[statusIdx - 1].label}
          </button>
        )}
        {statusIdx < STATUS_ORDER.length - 1 && (
          <button
            onClick={() => onMove(task, 'right')}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors ml-auto"
          >
            {COLUMNS[statusIdx + 1].label}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignees, setAssignees] = useState<string[]>(['Jet', 'Jack']);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Status>('todo');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
  }, []);

  const fetchAssignees = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (Array.isArray(data)) {
        const names = data.map((m: { name: string }) => m.name);
        setAssignees(['Jet', ...names.filter((n: string) => n !== 'Jet')]);
      }
    } catch {
      // Keep default assignees
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchAssignees();
    fetchProjects();
  }, [fetchTasks, fetchAssignees, fetchProjects]);

  function openCreate() {
    setEditingTask(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      assignee: task.assignee,
      priority: task.priority,
      status: task.status,
      project_id: task.project_id ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        project_id: form.project_id === '' ? null : Number(form.project_id),
      };
      if (editingTask) {
        await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchTasks();
    } catch {
      setError('Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this task?')) return;
    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch {
      fetchTasks(); // revert on error
    }
  }

  async function moveTask(task: Task, direction: 'left' | 'right') {
    const idx = STATUS_ORDER.indexOf(task.status);
    const newIdx = direction === 'right' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;
    const newStatus = STATUS_ORDER[newIdx];

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t)
    );

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on error
      fetchTasks();
    }
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId as Status;
    const destCol = result.destination.droppableId as Status;
    if (sourceCol === destCol) return;

    const taskId = parseInt(result.draggableId);

    // Optimistic update — move card immediately
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, status: destCol } : t)
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: destCol }),
      });
    } catch {
      // Revert on error
      fetchTasks();
    }
  }

  const grouped = COLUMNS.reduce<Record<Status, Task[]>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, { todo: [], in_progress: [], done: [] });

  return (
    <div className="p-6 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks Board</h1>
          <p className="text-slate-400 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
        </div>
      ) : (
        <>
          {/* Mobile tab view */}
          <div className="lg:hidden">
            {/* Tab buttons */}
            <div className="flex gap-2 mb-4">
              {COLUMNS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === col.id
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {col.label}
                  <span className="text-xs opacity-70 bg-slate-700 px-1.5 py-0.5 rounded-full">
                    {grouped[col.id].length}
                  </span>
                </button>
              ))}
            </div>

            {/* Active tab cards */}
            <div className="space-y-3">
              {grouped[activeTab].length === 0 && (
                <div className="text-center text-slate-600 text-sm py-8 border-2 border-dashed border-slate-800 rounded-xl">
                  No tasks here
                </div>
              )}
              {grouped[activeTab].map((task) => {
                const statusIdx = STATUS_ORDER.indexOf(task.status);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    projects={projects}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onMove={moveTask}
                    onOpenDetail={setDetailTask}
                    statusIdx={statusIdx}
                  />
                );
              })}
            </div>
          </div>

          {/* Desktop drag-and-drop kanban */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="hidden lg:grid grid-cols-3 gap-4 h-full">
              {COLUMNS.map((col) => (
                <div key={col.id} className="flex flex-col min-h-0">
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-3 ${COLUMN_HEADER_STYLE[col.id]}`}>
                    <span className={`font-semibold text-sm ${COLUMN_HEADER_TEXT[col.id]}`}>
                      {col.label}
                    </span>
                    <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                      {grouped[col.id].length}
                    </span>
                  </div>

                  {/* Droppable area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-3 overflow-y-auto pr-1 min-h-[100px] rounded-xl transition-colors ${
                          snapshot.isDraggingOver ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        {grouped[col.id].length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center text-slate-600 text-sm py-8 border-2 border-dashed border-slate-800 rounded-xl">
                            No tasks here
                          </div>
                        )}
                        {grouped[col.id].map((task, index) => {
                          const statusIdx = STATUS_ORDER.indexOf(task.status);
                          return (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    opacity: dragSnapshot.isDragging ? 0.85 : 1,
                                  }}
                                >
                                  <TaskCard
                                    task={task}
                                    projects={projects}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onMove={moveTask}
                                    onOpenDetail={setDetailTask}
                                    statusIdx={statusIdx}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Assignee</label>
                  <select
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {assignees.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Project</label>
                  <div className="relative">
                    <select
                      value={form.project_id}
                      onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 appearance-none pr-8"
                    >
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
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
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          assignees={assignees}
          projects={projects}
          onClose={() => setDetailTask(null)}
          onUpdated={() => { fetchTasks(); }}
        />
      )}
    </div>
  );
}
