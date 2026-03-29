import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const body = await request.json() as {
      agent: string;
      model: string;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;
      task_ref?: string;
    };

    const { agent, model, input_tokens, output_tokens, cost_usd, task_ref = '' } = body;

    if (!agent || !model || input_tokens == null || output_tokens == null || cost_usd == null) {
      return NextResponse.json(
        { error: 'agent, model, input_tokens, output_tokens, and cost_usd are required' },
        { status: 400 }
      );
    }

    if (typeof input_tokens !== 'number' || typeof output_tokens !== 'number' || typeof cost_usd !== 'number') {
      return NextResponse.json(
        { error: 'input_tokens, output_tokens, and cost_usd must be numbers' },
        { status: 400 }
      );
    }

    const result = db.prepare(
      'INSERT INTO usage_log (agent, model, input_tokens, output_tokens, cost_usd, task_ref) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(agent, model, input_tokens, output_tokens, cost_usd, task_ref);

    const entry = db.prepare('SELECT * FROM usage_log WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to log usage' }, { status: 500 });
  }
}
