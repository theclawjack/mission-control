import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const id = parseInt(params.id);
    const existing = db.prepare('SELECT id FROM chat_messages WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
