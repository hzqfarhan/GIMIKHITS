import type { EventStatement, EventStore } from './event-store';

const count = '(SELECT COUNT(*) FROM activations WHERE epoch=event.epoch)';
const operations = new Map<string, string>([
 [`SELECT *, ${count} AS audience FROM event WHERE id=1`, 'read_event'],
 ['INSERT OR IGNORE INTO event (id, epoch, code) VALUES (1, ?, ?)', 'init'],
 ['SELECT 1 FROM activations WHERE epoch=? AND device=?', 'activated'],
 ['INSERT INTO login_attempts (bucket, attempts) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1', 'login_increment'],
 ['SELECT attempts FROM login_attempts WHERE bucket=?', 'login_read'],
 [`INSERT OR IGNORE INTO activations (epoch,device) SELECT epoch,? FROM event WHERE id=1 AND phase='collecting' AND paused=0 AND ${count}+boost<quota`, 'activate'],
 [`UPDATE event SET boost=MIN(boost+?,MAX(0,quota-${count})) WHERE id=1 AND phase='collecting'`, 'boost'],
 [`UPDATE event SET boost=MAX(0,quota-${count}), paused=0 WHERE id=1 AND phase='collecting'`, 'unlock'],
 ["UPDATE event SET paused=1-paused WHERE id=1 AND phase='collecting'", 'pause'],
 ["UPDATE event SET quota=?,video_url=? WHERE id=1 AND phase='collecting'", 'settings'],
 [`UPDATE event SET phase='launching',launched_at=? WHERE id=1 AND epoch=? AND code=? AND phase='collecting' AND ${count}+boost>=quota`, 'launch'],
]);
type Value = string | number | null;
type Rpc = (operation: string, values: Value[]) => Promise<unknown>;
class SupabaseStatement implements EventStatement {
 constructor(readonly sql: string, readonly values: Value[], private rpc: Rpc) {}
 bind(...values: Value[]) { return new SupabaseStatement(this.sql, values, this.rpc); }
 private execute() {
  const operation = operations.get(this.sql);
  if (!operation) throw new Error('Unsupported Supabase event statement');
  return this.rpc(operation, this.values);
 }
 async first<T>() { return await this.execute() as T | null; }
 async run() { return await this.execute() as {meta:{changes:number}}; }
}
export function createSupabaseStore(url: string, key: string, transport: typeof fetch = fetch): EventStore {
 const base = new URL(url);
 if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('SUPABASE_URL must be the HTTPS project root URL');
 if (!key || key.startsWith('sb_publishable_')) throw new Error('A Supabase server secret is required');
 const rpc: Rpc = async (operation, values) => {
  const response = await transport(new URL('/rest/v1/rpc/hits_room_store', base), {
   method:'POST', cache:'no-store', signal:AbortSignal.timeout(8000),
   headers:{'Content-Type':'application/json', apikey:key, ...(key.startsWith('sb_secret_') ? {} : {Authorization:`Bearer ${key}`})},
   body:JSON.stringify({p_operation:operation,p_values:values}),
  });
  if (!response.ok) throw new Error(`Supabase event operation failed (${response.status}); check server configuration and migration`);
  return response.json();
 };
 return {
  prepare: sql => new SupabaseStatement(sql, [], rpc),
  async batch(statements) {
   const [remove, reset, attempts] = statements as SupabaseStatement[];
   if (statements.length !== 3 || remove.sql !== 'DELETE FROM activations' || reset.sql !== "UPDATE event SET epoch=?,boost=0,paused=0,phase='collecting',launched_at=NULL,code=? WHERE id=1" || attempts.sql !== 'DELETE FROM login_attempts') throw new Error('Unsupported Supabase transaction');
   return rpc('reset', reset.values);
  },
 };
}
