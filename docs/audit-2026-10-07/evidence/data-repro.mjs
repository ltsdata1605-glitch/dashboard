import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
const base=process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main';
const silent={warn(){},info(){},error(){},log(){}};
function load(file,names,injected={}) {
  let src=fs.readFileSync(base+'/'+file,'utf8');
  src=src.replace(/^import\b[\s\S]*?;\s*$/gm,'').replace(/^export\s+(?=(?:async\s+)?function|const|let|class|interface|type)/gm,'');
  src=stripTypeScriptTypes(src,{mode:'strip'}).replace(/\bimport\(/g,'auditImport(');
  const ctx=vm.createContext({console:silent,Date,CustomEvent:class {constructor(type,init){this.type=type;this.detail=init?.detail;}},setTimeout,clearTimeout,Map,Set,structuredClone,window:{dispatchEvent(){}},navigator:{userAgent:'offline-audit'},...injected});
  vm.runInContext(src+'\n;globalThis.auditResult={'+names.join(',')+'};',ctx,{filename:file});
  return ctx.auditResult;
}
let counter=0; const docs=new Map();
const ref=(root,parts,isCollection=false)=>{ const path=[root?.path,...parts].filter(Boolean).join('/'); return {path,isCollection,id:path.split('/').at(-1)}; };
const store={db:{},collection:(root,...parts)=>ref(root,parts,true),doc:(root,...parts)=>ref(root,parts.length?parts:['auto_'+(++counter)]),serverTimestamp:()=>Date.now(),
  getDoc:async r=>({exists:()=>docs.has(r.path),data:()=>structuredClone(docs.get(r.path)),id:r.path.split('/').at(-1),ref:r}),
  getDocs:async r=> {const out=[...docs].filter(([p])=>p.startsWith(r.path+'/')&&!p.slice(r.path.length+1).includes('/')).map(([p,data])=>({id:p.split('/').at(-1),ref:{path:p},exists:()=>true,data:()=>structuredClone(data)})); return {docs:out,empty:!out.length,forEach:fn=>out.forEach(fn)};},
  writeBatch:()=>{const operations=[]; return {set:(r,d)=>operations.push(()=>docs.set(r.path,structuredClone(d))),delete:r=>operations.push(()=>docs.delete(r.path)),commit:async()=>operations.forEach(fn=>fn())};},
  updateDoc:async(r,d)=>docs.set(r.path,{...docs.get(r.path),...d}),deleteDoc:async r=>docs.delete(r.path)
};
const cloud=load('services/cloudDataService.ts',['chunkData','cleanRow','uploadProcessedData','downloadProcessedData'],store);
const utfRows=Array.from({length:800},(_,i)=>({id:String(i),product:'Điện máy Nguyễn Trường Sơn - Công ty điện tử Hà Nội '.repeat(20)}));
const utfChunks=cloud.chunkData(utfRows);
const chunks=Array.from(utfChunks,c=>({rows:c.length,utf16Chars:JSON.stringify(c).length,utf8Bytes:Buffer.byteLength(JSON.stringify(c)),minimumStringBytes:c.reduce((sum,r)=>sum+Buffer.byteLength(r.product),0)}));
assert(chunks.some(c=>c.minimumStringBytes>1024*1024));
console.log('UTF8_CHUNK',JSON.stringify(chunks));
const settings=new Map();
const kho=load('services/khoDataService.ts',['uploadKhoSalesData','downloadKhoSalesData','fetchAllowedKhoData','syncDataToKhoIfManager'],{...store, ...cloud,BATCH_GROUP_SIZE:10,dbService:{getSetting:async k=>settings.get(k)??null,saveSetting:async(k,v)=>settings.set(k,structuredClone(v))},getRowValue:(r)=>r.kho,parseKhoList:s=>s?.split(',')||[],COL:{KHO:['kho']}});
const row={id:'DON001',kho:'910',parsedDate:new Date('2026-10-01T12:00:00Z'),_metrics:{revenue:1000000,revenueQD:1200000,isTraCham:false}};
const user={uid:'offline-manager',email:'audit@example.invalid'};
await kho.uploadKhoSalesData(user,'910',[row],'Thang10.xlsx',123,false);
await kho.uploadKhoSalesData(user,'910',[row],'Thang10.xlsx',123,false);
const downloaded=await kho.downloadKhoSalesData('910');
const kpi=load('services/kpiService.ts',['processKpis'],{getRowValue:()=>'',getHeSoQuyDoi:()=>1,getHinhThucThanhToan:()=>'',cleanAndNormalize:v=>String(v??'').toLowerCase(),normalizedThuHoSet:new Set(),COL:{MA_NHOM_HANG:['g'],HINH_THUC_XUAT:['htx']},calculateHieuQuaQDFraction:(a,b)=>a/b-1,calculatePercentage:(a,b)=>b?a/b*100:0,calculateRunRate:(a,b,c)=>a/b*c});
const actualKpi=kpi.processKpis(downloaded.data,[],downloaded.data,null);
assert.equal(downloaded.files.length,2); assert.equal(downloaded.data.length,2); assert.equal(actualKpi.totalRevenue,2000000);
console.log('KHO_DUPLICATION',JSON.stringify({files:downloaded.files.length,rows:downloaded.data.length,actualRevenue:actualKpi.totalRevenue,expectedRevenue:1000000}));
// A missing Firestore chunk is accepted as successful data despite metadata expecting 2 rows.
await cloud.uploadProcessedData(user,[row],'report.xlsx',123,10000,false);
docs.set('users/offline-manager/salesData/meta',{filename:'missing.xlsx',savedAt:20000,fileLastModified:124,totalRows:2,chunkCount:2,version:1});
const partial=await cloud.downloadProcessedData(user);
assert.equal(partial.data.length,1); assert.equal(partial.meta.totalRows,2);
console.log('MISSING_CHUNK_ACCEPTED',JSON.stringify({returnedRows:partial.data.length,metaTotalRows:partial.meta.totalRows,rejected:false}));
// Invalid calendar dates silently overflow; localized decimals silently change magnitude.
const utils=fs.readFileSync(base+'/utils/dataUtils.ts','utf8');
function single(start,end,name) {const s=utils.slice(utils.indexOf(start),utils.indexOf(end,utils.indexOf(start))).replace(/^export\s+/gm,'');const c=vm.createContext({Date}); vm.runInContext(stripTypeScriptTypes(s,{mode:'strip'})+';globalThis.fn='+name,c);return c.fn;}
const parseDate=single('export function parseExcelDate','export function abbreviateName','parseExcelDate');
const parseNum=single('export const parseNumber','export const normalizeText','parseNumber');
console.log('PARSERS',JSON.stringify({invalidDateInput:'31/02/2026',actualDate:parseDate('31/02/2026').toISOString(),decimalInput:'45,5%',actualNumber:parseNum('45,5%'),roundtripInput:(12.5).toLocaleString('vi-VN'),roundtripResult:parseNum((12.5).toLocaleString('vi-VN'))}));
// Actual useDataManagement Kho effect, with tiny React hook mocks: fresh hook state per page load,
// persistent local settings and the actual Kho data fetch implementation above.
async function openEmployeeSession() {
  const effects=[]; const state=[]; let stateIndex=0; const appStates=[];
  const root=load('hooks/useDataManagement.ts',['useDataManagement'],{
    useState:init=>{const i=stateIndex++; state[i]=typeof init==='function'?init():init;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},
    useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useCallback:fn=>fn,useRef:v=>({current:v}),startTransition:fn=>fn(),createElement:()=>null,
    useAuth:()=>({user:{uid:'offline-employee',email:'employee@example.invalid'},userRole:'employee',departmentId:'910',employeeName:'001 - Audit',isDemoMode:false}),
    dbService:{getSetting:async k=>settings.get(k)??null,saveSetting:async(k,v)=>settings.set(k,structuredClone(v))},
    normalizeSalesData:rows=>rows,EMPTY_UNIQUE_FILTER_OPTIONS:{},computeRbacFilteredData:rows=>rows,computeBaseAndPeriodData:()=>({baseFilteredData:[],mainPeriodData:[]}),deriveWarehouseFilteredData:()=>[],
    DEFAULT_KPI_CARDS:[],COL:{},unwrapProductConfigProxies:v=>v,wrapProductConfigWithProxies:v=>v,
    auditImport:async path=>{assert.equal(path,'../services/khoDataService');return kho;}
  });
  root.useDataManagement({filterState:{kho:[]},configUrl:'https://example.invalid',setStatus(){},setAppState:v=>appStates.push(v),appState:'loading'});
  const khoEffect=effects.find(fn=>fn.toString().includes('appliedSnapshotKey'));
  assert(khoEffect); khoEffect();
  await new Promise(r=>setTimeout(r,10));
  return {rows:state[0].length,appStates};
}
const session1=await openEmployeeSession(); const session2=await openEmployeeSession();
assert.equal(session1.rows,2); assert.equal(session2.rows,0);
console.log('KHO_REOPEN',JSON.stringify({firstPageLoad:session1,secondPageLoad:session2,settingsKeys:[...settings.keys()]}));
