import type { EventRuntime } from './event-store';
import { launchLinks } from './launch-routing';
export function createEventHandler(runtime: EventRuntime) {
const json = (value: unknown, status = 200, cookie?: string, cacheControl = 'private, no-store') => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl, ...(cookie ? {'Set-Cookie': cookie} : {}) },
});
const cookies = (r: Request) => Object.fromEntries((r.headers.get('cookie') || '').split(';').map(v => v.trim().split('=')));
function cookie(r: Request, name: string, value: string, maxAge = 31536000) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(r.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function signature(value: string) {
  const secret = runtime.ORGANISER_KEY || 'hits-open-access';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function authorised(_r: Request) {
  return true;
}
type EventRow = {id: number; epoch: string; quota: number; boost: number; paused: number; phase: string; code: string; launched_at: number | null; video_url: string; audience: number};
const countSql = '(SELECT COUNT(*) FROM activations WHERE epoch=event.epoch)';
async function event() {
  const existing = await runtime.DB.prepare(`SELECT *, ${countSql} AS audience FROM event WHERE id=1`).first<EventRow>();
  if (existing) return existing;
  await runtime.DB.prepare('INSERT OR IGNORE INTO event (id, epoch, code) VALUES (1, ?, ?)').bind(crypto.randomUUID(), String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000)).run();
  return (await runtime.DB.prepare(`SELECT *, ${countSql} AS audience FROM event WHERE id=1`).first()) as EventRow;
}
async function snapshot(r: Request, sharedAudience = false) {
  const row = await event();
  const isOperator = !sharedAudience;
  const device = sharedAudience ? '' : cookies(r).hits_device;
  const activated = !!device && !!await runtime.DB.prepare('SELECT 1 FROM activations WHERE epoch=? AND device=?').bind(row.epoch, device).first();
  const total = row.audience + row.boost;
  const phase = row.phase === 'collecting' && total >= row.quota ? 'ready' : row.phase;
  return { epoch:row.epoch, quota:row.quota, total, audience:row.audience, boost:isOperator ? row.boost : undefined,
    paused:!!row.paused, phase, code: !sharedAudience && phase === 'ready' ? row.code : undefined,
    launchedAt:row.launched_at, videoUrl:sharedAudience ? '' : row.video_url, activated, operator:isOperator, serverTime:Date.now(), configured:true, links:launchLinks(r.url,runtime.EVENT_BASE_DOMAIN) };
}
async function GET(r: Request) {
  try {
    const sharedAudience = new URL(r.url).searchParams.get('view') === 'audience';
    return json(await snapshot(r, sharedAudience), 200, undefined, sharedAudience ? 'public, s-maxage=1, stale-while-revalidate=4' : 'private, no-store');
  }
  catch (e) { console.error('Event state unavailable', e); return json({error:'The launch connection is unavailable. Please retry.'},503); }
}
async function POST(r: Request) {
  try {
    const origin = r.headers.get('origin');
    if (origin && origin !== new URL(r.url).origin) return json({error:'This request must come from the launch website.'},403);
    if (Number(r.headers.get('content-length') || 0) > 4096) return json({error:'Request too large.'},413);
    const raw = await r.text();
    if (raw.length>4096) return json({error:'Request too large.'},413);
    let body: {action:string; key?:string; code?:string; value?:number; videoUrl?:string};
    try { body=JSON.parse(raw); } catch { return json({error:'Invalid request.'},400); }
    if (!body || typeof body.action!=='string') return json({error:'Invalid request.'},400);
    if (body.action === 'login') {
      const expires = String(Date.now()+12*60*60*1000);
      return json({ok:true},200,cookie(r,'hits_operator',`${expires}.${await signature(expires)}`,43200));
    }
    if (body.action === 'logout') return json({ok:true},200,cookie(r,'hits_operator','',0));
    const row = await event();
    if (body.action === 'activate') {
      const device = /^[a-f0-9-]{36}$/.test(cookies(r).hits_device || '') ? cookies(r).hits_device : crypto.randomUUID();
      await runtime.DB.prepare(`INSERT OR IGNORE INTO activations (epoch,device) SELECT epoch,? FROM event WHERE id=1 AND phase='collecting' AND paused=0 AND ${countSql}+boost<quota`).bind(device).run();
      const response = await snapshot(new Request(r.url,{headers:{cookie:`${r.headers.get('cookie') || ''}; hits_device=${device}`}}));
      return json(response,200,cookie(r,'hits_device',device));
    }
    if (body.action === 'launch') {
      if (body.code !== row.code) return json({error:'That code does not match. Please try again.'},400);
      const result = await runtime.DB.prepare(`UPDATE event SET phase='launching',launched_at=? WHERE id=1 AND epoch=? AND code=? AND phase='collecting' AND ${countSql}+boost>=quota`).bind(Date.now(),row.epoch,body.code).run();
      if (!result.meta.changes) return json({error:'The core must be fully charged before launch.'},409);
      return json(await snapshot(r));
    }
    if (body.action === 'boost') {
      const value = Number(body.value);
      if (![1,5,10,25].includes(value)) return json({error:'Choose an available boost amount.'},400);
      await runtime.DB.prepare(`UPDATE event SET boost=MIN(boost+?,MAX(0,quota-${countSql})) WHERE id=1 AND phase='collecting'`).bind(value).run();
    } else if (body.action === 'unlock') {
      await runtime.DB.prepare(`UPDATE event SET boost=MAX(0,quota-${countSql}), paused=0 WHERE id=1 AND phase='collecting'`).run();
    } else if (body.action === 'pause') {
      await runtime.DB.prepare("UPDATE event SET paused=1-paused WHERE id=1 AND phase='collecting'").run();
    } else if (body.action === 'settings') {
      const quota = Number(body.value);
      if (!Number.isInteger(quota) || quota<1 || quota>100000) return json({error:'The target must be between 1 and 100,000.'},400);
      const videoUrl = String(body.videoUrl || '').trim();
      if (videoUrl && !videoUrl.startsWith('/media/') && !/^https:\/\//.test(videoUrl)) return json({error:'Use an HTTPS video link or a /media/ video path.'},400);
      await runtime.DB.prepare("UPDATE event SET quota=?,video_url=? WHERE id=1 AND phase='collecting'").bind(quota,videoUrl).run();
    } else if (body.action === 'reset') {
      await runtime.DB.batch([
        runtime.DB.prepare('DELETE FROM activations WHERE epoch IS NOT NULL'),
        runtime.DB.prepare("UPDATE event SET epoch=?,boost=0,paused=0,phase='collecting',launched_at=NULL,code=? WHERE id=1").bind(crypto.randomUUID(),String(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000)),
        runtime.DB.prepare('DELETE FROM login_attempts WHERE bucket IS NOT NULL'),
      ]);
    } else return json({error:'Unknown control.'},400);
    return json(await snapshot(r));
  } catch (e) { console.error('Event action failed',e); return json({error:'The action could not be saved. Check the connection and retry.'},503); }
}

return { GET, POST };
}
