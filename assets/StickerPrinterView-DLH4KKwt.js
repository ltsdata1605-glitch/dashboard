import{j as e,u as Ye,l as le,n as V}from"./index-VdR6Ykqa.js";import{a,f as q,h as Qe,i as ce,X as Ze,I as Je,j as ye,k as Ce,l as de,m as et,n as tt,o as st,p as Te,F as nt,D as rt}from"./vendor-ui-41ClhQAI.js";import{r as at}from"./vendor-charts-CQD-9o8f.js";import{r as Se,u as X,w as it}from"./vendor-excel-BBWTpfDg.js";import"./vendor-firebase-BiwTAARP.js";const ot=104,lt=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]],ct=[2,3,3,1,1,1,2];function dt(z){const C=[ot];for(let c=0;c<z.length;c++){const w=z.charCodeAt(c)-32;w<0||w>95||C.push(w)}let M=C[0];for(let c=1;c<C.length;c++)M+=C[c]*c;M%=103,C.push(M);const l=C.map(c=>lt[c]);return l.push(ct),l}function Ee({value:z,height:C=40,barColor:M="#000",className:l,style:c}){const w=a.useRef(null);return a.useEffect(()=>{const g=w.current;if(!g||!z)return;const _=dt(z);let S=0;for(const E of _)for(const N of E)S+=N;const u=10,T=S+u*2,p=3;g.width=T*p,g.height=C*p,g.style.width="100%",g.style.height="100%";const d=g.getContext("2d");if(!d)return;d.fillStyle="#fff",d.fillRect(0,0,g.width,g.height),d.fillStyle=M;let P=u*p;for(const E of _)for(let N=0;N<E.length;N++){const R=E[N]*p;N%2===0&&d.fillRect(P,0,R,g.height),P+=R}},[z,C,M]),z?e.jsx("canvas",{ref:w,className:l,style:{imageRendering:"pixelated",...c}}):null}const Ie="stickerPrinterState",xe="stickerPrintHistory",he="stickerSavedLists";function pt(){const{activeTab:z}=Ye(),[C,M]=a.useState(!1),[l,c]=a.useState("gia_soc"),[w,g]=a.useState("/frame/X24_NEW.png"),[_,S]=a.useState(8),[u,T]=a.useState([]),[p,d]=a.useState("QUẠT ĐIỀU HOÀ"),[P,E]=a.useState("0 SUẤT/NGÀY"),[N,R]=a.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[me,ge]=a.useState(""),[U,Y]=a.useState(!1),[ue,ze]=a.useState("123456"),[f,G]=a.useState([]),[ee,te]=a.useState([]),[se,pe]=a.useState(!1),[ne,re]=a.useState([]),[ae,fe]=a.useState(!1),L=a.useRef(null),B=a.useRef(null),O=a.useRef("Quạt điều hoà Daikiosan DMI03"),F=a.useRef("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),Q=a.useRef(null),Z=a.useRef(null),[be,je]=a.useState(!1);a.useEffect(()=>{M(!0),le(Ie).then(t=>{t&&(t.stickerType&&c(t.stickerType),t.bgImage&&g(t.bgImage),t.headerTextSize!=null&&S(t.headerTextSize),t.batchItems&&T(t.batchItems),t.headerTextContent&&d(t.headerTextContent),t.subHeaderTextContent&&E(t.subHeaderTextContent),t.footerTextContent&&(R(t.footerTextContent),F.current=t.footerTextContent),t.showBarcode!=null&&Y(t.showBarcode),t.previewName&&(O.current=t.previewName),t.manualPages&&G(t.manualPages)),je(!0)}).catch(()=>je(!0)),le(xe).then(t=>{t&&te(t)}).catch(()=>{}),le(he).then(t=>{t&&re(t)}).catch(()=>{})},[]),a.useEffect(()=>{if(!be)return;const t=setTimeout(()=>{V(Ie,{stickerType:l,bgImage:w,headerTextSize:_,batchItems:u,headerTextContent:p,subHeaderTextContent:P,footerTextContent:N,showBarcode:U,previewName:O.current,manualPages:f}).catch(()=>{})},500);return()=>clearTimeout(t)},[be,l,w,_,u,p,P,N,U,f]),a.useEffect(()=>{L.current&&!L.current.hasAttribute("data-initialized")&&(L.current.innerText=O.current,L.current.setAttribute("data-initialized","true")),B.current&&!B.current.hasAttribute("data-initialized")&&(B.current.innerText=F.current,B.current.setAttribute("data-initialized","true")),Q.current&&document.activeElement!==Q.current&&(Q.current.innerText=p),Z.current&&document.activeElement!==Z.current&&(Z.current.innerText=P)});const _e=t=>{d(t.currentTarget.innerText)},Pe=t=>{E(t.currentTarget.innerText)},De=t=>{const s=t.currentTarget.innerText;F.current=s,R(s)},Me=t=>{const s=t.currentTarget.innerText;O.current=s;const n=s.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);ze(n?n[1]:"")},ie=t=>{const s=t.currentTarget,n=s.innerText;if(/[a-zA-Z]/.test(n))return;const i=n.replace(/\D/g,"");if(!i)return;const b=parseInt(i,10).toLocaleString("vi-VN");if(n!==b){s.innerText=b;const x=document.createRange(),o=window.getSelection();o&&(x.selectNodeContents(s),x.collapse(!1),o.removeAllRanges(),o.addRange(x))}},Re=t=>{var i;const s=(i=t.target.files)==null?void 0:i[0];if(!s)return;const n=new FileReader;n.onload=b=>{var x;try{const o=(x=b.target)==null?void 0:x.result,j=Se(o,{type:"binary"}),D=j.SheetNames[0],I=j.Sheets[D],v=X.sheet_to_json(I,{header:1}),k=[];for(let h=0;h<v.length;h++){const r=v[h];if(!r||r.length<9)continue;const W=r[4]?String(r[4]).trim():"",A=r[5]?String(r[5]).trim():"",m=r[42]?String(r[42]).trim():"";let y="";const $=m.toUpperCase();$.includes("IMEI:")?(y=m.substring($.indexOf("IMEI:")+5).trim(),y=y.replace(/\)$/,"").trim()):$.includes("CODE:")&&(y=m.substring($.indexOf("CODE:")+5).trim(),y=y.replace(/\)$/,"").trim());const J=[W,A].filter(Boolean);m&&J.push(m.startsWith("(")?m:`(${m})`);const K=J.join(" ");if(!K||K==="TÊN SẢN PHẨM")continue;let oe="";if(r[8]){const H=String(r[8]).match(/\((-\d+%)\)/);H&&(oe=H[1])}let Ne="";if(r[7]){const H=String(r[7]).replace(/\D/g,"");H&&(Ne=Number(H).toLocaleString("vi-VN"))}let ve="";if(r[6]){const H=String(r[6]).replace(/\D/g,"");H&&(ve=Number(Math.floor(Number(H)/1e3)).toLocaleString("vi-VN"))}k.push({id:`item_${h}_${Date.now()}`,name:K,oldPrice:Ne,newPrice:ve,percent:oe,imei:y,selected:!0})}T(k)}catch(o){console.error(o),alert("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},He=()=>{const t=X.book_new(),s=["CODE","SẢN PHẨM","GIÁ NIÊM YẾT","GIÁ GIẢM","THỜI GIAN ÁP DỤNG","SỐ LƯỢNG SUẤT"],n=[["ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000","TỪ 08/05 ĐẾN 10/05","5 SUẤT/NGÀY"],["DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000","TỪ 08/05 ĐẾN 10/05","5 SUẤT/NGÀY"]],i=X.aoa_to_sheet([s,...n]);i["!cols"]=[{wch:15},{wch:40},{wch:18},{wch:18},{wch:22},{wch:18}],X.book_append_sheet(t,i,"Template"),it(t,"Sticker_Template.xlsx")},ke=t=>{if(t==null)return 0;const s=String(t).replace(/[^0-9]/g,"");return s?Number(s):0},Le=t=>{var i;const s=(i=t.target.files)==null?void 0:i[0];if(!s)return;const n=new FileReader;n.onload=b=>{var x;try{const o=(x=b.target)==null?void 0:x.result,j=Se(o,{type:"binary"}),D=j.Sheets[j.SheetNames[0]],I=X.sheet_to_json(D,{header:1}),v=[];for(let h=1;h<I.length;h++){const r=I[h];if(!r||r.length<2)continue;const W=r[0]!=null?String(r[0]).trim():"",A=r[1]!=null?String(r[1]).trim():"";if(!A)continue;const m=ke(r[2]),y=ke(r[3]),$=m?m.toLocaleString("vi-VN"):"",J=y?Number(Math.floor(y/1e3)).toLocaleString("vi-VN"):"";let K="";m>0&&y>0&&(K=`${Math.round((y/m-1)*100)}%`),v.push({id:`tpl_${h}_${Date.now()}`,name:A,oldPrice:$,newPrice:J,percent:K,imei:W,selected:!0})}if(v.length===0){alert("Không tìm thấy dữ liệu hợp lệ trong file.");return}T(v),Y(!0);const k=I[1];if(k){const h=k[4]!=null?String(k[4]).trim():"",r=k[5]!=null?String(k[5]).trim():"";h&&d(h),r&&E(r)}}catch(o){console.error(o),alert("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},Be=t=>{T(s=>s.map(n=>n.id===t?{...n,selected:!n.selected}:n))},we=t=>{T(s=>s.map(n=>({...n,selected:t})))},Ae=()=>{var j,D,I,v;const t=document.getElementById("print-section");if(!t)return;const s=t.querySelector(".sticker-container");if(!s)return;const n=((j=s.querySelector(".name"))==null?void 0:j.textContent)||"Sticker",i=((D=s.querySelector(".old"))==null?void 0:D.textContent)||"",b=((I=s.querySelector(".extra2"))==null?void 0:I.textContent)||"",x=((v=s.querySelector(".extra1"))==null?void 0:v.textContent)||"",o={id:`page_${Date.now()}`,html:s.outerHTML,label:n.substring(0,50),oldPrice:i,newPrice:b,percent:x,timestamp:Date.now()};G(k=>[...k,o])},qe=t=>{var v,k,h,r,W,A,m;const s=document.createElement("div");s.innerHTML=t.html;const n=s.querySelector(".sticker-container");if(!n)return;const i=((v=n.querySelector(".header-text"))==null?void 0:v.textContent)||p,b=((k=n.querySelector(".name"))==null?void 0:k.textContent)||"",x=((h=n.querySelector(".old"))==null?void 0:h.textContent)||"",o=((r=n.querySelector(".extra2"))==null?void 0:r.textContent)||"",j=((W=n.querySelector(".extra1"))==null?void 0:W.textContent)||"",D=((A=n.querySelector(".footer-text"))==null?void 0:A.textContent)||N,I=((m=n.querySelector(".sub-header"))==null?void 0:m.textContent)||P;d(i),E(I),R(D),F.current=D,O.current=b,T([{id:`loaded_${Date.now()}`,name:b,oldPrice:x,newPrice:o,percent:j,imei:"",selected:!0}]),L.current&&L.current.removeAttribute("data-initialized"),B.current&&B.current.removeAttribute("data-initialized")},Ue=t=>{G(s=>s.filter(n=>n.id!==t))},Ge=()=>{G([])},We=()=>{if(f.length===0)return;const t=prompt("Đặt tên cho danh sách:",`DS ${new Date().toLocaleDateString("vi-VN")}`);if(!t)return;const s={id:`list_${Date.now()}`,name:t,pages:f,timestamp:Date.now(),stickerType:l,headerTextContent:p};re(n=>{const i=[s,...n].slice(0,20);return V(he,i).catch(()=>{}),i})},$e=t=>{G(t.pages),t.stickerType&&c(t.stickerType),t.headerTextContent&&d(t.headerTextContent),fe(!1)},Ke=t=>{re(s=>{const n=s.filter(i=>i.id!==t);return V(he,n).catch(()=>{}),n})},Oe=t=>{c(t.stickerType),g(t.bgImage),S(t.headerTextSize),T(t.batchItems),d(t.headerTextContent),E(t.subHeaderTextContent),R(t.footerTextContent),F.current=t.footerTextContent,Y(t.showBarcode),G(t.manualPages||[]),pe(!1)},Fe=t=>{te(s=>{const n=s.filter(i=>i.id!==t);return V(xe,n).catch(()=>{}),n})},Ve=()=>{T([]),ge(""),d("HÀNG TRƯNG BÀY"),R("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),S(8)},Xe=()=>{const t=document.getElementById("print-section");if(!t)return;const s=document.createElement("div");s.id="print-host",s.innerHTML=t.innerHTML,f.forEach(o=>{s.innerHTML+=o.html}),document.body.appendChild(s);const n=document.getElementById("root");n&&(n.style.display="none");const i=u.filter(o=>o.selected).length,b=Math.max(i,1)+f.length,x={id:`history_${Date.now()}`,timestamp:Date.now(),label:p||"Sticker",pageCount:b,stickerType:l,bgImage:w,headerTextSize:_,batchItems:u,headerTextContent:p,subHeaderTextContent:P,footerTextContent:N,showBarcode:U,manualPages:f};te(o=>{const j=[x,...o].slice(0,20);return V(xe,j).catch(()=>{}),j}),window.print(),n&&(n.style.display=""),document.body.removeChild(s)};return e.jsxs("div",{className:"print-wrapper w-full h-full p-4 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row gap-8 justify-center items-start",children:[C&&z==="tools-print-sticker"&&document.getElementById("global-header-actions")&&at.createPortal(e.jsxs("div",{className:"flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs("button",{onClick:()=>{c("gia_soc"),d("QUẠT ĐIỀU HOÀ"),g("/frame/X24_NEW.png"),S(8)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${l==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[l==="gia_soc"&&e.jsx(q,{size:14,className:"text-indigo-600 dark:text-indigo-400"})," Giá Sốc"]}),e.jsxs("button",{onClick:()=>{c("gio_vang"),d("TỪ 00/00 ĐẾN 00/00"),g("/frame/GVO2-scaled.png"),S(8)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${l==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[l==="gio_vang"&&e.jsx(q,{size:14,className:"text-amber-600 dark:text-amber-400"})," Giờ Vàng"]})]}),e.jsx("div",{className:"flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[26px]",children:[e.jsx("button",{onClick:()=>S(t=>Number((t-.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 w-7 text-center",children:_}),e.jsx("button",{onClick:()=>S(t=>Number((t+.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})})]}),document.getElementById("global-header-actions")),e.jsx("style",{children:`
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
                    background-image: url('${w}');
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
                    font-size: ${_}cqw;
                    font-weight: 900;
                    top: 5.5%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${w==="/frame/X24.png"?"none":"flex"};
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
                    font-size: ${_}cqw;
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
                `}),e.jsx("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg",children:e.jsx("div",{id:"print-section",className:"w-full",children:u.length>0?u.filter(t=>t.selected).map((t,s,n)=>e.jsxs("div",{className:"sticker-container","data-type":l,style:{pageBreakAfter:s<n.length-1?"always":"auto"},children:[U&&t.imei&&e.jsx("div",{className:"barcode",children:e.jsx(Ee,{value:t.imei})}),e.jsx("div",{className:"header-text",contentEditable:!0,suppressContentEditableWarning:!0,children:p}),l==="gio_vang"&&e.jsx("div",{className:"sub-header",contentEditable:!0,suppressContentEditableWarning:!0,children:P}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:t.percent}),e.jsx("div",{className:"old",contentEditable:!0,suppressContentEditableWarning:!0,children:t.oldPrice}),e.jsx("div",{className:"name",contentEditable:!0,suppressContentEditableWarning:!0,children:t.name}),l==="gio_vang"?e.jsxs("div",{className:"extra2 flex items-baseline justify-center",children:[e.jsx("span",{contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("span",{className:"small-zeros",contentEditable:!1,children:".000"})]}):e.jsx("div",{className:"extra2",contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("div",{className:"footer-text",contentEditable:!0,suppressContentEditableWarning:!0,children:N})]},t.id)):e.jsxs("div",{className:"sticker-container","data-type":l,children:[U&&ue&&e.jsx("div",{className:"barcode",children:e.jsx(Ee,{value:ue})}),e.jsx("div",{className:"header-text",ref:Q,onInput:_e,contentEditable:!0,suppressContentEditableWarning:!0}),l==="gio_vang"&&e.jsx("div",{className:"sub-header",ref:Z,onInput:Pe,contentEditable:!0,suppressContentEditableWarning:!0}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:"-36%"}),e.jsx("div",{className:"old",onInput:ie,contentEditable:!0,suppressContentEditableWarning:!0,children:"5.490.000"}),e.jsx("div",{className:"name",ref:L,onInput:Me,contentEditable:!0,suppressContentEditableWarning:!0}),l==="gio_vang"?e.jsxs("div",{className:"extra2 flex items-baseline justify-center",children:[e.jsx("span",{onInput:ie,contentEditable:!0,suppressContentEditableWarning:!0,children:"10.990"}),e.jsx("span",{className:"small-zeros",contentEditable:!1,children:".000"})]}):e.jsx("div",{className:"extra2",onInput:ie,contentEditable:!0,suppressContentEditableWarning:!0,children:"3.490"}),e.jsx("div",{className:"footer-text",ref:B,onInput:De,contentEditable:!0,suppressContentEditableWarning:!0})]})})}),f.length>0&&e.jsx("div",{className:"w-full max-w-[550px] no-print",children:e.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 mb-4",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2",children:[e.jsx(Qe,{size:16,className:"text-indigo-500"}),"Hàng đợi in (",f.length," trang)"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("button",{onClick:We,className:"text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase flex items-center gap-1",title:"Lưu danh sách này",children:[e.jsx(q,{size:12})," Lưu DS"]}),e.jsxs("button",{onClick:Ge,className:"text-[11px] text-red-500 hover:text-red-600 font-bold uppercase flex items-center gap-1",children:[e.jsx(ce,{size:12})," Xóa tất cả"]})]})]}),e.jsx("div",{className:"space-y-2 max-h-[200px] overflow-y-auto",children:f.map((t,s)=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group",onClick:()=>qe(t),title:"Click để load lại và chỉnh sửa",children:[e.jsxs("div",{className:"flex items-center gap-2 min-w-0 flex-1",children:[e.jsx("span",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0",children:s+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs text-slate-700 dark:text-slate-300 truncate font-medium",children:t.label}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px]",children:[e.jsx("span",{className:"text-red-600 font-bold",children:t.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:t.oldPrice}),t.percent&&e.jsx("span",{className:"text-green-600 font-bold",children:t.percent})]})]})]}),e.jsx("button",{onClick:n=>{n.stopPropagation(),Ue(t.id)},className:"text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-0 group-hover:opacity-100",children:e.jsx(Ze,{size:14})})]},t.id))})]})}),ne.length>0&&f.length===0&&e.jsx("div",{className:"w-full max-w-[550px] no-print",children:e.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 mb-4",children:[e.jsxs("button",{onClick:()=>fe(!ae),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(Je,{size:16,className:"text-emerald-500"}),"Danh sách đã lưu (",ne.length,")"]}),ae?e.jsx(ye,{size:16}):e.jsx(Ce,{size:16})]}),ae&&e.jsx("div",{className:"mt-3 space-y-2 max-h-[200px] overflow-y-auto",children:ne.map(t=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:t.name}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(t.timestamp).toLocaleDateString("vi-VN")}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[t.pages.length," trang"]})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>$e(t),className:"p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold",title:"Tải danh sách",children:e.jsx(de,{size:13})}),e.jsx("button",{onClick:()=>Ke(t.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors",title:"Xóa",children:e.jsx(ce,{size:13})})]})]},t.id))})]})}),e.jsxs("div",{className:"w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print",children:[e.jsxs("div",{className:"flex gap-2 mb-4",children:[e.jsxs("button",{onClick:Xe,className:"flex-1 bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-lg py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30",children:[e.jsx(et,{size:24}),"BẤM ĐỂ IN ",f.length>0&&`(${(u.filter(t=>t.selected).length||1)+f.length})`]}),e.jsxs("button",{onClick:Ae,className:"bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-lg shadow-indigo-500/30",title:"Thêm trang hiện tại vào hàng đợi in",children:[e.jsx(tt,{size:20}),"Thêm"]})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("h3",{className:"text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2",children:"HƯỚNG DẪN IN"}),e.jsxs("div",{className:"space-y-4 text-sm text-slate-600 dark:text-slate-300",children:[e.jsx("p",{className:"font-medium",children:"1. Sử Dụng Trình Duyệt GOOGLE CHROME Để In."}),e.jsx("p",{className:"font-medium",children:"2. Khi In Điều Chỉnh Các Thông Số Như Sau:"}),e.jsxs("ul",{className:"space-y-3 pl-2",children:[e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(q,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn ",e.jsx("strong",{children:"Cài Đặt Khác (More settings)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(q,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Khổ Giấy Cần In (Khuyên dùng ",e.jsx("strong",{children:"A4"}),")."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(q,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(q,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Tích Chọn: ",e.jsx("strong",{children:"Hiển Thị Đồ Họa Nền (Background graphics)"}),"."]})]})]})]}),e.jsx("div",{className:"mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx(st,{className:"text-blue-500 shrink-0",size:20}),e.jsx("p",{className:"text-xs text-blue-700 dark:text-blue-300 leading-relaxed",children:"Lưu ý: Bạn có thể click trực tiếp vào phần nội dung (giá, tên, % giảm, nhãn tiêu đề) ở khung bên trái để sửa thông tin trước khi in."})]})}),e.jsxs("div",{className:"mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-sm",children:[e.jsx(Te,{size:18}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:Re,className:"hidden"})]}),e.jsx("button",{onClick:Ve,className:"px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-sm",children:"Reset"})]}),e.jsxs("div",{className:"mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50",children:[e.jsxs("p",{className:"text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5",children:[e.jsx(nt,{size:14}),"Nhập từ File Mẫu"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:He,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm",children:[e.jsx(rt,{size:14}),"Tải File Mẫu"]}),e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm",children:[e.jsx(Te,{size:14}),"Nhập File Mẫu",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:Le,className:"hidden"})]})]})]}),e.jsxs("div",{className:"mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("label",{htmlFor:"toggle-barcode",className:"text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none",children:"Hiển thị Mã Vạch (Barcode)"}),e.jsx("input",{type:"checkbox",id:"toggle-barcode",checked:U,onChange:t=>Y(t.target.checked),className:"w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"})]}),e.jsxs("p",{className:"text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:["Mã vạch sẽ chỉ hiển thị khi tên sản phẩm có chứa từ khoá ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"IMEI:"})," hoặc ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"Code:"})," liền trước mã số."]})]}),u.length>0&&e.jsxs("div",{className:"mt-6 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white",children:["Danh sách in (",u.filter(t=>t.selected).length,"/",u.length,")"]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>we(!0),className:"text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>we(!1),className:"text-[11px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:()=>T([]),className:"text-[11px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx("input",{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:me,onChange:t=>ge(t.target.value),className:"w-full px-3 py-2 mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"}),e.jsx("div",{className:"max-h-[400px] overflow-y-auto pr-2 space-y-2 -mr-2",children:u.filter(t=>t.name.toLowerCase().includes(me.toLowerCase())).map(t=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${t.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:t.selected,onChange:()=>Be(t.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:t.name,children:t.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:t.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:t.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:t.percent})]})]})]},t.id))})]})]}),e.jsxs("div",{className:"mt-6 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("button",{onClick:()=>pe(!se),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(de,{size:16}),"Lịch sử in (",ee.length,")"]}),se?e.jsx(ye,{size:16}):e.jsx(Ce,{size:16})]}),se&&e.jsx("div",{className:"mt-3 space-y-2 max-h-[300px] overflow-y-auto",children:ee.length===0?e.jsx("p",{className:"text-xs text-slate-400 text-center py-4",children:"Chưa có lịch sử in"}):ee.map(t=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:t.label}),e.jsxs("div",{className:"flex gap-2 mt-1 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(t.timestamp).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[t.pageCount," trang"]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:t.stickerType==="gia_soc"?"Giá Sốc":"Giờ Vàng"})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>Oe(t),className:"p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors",title:"Khôi phục",children:e.jsx(de,{size:13})}),e.jsx("button",{onClick:()=>Fe(t.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors",title:"Xóa",children:e.jsx(ce,{size:13})})]})]},t.id))})]})]})]})]})}export{pt as default};
