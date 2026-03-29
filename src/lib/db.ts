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
  `);

  // TODO(mock): Replace seed data with real OpenClaw webhook-based usage logging
  // Seed usage_log if empty
  const usageCount = db.prepare('SELECT COUNT(*) as c FROM usage_log').get() as { c: number };
  if (usageCount.c === 0) {
    const insUsage = db.prepare(
      'INSERT INTO usage_log (agent, model, input_tokens, output_tokens, cost_usd, task_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const now = Date.now();
    const sampleUsage = [
      ['Jack', 'claude-opus-4-6', 15000, 8000, 0.27, 'Jashboard upgrade', new Date(now - 6 * 86400000).toISOString()],
      ['Planner', 'claude-sonnet-4-6', 12000, 6000, 0.12, 'ClawWork planning', new Date(now - 5 * 86400000).toISOString()],
      ['Coder', 'claude-opus-4-6', 45000, 30000, 0.98, 'Phase 1 implementation', new Date(now - 3 * 86400000).toISOString()],
      ['Reviewer', 'claude-sonnet-4-6', 20000, 10000, 0.18, 'QA audit', new Date(now - 1 * 86400000).toISOString()],
    ];
    for (const u of sampleUsage) {
      insUsage.run(...u);
    }
  }

  // TODO(mock): Replace seed data with GitHub webhook listener for real commit/PR events
  // Seed git_events if empty
  const gitCount = db.prepare('SELECT COUNT(*) as c FROM git_events').get() as { c: number };
  if (gitCount.c === 0) {
    const insGit = db.prepare(
      'INSERT INTO git_events (type, repo, branch, title, author, sha, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const now2 = Date.now();
    const commits = [
      ['commit', 'mission-control', 'main', 'Initial commit: Mission Control dashboard', 'Jack', '4122173', 1, new Date(now2 - 5 * 86400000).toISOString()],
      ['commit', 'mission-control', 'main', 'Security hardening: fix all auth vulnerabilities', 'Jack', 'bea2174', 1, new Date(now2 - 4 * 86400000).toISOString()],
      ['commit', 'mission-control', 'main', 'Tier 1+2 upgrade: DnD kanban, SSE, activity feed', 'Coder', '184d37f', 1, new Date(now2 - 3 * 86400000).toISOString()],
      ['commit', 'mission-control', 'main', 'Reviewer QA: fix 11 bugs + add DB indexes', 'Reviewer', 'b22df66', 1, new Date(now2 - 2 * 86400000).toISOString()],
      ['commit', 'mission-control', 'main', 'UX: task filters, collapsible Done column', 'Jack', 'a0934de', 1, new Date(now2 - 1 * 86400000).toISOString()],
    ];
    for (const c of commits) {
      insGit.run(...c);
    }
  }

  // TODO(mock): Remove seed notifications — real ones are auto-created by task/R&D/agent flows
  // Seed notifications if empty
  const notifCount = db.prepare('SELECT COUNT(*) as c FROM notifications').get() as { c: number };
  if (notifCount.c === 0) {
    const insNotif = db.prepare(
      'INSERT INTO notifications (type, title, message, read, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const now3 = Date.now();
    insNotif.run('system', 'Jashboard Phase 1 deployed', 'Chat, Usage, Git, R&D, and Notifications are live.', 0, new Date(now3 - 300000).toISOString());
    insNotif.run('rd_complete', 'R&D Cycle completed', 'Latest R&D cycle analysis is ready for review.', 0, new Date(now3 - 1800000).toISOString());
    insNotif.run('task_completed', 'Task completed: Phase 1 implementation', 'Coder agent finished Phase 1 feature build.', 0, new Date(now3 - 3600000).toISOString());
    insNotif.run('agent_alert', 'Agent Reviewer went offline', 'Reviewer agent has not checked in for 30 minutes.', 0, new Date(now3 - 7200000).toISOString());
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
