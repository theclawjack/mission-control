import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    // TODO(mock): Wire to OpenClaw session API for real agent responses
    // Save mock assistant response
    const agentMsg = `Message received. ${agent} is processing...`;
    const agentResult = db.prepare(
      'INSERT INTO chat_messages (role, content, agent) VALUES (?, ?, ?)'
    ).run('assistant', agentMsg, agent);

    const assistantMsg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(agentResult.lastInsertRowid) as ChatMessage;

    return NextResponse.json({ userMessage: userMsg, assistantMessage: assistantMsg }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
