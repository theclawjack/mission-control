'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, X, Loader2, CalendarDays, Clock } from 'lucide-react';

interface CalEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'task' | 'reminder' | 'cron';
  created_at: string;
  updated_at: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  task: {
    bg: 'bg-cyan-900/40',
    text: 'text-cyan-300',
    border: 'border-cyan-700',
    dot: 'bg-cyan-500',
  },
  reminder: {
    bg: 'bg-purple-900/40',
    text: 'text-purple-300',
    border: 'border-purple-700',
    dot: 'bg-purple-500',
  },
  cron: {
    bg: 'bg-orange-900/40',
    text: 'text-orange-300',
    border: 'border-orange-700',
    dot: 'bg-orange-500',
  },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

const emptyForm = { title: '', description: '', date: '', time: '', type: 'reminder' };

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?year=${viewYear}&month=${viewMonth + 1}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  function openCreate(date?: string) {
    setEditingEvent(null);
    setForm({ ...emptyForm, date: date || '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(event: CalEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time || '',
      type: event.type,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) {
      setError('Title and date are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingEvent) {
        await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      fetchEvents();
    } catch {
      setError('Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    fetchEvents();
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Build 6-row grid
  const cells: { date: string | null; day: number; inMonth: boolean }[] = [];
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ date: toDateStr(prevY, prevM, day), day, inMonth: false });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toDateStr(viewYear, viewMonth, d), day: d, inMonth: true });
  }
  // Next month days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ date: toDateStr(nextY, nextM, d), day: d, inMonth: false });
  }

  // Group events by date
  const eventsByDate: Record<string, CalEvent[]> = {};
  for (const ev of events) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-cyan-400" size={24} />
            Calendar
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} this month</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            New Event
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-800">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-cyan-400" size={28} />
            </div>
          ) : (
            <div className="grid grid-cols-7 flex-1">
              {cells.map((cell, i) => {
                const isToday = cell.date === todayStr;
                const isSelected = cell.date === selectedDate;
                const cellEvents = cell.date ? (eventsByDate[cell.date] || []) : [];

                return (
                  <div
                    key={i}
                    onClick={() => cell.date && setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                    className={`relative min-h-[80px] p-1.5 border-b border-r border-slate-800 cursor-pointer transition-colors
                      ${!cell.inMonth ? 'opacity-30' : ''}
                      ${isSelected ? 'bg-cyan-950/40' : 'hover:bg-slate-800/50'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-cyan-500 text-white' : 'text-slate-400'}
                        `}
                      >
                        {cell.day}
                      </span>
                      {cell.inMonth && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreate(cell.date || '');
                          }}
                          className="opacity-0 hover:opacity-100 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-700 transition-opacity"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {cellEvents.slice(0, 3).map((ev) => {
                        const s = TYPE_STYLES[ev.type] || TYPE_STYLES.reminder;
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(ev);
                            }}
                            className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${s.bg} ${s.text}`}
                          >
                            {ev.time && <span className="mr-1 opacity-60">{ev.time}</span>}
                            {ev.title}
                          </div>
                        );
                      })}
                      {cellEvents.length > 3 && (
                        <div className="text-xs text-slate-500 px-1">+{cellEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected day panel */}
        <div className="w-72 flex flex-col bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200 text-sm">
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedDate ? (
              <p className="text-slate-600 text-xs text-center mt-8">Click a date to see events</p>
            ) : selectedEvents.length === 0 ? (
              <div className="text-center mt-8">
                <p className="text-slate-600 text-xs">No events</p>
                <button
                  onClick={() => openCreate(selectedDate)}
                  className="mt-3 text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1 mx-auto"
                >
                  <Plus size={12} />
                  Add event
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev) => {
                  const s = TYPE_STYLES[ev.type] || TYPE_STYLES.reminder;
                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border ${s.bg} ${s.border}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${s.text}`}>{ev.title}</p>
                          {ev.time && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              {ev.time}
                            </p>
                          )}
                          {ev.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                          )}
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-1.5 bg-slate-800 ${s.text}`}>
                            {ev.type}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(ev)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-400"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => openCreate(selectedDate)}
                  className="w-full mt-1 py-2 text-xs text-slate-500 hover:text-cyan-400 border border-dashed border-slate-700 hover:border-cyan-700 rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  Add event
                </button>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-slate-800 space-y-1.5">
            {Object.entries(TYPE_STYLES).map(([type, s]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-slate-400 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingEvent ? 'Edit Event' : 'New Event'}
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
                  placeholder="Event title"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="task">Task</option>
                  <option value="reminder">Reminder</option>
                  <option value="cron">Cron</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              {editingEvent && (
                <button
                  onClick={() => { handleDelete(editingEvent.id); setShowModal(false); }}
                  className="px-4 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-xl font-medium text-sm transition-colors"
                >
                  Delete
                </button>
              )}
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
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
