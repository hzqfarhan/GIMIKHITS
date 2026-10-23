import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { build } from 'esbuild';

// Always use an isolated temporary database and an ephemeral loopback port.
// No URL argument or production credentials are accepted.
const folder = mkdtempSync(join(tmpdir(), 'hits-stress-'));
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VERCEL;
process.env.EVENT_DB_PATH = join(folder, 'event.sqlite');
process.env.ORGANISER_KEY = 'isolated-stress-test-only';
await build({entryPoints:['lib/event-service.ts','lib/node-event-runtime.ts'],outdir:folder,bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {createEventHandler} = await import(pathToFileURL(join(folder,'event-service.mjs')));
const {nodeEventRuntime} = await import(pathToFileURL(join(folder,'node-event-runtime.mjs')));
const handler = createEventHandler(nodeEventRuntime());
const server = createServer(async (req,res) => {
  try {
    const chunks=[]; for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://127.0.0.1${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
    const response = await handler[req.method](request);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  } catch {res.writeHead(500);res.end('{}');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
async function request(action,extra={},cookie='',shared=false){
  const response=await fetch(`${origin}/api/event${shared?'?view=audience':''}`,{method:action?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie},...(action?{body:JSON.stringify({action,...extra})}:{}) ,signal:AbortSignal.timeout(15000)});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
  return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie,headers:response.headers};
}
const results=[];
async function stage(name,count,concurrency,operation){
  let cursor=0,failures=0;const times=[];const start=performance.now();
  await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<count){const index=cursor++;const t=performance.now();try{await operation(index);}catch{failures++;}times.push(performance.now()-t);}}));
  times.sort((a,b)=>a-b);const seconds=(performance.now()-start)/1000;
  const row={name,requests:count,concurrency,failures,rps:Math.round(count/seconds),p95Ms:Math.round(times[Math.ceil(times.length*.95)-1]),maxMs:Math.round(times.at(-1))};results.push(row);console.log(JSON.stringify(row));assert.equal(failures,0,`${name}: request failures`);assert.ok(row.p95Ms<2000,`${name}: p95 exceeds 2 seconds`);
}
try {
  await request();const operator=(await request('login',{key:process.env.ORGANISER_KEY})).cookie;
  await request('settings',{value:500,videoUrl:''},operator);
  const shared=await request(null,{},operator,true);
  assert.equal(shared.data.operator,false);assert.equal(shared.data.code,undefined);assert.match(shared.headers.get('cache-control'),/s-maxage=1/);
  await stage('public reads',3000,100,()=>request(null,{},'',true));
  await stage('mixed activation and reads',2000,100,i=>i%2?request('activate'):request(null,{},'',true));
  const ready=(await request()).data;assert.equal(ready.audience,500);assert.equal(ready.phase,'ready');
  await stage('duplicate activation replay',500,50,async()=>{const a=await request('activate');await request('activate',{},a.cookie);});
  assert.equal((await request()).data.audience,500);
  await request('launch',{code:ready.code},operator);
  await stage('launch traffic',1000,100,i=>i%3?request(null,{},'',true):request('activate'));
  const final=(await request()).data;assert.equal(final.phase,'launching');assert.equal(final.total,500);
  writeFileSync(join(folder,'report.json'),JSON.stringify({scope:'Isolated Node HTTP + SQLite; excludes Next.js, CDN, Supabase and browser rendering',results},null,2));
  console.log(`PASS: quota, launch freeze, shared response privacy. Report: ${join(folder,'report.json')}`);
} finally {await new Promise(resolve=>server.close(resolve));}
