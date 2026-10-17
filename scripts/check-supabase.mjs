import assert from 'node:assert/strict';
import {readFileSync, mkdirSync} from 'node:fs';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
mkdirSync('.local/tests',{recursive:true});
await build({entryPoints:['lib/supabase-event-store.ts','lib/event-service.ts','lib/node-event-runtime.ts'],outdir:'.local/tests',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {createSupabaseStore}=await import('../.local/tests/supabase-event-store.mjs');
const {createEventHandler}=await import('../.local/tests/event-service.mjs');
const {nodeEventRuntime}=await import('../.local/tests/node-event-runtime.mjs');
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
await db.exec("create table public.other_project_data (id integer primary key, value text); insert into public.other_project_data values (1,'keep me'); grant select on public.other_project_data to anon;");
const migration=readFileSync('supabase/migrations/20261018_hits_shared_event.sql','utf8');
await db.exec(migration);await db.exec(migration);
let calls=0;
const transport=async(url,options)=>{
 assert.equal(new URL(url).pathname,'/rest/v1/rpc/hits_room_store');assert.equal(options.cache,'no-store');
 assert.equal(options.headers.apikey,'sb_secret_test');assert.equal(options.headers.Authorization,undefined);
 const {p_operation,p_values}=JSON.parse(options.body);calls++;
 const result=await db.query('select public.hits_room_store($1,$2::jsonb) as result',[p_operation,JSON.stringify(p_values)]);
 return Response.json(result.rows[0].result);
};
const hosts=['hitsmainpanel','qr','audience','bypass'].map(x=>`https://${x}.seladevs.my`);
// Each host has a separate server runtime, sharing only PostgreSQL.
const handlers=hosts.map(()=>createEventHandler({DB:createSupabaseStore('https://test.supabase.co','sb_secret_test',transport),ORGANISER_KEY:'test-only-password',EVENT_BASE_DOMAIN:'seladevs.my'}));
async function req(index,action,body={},cookie='',expected=200){
 const response=await handlers[index][action?'POST':'GET'](new Request(hosts[index]+'/api/event',{method:action?'POST':'GET',headers:{Origin:hosts[index],Cookie:cookie,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})}));
 const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));
 return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};
}
try{
 const initial=await req(0);assert.equal(initial.data.total,0);
 await req(3,'boost',{value:25},'',401);
 await req(3,'login',{key:'wrong'},'',401);
 const op=(await req(3,'login',{key:'test-only-password'})).cookie;
 await req(3,'settings',{value:10,videoUrl:''},op);
 const tap=await req(2,'activate');
 assert.equal(tap.data.total,1);assert.equal((await req(2,'activate',{},tap.cookie)).data.total,1);
 for(let i=0;i<4;i++){const s=(await req(i)).data;assert.equal(s.total,1);assert.equal(s.epoch,tap.data.epoch);assert.equal(s.operator,false);assert.equal(s.boost,undefined);assert.equal(s.links.audience,hosts[2]+'/');}
 await req(3,'pause',{},op);assert.equal((await req(2,'activate')).data.total,1);await req(3,'pause',{},op);
 await Promise.all(Array.from({length:30},()=>req(2,'activate')));
 assert.equal((await req(1)).data.total,10,'Concurrent activations must stop at quota');
 const ready=(await req(0)).data;assert.equal(ready.phase,'ready');
 await req(0,'launch',{code:ready.code},'',401);await req(0,'launch',{code:'wrong'},op,400);
 const launched=(await req(0,'launch',{code:ready.code},op)).data;assert.equal(launched.phase,'launching');
 for(let i=0;i<4;i++)assert.equal((await req(i)).data.launchedAt,launched.launchedAt);
 await req(0,'launch',{code:ready.code},op,409);
 assert.equal((await req(2,'activate')).data.total,10);
 await req(3,'reset',{},op);const fresh=(await req(2,null,{},tap.cookie)).data;assert.equal(fresh.total,0);assert.equal(fresh.activated,false);assert.notEqual(fresh.epoch,ready.epoch);
 await req(3,'boost',{value:5},op);assert.equal((await req(1)).data.total,5);
 await req(3,'unlock',{},op);assert.equal((await req(0)).data.total,10);
 await req(3,'settings',{value:0},op,400);await req(3,'settings',{value:10,videoUrl:'javascript:bad'},op,400);
 const csrf=await handlers[3].POST(new Request(hosts[3]+'/api/event',{method:'POST',headers:{Origin:hosts[2],Cookie:op},body:JSON.stringify({action:'reset'})}));assert.equal(csrf.status,403);
 for(let i=0;i<13;i++)await req(3,'login',{key:'wrong'},'',401);
 await req(3,'login',{key:'test-only-password'},'',429);
 await req(3,'reset',{},op);await req(3,'login',{key:'test-only-password'},'',429);
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query("select public.hits_room_store('read_event')"));
  await assert.rejects(db.query('select * from hits_room.event'));
  await db.exec('reset role');
 }
 await db.exec('set role service_role');await db.query("select public.hits_room_store('read_event')");await db.exec('reset role');
 await assert.rejects(createSupabaseStore('https://test.supabase.co','sb_secret_test',transport).prepare('DROP TABLE event').run());
 const old={VERCEL:process.env.VERCEL,SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};
 process.env.VERCEL='1';delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 assert.throws(()=>nodeEventRuntime(),/Configure SUPABASE/);
 for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 assert.deepEqual((await db.query('select * from public.other_project_data')).rows,[{id:1,value:'keep me'}]);
 await db.exec('set role anon');assert.equal((await db.query('select value from public.other_project_data')).rows[0].value,'keep me');await db.exec('reset role');
 console.log(`PASS: ${calls} RPC calls against embedded PostgreSQL. Migration rerun, 4-host sync, duplicates, concurrent quota cap, pause, boost, unlock, launch, reset, auth, CSRF, private permissions, rate limits, Vercel fail-closed.`);
}finally{await db.close();}

