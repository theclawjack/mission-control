import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = params;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const tasks = db.prepare(
    `SELECT t.*,
      (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_id = t.id) as subtask_count
     FROM tasks t
     WHERE t.project_id = ? AND t.parent_id IS NULL
     ORDER BY t.created_at DESC`
  ).all(id);

  const gitEvents = db.prepare(
    'SELECT * FROM git_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(id);

  return NextResponse.json({ ...project as object, tasks, git_events: gitEvents });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of ['name', 'description', 'status', 'progress', 'priority']) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = params;
  const db = getDb();
  // Unlink tasks from this project before deleting
  db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
