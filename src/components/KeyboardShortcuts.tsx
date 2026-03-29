'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['⌘K', 'Ctrl+K'], description: 'Open search palette' },
  { keys: ['N'], description: 'New task (go to /tasks)' },
  { keys: ['G → H'], description: 'Go to Dashboard' },
  { keys: ['G → T'], description: 'Go to Tasks' },
  { keys: ['G → P'], description: 'Go to Projects' },
  { keys: ['G → C'], description: 'Go to Chat' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Keyboard size={16} className="text-cyan-400" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-300">{description}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5 text-xs text-slate-600 text-center">
          Shortcuts are disabled while typing in inputs
        </div>
      </div>
    </div>
  );
}

interface KeyboardShortcutsProps {
  onSearchOpen?: () => void;
}

export function KeyboardShortcuts({ onSearchOpen }: KeyboardShortcutsProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const gPendingRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function isInputFocused() {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el instanceof HTMLElement && el.isContentEditable);
    }

    function onKey(e: KeyboardEvent) {
      // ⌘K / Ctrl+K — search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen?.();
        return;
      }

      if (isInputFocused()) return;

      // ? — show help
      if (e.key === '?') {
        e.preventDefault();
        setShowModal(true);
        return;
      }

      // N — go to tasks
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        router.push('/tasks');
        return;
      }

      // G then H/T/P/C — go-to navigation
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        gPendingRef.current = true;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => { gPendingRef.current = false; }, 1500);
        return;
      }

      if (gPendingRef.current) {
        gPendingRef.current = false;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        switch (e.key.toLowerCase()) {
          case 'h': router.push('/home'); break;
          case 't': router.push('/tasks'); break;
          case 'p': router.push('/projects'); break;
          case 'c': router.push('/chat'); break;
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [router, onSearchOpen]);

  return (
    <>
      {showModal && <KeyboardShortcutsModal onClose={() => setShowModal(false)} />}
    </>
  );
}

export function ShortcutsHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-400 hover:text-white text-xs font-bold transition-colors flex items-center justify-center"
      title="Keyboard shortcuts (?)"
    >
      ?
    </button>
  );
}
