import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE read = 0 ORDER BY created_at DESC LIMIT 20'
    ).all() as Notification[];
    return NextResponse.json(notifications);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const body = await request.json() as { ids?: number[] };
    const { ids } = body;

    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE notifications SET read = 1 WHERE id IN (${placeholders})`).run(...ids);
    } else {
      // Mark all as read
      db.prepare('UPDATE notifications SET read = 1').run();
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const body = await request.json() as { type: string; title: string; message?: string };
    const { type, title, message = '' } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO notifications (type, title, message) VALUES (?, ?, ?)'
    ).run(type, title, message);

    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(notif, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
