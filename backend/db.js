import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbPath = path.join(__dirname, 'mindbloom.db');

try {
    fs.accessSync(__dirname, fs.constants.W_OK);
} catch {
    dbPath = path.join('/tmp', 'mindbloom.db');
}

const db = new Database(dbPath);


db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_color  TEXT DEFAULT '#c084fc',
    avatar_url    TEXT,
    theme         TEXT DEFAULT 'forest',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_state (
    user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    events      TEXT NOT NULL DEFAULT '[]',
    tasks       TEXT NOT NULL DEFAULT '[]',
    focus_time  REAL NOT NULL DEFAULT 0,
    filters     TEXT NOT NULL DEFAULT '["lecture","lab","study","assignment","default"]',
    categories  TEXT NOT NULL DEFAULT '[]',
    daily_goals TEXT NOT NULL DEFAULT '{}',
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
