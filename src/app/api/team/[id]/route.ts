import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, role, model, status, current_task } = body;

    const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    db.prepare(
      `UPDATE team_members SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        model = COALESCE(?, model),
        status = COALESCE(?, status),
        current_task = COALESCE(?, current_task),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(name ?? null, role ?? null, model ?? null, status ?? null, current_task ?? null, id);

    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
    return NextResponse.json(member);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const existing = db.prepare('SELECT id FROM team_members WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
