'use client';

import { useState, useEffect, useRef } from 'react';

interface AgentStatus {
  agent_name: string;
  status: string;
  effective_status: string;
  current_activity: string;
  seconds_since_update: number;
}

export default function StatusBanner() {
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    if (pollingRef.current) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (Array.isArray(data)) setStatuses(data);
      } catch {
        // ignore
      }
    };
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 30000);
  }

  useEffect(() => {
    // Try SSE first
    try {
      const es = new EventSource('/api/status/stream');
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data)) setStatuses(data);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Fall back to polling
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      esRef.current?.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const working = statuses.filter((s) => s.effective_status === 'working');

  return (
    <div className="px-4 py-2 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center gap-4 shrink-0">
      <div className="flex items-center gap-3">
        {statuses.map((s) => (
          <div key={s.agent_name} className="relative group flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                s.effective_status === 'working'
                  ? 'bg-blue-500 animate-pulse'
                  : s.effective_status === 'idle'
                  ? 'bg-green-500'
                  : 'bg-gray-500'
              }`}
            />
            <span className="text-xs text-slate-400">{s.agent_name}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-xs text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
              <span className="font-semibold">{s.agent_name}</span>
              <span className="text-slate-400"> — {s.effective_status}</span>
              {s.current_activity && (
                <div className="text-slate-300 mt-0.5">{s.current_activity}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500 ml-auto">
        {working.length > 0 ? (
          <span className="text-blue-400">
            🔵{' '}
            {working
              .map((w) => `${w.agent_name}: ${w.current_activity}`)
              .join(' · ')}
          </span>
        ) : (
          'All agents idle'
        )}
      </div>
    </div>
  );
}
