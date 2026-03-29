import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// This endpoint is called by OpenClaw hooks to deliver agent responses
// Auth: uses the hook token instead of mc_auth cookie
const HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN || '5357fcd472447df7405f5c610ff2b695';

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  agent: string;
  created_at: string;
}

export async function POST(request: NextRequest) {
  // Verify hook token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-jashboard-token');
  if (token !== HOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { content: string; agent?: string; role?: string };
    const { content, agent = 'Jack', role = 'assistant' } = body;

    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO chat_messages (role, content, agent) VALUES (?, ?, ?)'
    ).run(role, content, agent);

    const msg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid) as ChatMessage;

    return NextResponse.json({ ok: true, id: result.lastInsertRowid, message: msg });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
