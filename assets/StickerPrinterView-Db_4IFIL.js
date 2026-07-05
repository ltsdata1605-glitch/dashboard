const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/StickerEventApp-DWn__yfB.js","assets/index-CdKaB0Oj.js","assets/vendor-ui-BoQAhSeD.js","assets/vendor-charts-B95VUJRi.js","assets/vendor-firebase-Bpyixda8.js","assets/index-CS3VplT_.css","assets/uiService-BX2zLL4Z.js"])))=>i.map(i=>d[i]);
import{j as e,B as Xe,b as Ot,u as qn,a as Ln,_ as ft,s as et,E as Un,e as St,z as He}from"./index-CdKaB0Oj.js";import{e as tt,a as i,B as Bn,j as Gn,k as On,P as en,l as tn,X as Ut,m as nn,n as An,i as At,o as Vn,p as Wn,q as Kn,s as ln,t as Xn,u as Yn,v as rn,w as Ct,F as Qn,D as Jn,x as cn,f as Tt}from"./vendor-ui-BoQAhSeD.js";import{r as Zn}from"./vendor-charts-B95VUJRi.js";const Fn=104,er=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]],tr=[2,3,3,1,1,1,2];function nr(r){const d=[Fn];for(let o=0;o<r.length;o++){const u=r.charCodeAt(o)-32;u<0||u>95||d.push(u)}let c=d[0];for(let o=1;o<d.length;o++)c+=d[o]*o;c%=103,d.push(c);const a=d.map(o=>er[o]);return a.push(tr),a}function Wt(r,d=40,c="#000"){if(!r)return"";const a=nr(r);let o=0;for(const L of a)for(const k of L)o+=k;const u=10,S=o+u*2,I=3,x=document.createElement("canvas");x.width=S*I,x.height=d*I;const D=x.getContext("2d");if(!D)return"";D.fillStyle="#fff",D.fillRect(0,0,x.width,x.height),D.fillStyle=c;let Y=u*I;for(const L of a)for(let k=0;k<L.length;k++){const A=L[k]*I;k%2===0&&D.fillRect(Y,0,A,x.height),Y+=A}return x.toDataURL("image/png")}function sn({value:r,height:d=40,barColor:c="#000",className:a,style:o}){const[u,S]=tt.useState("");return i.useEffect(()=>{if(r)try{const I=Wt(r,d,c);S(I)}catch(I){console.error("Error generating barcode data URL:",I)}},[r,d,c]),!r||!u?null:e.jsx("img",{src:u,className:a,style:{imageRendering:"pixelated",width:"100%",height:"100%",objectFit:"fill",...o},alt:r})}const rr=tt.memo(({ticket:r,firstTicket:d,onChange:c,index:a,drawContentTopLeftSize:o,drawContentTopRightSize:u,drawContentBottomLeftSize:S,drawContentBottomRightSize:I,drawTitleSize:x,drawCodeSize:D,drawFooterSize:Y,activeField:L,setActiveField:k,isAutoIncrement:A,totalIndex:Q})=>{const ne=i.useCallback(_=>{c({title:_})},[c]),J=i.useCallback(_=>{c({code:_})},[c]),ie=i.useCallback(_=>{c({footer:_})},[c]),se=i.useCallback(_=>{c({contentTop:_})},[c]),K=i.useCallback(_=>{c({contentBottom:_})},[c]),G=i.useCallback(_=>{c({contentTopRight:_})},[c]),ze=i.useCallback(_=>{c({contentBottomRight:_})},[c]),le=Se(r.title,ne,!0),we=Se(r.code,J,!0),ce=Se(r.footer,ie,!0),Ee=Se(r.contentTop||"",se,!0),de=Se(r.contentTopRight||"",G,!0),ge=Se(r.contentBottom||"",K,!0),Z=Se(r.contentBottomRight||"",ze,!0),m=Q!==void 0?Q===0:a===0,V=d||r;return e.jsxs("div",{className:"draw-ticket-block","data-index":a,children:[m?e.jsx("div",{ref:le.ref,onInput:le.handleInput,onClick:()=>k==null?void 0:k("drawTitle"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-title-left animate-pulse-once ${L==="drawTitle"?"active-field":""}`,style:{fontSize:`${x||3.6}cqw`},"data-placeholder":"Nhập tiêu đề..."}):e.jsx("div",{className:"display-title-left",style:{fontSize:`${x||3.6}cqw`},dangerouslySetInnerHTML:{__html:V.title}}),e.jsx("div",{className:"display-title-right",style:{fontSize:`${x||3.6}cqw`},dangerouslySetInnerHTML:{__html:V.title}}),m?e.jsx("div",{ref:Ee.ref,onInput:Ee.handleInput,onClick:()=>k==null?void 0:k("drawContentTopLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-left ${L==="drawContentTopLeft"?"active-field":""}`,style:{fontSize:`${o||3.5}cqw`},"data-placeholder":"Nhập thông tin 1 (Họ tên, SĐT...)"}):e.jsx("div",{className:"display-content-top-left",style:{fontSize:`${o||3.5}cqw`},dangerouslySetInnerHTML:{__html:V.contentTop||""}}),m?e.jsx("div",{ref:de.ref,onInput:de.handleInput,onClick:()=>k==null?void 0:k("drawContentTopRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-right ${L==="drawContentTopRight"?"active-field":""}`,style:{fontSize:`${u||3.5}cqw`},"data-placeholder":"Nhập thông tin 3 (Tự gõ...)"}):e.jsx("div",{className:"display-content-top-right",style:{fontSize:`${u||3.5}cqw`},dangerouslySetInnerHTML:{__html:V.contentTopRight||""}}),A?e.jsx("div",{className:"display-code-left",style:{fontSize:`${D||3.8}cqw`},children:r.code}):e.jsx("div",{ref:we.ref,onInput:we.handleInput,onClick:()=>k==null?void 0:k("drawCode"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-code-left ${L==="drawCode"?"active-field":""}`,style:{fontSize:`${D||3.8}cqw`},"data-placeholder":"Số"}),e.jsx("div",{className:"display-code-right",style:{fontSize:`${D||3.8}cqw`},children:r.code}),m?e.jsx("div",{ref:ge.ref,onInput:ge.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-left ${L==="drawContentBottomLeft"?"active-field":""}`,style:{fontSize:`${S||2.2}cqw`},"data-placeholder":"Nhập thông tin 2 (Địa chỉ...)"}):e.jsx("div",{className:"display-content-bottom-left",style:{fontSize:`${S||2.2}cqw`},dangerouslySetInnerHTML:{__html:V.contentBottom||""}}),m?e.jsx("div",{ref:Z.ref,onInput:Z.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-right ${L==="drawContentBottomRight"?"active-field":""}`,style:{fontSize:`${I||2.2}cqw`},"data-placeholder":"Nhập thông tin 4 (Tự gõ...)"}):e.jsx("div",{className:"display-content-bottom-right",style:{fontSize:`${I||2.2}cqw`},dangerouslySetInnerHTML:{__html:V.contentBottomRight||""}}),m?e.jsx("div",{ref:ce.ref,onInput:ce.handleInput,onClick:()=>k==null?void 0:k("drawFooter"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-footer-left ${L==="drawFooter"?"active-field":""}`,style:{fontSize:`${Y||3.8}cqw`},"data-placeholder":"Nhập tên siêu thị..."}):e.jsx("div",{className:"display-footer-left",style:{fontSize:`${Y||3.8}cqw`},dangerouslySetInnerHTML:{__html:V.footer}})]})});function Se(r,d,c=!1){const a=i.useRef(null),o=i.useRef(null);i.useEffect(()=>{a.current&&a.current!==o.current&&(o.current=a.current,(c?a.current.innerHTML:a.current.innerText)!==r&&(c?a.current.innerHTML=r:a.current.innerText=r))}),i.useEffect(()=>{a.current&&document.activeElement!==a.current&&(c?a.current.innerHTML:a.current.innerText)!==r&&(c?a.current.innerHTML=r:a.current.innerText=r)},[r,c]);const u=i.useCallback(S=>{d==null||d(c?S.currentTarget.innerHTML:S.currentTarget.innerText)},[d,c]);return{ref:a,handleInput:u}}const on=(r,d)=>{const c=Number(r.replace(/\D/g,""));let a=Number(d.replace(/\D/g,""));if(c<=0||a<=0)return null;a*1e3<=c*1.5&&a<c&&(a=a*1e3);const o=c-a;if(o<=0)return null;let u="",S="";if(o<1e6)u=(o/1e3).toString(),S="K";else{const I=o/1e6;u=Number(I.toFixed(1)).toString(),S="triệu"}return e.jsxs("span",{className:"discount-amount font-bold",children:[e.jsx("span",{className:"discount-label",children:"-"}),e.jsx("span",{className:"discount-num",children:u}),e.jsx("span",{className:`discount-unit ${S==="triệu"?"unit-trieu":"unit-k"}`,children:S})]})},Bt=(r,d)=>{const c=Number(r.replace(/\D/g,""));let a=Number(d.replace(/\D/g,""));if(c<=0||a<=0)return null;a*1e3<=c*1.5&&a<c&&(a=a*1e3);const o=Math.round((a/c-1)*100);return o<0?`${o}%`:""},sr=({batchItems:r,stickerType:d,showBarcode:c,discountDisplayMode:a,headerTextContent:o,subHeaderTextContent:u,footerTextContent:S,barcodeImei:I,bgImage:x,headerTextSize:D,subHeaderTextSize:Y,percentTextSize:L,oldPriceTextSize:k,nameTextSize:A,newPriceTextSize:Q,footerTextSize:ne,previewName:J,previewOldPrice:ie,previewNewPrice:se,activeField:K,setActiveField:G,setHeaderTextContent:ze,setSubHeaderTextContent:le,setFooterTextContent:we,setBarcodeImei:ce,setPreviewName:Ee,setPreviewOldPrice:de,setPreviewNewPrice:ge,updateBatchItem:Z,drawTickets:m=[],setDrawTickets:V,drawContentTopLeftSize:_,drawContentTopRightSize:re,drawContentBottomLeftSize:$e,drawContentBottomRightSize:xe,drawTitleSize:ht,drawCodeSize:De,drawFooterSize:Ce,drawAutoIncrement:ke})=>{const[ee,ve]=tt.useState(0),ae=Math.ceil((m||[]).length/4);tt.useEffect(()=>{ee>=ae&&ve(0)},[m==null?void 0:m.length,ae,ee]);const Ie=i.useRef(null),Be=i.useRef(new Map),qe=i.useCallback(f=>{const l=Be.current;let g=l.get(f);return g||(g=h=>{V==null||V(v=>v.map((w,M)=>M===f?{...w,...h}:w))},l.set(f,g)),g},[V]),[pe,ye]=tt.useState(null),[Ye,me]=tt.useState(null),be=i.useRef(null);tt.useEffect(()=>{const f=()=>{const l=window.getSelection();if(!l||l.rangeCount===0||l.isCollapsed){ye(null),me(null);return}const g=l.getRangeAt(0);let h=g.commonAncestorContainer;h.nodeType===3&&(h=h.parentNode||h);let v=h,w=!1;for(;v;){if(v.nodeType===1&&v.getAttribute("contenteditable")==="true"){w=!0;break}v=v.parentNode}if(!w){ye(null),me(null);return}be.current=g.cloneRange();const M=g.getClientRects();if(M.length>0){const O=M[0];ye({top:O.top+window.scrollY-50,left:O.left+window.scrollX+O.width/2})}else ye(null),me(null)};return document.addEventListener("selectionchange",f),()=>{document.removeEventListener("selectionchange",f)}},[]);const Ne=(f,l)=>{let g=be.current;const h=window.getSelection();if(!g&&h&&h.rangeCount>0&&!h.isCollapsed&&(g=h.getRangeAt(0)),!g)return;h&&(h.removeAllRanges(),h.addRange(g));let v=g.commonAncestorContainer;v.nodeType===3&&(v=v.parentNode||v);let w=v,M=null;for(;w;){if(w.nodeType===1&&w.getAttribute("contenteditable")==="true"){M=w;break}w=w.parentNode}if(!M)return;const O=document.createElement("span");O.style[f]=l;try{O.appendChild(g.extractContents()),g.insertNode(O);const F=document.createRange();F.selectNodeContents(O),h&&(h.removeAllRanges(),h.addRange(F)),be.current=F;const Me=new Event("input",{bubbles:!0});M.dispatchEvent(Me)}catch(F){console.error("Error applying custom style to selection:",F)}},Ge=f=>{let l=be.current;const g=window.getSelection();l&&g&&(g.removeAllRanges(),g.addRange(l)),document.execCommand(f,!1),g&&g.rangeCount>0&&(be.current=g.getRangeAt(0).cloneRange());const h=window.getSelection();if(!h||h.rangeCount===0)return;let w=h.getRangeAt(0).commonAncestorContainer;w.nodeType===3&&(w=w.parentNode||w);let M=w;for(;M;){if(M.nodeType===1&&M.getAttribute("contenteditable")==="true"){const O=new Event("input",{bubbles:!0});M.dispatchEvent(O);break}M=M.parentNode}},j=Se(ie,de),nt=Se(se,ge),Oe=f=>{Qe(f),j.handleInput(f)},kt=f=>{Qe(f),nt.handleInput(f)},Ae=i.useCallback(f=>{Ee(f)},[Ee]),Ve=Se(J,Ae),rt=Se(o,ze),We=Se(u,le),vt=Se(S,we),Qe=f=>{const l=f.currentTarget,g=l.innerText;if(/[a-zA-Z]/.test(g))return;const h=g.replace(/\D/g,"");if(!h)return;let v=parseInt(h,10);l.classList.contains("extra2")&&v>=1e5&&(v=Math.floor(v/1e3));const M=v.toLocaleString("vi-VN");if(g!==M){l.innerText=M;const F=document.createRange(),Me=window.getSelection();Me&&(F.selectNodeContents(l),F.collapse(!1),Me.removeAllRanges(),Me.addRange(F))}const O=l.closest(".sticker-container");O&&zt(O)},zt=f=>{const l=f.querySelector(".old"),g=f.querySelector(".extra2"),h=f.querySelector(".extra1");if(!l||!g||!h)return;const v=Number(l.innerText.replace(/\D/g,""));let w=Number(g.innerText.replace(/\D/g,""));if(v>0&&w>0)if(w*1e3<=v*1.5&&w<v&&(w=w*1e3),a==="amount"){const M=v-w;if(M>0){let O="",F="";M<1e6?(O=(M/1e3).toString(),F="K"):(O=Number((M/1e6).toFixed(1)).toString(),F="triệu");const Me=F==="triệu"?"unit-trieu":"unit-k";h.innerHTML=`<span class="discount-amount font-bold"><span class="discount-label">-</span><span class="discount-num">${O}</span><span class="discount-unit ${Me}">${F}</span></span>`}else h.innerText=""}else{const M=Math.round((w/v-1)*100);M<0?h.innerText=`${M}%`:h.innerText=""}},st=()=>{const f=window.getSelection();if(!f||f.rangeCount===0)return 3.5;let g=f.getRangeAt(0).commonAncestorContainer;g.nodeType===Node.TEXT_NODE&&(g=g.parentElement);const h=g==null?void 0:g.closest('span[style*="font-size"]');if(h){const w=h.style.fontSize.match(/([\d.]+)/);if(w)return parseFloat(w[1])}return 3.5},gt=f=>{const l=st(),g=Math.max(.5,Math.min(20,parseFloat((l+f).toFixed(1))));if(Ne("fontSize",`${g}cqw`),be.current){const h=window.getSelection();h&&(h.removeAllRanges(),h.addRange(be.current))}},Et=f=>{const l=parseFloat(f);!isNaN(l)&&l>0&&Ne("fontSize",`${l}cqw`)};return e.jsxs("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-sm mx-auto overflow-hidden no-print-bg",children:[e.jsx("style",{children:i.useMemo(()=>`
                .sticker-container {
                    width: 100%;
                    aspect-ratio: ${d==="draw"?"2482 / 3512":"197 / 285"};
                    position: relative;
                    background-color: white;
                    background-image: url('${x}');
                    background-position: center;
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    overflow: hidden;
                    container-type: inline-size;
                    font-family: 'Arial', sans-serif;
                }

                @media screen {
                    .sticker-container.draw-page {
                        display: none;
                    }
                    .sticker-container.draw-page.active-preview-page {
                        display: block;
                    }
                }
                @media print {
                    .sticker-container.draw-page {
                        display: block !important;
                    }
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
                    font-size: ${D}cqw;
                    font-weight: 900;
                    top: 4.3%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${x==="/frame/X24.png"?"none":"flex"};
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .extra1 {
                    font-size: ${L}cqw;
                    font-weight: 900 !important;
                    top: 30.9%;
                    height: 25.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra1 .discount-amount {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                }
                
                .sticker-container .extra1 .discount-label,
                .sticker-container .extra1 .discount-unit {
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }
                
                .sticker-container .extra1 .discount-label {
                    font-size: calc(1em / 1.5);
                    position: relative;
                    top: -0.18em;
                }
                
                .sticker-container .extra1 .discount-unit.unit-k {
                    font-size: calc(1em / 1.5);
                }
                
                .sticker-container .extra1 .discount-unit.unit-trieu {
                    font-size: calc(1em / 3);
                }
                
                .sticker-container .extra1 .discount-num {
                    font-size: 1em;
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .name {
                    font-size: ${A}cqw;
                    font-weight: bold !important;
                    top: 60.8%;
                    height: 4.6%;
                    font-family: 'Alata Regular', sans-serif !important;
                }

                .sticker-container .old {
                    font-size: ${k}cqw;
                    font-weight: bold !important;
                    top: 66.6%;
                    height: 9.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra2 {
                    font-size: ${Q}cqw;
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
                    font-size: ${ne}cqw;
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
                    font-size: ${D}cqw;
                    font-weight: 400;
                    top: 43.5%;
                    height: 8%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sticker-container[data-type="gio_vang"] .sub-header {
                    font-size: ${Y}cqw;
                    font-weight: 400;
                    top: 51.5%;
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
                    font-size: ${A}cqw;
                    font-weight: bold !important;
                    top: 65.8%;
                    height: 4.5%;
                    color: black;
                    font-family: 'Alata Regular', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .old {
                    font-size: ${k}cqw;
                    font-weight: 400 !important;
                    top: 73%;
                    height: 9%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-decoration: line-through;
                    text-decoration-thickness: 3px;
                }
                .sticker-container[data-type="gio_vang"] .extra2 {
                    font-size: ${Q}cqw;
                    font-weight: 400 !important;
                    top: 77%;
                    height: 20%;
                    right: 0;
                    left: 0;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    letter-spacing: -0.06em;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    line-height: 1 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 span {
                    font-family: 'UTM Colossalis', sans-serif !important;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2::after {
                    content: ".000";
                    font-size: 40%;
                    letter-spacing: normal;
                    font-weight: 400 !important;
                    align-self: flex-end;
                    margin-bottom: 0.08em;
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
                 .sticker-container .active-field {
                     outline: 1.5px dashed #6366f1;
                     outline-offset: 1px;
                 }

                 /* Draw Ticket Styles */
                 .draw-ticket-block {
                     position: absolute;
                     width: 100%;
                     height: 25%;
                     left: 0;
                 }
                 .draw-ticket-block > div {
                     overflow: hidden;
                 }
                 .draw-ticket-block[data-index="0"] { top: 0%; }
                 .draw-ticket-block[data-index="1"] { top: 25%; }
                 .draw-ticket-block[data-index="2"] { top: 50%; }
                 .draw-ticket-block[data-index="3"] { top: 75%; }

                 .draw-ticket-block .input-title-left {
                      position: absolute;
                      left: 2.2%;
                      top: 2.0%;
                      width: 45.4%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                      white-space: normal;
                      line-height: 1.2;
                  }
 
                  .draw-ticket-block .display-title-right {
                      position: absolute;
                      left: 52.4%;
                      top: 2.0%;
                      width: 45.4%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      text-align: center;
                      pointer-events: none;
                      user-select: none;
                      white-space: normal;
                      line-height: 1.2;
                  }
 
                  .draw-ticket-block .input-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-bottom-left {
                      position: absolute;
                      left: 2.2%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-bottom-right {
                      position: absolute;
                      left: 52.4%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-code-left {
                      position: absolute;
                      left: 39.4%;
                      top: 33.0%;
                      width: 6.2%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #000000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }

                   .draw-ticket-block .display-code-left {
                       position: absolute;
                       left: 39.4%;
                       top: 33.0%;
                       width: 6.2%;
                       height: 11%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.8cqw;
                       color: #000000;
                       text-align: center;
                       pointer-events: none;
                       user-select: none;
                   }
 
                  .draw-ticket-block .display-code-right {
                      position: absolute;
                      left: 89.6%;
                      top: 33.0%;
                      width: 6.2%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #000000;
                      text-align: center;
                      pointer-events: none;
                      user-select: none;
                  }
 
                  .draw-ticket-block .input-footer-left {
                      position: absolute;
                      left: 19.3%;
                      top: 85.8%;
                      width: 28%;
                      height: 10%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ffffff;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }

                  .draw-ticket-block .display-title-left {
                      position: absolute;
                      left: 2.2%;
                      top: 2.0%;
                      width: 45.4%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      text-align: center;
                      white-space: normal;
                      line-height: 1.2;
                  }

                  .draw-ticket-block .display-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-bottom-left {
                      position: absolute;
                      left: 2.2%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-bottom-right {
                      position: absolute;
                      left: 52.4%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-footer-left {
                      position: absolute;
                      left: 19.3%;
                      top: 85.8%;
                      width: 28%;
                      height: 10%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ffffff;
                      text-align: center;
                  }

                  .draw-ticket-block [class^="display-"],
                  .draw-ticket-block [class*=" display-"] {
                      pointer-events: none;
                      user-select: none;
                  }

                 .draw-ticket-block [contenteditable="true"]:hover,
                 .draw-ticket-block [contenteditable="true"]:focus {
                     outline: 1.5px dashed #ef4444 !important;
                     outline-offset: 1px;
                 }

                 .draw-ticket-block [contenteditable="true"]:empty::before {
                     content: attr(data-placeholder);
                     color: #94a3b8;
                     font-style: italic;
                     font-weight: normal;
                 }

                 @media print {
                     .draw-ticket-block [contenteditable="true"] {
                         outline: none !important;
                     }
                     .draw-ticket-block [contenteditable="true"]:empty::before {
                         content: "" !important;
                     }
                 }
                 `,[d,x,D,L,A,k,Q,ne,Y])}),e.jsxs("div",{id:"print-section",className:"w-full",children:[d==="draw"?(()=>{const f=[];for(let l=0;l<m.length;l+=4)f.push(m.slice(l,l+4));return f.map((l,g)=>e.jsx("div",{className:`sticker-container draw-page ${g===ee?"active-preview-page":""}`,"data-type":"draw",style:{backgroundImage:`url(${x})`,pageBreakAfter:g<f.length-1?"always":"auto",marginBottom:g<f.length-1?"20px":"0"},children:l.map((h,v)=>{const w=g*4+v;return e.jsx(rr,{index:v,ticket:h,firstTicket:m[0],isAutoIncrement:ke,drawContentTopLeftSize:_,drawContentTopRightSize:re,drawContentBottomLeftSize:$e,drawContentBottomRightSize:xe,drawTitleSize:ht,drawCodeSize:De,drawFooterSize:Ce,activeField:K,setActiveField:G,totalIndex:w,onChange:qe(w)},h.id||w)})},g))})():r.length>0?e.jsxs(e.Fragment,{children:[r.filter(f=>f.selected).slice(0,20).map((f,l,g)=>e.jsxs("div",{className:"sticker-container","data-type":d,style:{pageBreakAfter:l<g.length-1?"always":"auto",backgroundImage:`url(${x})`},children:[c&&f.imei&&e.jsx("div",{className:"barcode",children:e.jsx(sn,{value:f.imei})}),e.jsx("div",{className:`header-text ${K==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("header"),onBlur:h=>ze(h.currentTarget.innerText),children:o}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${K==="subHeader"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("subHeader"),onBlur:h=>le(h.currentTarget.innerText),children:u}),e.jsx("div",{className:`extra1 ${K==="percent"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("percent"),onBlur:h=>Z==null?void 0:Z(f.id,{percent:h.currentTarget.innerText}),children:a==="amount"&&on(f.oldPrice,f.newPrice)||f.percent},a),e.jsx("div",{className:`old ${K==="oldPrice"?"active-field":""}`,onInput:Qe,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("oldPrice"),onBlur:h=>{const v=h.currentTarget.innerText,w=Bt(v,f.newPrice)||"";Z==null||Z(f.id,{oldPrice:v,percent:w})},children:f.oldPrice}),e.jsx("div",{className:`name ${K==="name"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("name"),onBlur:h=>Z==null?void 0:Z(f.id,{name:h.currentTarget.innerText}),children:f.name}),e.jsx("div",{className:`extra2 ${K==="newPrice"?"active-field":""}`,onInput:Qe,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("newPrice"),onBlur:h=>{const v=h.currentTarget.innerText,w=Bt(f.oldPrice,v)||"";Z==null||Z(f.id,{newPrice:v,percent:w})},children:f.newPrice}),e.jsx("div",{className:`footer-text ${K==="footer"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("footer"),onBlur:h=>we(h.currentTarget.innerText),children:S})]},f.id)),r.filter(f=>f.selected).length>20&&e.jsxs("div",{className:"w-full py-4 text-center text-sm font-medium text-slate-500 bg-white/50 rounded-lg border border-slate-200 mt-4 shadow-sm",children:[e.jsx("span",{className:"text-indigo-600 font-bold",children:"Chế độ xem trước:"})," Đang hiển thị 20 sticker đầu tiên (trong tổng số ",r.filter(f=>f.selected).length," sticker).",e.jsx("br",{}),e.jsx("i",{children:"Tất cả sticker sẽ được in đầy đủ khi bấm nút IN."})]})]}):e.jsxs("div",{className:"sticker-container","data-type":d,style:{backgroundImage:`url(${x})`},children:[c&&I&&e.jsx("div",{className:"barcode",children:e.jsx(sn,{value:I})}),e.jsx("div",{className:`header-text ${K==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},ref:rt.ref,onInput:rt.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("header")}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${K==="subHeader"?"active-field":""}`,ref:We.ref,onInput:We.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("subHeader")}),e.jsx("div",{className:`extra1 ${K==="percent"?"active-field":""}`,ref:Ie,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("percent"),children:a==="amount"?on(ie,se):Bt(ie,se)},a),e.jsx("div",{className:`old ${K==="oldPrice"?"active-field":""}`,ref:j.ref,onInput:Oe,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("oldPrice")}),e.jsx("div",{className:`name ${K==="name"?"active-field":""}`,ref:Ve.ref,onInput:Ve.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("name")}),e.jsx("div",{className:`extra2 ${K==="newPrice"?"active-field":""}`,ref:nt.ref,onInput:kt,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("newPrice")}),e.jsx("div",{className:`footer-text ${K==="footer"?"active-field":""}`,ref:vt.ref,onInput:vt.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>G("footer")})]}),(()=>{const f=pe?pe.top-window.scrollY<180:!1;return pe&&e.jsxs("div",{className:"fixed z-[9999] -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden",style:{top:`${pe.top}px`,left:`${pe.left}px`},onMouseDown:l=>{l.preventDefault()},children:[e.jsxs("div",{className:"relative",children:[e.jsxs("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>me(Ye==="font"?null:"font"),className:"bg-transparent text-white text-[11px] font-semibold px-2 py-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border-r border-slate-700/80 mr-0.5",children:["Font ",e.jsx("span",{className:"text-[7px] opacity-75",children:"▼"})]}),Ye==="font"&&e.jsx("div",{onMouseDown:l=>l.preventDefault(),className:`absolute left-0 mb-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 flex flex-col min-w-[150px] max-h-[200px] overflow-y-auto z-[10000] scrollbar-thin overflow-x-hidden ${f?"top-full mt-2":"bottom-full mb-2"}`,children:[{name:"UTM Avo",val:"'UTM Avo', sans-serif"},{name:"Plus Jakarta Sans",val:"'Plus Jakarta Sans', sans-serif"},{name:"Inter",val:"'Inter', sans-serif"},{name:"Oswald",val:"'Oswald', sans-serif"},{name:"Roboto Condensed",val:"'Roboto Condensed', sans-serif"},{name:"Fjalla One",val:"'Fjalla One', sans-serif"},{name:"Jost",val:"'Jost', sans-serif"},{name:"Josefin Sans",val:"'Josefin Sans', sans-serif"},{name:"Alata Regular",val:"'Alata Regular', sans-serif"},{name:"Shopee Text",val:"'Shopee Text', sans-serif"},{name:"SF Pro Display",val:"'SF Pro Display', sans-serif"},{name:"Samsung Sharp Sans",val:"'Samsung Sharp Sans', sans-serif"},{name:"Shopee Display",val:"'Shopee Display', sans-serif"},{name:"UTM Colossalis",val:"'UTM Colossalis', sans-serif"}].map(l=>e.jsx("button",{onMouseDown:g=>g.preventDefault(),onClick:()=>{Ne("fontFamily",l.val),me(null)},className:"px-3 py-1.5 text-left text-[11px] text-slate-200 hover:text-white hover:bg-slate-800 transition-colors w-full whitespace-nowrap",style:{fontFamily:l.val},children:l.name},l.val))})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print",children:[e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>gt(-.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Giảm size chữ",children:"-"}),e.jsx("input",{type:"text",onMouseDown:l=>l.stopPropagation(),onClick:l=>l.stopPropagation(),value:st().toFixed(1),onChange:l=>Et(l.target.value),className:"w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500",title:"Kích thước cqw"}),e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>gt(.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Tăng size chữ",children:"+"})]}),e.jsx("button",{onClick:()=>Ge("bold"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In đậm (Bold)",children:e.jsx(Bn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ge("italic"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In nghiêng (Italic)",children:e.jsx(Gn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ge("underline"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"Gạch chân (Underline)",children:e.jsx(On,{size:13,className:"stroke-[2.5]"})}),e.jsx("div",{className:"absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95"})]})})()]}),d==="draw"&&ae>1&&e.jsxs("div",{className:"flex flex-wrap items-center justify-center gap-1.5 mt-4 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 no-print",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-500 mr-1.5 uppercase",children:"Trang xem trước:"}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:()=>ve(f=>Math.max(0,f-1)),disabled:ee===0,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:"<"}),Array.from({length:ae}).map((f,l)=>ae>5&&l!==0&&l!==ae-1&&Math.abs(l-ee)>1?l===1&&ee>2?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):l===ae-2&&ee<ae-3?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):null:e.jsx("button",{onClick:()=>ve(l),className:`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${ee===l?"bg-rose-600 text-white shadow-sm font-black":"bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"}`,children:l+1},l)),e.jsx("button",{onClick:()=>ve(f=>Math.min(ae-1,f+1)),disabled:ee===ae-1,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:">"})]})]})]})},or=r=>{if(!r)return"";let d=r.replace(/^[\(\[]\d+[\)\]]\s*/,"");return d=d.replace(/\s*[\(\[]\d+[\)\]]$/,""),d.trim()},ar=(r,d)=>{let c=r.newPrice,a=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.servicePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const S=Math.round((u/o-1)*100);a=S<0?`${S}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.salePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const S=Math.round((u/o-1)*100);a=S<0?`${S}%`:""}}return{newPrice:c,percent:a}},ir=({manualPages:r,savedLists:d,showSavedLists:c,setShowSavedLists:a,saveCurrentList:o,clearManualPages:u,loadPageToEditor:S,removeManualPage:I,loadSavedList:x,deleteSavedList:D,togglePageSelection:Y,toggleAllPagesSelection:L,discountThreshold:k,handleDiscountThresholdChange:A,activeQueuePageId:Q,setActiveQueuePageId:ne,discountDisplayMode:J,setDiscountDisplayMode:ie,showBarcode:se,setShowBarcode:K,priceSource:G,setPriceSource:ze})=>{const[le,we]=i.useState(""),[ce,Ee]=i.useState(()=>typeof window>"u"?!1:localStorage.getItem("hasSeenStickerDiscountTooltip")!=="true"),de=()=>{localStorage.setItem("hasSeenStickerDiscountTooltip","true"),Ee(!1)},ge=r.filter(m=>{const V=le.toLowerCase().trim();if(!V)return!0;const _=m.label.toLowerCase().includes(V),re=m.code?m.code.toLowerCase().includes(V):!1;return _||re}),Z=r.length>0&&r.every(m=>m.selected!==!1);return e.jsxs("div",{className:"w-full h-full flex flex-col no-print space-y-3 overflow-hidden",children:[ce&&e.jsx("style",{children:`
                    @keyframes toggle-pulse {
                        0%, 100% {
                            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
                            border-color: rgba(99, 102, 241, 1);
                        }
                        50% {
                            box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
                            border-color: rgba(99, 102, 241, 0.4);
                        }
                    }
                    .discount-toggle-glow {
                        animation: toggle-pulse 1.8s infinite ease-in-out;
                        border: 1.5px solid #6366f1 !important;
                        box-sizing: border-box;
                    }
                `}),r.length===0&&e.jsxs("div",{className:"flex items-center justify-between shrink-0 py-1 bg-slate-50 dark:bg-slate-900/20 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40",children:[e.jsx("span",{className:"text-[11px] font-bold text-slate-500 dark:text-slate-400",children:"Cấu hình in nhãn:"}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsxs("div",{className:"relative flex items-center",children:[e.jsx(Xe,{onClick:()=>{ie(J==="percent"?"amount":"percent"),ce&&de()},size:"icon",variant:"secondary",className:`h-8 w-8 transition-all ${ce?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":J==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:J==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:J==="percent"?e.jsx(en,{size:14}):e.jsx(tn,{size:14})}),ce&&e.jsxs("div",{className:"absolute right-0 top-9 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx("button",{onClick:de,className:"text-indigo-200 hover:text-white p-0.5",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx("button",{onClick:de,className:"self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx(Xe,{onClick:()=>K(!se),size:"icon",variant:"secondary",className:`h-8 w-8 transition-colors ${se?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:se?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:14})})]})]}),r.length>0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2",children:[e.jsx("input",{type:"checkbox",checked:Z,onChange:m=>L(m.target.checked),className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0",title:"Chọn tất cả / Bỏ chọn tất cả"}),e.jsxs("span",{className:"text-xs font-bold text-slate-700 dark:text-slate-300",children:["Số lượng: ",r.length]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 shrink-0",children:[e.jsx(Ot,{type:"text",placeholder:"% Giảm",value:k,onChange:m=>A(m.target.value),className:"!w-12 !h-7 text-center px-1 text-[10px] rounded-lg font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white",title:"Nhập % giảm tối thiểu",fullWidth:!1}),e.jsxs("div",{className:"relative flex items-center",children:[e.jsx(Xe,{onClick:()=>{ie(J==="percent"?"amount":"percent"),ce&&de()},size:"icon",variant:"secondary",className:`h-7 w-7 transition-all ${ce?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":J==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:J==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:J==="percent"?e.jsx(en,{size:13}):e.jsx(tn,{size:13})}),ce&&e.jsxs("div",{className:"absolute right-0 top-8 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx("button",{onClick:de,className:"text-indigo-200 hover:text-white p-0.5",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx("button",{onClick:de,className:"self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx(Xe,{onClick:()=>K(!se),size:"icon",variant:"secondary",className:`h-7 w-7 transition-colors ${se?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:se?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:13})}),e.jsx("div",{className:"h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"}),e.jsx(Xe,{onClick:o,size:"icon",variant:"secondary",className:"h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Lưu danh sách",children:e.jsx(An,{size:13})}),e.jsx(Xe,{onClick:u,size:"icon",variant:"secondary",className:"h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Xóa tất cả",children:e.jsx(At,{size:13})})]})]}),r.some(m=>m.servicePrice||m.salePrice)&&e.jsxs("div",{className:"flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full shrink-0 mb-1",children:[e.jsx("button",{onClick:()=>ze("sale"),className:`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${G==="sale"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá giảm"}),e.jsx("button",{onClick:()=>ze("service"),className:`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${G==="service"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá Dịch vụ"})]}),e.jsx("div",{className:"relative shrink-0 mb-1",children:e.jsx(Ot,{type:"text",placeholder:"Tìm theo tên hoặc mã sản phẩm...",value:le,onChange:m=>we(m.target.value),className:"h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 text-slate-750 dark:text-slate-350",fullWidth:!0,rightIcon:le?"x":void 0,onRightIconClick:le?()=>we(""):void 0})}),e.jsxs("div",{className:"space-y-2 flex-1 overflow-y-auto pr-1",children:[ge.map((m,V)=>e.jsxs("div",{tabIndex:0,"data-queue-index":V,className:`flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group outline-none ${m.id===Q?"border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20":"border-slate-100 dark:border-slate-700"} ${m.selected===!1?"opacity-50":""}`,onClick:()=>{ne(m.id),S(m)},onKeyDown:_=>{if(_.key==="ArrowDown"){_.preventDefault();const re=V+1;if(re<ge.length){const $e=ge[re];ne($e.id),S($e),setTimeout(()=>{const xe=document.querySelector(`[data-queue-index="${re}"]`);xe==null||xe.focus()},10)}}else if(_.key==="ArrowUp"){_.preventDefault();const re=V-1;if(re>=0){const $e=ge[re];ne($e.id),S($e),setTimeout(()=>{const xe=document.querySelector(`[data-queue-index="${re}"]`);xe==null||xe.focus()},10)}}},title:"Click hoặc dùng mũi tên Lên/Xuống để chỉnh sửa",children:[e.jsxs("div",{className:"flex items-center gap-2.5 min-w-0 flex-1",children:[e.jsx("input",{type:"checkbox",checked:m.selected!==!1,onChange:_=>{_.stopPropagation(),Y(m.id)},className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"}),e.jsx("span",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0",children:V+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs text-slate-700 dark:text-slate-300 truncate font-medium",children:or(m.label)}),e.jsx("div",{className:"flex gap-2 mt-0.5 text-[10px]",children:(()=>{const{newPrice:_,percent:re}=ar(m,G);return e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-red-600 font-bold",children:_}),m.oldPrice&&e.jsx("span",{className:"line-through text-slate-400",children:m.oldPrice}),re&&e.jsx("span",{className:"text-green-600 font-bold",children:re})]})})()})]})]}),e.jsx("button",{onClick:_=>{_.stopPropagation(),I(m.id)},className:"text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100",children:e.jsx(Ut,{size:14})})]},m.id)),ge.length===0&&e.jsx("p",{className:"text-xs text-slate-400 dark:text-slate-500 text-center py-4",children:"Không tìm thấy sticker nào phù hợp"})]})]}),d.length>0&&r.length===0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("button",{onClick:()=>a(!c),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(Vn,{size:16,className:"text-emerald-500"}),"Danh sách đã lưu (",d.length,")"]}),c?e.jsx(Wn,{size:16}):e.jsx(Kn,{size:16})]}),c&&e.jsx("div",{className:"mt-3 space-y-2 flex-1 overflow-y-auto pr-1",children:d.map(m=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:m.name}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(m.timestamp).toLocaleDateString("vi-VN")}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[m.pages.length," trang"]})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>x(m),className:"p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold",title:"Tải danh sách",children:e.jsx(ln,{size:13})}),e.jsx("button",{onClick:()=>D(m.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},m.id))})]}),r.length===0&&d.length===0&&e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"D.Sách in trống"})]})},lr=({manualPages:r,batchItems:d,showBarcode:c,setShowBarcode:a,discountDisplayMode:o,setDiscountDisplayMode:u,searchTerm:S,setSearchTerm:I,printHistory:x,showHistory:D,setShowHistory:Y,handlePrint:L,addCurrentPage:k,handleExcelUpload:A,handleTemplateUpload:Q,downloadTemplate:ne,handleReset:J,toggleAllSelection:ie,toggleItemSelection:se,clearBatchItems:K,restoreHistory:G,deleteHistory:ze,savedLists:le,showSavedLists:we,setShowSavedLists:ce,saveCurrentList:Ee,clearManualPages:de,loadPageToEditor:ge,removeManualPage:Z,loadSavedList:m,deleteSavedList:V,togglePageSelection:_,toggleAllPagesSelection:re,discountThreshold:$e,handleDiscountThresholdChange:xe,activeQueuePageId:ht,setActiveQueuePageId:De,activeSubTab:Ce,setActiveSubTab:ke,priceSource:ee,setPriceSource:ve,handleErpPriceUpload:ae,stickerType:Ie,drawStartNumber:Be,setDrawStartNumber:qe,drawTotalTickets:pe,setDrawTotalTickets:ye,drawAutoIncrement:Ye,setDrawAutoIncrement:me})=>{const be=d.filter(j=>j.selected).length,Ne=r.filter(j=>j.selected!==!1).length,Ge=d.filter(j=>j.name.toLowerCase().includes(S.toLowerCase()));return e.jsxs("div",{className:"w-full max-w-sm aspect-[197/285] bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 p-5 lg:p-6 no-print flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex gap-2 mb-3 shrink-0",children:[e.jsxs(Xe,{onClick:L,className:"flex-1 !bg-[#fbbc04] hover:!bg-[#f0b400] !text-black font-black text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-yellow-500/10 border-transparent",leftIcon:e.jsx(Xn,{size:16}),children:["BẤM ĐỂ IN (",d.length>0?be+Ne:r.length>0?Ne:1,")"]}),e.jsx(Xe,{onClick:k,className:"bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md shadow-indigo-500/10 border-transparent",title:"Thêm trang hiện tại vào hàng đợi in",leftIcon:e.jsx(Yn,{size:16}),children:"Thêm"})]}),e.jsxs("div",{className:"flex border-b border-slate-100 dark:border-slate-700 mb-4 shrink-0",children:[e.jsx("button",{onClick:()=>ke("data"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${Ce==="data"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Dữ liệu"}),e.jsxs("button",{onClick:()=>ke("queue"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${Ce==="queue"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["D.Sách (",r.length,")"]}),e.jsxs("button",{onClick:()=>ke("history"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${Ce==="history"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["Lịch sử (",x.length,")"]})]}),e.jsxs("div",{className:`flex-1 pr-1 -mr-1 scrollbar-thin ${Ce==="queue"?"flex flex-col overflow-hidden":"overflow-y-auto space-y-2"}`,children:[Ce==="data"&&e.jsxs("div",{className:"space-y-2.5 animate-in fade-in duration-200 pb-2",children:[Ie==="draw"?e.jsxs("div",{className:"p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 space-y-4",children:[e.jsxs("p",{className:"text-[11px] lg:text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-200/40 pb-2",children:[e.jsx(rn,{size:14,className:"stroke-[2.5]"}),"Cấu hình in Phiếu Rút Thăm"]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số bắt đầu"}),e.jsx("input",{type:"number",min:"1",value:Be,onChange:j=>qe(Math.max(1,parseInt(j.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số lượng cần in"}),e.jsx("input",{type:"number",min:"1",value:pe,onChange:j=>ye(Math.max(1,parseInt(j.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]})]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer select-none py-1",children:[e.jsx("input",{type:"checkbox",checked:Ye,onChange:j=>me(j.target.checked),className:"w-4 h-4 rounded text-rose-600 border-slate-300 dark:border-slate-700 focus:ring-rose-500 bg-white dark:bg-slate-900"}),e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300",children:"Tự động nhảy số liên tục"})]}),e.jsxs("div",{className:"bg-white/80 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:[e.jsx("span",{className:"font-bold text-indigo-600 dark:text-indigo-400",children:"Gợi ý in:"})," ",pe," phiếu rút thăm sẽ được in trên ",e.jsxs("span",{className:"font-bold text-slate-800 dark:text-white",children:[Math.ceil(pe/4)," trang A4"]})," (mỗi trang 4 phiếu). Các số thứ tự sẽ tự động điền từ ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Be})," đến ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Be+pe-1}),"."]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-[11px] lg:text-xs",children:[e.jsx(Ct,{size:14}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:A,className:"hidden"})]}),e.jsx(Xe,{onClick:J,variant:"secondary",className:"px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-[11px] lg:text-xs h-auto py-1.5 border-slate-200 dark:border-slate-600",children:"Reset"})]}),e.jsxs("div",{className:"p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1",children:[e.jsx(Qn,{size:12}),"Nhập từ File Mẫu"]}),e.jsxs("div",{className:"flex gap-1.5",children:[e.jsxs("button",{onClick:ne,className:"flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Jn,{size:10}),"Tải File Mẫu"]}),e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Ct,{size:10}),"Nhập File Mẫu",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:Q,className:"hidden"})]})]})]}),e.jsxs("div",{className:"p-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1",children:[e.jsx(cn,{size:12}),"Nhập file in giá từ ERP"]}),e.jsxs("div",{className:"grid grid-cols-1 gap-2",children:[e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Ct,{size:10}),"Máy Lọc Nước (Mẫu in 99)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:j=>ae(j,"purifier"),className:"hidden"})]}),e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Ct,{size:10}),"Điện Tử/Lạnh (Mẫu in 97)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:j=>ae(j,"appliance"),className:"hidden"})]})]})]}),d.length>0&&e.jsxs("div",{className:"mt-4 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-xs text-slate-800 dark:text-white",children:["Danh sách in (",be,"/",d.length,")"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>ie(!0),className:"text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>ie(!1),className:"text-[10px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:K,className:"text-[10px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx(Ot,{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:S,onChange:j=>I(j.target.value),className:"mb-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"}),e.jsx("div",{className:"space-y-2",children:Ge.map(j=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${j.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:j.selected,onChange:()=>se(j.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:j.name,children:j.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:j.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:j.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:j.percent})]})]})]},j.id))})]})]}),e.jsxs("div",{className:"mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-2.5",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(rn,{size:13,className:"text-indigo-500"}),e.jsx("span",{className:"text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider",children:"H.Dẫn in & Sử dụng"})]}),e.jsxs("div",{className:"p-3 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-500 dark:text-slate-400",children:"CẤU HÌNH IN CHROME (CTRL + P):"}),e.jsxs("ul",{className:"space-y-1 text-[11px] text-slate-600 dark:text-slate-300",children:[e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Khổ giấy khuyên dùng: ",e.jsx("strong",{children:"A4"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Chọn: ",e.jsx("strong",{children:"Hiển thị đồ họa nền (Background graphics)"})]})]})]})]}),e.jsx("div",{className:"border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300",children:Ie==="draw"?e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Nhập nội dung ở phiếu số 1 (trang 1). Các phiếu còn lại tự động đồng bộ theo."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Nhảy số:"}),' Bật chế độ "Tự động nhảy số" để hệ thống tự động tăng dần từ số bắt đầu.']})]}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Click trực tiếp vào chữ trên sticker ở khung preview."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Tính % tự động:"})," Chỉ cần nhập Giá cũ & Giá mới."]})]})})]})]})]}),Ce==="queue"&&e.jsx("div",{className:"flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 pb-2",children:e.jsx(ir,{manualPages:r,savedLists:le,showSavedLists:we,setShowSavedLists:ce,saveCurrentList:Ee,clearManualPages:de,loadPageToEditor:ge,removeManualPage:Z,loadSavedList:m,deleteSavedList:V,togglePageSelection:_,toggleAllPagesSelection:re,discountThreshold:$e,handleDiscountThresholdChange:xe,activeQueuePageId:ht,setActiveQueuePageId:De,discountDisplayMode:o,setDiscountDisplayMode:u,showBarcode:c,setShowBarcode:a,priceSource:ee,setPriceSource:ve})}),Ce==="history"&&e.jsx("div",{className:"space-y-2 animate-in fade-in duration-200 pb-2",children:x.length===0?e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"Chưa có lịch sử in"}):x.map(j=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group text-left",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:j.label}),e.jsxs("div",{className:"flex gap-1.5 mt-1 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(j.timestamp).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[j.pageCount," trang"]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:j.stickerType==="gia_soc"?"Giá Sốc":"Giờ Vàng"})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>G(j),className:"p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors",title:"Khôi phục",children:e.jsx(ln,{size:13})}),e.jsx("button",{onClick:()=>ze(j.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},j.id))})]})]})},cr=({isOpen:r,onClose:d,onSave:c,defaultName:a})=>{const[o,u]=i.useState(a);if(!r)return null;const S=I=>{I.preventDefault(),o.trim()&&c(o.trim())};return e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4",children:e.jsx("div",{className:"bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden",children:e.jsxs("div",{className:"p-6",children:[e.jsx("h2",{className:"text-xl font-bold text-slate-800 mb-4",children:"Lưu Danh Sách"}),e.jsxs("form",{onSubmit:S,children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{htmlFor:"listName",className:"block text-sm font-medium text-slate-700 mb-1",children:"Tên danh sách"}),e.jsx("input",{type:"text",id:"listName",value:o,onChange:I=>u(I.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500",placeholder:"Nhập tên danh sách...",autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"flex justify-end gap-3 mt-6",children:[e.jsx("button",{type:"button",onClick:d,className:"px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors",children:"Hủy"}),e.jsx("button",{type:"submit",className:"px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors",children:"Lưu"})]})]})]})})})},dr=i.lazy(()=>ft(()=>import("./StickerEventApp-DWn__yfB.js"),__vite__mapDeps([0,1,2,3,4,5,6]))),an="stickerPrinterState",Pt="stickerPrintHistory",ut="stickerSavedLists",ur=r=>{if(!r)return"";let d=r;d=d.replace(/Máy lọc nước/gi,"MLN");const c=["RO nóng lạnh tủ đứng","\\(IMEI\\)","nước nóng lạnh","RO âm tủ","RO tủ đứng","điện giải nóng nguội","nóng lạnh RO","RO nóng nguội lạnh tủ đứng"];for(const a of c){const o=new RegExp(a,"gi");d=d.replace(o,"")}return d=d.replace(/\s+/g," ").trim(),d},Vt=(r,d)=>{let c=r.newPrice,a=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.servicePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const S=Math.round((u/o-1)*100);a=S<0?`${S}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.salePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const S=Math.round((u/o-1)*100);a=S<0?`${S}%`:""}}return{newPrice:c,percent:a}},Gt=(r,d,c,a,o="percent")=>{if(c==="draw")return`<div class="sticker-container" data-type="${c}" style="background-image:url('${a}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:2482/3512;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;"></div>`;let{newPrice:u,percent:S}=Vt(r,d),I=r.header,x=r.subHeader,D=r.footer;if(r.html&&(!I||!x||!D))try{const Q=new DOMParser().parseFromString(r.html,"text/html"),ne=Q.querySelector(".header-text"),J=Q.querySelector(".sub-header"),ie=Q.querySelector(".footer-text");I===void 0&&ne&&(I=ne.textContent||""),x===void 0&&J&&(x=J.textContent||""),D===void 0&&ie&&(D=ie.textContent||"")}catch(A){console.error("Error parsing fallback fields from page.html:",A)}let Y="";if(r.code)try{Y=`<div class="barcode"><img src="${Wt(r.code)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${r.code}" /></div>`}catch(A){console.error("Barcode error:",A)}const L=c==="gio_vang"?`<div class="sub-header">${x||""}</div>`:"",k=`<div class="extra2">${u}</div>`;if(o==="amount"){const A=Number(String(r.oldPrice).replace(/\D/g,""));let Q=Number(String(u).replace(/\D/g,""));if(A>0&&Q>0){Q*1e3<=A*1.5&&Q<A&&(Q=Q*1e3);const ne=A-Q;ne>0&&(S=`-${(ne/1e3).toLocaleString("vi-VN")}K`)}}return`<div class="sticker-container" data-type="${c}" style="background-image:url('${a}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
        ${Y}
        <div class="header-text">${I||""}</div>
        ${L}
        <div class="extra1">${S}</div>
        <div class="old">${r.oldPrice}</div>
        <div class="name">${r.label}</div>
        ${k}
        <div class="footer-text">${D||""}</div>
    </div>`},fr=(r,d)=>{if(r.stickerType!==d.stickerType||r.headerTextContent!==d.headerTextContent||r.subHeaderTextContent!==d.subHeaderTextContent||r.footerTextContent!==d.footerTextContent||r.showBarcode!==d.showBarcode||r.discountDisplayMode!==d.discountDisplayMode||r.pageCount!==d.pageCount||r.batchItems.length!==d.batchItems.length)return!1;for(let c=0;c<r.batchItems.length;c++){const a=r.batchItems[c],o=d.batchItems[c];if(a.name!==o.name||a.oldPrice!==o.oldPrice||a.newPrice!==o.newPrice||a.percent!==o.percent||a.imei!==o.imei||a.selected!==o.selected)return!1}if(r.manualPages.length!==d.manualPages.length)return!1;for(let c=0;c<r.manualPages.length;c++){const a=r.manualPages[c],o=d.manualPages[c];if(a.label!==o.label||a.oldPrice!==o.oldPrice||a.newPrice!==o.newPrice||a.percent!==o.percent||a.code!==o.code||a.header!==o.header||a.subHeader!==o.subHeader||a.footer!==o.footer||a.selected!==o.selected)return!1}return!0};function hr(){const{activeTab:r}=qn(),{user:d}=Ln(),[c,a]=i.useState(!1),[o,u]=i.useState("sticker"),[S,I]=i.useState(!1),[x,D]=i.useState("gia_soc"),[Y,L]=i.useState("/frame/X24_NEW.png"),[k,A]=i.useState("sale"),[Q,ne]=i.useState([{id:"1",title:"",code:"1",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"2",title:"",code:"2",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"3",title:"",code:"3",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"4",title:"",code:"4",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""}]),[J,ie]=i.useState(1),[se,K]=i.useState(4),[G,ze]=i.useState(!0);i.useEffect(()=>{x==="draw"&&ne(t=>{var p;const s=t[0]||{id:"1",title:"",code:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},n=[];for(let y=0;y<se;y++){const q=G?(J+y).toString():((p=t[y])==null?void 0:p.code)||"";y===0?n.push({...s,id:"1",code:G?J.toString():s.code||"1"}):n.push({id:(y+1).toString(),title:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:"",code:q})}return n})},[J,se,G,x]);const[le,we]=i.useState(3.5),[ce,Ee]=i.useState(3.5),[de,ge]=i.useState(2.2),[Z,m]=i.useState(2.2),[V,_]=i.useState(3.6),[re,$e]=i.useState(3.8),[xe,ht]=i.useState(3.8),[De,Ce]=i.useState("header"),[ke,ee]=i.useState(8),[ve,ae]=i.useState(13),[Ie,Be]=i.useState(36.9),[qe,pe]=i.useState(14.2),[ye,Ye]=i.useState(3.6),[me,be]=i.useState(26.5),[Ne,Ge]=i.useState(3.2),[j,nt]=i.useState("percent"),[Oe,kt]=i.useState(""),[Ae,Ve]=i.useState(null),[rt,We]=i.useState("data"),vt=()=>{switch(De){case"header":return"Tiêu đề";case"subHeader":return"Tiêu đề phụ";case"percent":return"% Giảm";case"oldPrice":return"Giá cũ";case"name":return"Tên SP";case"newPrice":return"Giá mới";case"footer":return"Khuyến mãi";default:return"Cỡ chữ"}},Qe=t=>{const s=window.getSelection();if(!s||s.rangeCount===0||s.isCollapsed)return!1;const n=s.getRangeAt(0);let p=n.commonAncestorContainer;p.nodeType===3&&(p=p.parentNode||p);let y=p,q=null;for(;y;){if(y.nodeType===1){const N=y;if(N.getAttribute("contenteditable")==="true"){q=N;break}}y=y.parentNode}if(q){const N=document.createElement("span");N.style.fontSize=`${t.toFixed(1)}cqw`;try{N.appendChild(n.extractContents()),n.insertNode(N);const b=new Event("input",{bubbles:!0});return q.dispatchEvent(b),!0}catch(b){console.error("Error applying font size to selection:",b)}}return!1},zt=()=>{switch(De){case"header":return ke;case"subHeader":return ve;case"percent":return Ie;case"oldPrice":return qe;case"name":return ye;case"newPrice":return me;case"footer":return Ne;default:return ke}},st=()=>{switch(De){case"drawTitle":return V;case"drawContentTopLeft":return le;case"drawContentTopRight":return ce;case"drawContentBottomLeft":return de;case"drawContentBottomRight":return Z;case"drawCode":return re;case"drawFooter":return xe;default:return le}},gt=t=>{const s=n=>typeof t=="function"?t(n):t;switch(De){case"drawTitle":_(s);break;case"drawContentTopLeft":we(s);break;case"drawContentTopRight":Ee(s);break;case"drawContentBottomLeft":ge(s);break;case"drawContentBottomRight":m(s);break;case"drawCode":$e(s);break;case"drawFooter":ht(s);break;default:we(s)}},Et=()=>{switch(De){case"drawTitle":return"Cỡ chữ Tiêu đề";case"drawContentTopLeft":return"Cỡ chữ Giải thưởng trái";case"drawContentTopRight":return"Cỡ chữ Giải thưởng phải";case"drawContentBottomLeft":return"Cỡ chữ Thông tin trái";case"drawContentBottomRight":return"Cỡ chữ Thông tin phải";case"drawCode":return"Cỡ chữ Mã số";case"drawFooter":return"Cỡ chữ Siêu thị";default:return"Cỡ chữ Giải thưởng trái"}},f=t=>{const s=n=>{const p=typeof t=="function"?t(n):t;return Number(p.toFixed(1))};switch(De){case"header":ee(s);break;case"subHeader":ae(s);break;case"percent":Be(s);break;case"oldPrice":pe(s);break;case"name":Ye(s);break;case"newPrice":be(s);break;case"footer":Ge(s);break}},[l,g]=i.useState([]),[h,v]=i.useState("QUẠT ĐIỀU HOÀ"),[w,M]=i.useState("0 SUẤT/NGÀY"),[O,F]=i.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[Me,$t]=i.useState(""),[ot,Dt]=i.useState(!1),[yt,Je]=i.useState("123456"),[_e,Te]=i.useState([]),[It,Mt]=i.useState([]),[dn,Kt]=i.useState(!1),[_t,Nt]=i.useState([]),[un,Xt]=i.useState(!1),[at,xt]=i.useState("Quạt điều hoà Daikiosan DMI03"),[Rt,pt]=i.useState("5.490.000"),[Ht,Ze]=i.useState("3.490"),[it,fn]=i.useState(!1),[Yt,hn]=i.useState(!1),[Qt,qt]=i.useState(!1);i.useEffect(()=>{const t=at.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);if(t)Je(t[1]);else{const s=at.match(/\(([A-Za-z0-9]+)\)/);s&&Je(s[1])}},[at]),i.useEffect(()=>{if(!Ae)return;const t=_e.find(s=>s.id===Ae);if(t){const{newPrice:s}=Vt(t,k);Ze(s)}},[k,Ae,_e]),i.useEffect(()=>{const t=()=>hn(window.innerWidth<1024);return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const mt=t=>{try{const s=new URL(window.location.href);s.searchParams.set("sub",t),window.history.replaceState(null,"",s.toString())}catch(s){console.error("Failed to sync sub-tab to URL:",s)}};i.useEffect(()=>{a(!0);let s=new URLSearchParams(window.location.search).get("sub");s||(s="event",mt("event")),s==="gia-soc"?(u("sticker"),D("gia_soc"),v("QUẠT ĐIỀU HOÀ"),L("/frame/X24_NEW.png"),ee(8)):s==="gio-vang"?(u("sticker"),D("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),L("/frame/GVO2-scaled.png"),ee(8)):s==="draw"?(u("sticker"),D("draw"),L("/frame/bg_phieu.png")):s==="event"&&(u("event"),I(!0));const n=setTimeout(()=>{ft(()=>import("./StickerEventApp-DWn__yfB.js"),__vite__mapDeps([0,1,2,3,4,5,6])).catch(p=>{console.warn("Failed to preload StickerEventApp:",p)})},1e3);return()=>clearTimeout(n)},[]),i.useEffect(()=>{let t=!0;async function s(){try{const n=await St(an);if(n&&t){const N=new URLSearchParams(window.location.search).get("sub");if(N?N==="gia-soc"?(u("sticker"),D("gia_soc")):N==="gio-vang"?(u("sticker"),D("gio_vang")):N==="draw"?(u("sticker"),D("draw")):N==="event"&&(u("event"),I(!0)):(n.stickerMode&&u(n.stickerMode),n.stickerType&&D(n.stickerType)),n.bgImage&&L(n.bgImage),n.headerTextContent&&v(n.headerTextContent),n.subHeaderTextContent&&M(n.subHeaderTextContent),n.footerTextContent&&F(n.footerTextContent),n.showBarcode!=null&&Dt(n.showBarcode),n.previewName&&xt(n.previewName),n.previewOldPrice&&pt(n.previewOldPrice),n.previewNewPrice){const R=String(n.previewNewPrice).replace(/\D/g,"");if(R){let C=Number(R);C>=1e5&&(C=Math.floor(C/1e3)),Ze(C.toLocaleString("vi-VN"))}else Ze(n.previewNewPrice)}n.discountDisplayMode&&nt(n.discountDisplayMode),n.barcodeImei&&Je(n.barcodeImei),n.discountThreshold!=null&&kt(n.discountThreshold),n.searchTerm!=null&&$t(n.searchTerm);const b=(n.manualPages||[]).map(R=>{if(R.newPrice){const C=String(R.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{...R,newPrice:P.toLocaleString("vi-VN")}}}return R}),U=(n.batchItems||[]).map(R=>{if(R.newPrice){const C=String(R.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{...R,newPrice:P.toLocaleString("vi-VN")}}}return R});b.length===0&&U.length===0?We("data"):n.activeSubTab&&We(n.activeSubTab==="help"?"data":n.activeSubTab),Te(b),g(U),n.priceSource&&A(n.priceSource),n.headerTextSize!=null&&ee(n.headerTextSize),n.subHeaderTextSize!=null&&ae(n.subHeaderTextSize),n.percentTextSize!=null&&Be(n.percentTextSize),n.oldPriceTextSize!=null&&pe(n.oldPriceTextSize),n.nameTextSize!=null&&Ye(n.nameTextSize),n.newPriceTextSize!=null&&be(n.newPriceTextSize),n.footerTextSize!=null&&Ge(n.footerTextSize)}const p=await St(ut);p&&t&&Nt(p);const y=await St(Pt);y&&t&&Mt(y)}catch(n){console.error("Error loading sticker data:",n)}finally{t&&fn(!0)}}return s(),()=>{t=!1}},[]),i.useEffect(()=>{const t=s=>{var n;((n=s.detail)==null?void 0:n.key)===ut&&St(ut).then(p=>{p&&Nt(p)})};return window.addEventListener("indexeddb-change",t),()=>window.removeEventListener("indexeddb-change",t)},[]),i.useEffect(()=>{if(!it)return;const t=setTimeout(async()=>{const s={stickerMode:o,stickerType:x,bgImage:Y,headerTextContent:h,subHeaderTextContent:w,footerTextContent:O,showBarcode:ot,previewName:at,previewOldPrice:Rt,previewNewPrice:Ht,discountDisplayMode:j,headerTextSize:ke,subHeaderTextSize:ve,percentTextSize:Ie,oldPriceTextSize:qe,nameTextSize:ye,newPriceTextSize:me,footerTextSize:Ne,barcodeImei:yt,discountThreshold:Oe,searchTerm:Me,activeQueuePageId:Ae,activeSubTab:rt,manualPages:_e,batchItems:l,priceSource:k,updatedAt:new Date().toISOString()};try{await et(an,s)}catch(n){console.error("IndexedDB save failed",n)}},500);return()=>clearTimeout(t)},[it,o,x,Y,h,w,O,ot,at,Rt,Ht,ke,ve,Ie,qe,ye,me,Ne,j,yt,Oe,Me,Ae,rt,_e,l,k]),i.useEffect(()=>{if(!it)return;const t=setTimeout(async()=>{try{await et(ut,_t)}catch(s){console.error("IndexedDB save savedLists failed",s)}},500);return()=>clearTimeout(t)},[it,_t]),i.useEffect(()=>{if(!it)return;const t=setTimeout(async()=>{try{await et(Pt,It)}catch(s){console.error("IndexedDB save printHistory failed",s)}},500);return()=>clearTimeout(t)},[it,It]);const lt=t=>{if(!t)return 0;const s=t.replace(/[^0-9]/g,""),n=parseInt(s,10);return isNaN(n)?0:n},gn=t=>{kt(t);const s=t.replace(/[^0-9]/g,""),n=parseInt(s,10);isNaN(n)?(Te(p=>p.map(y=>({...y,selected:!0}))),g(p=>p.map(y=>({...y,selected:!0})))):(Te(p=>p.map(y=>{const q=lt(y.percent);return{...y,selected:q>=n}})),g(p=>p.map(y=>{const q=lt(y.percent);return{...y,selected:q>=n}})))},xn=t=>{var p;const s=(p=t.target.files)==null?void 0:p[0];if(!s)return;const n=new FileReader;n.onload=async y=>{var q;try{const N=(q=y.target)==null?void 0:q.result,b=await ft(()=>import("./vendor-excel-CkFp8p6R.js"),[]),U=b.read(N,{type:"binary"}),R=U.SheetNames[0],C=U.Sheets[R],P=b.utils.sheet_to_json(C,{header:1}),B=[];for(let $=0;$<P.length;$++){const E=P[$];if(!E||E.length<9)continue;const z=E[4]?String(E[4]).trim():"",te=E[5]?String(E[5]).trim():"",H=E[42]?String(E[42]).trim():"";let X="";const ue=H.toUpperCase();ue.includes("IMEI:")?(X=H.substring(ue.indexOf("IMEI:")+5).trim(),X=X.replace(/\)$/,"").trim()):ue.includes("CODE:")?(X=H.substring(ue.indexOf("CODE:")+5).trim(),X=X.replace(/\)$/,"").trim()):H&&/^[A-Za-z0-9]+$/.test(H)&&H.length>3&&(X=H);const je=[z,te].filter(Boolean);H&&je.push(H.startsWith("(")?H:`(${H})`);const T=je.join(" ");if(!T||T==="TÊN SẢN PHẨM")continue;let W="";if(E[8]){const he=String(E[8]).match(/\((-\d+%)\)/);he&&(W=he[1])}let fe="";if(E[7]){const he=String(E[7]).replace(/\D/g,"");he&&(fe=Number(he).toLocaleString("vi-VN"))}let oe="";if(E[6]){const he=String(E[6]).replace(/\D/g,"");he&&(oe=Number(Math.floor(Number(he)/1e3)).toLocaleString("vi-VN"))}const Le=Oe.replace(/[^0-9]/g,""),Re=parseInt(Le,10),Fe=isNaN(Re)?!0:lt(W)>=Re;B.push({id:`item_${$}_${Date.now()}`,name:T,oldPrice:fe,newPrice:oe,percent:W,imei:X,selected:Fe})}if(g(B),We("data"),B.length>0){const $=B[0];xt($.name),pt($.oldPrice),Ze($.newPrice),Je($.imei)}}catch{He.error("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},pn=async()=>{const t=await ft(()=>import("./vendor-excel-CkFp8p6R.js"),[]),s=t.utils.book_new();let n,p,y,q;if(x==="gia_soc")n=["TIÊU ĐỀ","CODE","TÊN SẢN PHẨM","GIÁ GỐC","GIÁ GIẢM","KHUYẾN MÃI"],p=[["QUẠT ĐIỀU HOÀ","ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"],["TỦ LẠNH","DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"]],y="Sticker_Template_Gia_Soc.xlsx",q=[{wch:20},{wch:15},{wch:40},{wch:18},{wch:18},{wch:45}];else{const b=new Date,U=b.getDay(),R=U===0?7:U,C=new Date(b);C.setDate(b.getDate()+(5-R));const P=new Date(b);P.setDate(b.getDate()+(7-R));const B=te=>String(te).padStart(2,"0"),$=`${B(C.getDate())}/${B(C.getMonth()+1)}`,E=`${B(P.getDate())}/${B(P.getMonth()+1)}`,z=`TỪ ${$} ĐẾN ${E}`;n=["CODE","SẢN PHẨM","GIÁ NIÊM YẾT","GIÁ GIẢM","THỜI GIAN ÁP DỤNG","SỐ LƯỢNG SUẤT"],p=[["ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000",z,"5 SUẤT/NGÀY"],["DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000",z,"5 SUẤT/NGÀY"]],y="Sticker_Template_Gio_Vang.xlsx",q=[{wch:15},{wch:40},{wch:18},{wch:18},{wch:22},{wch:18}]}const N=t.utils.aoa_to_sheet([n,...p]);N["!cols"]=q,t.utils.book_append_sheet(s,N,"Template"),t.writeFile(s,y)},Jt=t=>{if(t==null)return 0;const s=String(t).replace(/[^0-9]/g,"");return s?Number(s):0},Lt=t=>{var n,p,y,q,N,b,U;t.label&&xt(t.label),t.oldPrice&&pt(t.oldPrice),t.code&&Je(t.code),t.header!=null&&v(t.header),t.footer!=null&&F(t.footer),t.subHeader!=null&&M(t.subHeader);const{newPrice:s}=Vt(t,k);if(Ze(s),!t.label&&t.html){const R=document.createElement("div");R.innerHTML=t.html;const C=R.querySelector(".sticker-container");if(C){const P=((n=C.querySelector(".header-text"))==null?void 0:n.textContent)||h,B=((p=C.querySelector(".name"))==null?void 0:p.textContent)||"",$=((y=C.querySelector(".old"))==null?void 0:y.textContent)||"",E=((q=C.querySelector(".extra2 span"))==null?void 0:q.textContent)||((N=C.querySelector(".extra2"))==null?void 0:N.textContent)||"",z=((b=C.querySelector(".footer-text"))==null?void 0:b.textContent)||O,te=((U=C.querySelector(".sub-header"))==null?void 0:U.textContent)||w;v(P),M(te),F(z),pt($),Ze(E);const H=C.querySelector(".barcode img"),X=(H==null?void 0:H.getAttribute("alt"))||"";X&&Je(X),xt(B)}}g([])},mn=t=>{var p;const s=(p=t.target.files)==null?void 0:p[0];if(!s)return;const n=new FileReader;n.onload=async y=>{var q;try{const N=(q=y.target)==null?void 0:q.result,b=await ft(()=>import("./vendor-excel-CkFp8p6R.js"),[]),U=b.read(N,{type:"binary"}),R=U.Sheets[U.SheetNames[0]],C=b.utils.sheet_to_json(R,{header:1});if(!C||C.length<2){He.error("File không chứa đủ dữ liệu");return}const P=(C[0]||[]).map(T=>String(T).trim().toUpperCase());let B=-1,$=-1,E=-1,z=-1,te=-1,H=-1,X=-1;x==="gia_soc"?(B=P.findIndex(T=>T==="CODE"||T==="CODE:"),$=P.findIndex(T=>T==="TÊN SẢN PHẨM"||T==="SẢN PHẨM"),E=P.findIndex(T=>T==="GIÁ GỐC"||T==="GIÁ NIÊM YẾT"),z=P.indexOf("GIÁ GIẢM"),te=P.findIndex(T=>T==="TIÊU ĐỀ"||T==="THỜI GIAN ÁP DỤNG"),X=P.indexOf("KHUYẾN MÃI"),B===-1&&$===-1&&E===-1&&(te=0,B=1,$=2,E=3,z=4,X=5)):(B=P.findIndex(T=>T==="CODE"||T==="CODE:"),$=P.findIndex(T=>T==="SẢN PHẨM"||T==="TÊN SẢN PHẨM"),E=P.findIndex(T=>T==="GIÁ NIÊM YẾT"||T==="GIÁ GỐC"),z=P.indexOf("GIÁ GIẢM"),te=P.findIndex(T=>T==="THỜI GIAN ÁP DỤNG"||T==="TIÊU ĐỀ"),H=P.indexOf("SỐ LƯỢNG SUẤT"),B===-1&&$===-1&&E===-1&&(B=0,$=1,E=2,z=3,te=4,H=5));const ue=C[1];if(ue){let T=h,W=w,fe=O;if(te!==-1&&ue[te]!=null){const oe=String(ue[te]).trim();oe&&(T=oe)}if(H!==-1&&ue[H]!=null){const oe=String(ue[H]).trim();oe&&(W=oe)}if(X!==-1&&ue[X]!=null){const oe=String(ue[X]).trim();oe&&(fe=oe)}T!==h&&v(T),W!==w&&M(W),fe!==O&&F(fe)}const je=[];for(let T=1;T<C.length;T++){const W=C[T];if(!W||W.length<2)continue;const fe=B!==-1&&W[B]!=null?String(W[B]).trim():"",oe=$!==-1&&W[$]!=null?String(W[$]).trim():"";if(!oe)continue;const Le=E!==-1?Jt(W[E]):0,Re=z!==-1?Jt(W[z]):0,Fe=Le?Le.toLocaleString("vi-VN"):"",he=Re?Number(Math.floor(Re/1e3)).toLocaleString("vi-VN"):"";let Ke="";Le>0&&Re>0&&(Ke=`${Math.round((Re/Le-1)*100)}%`);let Ue=h;if(te!==-1&&W[te]!=null){const Pe=String(W[te]).trim();Pe&&(Ue=Pe)}let bt=w;if(H!==-1&&W[H]!=null){const Pe=String(W[H]).trim();Pe&&(bt=Pe)}let ct=O;if(X!==-1&&W[X]!=null){const Pe=String(W[X]).trim();Pe&&(ct=Pe)}let jt="";if(fe)try{jt=`<div class="barcode"><img src="${Wt(fe)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${fe}" /></div>`}catch(Pe){console.error("Error generating barcode for template item:",Pe)}const wt=x==="gio_vang"?`<div class="sub-header">${bt}</div>`:"";let dt="";x==="gio_vang"?dt=`<div class="extra2" style="display:flex;align-items:baseline;justify-content:center"><span>${he}</span><span class="small-zeros">.000</span></div>`:dt=`<div class="extra2">${he}</div>`;const _n=`<div class="sticker-container" data-type="${x}" style="background-image:url('${Y}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
                        ${jt}
                        <div class="header-text">${Ue}</div>
                        ${wt}
                        <div class="extra1">${Ke}</div>
                        <div class="old">${Fe}</div>
                        <div class="name">${oe}</div>
                        ${dt}
                        <div class="footer-text">${ct}</div>
                    </div>`,Rn=Oe.replace(/[^0-9]/g,""),Ft=parseInt(Rn,10),Hn=isNaN(Ft)?!0:lt(Ke)>=Ft;je.push({id:`tpl_${T}_${Date.now()}`,html:_n,label:oe.substring(0,50),oldPrice:Fe,newPrice:he,percent:Ke,timestamp:Date.now(),code:fe,selected:Hn,header:Ue,subHeader:bt,footer:ct})}if(je.length===0){He.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Te(T=>[...T,...je]),We("queue"),je.length>0&&Lt(je[0]),He.success(`Đã thêm ${je.length} sticker vào hàng đợi in`)}catch{He.error("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},Zt=t=>{if(t==null||t==="")return"";const s=String(t).replace(/\D/g,"");if(!s)return"";const n=Number(s);return Number(Math.floor(n/1e3)).toLocaleString("vi-VN")},bn=t=>{if(t==null||t==="")return"";const s=String(t).replace(/\D/g,"");return s?Number(s).toLocaleString("vi-VN"):""},wn=(t,s)=>{var y;const n=(y=t.target.files)==null?void 0:y[0];if(!n)return;const p=new FileReader;p.onload=async q=>{var N;try{const b=(N=q.target)==null?void 0:N.result,U=await ft(()=>import("./vendor-excel-CkFp8p6R.js"),[]),R=U.read(b,{type:"binary"}),C=R.SheetNames[0],P=R.Sheets[C],B=U.utils.sheet_to_json(P,{header:1});if(!B||B.length<2){He.error("File không chứa đủ dữ liệu");return}const $=[];for(let E=1;E<B.length;E++){const z=B[E];if(!z||z.length===0)continue;let te="",H="",X="",ue="",je="",T="",W="";if(s==="purifier"?(W="MÁY LỌC NƯỚC",te=z[55]!=null?String(z[55]).trim():"",H=z[44]!=null?String(z[44]).trim():"",X=z[33]!=null?String(z[33]).trim():"",ue=z[20]!=null?String(z[20]).trim():"",je=z[1]!=null?String(z[1]).trim():"",T=z[31]!=null?String(z[31]).trim():"",H&&(H=ur(H))):(W="DUY NHẤT HÔM NAY",te=z[28]!=null?String(z[28]).trim():"",H=z[27]!=null?String(z[27]).trim():"",X=z[16]!=null?String(z[16]).trim():"",ue=z[17]!=null?String(z[17]).trim():"",je=z[8]!=null?String(z[8]).trim():"",T=z[31]!=null?String(z[31]).trim():""),!H)continue;let fe=te;fe.includes("-")&&(fe=fe.split("-")[0].trim());const oe=bn(X),Le=Zt(ue),Re=Zt(je),Fe=k==="service"?Re||Le:Le||Re;let he="";const Ke=Number(oe.replace(/\D/g,""));let Ue=Number(Fe.replace(/\D/g,""));if(Ke>0&&Ue>0){Ue*1e3<=Ke*1.5&&Ue<Ke&&(Ue=Ue*1e3);const dt=Math.round((Ue/Ke-1)*100);he=dt<0?`${dt}%`:""}const bt=Oe.replace(/[^0-9]/g,""),ct=parseInt(bt,10),jt=isNaN(ct)?!0:lt(he)>=ct,wt={id:`erp_${s}_${E}_${Date.now()}`,html:"",label:H,oldPrice:oe,newPrice:Fe,percent:he,timestamp:Date.now(),code:fe,selected:jt,salePrice:Le,servicePrice:Re,header:W,footer:T};wt.html=Gt(wt,k,x,Y),$.push(wt)}if($.length===0){He.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Te(E=>[...E,...$]),We("queue"),$.length>0&&Lt($[0]),He.success(`Đã thêm ${$.length} sticker vào hàng đợi in`)}catch(b){console.error(b),He.error("Lỗi đọc file Excel ERP")}},p.readAsBinaryString(n),t.target.value=""},kn=t=>{g(s=>s.map(n=>n.id===t?{...n,selected:!n.selected}:n))},vn=t=>{g(s=>s.map(n=>({...n,selected:t})))},yn=()=>{var C,P,B,$;const t=document.getElementById("print-section");if(!t)return;const s=t.querySelector(".sticker-container");if(!s)return;const n=((C=s.querySelector(".name"))==null?void 0:C.textContent)||"Sticker",p=((P=s.querySelector(".old"))==null?void 0:P.textContent)||"",y=((B=s.querySelector(".extra2"))==null?void 0:B.textContent)||"",q=(($=s.querySelector(".extra1"))==null?void 0:$.textContent)||"",N=Oe.replace(/[^0-9]/g,""),b=parseInt(N,10),U=isNaN(b)?!0:lt(q)>=b,R={id:`page_${Date.now()}`,html:s.outerHTML,label:n.substring(0,50),oldPrice:p,newPrice:y,percent:q,timestamp:Date.now(),code:yt,selected:U,salePrice:y,header:h,footer:O,subHeader:w};Te(E=>[...E,R])},Nn=t=>{Te(s=>s.filter(n=>n.id!==t)),Ae===t&&Ve(null)},jn=()=>{Te([]),Ve(null)},Sn=t=>{Te(s=>s.map(n=>n.id===t?{...n,selected:n.selected===!1}:n))},Cn=t=>{Te(s=>s.map(n=>({...n,selected:t})))},Tn=()=>{_e.length!==0&&qt(!0)},Pn=t=>{const s={id:`list_${Date.now()}`,name:t,pages:_e,timestamp:Date.now(),stickerType:x,headerTextContent:h};Nt(n=>{const p=[s,...n].slice(0,20);return et(ut,p).catch(()=>{}),p}),qt(!1),He.success(`Đã lưu danh sách "${t}" thành công!`)},zn=t=>{Te(t.pages),t.stickerType&&D(t.stickerType),t.headerTextContent&&v(t.headerTextContent),Xt(!1),Ve(null)},En=t=>{Nt(s=>{const n=s.filter(p=>p.id!==t);return et(ut,n).catch(()=>{}),n})},$n=t=>{D(t.stickerType),L(t.bgImage),ee(t.headerTextSize),t.subHeaderTextSize!=null&&ae(t.subHeaderTextSize),t.percentTextSize!=null&&Be(t.percentTextSize),t.oldPriceTextSize!=null&&pe(t.oldPriceTextSize),t.nameTextSize!=null&&Ye(t.nameTextSize),t.newPriceTextSize!=null&&be(t.newPriceTextSize),t.footerTextSize!=null&&Ge(t.footerTextSize),g(t.batchItems),v(t.headerTextContent),M(t.subHeaderTextContent),F(t.footerTextContent),Dt(t.showBarcode),Te(t.manualPages||[]),t.discountDisplayMode&&nt(t.discountDisplayMode),Kt(!1),Ve(null)},Dn=t=>{Mt(s=>{const n=s.filter(p=>p.id!==t);return et(Pt,n).catch(()=>{}),n})},In=()=>{g([]),$t(""),v("HÀNG TRƯNG BÀY"),F("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),ee(8),Ve(null)},Mn=()=>{const t=l.length>0?l.filter(N=>N.selected).length:_e.length===0?1:0,s=_e.filter(N=>N.selected!==!1),n=t+s.length;if(n===0){He.error("Không có trang nào để in!");return}const p=document.createElement("div");if(p.id="print-host",p.innerHTML=`
            <style>
                #print-host .header-text { font-size: ${ke}cqi !important; }
                #print-host .sub-header { font-size: ${ve}cqi !important; }
                #print-host .extra1 { font-size: ${Ie}cqi !important; }
                #print-host .old { font-size: ${qe}cqi !important; }
                #print-host .name { font-size: ${ye}cqi !important; }
                #print-host .extra2 { font-size: ${me}cqi !important; }
                #print-host .footer-text { font-size: ${Ne}cqi !important; }
                #print-host .sticker-container {
                    outline: ${x==="draw"?"none":"1.5px dashed #6366f1"};
                    outline-offset: 1px;
                }
            </style>
        `,l.length>0)l.filter(b=>b.selected).forEach(b=>{const U={id:b.id,html:"",label:b.name,oldPrice:b.oldPrice,newPrice:b.newPrice,percent:b.percent,timestamp:Date.now(),code:ot?b.imei:void 0,header:h,subHeader:w,footer:O};p.insertAdjacentHTML("beforeend",Gt(U,k,x,Y,j))});else if(_e.length===0){const N=document.getElementById("print-section");N&&p.insertAdjacentHTML("beforeend",N.innerHTML)}s.forEach(N=>{let b=N.header||"",U=N.subHeader||"",R=N.footer||"";x==="gio_vang"?((!b||b==="SẢN PHẨM GIÁ SỐC"||b==="QUẠT ĐIỀU HOÀ"||!b.toUpperCase().startsWith("TỪ"))&&(b=h),(!U||!U.toUpperCase().includes("SUẤT"))&&(U=w)):x==="gia_soc"&&b&&(b.toUpperCase().startsWith("TỪ")||b.includes("/"))&&(b=h);const C={...N,header:b,subHeader:U,footer:R||O};p.insertAdjacentHTML("beforeend",Gt(C,k,x,Y,j))}),document.body.appendChild(p);const y=document.getElementById("root");y&&(y.style.display="none");const q={id:`history_${Date.now()}`,timestamp:Date.now(),label:h||"Sticker",pageCount:n,stickerType:x,bgImage:Y,headerTextSize:ke,subHeaderTextSize:ve,percentTextSize:Ie,oldPriceTextSize:qe,nameTextSize:ye,newPriceTextSize:me,footerTextSize:Ne,batchItems:l,headerTextContent:h,subHeaderTextContent:w,footerTextContent:O,showBarcode:ot,manualPages:_e,discountDisplayMode:j};Mt(N=>{const b=N.findIndex(C=>fr(C,q));let U;if(b!==-1){const C={...N[b],timestamp:Date.now()},P=N.filter((B,$)=>$!==b);U=[C,...P]}else U=[q,...N];const R=U.slice(0,20);return et(Pt,R).catch(()=>{}),R}),setTimeout(()=>{window.print(),y&&(y.style.display=""),document.body.removeChild(p)},200)};return e.jsxs("div",{className:"print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden",children:[c&&r==="tools-print-sticker"&&document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")&&Zn.createPortal(e.jsxs("div",{className:"flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs("button",{onClick:()=>{u("sticker"),D("gia_soc"),v("QUẠT ĐIỀU HOÀ"),L("/frame/X24_NEW.png"),ee(8),mt("gia-soc")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giá Sốc"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="gia_soc"&&e.jsx(Tt,{size:14,className:"inline mr-1 text-indigo-600 dark:text-indigo-400"}),"Giá Sốc"]})]}),e.jsxs("button",{onClick:()=>{u("sticker"),D("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),L("/frame/GVO2-scaled.png"),ee(8),mt("gio-vang")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giờ Vàng"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="gio_vang"&&e.jsx(Tt,{size:14,className:"inline mr-1 text-amber-600 dark:text-amber-400"}),"Giờ Vàng"]})]}),e.jsxs("button",{onClick:()=>{u("sticker"),D("draw"),L("/frame/bg_phieu.png"),mt("draw"),Ce("drawContentTopLeft")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="draw"?"bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Rút Thăm"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="draw"&&e.jsx(Tt,{size:14,className:"inline mr-1 text-rose-600 dark:text-rose-400"}),"Phiếu Rút Thăm"]})]}),e.jsxs("button",{onClick:()=>{u("event"),I(!0),mt("event")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="event"?"bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Event"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="event"&&e.jsx(Tt,{size:14,className:"inline mr-1 text-emerald-600 dark:text-emerald-400"}),e.jsx(cn,{size:14,className:"inline mr-1"}),"Event - Tồn kho"]})]})]}),o==="sticker"&&e.jsxs("div",{className:"flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400",children:x==="draw"?`${Et()}:`:`${vt()}:`}),e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]",children:[e.jsx("button",{onMouseDown:t=>t.preventDefault(),onClick:()=>{if(x==="draw"){const t=st(),s=Math.max(1,t-.2);gt(s),Qe(s)}else f(t=>Math.max(1,t-.2))},className:"px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center",children:x==="draw"?st().toFixed(1):zt()}),e.jsx("button",{onMouseDown:t=>t.preventDefault(),onClick:()=>{if(x==="draw"){const s=st()+.2;gt(s),Qe(s)}else f(t=>t+.2)},className:"px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})]})]}),document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")),S&&e.jsx("div",{className:`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-200 ${o==="event"?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,children:e.jsx(Un,{name:"Event - Tồn kho",children:e.jsx(i.Suspense,{fallback:e.jsx("div",{className:"w-full h-full flex items-center justify-center bg-slate-50",children:e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx("div",{className:"w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"}),e.jsx("p",{className:"text-sm text-slate-500 font-medium",children:"Đang tải Event - Tồn kho..."})]})}),children:e.jsx(dr,{})})})}),e.jsxs("div",{className:`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${o==="event"?"invisible":"visible"}`,children:[e.jsx("div",{className:"flex flex-col gap-4 w-full max-w-sm shrink-0",children:e.jsx(sr,{batchItems:l,stickerType:x,showBarcode:ot,discountDisplayMode:j,headerTextContent:h,subHeaderTextContent:w,footerTextContent:O,barcodeImei:yt,bgImage:Y,headerTextSize:ke,subHeaderTextSize:ve,percentTextSize:Ie,oldPriceTextSize:qe,nameTextSize:ye,newPriceTextSize:me,footerTextSize:Ne,previewName:at,previewOldPrice:Rt,previewNewPrice:Ht,setPreviewOldPrice:pt,setPreviewNewPrice:Ze,activeField:De,setActiveField:Ce,setHeaderTextContent:v,setSubHeaderTextContent:M,setFooterTextContent:F,setBarcodeImei:Je,setPreviewName:xt,drawTickets:Q,setDrawTickets:ne,drawAutoIncrement:G,drawContentTopLeftSize:le,drawContentTopRightSize:ce,drawContentBottomLeftSize:de,drawContentBottomRightSize:Z,drawTitleSize:V,drawCodeSize:re,drawFooterSize:xe})}),e.jsx(lr,{manualPages:_e,batchItems:l,savedLists:_t,showSavedLists:un,setShowSavedLists:Xt,saveCurrentList:Tn,clearManualPages:jn,loadPageToEditor:Lt,removeManualPage:Nn,loadSavedList:zn,deleteSavedList:En,togglePageSelection:Sn,toggleAllPagesSelection:Cn,showBarcode:ot,setShowBarcode:Dt,discountDisplayMode:j,setDiscountDisplayMode:nt,searchTerm:Me,setSearchTerm:$t,printHistory:It,showHistory:dn,setShowHistory:Kt,handlePrint:Mn,addCurrentPage:yn,handleExcelUpload:xn,handleTemplateUpload:mn,downloadTemplate:pn,handleReset:In,toggleAllSelection:vn,toggleItemSelection:kn,clearBatchItems:()=>g([]),restoreHistory:$n,deleteHistory:Dn,discountThreshold:Oe,handleDiscountThresholdChange:gn,activeQueuePageId:Ae,setActiveQueuePageId:Ve,activeSubTab:rt,setActiveSubTab:We,priceSource:k,setPriceSource:A,handleErpPriceUpload:wn,stickerType:x,drawStartNumber:J,setDrawStartNumber:ie,drawTotalTickets:se,setDrawTotalTickets:K,drawAutoIncrement:G,setDrawAutoIncrement:ze})]}),Qt&&e.jsx(cr,{isOpen:Qt,onClose:()=>qt(!1),onSave:Pn,defaultName:`DS ${new Date().toLocaleDateString("vi-VN")}`})]})}const mr=Object.freeze(Object.defineProperty({__proto__:null,default:hr},Symbol.toStringTag,{value:"Module"}));export{cr as S,mr as a};
