import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface AgentSession {
  id: number;
  agent: string;
  session_type: string;
  title: string;
  summary: string;
  tool_calls: string;
  files_changed: string;
  commands_run: string;
  tokens_used: number;
  cost_usd: number;
  duration_seconds: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    let sessions: AgentSession[];
    if (agent && agent !== 'All') {
      sessions = db.prepare(
        'SELECT * FROM agent_sessions WHERE agent = ? ORDER BY started_at DESC LIMIT ? OFFSET ?'
      ).all(agent, limit, offset) as AgentSession[];
    } else {
      sessions = db.prepare(
        'SELECT * FROM agent_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?'
      ).all(limit, offset) as AgentSession[];
    }

    const totalRow = agent && agent !== 'All'
      ? db.prepare('SELECT COUNT(*) as c FROM agent_sessions WHERE agent = ?').get(agent) as { c: number }
      : db.prepare('SELECT COUNT(*) as c FROM agent_sessions').get() as { c: number };

    return NextResponse.json({ sessions, total: totalRow.c });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch agent sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const body = await request.json() as {
      agent: string;
      session_type?: string;
      title: string;
      summary?: string;
      tool_calls?: string;
      files_changed?: string;
      commands_run?: string;
      tokens_used?: number;
      cost_usd?: number;
      duration_seconds?: number;
      status?: string;
      started_at?: string;
      completed_at?: string | null;
    };

    const {
      agent,
      session_type = 'task',
      title,
      summary = '',
      tool_calls = '[]',
      files_changed = '[]',
      commands_run = '[]',
      tokens_used = 0,
      cost_usd = 0.0,
      duration_seconds = 0,
      status = 'completed',
      started_at,
      completed_at = null,
    } = body;

    if (!agent || !title) {
      return NextResponse.json({ error: 'agent and title are required' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO agent_sessions
        (agent, session_type, title, summary, tool_calls, files_changed, commands_run,
         tokens_used, cost_usd, duration_seconds, status, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
    `).run(
      agent, session_type, title, summary, tool_calls, files_changed, commands_run,
      tokens_used, cost_usd, duration_seconds, status, started_at ?? null, completed_at
    );

    const session = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create agent session' }, { status: 500 });
  }
}
