import fs from 'node:fs';import path from 'node:path';import {stripTypeScriptTypes} from 'node:module';
const root=process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main';let checked=0;let failures=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.agents'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.ts')&&!e.name.endsWith('.d.ts')){checked++;try{stripTypeScriptTypes(fs.readFileSync(p,'utf8'),{mode:'transform'});}catch(err){failures.push({file:path.relative(root,p),error:err.message});}}}}
walk(root);console.log(JSON.stringify({method:'Native Node24 TS parsing only; no typecheck, no imports/execution, no TSX checking',checked,failures},null,2));
