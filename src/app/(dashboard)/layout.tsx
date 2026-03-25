import Sidebar from '@/components/Sidebar';
import StatusBanner from '@/components/StatusBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <StatusBanner />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
