import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let events;
    if (year && month) {
      const paddedMonth = month.padStart(2, '0');
      const prefix = `${year}-${paddedMonth}`;
      events = db
        .prepare("SELECT * FROM events WHERE date LIKE ? ORDER BY date ASC, time ASC")
        .all(`${prefix}%`);
    } else {
      events = db.prepare('SELECT * FROM events ORDER BY date ASC, time ASC').all();
    }

    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const body = await request.json();
    const { title, description = '', date, time = '', type = 'reminder' } = body;

    if (!title?.trim() || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
    }

    const result = db
      .prepare(
        'INSERT INTO events (title, description, date, time, type) VALUES (?, ?, ?, ?, ?)'
      )
      .run(title.trim(), description, date, time, type);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
