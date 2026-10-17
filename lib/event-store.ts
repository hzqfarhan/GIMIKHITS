/** The small common subset used by both Cloudflare D1 and local SQLite. */
export interface EventStatement {
  bind(...values: (string | number | null)[]): EventStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface EventStore {
  prepare(sql: string): EventStatement;
  batch(statements: EventStatement[]): Promise<unknown>;
}
export interface EventRuntime {
  DB: EventStore;
  ORGANISER_KEY?: string;
  EVENT_BASE_DOMAIN?: string;
}
