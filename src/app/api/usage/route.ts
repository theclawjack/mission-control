import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface UsageRow {
  agent: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

interface DayRow {
  date: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

interface TotalsRow {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND date(created_at) = date('now')";
        break;
      case 'week':
        dateFilter = "AND created_at >= datetime('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND created_at >= datetime('now', '-30 days')";
        break;
      case 'all':
      default:
        dateFilter = '';
        break;
    }

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens
      FROM usage_log WHERE 1=1 ${dateFilter}
    `).get() as TotalsRow;

    const byAgent = db.prepare(`
      SELECT
        agent,
        COALESCE(SUM(cost_usd), 0) as cost,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens
      FROM usage_log WHERE 1=1 ${dateFilter}
      GROUP BY agent
      ORDER BY cost DESC
    `).all() as UsageRow[];

    const byDay = db.prepare(`
      SELECT
        date(created_at) as date,
        COALESCE(SUM(cost_usd), 0) as cost,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens
      FROM usage_log WHERE 1=1 ${dateFilter}
      GROUP BY date(created_at)
      ORDER BY date ASC
      LIMIT 30
    `).all() as DayRow[];

    return NextResponse.json({
      total_cost: totals.total_cost,
      total_input_tokens: totals.total_input_tokens,
      total_output_tokens: totals.total_output_tokens,
      by_agent: byAgent,
      by_day: byDay,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}

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

    if (!agent || !model) {
      return NextResponse.json({ error: 'agent and model are required' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO usage_log (agent, model, input_tokens, output_tokens, cost_usd, task_ref) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(agent, model, input_tokens || 0, output_tokens || 0, cost_usd || 0, task_ref);

    const entry = db.prepare('SELECT * FROM usage_log WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to log usage' }, { status: 500 });
  }
}
