'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Rocket, CheckSquare, Brain, CalendarDays, Users, LogOut, FlaskConical, X } from 'lucide-react';

const navItems = [
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/rd', label: 'R&D Lab', icon: FlaskConical },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <Rocket className="text-cyan-400" size={18} />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">Jashboard</div>
              <div className="text-slate-500 text-xs">Operations Dashboard</div>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <Icon
                  size={18}
                  className={active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}
                />
                <span className="font-medium text-sm">{label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-slate-800 pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-800/50 transition-all duration-150"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
          <div className="mt-3 px-3 py-2 bg-slate-800/50 rounded-xl">
            <div className="text-slate-500 text-xs">🟢 System Online</div>
            <div className="text-slate-600 text-xs mt-0.5">Port 3100 · SQLite</div>
          </div>
        </div>
      </aside>
    </>
  );
}
