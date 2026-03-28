import { getDb } from './db';

export function logActivity(type: string, message: string, metadata?: Record<string, unknown>) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO activity_log (type, message, metadata) VALUES (?, ?, ?)'
    ).run(type, message, JSON.stringify(metadata ?? {}));
  } catch (e) {
    // Never let activity logging break the main flow
    console.error('Failed to log activity:', e);
  }
}
