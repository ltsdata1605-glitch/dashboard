const fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
let calls=0;const context=vm.createContext({
 onCall:(_opts,fn)=>fn,defineSecret:()=>({value:()=> 'MOCK_ONLY'}),
 HttpsError:class extends Error{},Type:{OBJECT:'OBJECT',STRING:'STRING',NUMBER:'NUMBER',ARRAY:'ARRAY'},
 GoogleGenAI:class {constructor(){this.models={generateContent:async()=>{calls++;return{text:JSON.stringify({detectedType:'day5_salary',fullName:'Mock',monthYear:'10/2026',bankAccount:'MOCK',bankName:'MOCK'})};}};}},
 setTimeout:()=>0,Promise,console:{info(){},warn(){}}
});
let source=stripTypeScriptTypes(fs.readFileSync((process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main') + '/functions/src/gemini.ts','utf8'),{mode:'transform'}).replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'');
vm.runInContext(source+'\nglobalThis.parse=parseSalarySlipWithGemini;',context);
(async()=>{
 const result=await context.parse({data:{base64Data:'aGVsbG8=',mimeType:'image/png',targetSlip:'day5'}});
 console.log(JSON.stringify({test:'anonymous Gemini salary handler',authProvided:false,providerCalls:calls,accepted:result.isValid}));
})().catch(e=>{console.error(e);process.exitCode=1;});
