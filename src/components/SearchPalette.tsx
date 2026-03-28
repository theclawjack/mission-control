'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckSquare, FolderKanban, FlaskConical, X } from 'lucide-react';

interface SearchResult {
  tasks: Array<{ id: number; title: string; status: string; priority: string }>;
  projects: Array<{ id: number; name: string; status: string }>;
  memos: Array<{ id: number; title: string; status: string }>;
}

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ tasks: [], projects: [], memos: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ tasks: [], projects: [], memos: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ tasks: [], projects: [], memos: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults({ tasks: [], projects: [], memos: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function navigate(href: string) {
    onClose();
    router.push(href);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  const hasResults = results.tasks.length > 0 || results.projects.length > 0 || results.memos.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search tasks, projects, memos…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!query.trim() && (
            <div className="text-center py-10 text-slate-500 text-sm">
              Type to search across tasks, projects, and memos
            </div>
          )}

          {query.trim() && !hasResults && !loading && (
            <div className="text-center py-10 text-slate-500 text-sm">
              No results for &quot;{query}&quot;
            </div>
          )}

          {results.tasks.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={12} /> Tasks
              </div>
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate('/tasks')}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <CheckSquare size={15} className="text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">{t.status} · {t.priority}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.projects.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban size={12} /> Projects
              </div>
              {results.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate('/projects')}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <FolderKanban size={15} className="text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.status}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.memos.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical size={12} /> Memos
              </div>
              {results.memos.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate('/rd')}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <FlaskConical size={15} className="text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{m.title}</div>
                    <div className="text-xs text-slate-500">{m.status}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasResults && <div className="h-2" />}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-700/50 text-xs text-slate-600 flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
