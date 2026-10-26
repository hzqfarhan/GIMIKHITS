import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
mkdirSync('.local/tests',{recursive:true});
await build({entryPoints:['lib/supabase-event-store.ts','lib/event-service.ts','lib/node-event-runtime.ts','lib/audio-settings.ts'],outdir:'.local/tests',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {createSupabaseStore}=await import('../.local/tests/supabase-event-store.mjs');
const {createEventHandler}=await import('../.local/tests/event-service.mjs');
const {nodeEventRuntime}=await import('../.local/tests/node-event-runtime.mjs');
const {DEFAULT_AUDIO_SETTINGS,parseAudioSettings,readAudioSettings}=await import('../.local/tests/audio-settings.mjs');
assert.deepEqual(readAudioSettings(undefined),DEFAULT_AUDIO_SETTINGS);
assert.deepEqual(readAudioSettings('{broken'),DEFAULT_AUDIO_SETTINGS);
assert.deepEqual(readAudioSettings({musicVolume:10}),DEFAULT_AUDIO_SETTINGS);
assert.deepEqual(parseAudioSettings({...DEFAULT_AUDIO_SETTINGS,musicUrl:'HTTPS://audio.example/music.mp3'}),{...DEFAULT_AUDIO_SETTINGS,musicUrl:'HTTPS://audio.example/music.mp3'});
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
await db.exec("create table public.other_project_data (id integer primary key, value text); insert into public.other_project_data values (1,'keep me'); grant select on public.other_project_data to anon;");
// Start with a room from before audio settings existed, preserving its event.
await db.exec("create schema hits_room; create table hits_room.event (id integer primary key, epoch text not null, quota integer not null default 100, boost integer not null default 0, paused integer not null default 0, phase text not null default 'collecting', code text not null, launched_at bigint, video_url text not null default ''); insert into hits_room.event(id,epoch,code) values(1,'legacy-room','290978');");
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
async function req(index,action,body={},cookie='',expected=200,shared=false){
 const url = hosts[index]+'/api/event'+(shared?'?view=audience':'');
 const response=await handlers[index][action?'POST':'GET'](new Request(url,{method:action?'POST':'GET',headers:{Origin:hosts[index],Cookie:cookie,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})}));
 const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));
 return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};
}
try{
 const initial=await req(0);assert.equal(initial.data.total,0);assert.equal(initial.data.epoch,'legacy-room');assert.deepEqual(initial.data.audioSettings,DEFAULT_AUDIO_SETTINGS);
 const longAudioUrl='https://audio.example/'+'a'.repeat(2048-'https://audio.example/'.length);
 const invalidAudioSettings=[undefined,null,[],{}, {...DEFAULT_AUDIO_SETTINGS,musicVolume:-1},{...DEFAULT_AUDIO_SETTINGS,musicVolume:101}, {...DEFAULT_AUDIO_SETTINGS,musicVolume:25.5},{...DEFAULT_AUDIO_SETTINGS,musicVolume:'25'}, {...DEFAULT_AUDIO_SETTINGS,sfxVolume:-1},{...DEFAULT_AUDIO_SETTINGS,sfxVolume:121},{...DEFAULT_AUDIO_SETTINGS,sfxVolume:0.5},{...DEFAULT_AUDIO_SETTINGS,musicUrl:null},
  ...['http://audio.example/music.mp3','//audio.example/music.mp3','javascript:alert(1)','https://','https://user:pass@audio.example/music.mp3','https://audio.example/music.mp3#clip','https://audio.example/music.mp3#','/media/../../secret','/media/%2e%2e/secret','/media/%2f..%2fsecret','/media/%5c..%5csecret','/media/%00.mp3','/media/','/other/music.mp3',longAudioUrl+'x'].map(musicUrl=>({...DEFAULT_AUDIO_SETTINGS,musicUrl}))];
 for(const audioSettings of invalidAudioSettings) {assert.equal(parseAudioSettings(audioSettings),null);await req(3,'audio-settings',{audioSettings},'',400);}
 assert.deepEqual((await req(0)).data.audioSettings,DEFAULT_AUDIO_SETTINGS,'Invalid writes must not change the saved mix');
 const aboveUnityMix={...DEFAULT_AUDIO_SETTINGS,sfxVolume:101};
 assert.deepEqual(parseAudioSettings(aboveUnityMix),aboveUnityMix);
 assert.deepEqual((await req(3,'audio-settings',{audioSettings:aboveUnityMix})).data.audioSettings,aboveUnityMix);
 let audioSettings={musicVolume:0,sfxVolume:120,musicUrl:longAudioUrl};
 assert.deepEqual(parseAudioSettings(audioSettings),audioSettings);
 await req(3,'audio-settings',{audioSettings});
 for(const index of [0,1,3])assert.deepEqual((await req(index)).data.audioSettings,audioSettings,'Audio settings must synchronize across presentation hosts');
 assert.equal((await req(2,null,{},'',200,true)).data.audioSettings,undefined,'Audience polling omits audio controls');
 audioSettings={musicVolume:100,sfxVolume:0,musicUrl:'/media/alternate-track.mp3'};
 await req(3,'audio-settings',{audioSettings});
 await req(3,'boost',{value:25});
 await req(3,'reset');
 await req(3,'settings',{value:10,videoUrl:''});
 assert.deepEqual((await req(0)).data.audioSettings,audioSettings,'Target/video settings and reset must preserve the mix');
 const tap=await req(2,'activate');
 assert.equal(tap.data.total,1);assert.equal((await req(2,'activate',{},tap.cookie)).data.total,1);
 const audienceSnapshot=(await req(2,null,{},'',200,true)).data;
 assert.equal(audienceSnapshot.total,1);assert.equal(audienceSnapshot.epoch,tap.data.epoch);assert.equal(audienceSnapshot.operator,false);assert.equal(audienceSnapshot.boost,undefined);assert.equal(audienceSnapshot.links.audience,hosts[2]+'/');
 await req(3,'pause');assert.equal((await req(2,'activate')).data.total,1);await req(3,'pause');
 await Promise.all(Array.from({length:30},()=>req(2,'activate')));
 assert.equal((await req(1)).data.total,10,'Concurrent activations must stop at quota');
 const ready=(await req(0)).data;assert.equal(ready.phase,'ready');
 await req(0,'launch',{code:'wrong'},'',400);
 const launched=(await req(0,'launch',{code:ready.code})).data;assert.equal(launched.phase,'launching');
 audioSettings={musicVolume:35,sfxVolume:120,musicUrl:'https://audio.example/final.mp3?version=2'};
 const adjusted=(await req(3,'audio-settings',{audioSettings})).data;
 assert.deepEqual(adjusted.audioSettings,audioSettings);assert.equal(adjusted.phase,'launching');assert.equal(adjusted.launchedAt,launched.launchedAt);assert.equal(adjusted.quota,10);
 for(let i=0;i<4;i++)assert.equal((await req(i)).data.launchedAt,launched.launchedAt);
 for(const index of [0,1,3])assert.deepEqual((await req(index)).data.audioSettings,audioSettings,'The 120% SFX setting must synchronize during launch');
 await req(0,'launch',{code:ready.code},'',409);
 assert.equal((await req(2,'activate')).data.total,10);
 await req(3,'reset');const fresh=(await req(2,null,{},tap.cookie)).data;assert.equal(fresh.total,0);assert.equal(fresh.activated,false);assert.notEqual(fresh.epoch,ready.epoch);assert.deepEqual(fresh.audioSettings,audioSettings);
 await req(3,'audio-settings',{audioSettings:DEFAULT_AUDIO_SETTINGS});assert.deepEqual((await req(0)).data.audioSettings,DEFAULT_AUDIO_SETTINGS,'Empty URL selects the built-in track');
 await req(3,'boost',{value:5});assert.equal((await req(1)).data.total,5);
 await req(3,'unlock');assert.equal((await req(0)).data.total,10);
 await req(3,'settings',{value:0},'',400);await req(3,'settings',{value:10,videoUrl:'javascript:bad'},'',400);
 const csrf=await handlers[3].POST(new Request(hosts[3]+'/api/event',{method:'POST',headers:{Origin:hosts[2]},body:JSON.stringify({action:'reset'})}));assert.equal(csrf.status,403);
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query("select public.hits_room_store('read_event')"));
  await assert.rejects(db.query('select * from hits_room.event'));
  await db.exec('reset role');
 }
 await db.exec('set role service_role');await db.query("select public.hits_room_store('read_event')");await db.exec('reset role');
 await assert.rejects(createSupabaseStore('https://test.supabase.co','sb_secret_test',transport).prepare('DROP TABLE event').run());
 const old={VERCEL:process.env.VERCEL,SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,EVENT_DB_PATH:process.env.EVENT_DB_PATH};
 process.env.VERCEL='1';delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 assert.throws(()=>nodeEventRuntime(),/Configure SUPABASE/);
 delete process.env.VERCEL;
 const sqlitePath='.local/tests/audio-migration.sqlite';
 for(const suffix of ['','-wal','-shm'])rmSync(sqlitePath+suffix,{force:true});
 const legacy=new DatabaseSync(sqlitePath);
 legacy.exec("create table event (id integer primary key, epoch text not null, quota integer not null default 100, boost integer not null default 0, paused integer not null default 0, phase text not null default 'collecting', code text not null, launched_at integer, video_url text not null default ''); insert into event(id,epoch,code) values(1,'legacy-sqlite','290978');");legacy.close();
 process.env.EVENT_DB_PATH=sqlitePath;
 // An old hot-reload cache must be replaced so the local migration still runs.
 globalThis.__hitsStore={prepare(){throw new Error('Old cached store was reused');}};delete globalThis.__hitsStoreSchemaVersion;
 const localRuntime=nodeEventRuntime();
 const localHandlers=createEventHandler(localRuntime);
 const localSnapshot=await (await localHandlers.GET(new Request('http://localhost/api/event'))).json();
 assert.equal(localSnapshot.epoch,'legacy-sqlite');assert.deepEqual(localSnapshot.audioSettings,DEFAULT_AUDIO_SETTINGS);
 const localMix={musicVolume:0,sfxVolume:120,musicUrl:'/media/test.mp3'};
 const localSave=await localHandlers.POST(new Request('http://localhost/api/event',{method:'POST',body:JSON.stringify({action:'audio-settings',audioSettings:localMix})}));assert.equal(localSave.status,200);assert.deepEqual((await localSave.json()).audioSettings,localMix);
 await localHandlers.POST(new Request('http://localhost/api/event',{method:'POST',body:JSON.stringify({action:'reset'})}));
 assert.deepEqual((await (await localHandlers.GET(new Request('http://localhost/api/event'))).json()).audioSettings,localMix);
 assert.equal(nodeEventRuntime().DB,localRuntime.DB,'The upgraded local store is cached');
 for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 assert.deepEqual((await db.query('select * from public.other_project_data')).rows,[{id:1,value:'keep me'}]);
 await db.exec('set role anon');assert.equal((await db.query('select value from public.other_project_data')).rows[0].value,'keep me');await db.exec('reset role');
 console.log(`PASS: ${calls} RPC calls against embedded PostgreSQL. Existing-room migration/rerun, audio validation (music 0–100%, SFX 0–120%, including 101%), 4-host mix sync, live-launch adjustment, reset preservation, local SQLite migration/cache upgrade, duplicates, concurrent quota cap, pause, boost, unlock, launch, auth, CSRF, private permissions, Vercel fail-closed.`);
}finally{await db.close();}

