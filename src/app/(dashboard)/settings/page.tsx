'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, TestTube2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch('/api/settings?key=discord_webhook_url')
      .then((r) => r.json())
      .then((data) => {
        setWebhookUrl(data?.value ?? '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'discord_webhook_url', value: webhookUrl }),
      });
      if (res.ok) {
        addToast('Settings saved', 'success');
      } else {
        addToast('Failed to save settings', 'error');
      }
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!webhookUrl.trim()) {
      addToast('Please enter a webhook URL first', 'error');
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
        addToast('Test message sent!', 'success');
      } else {
        addToast('Webhook returned an error', 'error');
      }
    } catch {
      addToast('Failed to send test message', 'error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
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
