'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, TestTube2, Loader2, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/settings?key=discord_webhook_url')
      .then((r) => r.json())
      .then((data) => {
        setWebhookUrl(data?.value ?? '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'discord_webhook_url', value: webhookUrl }),
      });
      if (res.ok) {
        showToast('Settings saved!', true);
      } else {
        showToast('Failed to save settings', false);
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!webhookUrl.trim()) {
      showToast('Please enter a webhook URL first', false);
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '🚀 Jashboard test notification — Discord webhook is working!' }),
      });
      if (res.ok) {
        showToast('Test message sent!', true);
      } else {
        showToast('Webhook returned an error', false);
      }
    } catch {
      showToast('Failed to send test message', false);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur-sm flex items-center gap-2 ${
          toast.ok
            ? 'bg-green-500/20 border border-green-500/40 text-green-300'
            : 'bg-red-500/20 border border-red-500/40 text-red-300'
        }`}>
          {toast.ok ? <CheckCircle2 size={16} /> : null}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="text-cyan-400" size={24} />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Configure integrations and preferences</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="animate-spin" size={18} /> Loading settings…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Discord Notifications */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
              <span className="text-lg">💬</span> Discord Notifications
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Receive notifications when tasks are completed or R&D cycles are triggered.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                />
                <p className="text-slate-500 text-xs mt-1.5">
                  Create a webhook in your Discord server: Channel Settings → Integrations → Webhooks
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing || !webhookUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
                  Test
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">System</h3>
            <div className="space-y-1 text-xs text-slate-500">
              <div>Database: SQLite (better-sqlite3)</div>
              <div>Runtime: Next.js 14</div>
              <div>Port: 3100</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
