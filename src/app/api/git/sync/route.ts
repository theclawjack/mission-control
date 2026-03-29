import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {
    login: string;
  } | null;
}

function fetchCommits(owner: string, repo: string, perPage = 30): GHCommit[] {
  try {
    const output = execSync(
      `gh api "repos/${owner}/${repo}/commits?per_page=${perPage}"`,
      { encoding: 'utf8', timeout: 15000 }
    );
    return JSON.parse(output) as GHCommit[];
  } catch (e) {
    console.error(`Failed to fetch commits for ${owner}/${repo}:`, e);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();

    // Look up project IDs
    const jashboardProject = db.prepare(
      "SELECT id FROM projects WHERE name LIKE '%jashboard%' OR name LIKE '%Jashboard%' ORDER BY id LIMIT 1"
    ).get() as { id: number } | undefined;
    const clawworkProject = db.prepare(
      "SELECT id FROM projects WHERE name LIKE '%clawwork%' OR name LIKE '%ClawWork%' ORDER BY id LIMIT 1"
    ).get() as { id: number } | undefined;

    const jashboardProjectId = jashboardProject?.id ?? 1;
    const clawworkProjectId = clawworkProject?.id ?? null;

    const repoConfigs = [
      { owner: 'theclawjack', repo: 'jashboard', projectId: jashboardProjectId },
      { owner: 'theclawjack', repo: 'clawwork', projectId: clawworkProjectId },
    ];

    let totalSynced = 0;

    const checkStmt = db.prepare('SELECT id FROM git_events WHERE sha = ? AND repo = ?');
    const insertStmt = db.prepare(
      'INSERT INTO git_events (type, repo, branch, title, author, sha, url, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const { owner, repo, projectId } of repoConfigs) {
      const commits = fetchCommits(owner, repo, 30);

      for (const commit of commits) {
        const sha = commit.sha;
        const existing = checkStmt.get(sha, repo);
        if (existing) continue;

        const title = commit.commit.message.split('\n')[0].slice(0, 500);
        const author = commit.author?.login ?? commit.commit.author.name;
        const date = commit.commit.author.date;
        const url = `https://github.com/${owner}/${repo}/commit/${sha}`;

        insertStmt.run('commit', repo, 'main', title, author, sha, url, projectId, date);
        totalSynced++;
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      repos: ['jashboard', 'clawwork'],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
