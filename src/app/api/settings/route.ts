import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key parameter required' }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);

  if (!row) {
    return NextResponse.json({ key, value: null });
  }
  return NextResponse.json(row);
}

export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP'
  ).run(key, value, value);

  const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
  return NextResponse.json(row);
}
