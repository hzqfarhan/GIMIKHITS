import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
await mkdir('.sites-runtime/checks',{recursive:true});
const output=path.resolve('.sites-runtime/checks/routing.mjs');
await build({entryPoints:['lib/launch-routing.ts'],outfile:output,bundle:true,format:'esm',platform:'node'});
const {launchLinks,viewForHost,eventBaseDomain,pathForView}=await import(pathToFileURL(output));
const views=['main','qr','bypass','audience'];
for (const view of views) {
  assert.equal(viewForHost(`${view}.event.example`,'event.example'),view);
  assert.equal(viewForHost(`${view}.localhost`),view);
  assert.equal(viewForHost(`${view}.event.example.evil.test`,'event.example'),null);
  assert.equal(launchLinks('https://qr.event.example/api/event','event.example')[view],`https://${view}.event.example/`);
  assert.equal(launchLinks('http://bypass.localhost:5173/api/event')[view],`http://${view}.localhost:5173/`);
  assert.equal(launchLinks('http://localhost:5173/api/event')[view],`http://localhost:5173${pathForView(view)}`);
}
assert.equal(eventBaseDomain('https://event.example/'),'event.example');
assert.equal(eventBaseDomain('event.example/path'),'');
assert.equal(viewForHost('audience.unknown.example','event.example'),null);
const eventHosts={main:'hitsmainpanel.seladevs.my',qr:'qr.seladevs.my',bypass:'bypass.seladevs.my',audience:'audience.seladevs.my'};
for(const [view,host]of Object.entries(eventHosts)){
  assert.equal(viewForHost(host),view);
  assert.equal(viewForHost(host,'seladevs.my'),view);
  assert.equal(launchLinks(`https://${host}/api/event`)[view],`https://${host}/`);
  assert.equal(launchLinks('https://review.example/api/event','seladevs.my')[view],`https://${host}/`);
  assert.equal(viewForHost(`${host}.evil.test`),null);
}
assert.equal(launchLinks('http://localhost:5173/api/event').main,'http://localhost:5173/');
console.log('PASS: 48 routing checks including exact seladevs.my hosts, local fallbacks and domain validation.');
