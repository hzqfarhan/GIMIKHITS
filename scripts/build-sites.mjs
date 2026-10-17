import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const staging = path.resolve(root,'.sites-runtime','next-export');
const dist = path.resolve(root,'dist');
for (const target of [staging,dist]) {
  if (!target.startsWith(path.resolve(root)+path.sep)) throw new Error('Build output escaped the project.');
  await rm(target,{recursive:true,force:true});
  await mkdir(target,{recursive:true});
}
// The API is separately hosted by the Worker; all UI is compiled by stock Next.js.
for (const source of ['app','public','lib','components','hooks']) {
  await cp(path.join(root,source),path.join(staging,source),{recursive:true,filter:filename=>filename !== path.join(root,'app','api')});
}
for (const source of ['package.json','tsconfig.json','next-env.d.ts','postcss.config.mjs']) {
  await cp(path.join(root,source),path.join(staging,source));
}
await writeFile(path.join(staging,'next.config.mjs'),`export default ${JSON.stringify({output:'export',trailingSlash:true,poweredByHeader:false,images:{unoptimized:true},turbopack:{root},outputFileTracingRoot:root})};\n`);
const result = spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:staging,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
await cp(path.join(staging,'out'),path.join(dist,'client'),{recursive:true});
await mkdir(path.join(dist,'server'),{recursive:true});
await build({entryPoints:[path.join(root,'build/next-sites-worker.ts')],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:path.join(dist,'server/index.js'),minify:true});
const hosting=JSON.parse(await readFile(path.join(root,'.openai/hosting.json'),'utf8'));
const config={name:'hits-iuic-launch',main:'index.js',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],no_bundle:true,assets:{directory:'../client',binding:'ASSETS',run_worker_first:true,html_handling:'none'},d1_databases:hosting.d1?[{binding:hosting.d1,database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}]:[]};
await writeFile(path.join(dist,'server/wrangler.json'),JSON.stringify(config,null,2)+'\n');
await mkdir(path.join(dist,'.openai'),{recursive:true});
await cp(path.join(root,'.openai/hosting.json'),path.join(dist,'.openai/hosting.json'));
await cp(path.join(root,'drizzle'),path.join(dist,'.openai/drizzle'),{recursive:true});
console.log('Packaged genuine Next.js static output + shared D1 event Worker into dist/.');
