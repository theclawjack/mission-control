import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Connected to OpenClaw via /hooks/agent webhook
const HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN || '5357fcd472447df7405f5c610ff2b695';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  agent: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const messages = db.prepare(
      'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT 100'
    ).all() as ChatMessage[];
    return NextResponse.json(messages);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const body = await request.json() as { content: string; agent?: string };
    const { content, agent = 'Jack' } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Save user message
    const userResult = db.prepare(
      'INSERT INTO chat_messages (role, content, agent) VALUES (?, ?, ?)'
    ).run('user', content.trim(), agent);

    const userMsg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(userResult.lastInsertRowid) as ChatMessage;

    // Fire and forget — POST to OpenClaw hooks/agent
    const hookMessage = `${content.trim()}\n\nWhen you have your response ready, POST it to http://localhost:3100/api/chat/webhook with headers 'Authorization: Bearer ${HOOK_TOKEN}' and 'Content-Type: application/json' and body {"content": "your response here", "agent": "${agent}"}. Use the Bash tool to run a curl command for this.`;

    fetch(`${GATEWAY_URL}/hooks/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HOOK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: hookMessage,
        name: 'jashboard-chat',
        deliver: false,
        model: 'anthropic/claude-haiku-4-5-20251001',
        timeoutSeconds: 60,
      }),
    }).catch((err) => {
      console.error('[chat] Failed to POST to OpenClaw hook:', err);
    });

    return NextResponse.json({ userMessage: userMsg }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
