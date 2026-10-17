import assert from 'node:assert/strict';
import http from 'node:http';
const origin=process.argv[2] || 'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Page checks are restricted to local preview.');
const routes=['/','/main','/qr','/bypass','/audience','/activate','/control'];
let checks=0;
// Node's fetch normalises the Host header. Use a real HTTP request when
// rehearsing virtual hosts against the same loopback listener.
function hostRequest(url,host) {
  return new Promise((resolve,reject)=>{
    http.get(url,{headers:{Host:host}},response=>{
      let body='';response.on('data',chunk=>body+=chunk);
      response.on('end',()=>resolve({status:response.statusCode,text:async()=>body,json:async()=>JSON.parse(body)}));
    }).on('error',reject);
  });
}
for(const route of routes) {
  const response=await fetch(`${origin}${route}`);
  assert.equal(response.status,200,`${route} must respond successfully`);
  const html=await response.text();
  assert.match(html,/_next\/static\//,`${route} must serve Next.js bundles`);
  assert.match(html,/HITS/,`${route} must contain the branded application`);
  checks++;
}
for(const view of ['main','qr','bypass','audience']) {
  const host=`${view}.localhost:${new URL(origin).port}`;
  const response=await hostRequest(`${origin}/`,host);
  assert.equal(response.status,200,`${host} root must resolve`);
  const html=await response.text();
  assert.match(html,new RegExp(`experience view-${view}\\b`),`${host} must render its own dedicated screen`);
  const state=await hostRequest(`${origin}/api/event`,host).then(r=>r.json());
  assert.equal(state.links.audience,`http://audience.localhost:${new URL(origin).port}/`);
  checks++;
}
const html=await fetch(origin).then(r=>r.text());
const assets=[...new Set([...html.matchAll(/(?:src|href)="([^" ]+)"/g)].map(m=>m[1]).filter(p=>p.startsWith('/_next/static/') || p.startsWith('/logos/')))];
assert.ok(assets.length>0,'Next.js must emit frontend assets');
for(const asset of assets) {const r=await fetch(new URL(asset,origin));assert.equal(r.status,200,asset);checks++;}
console.log(`PASS: ${checks} page, subdomain and Next.js asset checks.`);
