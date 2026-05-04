import{u as ae,j as e}from"./index-BpbHRnMA.js";import{a as r,I as ie,f as oe,h as j,i as le,j as ce}from"./vendor-ui-B11sYSIf.js";import{r as de}from"./vendor-charts-Btr9eoIt.js";import{r as me,u as he}from"./vendor-excel-BBWTpfDg.js";import"./vendor-firebase-DvWAV7xs.js";function je(){const{activeTab:L}=ae(),[O,$]=r.useState(!1),[v,pe]=r.useState("/frame/X24_NEW.png"),[y,k]=r.useState(8),[p,x]=r.useState([]),[q,C]=r.useState("HÀNG TRƯNG BÀY"),[K,E]=r.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[T,I]=r.useState(""),[N,F]=r.useState(!0),[S,V]=r.useState("123456"),g=r.useRef(null),u=r.useRef(null),z=r.useRef("TÊN SẢN PHẨM (IMEI:123456)"),R=r.useRef("Khuyến mãi áp dụng đến hết ngày 3/5/2026");r.useEffect(()=>{$(!0)},[]),r.useEffect(()=>{g.current&&!g.current.hasAttribute("data-initialized")&&(g.current.innerText=z.current,g.current.setAttribute("data-initialized","true")),u.current&&!u.current.hasAttribute("data-initialized")&&(u.current.innerText=R.current,u.current.setAttribute("data-initialized","true"))});const X=t=>{const n=t.currentTarget,s=n.innerText;if(C(s.toUpperCase()),s!==s.toUpperCase()){const i=window.getSelection();let d=0;if(i&&i.rangeCount>0&&(d=i.getRangeAt(0).startOffset),n.innerText=s.toUpperCase(),i){const o=document.createRange();if(n.childNodes.length>0)try{o.setStart(n.childNodes[0],d),o.collapse(!0),i.removeAllRanges(),i.addRange(o)}catch{}}}},_=t=>{const n=t.currentTarget.innerText;R.current=n,E(n)},Y=t=>{const n=t.currentTarget.innerText;z.current=n;const s=n.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);V(s?s[1]:"")},A=t=>{const n=t.currentTarget,s=n.innerText;if(/[a-zA-Z]/.test(s))return;const i=s.replace(/\D/g,"");if(!i)return;const d=parseInt(i,10).toLocaleString("vi-VN");if(s!==d){n.innerText=d;const o=document.createRange(),l=window.getSelection();l&&(o.selectNodeContents(n),o.collapse(!1),l.removeAllRanges(),l.addRange(o))}},Z=t=>{var i;const n=(i=t.target.files)==null?void 0:i[0];if(!n)return;const s=new FileReader;s.onload=d=>{var o;try{const l=(o=d.target)==null?void 0:o.result,B=me(l,{type:"binary"}),te=B.SheetNames[0],ne=B.Sheets[te],P=he.sheet_to_json(ne,{header:1}),U=[];for(let b=0;b<P.length;b++){const a=P[b];if(!a||a.length<9)continue;const se=a[4]?String(a[4]).trim():"",re=a[5]?String(a[5]).trim():"",m=a[42]?String(a[42]).trim():"";let h="";const f=m.toUpperCase();f.includes("IMEI:")?(h=m.substring(f.indexOf("IMEI:")+5).trim(),h=h.replace(/\)$/,"").trim()):f.includes("CODE:")&&(h=m.substring(f.indexOf("CODE:")+5).trim(),h=h.replace(/\)$/,"").trim());const W=[se,re].filter(Boolean);m&&W.push(m.startsWith("(")?m:`(${m})`);const w=W.join(" ");if(!w||w==="TÊN SẢN PHẨM")continue;let D="";if(a[8]){const c=String(a[8]).match(/\((-\d+%)\)/);c&&(D=c[1])}let G="";if(a[7]){const c=String(a[7]).replace(/\D/g,"");c&&(G=Number(c).toLocaleString("vi-VN"))}let H="";if(a[6]){const c=String(a[6]).replace(/\D/g,"");c&&(H=Number(Math.floor(Number(c)/1e3)).toLocaleString("vi-VN"))}U.push({id:`item_${b}_${Date.now()}`,name:w,oldPrice:G,newPrice:H,percent:D,imei:h,selected:!0})}x(U)}catch(l){console.error(l),alert("Lỗi đọc file Excel")}},s.readAsBinaryString(n),t.target.value=""},J=t=>{x(n=>n.map(s=>s.id===t?{...s,selected:!s.selected}:s))},M=t=>{x(n=>n.map(s=>({...s,selected:t})))},Q=()=>{x([]),I(""),C("HÀNG TRƯNG BÀY"),E("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),k(8)},ee=()=>{window.print()};return e.jsxs("div",{className:"print-wrapper w-full h-full p-4 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row gap-8 justify-center items-start",children:[O&&L==="tools-print-sticker"&&document.getElementById("global-header-actions")&&de.createPortal(e.jsxs("div",{className:"flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300",children:[e.jsxs("button",{className:"flex items-center gap-2 px-4 py-1.5 rounded-full font-semibold text-[13px] transition-all bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60",children:[e.jsx(ie,{size:14})," Sticker Giá Sốc"]}),e.jsx("div",{className:"flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[26px]",children:[e.jsx("button",{onClick:()=>k(t=>Number((t-.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 w-7 text-center",children:y}),e.jsx("button",{onClick:()=>k(t=>Number((t+.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})})]}),document.getElementById("global-header-actions")),e.jsx("style",{children:`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: hidden !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    html, body, #root, main, .print-wrapper, .print-wrapper > div {
                        position: static !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        background: white !important;
                        overflow: visible !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .sticker-container {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        background-size: 100% 100% !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        page-break-after: always;
                        page-break-inside: avoid;
                        /* Ép thu nhỏ nội dung vừa khít trang A4 kể cả khi có lề mặc định */
                        transform: scale(0.93) !important;
                        transform-origin: center center !important;
                    }
                    .sticker-container:last-child {
                        page-break-after: auto;
                    }
                }

                .sticker-container {
                    width: 100%;
                    aspect-ratio: 197 / 285;
                    position: relative;
                    background-color: white;
                    background-image: url('${v}');
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
                    top: 5.2%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${v==="/frame/X24.png"?"none":"flex"};
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
                    top: 75.5%;
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
                    height: 2.2%;
                    display: flex;
                    justify-content: center;
                }
                .sticker-container .barcode img {
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
                `}),e.jsx("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg",children:e.jsx("div",{id:"print-section",className:"w-full",children:p.length>0?p.filter(t=>t.selected).map((t,n,s)=>e.jsxs("div",{className:"sticker-container",style:{pageBreakAfter:n<s.length-1?"always":"auto"},children:[N&&t.imei&&e.jsx("div",{className:"barcode",children:e.jsx("img",{src:`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(t.imei)}&includetext=false`,alt:"barcode",crossOrigin:"anonymous"})}),e.jsx("div",{className:"header-text",contentEditable:!0,suppressContentEditableWarning:!0,children:q}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:t.percent}),e.jsx("div",{className:"old",contentEditable:!0,suppressContentEditableWarning:!0,children:t.oldPrice}),e.jsx("div",{className:"name",contentEditable:!0,suppressContentEditableWarning:!0,children:t.name}),e.jsx("div",{className:"extra2",contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("div",{className:"footer-text",contentEditable:!0,suppressContentEditableWarning:!0,children:K})]},t.id)):e.jsxs("div",{className:"sticker-container",children:[N&&S&&e.jsx("div",{className:"barcode",children:e.jsx("img",{src:`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(S)}&includetext=false`,alt:"barcode",crossOrigin:"anonymous"})}),e.jsx("div",{className:"header-text",onInput:X,contentEditable:!0,suppressContentEditableWarning:!0,children:"HÀNG TRƯNG BÀY"}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:"-30%"}),e.jsx("div",{className:"old",onInput:A,contentEditable:!0,suppressContentEditableWarning:!0,children:"19.990.000"}),e.jsx("div",{className:"name",ref:g,onInput:Y,contentEditable:!0,suppressContentEditableWarning:!0}),e.jsx("div",{className:"extra2",onInput:A,contentEditable:!0,suppressContentEditableWarning:!0,children:"10.990"}),e.jsx("div",{className:"footer-text",ref:u,onInput:_,contentEditable:!0,suppressContentEditableWarning:!0})]})})}),e.jsxs("div",{className:"w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print",children:[e.jsxs("button",{onClick:ee,className:"w-full bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-xl py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30 mb-8",children:[e.jsx(oe,{size:28}),"BẤM ĐỂ IN"]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("h3",{className:"text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2",children:"HƯỚNG DẪN IN"}),e.jsxs("div",{className:"space-y-4 text-sm text-slate-600 dark:text-slate-300",children:[e.jsx("p",{className:"font-medium",children:"1. Sử Dụng Trình Duyệt GOOGLE CHROME Để In."}),e.jsx("p",{className:"font-medium",children:"2. Khi In Điều Chỉnh Các Thông Số Như Sau:"}),e.jsxs("ul",{className:"space-y-3 pl-2",children:[e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(j,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn ",e.jsx("strong",{children:"Cài Đặt Khác (More settings)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(j,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Khổ Giấy Cần In (Khuyên dùng ",e.jsx("strong",{children:"A4"}),")."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(j,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(j,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Tích Chọn: ",e.jsx("strong",{children:"Hiển Thị Đồ Họa Nền (Background graphics)"}),"."]})]})]})]}),e.jsx("div",{className:"mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx(le,{className:"text-blue-500 shrink-0",size:20}),e.jsx("p",{className:"text-xs text-blue-700 dark:text-blue-300 leading-relaxed",children:"Lưu ý: Bạn có thể click trực tiếp vào phần nội dung (giá, tên, % giảm, nhãn tiêu đề) ở khung bên trái để sửa thông tin trước khi in."})]})}),e.jsxs("div",{className:"mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-sm",children:[e.jsx(ce,{size:18}),"TẢI FILE EXCEL",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:Z,className:"hidden"})]}),e.jsx("button",{onClick:Q,className:"px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-sm",children:"Reset"})]}),e.jsxs("div",{className:"mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("label",{htmlFor:"toggle-barcode",className:"text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none",children:"Hiển thị Mã Vạch (Barcode)"}),e.jsx("input",{type:"checkbox",id:"toggle-barcode",checked:N,onChange:t=>F(t.target.checked),className:"w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"})]}),e.jsxs("p",{className:"text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:["Mã vạch sẽ chỉ hiển thị khi tên sản phẩm có chứa từ khoá ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"IMEI:"})," hoặc ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"Code:"})," liền trước mã số."]})]}),p.length>0&&e.jsxs("div",{className:"mt-6 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white",children:["Danh sách in (",p.filter(t=>t.selected).length,"/",p.length,")"]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>M(!0),className:"text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>M(!1),className:"text-[11px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:()=>x([]),className:"text-[11px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx("input",{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:T,onChange:t=>I(t.target.value),className:"w-full px-3 py-2 mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"}),e.jsx("div",{className:"max-h-[400px] overflow-y-auto pr-2 space-y-2 -mr-2",children:p.filter(t=>t.name.toLowerCase().includes(T.toLowerCase())).map(t=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${t.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:t.selected,onChange:()=>J(t.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:t.name,children:t.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:t.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:t.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:t.percent})]})]})]},t.id))})]})]})]})]})]})}export{je as default};
