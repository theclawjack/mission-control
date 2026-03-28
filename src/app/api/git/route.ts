import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface GitEvent {
  id: number;
  type: string;
  repo: string;
  branch: string;
  title: string;
  author: string;
  sha: string;
  url: string;
  project_id: number | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let events: GitEvent[];
    if (projectId) {
      events = db.prepare(
        'SELECT * FROM git_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 50'
      ).all(parseInt(projectId)) as GitEvent[];
    } else {
      events = db.prepare(
        'SELECT * FROM git_events ORDER BY created_at DESC LIMIT 50'
      ).all() as GitEvent[];
    }

    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch git events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const body = await request.json() as {
      type: string;
      repo: string;
      branch?: string;
      title: string;
      author?: string;
      sha?: string;
      url?: string;
      project_id?: number | null;
    };
    const { type, repo, branch = 'main', title, author = '', sha = '', url = '', project_id = null } = body;

    if (!type || !repo || !title) {
      return NextResponse.json({ error: 'type, repo, and title are required' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO git_events (type, repo, branch, title, author, sha, url, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(type, repo, branch, title, author, sha, url, project_id);

    const event = db.prepare('SELECT * FROM git_events WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save git event' }, { status: 500 });
  }
}
