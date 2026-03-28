import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_id = t.id) as subtask_count
      FROM tasks t
      WHERE t.parent_id IS NULL
      ORDER BY t.created_at DESC
    `).all();
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const body = await request.json();
    const {
      title, description = '', assignee = 'Jet', priority = 'med',
      status = 'todo', project_id = null, parent_id = null,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = db
      .prepare(
        'INSERT INTO tasks (title, description, assignee, priority, status, project_id, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(title.trim(), description, assignee, priority, status, project_id, parent_id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    if (!parent_id) {
      logActivity('task_created', `Task created: ${title.trim()}`, { taskId: result.lastInsertRowid, status, priority });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
