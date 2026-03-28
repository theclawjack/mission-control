import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { notifyDiscord } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const isoDate = new Date().toISOString().split('T')[0];
    const title = `R&D Cycle — ${isoDate}`;

    const result = db.prepare(
      'INSERT INTO memos (title, status) VALUES (?, ?)'
    ).run(title, 'in_progress');

    const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(result.lastInsertRowid);

    logActivity('rd_cycle_started', `R&D cycle triggered: ${title}`, { memoId: result.lastInsertRowid });
    await notifyDiscord(`🧪 R&D cycle triggered: **${title}**`);

    return NextResponse.json(memo, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to trigger R&D cycle' }, { status: 500 });
  }
}
