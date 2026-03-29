import path from 'path';
import fs from 'fs';
import os from 'os';

// Use a temp dir for the test database
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-test-'));
process.env.MC_DB_DIR = testDir;

// We need to override the db path; do it by pointing cwd data/ to testDir
jest.mock('@/lib/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const fs = require('fs');

  let _db: ReturnType<typeof Database> | undefined;

  function getDb() {
    if (_db) return _db;
    const db = new Database(path.join(testDir, 'test.db'));

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        assignee TEXT DEFAULT 'Jet',
        priority TEXT DEFAULT 'med',
        status TEXT DEFAULT 'todo',
        parent_id INTEGER DEFAULT NULL,
        project_id INTEGER DEFAULT NULL,
        blocked_by INTEGER DEFAULT NULL,
        completed_note TEXT DEFAULT '',
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
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    _db = db;
    return db;
  }

  return { getDb };
}, { virtual: false });

import { getDb } from '@/lib/db';

afterAll(() => {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

describe('Database layer', () => {
  test('getDb() returns a database instance', () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });

  test('can insert and retrieve tasks', () => {
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO tasks (title, description, assignee, priority, status) VALUES (?, ?, ?, ?, ?)"
    ).run('Test task', 'Description', 'Jet', 'med', 'todo');

    expect(result.lastInsertRowid).toBeGreaterThan(0);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as { title: string; status: string };
    expect(task.title).toBe('Test task');
    expect(task.status).toBe('todo');
  });

  test('can insert and retrieve projects', () => {
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO projects (name, description) VALUES (?, ?)"
    ).run('Test Project', 'A test project');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as { name: string };
    expect(project.name).toBe('Test Project');
  });

  test('usage log works', () => {
    const db = getDb();
    db.prepare(
      'INSERT INTO usage_log (agent, model, input_tokens, output_tokens, cost_usd, task_ref) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('Coder', 'claude-opus-4-6', 1000, 500, 0.05, 'test-ref');

    const logs = db.prepare('SELECT * FROM usage_log WHERE agent = ?').all('Coder') as { agent: string; input_tokens: number }[];
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].agent).toBe('Coder');
    expect(logs[0].input_tokens).toBe(1000);
  });

  test('activity log works', () => {
    const db = getDb();
    db.prepare(
      'INSERT INTO activity_log (type, message, metadata) VALUES (?, ?, ?)'
    ).run('test_event', 'Test activity message', JSON.stringify({ key: 'value' }));

    const logs = db.prepare("SELECT * FROM activity_log WHERE type = 'test_event'").all() as { message: string }[];
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toBe('Test activity message');
  });

  test('task with parent_id is treated as subtask', () => {
    const db = getDb();
    // Insert parent task
    const parent = db.prepare(
      "INSERT INTO tasks (title, status) VALUES (?, ?)"
    ).run('Parent task', 'todo');

    // Insert subtask
    db.prepare(
      "INSERT INTO tasks (title, status, parent_id) VALUES (?, ?, ?)"
    ).run('Subtask', 'todo', parent.lastInsertRowid);

    // Main list excludes subtasks (parent_id IS NULL)
    const mainTasks = db.prepare(
      'SELECT * FROM tasks WHERE parent_id IS NULL AND title IN (?, ?)'
    ).all('Parent task', 'Subtask') as { title: string }[];

    expect(mainTasks.length).toBe(1);
    expect(mainTasks[0].title).toBe('Parent task');
  });

  test('blocked_by field stores and retrieves correctly', () => {
    const db = getDb();
    const t1 = db.prepare("INSERT INTO tasks (title) VALUES (?)").run('Blocking task');
    const t2 = db.prepare("INSERT INTO tasks (title, blocked_by) VALUES (?, ?)").run('Blocked task', t1.lastInsertRowid);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(t2.lastInsertRowid) as { blocked_by: number };
    expect(task.blocked_by).toBe(Number(t1.lastInsertRowid));
  });
});
