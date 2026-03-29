import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { notifyDiscord } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Support both PUT and PATCH
export const PATCH = async (request: NextRequest, context: { params: { id: string } }) =>
  PUT(request, context);

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const body = await request.json();
    const { title, description, assignee, priority, status, project_id, parent_id } = body;
    const blocked_by: number | null | undefined = 'blocked_by' in body ? (body.blocked_by ?? null) : undefined;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build update dynamically to handle explicit null values
    const setClauses: string[] = [
      'title = COALESCE(?, title)',
      'description = COALESCE(?, description)',
      'assignee = COALESCE(?, assignee)',
      'priority = COALESCE(?, priority)',
      'status = COALESCE(?, status)',
      'project_id = CASE WHEN ? IS NOT NULL THEN ? ELSE project_id END',
      'parent_id = CASE WHEN ? IS NOT NULL THEN ? ELSE parent_id END',
    ];
    const runArgs: unknown[] = [
      title ?? null, description ?? null, assignee ?? null, priority ?? null, status ?? null,
      project_id !== undefined ? project_id : null, project_id !== undefined ? project_id : null,
      parent_id !== undefined ? parent_id : null, parent_id !== undefined ? parent_id : null,
    ];

    if (blocked_by !== undefined) {
      setClauses.push('blocked_by = ?');
      runArgs.push(blocked_by);
    }

    setClauses.push("updated_at = datetime('now')");
    runArgs.push(id);

    db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...runArgs);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>;

    // Log activity on status change
    if (status && status !== existing.status) {
      if (status === 'done') {
        logActivity('task_completed', `Task completed: ${task.title}`, { taskId: id });
        await notifyDiscord(`✅ Task completed: **${task.title}**`);
        // Create in-app notification
        try {
          db.prepare(
            'INSERT INTO notifications (type, title, message) VALUES (?, ?, ?)'
          ).run('task_completed', `Task completed: ${task.title as string}`, `Assigned to: ${task.assignee as string}`);
        } catch { /* ignore notification errors */ }
      } else {
        logActivity('task_moved', `Task moved to ${status}: ${task.title}`, { taskId: id, from: existing.status, to: status });
      }
    }

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

    // Delete subtasks first, then parent
    db.prepare('DELETE FROM tasks WHERE parent_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

// GET single task with subtasks
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const subtasks = db.prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC').all(id);
    // Fetch blocking task title if blocked_by is set
    let blocking_task: { id: number; title: string } | null = null;
    if (task.blocked_by) {
      blocking_task = db.prepare('SELECT id, title FROM tasks WHERE id = ?').get(task.blocked_by) as { id: number; title: string } | null;
    }
    return NextResponse.json({ ...task, subtasks, blocking_task });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}
