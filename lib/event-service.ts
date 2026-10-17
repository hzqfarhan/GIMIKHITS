import type { EventRuntime } from './event-store';
import { launchLinks } from './launch-routing';
export function createEventHandler(runtime: EventRuntime) {
const json = (value: unknown, status = 200, cookie?: string) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(cookie ? {'Set-Cookie': cookie} : {}) },
});
const cookies = (r: Request) => Object.fromEntries((r.headers.get('cookie') || '').split(';').map(v => v.trim().split('=')));
function cookie(r: Request, name: string, value: string, maxAge = 31536000) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(r.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function signature(value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(runtime.ORGANISER_KEY), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function authorised(r: Request) {
  if (!runtime.ORGANISER_KEY) return false;
  const token = cookies(r).hits_operator || '';
  const [expires, sig] = token.split('.');
  if (!/^\d{13}$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(sig || '') || Number(expires) <= Date.now()) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(runtime.ORGANISER_KEY), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const signatureBytes=new Uint8Array(32);
  for(let i=0;i<32;i++) signatureBytes[i]=parseInt(sig.slice(i*2,i*2+2),16);
  return crypto.subtle.verify('HMAC',key,signatureBytes,new TextEncoder().encode(expires));
}
type EventRow = {id: number; epoch: string; quota: number; boost: number; paused: number; phase: string; code: string; launched_at: number | null; video_url: string; audience: number};
const countSql = '(SELECT COUNT(*) FROM activations WHERE epoch=event.epoch)';
async function event() {
  const existing = await runtime.DB.prepare(`SELECT *, ${countSql} AS audience FROM event WHERE id=1`).first<EventRow>();
  if (existing) return existing;
  await runtime.DB.prepare('INSERT OR IGNORE INTO event (id, epoch, code) VALUES (1, ?, ?)').bind(crypto.randomUUID(), String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000)).run();
  return (await runtime.DB.prepare(`SELECT *, ${countSql} AS audience FROM event WHERE id=1`).first()) as EventRow;
}
async function snapshot(r: Request) {
  const row = await event();
  const isOperator = await authorised(r);
  const device = cookies(r).hits_device;
  const activated = !!device && !!await runtime.DB.prepare('SELECT 1 FROM activations WHERE epoch=? AND device=?').bind(row.epoch, device).first();
  const total = row.audience + row.boost;
  const phase = row.phase === 'collecting' && total >= row.quota ? 'ready' : row.phase;
  return { epoch:row.epoch, quota:row.quota, total, audience:row.audience, boost:isOperator ? row.boost : undefined,
    paused:!!row.paused, phase, code: phase === 'ready' ? row.code : undefined,
    launchedAt:row.launched_at, videoUrl:row.video_url, activated, operator:isOperator, serverTime:Date.now(), configured:!!runtime.ORGANISER_KEY, links:launchLinks(r.url,runtime.EVENT_BASE_DOMAIN) };
}
async function GET(r: Request) {
  try { return json(await snapshot(r)); }
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
      if (!runtime.ORGANISER_KEY) return json({error:'Set the ORGANISER_KEY server secret before arming the stage.'},503);
      const ip = r.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || r.headers.get('cf-connecting-ip') || 'local';
      const bucket = `${ip}:${Math.floor(Date.now()/300000)}`;
      await runtime.DB.prepare('INSERT INTO login_attempts (bucket, attempts) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1').bind(bucket).run();
      const attempts = await runtime.DB.prepare('SELECT attempts FROM login_attempts WHERE bucket=?').bind(bucket).first<{attempts:number}>();
      if ((attempts?.attempts || 0)>15) return json({error:'Too many attempts. Try again in five minutes.'},429);
      if (body.key !== runtime.ORGANISER_KEY) return json({error:'The organiser key is incorrect.'},401);
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
    if (!await authorised(r)) return json({error:'Sign in with the organiser key to use this control.'},401);
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
    } else if (body.action === 'launch') {
      if (body.code !== row.code) return json({error:'That code does not match. Please try again.'},400);
      const result = await runtime.DB.prepare(`UPDATE event SET phase='launching',launched_at=? WHERE id=1 AND epoch=? AND code=? AND phase='collecting' AND ${countSql}+boost>=quota`).bind(Date.now(),row.epoch,body.code).run();
      if (!result.meta.changes) return json({error:'The core must be fully charged before launch.'},409);
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
