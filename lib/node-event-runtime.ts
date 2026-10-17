import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { EventRuntime, EventStatement, EventStore } from './event-store';

class Statement implements EventStatement {
  constructor(private db: DatabaseSync, private sql: string, private values: SQLInputValue[] = []) {}
  bind(...values: (string | number | null)[]) { return new Statement(this.db, this.sql, values); }
  async first<T = Record<string, unknown>>() { return (this.db.prepare(this.sql).get(...this.values) || null) as T | null; }
  execute() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
  async run() { return this.execute(); }
}

function createStore(): EventStore {
  const filename = process.env.EVENT_DB_PATH || path.join(process.cwd(), '.local', 'event.sqlite');
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS activations (epoch TEXT NOT NULL, device TEXT NOT NULL, PRIMARY KEY(epoch,device));
    CREATE TABLE IF NOT EXISTS event (id INTEGER PRIMARY KEY NOT NULL, epoch TEXT NOT NULL, quota INTEGER NOT NULL DEFAULT 100, boost INTEGER NOT NULL DEFAULT 0, paused INTEGER NOT NULL DEFAULT 0, phase TEXT NOT NULL DEFAULT 'collecting', code TEXT NOT NULL, launched_at INTEGER, video_url TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS login_attempts (bucket TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);`);
  return {
    prepare: (sql) => new Statement(db, sql),
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => (statement as Statement).execute());
        db.exec('COMMIT');
        return results;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}

function localSecret() {
  if (process.env.ORGANISER_KEY) return process.env.ORGANISER_KEY;
  // Reuse the existing ignored local development secret; it is never bundled.
  try { return readFileSync(path.join(process.cwd(), '.dev.vars'), 'utf8').match(/^ORGANISER_KEY=(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g, ''); }
  catch { return undefined; }
}

const globalRuntime = globalThis as typeof globalThis & { __hitsStore?: EventStore };
export function nodeEventRuntime(): EventRuntime {
  globalRuntime.__hitsStore ??= createStore();
  return { DB: globalRuntime.__hitsStore, ORGANISER_KEY: localSecret(), EVENT_BASE_DOMAIN: process.env.EVENT_BASE_DOMAIN };
}
