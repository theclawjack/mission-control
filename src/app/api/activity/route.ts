import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50'
    ).all();
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
