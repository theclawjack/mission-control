import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ tasks: [], projects: [], memos: [] });
  }

  try {
    const db = getDb();
    const term = `%${q}%`;

    const tasks = db.prepare(
      'SELECT id, title, description, status, priority, assignee FROM tasks WHERE (title LIKE ? OR description LIKE ?) AND parent_id IS NULL LIMIT 20'
    ).all(term, term);

    const projects = db.prepare(
      'SELECT id, name, description, status, progress FROM projects WHERE name LIKE ? OR description LIKE ? LIMIT 20'
    ).all(term, term);

    const memos = db.prepare(
      'SELECT id, title, summary, status FROM memos WHERE title LIKE ? OR summary LIKE ? LIMIT 20'
    ).all(term, term);

    return NextResponse.json({ tasks, projects, memos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
