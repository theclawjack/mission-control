import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
    if (!memo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    return NextResponse.json(memo);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch memo' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const body = await request.json();
    const { title, summary, visionary_input, analyst_input, pragmatist_input, debate, recommendations, status } = body;

    const existing = db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    db.prepare(
      `UPDATE memos SET
        title = COALESCE(?, title),
        summary = COALESCE(?, summary),
        visionary_input = COALESCE(?, visionary_input),
        analyst_input = COALESCE(?, analyst_input),
        pragmatist_input = COALESCE(?, pragmatist_input),
        debate = COALESCE(?, debate),
        recommendations = COALESCE(?, recommendations),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(
      title ?? null,
      summary ?? null,
      visionary_input ?? null,
      analyst_input ?? null,
      pragmatist_input ?? null,
      debate ?? null,
      recommendations ?? null,
      status ?? null,
      id
    );

    const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
    return NextResponse.json(memo);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const existing = db.prepare('SELECT id FROM memos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM memos WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete memo' }, { status: 500 });
  }
}
