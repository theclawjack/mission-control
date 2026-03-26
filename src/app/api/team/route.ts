import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const members = db.prepare('SELECT * FROM team_members ORDER BY id ASC').all();
    return NextResponse.json(members);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const body = await request.json();
    const { name, role, model, status = 'idle', current_task = '' } = body;

    if (!name?.trim() || !role?.trim() || !model?.trim()) {
      return NextResponse.json({ error: 'Name, role, and model are required' }, { status: 400 });
    }

    const result = db
      .prepare(
        'INSERT INTO team_members (name, role, model, status, current_task) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name.trim(), role.trim(), model.trim(), status, current_task);

    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}
