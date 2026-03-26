import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const body = await request.json();
    const { title, description, assignee, priority, status } = body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    db.prepare(
      `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        assignee = COALESCE(?, assignee),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(title ?? null, description ?? null, assignee ?? null, priority ?? null, status ?? null, id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
