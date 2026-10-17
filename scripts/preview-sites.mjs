import './sites-env.mjs';
import { projectRoot } from './sites-env.mjs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Wrangler and its Node launcher resolve relative env-file paths differently.
// Resolve the existing private file without copying it into publishable output.
const child = spawn(process.execPath, [
  '--import', pathToFileURL(path.join(projectRoot,'scripts/sites-env.mjs')).href,
  path.join(projectRoot,'node_modules/wrangler/bin/wrangler.js'),
  'dev','--config','dist/server/wrangler.json',
  '--env-file',path.join(projectRoot,'.dev.vars'),
  '--local','--persist-to','.wrangler/state','--ip','127.0.0.1',
  '--port','5174','--inspector-port','0',
], {cwd:projectRoot,stdio:'inherit',env:process.env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
