import{j as e,u as et,l as he,n as Z}from"./index-B1klLoJY.js";import{a as r,f as L,P as tt,h as st,i as me,X as nt,I as rt,j as Ee,k as ze,l as ge,m as at,n as it,o as ot,p as Ie,F as lt,D as ct}from"./vendor-ui-41ClhQAI.js";import{r as dt}from"./vendor-charts-CQD-9o8f.js";import{r as _e,u as J,w as xt}from"./vendor-excel-BBWTpfDg.js";import"./vendor-firebase-BiwTAARP.js";const ht=104,mt=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]],gt=[2,3,3,1,1,1,2];function ut(I){const S=[ht];for(let l=0;l<I.length;l++){const M=I.charCodeAt(l)-32;M<0||M>95||S.push(M)}let P=S[0];for(let l=1;l<S.length;l++)P+=S[l]*l;P%=103,S.push(P);const d=S.map(l=>mt[l]);return d.push(gt),d}function Pe({value:I,height:S=40,barColor:P="#000",className:d,style:l}){const M=r.useRef(null);return r.useEffect(()=>{const v=M.current;if(!v||!I)return;const c=ut(I);let E=0;for(const f of c)for(const h of f)E+=h;const D=10,R=E+D*2,y=3;v.width=R*y,v.height=S*y,v.style.width="100%",v.style.height="100%";const x=v.getContext("2d");if(!x)return;x.fillStyle="#fff",x.fillRect(0,0,v.width,v.height),x.fillStyle=P;let p=D*y;for(const f of c)for(let h=0;h<f.length;h++){const b=f[h]*y;h%2===0&&x.fillRect(p,0,b,v.height),p+=b}},[I,S,P]),I?e.jsx("canvas",{ref:M,className:d,style:{imageRendering:"pixelated",...l}}):null}const Me="stickerPrinterState",ue="stickerPrintHistory",pe="stickerSavedLists";function wt(){const{activeTab:I}=et(),[S,P]=r.useState(!1),[d,l]=r.useState("sticker"),[M,v]=r.useState(!1),[c,E]=r.useState("gia_soc"),[D,R]=r.useState("/frame/X24_NEW.png"),[y,x]=r.useState(8),[p,f]=r.useState([]),[h,b]=r.useState("QUẠT ĐIỀU HOÀ"),[$,K]=r.useState("0 SUẤT/NGÀY"),[V,X]=r.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[fe,be]=r.useState(""),[U,ee]=r.useState(!1),[ke,De]=r.useState("123456"),[k,G]=r.useState([]),[re,ae]=r.useState([]),[ie,je]=r.useState(!1),[oe,le]=r.useState([]),[ce,we]=r.useState(!1),B=r.useRef(null),A=r.useRef(null),Y=r.useRef("Quạt điều hoà Daikiosan DMI03"),Q=r.useRef("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),te=r.useRef(null),se=r.useRef(null),[Ne,ve]=r.useState(!1);r.useEffect(()=>{P(!0),he(Me).then(t=>{t&&(t.stickerType&&E(t.stickerType),t.bgImage&&R(t.bgImage),t.headerTextSize!=null&&x(t.headerTextSize),t.batchItems&&f(t.batchItems),t.headerTextContent&&b(t.headerTextContent),t.subHeaderTextContent&&K(t.subHeaderTextContent),t.footerTextContent&&(X(t.footerTextContent),Q.current=t.footerTextContent),t.showBarcode!=null&&ee(t.showBarcode),t.previewName&&(Y.current=t.previewName),t.manualPages&&G(t.manualPages)),ve(!0)}).catch(()=>ve(!0)),he(ue).then(t=>{t&&ae(t)}).catch(()=>{}),he(pe).then(t=>{t&&le(t)}).catch(()=>{})},[]),r.useEffect(()=>{if(!Ne)return;const t=setTimeout(()=>{Z(Me,{stickerType:c,bgImage:D,headerTextSize:y,batchItems:p,headerTextContent:h,subHeaderTextContent:$,footerTextContent:V,showBarcode:U,previewName:Y.current,manualPages:k}).catch(()=>{})},500);return()=>clearTimeout(t)},[Ne,c,D,y,p,h,$,V,U,k]),r.useEffect(()=>{B.current&&!B.current.hasAttribute("data-initialized")&&(B.current.innerText=Y.current,B.current.setAttribute("data-initialized","true")),A.current&&!A.current.hasAttribute("data-initialized")&&(A.current.innerText=Q.current,A.current.setAttribute("data-initialized","true")),te.current&&document.activeElement!==te.current&&(te.current.innerText=h),se.current&&document.activeElement!==se.current&&(se.current.innerText=$)});const Re=t=>{b(t.currentTarget.innerText)},He=t=>{K(t.currentTarget.innerText)},Le=t=>{const s=t.currentTarget.innerText;Q.current=s,X(s)},Be=t=>{const s=t.currentTarget.innerText;Y.current=s;const n=s.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);De(n?n[1]:"")},de=t=>{const s=t.currentTarget,n=s.innerText;if(/[a-zA-Z]/.test(n))return;const i=n.replace(/\D/g,"");if(!i)return;const j=parseInt(i,10).toLocaleString("vi-VN");if(n!==j){s.innerText=j;const m=document.createRange(),o=window.getSelection();o&&(m.selectNodeContents(s),m.collapse(!1),o.removeAllRanges(),o.addRange(m))}},Ae=t=>{var i;const s=(i=t.target.files)==null?void 0:i[0];if(!s)return;const n=new FileReader;n.onload=j=>{var m;try{const o=(m=j.target)==null?void 0:m.result,w=_e(o,{type:"binary"}),_=w.SheetNames[0],z=w.Sheets[_],C=J.sheet_to_json(z,{header:1}),N=[];for(let g=0;g<C.length;g++){const a=C[g];if(!a||a.length<9)continue;const W=a[4]?String(a[4]).trim():"",q=a[5]?String(a[5]).trim():"",u=a[42]?String(a[42]).trim():"";let T="";const O=u.toUpperCase();O.includes("IMEI:")?(T=u.substring(O.indexOf("IMEI:")+5).trim(),T=T.replace(/\)$/,"").trim()):O.includes("CODE:")&&(T=u.substring(O.indexOf("CODE:")+5).trim(),T=T.replace(/\)$/,"").trim());const ne=[W,q].filter(Boolean);u&&ne.push(u.startsWith("(")?u:`(${u})`);const F=ne.join(" ");if(!F||F==="TÊN SẢN PHẨM")continue;let xe="";if(a[8]){const H=String(a[8]).match(/\((-\d+%)\)/);H&&(xe=H[1])}let Te="";if(a[7]){const H=String(a[7]).replace(/\D/g,"");H&&(Te=Number(H).toLocaleString("vi-VN"))}let Se="";if(a[6]){const H=String(a[6]).replace(/\D/g,"");H&&(Se=Number(Math.floor(Number(H)/1e3)).toLocaleString("vi-VN"))}N.push({id:`item_${g}_${Date.now()}`,name:F,oldPrice:Te,newPrice:Se,percent:xe,imei:T,selected:!0})}f(N)}catch(o){console.error(o),alert("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},qe=()=>{const t=J.book_new(),s=["CODE","SẢN PHẨM","GIÁ NIÊM YẾT","GIÁ GIẢM","THỜI GIAN ÁP DỤNG","SỐ LƯỢNG SUẤT"],n=[["ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000","TỪ 08/05 ĐẾN 10/05","5 SUẤT/NGÀY"],["DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000","TỪ 08/05 ĐẾN 10/05","5 SUẤT/NGÀY"]],i=J.aoa_to_sheet([s,...n]);i["!cols"]=[{wch:15},{wch:40},{wch:18},{wch:18},{wch:22},{wch:18}],J.book_append_sheet(t,i,"Template"),xt(t,"Sticker_Template.xlsx")},ye=t=>{if(t==null)return 0;const s=String(t).replace(/[^0-9]/g,"");return s?Number(s):0},$e=t=>{var i;const s=(i=t.target.files)==null?void 0:i[0];if(!s)return;const n=new FileReader;n.onload=j=>{var m;try{const o=(m=j.target)==null?void 0:m.result,w=_e(o,{type:"binary"}),_=w.Sheets[w.SheetNames[0]],z=J.sheet_to_json(_,{header:1}),C=[];for(let g=1;g<z.length;g++){const a=z[g];if(!a||a.length<2)continue;const W=a[0]!=null?String(a[0]).trim():"",q=a[1]!=null?String(a[1]).trim():"";if(!q)continue;const u=ye(a[2]),T=ye(a[3]),O=u?u.toLocaleString("vi-VN"):"",ne=T?Number(Math.floor(T/1e3)).toLocaleString("vi-VN"):"";let F="";u>0&&T>0&&(F=`${Math.round((T/u-1)*100)}%`),C.push({id:`tpl_${g}_${Date.now()}`,name:q,oldPrice:O,newPrice:ne,percent:F,imei:W,selected:!0})}if(C.length===0){alert("Không tìm thấy dữ liệu hợp lệ trong file.");return}f(C),ee(!0);const N=z[1];if(N){const g=N[4]!=null?String(N[4]).trim():"",a=N[5]!=null?String(N[5]).trim():"";g&&b(g),a&&K(a)}}catch(o){console.error(o),alert("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},Ue=t=>{f(s=>s.map(n=>n.id===t?{...n,selected:!n.selected}:n))},Ce=t=>{f(s=>s.map(n=>({...n,selected:t})))},Ge=()=>{var w,_,z,C;const t=document.getElementById("print-section");if(!t)return;const s=t.querySelector(".sticker-container");if(!s)return;const n=((w=s.querySelector(".name"))==null?void 0:w.textContent)||"Sticker",i=((_=s.querySelector(".old"))==null?void 0:_.textContent)||"",j=((z=s.querySelector(".extra2"))==null?void 0:z.textContent)||"",m=((C=s.querySelector(".extra1"))==null?void 0:C.textContent)||"",o={id:`page_${Date.now()}`,html:s.outerHTML,label:n.substring(0,50),oldPrice:i,newPrice:j,percent:m,timestamp:Date.now()};G(N=>[...N,o])},We=t=>{var C,N,g,a,W,q,u;const s=document.createElement("div");s.innerHTML=t.html;const n=s.querySelector(".sticker-container");if(!n)return;const i=((C=n.querySelector(".header-text"))==null?void 0:C.textContent)||h,j=((N=n.querySelector(".name"))==null?void 0:N.textContent)||"",m=((g=n.querySelector(".old"))==null?void 0:g.textContent)||"",o=((a=n.querySelector(".extra2"))==null?void 0:a.textContent)||"",w=((W=n.querySelector(".extra1"))==null?void 0:W.textContent)||"",_=((q=n.querySelector(".footer-text"))==null?void 0:q.textContent)||V,z=((u=n.querySelector(".sub-header"))==null?void 0:u.textContent)||$;b(i),K(z),X(_),Q.current=_,Y.current=j,f([{id:`loaded_${Date.now()}`,name:j,oldPrice:m,newPrice:o,percent:w,imei:"",selected:!0}]),B.current&&B.current.removeAttribute("data-initialized"),A.current&&A.current.removeAttribute("data-initialized")},Oe=t=>{G(s=>s.filter(n=>n.id!==t))},Fe=()=>{G([])},Ke=()=>{if(k.length===0)return;const t=prompt("Đặt tên cho danh sách:",`DS ${new Date().toLocaleDateString("vi-VN")}`);if(!t)return;const s={id:`list_${Date.now()}`,name:t,pages:k,timestamp:Date.now(),stickerType:c,headerTextContent:h};le(n=>{const i=[s,...n].slice(0,20);return Z(pe,i).catch(()=>{}),i})},Ve=t=>{G(t.pages),t.stickerType&&E(t.stickerType),t.headerTextContent&&b(t.headerTextContent),we(!1)},Xe=t=>{le(s=>{const n=s.filter(i=>i.id!==t);return Z(pe,n).catch(()=>{}),n})},Ye=t=>{E(t.stickerType),R(t.bgImage),x(t.headerTextSize),f(t.batchItems),b(t.headerTextContent),K(t.subHeaderTextContent),X(t.footerTextContent),Q.current=t.footerTextContent,ee(t.showBarcode),G(t.manualPages||[]),je(!1)},Qe=t=>{ae(s=>{const n=s.filter(i=>i.id!==t);return Z(ue,n).catch(()=>{}),n})},Ze=()=>{f([]),be(""),b("HÀNG TRƯNG BÀY"),X("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),x(8)},Je=()=>{const t=document.getElementById("print-section");if(!t)return;const s=document.createElement("div");s.id="print-host",s.innerHTML=t.innerHTML,k.forEach(o=>{s.innerHTML+=o.html}),document.body.appendChild(s);const n=document.getElementById("root");n&&(n.style.display="none");const i=p.filter(o=>o.selected).length,j=Math.max(i,1)+k.length,m={id:`history_${Date.now()}`,timestamp:Date.now(),label:h||"Sticker",pageCount:j,stickerType:c,bgImage:D,headerTextSize:y,batchItems:p,headerTextContent:h,subHeaderTextContent:$,footerTextContent:V,showBarcode:U,manualPages:k};ae(o=>{const w=[m,...o].slice(0,20);return Z(ue,w).catch(()=>{}),w}),window.print(),n&&(n.style.display=""),document.body.removeChild(s)};return e.jsxs("div",{className:"print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden",children:[S&&I==="tools-print-sticker"&&document.getElementById("global-header-actions")&&dt.createPortal(e.jsxs("div",{className:"flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs("button",{onClick:()=>{l("sticker"),E("gia_soc"),b("QUẠT ĐIỀU HOÀ"),R("/frame/X24_NEW.png"),x(8)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${d==="sticker"&&c==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[d==="sticker"&&c==="gia_soc"&&e.jsx(L,{size:14,className:"text-indigo-600 dark:text-indigo-400"})," Giá Sốc"]}),e.jsxs("button",{onClick:()=>{l("sticker"),E("gio_vang"),b("TỪ 00/00 ĐẾN 00/00"),R("/frame/GVO2-scaled.png"),x(8)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${d==="sticker"&&c==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[d==="sticker"&&c==="gio_vang"&&e.jsx(L,{size:14,className:"text-amber-600 dark:text-amber-400"})," Giờ Vàng"]}),e.jsxs("button",{onClick:()=>{l("event"),v(!0)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${d==="event"?"bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[d==="event"&&e.jsx(L,{size:14,className:"text-emerald-600 dark:text-emerald-400"}),e.jsx(tt,{size:14}),"Event - Tồn kho"]})]}),d==="sticker"&&e.jsx("div",{className:"flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[26px]",children:[e.jsx("button",{onClick:()=>x(t=>Number((t-.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 w-7 text-center",children:y}),e.jsx("button",{onClick:()=>x(t=>Number((t+.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})})]}),document.getElementById("global-header-actions")),e.jsxs("div",{className:"lg:hidden sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 px-3 py-2 flex items-center justify-between gap-2 no-print",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50",children:[e.jsx("button",{onClick:()=>{l("sticker"),E("gia_soc"),b("QUẠT ĐIỀU HOÀ"),R("/frame/X24_NEW.png"),x(8)},className:`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${d==="sticker"&&c==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500"}`,children:"Giá Sốc"}),e.jsx("button",{onClick:()=>{l("sticker"),E("gio_vang"),b("TỪ 00/00 ĐẾN 00/00"),R("/frame/GVO2-scaled.png"),x(8)},className:`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${d==="sticker"&&c==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500"}`,children:"Giờ Vàng"}),e.jsx("button",{onClick:()=>{l("event"),v(!0)},className:`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${d==="event"?"bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm":"text-slate-500"}`,children:"Event"})]}),d==="sticker"&&e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-md overflow-hidden shadow-sm h-8",children:[e.jsx("button",{onClick:()=>x(t=>Number((t-.2).toFixed(1))),className:"px-2.5 h-full flex items-center justify-center hover:bg-slate-100 text-slate-600 font-black text-sm",children:"-"}),e.jsx("span",{className:"px-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 w-7 text-center",children:y}),e.jsx("button",{onClick:()=>x(t=>Number((t+.2).toFixed(1))),className:"px-2.5 h-full flex items-center justify-center hover:bg-slate-100 text-slate-600 font-black text-sm",children:"+"})]})]}),M&&e.jsx("div",{className:`absolute inset-0 z-10 w-full h-full transition-opacity duration-200 ${d==="event"?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,children:e.jsx("iframe",{src:"https://stickerevent-final-487587635482.us-west1.run.app",className:"w-full h-full border-none",title:"Event - Tồn kho",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0})}),e.jsxs("div",{className:`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${d==="event"?"invisible":"visible"}`,children:[e.jsx("style",{children:`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #print-host {
                        display: block !important;
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #print-host .sticker-container {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        background-size: 100% 100% !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        page-break-after: always;
                        page-break-inside: avoid;
                        transform: scale(0.95) !important;
                        transform-origin: center center !important;
                    }
                    #print-host .sticker-container:last-child {
                        page-break-after: auto;
                    }
                }

                .sticker-container {
                    width: 100%;
                    aspect-ratio: 197 / 285;
                    position: relative;
                    background-color: white;
                    background-image: url('${D}');
                    background-position: center;
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    overflow: hidden;
                    container-type: inline-size;
                    font-family: 'Arial', sans-serif;
                }

                .sticker-container > div {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    text-align: center;
                    background: transparent;
                    white-space: nowrap;
                    cursor: text;
                    color: #000;
                    outline: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .header-text {
                    font-size: ${y}cqw;
                    font-weight: 900;
                    top: 5.5%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${D==="/frame/X24.png"?"none":"flex"};
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .extra1 {
                    font-size: 36.9cqw;
                    font-weight: 900 !important;
                    top: 30.9%;
                    height: 25.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .name {
                    font-size: 3.6cqw;
                    font-weight: bold !important;
                    top: 60.8%;
                    height: 4.6%;
                    font-family: 'Alata Regular', sans-serif !important;
                }

                .sticker-container .old {
                    font-size: 14.2cqw;
                    font-weight: bold !important;
                    top: 66.6%;
                    height: 9.8%;
                    font-family: 'UTM Penumbra', sans-serif !important;
                }

                .sticker-container .extra2 {
                    font-size: 26.5cqw;
                    font-weight: 400 !important;
                    top: 76.5%;
                    height: 21%;
                    right: 24%;
                    left: auto;
                    width: 68%;
                    justify-content: flex-end;
                    letter-spacing: -0.05em;
                    font-family: 'UTM Colossalis', sans-serif !important;
                }

                .sticker-container .barcode {
                    position: absolute;
                    top: 1.5%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70%;
                    height: 1.4%;
                    display: flex;
                    justify-content: center;
                }
                .sticker-container .barcode img,
                .sticker-container .barcode canvas {
                    height: 100%;
                    width: 100%;
                    object-fit: fill;
                }

                .sticker-container .footer-text {
                    font-size: 3.2cqw;
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                    top: 95.5%;
                    height: 3%;
                    left: 0;
                    width: 100%;
                    color: black;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container[data-type="gio_vang"] .header-text {
                    font-size: ${y}cqw;
                    font-weight: 400;
                    top: 44.5%;
                    height: 8%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sticker-container[data-type="gio_vang"] .sub-header {
                    font-size: 13cqw;
                    font-weight: 400;
                    top: 52.5%;
                    height: 10%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    position: absolute;
                    left: 0;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: text;
                    outline: none;
                }
                .sticker-container[data-type="gio_vang"] .name {
                    font-size: 4cqw;
                    font-weight: bold !important;
                    top: 65.8%;
                    height: 4.5%;
                    color: black;
                    font-family: 'Alata Regular', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .old {
                    font-size: 11cqw;
                    font-weight: 400 !important;
                    top: 73%;
                    height: 9%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-decoration: line-through;
                    text-decoration-thickness: 3px;
                }
                .sticker-container[data-type="gio_vang"] .extra2 {
                    font-size: 24cqw;
                    font-weight: 400 !important;
                    top: 77%;
                    height: 20%;
                    right: 0;
                    left: 0;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: baseline;
                    letter-spacing: -0.06em;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 span {
                    font-family: 'UTM Colossalis', sans-serif !important;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 .small-zeros {
                    font-size: 40%;
                    letter-spacing: normal;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra1,
                .sticker-container[data-type="gio_vang"] .footer-text {
                    display: none !important;
                }
                `}),e.jsx("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg",children:e.jsx("div",{id:"print-section",className:"w-full",children:p.length>0?p.filter(t=>t.selected).map((t,s,n)=>e.jsxs("div",{className:"sticker-container","data-type":c,style:{pageBreakAfter:s<n.length-1?"always":"auto"},children:[U&&t.imei&&e.jsx("div",{className:"barcode",children:e.jsx(Pe,{value:t.imei})}),e.jsx("div",{className:"header-text",contentEditable:!0,suppressContentEditableWarning:!0,children:h}),c==="gio_vang"&&e.jsx("div",{className:"sub-header",contentEditable:!0,suppressContentEditableWarning:!0,children:$}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:t.percent}),e.jsx("div",{className:"old",contentEditable:!0,suppressContentEditableWarning:!0,children:t.oldPrice}),e.jsx("div",{className:"name",contentEditable:!0,suppressContentEditableWarning:!0,children:t.name}),c==="gio_vang"?e.jsxs("div",{className:"extra2 flex items-baseline justify-center",children:[e.jsx("span",{contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("span",{className:"small-zeros",contentEditable:!1,children:".000"})]}):e.jsx("div",{className:"extra2",contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("div",{className:"footer-text",contentEditable:!0,suppressContentEditableWarning:!0,children:V})]},t.id)):e.jsxs("div",{className:"sticker-container","data-type":c,children:[U&&ke&&e.jsx("div",{className:"barcode",children:e.jsx(Pe,{value:ke})}),e.jsx("div",{className:"header-text",ref:te,onInput:Re,contentEditable:!0,suppressContentEditableWarning:!0}),c==="gio_vang"&&e.jsx("div",{className:"sub-header",ref:se,onInput:He,contentEditable:!0,suppressContentEditableWarning:!0}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:"-36%"}),e.jsx("div",{className:"old",onInput:de,contentEditable:!0,suppressContentEditableWarning:!0,children:"5.490.000"}),e.jsx("div",{className:"name",ref:B,onInput:Be,contentEditable:!0,suppressContentEditableWarning:!0}),c==="gio_vang"?e.jsxs("div",{className:"extra2 flex items-baseline justify-center",children:[e.jsx("span",{onInput:de,contentEditable:!0,suppressContentEditableWarning:!0,children:"10.990"}),e.jsx("span",{className:"small-zeros",contentEditable:!1,children:".000"})]}):e.jsx("div",{className:"extra2",onInput:de,contentEditable:!0,suppressContentEditableWarning:!0,children:"3.490"}),e.jsx("div",{className:"footer-text",ref:A,onInput:Le,contentEditable:!0,suppressContentEditableWarning:!0})]})})}),k.length>0&&e.jsx("div",{className:"w-full max-w-[550px] no-print",children:e.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 mb-4",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2",children:[e.jsx(st,{size:16,className:"text-indigo-500"}),"Hàng đợi in (",k.length," trang)"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("button",{onClick:Ke,className:"text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase flex items-center gap-1",title:"Lưu danh sách này",children:[e.jsx(L,{size:12})," Lưu DS"]}),e.jsxs("button",{onClick:Fe,className:"text-[11px] text-red-500 hover:text-red-600 font-bold uppercase flex items-center gap-1",children:[e.jsx(me,{size:12})," Xóa tất cả"]})]})]}),e.jsx("div",{className:"space-y-2 max-h-[200px] overflow-y-auto",children:k.map((t,s)=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group",onClick:()=>We(t),title:"Click để load lại và chỉnh sửa",children:[e.jsxs("div",{className:"flex items-center gap-2 min-w-0 flex-1",children:[e.jsx("span",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0",children:s+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs text-slate-700 dark:text-slate-300 truncate font-medium",children:t.label}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px]",children:[e.jsx("span",{className:"text-red-600 font-bold",children:t.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:t.oldPrice}),t.percent&&e.jsx("span",{className:"text-green-600 font-bold",children:t.percent})]})]})]}),e.jsx("button",{onClick:n=>{n.stopPropagation(),Oe(t.id)},className:"text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-0 group-hover:opacity-100",children:e.jsx(nt,{size:14})})]},t.id))})]})}),oe.length>0&&k.length===0&&e.jsx("div",{className:"w-full max-w-[550px] no-print",children:e.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 mb-4",children:[e.jsxs("button",{onClick:()=>we(!ce),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(rt,{size:16,className:"text-emerald-500"}),"Danh sách đã lưu (",oe.length,")"]}),ce?e.jsx(Ee,{size:16}):e.jsx(ze,{size:16})]}),ce&&e.jsx("div",{className:"mt-3 space-y-2 max-h-[200px] overflow-y-auto",children:oe.map(t=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:t.name}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(t.timestamp).toLocaleDateString("vi-VN")}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[t.pages.length," trang"]})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>Ve(t),className:"p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold",title:"Tải danh sách",children:e.jsx(ge,{size:13})}),e.jsx("button",{onClick:()=>Xe(t.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors",title:"Xóa",children:e.jsx(me,{size:13})})]})]},t.id))})]})}),e.jsxs("div",{className:"w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print",children:[e.jsxs("div",{className:"flex gap-2 mb-4",children:[e.jsxs("button",{onClick:Je,className:"flex-1 bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-lg py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30",children:[e.jsx(at,{size:24}),"BẤM ĐỂ IN ",k.length>0&&`(${(p.filter(t=>t.selected).length||1)+k.length})`]}),e.jsxs("button",{onClick:Ge,className:"bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-lg shadow-indigo-500/30",title:"Thêm trang hiện tại vào hàng đợi in",children:[e.jsx(it,{size:20}),"Thêm"]})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("h3",{className:"text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2",children:"HƯỚNG DẪN IN"}),e.jsxs("div",{className:"space-y-4 text-sm text-slate-600 dark:text-slate-300",children:[e.jsx("p",{className:"font-medium",children:"1. Sử Dụng Trình Duyệt GOOGLE CHROME Để In."}),e.jsx("p",{className:"font-medium",children:"2. Khi In Điều Chỉnh Các Thông Số Như Sau:"}),e.jsxs("ul",{className:"space-y-3 pl-2",children:[e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(L,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn ",e.jsx("strong",{children:"Cài Đặt Khác (More settings)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(L,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Khổ Giấy Cần In (Khuyên dùng ",e.jsx("strong",{children:"A4"}),")."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(L,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(L,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Tích Chọn: ",e.jsx("strong",{children:"Hiển Thị Đồ Họa Nền (Background graphics)"}),"."]})]})]})]}),e.jsx("div",{className:"mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx(ot,{className:"text-blue-500 shrink-0",size:20}),e.jsx("p",{className:"text-xs text-blue-700 dark:text-blue-300 leading-relaxed",children:"Lưu ý: Bạn có thể click trực tiếp vào phần nội dung (giá, tên, % giảm, nhãn tiêu đề) ở khung bên trái để sửa thông tin trước khi in."})]})}),e.jsxs("div",{className:"mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-sm",children:[e.jsx(Ie,{size:18}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:Ae,className:"hidden"})]}),e.jsx("button",{onClick:Ze,className:"px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-sm",children:"Reset"})]}),e.jsxs("div",{className:"mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50",children:[e.jsxs("p",{className:"text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5",children:[e.jsx(lt,{size:14}),"Nhập từ File Mẫu"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:qe,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm",children:[e.jsx(ct,{size:14}),"Tải File Mẫu"]}),e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm",children:[e.jsx(Ie,{size:14}),"Nhập File Mẫu",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:$e,className:"hidden"})]})]})]}),e.jsxs("div",{className:"mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("label",{htmlFor:"toggle-barcode",className:"text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none",children:"Hiển thị Mã Vạch (Barcode)"}),e.jsx("input",{type:"checkbox",id:"toggle-barcode",checked:U,onChange:t=>ee(t.target.checked),className:"w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"})]}),e.jsxs("p",{className:"text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:["Mã vạch sẽ chỉ hiển thị khi tên sản phẩm có chứa từ khoá ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"IMEI:"})," hoặc ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"Code:"})," liền trước mã số."]})]}),p.length>0&&e.jsxs("div",{className:"mt-6 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white",children:["Danh sách in (",p.filter(t=>t.selected).length,"/",p.length,")"]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>Ce(!0),className:"text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>Ce(!1),className:"text-[11px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:()=>f([]),className:"text-[11px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx("input",{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:fe,onChange:t=>be(t.target.value),className:"w-full px-3 py-2 mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"}),e.jsx("div",{className:"max-h-[400px] overflow-y-auto pr-2 space-y-2 -mr-2",children:p.filter(t=>t.name.toLowerCase().includes(fe.toLowerCase())).map(t=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${t.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:t.selected,onChange:()=>Ue(t.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:t.name,children:t.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:t.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:t.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:t.percent})]})]})]},t.id))})]})]}),e.jsxs("div",{className:"mt-6 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("button",{onClick:()=>je(!ie),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(ge,{size:16}),"Lịch sử in (",re.length,")"]}),ie?e.jsx(Ee,{size:16}):e.jsx(ze,{size:16})]}),ie&&e.jsx("div",{className:"mt-3 space-y-2 max-h-[300px] overflow-y-auto",children:re.length===0?e.jsx("p",{className:"text-xs text-slate-400 text-center py-4",children:"Chưa có lịch sử in"}):re.map(t=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:t.label}),e.jsxs("div",{className:"flex gap-2 mt-1 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(t.timestamp).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[t.pageCount," trang"]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:t.stickerType==="gia_soc"?"Giá Sốc":"Giờ Vàng"})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>Ye(t),className:"p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors",title:"Khôi phục",children:e.jsx(ge,{size:13})}),e.jsx("button",{onClick:()=>Qe(t.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors",title:"Xóa",children:e.jsx(me,{size:13})})]})]},t.id))})]})]})]})]})]})}export{wt as default};
