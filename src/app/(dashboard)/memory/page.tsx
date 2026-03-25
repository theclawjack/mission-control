'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, RefreshCw, Brain, X, ChevronDown, ChevronUp } from 'lucide-react';
import { marked } from 'marked';

interface MemoryFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  content: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderMarkdown(content: string): string {
  try {
    return marked(content, { async: false }) as string;
  } catch {
    return `<pre>${content}</pre>`;
  }
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-cyan-500/30 text-cyan-200 rounded px-0.5">$1</mark>');
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchFiles = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/memory?q=${encodeURIComponent(q)}` : '/api/memory';
      const res = await fetch(url);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
      // Auto-expand first file if only one result
      if (data.length === 1) setExpandedFile(data[0].name);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(debouncedQuery);
  }, [debouncedQuery, fetchFiles, refreshKey]);

  function toggleExpand(name: string) {
    setExpandedFile((prev) => (prev === name ? null : name));
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="text-cyan-400" size={24} />
            Memory
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {files.length} file{files.length !== 1 ? 's' : ''} · workspace memory files
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all memory files..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading && files.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <RefreshCw className="animate-spin text-cyan-400 mx-auto mb-3" size={28} />
            <p className="text-slate-400 text-sm">Loading memory files...</p>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl">
          <Brain className="text-slate-600 mx-auto mb-3" size={40} />
          <p className="text-slate-400 font-medium">
            {debouncedQuery ? 'No files match your search' : 'No memory files found'}
          </p>
          <p className="text-slate-600 text-sm mt-1">
            {debouncedQuery
              ? 'Try a different search term'
              : 'Add .md files to /root/.openclaw/workspace/memory/'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => {
            const isExpanded = expandedFile === file.name;
            const renderedHtml = isExpanded ? renderMarkdown(file.content) : '';
            const preview = file.content.slice(0, 200).replace(/[#*`]/g, '').trim();

            return (
              <div
                key={file.path}
                className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-colors"
              >
                {/* File header */}
                <button
                  onClick={() => toggleExpand(file.name)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-750 transition-colors"
                >
                  <div className="w-8 h-8 bg-cyan-500/15 border border-cyan-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="text-cyan-400" size={15} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white text-sm"
                        dangerouslySetInnerHTML={{
                          __html: debouncedQuery
                            ? highlightText(file.name, debouncedQuery)
                            : file.name,
                        }}
                      />
                      {file.name === 'MEMORY.md' && (
                        <span className="text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded-full">
                          Long-term
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatDate(file.modified)}</span>
                      <span>·</span>
                      <span>{formatBytes(file.size)}</span>
                      <span>·</span>
                      <span>{file.content.split('\n').length} lines</span>
                    </div>
                  </div>

                  {!isExpanded && preview && (
                    <p className="hidden lg:block text-slate-500 text-xs truncate max-w-xs">
                      {preview}...
                    </p>
                  )}

                  <div className="flex-shrink-0 text-slate-500">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-700 px-5 py-4">
                    <div
                      className="prose-dark max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
