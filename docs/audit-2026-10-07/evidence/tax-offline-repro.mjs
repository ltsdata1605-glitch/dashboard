import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
const root=process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main';
let src=fs.readFileSync(root+'/features/tax-calculator/services/taxSyncService.ts','utf8');
src=src.replace(/^import .*;\r?\n/gm,'').replace('export const taxSyncService','const taxSyncService');
const code=stripTypeScriptTypes(src,{mode:'transform'})+'\nglobalThis.service=taxSyncService;';
let cloud=[];let local=[];let cloudWrites=0;
const toast=Object.assign(()=>{}, {error:()=>{}});
const mockLocal={
 getAll:async()=>structuredClone(local),
 save:async(r)=>{const id=1;local.push({...r,id});return id;},
 delete:async(id)=>{local=local.filter(r=>r.id!==id);},
 updateMonth:async(id,m)=>{const r=local.find(r=>r.id===id||r.createdAt===id);if(r)r.monthYear=m;},
 updateMonths:async(ids,m)=>{local.forEach(r=>{if(ids.includes(r.id)||ids.includes(r.createdAt))r.monthYear=m;});},
 clearAll:async()=>{local=[];}
};
const context=vm.createContext({console,toast,auth:{currentUser:{uid:'fixture-user'}},db:{},doc:()=>({}),serverTimestamp:()=>0,
 getDoc:async()=>({exists:()=>true,data:()=>({records:structuredClone(cloud)})}),setDoc:async(_,d)=>{cloud=d.records;},
 runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>({records:structuredClone(cloud)})}),set:(_,d)=>{cloud=d.records;cloudWrites++;}}),taxIndexedDbService:mockLocal});
vm.runInContext(code,context); const s=context.service; const results=[];
const a={id:1,createdAt:'2026-10-01T00:00:00.000Z',name:'Fixture A',monthYear:'10/2026'};
const b={id:1,createdAt:'2026-10-02T00:00:00.000Z',name:'Fixture B',monthYear:'10/2026'};
cloud=[a,b];local=[b];
await s.updateRecordMonth(1,'11/2026');
assert.equal(cloud.filter(r=>r.monthYear==='11/2026').length,2);
results.push({case:'Two devices have same auto-increment id=1; update one record',expected:'Only chosen stable record updated',observed:'Both cloud records updated',reproduced:true});
cloud=[a];local=[];const fetched=await s.getAllRecords();assert.equal(fetched.length,1);assert.equal(local.length,0);
results.push({case:'Read cloud history on second device',expected:'Cloud records cached locally for offline access',observed:'UI gets cloud record but local history remains empty',reproduced:true});
cloud=[a,b];local=[b];const merged=await s.getAllRecords();const target=merged.find(r=>r.id===1);
await s.deleteRecord(1,target.createdAt);
assert.equal(local.length,0);
results.push({case:'UI selection/delete uses colliding id=1',expected:'Record identity unique across devices',observed:'Merged history contains two records with id=1; deletion can remove different local/cloud records',reproduced:true});
console.log(JSON.stringify({method:'Execute original taxSyncService.ts via builtin TS transform with in-memory Firebase/IndexedDB stubs; no network',results},null,2));
