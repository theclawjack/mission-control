import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const statuses = db.prepare('SELECT * FROM agent_status ORDER BY agent_name').all() as Record<string, unknown>[];
    const now = Date.now();
    const result = statuses.map((s) => {
      const lastSeenMs = new Date(s.updated_at as string).getTime();
      const secondsAgo = Math.floor((now - lastSeenMs) / 1000);
      let effectiveStatus = s.status as string;
      if (secondsAgo > 3600) effectiveStatus = 'offline';
      return { ...s, seconds_since_update: secondsAgo, effective_status: effectiveStatus };
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const { agent, status, activity } = await request.json();
    if (!agent) {
      return NextResponse.json({ error: 'agent is required' }, { status: 400 });
    }
    db.prepare(
      `UPDATE agent_status SET status = ?, current_activity = ?, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE agent_name = ?`
    ).run(status || 'idle', activity || '', agent);
    const updated = db.prepare('SELECT * FROM agent_status WHERE agent_name = ?').get(agent);
    if (!updated) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
