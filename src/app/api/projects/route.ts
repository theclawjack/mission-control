import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const status = request.nextUrl.searchParams.get('status');

  let rows;
  if (status && status !== 'all') {
    rows = db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY priority DESC, updated_at DESC').all(status);
  } else {
    rows = db.prepare('SELECT * FROM projects ORDER BY priority DESC, updated_at DESC').all();
  }

  // Attach task counts and auto-calculated progress
  const enriched = (rows as Record<string, unknown>[]).map((p) => {
    const totalTasks = (db.prepare('SELECT COUNT(*) as c FROM tasks WHERE project_id = ? AND parent_id IS NULL').get(p.id) as { c: number }).c;
    const doneTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE project_id = ? AND status = 'done' AND parent_id IS NULL").get(p.id) as { c: number }).c;
    const autoProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : p.progress as number;
    return { ...p, task_count: totalTasks, done_task_count: doneTasks, progress: autoProgress };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { name, description, status, progress, priority } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO projects (name, description, status, progress, priority) VALUES (?, ?, ?, ?, ?)'
  ).run(
    name.trim(),
    description || '',
    status || 'active',
    progress ?? 0,
    priority || 'med'
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  logActivity('project_created', `Project created: ${name.trim()}`, { projectId: result.lastInsertRowid });

  return NextResponse.json(project, { status: 201 });
}
