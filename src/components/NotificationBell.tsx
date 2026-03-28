'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckSquare, AlertTriangle, Settings, FlaskConical, X } from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

function getIcon(type: string) {
  switch (type) {
    case 'task_completed': return <CheckSquare size={14} className="text-green-400" />;
    case 'agent_alert': return <AlertTriangle size={14} className="text-yellow-400" />;
    case 'rd_complete': return <FlaskConical size={14} className="text-purple-400" />;
    case 'system': return <Settings size={14} className="text-cyan-400" />;
    default: return <Bell size={14} className="text-slate-400" />;
  }
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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json() as Notification[];
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: notifications.map((n) => n.id) }),
      });
      setNotifications([]);
      setOpen(false);
    } catch {
      // ignore
    }
  }

  async function markOneRead(id: number) {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  }

  const count = notifications.length;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {count > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                  {count} unread
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No unread notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0 group"
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white leading-snug">{n.title}</div>
                    {n.message && (
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</div>
                    )}
                    <div className="text-xs text-slate-600 mt-1">{relativeTime(n.created_at)}</div>
                  </div>
                  <button
                    onClick={() => markOneRead(n.id)}
                    className="shrink-0 p-1 rounded text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
