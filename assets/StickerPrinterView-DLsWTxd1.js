import{u as he,j as e}from"./index-F8iBbqC_.js";import{a,f as h,h as pe,i as ge,j as ue}from"./vendor-ui-D9x1Yvee.js";import{r as fe}from"./vendor-charts-h5zX1Fnb.js";import{r as be,u as ke}from"./vendor-excel-BBWTpfDg.js";import"./vendor-firebase-D_bTkCqr.js";function Ce(){const{activeTab:V}=he(),[X,Q]=a.useState(!1),[i,I]=a.useState("gia_soc"),[z,M]=a.useState("/frame/X24_NEW.png"),[C,p]=a.useState(8),[m,g]=a.useState([]),[R,k]=a.useState("QUẠT ĐIỀU HOÀ"),[_,Y]=a.useState("0 SUẤT/NGÀY"),[Z,U]=a.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[B,A]=a.useState(""),[E,J]=a.useState(!1),[W,ee]=a.useState("123456"),u=a.useRef(null),f=a.useRef(null),H=a.useRef("Quạt điều hoà Daikiosan DMI03"),D=a.useRef("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),j=a.useRef(null),w=a.useRef(null);a.useEffect(()=>{Q(!0)},[]),a.useEffect(()=>{u.current&&!u.current.hasAttribute("data-initialized")&&(u.current.innerText=H.current,u.current.setAttribute("data-initialized","true")),f.current&&!f.current.hasAttribute("data-initialized")&&(f.current.innerText=D.current,f.current.setAttribute("data-initialized","true")),j.current&&document.activeElement!==j.current&&(j.current.innerText=R),w.current&&document.activeElement!==w.current&&(w.current.innerText=_)});const te=t=>{k(t.currentTarget.innerText)},ne=t=>{Y(t.currentTarget.innerText)},se=t=>{const n=t.currentTarget.innerText;D.current=n,U(n)},ae=t=>{const n=t.currentTarget.innerText;H.current=n;const s=n.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);ee(s?s[1]:"")},T=t=>{const n=t.currentTarget,s=n.innerText;if(/[a-zA-Z]/.test(s))return;const b=s.replace(/\D/g,"");if(!b)return;const N=parseInt(b,10).toLocaleString("vi-VN");if(s!==N){n.innerText=N;const x=document.createRange(),l=window.getSelection();l&&(x.selectNodeContents(n),x.collapse(!1),l.removeAllRanges(),l.addRange(x))}},re=t=>{var b;const n=(b=t.target.files)==null?void 0:b[0];if(!n)return;const s=new FileReader;s.onload=N=>{var x;try{const l=(x=N.target)==null?void 0:x.result,$=be(l,{type:"binary"}),ce=$.SheetNames[0],de=$.Sheets[ce],q=ke.sheet_to_json(de,{header:1}),O=[];for(let v=0;v<q.length;v++){const r=q[v];if(!r||r.length<9)continue;const me=r[4]?String(r[4]).trim():"",xe=r[5]?String(r[5]).trim():"",c=r[42]?String(r[42]).trim():"";let d="";const y=c.toUpperCase();y.includes("IMEI:")?(d=c.substring(y.indexOf("IMEI:")+5).trim(),d=d.replace(/\)$/,"").trim()):y.includes("CODE:")&&(d=c.substring(y.indexOf("CODE:")+5).trim(),d=d.replace(/\)$/,"").trim());const G=[me,xe].filter(Boolean);c&&G.push(c.startsWith("(")?c:`(${c})`);const S=G.join(" ");if(!S||S==="TÊN SẢN PHẨM")continue;let L="";if(r[8]){const o=String(r[8]).match(/\((-\d+%)\)/);o&&(L=o[1])}let K="";if(r[7]){const o=String(r[7]).replace(/\D/g,"");o&&(K=Number(o).toLocaleString("vi-VN"))}let F="";if(r[6]){const o=String(r[6]).replace(/\D/g,"");o&&(F=Number(Math.floor(Number(o)/1e3)).toLocaleString("vi-VN"))}O.push({id:`item_${v}_${Date.now()}`,name:S,oldPrice:K,newPrice:F,percent:L,imei:d,selected:!0})}g(O)}catch(l){console.error(l),alert("Lỗi đọc file Excel")}},s.readAsBinaryString(n),t.target.value=""},ie=t=>{g(n=>n.map(s=>s.id===t?{...s,selected:!s.selected}:s))},P=t=>{g(n=>n.map(s=>({...s,selected:t})))},oe=()=>{g([]),A(""),k("HÀNG TRƯNG BÀY"),U("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),p(8)},le=()=>{const t=document.getElementById("print-section");if(!t)return;const n=document.createElement("div");n.id="print-host",n.innerHTML=t.innerHTML,document.body.appendChild(n);const s=document.getElementById("root");s&&(s.style.display="none"),window.print(),s&&(s.style.display=""),document.body.removeChild(n)};return e.jsxs("div",{className:"print-wrapper w-full h-full p-4 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row gap-8 justify-center items-start",children:[X&&V==="tools-print-sticker"&&document.getElementById("global-header-actions")&&fe.createPortal(e.jsxs("div",{className:"flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs("button",{onClick:()=>{I("gia_soc"),k("QUẠT ĐIỀU HOÀ"),M("/frame/X24_NEW.png"),p(8)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${i==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[i==="gia_soc"&&e.jsx(h,{size:14,className:"text-indigo-600 dark:text-indigo-400"})," Giá Sốc"]}),e.jsxs("button",{onClick:()=>{I("gio_vang"),k("TỪ 00/00 ĐẾN 00/00"),M("/frame/GVO2-scaled.png"),p(7.5)},className:`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${i==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[i==="gio_vang"&&e.jsx(h,{size:14,className:"text-amber-600 dark:text-amber-400"})," Giờ Vàng"]})]}),e.jsx("div",{className:"flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[26px]",children:[e.jsx("button",{onClick:()=>p(t=>Number((t-.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 w-7 text-center",children:C}),e.jsx("button",{onClick:()=>p(t=>Number((t+.2).toFixed(1))),className:"px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})})]}),document.getElementById("global-header-actions")),e.jsx("style",{children:`
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
                        transform: none !important;
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
                    background-image: url('${z}');
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
                    font-size: ${C}cqw;
                    font-weight: 900;
                    top: 4.2%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${z==="/frame/X24.png"?"none":"flex"};
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

                .sticker-container[data-type="gio_vang"] .header-text {
                    font-size: ${C}cqw;
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
                `}),e.jsx("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg",children:e.jsx("div",{id:"print-section",className:"w-full",children:m.length>0?m.filter(t=>t.selected).map((t,n,s)=>e.jsxs("div",{className:"sticker-container","data-type":i,style:{pageBreakAfter:n<s.length-1?"always":"auto"},children:[E&&t.imei&&e.jsx("div",{className:"barcode",children:e.jsx("img",{src:`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(t.imei)}&includetext=false`,alt:"barcode",crossOrigin:"anonymous"})}),e.jsx("div",{className:"header-text",contentEditable:!0,suppressContentEditableWarning:!0,children:R}),i==="gio_vang"&&e.jsx("div",{className:"sub-header",contentEditable:!0,suppressContentEditableWarning:!0,children:_}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:t.percent}),e.jsx("div",{className:"old",contentEditable:!0,suppressContentEditableWarning:!0,children:t.oldPrice}),e.jsx("div",{className:"name",contentEditable:!0,suppressContentEditableWarning:!0,children:t.name}),i==="gio_vang"?e.jsxs("div",{className:"extra2 flex items-baseline justify-center",children:[e.jsx("span",{contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("span",{className:"small-zeros",contentEditable:!1,children:".000"})]}):e.jsx("div",{className:"extra2",contentEditable:!0,suppressContentEditableWarning:!0,children:t.newPrice}),e.jsx("div",{className:"footer-text",contentEditable:!0,suppressContentEditableWarning:!0,children:Z})]},t.id)):e.jsxs("div",{className:"sticker-container","data-type":i,children:[E&&W&&e.jsx("div",{className:"barcode",children:e.jsx("img",{src:`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(W)}&includetext=false`,alt:"barcode",crossOrigin:"anonymous"})}),e.jsx("div",{className:"header-text",ref:j,onInput:te,contentEditable:!0,suppressContentEditableWarning:!0}),i==="gio_vang"&&e.jsx("div",{className:"sub-header",ref:w,onInput:ne,contentEditable:!0,suppressContentEditableWarning:!0}),e.jsx("div",{className:"extra1",contentEditable:!0,suppressContentEditableWarning:!0,children:"-36%"}),e.jsx("div",{className:"old",onInput:T,contentEditable:!0,suppressContentEditableWarning:!0,children:"5.490.000"}),e.jsx("div",{className:"name",ref:u,onInput:ae,contentEditable:!0,suppressContentEditableWarning:!0}),i==="gio_vang"?e.jsxs("div",{className:"extra2 flex items-baseline justify-center",children:[e.jsx("span",{onInput:T,contentEditable:!0,suppressContentEditableWarning:!0,children:"10.990"}),e.jsx("span",{className:"small-zeros",contentEditable:!1,children:".000"})]}):e.jsx("div",{className:"extra2",onInput:T,contentEditable:!0,suppressContentEditableWarning:!0,children:"3.490"}),e.jsx("div",{className:"footer-text",ref:f,onInput:se,contentEditable:!0,suppressContentEditableWarning:!0})]})})}),e.jsxs("div",{className:"w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print",children:[e.jsxs("button",{onClick:le,className:"w-full bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-xl py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30 mb-8",children:[e.jsx(pe,{size:28}),"BẤM ĐỂ IN"]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("h3",{className:"text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2",children:"HƯỚNG DẪN IN"}),e.jsxs("div",{className:"space-y-4 text-sm text-slate-600 dark:text-slate-300",children:[e.jsx("p",{className:"font-medium",children:"1. Sử Dụng Trình Duyệt GOOGLE CHROME Để In."}),e.jsx("p",{className:"font-medium",children:"2. Khi In Điều Chỉnh Các Thông Số Như Sau:"}),e.jsxs("ul",{className:"space-y-3 pl-2",children:[e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(h,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn ",e.jsx("strong",{children:"Cài Đặt Khác (More settings)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(h,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Khổ Giấy Cần In (Khuyên dùng ",e.jsx("strong",{children:"A4"}),")."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(h,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Chọn Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(h,{size:16,className:"text-emerald-500 mt-0.5 shrink-0"}),e.jsxs("span",{children:["Tích Chọn: ",e.jsx("strong",{children:"Hiển Thị Đồ Họa Nền (Background graphics)"}),"."]})]})]})]}),e.jsx("div",{className:"mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx(ge,{className:"text-blue-500 shrink-0",size:20}),e.jsx("p",{className:"text-xs text-blue-700 dark:text-blue-300 leading-relaxed",children:"Lưu ý: Bạn có thể click trực tiếp vào phần nội dung (giá, tên, % giảm, nhãn tiêu đề) ở khung bên trái để sửa thông tin trước khi in."})]})}),e.jsxs("div",{className:"mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-sm",children:[e.jsx(ue,{size:18}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:re,className:"hidden"})]}),e.jsx("button",{onClick:oe,className:"px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-sm",children:"Reset"})]}),e.jsxs("div",{className:"mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("label",{htmlFor:"toggle-barcode",className:"text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none",children:"Hiển thị Mã Vạch (Barcode)"}),e.jsx("input",{type:"checkbox",id:"toggle-barcode",checked:E,onChange:t=>J(t.target.checked),className:"w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"})]}),e.jsxs("p",{className:"text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:["Mã vạch sẽ chỉ hiển thị khi tên sản phẩm có chứa từ khoá ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"IMEI:"})," hoặc ",e.jsx("strong",{className:"text-indigo-600 dark:text-indigo-400",children:"Code:"})," liền trước mã số."]})]}),m.length>0&&e.jsxs("div",{className:"mt-6 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white",children:["Danh sách in (",m.filter(t=>t.selected).length,"/",m.length,")"]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>P(!0),className:"text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>P(!1),className:"text-[11px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:()=>g([]),className:"text-[11px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx("input",{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:B,onChange:t=>A(t.target.value),className:"w-full px-3 py-2 mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"}),e.jsx("div",{className:"max-h-[400px] overflow-y-auto pr-2 space-y-2 -mr-2",children:m.filter(t=>t.name.toLowerCase().includes(B.toLowerCase())).map(t=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${t.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:t.selected,onChange:()=>ie(t.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:t.name,children:t.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:t.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:t.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:t.percent})]})]})]},t.id))})]})]})]})]})]})}export{Ce as default};
