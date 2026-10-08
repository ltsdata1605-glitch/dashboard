const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const root=process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main';
const records = new Map();
const writes = [];
const reads = [];
let signatureChecks=0, seq=0;
function snap(path, value) { return { id: path.split('/').at(-1), exists: value!==undefined, data: () => value ? structuredClone(value) : value, ref: ref(path) }; }
function ref(path, conditions=[]) {
 return {
  path,
  collection: (name) => ref(path+'/'+name),
  doc: (id) => ref(path+'/'+id),
  where: (key,op,val) => ref(path,[...conditions,{key,op,val}]),
  limit: () => ref(path,conditions),
  orderBy: () => ref(path,conditions),
  get: async () => {
   reads.push(path);
   if (records.has(path)) return snap(path,records.get(path));
   const docs = [...records.entries()].filter(([p,v]) => p.startsWith(path+'/') && p.slice(path.length+1).indexOf('/')<0 && conditions.every(c=>c.op==='==' ? v[c.key]===c.val : true)).map(([p,v])=>snap(p,v));
   if(path==='line_bots'||path.endsWith('/coupons')||path.endsWith('/filtered_coupons')||path.endsWith('/pending_requests')) return {docs,empty:docs.length===0};
   return snap(path,undefined);
  },
  set: async (data) => { writes.push({path,op:'set'}); records.set(path,structuredClone(data)); },
  update: async (data) => { writes.push({path,op:'update',data:structuredClone(data)}); records.set(path,{...records.get(path),...data}); }
 };
}
const db={collection:n=>ref(n),batch:()=>{ const ops=[];return { update:(r,d)=>ops.push(()=>r.update(d)), set:(r,d)=>ops.push(()=>r.set(d)), delete:r=>ops.push(()=>records.delete(r.path)), commit:async()=>{for(const f of ops)await f();}};}};
const context = vm.createContext({
 onRequest: (_opt,handler)=>handler, db,
 verifyLineSignature:()=>{signatureChecks++; return true;},
 crypto: require('node:crypto'), FieldPath: {documentId:()=> '__name__'},
 isRelistUnusedCommand:()=>false,getVnMonthStartIso:()=>({label:'10/2026'}), selectUnusedThisMonth:docs=>docs,
 formatShortUserName:x=>x,isStrictPmhRequestForm:()=>false,extractBareCouponCode:()=>null,buildCouponStatusReply:()=>null,
 getGroupFeatures:async()=>({}), allocatePmhSequence:async()=>++seq, formatPmhLabel:x=>String(x),buildCouponUsedText:()=>'', couponKind:()=> 'event',enqueuePmhRelay:async()=>{},
 createCouponFlexBubble:()=>({type:'flex'}),createCouponFlexMessage:()=>({type:'flex'}),createFilteredPmhFlexMessages:()=>[],
 Buffer,AbortController,setTimeout,clearTimeout,Date,Intl,console:{info(){},warn(){},error(){},log(){}},
 fetch:async()=>({ok:true,status:200,json:async()=>({displayName:'Mock user',sentMessages:[]})})
});
let source=stripTypeScriptTypes(fs.readFileSync(root+'/functions/src/lineBotWebhook.ts','utf8'),{mode:'transform'});
source=source.replace(/^import .*?;\s*$/gm,'').replace(/^export \{.*?\} from .*?;\s*$/gm,'').replace(/^export /gm,'');
vm.runInContext(source+'\nglobalThis.handler=lineBotWebhook;',context);
function response(){return{statusCode:200,status(n){this.statusCode=n;return this;},json(o){this.body=o;return this;},send(o){this.body=o;return this;},setHeader(){}};}
(async()=>{
 records.set('line_bots/ownerA',{active:true,channelAccessToken:'MOCK_ONLY',channelSecret:'MOCK_ONLY',autoApprove:true});
 records.set('line_bots/ownerB',{active:true,channelAccessToken:'MOCK_ONLY',channelSecret:'MOCK_ONLY',autoApprove:true});
 records.set('line_bots/ownerA/coupons/c1',{code:'MOCKCODE1',status:'UNUSED'});
 records.set('line_bots/ownerB/coupons/c2',{code:'MOCKCODE1',status:'UNUSED'});
 const res=response();
 await context.handler({method:'POST',query:{action:'mark-used',code:'MOCKCODE1',usedBy:'Forged display name'},body:{},headers:{}},res);
 console.log(JSON.stringify({test:'anonymous mark-used cross-owner',authProvided:false,signatureChecks,http:res.statusCode,result:res.body,ownerA:records.get('line_bots/ownerA/coupons/c1'),ownerB:records.get('line_bots/ownerB/coupons/c2')}));
 const uploadRes=response();
 await context.handler({method:'POST',query:{action:'uploadMedia'},body:{mediaId:'victim_report',base64:'aGVsbG8=',contentType:'text/html'},headers:{}},uploadRes);
 console.log(JSON.stringify({test:'anonymous upload arbitrary ID/type',signatureChecks,http:uploadRes.statusCode,success:uploadRes.body.success,wroteVictimId:records.has('bot_media/victim_report'),contentType:records.get('bot_media/victim_report').contentType}));
 records.delete('line_bots/ownerB');records.delete('line_bots/ownerB/coupons/c2');
 records.set('line_bots/ownerA/coupons/c1',{code:'MOCKCODE1',status:'UNUSED',productName:'Mock Product',type:'EVENT'});
 const beforeWrites=writes.length;
 const makeReq=n=>({method:'POST',query:{uid:'ownerA'},headers:{'x-line-signature':'MOCK_ONLY'},rawBody:Buffer.from('mock'),body:{events:[{type:'message',source:{type:'user',userId:'U'+String(n).repeat(32)},replyToken:'MOCK_REPLY_'+n,message:{type:'text',id:'msg'+n,text:'e1'}}]}});
 const r1=response(),r2=response();
 await Promise.all([context.handler(makeReq(1),r1),context.handler(makeReq(2),r2)]);
 const allocations=writes.slice(beforeWrites).filter(w=>w.path==='line_bots/ownerA/coupons/c1'&&w.data?.status==='SENT');
 console.log(JSON.stringify({test:'parallel e1 same coupon',allocationCount:allocations.length,recipientIds:allocations.map(a=>a.data.recipientId),response1:r1.statusCode,response2:r2.statusCode}));
 records.set('line_bots/ownerA/coupons/c1',{code:'MOCKCODE1',status:'UNUSED',productName:'Mock Product',type:'EVENT'});
 records.set('line_bots/ownerA/pending_requests/order1',{status:'PENDING',requestedProduct:'Mock Product',orderId:'ORDER1',senderUserId:'Uintended',managerName:'Intended recipient'});
 const approvalReq=makeReq(9);approvalReq.body.events[0].message.text='DUYỆT';
 const approvalRes=response(); const readsBefore=reads.length;
 await context.handler(approvalReq,approvalRes);
 console.log(JSON.stringify({test:'nonadmin approve all',approved:records.get('line_bots/ownerA/pending_requests/order1').status,approvedBy:records.get('line_bots/ownerA/pending_requests/order1').approvedBy,adminCollectionQueried:reads.slice(readsBefore).some(p=>p.endsWith('/admins')),http:approvalRes.statusCode}));
 records.set('line_bots/ownerA/coupons/c1',{code:'MOCKCODE1',status:'USED',recipientId:'Uintended',productName:'Mock Product',type:'EVENT'});
 const cancelReq=makeReq(9);cancelReq.body.events[0].message.text='huy MOCKCODE1'; const cancelRes=response();
 await context.handler(cancelReq,cancelRes);
 console.log(JSON.stringify({test:'nonrecipient cancel USED coupon',statusAfter:records.get('line_bots/ownerA/coupons/c1').status,http:cancelRes.statusCode}));
 const todayVN='2026-10-07',usedAt='2026-10-06T18:00:00.000Z';
 console.log(JSON.stringify({test:'UTC prefix compared to VN day',usedAt,localVNDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(usedAt)),todayVN,reported:usedAt.startsWith(todayVN)}));
 console.log(JSON.stringify({test:'cleanup expired USED predicate',usedStatus:'USED',expiryDate:'2026-10-06',todayVN,willDelete:'USED'!=='SENT'&&'2026-10-06'<todayVN}));
})().catch(e=>{console.error(e);process.exitCode=1;});
