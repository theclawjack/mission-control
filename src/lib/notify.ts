import { getDb } from './db';

export async function notifyDiscord(message: string): Promise<void> {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_webhook_url') as { value: string } | undefined;
    if (!row?.value) return;

    await fetch(row.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch {
    // Silently fail
  }
}
