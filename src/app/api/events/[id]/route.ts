import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const body = await request.json();
    const { title, description, date, time, type } = body;

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    db.prepare(
      `UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        time = COALESCE(?, time),
        type = COALESCE(?, type),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(title ?? null, description ?? null, date ?? null, time ?? null, type ?? null, id);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return NextResponse.json(event);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
