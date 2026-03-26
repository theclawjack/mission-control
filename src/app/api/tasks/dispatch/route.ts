import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Agent names (non-human assignees)
const AGENT_NAMES = ['Jack', 'Planner', 'Coder', 'Reviewer', 'Writer', 'Debugger'];

/**
 * GET /api/tasks/dispatch
 * Returns all tasks with status "todo" assigned to an agent (not "Jet")
 */
export async function GET() {
  try {
    const db = getDb();

    const placeholders = AGENT_NAMES.map(() => '?').join(', ');
    const tasks = db
      .prepare(
        `SELECT * FROM tasks WHERE status = 'todo' AND assignee IN (${placeholders}) ORDER BY
          CASE priority WHEN 'high' THEN 1 WHEN 'med' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC,
          created_at ASC`
      )
      .all(...AGENT_NAMES);

    return NextResponse.json({
      pending_tasks: tasks,
      count: tasks.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 });
  }
}

/**
 * POST /api/tasks/dispatch
 * Body: { task_id: number, action: "pickup" | "complete", result?: string }
 *
 * pickup  → sets status to "in_progress"
 * complete → sets status to "done", appends completed_note
 */
export async function POST(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const body = await request.json();
    const { task_id, action, result } = body as {
      task_id?: number;
      action?: string;
      result?: string;
    };

    if (!task_id || typeof task_id !== 'number') {
      return NextResponse.json({ error: 'task_id is required and must be a number' }, { status: 400 });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id) as
      | { id: number; title: string; assignee: string; status: string }
      | undefined;

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (action === 'pickup') {
      db.prepare(
        `UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`
      ).run(task_id);

      const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
      return NextResponse.json({ success: true, task: updated });
    }

    if (action === 'complete') {
      const note = result?.trim() || 'Completed by agent.';
      db.prepare(
        `UPDATE tasks SET
          status = 'done',
          completed_note = ?,
          updated_at = datetime('now')
        WHERE id = ?`
      ).run(note, task_id);

      const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
      return NextResponse.json({ success: true, task: updated });
    }

    return NextResponse.json(
      { error: `Unknown action "${action}". Use "pickup" or "complete".` },
      { status: 400 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to process task dispatch' }, { status: 500 });
  }
}
