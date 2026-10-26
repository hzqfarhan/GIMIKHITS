import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { EventRuntime, EventStatement, EventStore } from './event-store';
import { createSupabaseStore } from './supabase-event-store';

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
    CREATE TABLE IF NOT EXISTS event (id INTEGER PRIMARY KEY NOT NULL, epoch TEXT NOT NULL, quota INTEGER NOT NULL DEFAULT 100, boost INTEGER NOT NULL DEFAULT 0, paused INTEGER NOT NULL DEFAULT 0, phase TEXT NOT NULL DEFAULT 'collecting', code TEXT NOT NULL, launched_at INTEGER, video_url TEXT NOT NULL DEFAULT '', audio_settings TEXT NOT NULL DEFAULT '{"musicVolume":25,"sfxVolume":100,"musicUrl":""}');
    CREATE TABLE IF NOT EXISTS login_attempts (bucket TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);`);
  if (!(db.prepare('PRAGMA table_info(event)').all() as { name: string }[]).some(column => column.name === 'audio_settings')) {
    db.exec(`ALTER TABLE event ADD COLUMN audio_settings TEXT NOT NULL DEFAULT '{"musicVolume":25,"sfxVolume":100,"musicUrl":""}'`);
  }
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

const STORE_SCHEMA_VERSION = 1;
const globalRuntime = globalThis as typeof globalThis & { __hitsStore?: EventStore; __hitsStoreSchemaVersion?: number };
export function nodeEventRuntime(): EventRuntime {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url || key || process.env.VERCEL) {
    if (!url || !key) throw new Error('Configure SUPABASE_URL and SUPABASE_SECRET_KEY on Vercel; local SQLite is disabled there');
    return { DB: createSupabaseStore(url, key), ORGANISER_KEY: process.env.ORGANISER_KEY, EVENT_BASE_DOMAIN: process.env.EVENT_BASE_DOMAIN };
  }
  // Replace an older development cache once so hot reload also runs migrations.
  if (!globalRuntime.__hitsStore || globalRuntime.__hitsStoreSchemaVersion !== STORE_SCHEMA_VERSION) {
    globalRuntime.__hitsStore = createStore();
    globalRuntime.__hitsStoreSchemaVersion = STORE_SCHEMA_VERSION;
  }
  return { DB: globalRuntime.__hitsStore, ORGANISER_KEY: localSecret(), EVENT_BASE_DOMAIN: process.env.EVENT_BASE_DOMAIN };
}
