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

  // Seed agent statuses
  const agentNames = ['Jack', 'Planner', 'Coder', 'Reviewer', 'Writer', 'Debugger'];
  const insertStatus = db.prepare('INSERT OR IGNORE INTO agent_status (agent_name) VALUES (?)');
  for (const a of agentNames) {
    insertStatus.run(a);
  }

  // Seed team members if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM team_members').get() as { c: number };
  if (count.c === 0) {
    const ins = db.prepare(
      'INSERT INTO team_members (name, role, model, status, current_task) VALUES (?, ?, ?, ?, ?)'
    );
    const members = [
      ['Jack', 'Orchestrator', 'claude-opus-4-6', 'active', 'Coordinating mission operations'],
      ['Planner', 'Planning & Strategy', 'claude-sonnet-4-6', 'idle', ''],
      ['Coder', 'Code Generation', 'claude-haiku-4-5', 'idle', ''],
      ['Reviewer', 'Code Review & QA', 'claude-sonnet-4-6', 'idle', ''],
      ['Writer', 'Documentation & Content', 'claude-haiku-4-5', 'idle', ''],
      ['Debugger', 'Debugging & Troubleshooting', 'claude-sonnet-4-6', 'idle', ''],
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
    ).run('Welcome to Mission Control', 'This is your first task. Edit or delete it!', 'Jet', 'low', 'todo');
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
