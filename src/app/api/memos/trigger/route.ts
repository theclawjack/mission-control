import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { notifyDiscord } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const isoDate = new Date().toISOString().split('T')[0];
    const title = `R&D Cycle — ${isoDate}`;

    // TODO(mock): Replace template strings with real multi-agent R&D pipeline (spawn 3 agents, synthesize)
    const visionaryInput = `🔮 **Visionary Analysis — ${isoDate}**

Emerging opportunities across our portfolio:

**AI Agents & Automation**
- Multi-agent orchestration is hitting an inflection point — Jashboard positions us to manage these workflows visually
- ClawWork can become the execution layer for autonomous agent task delegation
- Opportunity: build agent-to-agent communication protocols on top of existing SSE infrastructure

**Blockchain & Web3**
- DeFi tooling remains underserved in the Vietnam/SEA market
- Agent-assisted portfolio tracking + automated alerts could be a breakout product

**Platform Vision**
- Jashboard evolves into a true Mission Control: agents report in, humans review, approve, redirect
- The "agent as team member" mental model is working — double down on it`;

    const analystInput = `📊 **Critical Analysis — ${isoDate}**

**Portfolio Assessment: ClawWork, Jashboard, agent-dream**

**Strengths**
- Jashboard: solid auth, real-time SSE, kanban DnD — production-ready foundation
- ClawWork: well-defined scope, clear user value
- Tech stack (Next.js + SQLite + Tailwind) keeps complexity manageable

**Risks & Gaps**
- No real LLM integration yet — chat is a stub, agents are manual
- SQLite will hit limits at scale — migration path to Postgres needed
- No monetization strategy defined for any project
- agent-dream: still conceptual, no concrete roadmap

**Market Position**
- SEA market for AI tooling is early — first-mover advantage window is open but closing
- Competition from Western tools (Linear, Notion AI) is accelerating localization efforts`;

    const pragmatistInput = `⚙️ **Feasibility & Execution — ${isoDate}**

**Next 30 Days (High Confidence)**
1. Wire Jashboard chat to real OpenClaw API — 2 days of integration work
2. Deploy ClawWork v1 with basic task creation + agent assignment — 1 week
3. Set up usage tracking webhooks from OpenClaw → Jashboard — 1 day

**Revenue Potential**
- Jashboard: SaaS licensing to other AI teams — $50-200/month per seat
- ClawWork: workflow automation — $100-500/month per organization
- Combined: target $5K MRR within 6 months if execution stays on track

**Feasibility Score**
- Jashboard production: 85% (needs LLM wiring + auth hardening)
- ClawWork MVP: 70% (scope still fuzzy)
- agent-dream: 30% (too early)`;

    const debate = `🗣️ **Synthesis Debate — ${isoDate}**

**Visionary vs Analyst**
Visionary sees Jashboard becoming a full Mission Control hub. Analyst agrees but flags the LLM integration gap as a blocking issue — the dashboard is a shell without real agent connectivity. Resolution: prioritize OpenClaw API wiring in the next sprint.

**Analyst vs Pragmatist**
Analyst warns about SQLite scale limits. Pragmatist pushes back — current scale doesn't justify the migration cost yet. Resolution: add Postgres migration to 90-day roadmap, not immediate.

**Pragmatist vs Visionary**
Pragmatist wants to focus on Jashboard + ClawWork only. Visionary wants to explore blockchain. Resolution: blockchain exploration moves to a research spike, not active development.

**Consensus**
Focus on making Jashboard genuinely useful (real LLM wiring) before expanding scope. ClawWork gets a proper scope definition document this week. agent-dream stays on the backburner.`;

    const recommendations = `✅ **Recommendations — ${isoDate}**

**1. Wire the Chat Panel to OpenClaw API (Priority: HIGH)**
The chat UI is built. The missing piece is real agent responses. Integrate the OpenClaw session API to pass chat messages to Jack/agents and stream responses back. Estimated: 1-2 days.

**2. Define ClawWork MVP Scope (Priority: HIGH)**
Create a concrete spec document for ClawWork v1: what tasks can be created, which agents can be assigned, what the approval flow looks like. Timebox: 1 week for spec, 2 weeks for MVP build.

**3. Add Usage Tracking Webhooks (Priority: MEDIUM)**
The usage_log table is live. Set up automatic logging from OpenClaw events so the Usage dashboard fills with real data instead of seed data. This gives visibility into actual API costs per agent per task.`;

    const result = db.prepare(
      `INSERT INTO memos (title, status, visionary_input, analyst_input, pragmatist_input, debate, recommendations)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(title, 'completed', visionaryInput, analystInput, pragmatistInput, debate, recommendations);

    const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(result.lastInsertRowid);

    // Create a notification
    db.prepare(
      'INSERT INTO notifications (type, title, message) VALUES (?, ?, ?)'
    ).run('rd_complete', `R&D Cycle completed: ${title}`, 'New analysis and recommendations are ready for review.');

    logActivity('rd_cycle_started', `R&D cycle triggered: ${title}`, { memoId: result.lastInsertRowid });
    await notifyDiscord(`🧪 R&D cycle triggered: **${title}**`);

    return NextResponse.json(memo, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to trigger R&D cycle' }, { status: 500 });
  }
}
