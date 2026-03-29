import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

interface GHCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string } | null;
}

function syncGitHub(db: ReturnType<typeof getDb>) {
  const repos = [
    { owner: 'theclawjack', repo: 'jashboard', projectId: 1 },
    { owner: 'theclawjack', repo: 'clawwork', projectId: null as number | null },
  ];
  const clawwork = db.prepare("SELECT id FROM projects WHERE name LIKE '%clawwork%' OR name LIKE '%ClawWork%' ORDER BY id LIMIT 1").get() as { id: number } | undefined;
  if (clawwork) repos[1].projectId = clawwork.id;

  const check = db.prepare('SELECT id FROM git_events WHERE sha = ? AND repo = ?');
  const insert = db.prepare('INSERT INTO git_events (type, repo, branch, title, author, sha, url, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  for (const { owner, repo, projectId } of repos) {
    try {
      const out = execSync(`gh api "repos/${owner}/${repo}/commits?per_page=30"`, { encoding: 'utf8', timeout: 15000 });
      const commits = JSON.parse(out) as GHCommit[];
      for (const c of commits) {
        if (check.get(c.sha, repo)) continue;
        const title = c.commit.message.split('\n')[0].slice(0, 500);
        const author = c.author?.login ?? c.commit.author.name;
        insert.run('commit', repo, 'main', title, author, c.sha, `https://github.com/${owner}/${repo}/commit/${c.sha}`, projectId, c.commit.author.date);
      }
    } catch { /* ignore repo errors */ }
  }
}

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
    const sync = searchParams.get('sync');

    if (sync === 'true') {
      try { syncGitHub(db); } catch { /* non-fatal */ }
    }

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
