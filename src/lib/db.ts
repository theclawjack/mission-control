import path from 'path';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

type DbInstance = ReturnType<typeof Database>;

declare global {
  // eslint-disable-next-line no-var
  var _mcDb: DbInstance | undefined;
}

function initializeDb(db: DbInstance) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignee TEXT DEFAULT 'Jet',
      priority TEXT DEFAULT 'med',
      status TEXT DEFAULT 'todo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      type TEXT DEFAULT 'reminder',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT DEFAULT 'idle',
      current_task TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      progress INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'med',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      visionary_input TEXT,
      analyst_input TEXT,
      pragmatist_input TEXT,
      debate TEXT,
      recommendations TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add completed_note column if not exists
  try {
    db.prepare("ALTER TABLE tasks ADD COLUMN completed_note TEXT DEFAULT ''").run();
  } catch {
    // Column already exists, ignore
  }

  // Migration: add project_id column to tasks
  try {
    db.prepare('ALTER TABLE tasks ADD COLUMN project_id INTEGER DEFAULT NULL').run();
  } catch {
    // Column already exists, ignore
  }

  // Migration: add parent_id column to tasks
  try {
    db.prepare('ALTER TABLE tasks ADD COLUMN parent_id INTEGER DEFAULT NULL').run();
  } catch {
    // Column already exists, ignore
  }

  // Migration: add blocked_by column to tasks
  try {
    db.prepare('ALTER TABLE tasks ADD COLUMN blocked_by INTEGER DEFAULT NULL').run();
  } catch {
    // Column already exists, ignore
  }

  // Indexes for common queries on tasks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks (parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
  `);

  // New tables for Phase 1 features
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL DEFAULT 'user',
      content TEXT NOT NULL,
      agent TEXT DEFAULT 'Jack',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0.0,
      task_ref TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_usage_agent ON usage_log(agent);
    CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at);

    CREATE TABLE IF NOT EXISTS git_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      repo TEXT NOT NULL,
      branch TEXT DEFAULT 'main',
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      sha TEXT DEFAULT '',
      url TEXT DEFAULT '',
      project_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_git_project ON git_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_git_created ON git_events(created_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read);

    CREATE TABLE IF NOT EXISTS agent_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      session_type TEXT DEFAULT 'task',
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      tool_calls TEXT DEFAULT '[]',
      files_changed TEXT DEFAULT '[]',
      commands_run TEXT DEFAULT '[]',
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0.0,
      duration_seconds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent);
    CREATE INDEX IF NOT EXISTS idx_agent_sessions_started ON agent_sessions(started_at);
  `);

  // TODO(mock): Seed agent_sessions with representative sessions from the last 2 days of work
  const sessionsCount = db.prepare('SELECT COUNT(*) as c FROM agent_sessions').get() as { c: number };
  if (sessionsCount.c === 0) {
    const insSess = db.prepare(`
      INSERT INTO agent_sessions
        (agent, session_type, title, summary, tool_calls, files_changed, commands_run,
         tokens_used, cost_usd, duration_seconds, status, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now4 = Date.now();
    const sessions = [
      {
        agent: 'Coder',
        session_type: 'task',
        title: 'Tier 1+2 Upgrade — DnD kanban, SSE, activity feed',
        summary: 'Built 10 features: drag-and-drop kanban, SSE for agent status, activity feed, subtasks, global search, notifications, settings page',
        tool_calls: JSON.stringify([
          { tool: 'edit', args_summary: 'Modified 26 files', result_summary: '+2,218 lines' },
          { tool: 'exec', args_summary: 'npm install @hello-pangea/dnd', result_summary: 'Added DnD library' },
          { tool: 'exec', args_summary: 'npm run build', result_summary: 'Build passed' },
        ]),
        files_changed: JSON.stringify(['tasks/page.tsx', 'db.ts', 'StatusBanner.tsx', 'SearchPalette.tsx', 'Sidebar.tsx']),
        commands_run: JSON.stringify(['npm install @hello-pangea/dnd', 'npm run build']),
        tokens_used: 30900,
        cost_usd: 0.98,
        duration_seconds: 423,
        status: 'completed',
        started_at: new Date(now4 - 2 * 86400000 - 7200000).toISOString(),
        completed_at: new Date(now4 - 2 * 86400000 - 7200000 + 423000).toISOString(),
      },
      {
        agent: 'Reviewer',
        session_type: 'task',
        title: 'QA Audit — Fix 11 bugs + add DB indexes',
        summary: 'Found and fixed: missing auth guard, async params pattern, orphan subtasks, StatusBanner mapping, kanban snap-back, calendar mobile layout. Added force-dynamic to all routes.',
        tool_calls: JSON.stringify([
          { tool: 'read', args_summary: 'Audited all 26 API routes', result_summary: 'Found 11 issues' },
          { tool: 'edit', args_summary: 'Fixed 25 files', result_summary: '+113/-28 lines' },
          { tool: 'exec', args_summary: 'npm run build', result_summary: 'Build passed, 0 errors' },
        ]),
        files_changed: JSON.stringify(['tasks/dispatch/route.ts', 'cron-events/route.ts', 'projects/[id]/route.ts', 'StatusBanner.tsx', 'calendar/page.tsx']),
        commands_run: JSON.stringify(['npm run build', 'curl tests']),
        tokens_used: 27800,
        cost_usd: 0.42,
        duration_seconds: 581,
        status: 'completed',
        started_at: new Date(now4 - 2 * 86400000 - 3600000).toISOString(),
        completed_at: new Date(now4 - 2 * 86400000 - 3600000 + 581000).toISOString(),
      },
      {
        agent: 'Coder',
        session_type: 'task',
        title: 'Phase 1 — Chat, Usage, Git, R&D, Notifications',
        summary: 'Built chat embed, usage/cost tracking dashboard, git integration on project cards, wired R&D Lab trigger, notification bell with dropdown.',
        tool_calls: JSON.stringify([
          { tool: 'write', args_summary: 'Created 14 new files', result_summary: '+1,343 lines' },
          { tool: 'exec', args_summary: 'npm run build', result_summary: 'Build passed' },
        ]),
        files_changed: JSON.stringify(['chat/page.tsx', 'usage/page.tsx', 'NotificationBell.tsx', 'notify.ts', 'rd/page.tsx']),
        commands_run: JSON.stringify(['npm run build']),
        tokens_used: 21600,
        cost_usd: 0.68,
        duration_seconds: 344,
        status: 'completed',
        started_at: new Date(now4 - 86400000 - 7200000).toISOString(),
        completed_at: new Date(now4 - 86400000 - 7200000 + 344000).toISOString(),
      },
      {
        agent: 'Coder',
        session_type: 'task',
        title: 'Batch 1 — Dashboard, Markdown, Project Detail, Dependencies, Toasts, Shortcuts',
        summary: 'Dashboard command center redesign, markdown rendering in task descriptions, project detail page, task blocked_by dependencies, toast notification system, keyboard shortcuts, error boundaries.',
        tool_calls: JSON.stringify([
          { tool: 'write', args_summary: 'Created 4 new files, modified 10', result_summary: '+1,202/-303 lines' },
          { tool: 'exec', args_summary: 'npm run build', result_summary: 'Build passed' },
        ]),
        files_changed: JSON.stringify(['home/page.tsx', 'projects/[id]/page.tsx', 'tasks/page.tsx', 'Toast.tsx', 'KeyboardShortcuts.tsx', 'ErrorBoundary.tsx']),
        commands_run: JSON.stringify(['npm run build']),
        tokens_used: 41300,
        cost_usd: 1.31,
        duration_seconds: 526,
        status: 'completed',
        started_at: new Date(now4 - 86400000 - 3600000).toISOString(),
        completed_at: new Date(now4 - 86400000 - 3600000 + 526000).toISOString(),
      },
    ];
    for (const s of sessions) {
      insSess.run(
        s.agent, s.session_type, s.title, s.summary,
        s.tool_calls, s.files_changed, s.commands_run,
        s.tokens_used, s.cost_usd, s.duration_seconds, s.status,
        s.started_at, s.completed_at
      );
    }
  }

  // Activity log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Index on activity_log after table is created
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (created_at);
  `);

  // Agent status tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'idle',
      current_activity TEXT DEFAULT '',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // TODO(mock): Auto-discover agents from OpenClaw instead of hardcoded list
  // Seed agent statuses
  const agentNames = ['Jack', 'Planner', 'Coder', 'Reviewer'];
  const insertStatus = db.prepare('INSERT OR IGNORE INTO agent_status (agent_name) VALUES (?)');
  for (const a of agentNames) {
    insertStatus.run(a);
  }

  // TODO(mock): Auto-sync team members from OpenClaw agent registry
  // Seed team members if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM team_members').get() as { c: number };
  if (count.c === 0) {
    const ins = db.prepare(
      'INSERT INTO team_members (name, role, model, status, current_task) VALUES (?, ?, ?, ?, ?)'
    );
    const members = [
      ['Jack', 'Orchestrator', 'claude-opus-4-6', 'active', 'Coordinating mission operations'],
      ['Planner', 'Planning & Strategy', 'claude-sonnet-4-6', 'idle', ''],
      ['Coder', 'Code Generation', 'claude-opus-4-6', 'idle', ''],
      ['Reviewer', 'Code Review & QA', 'claude-sonnet-4-6', 'idle', ''],
    ];
    for (const m of members) {
      ins.run(...m);
    }
  }

  // Seed a sample task if empty
  const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks').get() as { c: number };
  if (taskCount.c === 0) {
    db.prepare(
      'INSERT INTO tasks (title, description, assignee, priority, status) VALUES (?, ?, ?, ?, ?)'
    ).run('Welcome to Jashboard', 'This is your first task. Edit or delete it!', 'Jet', 'low', 'todo');
  }
}

export function getDb(): DbInstance {
  if (global._mcDb) return global._mcDb;

  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(path.join(dbDir, 'mission-control.db'));
  initializeDb(db);
  global._mcDb = db;
  return db;
}
