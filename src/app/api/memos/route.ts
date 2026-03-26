import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let memos;
    if (status) {
      memos = db
        .prepare('SELECT * FROM memos WHERE status = ? ORDER BY created_at DESC')
        .all(status);
    } else {
      memos = db.prepare('SELECT * FROM memos ORDER BY created_at DESC').all();
    }

    return NextResponse.json(memos);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const body = await request.json();
    const {
      title,
      summary = null,
      visionary_input = null,
      analyst_input = null,
      pragmatist_input = null,
      debate = null,
      recommendations = null,
      status = 'pending',
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO memos (title, summary, visionary_input, analyst_input, pragmatist_input, debate, recommendations, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(title.trim(), summary, visionary_input, analyst_input, pragmatist_input, debate, recommendations, status);

    const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(memo, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create memo' }, { status: 500 });
  }
}
