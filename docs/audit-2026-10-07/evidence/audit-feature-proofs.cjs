const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const base = (process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main').replace(/\/$/, '') + '/';
function code(path) {
  const src = fs.readFileSync(base + path, 'utf8').replace(/^import\s[\s\S]*?;\s*$/gm, '');
  return stripTypeScriptTypes(src, { mode: 'transform' }).replace(/^export\s+/gm, '');
}
async function main() {
  // Real hook code; React/IDB/Firebase adapters replaced with an offline deterministic harness.
  const states = [], effects = [], writes = [];
  let cursor = 0;
  const oldSchedule = [{ id:'staff', name:'fixture-september', department:'BP', gender:'Nam', schedule:[null,{shift:'123',role:'123'}], stats:{} }];
  const octoberSchedule = [{ ...oldSchedule[0], name:'fixture-october' }];
  const local = new Map([['Kho::schedule-2026-10', octoberSchedule]]);
  const context = {
    console, Date, JSON, Math, Set, structuredClone, setTimeout, clearTimeout,
    DEFAULT_SHIFT_DEFINITIONS:{}, DEFAULT_RULES:{gh:{},kho:{},tn:{}}, ZERO_REQUIREMENTS:{}, getDefaultMonthYear:()=> '2026-09',
    calculateSpecialHours:()=>0,
    useAuth:()=> ({user:null,db:{}}),
    useState(initial) { const i=cursor++; if (!(i in states)) states[i]=typeof initial==='function'?initial():initial; return [states[i], value=>{states[i]=typeof value==='function'?value(states[i]):value;}]; },
    useRef:value=>({current:value}), useCallback:fn=>fn, useMemo:fn=>fn(), useEffect:fn=>effects.push(fn),
    toast:{success(){},error(){}},
    idb:{initDB:async()=>true,loadData:async key=>local.get(key),saveData:async (key,value)=>{local.set(key,value);writes.push(key);}},
    syncScheduleToCloud:async()=>{},fetchScheduleFromCloud:async()=>null,
  };
  vm.createContext(context);
  vm.runInContext(code('features/phan-ca/hooks/usePhanCaData.ts')+'\nthis.hook=usePhanCaData;',context);
  context.hook();
  states[0]='2026-10'; states[3]=['Kho']; states[4]='Kho'; states[5]=oldSchedule;
  states[21]=true;states[22]=true;
  effects.length=0;cursor=0;
  context.hook();
  effects[2](); // Start next month hydration: first await yields.
  effects[4](); // Persist effect of same render still considers prior scope hydrated.
  await new Promise(resolve=>setImmediate(resolve));
  console.log(JSON.stringify({test:'F01-real-hook-offline-adapters',before:'fixture-october',afterLocal:local.get('Kho::schedule-2026-10')[0].name,afterState:states[5][0].name,writeCount:writes.length}));

  const htmlContext={console,Math,Number,Date,generateBarcodeDataUrl:()=>'',normalizeStickerPriceUnit:(_,n)=>n,formatPriceChangePercent:()=>'',sanitizeTicketHtml:x=>x,sanitizeTicketHtmlForDisplay:x=>x,sanitizeTicketHtmlForPrint:x=>x};
  vm.createContext(htmlContext);
  vm.runInContext(code('features/sticker-event/stickerprinter/pageHtmlUtils.ts')+'\nthis.gen=generatePageHtml;',htmlContext);
  const marker='<img src=x onerror="window.__auditMarker=1">';
  const generated=htmlContext.gen({label:marker,header:'safe',footer:'safe',newPrice:'1',oldPrice:'2',percent:'-50%'},'sale','gia_soc','/frame/X24.png');
  console.log(JSON.stringify({test:'F05-real-generator-no-DOM',rawEventHandlerRetained:generated.includes(marker),note:'HTML output only; no browser execution claimed'}));

  for(const quantity of [1.5,'10',1e100]) {
    try { const count=Array(quantity).fill(null).length; console.log(JSON.stringify({test:'F09-Array-semantic',quantity,count})); }
    catch(error) { console.log(JSON.stringify({test:'F09-Array-semantic',quantity,error:error.name})); }
  }

  // Real cloud deletion service and real loader; only Firebase/IDB/React adapters stubbed.
  const cloud=new Map([
    ['stores/Kho/metadata/products',{chunkCount:1,lastUpdated:{toMillis:()=>1}}],
    ['stores/Kho/metadata/sync',{productsLastUpdated:{toMillis:()=>1},inventoryLastUpdated:{toMillis:()=>0}}],
    ['stores/Kho/productChunks/chunk_0',{items:'[{"msp":"1234","sanPham":"old-price"}]'}],
  ]);
  const deleted=[];
  const dbContext={console,Timestamp:{now:()=>({toMillis:()=>2})},db:{},auth:{currentUser:{uid:'fixture'}},
    doc:(_db,...parts)=>parts.join('/'),collection:(_db,...parts)=>parts.join('/'),
    getDoc:async ref=>({exists:()=>cloud.has(ref),data:()=>cloud.get(ref)}),
    setDoc:async (ref,value,options)=>cloud.set(ref,options?.merge?{...cloud.get(ref),...value}:value),
    writeBatch:()=>{const refs=[];return {delete:ref=>refs.push(ref),commit:async()=>{for(const ref of refs){cloud.delete(ref);deleted.push(ref);}}};},
  };
  vm.createContext(dbContext);
  vm.runInContext(code('features/sticker-event/services/firebaseService.ts')+'\nthis.clear=clearStoreDataOnFirestore;',dbContext);
  await dbContext.clear('Kho','productChunks');
  let loadedProducts=[{msp:'1234',sanPham:'old-price'}], fetchCount=0;
  const loaderContext={console,Date,JSON,Map,Promise,
    setTimeout:()=>0, // Timeout is never reached with synchronous fixture adapters.
    useState:initial=>[initial,()=>{}],useCallback:fn=>fn,db:{},doc:dbContext.doc,getDoc:dbContext.getDoc,
    fetchProductsFromFirestore:async()=>{fetchCount++;return [];},fetchInventoryFromFirestore:async()=>[],
    loadManualProductsCache:async()=>({products:[],syncedCloudMillis:0}),shouldFetchManualProductsFromCloud:()=>false,
    saveManualProductsCache:async()=>{},saveData:async()=>{},saveInventoryData:async()=>{},getErrorMessage:e=>String(e),
  };
  vm.createContext(loaderContext);
  vm.runInContext(code('features/sticker-event/hooks/useStickerEventDb.ts')+'\nthis.hook=useStickerEventDb;this.invalidateSyncMetaMemoryCache=invalidateSyncMetaMemoryCache;',loaderContext);
  const noop=()=>{};
  const hook=loaderContext.hook({user:null,userData:{role:'admin',storeId:'Kho'},employeeName:'fixture',displayedProducts:[],setDisplayedProducts:noop,setIsLoading:noop,setIsInitializing:noop,setError:noop,showAlert:noop,fileName:null,setFileName:noop,fileExportDate:null,setFileExportDate:noop,setUploadTimestamp:noop,setInventoryUploadTimestamp:noop,allProducts:loadedProducts,setAllProducts:value=>{loadedProducts=typeof value==='function'?value(loadedProducts):value;},inventory:[],setInventory:noop,manualProducts:[],setManualProducts:noop});
  await hook.loadFirestoreData('Kho',loadedProducts,[],new Date(1),null);
  console.log(JSON.stringify({test:'F03-real-delete-plus-real-loader-offline-adapters',deletedChunkCount:deleted.length,syncTimestampAfterDelete:cloud.get('stores/Kho/metadata/sync').productsLastUpdated.toMillis(),productFetches:fetchCount,productStillDisplayed:loadedProducts[0]?.sanPham}));
  cloud.set('stores/Kho/metadata/sync',{productsLastUpdated:{toMillis:()=>2}});
  loaderContext.invalidateSyncMetaMemoryCache('Kho');
  await hook.loadFirestoreData('Kho',loadedProducts,[],new Date(1),null);
  console.log(JSON.stringify({test:'F03-forced-new-cloud-timestamp-empty-result',productFetches:fetchCount,productStillDisplayed:loadedProducts[0]?.sanPham}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
