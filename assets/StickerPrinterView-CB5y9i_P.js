const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/StickerEventApp-BqHlO3wr.js","assets/index-BPuOtw_U.js","assets/vendor-ui-BoQAhSeD.js","assets/vendor-charts-B95VUJRi.js","assets/vendor-firebase-Bpyixda8.js","assets/index-CS3VplT_.css","assets/uiService-ChsC0FH7.js"])))=>i.map(i=>d[i]);
import{j as e,B as Ye,b as Ot,u as Ln,a as qn,_ as xt,s as at,E as Un,e as Tt,z as Le}from"./index-BPuOtw_U.js";import{e as it,a as i,B as Bn,j as Gn,k as On,P as en,l as tn,X as Ut,m as nn,n as An,i as At,o as Vn,p as Wn,q as Kn,s as ln,t as Xn,u as Yn,v as rn,w as Pt,F as Qn,D as Jn,x as cn,f as zt}from"./vendor-ui-BoQAhSeD.js";import{r as Fn}from"./vendor-charts-B95VUJRi.js";const Zn=104,er=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]],tr=[2,3,3,1,1,1,2];function nr(r){const d=[Zn];for(let o=0;o<r.length;o++){const f=r.charCodeAt(o)-32;f<0||f>95||d.push(f)}let c=d[0];for(let o=1;o<d.length;o++)c+=d[o]*o;c%=103,d.push(c);const a=d.map(o=>er[o]);return a.push(tr),a}function Wt(r,d=40,c="#000"){if(!r)return"";const a=nr(r);let o=0;for(const U of a)for(const k of U)o+=k;const f=10,j=o+f*2,M=3,x=document.createElement("canvas");x.width=j*M,x.height=d*M;const I=x.getContext("2d");if(!I)return"";I.fillStyle="#fff",I.fillRect(0,0,x.width,x.height),I.fillStyle=c;let F=f*M;for(const U of a)for(let k=0;k<U.length;k++){const V=U[k]*M;k%2===0&&I.fillRect(F,0,V,x.height),F+=V}return x.toDataURL("image/png")}function sn({value:r,height:d=40,barColor:c="#000",className:a,style:o}){const[f,j]=it.useState("");return i.useEffect(()=>{if(r)try{const M=Wt(r,d,c);j(M)}catch(M){console.error("Error generating barcode data URL:",M)}},[r,d,c]),!r||!f?null:e.jsx("img",{src:f,className:a,style:{imageRendering:"pixelated",width:"100%",height:"100%",objectFit:"fill",...o},alt:r})}const rr=it.memo(({ticket:r,firstTicket:d,onChange:c,index:a,drawContentTopLeftSize:o,drawContentTopRightSize:f,drawContentBottomLeftSize:j,drawContentBottomRightSize:M,drawTitleSize:x,drawCodeSize:I,drawFooterSize:F,activeField:U,setActiveField:k,isAutoIncrement:V,totalIndex:K})=>{const te=i.useCallback(R=>{c({title:R})},[c]),Y=i.useCallback(R=>{c({code:R})},[c]),de=i.useCallback(R=>{c({footer:R})},[c]),ne=i.useCallback(R=>{c({contentTop:R})},[c]),X=i.useCallback(R=>{c({contentBottom:R})},[c]),L=i.useCallback(R=>{c({contentTopRight:R})},[c]),ze=i.useCallback(R=>{c({contentBottomRight:R})},[c]),ae=Pe(r.title,te,!0),be=Pe(r.code,Y,!0),ie=Pe(r.footer,de,!0),Ee=Pe(r.contentTop||"",ne,!0),le=Pe(r.contentTopRight||"",L,!0),pe=Pe(r.contentBottom||"",X,!0),Q=Pe(r.contentBottomRight||"",ze,!0),m=K!==void 0?K===0:a===0,O=d||r;return e.jsxs("div",{className:"draw-ticket-block","data-index":a,children:[m?e.jsx("div",{ref:ae.ref,onInput:ae.handleInput,onClick:()=>k==null?void 0:k("drawTitle"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-title-single animate-pulse-once ${U==="drawTitle"?"active-field":""}`,style:{fontSize:`${Math.min(x||2.5,3)}cqw`},"data-placeholder":"Nhập tiêu đề..."}):e.jsx("div",{className:"display-title-single",style:{fontSize:`${Math.min(x||2.5,3)}cqw`},dangerouslySetInnerHTML:{__html:O.title}}),m?e.jsx("div",{ref:Ee.ref,onInput:Ee.handleInput,onClick:()=>k==null?void 0:k("drawContentTopLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-left ${U==="drawContentTopLeft"?"active-field":""}`,style:{fontSize:`${o||3.5}cqw`},"data-placeholder":"Nhập thông tin 1 (Họ tên, SĐT...)"}):e.jsx("div",{className:"display-content-top-left",style:{fontSize:`${o||3.5}cqw`},dangerouslySetInnerHTML:{__html:O.contentTop||""}}),m?e.jsx("div",{ref:le.ref,onInput:le.handleInput,onClick:()=>k==null?void 0:k("drawContentTopRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-right ${U==="drawContentTopRight"?"active-field":""}`,style:{fontSize:`${f||3.5}cqw`},"data-placeholder":"Nhập thông tin 3 (Tự gõ...)"}):e.jsx("div",{className:"display-content-top-right",style:{fontSize:`${f||3.5}cqw`},dangerouslySetInnerHTML:{__html:O.contentTopRight||""}}),V?e.jsx("div",{className:"display-code-left",style:{fontSize:`${I||3.8}cqw`},children:r.code}):e.jsx("div",{ref:be.ref,onInput:be.handleInput,onClick:()=>k==null?void 0:k("drawCode"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-code-left ${U==="drawCode"?"active-field":""}`,style:{fontSize:`${I||3.8}cqw`},"data-placeholder":"Số"}),e.jsx("div",{className:"display-code-right",style:{fontSize:`${I||3.8}cqw`},children:r.code}),m?e.jsx("div",{ref:pe.ref,onInput:pe.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-left ${U==="drawContentBottomLeft"?"active-field":""}`,style:{fontSize:`${j||2.2}cqw`},"data-placeholder":"Nhập thông tin 2 (Địa chỉ...)"}):e.jsx("div",{className:"display-content-bottom-left",style:{fontSize:`${j||2.2}cqw`},dangerouslySetInnerHTML:{__html:O.contentBottom||""}}),m?e.jsx("div",{ref:Q.ref,onInput:Q.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-right ${U==="drawContentBottomRight"?"active-field":""}`,style:{fontSize:`${M||2.2}cqw`},"data-placeholder":"Nhập thông tin 4 (Tự gõ...)"}):e.jsx("div",{className:"display-content-bottom-right",style:{fontSize:`${M||2.2}cqw`},dangerouslySetInnerHTML:{__html:O.contentBottomRight||""}}),m?e.jsx("div",{ref:ie.ref,onInput:ie.handleInput,onClick:()=>k==null?void 0:k("drawFooter"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-footer-left ${U==="drawFooter"?"active-field":""}`,style:{fontSize:`${F||3.8}cqw`},"data-placeholder":"Nhập tên siêu thị..."}):e.jsx("div",{className:"display-footer-left",style:{fontSize:`${F||3.8}cqw`},dangerouslySetInnerHTML:{__html:O.footer}})]})});function Pe(r,d,c=!1){const a=i.useRef(null),o=i.useRef(null);i.useEffect(()=>{a.current&&a.current!==o.current&&(o.current=a.current,(c?a.current.innerHTML:a.current.innerText)!==r&&(c?a.current.innerHTML=r:a.current.innerText=r))}),i.useEffect(()=>{a.current&&document.activeElement!==a.current&&(c?a.current.innerHTML:a.current.innerText)!==r&&(c?a.current.innerHTML=r:a.current.innerText=r)},[r,c]);const f=i.useCallback(j=>{d==null||d(c?j.currentTarget.innerHTML:j.currentTarget.innerText)},[d,c]);return{ref:a,handleInput:f}}const on=(r,d)=>{const c=Number(r.replace(/\D/g,""));let a=Number(d.replace(/\D/g,""));if(c<=0||a<=0)return null;a*1e3<=c*1.5&&a<c&&(a=a*1e3);const o=c-a;if(o<=0)return null;let f="",j="";if(o<1e6)f=(o/1e3).toString(),j="K";else{const M=o/1e6;f=Number(M.toFixed(1)).toString(),j="triệu"}return e.jsxs("span",{className:"discount-amount font-bold",children:[e.jsx("span",{className:"discount-label",children:"-"}),e.jsx("span",{className:"discount-num",children:f}),e.jsx("span",{className:`discount-unit ${j==="triệu"?"unit-trieu":"unit-k"}`,children:j})]})},Bt=(r,d)=>{const c=Number(r.replace(/\D/g,""));let a=Number(d.replace(/\D/g,""));if(c<=0||a<=0)return null;a*1e3<=c*1.5&&a<c&&(a=a*1e3);const o=Math.round((a/c-1)*100);return o<0?`${o}%`:""},sr=({batchItems:r,stickerType:d,showBarcode:c,discountDisplayMode:a,headerTextContent:o,subHeaderTextContent:f,footerTextContent:j,barcodeImei:M,bgImage:x,headerTextSize:I,subHeaderTextSize:F,percentTextSize:U,oldPriceTextSize:k,nameTextSize:V,newPriceTextSize:K,footerTextSize:te,previewName:Y,previewOldPrice:de,previewNewPrice:ne,activeField:X,setActiveField:L,setHeaderTextContent:ze,setSubHeaderTextContent:ae,setFooterTextContent:be,setBarcodeImei:ie,setPreviewName:Ee,setPreviewOldPrice:le,setPreviewNewPrice:pe,updateBatchItem:Q,drawTickets:m=[],setDrawTickets:O,drawContentTopLeftSize:R,drawContentTopRightSize:Z,drawContentBottomLeftSize:$e,drawContentBottomRightSize:fe,drawTitleSize:lt,drawCodeSize:Re,drawFooterSize:De,drawAutoIncrement:Ne})=>{const[re,je]=it.useState(0),ue=Math.ceil((m||[]).length/4);it.useEffect(()=>{re>=ue&&je(0)},[m==null?void 0:m.length,ue,re]);const we=i.useRef(null),Oe=i.useRef(new Map),qe=i.useCallback(u=>{const l=Oe.current;let g=l.get(u);return g||(g=h=>{O==null||O(v=>v.map((w,E)=>E===u?{...w,...h}:w))},l.set(u,g)),g},[O]),[ke,Se]=it.useState(null),[Qe,ve]=it.useState(null),me=i.useRef(null);it.useEffect(()=>{const u=()=>{const l=window.getSelection();if(!l||l.rangeCount===0||l.isCollapsed){Se(null),ve(null);return}const g=l.getRangeAt(0);let h=g.commonAncestorContainer;h.nodeType===3&&(h=h.parentNode||h);let v=h,w=!1;for(;v;){if(v.nodeType===1&&v.getAttribute("contenteditable")==="true"){w=!0;break}v=v.parentNode}if(!w){Se(null),ve(null);return}me.current=g.cloneRange();const E=g.getClientRects();if(E.length>0){const A=E[0];Se({top:A.top+window.scrollY-50,left:A.left+window.scrollX+A.width/2})}else Se(null),ve(null)};return document.addEventListener("selectionchange",u),()=>{document.removeEventListener("selectionchange",u)}},[]);const Ce=(u,l)=>{let g=me.current;const h=window.getSelection();if(!g&&h&&h.rangeCount>0&&(g=h.getRangeAt(0)),!g)return;let v=g.commonAncestorContainer;v.nodeType===3&&(v=v.parentNode||v);let w=v,E=null;for(;w;){if(w.nodeType===1&&w.getAttribute("contenteditable")==="true"){E=w;break}w=w.parentNode}if(!E)return;E.focus();let A=l;if(u==="fontFamily"&&(A=l.replace(/['"]/g,"")),g.collapsed)try{const oe=E.innerHTML,tt=u==="fontFamily"?"font-family":u;E.innerHTML=`<span style="${tt}: ${l}">${oe}</span>`;const Fe=new Event("input",{bubbles:!0});E.dispatchEvent(Fe);const nt=document.createRange();nt.selectNodeContents(E),h&&(h.removeAllRanges(),h.addRange(nt)),me.current=nt;return}catch(oe){console.error("Error applying custom style to container:",oe)}h&&(h.removeAllRanges(),h.addRange(g));const ee=document.createElement("span");ee.style[u]=A;try{ee.appendChild(g.extractContents()),g.insertNode(ee);const oe=document.createRange();oe.selectNodeContents(ee),h&&(h.removeAllRanges(),h.addRange(oe)),me.current=oe;const tt=new Event("input",{bubbles:!0});E.dispatchEvent(tt)}catch(oe){console.error("Error applying custom style to selection:",oe)}},Ae=u=>{let l=me.current;const g=window.getSelection();l&&g&&(g.removeAllRanges(),g.addRange(l)),document.execCommand(u,!1),g&&g.rangeCount>0&&(me.current=g.getRangeAt(0).cloneRange());const h=window.getSelection();if(!h||h.rangeCount===0)return;let w=h.getRangeAt(0).commonAncestorContainer;w.nodeType===3&&(w=w.parentNode||w);let E=w;for(;E;){if(E.nodeType===1&&E.getAttribute("contenteditable")==="true"){const A=new Event("input",{bubbles:!0});E.dispatchEvent(A);break}E=E.parentNode}},ye=Pe(de,le),S=Pe(ne,pe),Ve=u=>{et(u),ye.handleInput(u)},yt=u=>{et(u),S.handleInput(u)},We=i.useCallback(u=>{Ee(u)},[Ee]),Ke=Pe(Y,We),Je=Pe(o,ze),Ue=Pe(f,ae),Nt=Pe(j,be),et=u=>{const l=u.currentTarget,g=l.innerText;if(/[a-zA-Z]/.test(g))return;const h=g.replace(/\D/g,"");if(!h)return;let v=parseInt(h,10);l.classList.contains("extra2")&&v>=1e5&&(v=Math.floor(v/1e3));const E=v.toLocaleString("vi-VN");if(g!==E){l.innerText=E;const ee=document.createRange(),oe=window.getSelection();oe&&(ee.selectNodeContents(l),ee.collapse(!1),oe.removeAllRanges(),oe.addRange(ee))}const A=l.closest(".sticker-container");A&&$t(A)},$t=u=>{const l=u.querySelector(".old"),g=u.querySelector(".extra2"),h=u.querySelector(".extra1");if(!l||!g||!h)return;const v=Number(l.innerText.replace(/\D/g,""));let w=Number(g.innerText.replace(/\D/g,""));if(v>0&&w>0)if(w*1e3<=v*1.5&&w<v&&(w=w*1e3),a==="amount"){const E=v-w;if(E>0){let A="",ee="";E<1e6?(A=(E/1e3).toString(),ee="K"):(A=Number((E/1e6).toFixed(1)).toString(),ee="triệu");const oe=ee==="triệu"?"unit-trieu":"unit-k";h.innerHTML=`<span class="discount-amount font-bold"><span class="discount-label">-</span><span class="discount-num">${A}</span><span class="discount-unit ${oe}">${ee}</span></span>`}else h.innerText=""}else{const E=Math.round((w/v-1)*100);E<0?h.innerText=`${E}%`:h.innerText=""}},ct=()=>{const u=window.getSelection();if(!u||u.rangeCount===0)return 3.5;let g=u.getRangeAt(0).commonAncestorContainer;g.nodeType===Node.TEXT_NODE&&(g=g.parentElement);const h=g==null?void 0:g.closest('span[style*="font-size"]');if(h){const w=h.style.fontSize.match(/([\d.]+)/);if(w)return parseFloat(w[1])}return 3.5},pt=u=>{const l=ct(),g=Math.max(.5,Math.min(20,parseFloat((l+u).toFixed(1))));if(Ce("fontSize",`${g}cqw`),me.current){const h=window.getSelection();h&&(h.removeAllRanges(),h.addRange(me.current))}},Dt=u=>{const l=parseFloat(u);!isNaN(l)&&l>0&&Ce("fontSize",`${l}cqw`)};return e.jsxs("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-sm mx-auto overflow-hidden no-print-bg",children:[e.jsx("style",{children:i.useMemo(()=>`
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
                    font-size: ${I}cqw;
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
                    font-size: ${U}cqw;
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
                    font-size: ${V}cqw;
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
                    font-size: ${K}cqw;
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
                    font-size: ${te}cqw;
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
                    font-size: ${I}cqw;
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
                    font-size: ${F}cqw;
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
                    font-size: ${V}cqw;
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
                    font-size: ${K}cqw;
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

                 .draw-ticket-block .input-title-single {
                      position: absolute;
                      left: 2.2%;
                      top: 2.0%;
                      width: 95.6%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      background: #ffffff;
                      z-index: 10;
                      outline: none;
                      cursor: text;
                      text-align: center;
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
                      top: 50.0%;
                      width: 47.0%;
                      height: 32.0%;
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
                      left: 36.5%;
                      top: 33.0%;
                      width: 12.0%;
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
                       left: 36.5%;
                       top: 33.0%;
                       width: 12.0%;
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
                      left: 86.7%;
                      top: 33.0%;
                      width: 12.0%;
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

                  .draw-ticket-block .display-title-single {
                      position: absolute;
                      left: 2.2%;
                      top: 2.0%;
                      width: 95.6%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      background: #ffffff;
                      z-index: 10;
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
                      align-items: flex-start;
                      text-align: left;
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
                       top: 50.0%;
                       width: 47.0%;
                       height: 32.0%;
                       display: flex;
                       flex-direction: column;
                       justify-content: center;
                       align-items: flex-start;
                       text-align: left;
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
                 `,[d,x,I,U,V,k,K,te,F])}),e.jsxs("div",{id:"print-section",className:"w-full",children:[d==="draw"?(()=>{const u=[];for(let l=0;l<m.length;l+=4)u.push(m.slice(l,l+4));return u.map((l,g)=>e.jsx("div",{className:`sticker-container draw-page ${g===re?"active-preview-page":""}`,"data-type":"draw",style:{backgroundImage:`url(${x})`,pageBreakAfter:g<u.length-1?"always":"auto",marginBottom:g<u.length-1?"20px":"0"},children:l.map((h,v)=>{const w=g*4+v;return e.jsx(rr,{index:v,ticket:h,firstTicket:m[0],isAutoIncrement:Ne,drawContentTopLeftSize:R,drawContentTopRightSize:Z,drawContentBottomLeftSize:$e,drawContentBottomRightSize:fe,drawTitleSize:lt,drawCodeSize:Re,drawFooterSize:De,activeField:X,setActiveField:L,totalIndex:w,onChange:qe(w)},h.id||w)})},g))})():r.length>0?e.jsxs(e.Fragment,{children:[r.filter(u=>u.selected).slice(0,20).map((u,l,g)=>e.jsxs("div",{className:"sticker-container","data-type":d,style:{pageBreakAfter:l<g.length-1?"always":"auto",backgroundImage:`url(${x})`},children:[c&&u.imei&&e.jsx("div",{className:"barcode",children:e.jsx(sn,{value:u.imei})}),e.jsx("div",{className:`header-text ${X==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("header"),onBlur:h=>ze(h.currentTarget.innerText),children:o}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${X==="subHeader"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("subHeader"),onBlur:h=>ae(h.currentTarget.innerText),children:f}),e.jsx("div",{className:`extra1 ${X==="percent"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("percent"),onBlur:h=>Q==null?void 0:Q(u.id,{percent:h.currentTarget.innerText}),children:a==="amount"&&on(u.oldPrice,u.newPrice)||u.percent},a),e.jsx("div",{className:`old ${X==="oldPrice"?"active-field":""}`,onInput:et,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("oldPrice"),onBlur:h=>{const v=h.currentTarget.innerText,w=Bt(v,u.newPrice)||"";Q==null||Q(u.id,{oldPrice:v,percent:w})},children:u.oldPrice}),e.jsx("div",{className:`name ${X==="name"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("name"),onBlur:h=>Q==null?void 0:Q(u.id,{name:h.currentTarget.innerText}),children:u.name}),e.jsx("div",{className:`extra2 ${X==="newPrice"?"active-field":""}`,onInput:et,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("newPrice"),onBlur:h=>{const v=h.currentTarget.innerText,w=Bt(u.oldPrice,v)||"";Q==null||Q(u.id,{newPrice:v,percent:w})},children:u.newPrice}),e.jsx("div",{className:`footer-text ${X==="footer"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("footer"),onBlur:h=>be(h.currentTarget.innerText),children:j})]},u.id)),r.filter(u=>u.selected).length>20&&e.jsxs("div",{className:"w-full py-4 text-center text-sm font-medium text-slate-500 bg-white/50 rounded-lg border border-slate-200 mt-4 shadow-sm",children:[e.jsx("span",{className:"text-indigo-600 font-bold",children:"Chế độ xem trước:"})," Đang hiển thị 20 sticker đầu tiên (trong tổng số ",r.filter(u=>u.selected).length," sticker).",e.jsx("br",{}),e.jsx("i",{children:"Tất cả sticker sẽ được in đầy đủ khi bấm nút IN."})]})]}):e.jsxs("div",{className:"sticker-container","data-type":d,style:{backgroundImage:`url(${x})`},children:[c&&M&&e.jsx("div",{className:"barcode",children:e.jsx(sn,{value:M})}),e.jsx("div",{className:`header-text ${X==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},ref:Je.ref,onInput:Je.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("header")}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${X==="subHeader"?"active-field":""}`,ref:Ue.ref,onInput:Ue.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("subHeader")}),e.jsx("div",{className:`extra1 ${X==="percent"?"active-field":""}`,ref:we,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("percent"),children:a==="amount"?on(de,ne):Bt(de,ne)},a),e.jsx("div",{className:`old ${X==="oldPrice"?"active-field":""}`,ref:ye.ref,onInput:Ve,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("oldPrice")}),e.jsx("div",{className:`name ${X==="name"?"active-field":""}`,ref:Ke.ref,onInput:Ke.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("name")}),e.jsx("div",{className:`extra2 ${X==="newPrice"?"active-field":""}`,ref:S.ref,onInput:yt,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("newPrice")}),e.jsx("div",{className:`footer-text ${X==="footer"?"active-field":""}`,ref:Nt.ref,onInput:Nt.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("footer")})]}),(()=>{const u=ke?ke.top-window.scrollY<180:!1;return ke&&e.jsxs("div",{className:"fixed z-[9999] -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden",style:{top:`${ke.top}px`,left:`${ke.left}px`},onMouseDown:l=>{l.preventDefault()},children:[e.jsxs("div",{className:"relative",children:[e.jsxs("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>ve(Qe==="font"?null:"font"),className:"bg-transparent text-white text-[11px] font-semibold px-2 py-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border-r border-slate-700/80 mr-0.5",children:["Font ",e.jsx("span",{className:"text-[7px] opacity-75",children:"▼"})]}),Qe==="font"&&e.jsx("div",{onMouseDown:l=>l.preventDefault(),className:`absolute left-0 mb-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 flex flex-col min-w-[150px] max-h-[200px] overflow-y-auto z-[10000] scrollbar-thin overflow-x-hidden ${u?"top-full mt-2":"bottom-full mb-2"}`,children:[{name:"UTM Avo",val:"UTM Avo, sans-serif"},{name:"Plus Jakarta Sans",val:"Plus Jakarta Sans, sans-serif"},{name:"Inter",val:"Inter, sans-serif"},{name:"Oswald",val:"Oswald, sans-serif"},{name:"Roboto Condensed",val:"Roboto Condensed, sans-serif"},{name:"Fjalla One",val:"Fjalla One, sans-serif"},{name:"Jost",val:"Jost, sans-serif"},{name:"Josefin Sans",val:"Josefin Sans, sans-serif"},{name:"Alata Regular",val:"Alata Regular, sans-serif"},{name:"Shopee Text",val:"Shopee Text, sans-serif"},{name:"SF Pro Display",val:"SF Pro Display, sans-serif"},{name:"Samsung Sharp Sans",val:"Samsung Sharp Sans, sans-serif"},{name:"Shopee Display",val:"Shopee Display, sans-serif"},{name:"UTM Colossalis",val:"UTM Colossalis, sans-serif"}].map(l=>e.jsx("button",{onMouseDown:g=>g.preventDefault(),onClick:()=>{Ce("fontFamily",l.val),ve(null)},className:"px-3 py-1.5 text-left text-[11px] text-slate-200 hover:text-white hover:bg-slate-800 transition-colors w-full whitespace-nowrap",style:{fontFamily:l.val},children:l.name},l.val))})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print",children:[e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>pt(-.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Giảm size chữ",children:"-"}),e.jsx("input",{type:"text",onMouseDown:l=>l.stopPropagation(),onClick:l=>l.stopPropagation(),value:ct().toFixed(1),onChange:l=>Dt(l.target.value),className:"w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500",title:"Kích thước cqw"}),e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>pt(.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Tăng size chữ",children:"+"})]}),e.jsx("button",{onClick:()=>Ae("bold"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In đậm (Bold)",children:e.jsx(Bn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ae("italic"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In nghiêng (Italic)",children:e.jsx(Gn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ae("underline"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"Gạch chân (Underline)",children:e.jsx(On,{size:13,className:"stroke-[2.5]"})}),e.jsx("div",{className:"absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95"})]})})()]}),d==="draw"&&ue>1&&e.jsxs("div",{className:"flex flex-wrap items-center justify-center gap-1.5 mt-4 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 no-print",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-500 mr-1.5 uppercase",children:"Trang xem trước:"}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:()=>je(u=>Math.max(0,u-1)),disabled:re===0,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:"<"}),Array.from({length:ue}).map((u,l)=>ue>5&&l!==0&&l!==ue-1&&Math.abs(l-re)>1?l===1&&re>2?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):l===ue-2&&re<ue-3?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):null:e.jsx("button",{onClick:()=>je(l),className:`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${re===l?"bg-rose-600 text-white shadow-sm font-black":"bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"}`,children:l+1},l)),e.jsx("button",{onClick:()=>je(u=>Math.min(ue-1,u+1)),disabled:re===ue-1,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:">"})]})]})]})},or=r=>{if(!r)return"";let d=r.replace(/^[\(\[]\d+[\)\]]\s*/,"");return d=d.replace(/\s*[\(\[]\d+[\)\]]$/,""),d.trim()},ar=(r,d)=>{let c=r.newPrice,a=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const o=Number(r.oldPrice.replace(/\D/g,""));let f=Number(r.servicePrice.replace(/\D/g,""));if(o>0&&f>0){f*1e3<=o*1.5&&f<o&&(f=f*1e3);const j=Math.round((f/o-1)*100);a=j<0?`${j}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const o=Number(r.oldPrice.replace(/\D/g,""));let f=Number(r.salePrice.replace(/\D/g,""));if(o>0&&f>0){f*1e3<=o*1.5&&f<o&&(f=f*1e3);const j=Math.round((f/o-1)*100);a=j<0?`${j}%`:""}}return{newPrice:c,percent:a}},ir=({manualPages:r,savedLists:d,showSavedLists:c,setShowSavedLists:a,saveCurrentList:o,clearManualPages:f,loadPageToEditor:j,removeManualPage:M,loadSavedList:x,deleteSavedList:I,togglePageSelection:F,toggleAllPagesSelection:U,discountThreshold:k,handleDiscountThresholdChange:V,activeQueuePageId:K,setActiveQueuePageId:te,discountDisplayMode:Y,setDiscountDisplayMode:de,showBarcode:ne,setShowBarcode:X,priceSource:L,setPriceSource:ze})=>{const[ae,be]=i.useState(""),[ie,Ee]=i.useState(()=>typeof window>"u"?!1:localStorage.getItem("hasSeenStickerDiscountTooltip")!=="true"),le=()=>{localStorage.setItem("hasSeenStickerDiscountTooltip","true"),Ee(!1)},pe=r.filter(m=>{const O=ae.toLowerCase().trim();if(!O)return!0;const R=m.label.toLowerCase().includes(O),Z=m.code?m.code.toLowerCase().includes(O):!1;return R||Z}),Q=r.length>0&&r.every(m=>m.selected!==!1);return e.jsxs("div",{className:"w-full h-full flex flex-col no-print space-y-3 overflow-hidden",children:[ie&&e.jsx("style",{children:`
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
                `}),r.length===0&&e.jsxs("div",{className:"flex items-center justify-between shrink-0 py-1 bg-slate-50 dark:bg-slate-900/20 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40",children:[e.jsx("span",{className:"text-[11px] font-bold text-slate-500 dark:text-slate-400",children:"Cấu hình in nhãn:"}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsxs("div",{className:"relative flex items-center",children:[e.jsx(Ye,{onClick:()=>{de(Y==="percent"?"amount":"percent"),ie&&le()},size:"icon",variant:"secondary",className:`h-8 w-8 transition-all ${ie?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":Y==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:Y==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:Y==="percent"?e.jsx(en,{size:14}):e.jsx(tn,{size:14})}),ie&&e.jsxs("div",{className:"absolute right-0 top-9 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx("button",{onClick:le,className:"text-indigo-200 hover:text-white p-0.5",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx("button",{onClick:le,className:"self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx(Ye,{onClick:()=>X(!ne),size:"icon",variant:"secondary",className:`h-8 w-8 transition-colors ${ne?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:ne?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:14})})]})]}),r.length>0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2",children:[e.jsx("input",{type:"checkbox",checked:Q,onChange:m=>U(m.target.checked),className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0",title:"Chọn tất cả / Bỏ chọn tất cả"}),e.jsxs("span",{className:"text-xs font-bold text-slate-700 dark:text-slate-300",children:["Số lượng: ",r.length]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 shrink-0",children:[e.jsx(Ot,{type:"text",placeholder:"% Giảm",value:k,onChange:m=>V(m.target.value),className:"!w-12 !h-7 text-center px-1 text-[10px] rounded-lg font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white",title:"Nhập % giảm tối thiểu",fullWidth:!1}),e.jsxs("div",{className:"relative flex items-center",children:[e.jsx(Ye,{onClick:()=>{de(Y==="percent"?"amount":"percent"),ie&&le()},size:"icon",variant:"secondary",className:`h-7 w-7 transition-all ${ie?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":Y==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:Y==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:Y==="percent"?e.jsx(en,{size:13}):e.jsx(tn,{size:13})}),ie&&e.jsxs("div",{className:"absolute right-0 top-8 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx("button",{onClick:le,className:"text-indigo-200 hover:text-white p-0.5",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx("button",{onClick:le,className:"self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx(Ye,{onClick:()=>X(!ne),size:"icon",variant:"secondary",className:`h-7 w-7 transition-colors ${ne?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:ne?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:13})}),e.jsx("div",{className:"h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"}),e.jsx(Ye,{onClick:o,size:"icon",variant:"secondary",className:"h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Lưu danh sách",children:e.jsx(An,{size:13})}),e.jsx(Ye,{onClick:f,size:"icon",variant:"secondary",className:"h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Xóa tất cả",children:e.jsx(At,{size:13})})]})]}),r.some(m=>m.servicePrice||m.salePrice)&&e.jsxs("div",{className:"flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full shrink-0 mb-1",children:[e.jsx("button",{onClick:()=>ze("sale"),className:`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${L==="sale"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá giảm"}),e.jsx("button",{onClick:()=>ze("service"),className:`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${L==="service"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá Dịch vụ"})]}),e.jsx("div",{className:"relative shrink-0 mb-1",children:e.jsx(Ot,{type:"text",placeholder:"Tìm theo tên hoặc mã sản phẩm...",value:ae,onChange:m=>be(m.target.value),className:"h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 text-slate-750 dark:text-slate-350",fullWidth:!0,rightIcon:ae?"x":void 0,onRightIconClick:ae?()=>be(""):void 0})}),e.jsxs("div",{className:"space-y-2 flex-1 overflow-y-auto pr-1",children:[pe.map((m,O)=>e.jsxs("div",{tabIndex:0,"data-queue-index":O,className:`flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group outline-none ${m.id===K?"border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20":"border-slate-100 dark:border-slate-700"} ${m.selected===!1?"opacity-50":""}`,onClick:()=>{te(m.id),j(m)},onKeyDown:R=>{if(R.key==="ArrowDown"){R.preventDefault();const Z=O+1;if(Z<pe.length){const $e=pe[Z];te($e.id),j($e),setTimeout(()=>{const fe=document.querySelector(`[data-queue-index="${Z}"]`);fe==null||fe.focus()},10)}}else if(R.key==="ArrowUp"){R.preventDefault();const Z=O-1;if(Z>=0){const $e=pe[Z];te($e.id),j($e),setTimeout(()=>{const fe=document.querySelector(`[data-queue-index="${Z}"]`);fe==null||fe.focus()},10)}}},title:"Click hoặc dùng mũi tên Lên/Xuống để chỉnh sửa",children:[e.jsxs("div",{className:"flex items-center gap-2.5 min-w-0 flex-1",children:[e.jsx("input",{type:"checkbox",checked:m.selected!==!1,onChange:R=>{R.stopPropagation(),F(m.id)},className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"}),e.jsx("span",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0",children:O+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs text-slate-700 dark:text-slate-300 truncate font-medium",children:or(m.label)}),e.jsx("div",{className:"flex gap-2 mt-0.5 text-[10px]",children:(()=>{const{newPrice:R,percent:Z}=ar(m,L);return e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-red-600 font-bold",children:R}),m.oldPrice&&e.jsx("span",{className:"line-through text-slate-400",children:m.oldPrice}),Z&&e.jsx("span",{className:"text-green-600 font-bold",children:Z})]})})()})]})]}),e.jsx("button",{onClick:R=>{R.stopPropagation(),M(m.id)},className:"text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100",children:e.jsx(Ut,{size:14})})]},m.id)),pe.length===0&&e.jsx("p",{className:"text-xs text-slate-400 dark:text-slate-500 text-center py-4",children:"Không tìm thấy sticker nào phù hợp"})]})]}),d.length>0&&r.length===0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("button",{onClick:()=>a(!c),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(Vn,{size:16,className:"text-emerald-500"}),"Danh sách đã lưu (",d.length,")"]}),c?e.jsx(Wn,{size:16}):e.jsx(Kn,{size:16})]}),c&&e.jsx("div",{className:"mt-3 space-y-2 flex-1 overflow-y-auto pr-1",children:d.map(m=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:m.name}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(m.timestamp).toLocaleDateString("vi-VN")}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[m.pages.length," trang"]})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>x(m),className:"p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold",title:"Tải danh sách",children:e.jsx(ln,{size:13})}),e.jsx("button",{onClick:()=>I(m.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},m.id))})]}),r.length===0&&d.length===0&&e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"D.Sách in trống"})]})},lr=({manualPages:r,batchItems:d,showBarcode:c,setShowBarcode:a,discountDisplayMode:o,setDiscountDisplayMode:f,searchTerm:j,setSearchTerm:M,printHistory:x,showHistory:I,setShowHistory:F,handlePrint:U,addCurrentPage:k,handleExcelUpload:V,handleTemplateUpload:K,downloadTemplate:te,handleReset:Y,toggleAllSelection:de,toggleItemSelection:ne,clearBatchItems:X,restoreHistory:L,deleteHistory:ze,savedLists:ae,showSavedLists:be,setShowSavedLists:ie,saveCurrentList:Ee,clearManualPages:le,loadPageToEditor:pe,removeManualPage:Q,loadSavedList:m,deleteSavedList:O,togglePageSelection:R,toggleAllPagesSelection:Z,discountThreshold:$e,handleDiscountThresholdChange:fe,activeQueuePageId:lt,setActiveQueuePageId:Re,activeSubTab:De,setActiveSubTab:Ne,priceSource:re,setPriceSource:je,handleErpPriceUpload:ue,stickerType:we,drawStartNumber:Oe,setDrawStartNumber:qe,drawTotalTickets:ke,setDrawTotalTickets:Se,drawAutoIncrement:Qe,setDrawAutoIncrement:ve})=>{const me=d.filter(S=>S.selected).length,Ce=r.filter(S=>S.selected!==!1).length,Ae=d.filter(S=>S.name.toLowerCase().includes(j.toLowerCase())),ye=i.useMemo(()=>x.filter(S=>S.stickerType===we),[x,we]);return e.jsxs("div",{className:"w-full max-w-sm aspect-[197/285] bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 p-5 lg:p-6 no-print flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex gap-2 mb-3 shrink-0",children:[e.jsxs(Ye,{onClick:U,className:"flex-1 !bg-[#fbbc04] hover:!bg-[#f0b400] !text-black font-black text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-yellow-500/10 border-transparent",leftIcon:e.jsx(Xn,{size:16}),children:["BẤM ĐỂ IN (",d.length>0?me+Ce:r.length>0?Ce:1,")"]}),e.jsx(Ye,{onClick:k,className:"bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md shadow-indigo-500/10 border-transparent",title:"Thêm trang hiện tại vào hàng đợi in",leftIcon:e.jsx(Yn,{size:16}),children:"Thêm"})]}),e.jsxs("div",{className:"flex border-b border-slate-100 dark:border-slate-700 mb-4 shrink-0",children:[e.jsx("button",{onClick:()=>Ne("data"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${De==="data"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Dữ liệu"}),we!=="draw"&&e.jsxs("button",{onClick:()=>Ne("queue"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${De==="queue"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["D.Sách (",r.length,")"]}),e.jsxs("button",{onClick:()=>Ne("history"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${De==="history"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["Lịch sử (",ye.length,")"]})]}),e.jsxs("div",{className:`flex-1 pr-1 -mr-1 scrollbar-thin ${De==="queue"?"flex flex-col overflow-hidden":"overflow-y-auto space-y-2"}`,children:[De==="data"&&e.jsxs("div",{className:"space-y-2.5 animate-in fade-in duration-200 pb-2",children:[we==="draw"?e.jsxs("div",{className:"p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 space-y-4",children:[e.jsxs("p",{className:"text-[11px] lg:text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-200/40 pb-2",children:[e.jsx(rn,{size:14,className:"stroke-[2.5]"}),"Cấu hình in Phiếu Rút Thăm"]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số bắt đầu"}),e.jsx("input",{type:"number",min:"1",value:Oe,onChange:S=>qe(Math.max(1,parseInt(S.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số lượng cần in"}),e.jsx("input",{type:"number",min:"1",value:ke,onChange:S=>Se(Math.max(1,parseInt(S.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]})]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer select-none py-1",children:[e.jsx("input",{type:"checkbox",checked:Qe,onChange:S=>ve(S.target.checked),className:"w-4 h-4 rounded text-rose-600 border-slate-300 dark:border-slate-700 focus:ring-rose-500 bg-white dark:bg-slate-900"}),e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300",children:"Tự động nhảy số liên tục"})]}),e.jsxs("div",{className:"bg-white/80 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:[e.jsx("span",{className:"font-bold text-indigo-600 dark:text-indigo-400",children:"Gợi ý in:"})," ",ke," phiếu rút thăm sẽ được in trên ",e.jsxs("span",{className:"font-bold text-slate-800 dark:text-white",children:[Math.ceil(ke/4)," trang A4"]})," (mỗi trang 4 phiếu). Các số thứ tự sẽ tự động điền từ ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Oe})," đến ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Oe+ke-1}),"."]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-[11px] lg:text-xs",children:[e.jsx(Pt,{size:14}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:V,className:"hidden"})]}),e.jsx(Ye,{onClick:Y,variant:"secondary",className:"px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-[11px] lg:text-xs h-auto py-1.5 border-slate-200 dark:border-slate-600",children:"Reset"})]}),e.jsxs("div",{className:"p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1",children:[e.jsx(Qn,{size:12}),"Nhập từ File Mẫu"]}),e.jsxs("div",{className:"flex gap-1.5",children:[e.jsxs("button",{onClick:te,className:"flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Jn,{size:10}),"Tải File Mẫu"]}),e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Pt,{size:10}),"Nhập File Mẫu",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:K,className:"hidden"})]})]})]}),e.jsxs("div",{className:"p-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1",children:[e.jsx(cn,{size:12}),"Nhập file in giá từ ERP"]}),e.jsxs("div",{className:"grid grid-cols-1 gap-2",children:[e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Pt,{size:10}),"Máy Lọc Nước (Mẫu in 99)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:S=>ue(S,"purifier"),className:"hidden"})]}),e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Pt,{size:10}),"Điện Tử/Lạnh (Mẫu in 97)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:S=>ue(S,"appliance"),className:"hidden"})]})]})]}),d.length>0&&e.jsxs("div",{className:"mt-4 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-xs text-slate-800 dark:text-white",children:["Danh sách in (",me,"/",d.length,")"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>de(!0),className:"text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>de(!1),className:"text-[10px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:X,className:"text-[10px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx(Ot,{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:j,onChange:S=>M(S.target.value),className:"mb-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"}),e.jsx("div",{className:"space-y-2",children:Ae.map(S=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${S.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:S.selected,onChange:()=>ne(S.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:S.name,children:S.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:S.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:S.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:S.percent})]})]})]},S.id))})]})]}),e.jsxs("div",{className:"mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-2.5",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(rn,{size:13,className:"text-indigo-500"}),e.jsx("span",{className:"text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider",children:"H.Dẫn in & Sử dụng"})]}),e.jsxs("div",{className:"p-3 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-500 dark:text-slate-400",children:"CẤU HÌNH IN CHROME (CTRL + P):"}),e.jsxs("ul",{className:"space-y-1 text-[11px] text-slate-600 dark:text-slate-300",children:[e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Khổ giấy khuyên dùng: ",e.jsx("strong",{children:"A4"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Chọn: ",e.jsx("strong",{children:"Hiển thị đồ họa nền (Background graphics)"})]})]})]})]}),e.jsx("div",{className:"border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300",children:we==="draw"?e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Nhập nội dung ở phiếu số 1 (trang 1). Các phiếu còn lại tự động đồng bộ theo."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Nhảy số:"}),' Bật chế độ "Tự động nhảy số" để hệ thống tự động tăng dần từ số bắt đầu.']})]}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Click trực tiếp vào chữ trên sticker ở khung preview."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Tính % tự động:"})," Chỉ cần nhập Giá cũ & Giá mới."]})]})})]})]})]}),De==="queue"&&e.jsx("div",{className:"flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 pb-2",children:e.jsx(ir,{manualPages:r,savedLists:ae,showSavedLists:be,setShowSavedLists:ie,saveCurrentList:Ee,clearManualPages:le,loadPageToEditor:pe,removeManualPage:Q,loadSavedList:m,deleteSavedList:O,togglePageSelection:R,toggleAllPagesSelection:Z,discountThreshold:$e,handleDiscountThresholdChange:fe,activeQueuePageId:lt,setActiveQueuePageId:Re,discountDisplayMode:o,setDiscountDisplayMode:f,showBarcode:c,setShowBarcode:a,priceSource:re,setPriceSource:je})}),De==="history"&&e.jsx("div",{className:"space-y-2 animate-in fade-in duration-200 pb-2",children:ye.length===0?e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"Chưa có lịch sử in"}):ye.map(S=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group text-left",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:S.label}),e.jsxs("div",{className:"flex gap-1.5 mt-1 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(S.timestamp).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[S.pageCount," trang"]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:S.stickerType==="gia_soc"?"Giá Sốc":S.stickerType==="draw"?"Rút Thăm":"Giờ Vàng"})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>L(S),className:"p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors",title:"Khôi phục",children:e.jsx(ln,{size:13})}),e.jsx("button",{onClick:()=>ze(S.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},S.id))})]})]})},cr=({isOpen:r,onClose:d,onSave:c,defaultName:a})=>{const[o,f]=i.useState(a);if(!r)return null;const j=M=>{M.preventDefault(),o.trim()&&c(o.trim())};return e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4",children:e.jsx("div",{className:"bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden",children:e.jsxs("div",{className:"p-6",children:[e.jsx("h2",{className:"text-xl font-bold text-slate-800 mb-4",children:"Lưu Danh Sách"}),e.jsxs("form",{onSubmit:j,children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{htmlFor:"listName",className:"block text-sm font-medium text-slate-700 mb-1",children:"Tên danh sách"}),e.jsx("input",{type:"text",id:"listName",value:o,onChange:M=>f(M.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500",placeholder:"Nhập tên danh sách...",autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"flex justify-end gap-3 mt-6",children:[e.jsx("button",{type:"button",onClick:d,className:"px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors",children:"Hủy"}),e.jsx("button",{type:"submit",className:"px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors",children:"Lưu"})]})]})]})})})},dr=i.lazy(()=>xt(()=>import("./StickerEventApp-BqHlO3wr.js"),__vite__mapDeps([0,1,2,3,4,5,6]))),an="stickerPrinterState",Et="stickerPrintHistory",gt="stickerSavedLists",ur=r=>{if(!r)return"";let d=r;d=d.replace(/Máy lọc nước/gi,"MLN");const c=["RO nóng lạnh tủ đứng","\\(IMEI\\)","nước nóng lạnh","RO âm tủ","RO tủ đứng","điện giải nóng nguội","nóng lạnh RO","RO nóng nguội lạnh tủ đứng"];for(const a of c){const o=new RegExp(a,"gi");d=d.replace(o,"")}return d=d.replace(/\s+/g," ").trim(),d},Vt=(r,d)=>{let c=r.newPrice,a=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const o=Number(r.oldPrice.replace(/\D/g,""));let f=Number(r.servicePrice.replace(/\D/g,""));if(o>0&&f>0){f*1e3<=o*1.5&&f<o&&(f=f*1e3);const j=Math.round((f/o-1)*100);a=j<0?`${j}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const o=Number(r.oldPrice.replace(/\D/g,""));let f=Number(r.salePrice.replace(/\D/g,""));if(o>0&&f>0){f*1e3<=o*1.5&&f<o&&(f=f*1e3);const j=Math.round((f/o-1)*100);a=j<0?`${j}%`:""}}return{newPrice:c,percent:a}},Gt=(r,d,c,a,o="percent")=>{if(c==="draw")return`<div class="sticker-container" data-type="${c}" style="background-image:url('${a}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:2482/3512;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;"></div>`;let{newPrice:f,percent:j}=Vt(r,d),M=r.header,x=r.subHeader,I=r.footer;if(r.html&&(!M||!x||!I))try{const K=new DOMParser().parseFromString(r.html,"text/html"),te=K.querySelector(".header-text"),Y=K.querySelector(".sub-header"),de=K.querySelector(".footer-text");M===void 0&&te&&(M=te.textContent||""),x===void 0&&Y&&(x=Y.textContent||""),I===void 0&&de&&(I=de.textContent||"")}catch(V){console.error("Error parsing fallback fields from page.html:",V)}let F="";if(r.code)try{F=`<div class="barcode"><img src="${Wt(r.code)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${r.code}" /></div>`}catch(V){console.error("Barcode error:",V)}const U=c==="gio_vang"?`<div class="sub-header">${x||""}</div>`:"",k=`<div class="extra2">${f}</div>`;if(o==="amount"){const V=Number(String(r.oldPrice).replace(/\D/g,""));let K=Number(String(f).replace(/\D/g,""));if(V>0&&K>0){K*1e3<=V*1.5&&K<V&&(K=K*1e3);const te=V-K;te>0&&(j=`-${(te/1e3).toLocaleString("vi-VN")}K`)}}return`<div class="sticker-container" data-type="${c}" style="background-image:url('${a}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
        ${F}
        <div class="header-text">${M||""}</div>
        ${U}
        <div class="extra1">${j}</div>
        <div class="old">${r.oldPrice}</div>
        <div class="name">${r.label}</div>
        ${k}
        <div class="footer-text">${I||""}</div>
    </div>`},fr=(r,d)=>{if(r.stickerType!==d.stickerType||r.headerTextContent!==d.headerTextContent||r.subHeaderTextContent!==d.subHeaderTextContent||r.footerTextContent!==d.footerTextContent||r.showBarcode!==d.showBarcode||r.discountDisplayMode!==d.discountDisplayMode||r.pageCount!==d.pageCount||r.batchItems.length!==d.batchItems.length)return!1;for(let c=0;c<r.batchItems.length;c++){const a=r.batchItems[c],o=d.batchItems[c];if(a.name!==o.name||a.oldPrice!==o.oldPrice||a.newPrice!==o.newPrice||a.percent!==o.percent||a.imei!==o.imei||a.selected!==o.selected)return!1}if(r.manualPages.length!==d.manualPages.length)return!1;for(let c=0;c<r.manualPages.length;c++){const a=r.manualPages[c],o=d.manualPages[c];if(a.label!==o.label||a.oldPrice!==o.oldPrice||a.newPrice!==o.newPrice||a.percent!==o.percent||a.code!==o.code||a.header!==o.header||a.subHeader!==o.subHeader||a.footer!==o.footer||a.selected!==o.selected)return!1}return!0};function hr(){const{activeTab:r}=Ln(),{user:d}=qn(),[c,a]=i.useState(!1),[o,f]=i.useState("sticker"),[j,M]=i.useState(!1),[x,I]=i.useState("gia_soc"),[F,U]=i.useState("/frame/X24_NEW.png"),[k,V]=i.useState("sale"),[K,te]=i.useState([{id:"1",title:"",code:"1",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"2",title:"",code:"2",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"3",title:"",code:"3",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"4",title:"",code:"4",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""}]),[Y,de]=i.useState(1),[ne,X]=i.useState(4),[L,ze]=i.useState(!0),[ae,be]=i.useState(3.5),[ie,Ee]=i.useState(3.5),[le,pe]=i.useState(2.2),[Q,m]=i.useState(2.2),[O,R]=i.useState(2.5),[Z,$e]=i.useState(3.8),[fe,lt]=i.useState(3.8),[Re,De]=i.useState("header"),[Ne,re]=i.useState(8),[je,ue]=i.useState(13),[we,Oe]=i.useState(36.9),[qe,ke]=i.useState(14.2),[Se,Qe]=i.useState(3.6),[ve,me]=i.useState(26.5),[Ce,Ae]=i.useState(3.2),[ye,S]=i.useState("percent"),[Ve,yt]=i.useState(""),[We,Ke]=i.useState(null),[Je,Ue]=i.useState("data");i.useEffect(()=>{x==="draw"&&Je==="queue"&&Ue("data")},[x,Je]);const Nt=()=>{switch(Re){case"header":return"Tiêu đề";case"subHeader":return"Tiêu đề phụ";case"percent":return"% Giảm";case"oldPrice":return"Giá cũ";case"name":return"Tên SP";case"newPrice":return"Giá mới";case"footer":return"Khuyến mãi";default:return"Cỡ chữ"}},et=t=>{const s=window.getSelection();if(!s||s.rangeCount===0||s.isCollapsed)return!1;const n=s.getRangeAt(0);let p=n.commonAncestorContainer;p.nodeType===3&&(p=p.parentNode||p);let y=p,q=null;for(;y;){if(y.nodeType===1){const N=y;if(N.getAttribute("contenteditable")==="true"){q=N;break}}y=y.parentNode}if(q){const N=document.createElement("span");N.style.fontSize=`${t.toFixed(1)}cqw`;try{N.appendChild(n.extractContents()),n.insertNode(N);const b=new Event("input",{bubbles:!0});return q.dispatchEvent(b),!0}catch(b){console.error("Error applying font size to selection:",b)}}return!1},$t=()=>{switch(Re){case"header":return Ne;case"subHeader":return je;case"percent":return we;case"oldPrice":return qe;case"name":return Se;case"newPrice":return ve;case"footer":return Ce;default:return Ne}},ct=()=>{switch(Re){case"drawTitle":return O;case"drawContentTopLeft":return ae;case"drawContentTopRight":return ie;case"drawContentBottomLeft":return le;case"drawContentBottomRight":return Q;case"drawCode":return Z;case"drawFooter":return fe;default:return ae}},pt=t=>{const s=n=>typeof t=="function"?t(n):t;switch(Re){case"drawTitle":R(s);break;case"drawContentTopLeft":be(s);break;case"drawContentTopRight":Ee(s);break;case"drawContentBottomLeft":pe(s);break;case"drawContentBottomRight":m(s);break;case"drawCode":$e(s);break;case"drawFooter":lt(s);break;default:be(s)}},Dt=()=>{switch(Re){case"drawTitle":return"Cỡ chữ Tiêu đề";case"drawContentTopLeft":return"Cỡ chữ Giải thưởng trái";case"drawContentTopRight":return"Cỡ chữ Giải thưởng phải";case"drawContentBottomLeft":return"Cỡ chữ Thông tin trái";case"drawContentBottomRight":return"Cỡ chữ Thông tin phải";case"drawCode":return"Cỡ chữ Mã số";case"drawFooter":return"Cỡ chữ Siêu thị";default:return"Cỡ chữ Giải thưởng trái"}},u=t=>{const s=n=>{const p=typeof t=="function"?t(n):t;return Number(p.toFixed(1))};switch(Re){case"header":re(s);break;case"subHeader":ue(s);break;case"percent":Oe(s);break;case"oldPrice":ke(s);break;case"name":Qe(s);break;case"newPrice":me(s);break;case"footer":Ae(s);break}},[l,g]=i.useState([]),[h,v]=i.useState("QUẠT ĐIỀU HOÀ"),[w,E]=i.useState("0 SUẤT/NGÀY"),[A,ee]=i.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[oe,tt]=i.useState(""),[Fe,nt]=i.useState(!1),[jt,rt]=i.useState("123456"),[_e,Ie]=i.useState([]),[It,Mt]=i.useState([]),[dn,Kt]=i.useState(!1),[Rt,St]=i.useState([]),[un,Xt]=i.useState(!1),[dt,mt]=i.useState("Quạt điều hoà Daikiosan DMI03"),[_t,bt]=i.useState("5.490.000"),[Ht,st]=i.useState("3.490"),[Ze,fn]=i.useState(!1),[Yt,hn]=i.useState(!1),[Qt,Lt]=i.useState(!1);i.useEffect(()=>{Ze&&x==="draw"&&te(t=>{var p;const s=t[0]||{id:"1",title:"",code:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},n=[];for(let y=0;y<ne;y++){const q=L?(Y+y).toString():((p=t[y])==null?void 0:p.code)||"";y===0?n.push({...s,id:"1",code:L?Y.toString():s.code||"1"}):n.push({id:(y+1).toString(),title:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:"",code:q})}return n})},[Y,ne,L,x,Ze]),i.useEffect(()=>{const t=dt.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);if(t)rt(t[1]);else{const s=dt.match(/\(([A-Za-z0-9]+)\)/);s&&rt(s[1])}},[dt]),i.useEffect(()=>{if(!We)return;const t=_e.find(s=>s.id===We);if(t){const{newPrice:s}=Vt(t,k);st(s)}},[k,We,_e]),i.useEffect(()=>{const t=()=>hn(window.innerWidth<1024);return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const wt=t=>{try{const s=new URL(window.location.href);s.searchParams.set("sub",t),window.history.replaceState(null,"",s.toString())}catch(s){console.error("Failed to sync sub-tab to URL:",s)}};i.useEffect(()=>{a(!0);let s=new URLSearchParams(window.location.search).get("sub");s||(s="event",wt("event")),s==="gia-soc"?(f("sticker"),I("gia_soc"),v("QUẠT ĐIỀU HOÀ"),U("/frame/X24_NEW.png"),re(8)):s==="gio-vang"?(f("sticker"),I("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),U("/frame/GVO2-scaled.png"),re(8)):s==="draw"?(f("sticker"),I("draw"),U("/frame/bg_phieu.png")):s==="event"&&(f("event"),M(!0));const n=setTimeout(()=>{xt(()=>import("./StickerEventApp-BqHlO3wr.js"),__vite__mapDeps([0,1,2,3,4,5,6])).catch(p=>{console.warn("Failed to preload StickerEventApp:",p)})},1e3);return()=>clearTimeout(n)},[]),i.useEffect(()=>{let t=!0;async function s(){try{const n=await Tt(an);if(n&&t){const N=new URLSearchParams(window.location.search).get("sub");if(N?N==="gia-soc"?(f("sticker"),I("gia_soc")):N==="gio-vang"?(f("sticker"),I("gio_vang")):N==="draw"?(f("sticker"),I("draw")):N==="event"&&(f("event"),M(!0)):(n.stickerMode&&f(n.stickerMode),n.stickerType&&I(n.stickerType)),n.bgImage&&U(n.bgImage),n.headerTextContent&&v(n.headerTextContent),n.subHeaderTextContent&&E(n.subHeaderTextContent),n.footerTextContent&&ee(n.footerTextContent),n.showBarcode!=null&&nt(n.showBarcode),n.previewName&&mt(n.previewName),n.previewOldPrice&&bt(n.previewOldPrice),n.previewNewPrice){const _=String(n.previewNewPrice).replace(/\D/g,"");if(_){let C=Number(_);C>=1e5&&(C=Math.floor(C/1e3)),st(C.toLocaleString("vi-VN"))}else st(n.previewNewPrice)}n.discountDisplayMode&&S(n.discountDisplayMode),n.barcodeImei&&rt(n.barcodeImei),n.discountThreshold!=null&&yt(n.discountThreshold),n.searchTerm!=null&&tt(n.searchTerm);const b=(n.manualPages||[]).map(_=>{if(_.newPrice){const C=String(_.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{..._,newPrice:P.toLocaleString("vi-VN")}}}return _}),B=(n.batchItems||[]).map(_=>{if(_.newPrice){const C=String(_.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{..._,newPrice:P.toLocaleString("vi-VN")}}}return _});b.length===0&&B.length===0?Ue("data"):n.activeSubTab&&Ue(n.activeSubTab==="help"?"data":n.activeSubTab),Ie(b),g(B),n.priceSource&&V(n.priceSource),n.headerTextSize!=null&&re(n.headerTextSize),n.subHeaderTextSize!=null&&ue(n.subHeaderTextSize),n.percentTextSize!=null&&Oe(n.percentTextSize),n.oldPriceTextSize!=null&&ke(n.oldPriceTextSize),n.nameTextSize!=null&&Qe(n.nameTextSize),n.newPriceTextSize!=null&&me(n.newPriceTextSize),n.footerTextSize!=null&&Ae(n.footerTextSize),n.drawTickets&&te(n.drawTickets),n.drawStartNumber!=null&&de(n.drawStartNumber),n.drawTotalTickets!=null&&X(n.drawTotalTickets),n.drawAutoIncrement!=null&&ze(n.drawAutoIncrement),n.drawContentTopLeftSize!=null&&be(n.drawContentTopLeftSize),n.drawContentTopRightSize!=null&&Ee(n.drawContentTopRightSize),n.drawContentBottomLeftSize!=null&&pe(n.drawContentBottomLeftSize),n.drawContentBottomRightSize!=null&&m(n.drawContentBottomRightSize),n.drawTitleSize!=null&&R(n.drawTitleSize),n.drawCodeSize!=null&&$e(n.drawCodeSize),n.drawFooterSize!=null&&lt(n.drawFooterSize)}const p=await Tt(gt);p&&t&&St(p);const y=await Tt(Et);y&&t&&Mt(y)}catch(n){console.error("Error loading sticker data:",n)}finally{t&&fn(!0)}}return s(),()=>{t=!1}},[]),i.useEffect(()=>{const t=s=>{var n;((n=s.detail)==null?void 0:n.key)===gt&&Tt(gt).then(p=>{p&&St(p)})};return window.addEventListener("indexeddb-change",t),()=>window.removeEventListener("indexeddb-change",t)},[]),i.useEffect(()=>{if(!Ze)return;const t=setTimeout(async()=>{const s={stickerMode:o,stickerType:x,bgImage:F,headerTextContent:h,subHeaderTextContent:w,footerTextContent:A,showBarcode:Fe,previewName:dt,previewOldPrice:_t,previewNewPrice:Ht,discountDisplayMode:ye,headerTextSize:Ne,subHeaderTextSize:je,percentTextSize:we,oldPriceTextSize:qe,nameTextSize:Se,newPriceTextSize:ve,footerTextSize:Ce,barcodeImei:jt,discountThreshold:Ve,searchTerm:oe,activeQueuePageId:We,activeSubTab:Je,manualPages:_e,batchItems:l,priceSource:k,drawTickets:K,drawStartNumber:Y,drawTotalTickets:ne,drawAutoIncrement:L,drawContentTopLeftSize:ae,drawContentTopRightSize:ie,drawContentBottomLeftSize:le,drawContentBottomRightSize:Q,drawTitleSize:O,drawCodeSize:Z,drawFooterSize:fe,updatedAt:new Date().toISOString()};try{await at(an,s)}catch(n){console.error("IndexedDB save failed",n)}},500);return()=>clearTimeout(t)},[Ze,o,x,F,h,w,A,Fe,dt,_t,Ht,Ne,je,we,qe,Se,ve,Ce,ye,jt,Ve,oe,We,Je,_e,l,k,K,Y,ne,L,ae,ie,le,Q,O,Z,fe]),i.useEffect(()=>{if(!Ze)return;const t=setTimeout(async()=>{try{await at(gt,Rt)}catch(s){console.error("IndexedDB save savedLists failed",s)}},500);return()=>clearTimeout(t)},[Ze,Rt]),i.useEffect(()=>{if(!Ze)return;const t=setTimeout(async()=>{try{await at(Et,It)}catch(s){console.error("IndexedDB save printHistory failed",s)}},500);return()=>clearTimeout(t)},[Ze,It]);const ut=t=>{if(!t)return 0;const s=t.replace(/[^0-9]/g,""),n=parseInt(s,10);return isNaN(n)?0:n},gn=t=>{yt(t);const s=t.replace(/[^0-9]/g,""),n=parseInt(s,10);isNaN(n)?(Ie(p=>p.map(y=>({...y,selected:!0}))),g(p=>p.map(y=>({...y,selected:!0})))):(Ie(p=>p.map(y=>{const q=ut(y.percent);return{...y,selected:q>=n}})),g(p=>p.map(y=>{const q=ut(y.percent);return{...y,selected:q>=n}})))},xn=t=>{var p;const s=(p=t.target.files)==null?void 0:p[0];if(!s)return;const n=new FileReader;n.onload=async y=>{var q;try{const N=(q=y.target)==null?void 0:q.result,b=await xt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),B=b.read(N,{type:"binary"}),_=B.SheetNames[0],C=B.Sheets[_],P=b.utils.sheet_to_json(C,{header:1}),G=[];for(let D=0;D<P.length;D++){const $=P[D];if(!$||$.length<9)continue;const z=$[4]?String($[4]).trim():"",se=$[5]?String($[5]).trim():"",H=$[42]?String($[42]).trim():"";let J="";const he=H.toUpperCase();he.includes("IMEI:")?(J=H.substring(he.indexOf("IMEI:")+5).trim(),J=J.replace(/\)$/,"").trim()):he.includes("CODE:")?(J=H.substring(he.indexOf("CODE:")+5).trim(),J=J.replace(/\)$/,"").trim()):H&&/^[A-Za-z0-9]+$/.test(H)&&H.length>3&&(J=H);const Te=[z,se].filter(Boolean);H&&Te.push(H.startsWith("(")?H:`(${H})`);const T=Te.join(" ");if(!T||T==="TÊN SẢN PHẨM")continue;let W="";if($[8]){const xe=String($[8]).match(/\((-\d+%)\)/);xe&&(W=xe[1])}let ge="";if($[7]){const xe=String($[7]).replace(/\D/g,"");xe&&(ge=Number(xe).toLocaleString("vi-VN"))}let ce="";if($[6]){const xe=String($[6]).replace(/\D/g,"");xe&&(ce=Number(Math.floor(Number(xe)/1e3)).toLocaleString("vi-VN"))}const Be=Ve.replace(/[^0-9]/g,""),He=parseInt(Be,10),ot=isNaN(He)?!0:ut(W)>=He;G.push({id:`item_${D}_${Date.now()}`,name:T,oldPrice:ge,newPrice:ce,percent:W,imei:J,selected:ot})}if(g(G),Ue("data"),G.length>0){const D=G[0];mt(D.name),bt(D.oldPrice),st(D.newPrice),rt(D.imei)}}catch{Le.error("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},pn=async()=>{const t=await xt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),s=t.utils.book_new();let n,p,y,q;if(x==="gia_soc")n=["TIÊU ĐỀ","CODE","TÊN SẢN PHẨM","GIÁ GỐC","GIÁ GIẢM","KHUYẾN MÃI"],p=[["QUẠT ĐIỀU HOÀ","ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"],["TỦ LẠNH","DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"]],y="Sticker_Template_Gia_Soc.xlsx",q=[{wch:20},{wch:15},{wch:40},{wch:18},{wch:18},{wch:45}];else{const b=new Date,B=b.getDay(),_=B===0?7:B,C=new Date(b);C.setDate(b.getDate()+(5-_));const P=new Date(b);P.setDate(b.getDate()+(7-_));const G=se=>String(se).padStart(2,"0"),D=`${G(C.getDate())}/${G(C.getMonth()+1)}`,$=`${G(P.getDate())}/${G(P.getMonth()+1)}`,z=`TỪ ${D} ĐẾN ${$}`;n=["CODE","SẢN PHẨM","GIÁ NIÊM YẾT","GIÁ GIẢM","THỜI GIAN ÁP DỤNG","SỐ LƯỢNG SUẤT"],p=[["ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000",z,"5 SUẤT/NGÀY"],["DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000",z,"5 SUẤT/NGÀY"]],y="Sticker_Template_Gio_Vang.xlsx",q=[{wch:15},{wch:40},{wch:18},{wch:18},{wch:22},{wch:18}]}const N=t.utils.aoa_to_sheet([n,...p]);N["!cols"]=q,t.utils.book_append_sheet(s,N,"Template"),t.writeFile(s,y)},Jt=t=>{if(t==null)return 0;const s=String(t).replace(/[^0-9]/g,"");return s?Number(s):0},qt=t=>{var n,p,y,q,N,b,B;t.label&&mt(t.label),t.oldPrice&&bt(t.oldPrice),t.code&&rt(t.code),t.header!=null&&v(t.header),t.footer!=null&&ee(t.footer),t.subHeader!=null&&E(t.subHeader);const{newPrice:s}=Vt(t,k);if(st(s),!t.label&&t.html){const _=document.createElement("div");_.innerHTML=t.html;const C=_.querySelector(".sticker-container");if(C){const P=((n=C.querySelector(".header-text"))==null?void 0:n.textContent)||h,G=((p=C.querySelector(".name"))==null?void 0:p.textContent)||"",D=((y=C.querySelector(".old"))==null?void 0:y.textContent)||"",$=((q=C.querySelector(".extra2 span"))==null?void 0:q.textContent)||((N=C.querySelector(".extra2"))==null?void 0:N.textContent)||"",z=((b=C.querySelector(".footer-text"))==null?void 0:b.textContent)||A,se=((B=C.querySelector(".sub-header"))==null?void 0:B.textContent)||w;v(P),E(se),ee(z),bt(D),st($);const H=C.querySelector(".barcode img"),J=(H==null?void 0:H.getAttribute("alt"))||"";J&&rt(J),mt(G)}}g([])},mn=t=>{var p;const s=(p=t.target.files)==null?void 0:p[0];if(!s)return;const n=new FileReader;n.onload=async y=>{var q;try{const N=(q=y.target)==null?void 0:q.result,b=await xt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),B=b.read(N,{type:"binary"}),_=B.Sheets[B.SheetNames[0]],C=b.utils.sheet_to_json(_,{header:1});if(!C||C.length<2){Le.error("File không chứa đủ dữ liệu");return}const P=(C[0]||[]).map(T=>String(T).trim().toUpperCase());let G=-1,D=-1,$=-1,z=-1,se=-1,H=-1,J=-1;x==="gia_soc"?(G=P.findIndex(T=>T==="CODE"||T==="CODE:"),D=P.findIndex(T=>T==="TÊN SẢN PHẨM"||T==="SẢN PHẨM"),$=P.findIndex(T=>T==="GIÁ GỐC"||T==="GIÁ NIÊM YẾT"),z=P.indexOf("GIÁ GIẢM"),se=P.findIndex(T=>T==="TIÊU ĐỀ"||T==="THỜI GIAN ÁP DỤNG"),J=P.indexOf("KHUYẾN MÃI"),G===-1&&D===-1&&$===-1&&(se=0,G=1,D=2,$=3,z=4,J=5)):(G=P.findIndex(T=>T==="CODE"||T==="CODE:"),D=P.findIndex(T=>T==="SẢN PHẨM"||T==="TÊN SẢN PHẨM"),$=P.findIndex(T=>T==="GIÁ NIÊM YẾT"||T==="GIÁ GỐC"),z=P.indexOf("GIÁ GIẢM"),se=P.findIndex(T=>T==="THỜI GIAN ÁP DỤNG"||T==="TIÊU ĐỀ"),H=P.indexOf("SỐ LƯỢNG SUẤT"),G===-1&&D===-1&&$===-1&&(G=0,D=1,$=2,z=3,se=4,H=5));const he=C[1];if(he){let T=h,W=w,ge=A;if(se!==-1&&he[se]!=null){const ce=String(he[se]).trim();ce&&(T=ce)}if(H!==-1&&he[H]!=null){const ce=String(he[H]).trim();ce&&(W=ce)}if(J!==-1&&he[J]!=null){const ce=String(he[J]).trim();ce&&(ge=ce)}T!==h&&v(T),W!==w&&E(W),ge!==A&&ee(ge)}const Te=[];for(let T=1;T<C.length;T++){const W=C[T];if(!W||W.length<2)continue;const ge=G!==-1&&W[G]!=null?String(W[G]).trim():"",ce=D!==-1&&W[D]!=null?String(W[D]).trim():"";if(!ce)continue;const Be=$!==-1?Jt(W[$]):0,He=z!==-1?Jt(W[z]):0,ot=Be?Be.toLocaleString("vi-VN"):"",xe=He?Number(Math.floor(He/1e3)).toLocaleString("vi-VN"):"";let Xe="";Be>0&&He>0&&(Xe=`${Math.round((He/Be-1)*100)}%`);let Ge=h;if(se!==-1&&W[se]!=null){const Me=String(W[se]).trim();Me&&(Ge=Me)}let kt=w;if(H!==-1&&W[H]!=null){const Me=String(W[H]).trim();Me&&(kt=Me)}let ft=A;if(J!==-1&&W[J]!=null){const Me=String(W[J]).trim();Me&&(ft=Me)}let Ct="";if(ge)try{Ct=`<div class="barcode"><img src="${Wt(ge)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${ge}" /></div>`}catch(Me){console.error("Error generating barcode for template item:",Me)}const vt=x==="gio_vang"?`<div class="sub-header">${kt}</div>`:"";let ht="";x==="gio_vang"?ht=`<div class="extra2" style="display:flex;align-items:baseline;justify-content:center"><span>${xe}</span><span class="small-zeros">.000</span></div>`:ht=`<div class="extra2">${xe}</div>`;const Rn=`<div class="sticker-container" data-type="${x}" style="background-image:url('${F}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
                        ${Ct}
                        <div class="header-text">${Ge}</div>
                        ${vt}
                        <div class="extra1">${Xe}</div>
                        <div class="old">${ot}</div>
                        <div class="name">${ce}</div>
                        ${ht}
                        <div class="footer-text">${ft}</div>
                    </div>`,_n=Ve.replace(/[^0-9]/g,""),Zt=parseInt(_n,10),Hn=isNaN(Zt)?!0:ut(Xe)>=Zt;Te.push({id:`tpl_${T}_${Date.now()}`,html:Rn,label:ce.substring(0,50),oldPrice:ot,newPrice:xe,percent:Xe,timestamp:Date.now(),code:ge,selected:Hn,header:Ge,subHeader:kt,footer:ft})}if(Te.length===0){Le.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Ie(T=>[...T,...Te]),Ue("queue"),Te.length>0&&qt(Te[0]),Le.success(`Đã thêm ${Te.length} sticker vào hàng đợi in`)}catch{Le.error("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},Ft=t=>{if(t==null||t==="")return"";const s=String(t).replace(/\D/g,"");if(!s)return"";const n=Number(s);return Number(Math.floor(n/1e3)).toLocaleString("vi-VN")},bn=t=>{if(t==null||t==="")return"";const s=String(t).replace(/\D/g,"");return s?Number(s).toLocaleString("vi-VN"):""},wn=(t,s)=>{var y;const n=(y=t.target.files)==null?void 0:y[0];if(!n)return;const p=new FileReader;p.onload=async q=>{var N;try{const b=(N=q.target)==null?void 0:N.result,B=await xt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),_=B.read(b,{type:"binary"}),C=_.SheetNames[0],P=_.Sheets[C],G=B.utils.sheet_to_json(P,{header:1});if(!G||G.length<2){Le.error("File không chứa đủ dữ liệu");return}const D=[];for(let $=1;$<G.length;$++){const z=G[$];if(!z||z.length===0)continue;let se="",H="",J="",he="",Te="",T="",W="";if(s==="purifier"?(W="MÁY LỌC NƯỚC",se=z[55]!=null?String(z[55]).trim():"",H=z[44]!=null?String(z[44]).trim():"",J=z[33]!=null?String(z[33]).trim():"",he=z[20]!=null?String(z[20]).trim():"",Te=z[1]!=null?String(z[1]).trim():"",T=z[31]!=null?String(z[31]).trim():"",H&&(H=ur(H))):(W="DUY NHẤT HÔM NAY",se=z[28]!=null?String(z[28]).trim():"",H=z[27]!=null?String(z[27]).trim():"",J=z[16]!=null?String(z[16]).trim():"",he=z[17]!=null?String(z[17]).trim():"",Te=z[8]!=null?String(z[8]).trim():"",T=z[31]!=null?String(z[31]).trim():""),!H)continue;let ge=se;ge.includes("-")&&(ge=ge.split("-")[0].trim());const ce=bn(J),Be=Ft(he),He=Ft(Te),ot=k==="service"?He||Be:Be||He;let xe="";const Xe=Number(ce.replace(/\D/g,""));let Ge=Number(ot.replace(/\D/g,""));if(Xe>0&&Ge>0){Ge*1e3<=Xe*1.5&&Ge<Xe&&(Ge=Ge*1e3);const ht=Math.round((Ge/Xe-1)*100);xe=ht<0?`${ht}%`:""}const kt=Ve.replace(/[^0-9]/g,""),ft=parseInt(kt,10),Ct=isNaN(ft)?!0:ut(xe)>=ft,vt={id:`erp_${s}_${$}_${Date.now()}`,html:"",label:H,oldPrice:ce,newPrice:ot,percent:xe,timestamp:Date.now(),code:ge,selected:Ct,salePrice:Be,servicePrice:He,header:W,footer:T};vt.html=Gt(vt,k,x,F),D.push(vt)}if(D.length===0){Le.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Ie($=>[...$,...D]),Ue("queue"),D.length>0&&qt(D[0]),Le.success(`Đã thêm ${D.length} sticker vào hàng đợi in`)}catch(b){console.error(b),Le.error("Lỗi đọc file Excel ERP")}},p.readAsBinaryString(n),t.target.value=""},kn=t=>{g(s=>s.map(n=>n.id===t?{...n,selected:!n.selected}:n))},vn=t=>{g(s=>s.map(n=>({...n,selected:t})))},yn=()=>{var C,P,G,D;const t=document.getElementById("print-section");if(!t)return;const s=t.querySelector(".sticker-container");if(!s)return;const n=((C=s.querySelector(".name"))==null?void 0:C.textContent)||"Sticker",p=((P=s.querySelector(".old"))==null?void 0:P.textContent)||"",y=((G=s.querySelector(".extra2"))==null?void 0:G.textContent)||"",q=((D=s.querySelector(".extra1"))==null?void 0:D.textContent)||"",N=Ve.replace(/[^0-9]/g,""),b=parseInt(N,10),B=isNaN(b)?!0:ut(q)>=b,_={id:`page_${Date.now()}`,html:s.outerHTML,label:n.substring(0,50),oldPrice:p,newPrice:y,percent:q,timestamp:Date.now(),code:jt,selected:B,salePrice:y,header:h,footer:A,subHeader:w};Ie($=>[...$,_])},Nn=t=>{Ie(s=>s.filter(n=>n.id!==t)),We===t&&Ke(null)},jn=()=>{Ie([]),Ke(null)},Sn=t=>{Ie(s=>s.map(n=>n.id===t?{...n,selected:n.selected===!1}:n))},Cn=t=>{Ie(s=>s.map(n=>({...n,selected:t})))},Tn=()=>{_e.length!==0&&Lt(!0)},Pn=t=>{const s={id:`list_${Date.now()}`,name:t,pages:_e,timestamp:Date.now(),stickerType:x,headerTextContent:h};St(n=>{const p=[s,...n].slice(0,20);return at(gt,p).catch(()=>{}),p}),Lt(!1),Le.success(`Đã lưu danh sách "${t}" thành công!`)},zn=t=>{Ie(t.pages),t.stickerType&&I(t.stickerType),t.headerTextContent&&v(t.headerTextContent),Xt(!1),Ke(null)},En=t=>{St(s=>{const n=s.filter(p=>p.id!==t);return at(gt,n).catch(()=>{}),n})},$n=t=>{I(t.stickerType),U(t.bgImage),re(t.headerTextSize),t.subHeaderTextSize!=null&&ue(t.subHeaderTextSize),t.percentTextSize!=null&&Oe(t.percentTextSize),t.oldPriceTextSize!=null&&ke(t.oldPriceTextSize),t.nameTextSize!=null&&Qe(t.nameTextSize),t.newPriceTextSize!=null&&me(t.newPriceTextSize),t.footerTextSize!=null&&Ae(t.footerTextSize),g(t.batchItems),v(t.headerTextContent),E(t.subHeaderTextContent),ee(t.footerTextContent),nt(t.showBarcode),Ie(t.manualPages||[]),t.discountDisplayMode&&S(t.discountDisplayMode),Kt(!1),Ke(null)},Dn=t=>{Mt(s=>{const n=s.filter(p=>p.id!==t);return at(Et,n).catch(()=>{}),n})},In=()=>{g([]),tt(""),v("HÀNG TRƯNG BÀY"),ee("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),re(8),Ke(null)},Mn=()=>{const t=l.length>0?l.filter(N=>N.selected).length:_e.length===0?1:0,s=_e.filter(N=>N.selected!==!1),n=t+s.length;if(n===0){Le.error("Không có trang nào để in!");return}const p=document.createElement("div");if(p.id="print-host",p.innerHTML=`
            <style>
                #print-host .header-text { font-size: ${Ne}cqi !important; }
                #print-host .sub-header { font-size: ${je}cqi !important; }
                #print-host .extra1 { font-size: ${we}cqi !important; }
                #print-host .old { font-size: ${qe}cqi !important; }
                #print-host .name { font-size: ${Se}cqi !important; }
                #print-host .extra2 { font-size: ${ve}cqi !important; }
                #print-host .footer-text { font-size: ${Ce}cqi !important; }
                #print-host .sticker-container {
                    outline: ${x==="draw"?"none":"1.5px dashed #6366f1"};
                    outline-offset: 1px;
                }
            </style>
        `,l.length>0)l.filter(b=>b.selected).forEach(b=>{const B={id:b.id,html:"",label:b.name,oldPrice:b.oldPrice,newPrice:b.newPrice,percent:b.percent,timestamp:Date.now(),code:Fe?b.imei:void 0,header:h,subHeader:w,footer:A};p.insertAdjacentHTML("beforeend",Gt(B,k,x,F,ye))});else if(_e.length===0){const N=document.getElementById("print-section");N&&p.insertAdjacentHTML("beforeend",N.innerHTML)}s.forEach(N=>{let b=N.header||"",B=N.subHeader||"",_=N.footer||"";x==="gio_vang"?((!b||b==="SẢN PHẨM GIÁ SỐC"||b==="QUẠT ĐIỀU HOÀ"||!b.toUpperCase().startsWith("TỪ"))&&(b=h),(!B||!B.toUpperCase().includes("SUẤT"))&&(B=w)):x==="gia_soc"&&b&&(b.toUpperCase().startsWith("TỪ")||b.includes("/"))&&(b=h);const C={...N,header:b,subHeader:B,footer:_||A};p.insertAdjacentHTML("beforeend",Gt(C,k,x,F,ye))}),document.body.appendChild(p);const y=document.getElementById("root");y&&(y.style.display="none");const q={id:`history_${Date.now()}`,timestamp:Date.now(),label:h||"Sticker",pageCount:n,stickerType:x,bgImage:F,headerTextSize:Ne,subHeaderTextSize:je,percentTextSize:we,oldPriceTextSize:qe,nameTextSize:Se,newPriceTextSize:ve,footerTextSize:Ce,batchItems:l,headerTextContent:h,subHeaderTextContent:w,footerTextContent:A,showBarcode:Fe,manualPages:_e,discountDisplayMode:ye};Mt(N=>{const b=N.findIndex(C=>fr(C,q));let B;if(b!==-1){const C={...N[b],timestamp:Date.now()},P=N.filter((G,D)=>D!==b);B=[C,...P]}else B=[q,...N];const _=B.slice(0,20);return at(Et,_).catch(()=>{}),_}),setTimeout(()=>{window.print(),y&&(y.style.display=""),document.body.removeChild(p)},200)};return e.jsxs("div",{className:"print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden",children:[c&&r==="tools-print-sticker"&&document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")&&Fn.createPortal(e.jsxs("div",{className:"flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs("button",{onClick:()=>{f("sticker"),I("gia_soc"),v("QUẠT ĐIỀU HOÀ"),U("/frame/X24_NEW.png"),re(8),wt("gia-soc")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giá Sốc"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="gia_soc"&&e.jsx(zt,{size:14,className:"inline mr-1 text-indigo-600 dark:text-indigo-400"}),"Giá Sốc"]})]}),e.jsxs("button",{onClick:()=>{f("sticker"),I("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),U("/frame/GVO2-scaled.png"),re(8),wt("gio-vang")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giờ Vàng"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="gio_vang"&&e.jsx(zt,{size:14,className:"inline mr-1 text-amber-600 dark:text-amber-400"}),"Giờ Vàng"]})]}),e.jsxs("button",{onClick:()=>{f("sticker"),I("draw"),U("/frame/bg_phieu.png"),wt("draw"),De("drawContentTopLeft")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="draw"?"bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Rút Thăm"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="draw"&&e.jsx(zt,{size:14,className:"inline mr-1 text-rose-600 dark:text-rose-400"}),"Phiếu Rút Thăm"]})]}),e.jsxs("button",{onClick:()=>{f("event"),M(!0),wt("event")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="event"?"bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Event"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="event"&&e.jsx(zt,{size:14,className:"inline mr-1 text-emerald-600 dark:text-emerald-400"}),e.jsx(cn,{size:14,className:"inline mr-1"}),"Event - Tồn kho"]})]})]}),o==="sticker"&&e.jsxs("div",{className:"flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400",children:x==="draw"?`${Dt()}:`:`${Nt()}:`}),e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]",children:[e.jsx("button",{onMouseDown:t=>t.preventDefault(),onClick:()=>{if(x==="draw"){const t=ct(),s=Math.max(1,t-.2);pt(s),et(s)}else u(t=>Math.max(1,t-.2))},className:"px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center",children:x==="draw"?ct().toFixed(1):$t()}),e.jsx("button",{onMouseDown:t=>t.preventDefault(),onClick:()=>{if(x==="draw"){const s=ct()+.2;pt(s),et(s)}else u(t=>t+.2)},className:"px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})]})]}),document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")),j&&e.jsx("div",{className:`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-200 ${o==="event"?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,children:e.jsx(Un,{name:"Event - Tồn kho",children:e.jsx(i.Suspense,{fallback:e.jsx("div",{className:"w-full h-full flex items-center justify-center bg-slate-50",children:e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx("div",{className:"w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"}),e.jsx("p",{className:"text-sm text-slate-500 font-medium",children:"Đang tải Event - Tồn kho..."})]})}),children:e.jsx(dr,{})})})}),e.jsxs("div",{className:`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${o==="event"?"invisible":"visible"}`,children:[e.jsx("div",{className:"flex flex-col gap-4 w-full max-w-sm shrink-0",children:e.jsx(sr,{batchItems:l,stickerType:x,showBarcode:Fe,discountDisplayMode:ye,headerTextContent:h,subHeaderTextContent:w,footerTextContent:A,barcodeImei:jt,bgImage:F,headerTextSize:Ne,subHeaderTextSize:je,percentTextSize:we,oldPriceTextSize:qe,nameTextSize:Se,newPriceTextSize:ve,footerTextSize:Ce,previewName:dt,previewOldPrice:_t,previewNewPrice:Ht,setPreviewOldPrice:bt,setPreviewNewPrice:st,activeField:Re,setActiveField:De,setHeaderTextContent:v,setSubHeaderTextContent:E,setFooterTextContent:ee,setBarcodeImei:rt,setPreviewName:mt,drawTickets:K,setDrawTickets:te,drawAutoIncrement:L,drawContentTopLeftSize:ae,drawContentTopRightSize:ie,drawContentBottomLeftSize:le,drawContentBottomRightSize:Q,drawTitleSize:O,drawCodeSize:Z,drawFooterSize:fe})}),e.jsx(lr,{manualPages:_e,batchItems:l,savedLists:Rt,showSavedLists:un,setShowSavedLists:Xt,saveCurrentList:Tn,clearManualPages:jn,loadPageToEditor:qt,removeManualPage:Nn,loadSavedList:zn,deleteSavedList:En,togglePageSelection:Sn,toggleAllPagesSelection:Cn,showBarcode:Fe,setShowBarcode:nt,discountDisplayMode:ye,setDiscountDisplayMode:S,searchTerm:oe,setSearchTerm:tt,printHistory:It,showHistory:dn,setShowHistory:Kt,handlePrint:Mn,addCurrentPage:yn,handleExcelUpload:xn,handleTemplateUpload:mn,downloadTemplate:pn,handleReset:In,toggleAllSelection:vn,toggleItemSelection:kn,clearBatchItems:()=>g([]),restoreHistory:$n,deleteHistory:Dn,discountThreshold:Ve,handleDiscountThresholdChange:gn,activeQueuePageId:We,setActiveQueuePageId:Ke,activeSubTab:Je,setActiveSubTab:Ue,priceSource:k,setPriceSource:V,handleErpPriceUpload:wn,stickerType:x,drawStartNumber:Y,setDrawStartNumber:de,drawTotalTickets:ne,setDrawTotalTickets:X,drawAutoIncrement:L,setDrawAutoIncrement:ze})]}),Qt&&e.jsx(cr,{isOpen:Qt,onClose:()=>Lt(!1),onSave:Pn,defaultName:`DS ${new Date().toLocaleDateString("vi-VN")}`})]})}const mr=Object.freeze(Object.defineProperty({__proto__:null,default:hr},Symbol.toStringTag,{value:"Module"}));export{cr as S,mr as a};
