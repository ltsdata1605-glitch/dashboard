const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/StickerEventApp-BUSzzcxV.js","assets/index-DbcZqmYF.js","assets/vendor-ui-BoQAhSeD.js","assets/vendor-charts-B95VUJRi.js","assets/vendor-firebase-Bpyixda8.js","assets/index-DpETtoxy.css","assets/uiService-DnbGRoV6.js"])))=>i.map(i=>d[i]);
import{j as e,B as $,b as Ot,u as Ln,a as qn,_ as pt,s as ot,E as Un,e as Tt,z as qe}from"./index-DbcZqmYF.js";import{e as it,a as i,B as Bn,j as Gn,k as On,P as en,l as tn,X as Ut,m as nn,n as An,i as At,o as Vn,p as Wn,q as Kn,s as ln,t as Xn,u as Yn,v as rn,w as Pt,F as Qn,D as Jn,x as cn,f as zt}from"./vendor-ui-BoQAhSeD.js";import{r as Fn}from"./vendor-charts-B95VUJRi.js";const Zn=104,er=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]],tr=[2,3,3,1,1,1,2];function nr(r){const d=[Zn];for(let s=0;s<r.length;s++){const h=r.charCodeAt(s)-32;h<0||h>95||d.push(h)}let c=d[0];for(let s=1;s<d.length;s++)c+=d[s]*s;c%=103,d.push(c);const o=d.map(s=>er[s]);return o.push(tr),o}function Wt(r,d=40,c="#000"){if(!r)return"";const o=nr(r);let s=0;for(const B of o)for(const k of B)s+=k;const h=10,j=s+h*2,R=3,p=document.createElement("canvas");p.width=j*R,p.height=d*R;const M=p.getContext("2d");if(!M)return"";M.fillStyle="#fff",M.fillRect(0,0,p.width,p.height),M.fillStyle=c;let Z=h*R;for(const B of o)for(let k=0;k<B.length;k++){const W=B[k]*R;k%2===0&&M.fillRect(Z,0,W,p.height),Z+=W}return p.toDataURL("image/png")}function an({value:r,height:d=40,barColor:c="#000",className:o,style:s}){const[h,j]=it.useState("");return i.useEffect(()=>{if(r)try{const R=Wt(r,d,c);j(R)}catch(R){console.error("Error generating barcode data URL:",R)}},[r,d,c]),!r||!h?null:e.jsx("img",{src:h,className:o,style:{imageRendering:"pixelated",width:"100%",height:"100%",objectFit:"fill",...s},alt:r})}const rr=it.memo(({ticket:r,firstTicket:d,onChange:c,index:o,drawContentTopLeftSize:s,drawContentTopRightSize:h,drawContentBottomLeftSize:j,drawContentBottomRightSize:R,drawTitleSize:p,drawCodeSize:M,drawFooterSize:Z,activeField:B,setActiveField:k,isAutoIncrement:W,totalIndex:X})=>{const ne=i.useCallback(_=>{c({title:_})},[c]),Q=i.useCallback(_=>{c({code:_})},[c]),ue=i.useCallback(_=>{c({footer:_})},[c]),re=i.useCallback(_=>{c({contentTop:_})},[c]),Y=i.useCallback(_=>{c({contentBottom:_})},[c]),q=i.useCallback(_=>{c({contentTopRight:_})},[c]),Ee=i.useCallback(_=>{c({contentBottomRight:_})},[c]),ie=ze(r.title,ne,!0),we=ze(r.code,Q,!0),le=ze(r.footer,ue,!0),$e=ze(r.contentTop||"",re,!0),ce=ze(r.contentTopRight||"",q,!0),me=ze(r.contentBottom||"",Y,!0),J=ze(r.contentBottomRight||"",Ee,!0),m=X!==void 0?X===0:o===0,A=d||r;return e.jsxs("div",{className:"draw-ticket-block","data-index":o,children:[m?e.jsx("div",{ref:ie.ref,onInput:ie.handleInput,onClick:()=>k==null?void 0:k("drawTitle"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-title-single animate-pulse-once ${B==="drawTitle"?"active-field":""}`,style:{fontSize:`${Math.min(p||2.5,3)}cqw`},"data-placeholder":"Nhập tiêu đề..."}):e.jsx("div",{className:"display-title-single",style:{fontSize:`${Math.min(p||2.5,3)}cqw`},dangerouslySetInnerHTML:{__html:A.title}}),m?e.jsx("div",{ref:$e.ref,onInput:$e.handleInput,onClick:()=>k==null?void 0:k("drawContentTopLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-left ${B==="drawContentTopLeft"?"active-field":""}`,style:{fontSize:`${s||3.5}cqw`},"data-placeholder":"Nhập thông tin 1 (Họ tên, SĐT...)"}):e.jsx("div",{className:"display-content-top-left",style:{fontSize:`${s||3.5}cqw`},dangerouslySetInnerHTML:{__html:A.contentTop||""}}),m?e.jsx("div",{ref:ce.ref,onInput:ce.handleInput,onClick:()=>k==null?void 0:k("drawContentTopRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-right ${B==="drawContentTopRight"?"active-field":""}`,style:{fontSize:`${h||3.5}cqw`},"data-placeholder":"Nhập thông tin 3 (Tự gõ...)"}):e.jsx("div",{className:"display-content-top-right",style:{fontSize:`${h||3.5}cqw`},dangerouslySetInnerHTML:{__html:A.contentTopRight||""}}),W?e.jsx("div",{className:"display-code-left",style:{fontSize:`${M||3.8}cqw`},children:r.code}):e.jsx("div",{ref:we.ref,onInput:we.handleInput,onClick:()=>k==null?void 0:k("drawCode"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-code-left ${B==="drawCode"?"active-field":""}`,style:{fontSize:`${M||3.8}cqw`},"data-placeholder":"Số"}),e.jsx("div",{className:"display-code-right",style:{fontSize:`${M||3.8}cqw`},children:r.code}),m?e.jsx("div",{ref:me.ref,onInput:me.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-left ${B==="drawContentBottomLeft"?"active-field":""}`,style:{fontSize:`${j||2.2}cqw`},"data-placeholder":"Nhập thông tin 2 (Địa chỉ...)"}):e.jsx("div",{className:"display-content-bottom-left",style:{fontSize:`${j||2.2}cqw`},dangerouslySetInnerHTML:{__html:A.contentBottom||""}}),m?e.jsx("div",{ref:J.ref,onInput:J.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-right ${B==="drawContentBottomRight"?"active-field":""}`,style:{fontSize:`${R||2.2}cqw`},"data-placeholder":"Nhập thông tin 4 (Tự gõ...)"}):e.jsx("div",{className:"display-content-bottom-right",style:{fontSize:`${R||2.2}cqw`},dangerouslySetInnerHTML:{__html:A.contentBottomRight||""}}),m?e.jsx("div",{ref:le.ref,onInput:le.handleInput,onClick:()=>k==null?void 0:k("drawFooter"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-footer-left ${B==="drawFooter"?"active-field":""}`,style:{fontSize:`${Z||3.8}cqw`},"data-placeholder":"Nhập tên siêu thị..."}):e.jsx("div",{className:"display-footer-left",style:{fontSize:`${Z||3.8}cqw`},dangerouslySetInnerHTML:{__html:A.footer}})]})});function ze(r,d,c=!1){const o=i.useRef(null),s=i.useRef(null);i.useEffect(()=>{o.current&&o.current!==s.current&&(s.current=o.current,(c?o.current.innerHTML:o.current.innerText)!==r&&(c?o.current.innerHTML=r:o.current.innerText=r))}),i.useEffect(()=>{o.current&&document.activeElement!==o.current&&(c?o.current.innerHTML:o.current.innerText)!==r&&(c?o.current.innerHTML=r:o.current.innerText=r)},[r,c]);const h=i.useCallback(j=>{d==null||d(c?j.currentTarget.innerHTML:j.currentTarget.innerText)},[d,c]);return{ref:o,handleInput:h}}const sn=(r,d)=>{const c=Number(r.replace(/\D/g,""));let o=Number(d.replace(/\D/g,""));if(c<=0||o<=0)return null;o*1e3<=c*1.5&&o<c&&(o=o*1e3);const s=c-o;if(s<=0)return null;let h="",j="";if(s<1e6)h=(s/1e3).toString(),j="K";else{const R=s/1e6;h=Number(R.toFixed(1)).toString(),j="triệu"}return e.jsxs("span",{className:"discount-amount font-bold",children:[e.jsx("span",{className:"discount-label",children:"-"}),e.jsx("span",{className:"discount-num",children:h}),e.jsx("span",{className:`discount-unit ${j==="triệu"?"unit-trieu":"unit-k"}`,children:j})]})},Bt=(r,d)=>{const c=Number(r.replace(/\D/g,""));let o=Number(d.replace(/\D/g,""));if(c<=0||o<=0)return null;o*1e3<=c*1.5&&o<c&&(o=o*1e3);const s=Math.round((o/c-1)*100);return s<0?`${s}%`:""},ar=({batchItems:r,stickerType:d,showBarcode:c,discountDisplayMode:o,headerTextContent:s,subHeaderTextContent:h,footerTextContent:j,barcodeImei:R,bgImage:p,headerTextSize:M,subHeaderTextSize:Z,percentTextSize:B,oldPriceTextSize:k,nameTextSize:W,newPriceTextSize:X,footerTextSize:ne,previewName:Q,previewOldPrice:ue,previewNewPrice:re,activeField:Y,setActiveField:q,setHeaderTextContent:Ee,setSubHeaderTextContent:ie,setFooterTextContent:we,setBarcodeImei:le,setPreviewName:$e,setPreviewOldPrice:ce,setPreviewNewPrice:me,updateBatchItem:J,drawTickets:m=[],setDrawTickets:A,drawContentTopLeftSize:_,drawContentTopRightSize:ee,drawContentBottomLeftSize:De,drawContentBottomRightSize:ge,drawTitleSize:lt,drawCodeSize:_e,drawFooterSize:Ie,drawAutoIncrement:je})=>{const[ae,Se]=it.useState(0),he=Math.ceil((m||[]).length/4);it.useEffect(()=>{ae>=he&&Se(0)},[m==null?void 0:m.length,he,ae]);const ke=i.useRef(null),Ae=i.useRef(new Map),Ue=i.useCallback(u=>{const l=Ae.current;let f=l.get(u);return f||(f=g=>{A==null||A(v=>v.map((w,E)=>E===u?{...w,...g}:w))},l.set(u,f)),f},[A]),[ve,Ce]=it.useState(null),[Qe,ye]=it.useState(null),be=i.useRef(null);it.useEffect(()=>{const u=()=>{const l=window.getSelection();if(!l||l.rangeCount===0||l.isCollapsed){Ce(null),ye(null);return}const f=l.getRangeAt(0);let g=f.commonAncestorContainer;g.nodeType===3&&(g=g.parentNode||g);let v=g,w=!1;for(;v;){if(v.nodeType===1&&v.getAttribute("contenteditable")==="true"){w=!0;break}v=v.parentNode}if(!w){Ce(null),ye(null);return}be.current=f.cloneRange();const E=f.getClientRects();if(E.length>0){const V=E[0];Ce({top:V.top+window.scrollY-50,left:V.left+window.scrollX+V.width/2})}else Ce(null),ye(null)};return document.addEventListener("selectionchange",u),()=>{document.removeEventListener("selectionchange",u)}},[]);const Te=(u,l)=>{let f=be.current;const g=window.getSelection();if(!f&&g&&g.rangeCount>0&&(f=g.getRangeAt(0)),!f)return;let v=f.commonAncestorContainer;v.nodeType===3&&(v=v.parentNode||v);let w=v,E=null;for(;w;){if(w.nodeType===1&&w.getAttribute("contenteditable")==="true"){E=w;break}w=w.parentNode}if(!E)return;E.focus();let V=l;if(u==="fontFamily"&&(V=l.replace(/['"]/g,"")),f.collapsed)try{const oe=E.innerHTML,tt=u==="fontFamily"?"font-family":u;E.innerHTML=`<span style="${tt}: ${l}">${oe}</span>`;const Fe=new Event("input",{bubbles:!0});E.dispatchEvent(Fe);const nt=document.createRange();nt.selectNodeContents(E),g&&(g.removeAllRanges(),g.addRange(nt)),be.current=nt;return}catch(oe){console.error("Error applying custom style to container:",oe)}g&&(g.removeAllRanges(),g.addRange(f));const te=document.createElement("span");te.style[u]=V;try{te.appendChild(f.extractContents()),f.insertNode(te);const oe=document.createRange();oe.selectNodeContents(te),g&&(g.removeAllRanges(),g.addRange(oe)),be.current=oe;const tt=new Event("input",{bubbles:!0});E.dispatchEvent(tt)}catch(oe){console.error("Error applying custom style to selection:",oe)}},Ve=u=>{let l=be.current;const f=window.getSelection();l&&f&&(f.removeAllRanges(),f.addRange(l)),document.execCommand(u,!1),f&&f.rangeCount>0&&(be.current=f.getRangeAt(0).cloneRange());const g=window.getSelection();if(!g||g.rangeCount===0)return;let w=g.getRangeAt(0).commonAncestorContainer;w.nodeType===3&&(w=w.parentNode||w);let E=w;for(;E;){if(E.nodeType===1&&E.getAttribute("contenteditable")==="true"){const V=new Event("input",{bubbles:!0});E.dispatchEvent(V);break}E=E.parentNode}},Ne=ze(ue,ce),S=ze(re,me),We=u=>{et(u),Ne.handleInput(u)},yt=u=>{et(u),S.handleInput(u)},Ke=i.useCallback(u=>{$e(u)},[$e]),Xe=ze(Q,Ke),Je=ze(s,Ee),Be=ze(h,ie),Nt=ze(j,we),et=u=>{const l=u.currentTarget,f=l.innerText;if(/[a-zA-Z]/.test(f))return;const g=f.replace(/\D/g,"");if(!g)return;let v=parseInt(g,10);l.classList.contains("extra2")&&v>=1e5&&(v=Math.floor(v/1e3));const E=v.toLocaleString("vi-VN");if(f!==E){l.innerText=E;const te=document.createRange(),oe=window.getSelection();oe&&(te.selectNodeContents(l),te.collapse(!1),oe.removeAllRanges(),oe.addRange(te))}const V=l.closest(".sticker-container");V&&$t(V)},$t=u=>{const l=u.querySelector(".old"),f=u.querySelector(".extra2"),g=u.querySelector(".extra1");if(!l||!f||!g)return;const v=Number(l.innerText.replace(/\D/g,""));let w=Number(f.innerText.replace(/\D/g,""));if(v>0&&w>0)if(w*1e3<=v*1.5&&w<v&&(w=w*1e3),o==="amount"){const E=v-w;if(E>0){let V="",te="";E<1e6?(V=(E/1e3).toString(),te="K"):(V=Number((E/1e6).toFixed(1)).toString(),te="triệu");const oe=te==="triệu"?"unit-trieu":"unit-k";g.innerHTML=`<span class="discount-amount font-bold"><span class="discount-label">-</span><span class="discount-num">${V}</span><span class="discount-unit ${oe}">${te}</span></span>`}else g.innerText=""}else{const E=Math.round((w/v-1)*100);E<0?g.innerText=`${E}%`:g.innerText=""}},ct=()=>{const u=window.getSelection();if(!u||u.rangeCount===0)return 3.5;let f=u.getRangeAt(0).commonAncestorContainer;f.nodeType===Node.TEXT_NODE&&(f=f.parentElement);const g=f==null?void 0:f.closest('span[style*="font-size"]');if(g){const w=g.style.fontSize.match(/([\d.]+)/);if(w)return parseFloat(w[1])}return 3.5},xt=u=>{const l=ct(),f=Math.max(.5,Math.min(20,parseFloat((l+u).toFixed(1))));if(Te("fontSize",`${f}cqw`),be.current){const g=window.getSelection();g&&(g.removeAllRanges(),g.addRange(be.current))}},Dt=u=>{const l=parseFloat(u);!isNaN(l)&&l>0&&Te("fontSize",`${l}cqw`)};return e.jsxs("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-sm mx-auto overflow-hidden no-print-bg",children:[e.jsx("style",{children:i.useMemo(()=>`
                .sticker-container {
                    width: 100%;
                    aspect-ratio: ${d==="draw"?"2482 / 3512":"197 / 285"};
                    position: relative;
                    background-color: white;
                    background-image: url('${p}');
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
                    font-size: ${M}cqw;
                    font-weight: 900;
                    top: 4.3%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${p==="/frame/X24.png"?"none":"flex"};
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .extra1 {
                    font-size: ${B}cqw;
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
                    font-size: ${W}cqw;
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
                    font-size: ${X}cqw;
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
                    font-size: ${M}cqw;
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
                    font-size: ${Z}cqw;
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
                    font-size: ${W}cqw;
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
                    font-size: ${X}cqw;
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
                       height: 18.0%;
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
                       white-space: nowrap;
                       line-height: 1.4;
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
                      line-height: 1.15;
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
                       height: 18.0%;
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
                       white-space: nowrap;
                       line-height: 1.4;
                  }
                  .draw-ticket-block .input-title-single *,
                  .draw-ticket-block .display-title-single * {
                      margin: 0 !important;
                      padding: 0 !important;
                      line-height: 1.4 !important;
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
                      line-height: 1.15;
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

                     /* Khống chế font-size tuyệt đối khi in để tránh Chrome Print Engine phóng to sai lệch */
                     .draw-ticket-block .input-title-single,
                      .draw-ticket-block .display-title-single {
                          font-size: 13pt !important;
                          line-height: 1.4 !important;
                          white-space: nowrap !important;
                     }
                     .draw-ticket-block .input-content-top-left,
                     .draw-ticket-block .display-content-top-left {
                         font-size: 9.5pt !important;
                          line-height: 1.15 !important;
                     }
                     .draw-ticket-block .input-content-bottom-left,
                     .draw-ticket-block .display-content-bottom-left {
                         font-size: 8.5pt !important;
                         line-height: 1.3 !important;
                     }
                     .draw-ticket-block .input-code-left,
                     .draw-ticket-block .display-code-left,
                     .draw-ticket-block .display-code-right {
                         font-size: 14pt !important;
                         line-height: 1.1 !important;
                     }
                     .draw-ticket-block .input-footer-left,
                     .draw-ticket-block .display-footer-left {
                         font-size: 13pt !important;
                         line-height: 1.2 !important;
                     }
                 }
                 `,[d,p,M,B,W,k,X,ne,Z])}),e.jsxs("div",{id:"print-section",className:"w-full",children:[d==="draw"?(()=>{const u=[];for(let l=0;l<m.length;l+=4)u.push(m.slice(l,l+4));return u.map((l,f)=>e.jsx("div",{className:`sticker-container draw-page ${f===ae?"active-preview-page":""}`,"data-type":"draw",style:{backgroundImage:`url(${p})`,pageBreakAfter:f<u.length-1?"always":"auto",marginBottom:f<u.length-1?"20px":"0"},children:l.map((g,v)=>{const w=f*4+v;return e.jsx(rr,{index:v,ticket:g,firstTicket:m[0],isAutoIncrement:je,drawContentTopLeftSize:_,drawContentTopRightSize:ee,drawContentBottomLeftSize:De,drawContentBottomRightSize:ge,drawTitleSize:lt,drawCodeSize:_e,drawFooterSize:Ie,activeField:Y,setActiveField:q,totalIndex:w,onChange:Ue(w)},g.id||w)})},f))})():r.length>0?e.jsxs(e.Fragment,{children:[r.filter(u=>u.selected).slice(0,20).map((u,l,f)=>e.jsxs("div",{className:"sticker-container","data-type":d,style:{pageBreakAfter:l<f.length-1?"always":"auto",backgroundImage:`url(${p})`},children:[c&&u.imei&&e.jsx("div",{className:"barcode",children:e.jsx(an,{value:u.imei})}),e.jsx("div",{className:`header-text ${Y==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("header"),onBlur:g=>Ee(g.currentTarget.innerText),children:s}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${Y==="subHeader"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("subHeader"),onBlur:g=>ie(g.currentTarget.innerText),children:h}),e.jsx("div",{className:`extra1 ${Y==="percent"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("percent"),onBlur:g=>J==null?void 0:J(u.id,{percent:g.currentTarget.innerText}),children:o==="amount"&&sn(u.oldPrice,u.newPrice)||u.percent},o),e.jsx("div",{className:`old ${Y==="oldPrice"?"active-field":""}`,onInput:et,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("oldPrice"),onBlur:g=>{const v=g.currentTarget.innerText,w=Bt(v,u.newPrice)||"";J==null||J(u.id,{oldPrice:v,percent:w})},children:u.oldPrice}),e.jsx("div",{className:`name ${Y==="name"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("name"),onBlur:g=>J==null?void 0:J(u.id,{name:g.currentTarget.innerText}),children:u.name}),e.jsx("div",{className:`extra2 ${Y==="newPrice"?"active-field":""}`,onInput:et,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("newPrice"),onBlur:g=>{const v=g.currentTarget.innerText,w=Bt(u.oldPrice,v)||"";J==null||J(u.id,{newPrice:v,percent:w})},children:u.newPrice}),e.jsx("div",{className:`footer-text ${Y==="footer"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("footer"),onBlur:g=>we(g.currentTarget.innerText),children:j})]},u.id)),r.filter(u=>u.selected).length>20&&e.jsxs("div",{className:"w-full py-4 text-center text-sm font-medium text-slate-500 bg-white/50 rounded-lg border border-slate-200 mt-4 shadow-sm",children:[e.jsx("span",{className:"text-indigo-600 font-bold",children:"Chế độ xem trước:"})," Đang hiển thị 20 sticker đầu tiên (trong tổng số ",r.filter(u=>u.selected).length," sticker).",e.jsx("br",{}),e.jsx("i",{children:"Tất cả sticker sẽ được in đầy đủ khi bấm nút IN."})]})]}):e.jsxs("div",{className:"sticker-container","data-type":d,style:{backgroundImage:`url(${p})`},children:[c&&R&&e.jsx("div",{className:"barcode",children:e.jsx(an,{value:R})}),e.jsx("div",{className:`header-text ${Y==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},ref:Je.ref,onInput:Je.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("header")}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${Y==="subHeader"?"active-field":""}`,ref:Be.ref,onInput:Be.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("subHeader")}),e.jsx("div",{className:`extra1 ${Y==="percent"?"active-field":""}`,ref:ke,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("percent"),children:o==="amount"?sn(ue,re):Bt(ue,re)},o),e.jsx("div",{className:`old ${Y==="oldPrice"?"active-field":""}`,ref:Ne.ref,onInput:We,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("oldPrice")}),e.jsx("div",{className:`name ${Y==="name"?"active-field":""}`,ref:Xe.ref,onInput:Xe.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("name")}),e.jsx("div",{className:`extra2 ${Y==="newPrice"?"active-field":""}`,ref:S.ref,onInput:yt,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("newPrice")}),e.jsx("div",{className:`footer-text ${Y==="footer"?"active-field":""}`,ref:Nt.ref,onInput:Nt.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>q("footer")})]}),(()=>{const u=ve?ve.top-window.scrollY<180:!1;return ve&&e.jsxs("div",{className:"fixed z-[9999] -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden",style:{top:`${ve.top}px`,left:`${ve.left}px`},onMouseDown:l=>{l.preventDefault()},children:[e.jsxs("div",{className:"relative",children:[e.jsxs($,{variant:"ghost",onMouseDown:l=>l.preventDefault(),onClick:()=>ye(Qe==="font"?null:"font"),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto text-white text-[11px] font-semibold px-2 py-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border-r border-slate-700/80 mr-0.5",children:["Font ",e.jsx("span",{className:"text-[7px] opacity-75",children:"▼"})]}),Qe==="font"&&e.jsx("div",{onMouseDown:l=>l.preventDefault(),className:`absolute left-0 mb-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 flex flex-col min-w-[150px] max-h-[200px] overflow-y-auto z-[10000] scrollbar-thin overflow-x-hidden ${u?"top-full mt-2":"bottom-full mb-2"}`,children:[{name:"UTM Avo",val:"UTM Avo, sans-serif"},{name:"Plus Jakarta Sans",val:"Plus Jakarta Sans, sans-serif"},{name:"Inter",val:"Inter, sans-serif"},{name:"Oswald",val:"Oswald, sans-serif"},{name:"Roboto Condensed",val:"Roboto Condensed, sans-serif"},{name:"Fjalla One",val:"Fjalla One, sans-serif"},{name:"Jost",val:"Jost, sans-serif"},{name:"Josefin Sans",val:"Josefin Sans, sans-serif"},{name:"Alata Regular",val:"Alata Regular, sans-serif"},{name:"Shopee Text",val:"Shopee Text, sans-serif"},{name:"SF Pro Display",val:"SF Pro Display, sans-serif"},{name:"Samsung Sharp Sans",val:"Samsung Sharp Sans, sans-serif"},{name:"Shopee Display",val:"Shopee Display, sans-serif"},{name:"UTM Colossalis",val:"UTM Colossalis, sans-serif"}].map(l=>e.jsx("button",{onMouseDown:f=>f.preventDefault(),onClick:()=>{Te("fontFamily",l.val),ye(null)},className:"px-3 py-1.5 text-left text-[11px] text-slate-200 hover:text-white hover:bg-slate-800 transition-colors w-full whitespace-nowrap",style:{fontFamily:l.val},children:l.name},l.val))})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print",children:[e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>xt(-.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Giảm size chữ",children:"-"}),e.jsx("input",{type:"text",onMouseDown:l=>l.stopPropagation(),onClick:l=>l.stopPropagation(),value:ct().toFixed(1),onChange:l=>Dt(l.target.value),className:"w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500",title:"Kích thước cqw"}),e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>xt(.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Tăng size chữ",children:"+"})]}),e.jsx("button",{onClick:()=>Ve("bold"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In đậm (Bold)",children:e.jsx(Bn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ve("italic"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In nghiêng (Italic)",children:e.jsx(Gn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ve("underline"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"Gạch chân (Underline)",children:e.jsx(On,{size:13,className:"stroke-[2.5]"})}),e.jsx("div",{className:"absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95"})]})})()]}),d==="draw"&&he>1&&e.jsxs("div",{className:"flex flex-wrap items-center justify-center gap-1.5 mt-4 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 no-print",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-500 mr-1.5 uppercase",children:"Trang xem trước:"}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:()=>Se(u=>Math.max(0,u-1)),disabled:ae===0,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:"<"}),Array.from({length:he}).map((u,l)=>he>5&&l!==0&&l!==he-1&&Math.abs(l-ae)>1?l===1&&ae>2?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):l===he-2&&ae<he-3?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):null:e.jsx("button",{onClick:()=>Se(l),className:`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${ae===l?"bg-rose-600 text-white shadow-sm font-black":"bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"}`,children:l+1},l)),e.jsx("button",{onClick:()=>Se(u=>Math.min(he-1,u+1)),disabled:ae===he-1,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:">"})]})]})]})},sr=r=>{if(!r)return"";let d=r.replace(/^[\(\[]\d+[\)\]]\s*/,"");return d=d.replace(/\s*[\(\[]\d+[\)\]]$/,""),d.trim()},or=(r,d)=>{let c=r.newPrice,o=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const s=Number(r.oldPrice.replace(/\D/g,""));let h=Number(r.servicePrice.replace(/\D/g,""));if(s>0&&h>0){h*1e3<=s*1.5&&h<s&&(h=h*1e3);const j=Math.round((h/s-1)*100);o=j<0?`${j}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const s=Number(r.oldPrice.replace(/\D/g,""));let h=Number(r.salePrice.replace(/\D/g,""));if(s>0&&h>0){h*1e3<=s*1.5&&h<s&&(h=h*1e3);const j=Math.round((h/s-1)*100);o=j<0?`${j}%`:""}}return{newPrice:c,percent:o}},ir=({manualPages:r,savedLists:d,showSavedLists:c,setShowSavedLists:o,saveCurrentList:s,clearManualPages:h,loadPageToEditor:j,removeManualPage:R,loadSavedList:p,deleteSavedList:M,togglePageSelection:Z,toggleAllPagesSelection:B,discountThreshold:k,handleDiscountThresholdChange:W,activeQueuePageId:X,setActiveQueuePageId:ne,discountDisplayMode:Q,setDiscountDisplayMode:ue,showBarcode:re,setShowBarcode:Y,priceSource:q,setPriceSource:Ee})=>{const[ie,we]=i.useState(""),[le,$e]=i.useState(()=>typeof window>"u"?!1:localStorage.getItem("hasSeenStickerDiscountTooltip")!=="true"),ce=()=>{localStorage.setItem("hasSeenStickerDiscountTooltip","true"),$e(!1)},me=r.filter(m=>{const A=ie.toLowerCase().trim();if(!A)return!0;const _=m.label.toLowerCase().includes(A),ee=m.code?m.code.toLowerCase().includes(A):!1;return _||ee}),J=r.length>0&&r.every(m=>m.selected!==!1);return e.jsxs("div",{className:"w-full h-full flex flex-col no-print space-y-3 overflow-hidden",children:[le&&e.jsx("style",{children:`
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
                `}),r.length===0&&e.jsxs("div",{className:"flex items-center justify-between shrink-0 py-1 bg-slate-50 dark:bg-slate-900/20 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40",children:[e.jsx("span",{className:"text-[11px] font-bold text-slate-500 dark:text-slate-400",children:"Cấu hình in nhãn:"}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsxs("div",{className:"relative flex items-center",children:[e.jsx($,{onClick:()=>{ue(Q==="percent"?"amount":"percent"),le&&ce()},size:"icon",variant:"secondary",className:`h-8 w-8 transition-all ${le?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":Q==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:Q==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:Q==="percent"?e.jsx(en,{size:14}):e.jsx(tn,{size:14})}),le&&e.jsxs("div",{className:"absolute right-0 top-9 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx($,{variant:"ghost",onClick:ce,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0.5 text-indigo-200 hover:text-white",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx($,{variant:"ghost",onClick:ce,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx($,{onClick:()=>Y(!re),size:"icon",variant:"secondary",className:`h-8 w-8 transition-colors ${re?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:re?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:14})})]})]}),r.length>0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2",children:[e.jsx("input",{type:"checkbox",checked:J,onChange:m=>B(m.target.checked),className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0",title:"Chọn tất cả / Bỏ chọn tất cả"}),e.jsxs("span",{className:"text-xs font-bold text-slate-700 dark:text-slate-300",children:["Số lượng: ",r.length]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 shrink-0",children:[e.jsx(Ot,{type:"text",placeholder:"% Giảm",value:k,onChange:m=>W(m.target.value),className:"!w-12 !h-7 text-center px-1 text-[10px] rounded-lg font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white",title:"Nhập % giảm tối thiểu",fullWidth:!1}),e.jsxs("div",{className:"relative flex items-center",children:[e.jsx($,{onClick:()=>{ue(Q==="percent"?"amount":"percent"),le&&ce()},size:"icon",variant:"secondary",className:`h-7 w-7 transition-all ${le?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":Q==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:Q==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:Q==="percent"?e.jsx(en,{size:13}):e.jsx(tn,{size:13})}),le&&e.jsxs("div",{className:"absolute right-0 top-8 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx($,{variant:"ghost",onClick:ce,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0.5 text-indigo-200 hover:text-white",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx($,{variant:"ghost",onClick:ce,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx($,{onClick:()=>Y(!re),size:"icon",variant:"secondary",className:`h-7 w-7 transition-colors ${re?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:re?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:13})}),e.jsx("div",{className:"h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"}),e.jsx($,{onClick:s,size:"icon",variant:"secondary",className:"h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Lưu danh sách",children:e.jsx(An,{size:13})}),e.jsx($,{onClick:h,size:"icon",variant:"secondary",className:"h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Xóa tất cả",children:e.jsx(At,{size:13})})]})]}),r.some(m=>m.servicePrice||m.salePrice)&&e.jsxs("div",{className:"flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full shrink-0 mb-1",children:[e.jsx($,{variant:"ghost",onClick:()=>Ee("sale"),className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${q==="sale"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá giảm"}),e.jsx($,{variant:"ghost",onClick:()=>Ee("service"),className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${q==="service"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá Dịch vụ"})]}),e.jsx("div",{className:"relative shrink-0 mb-1",children:e.jsx(Ot,{type:"text",placeholder:"Tìm theo tên hoặc mã sản phẩm...",value:ie,onChange:m=>we(m.target.value),className:"h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 text-slate-750 dark:text-slate-350",fullWidth:!0,rightIcon:ie?"x":void 0,onRightIconClick:ie?()=>we(""):void 0})}),e.jsxs("div",{className:"space-y-2 flex-1 overflow-y-auto pr-1",children:[me.map((m,A)=>e.jsxs("div",{tabIndex:0,"data-queue-index":A,className:`flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group outline-none ${m.id===X?"border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20":"border-slate-100 dark:border-slate-700"} ${m.selected===!1?"opacity-50":""}`,onClick:()=>{ne(m.id),j(m)},onKeyDown:_=>{if(_.key==="ArrowDown"){_.preventDefault();const ee=A+1;if(ee<me.length){const De=me[ee];ne(De.id),j(De),setTimeout(()=>{const ge=document.querySelector(`[data-queue-index="${ee}"]`);ge==null||ge.focus()},10)}}else if(_.key==="ArrowUp"){_.preventDefault();const ee=A-1;if(ee>=0){const De=me[ee];ne(De.id),j(De),setTimeout(()=>{const ge=document.querySelector(`[data-queue-index="${ee}"]`);ge==null||ge.focus()},10)}}},title:"Click hoặc dùng mũi tên Lên/Xuống để chỉnh sửa",children:[e.jsxs("div",{className:"flex items-center gap-2.5 min-w-0 flex-1",children:[e.jsx("input",{type:"checkbox",checked:m.selected!==!1,onChange:_=>{_.stopPropagation(),Z(m.id)},className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"}),e.jsx("span",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0",children:A+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs text-slate-700 dark:text-slate-300 truncate font-medium",children:sr(m.label)}),e.jsx("div",{className:"flex gap-2 mt-0.5 text-[10px]",children:(()=>{const{newPrice:_,percent:ee}=or(m,q);return e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-red-600 font-bold",children:_}),m.oldPrice&&e.jsx("span",{className:"line-through text-slate-400",children:m.oldPrice}),ee&&e.jsx("span",{className:"text-green-600 font-bold",children:ee})]})})()})]})]}),e.jsx($,{variant:"ghost",onClick:_=>{_.stopPropagation(),R(m.id)},className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100",children:e.jsx(Ut,{size:14})})]},m.id)),me.length===0&&e.jsx("p",{className:"text-xs text-slate-400 dark:text-slate-500 text-center py-4",children:"Không tìm thấy sticker nào phù hợp"})]})]}),d.length>0&&r.length===0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs($,{variant:"ghost",onClick:()=>o(!c),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full p-0 text-inherit flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(Vn,{size:16,className:"text-emerald-500"}),"Danh sách đã lưu (",d.length,")"]}),c?e.jsx(Wn,{size:16}):e.jsx(Kn,{size:16})]}),c&&e.jsx("div",{className:"mt-3 space-y-2 flex-1 overflow-y-auto pr-1",children:d.map(m=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:m.name}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(m.timestamp).toLocaleDateString("vi-VN")}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[m.pages.length," trang"]})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx($,{variant:"ghost",onClick:()=>p(m),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold",title:"Tải danh sách",children:e.jsx(ln,{size:13})}),e.jsx($,{variant:"ghost",onClick:()=>M(m.id),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},m.id))})]}),r.length===0&&d.length===0&&e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"D.Sách in trống"})]})},lr=({manualPages:r,batchItems:d,showBarcode:c,setShowBarcode:o,discountDisplayMode:s,setDiscountDisplayMode:h,searchTerm:j,setSearchTerm:R,printHistory:p,showHistory:M,setShowHistory:Z,handlePrint:B,addCurrentPage:k,handleExcelUpload:W,handleTemplateUpload:X,downloadTemplate:ne,handleReset:Q,toggleAllSelection:ue,toggleItemSelection:re,clearBatchItems:Y,restoreHistory:q,deleteHistory:Ee,savedLists:ie,showSavedLists:we,setShowSavedLists:le,saveCurrentList:$e,clearManualPages:ce,loadPageToEditor:me,removeManualPage:J,loadSavedList:m,deleteSavedList:A,togglePageSelection:_,toggleAllPagesSelection:ee,discountThreshold:De,handleDiscountThresholdChange:ge,activeQueuePageId:lt,setActiveQueuePageId:_e,activeSubTab:Ie,setActiveSubTab:je,priceSource:ae,setPriceSource:Se,handleErpPriceUpload:he,stickerType:ke,drawStartNumber:Ae,setDrawStartNumber:Ue,drawTotalTickets:ve,setDrawTotalTickets:Ce,drawAutoIncrement:Qe,setDrawAutoIncrement:ye})=>{const be=d.filter(S=>S.selected).length,Te=r.filter(S=>S.selected!==!1).length,Ve=d.filter(S=>S.name.toLowerCase().includes(j.toLowerCase())),Ne=i.useMemo(()=>p.filter(S=>S.stickerType===ke),[p,ke]);return e.jsxs("div",{className:"w-full max-w-sm aspect-[197/285] bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 p-5 lg:p-6 no-print flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex gap-2 mb-3 shrink-0",children:[e.jsxs($,{onClick:B,className:"flex-1 !bg-[#fbbc04] hover:!bg-[#f0b400] !text-black font-black text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-yellow-500/10 border-transparent",leftIcon:e.jsx(Xn,{size:16}),children:["BẤM ĐỂ IN (",d.length>0?be+Te:r.length>0?Te:1,")"]}),e.jsx($,{onClick:k,className:"bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md shadow-indigo-500/10 border-transparent",title:"Thêm trang hiện tại vào hàng đợi in",leftIcon:e.jsx(Yn,{size:16}),children:"Thêm"})]}),e.jsxs("div",{className:"flex border-b border-slate-100 dark:border-slate-700 mb-4 shrink-0",children:[e.jsx($,{variant:"ghost",onClick:()=>je("data"),className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${Ie==="data"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Dữ liệu"}),ke!=="draw"&&e.jsxs($,{variant:"ghost",onClick:()=>je("queue"),className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${Ie==="queue"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["D.Sách (",r.length,")"]}),e.jsxs($,{variant:"ghost",onClick:()=>je("history"),className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${Ie==="history"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["Lịch sử (",Ne.length,")"]})]}),e.jsxs("div",{className:`flex-1 pr-1 -mr-1 scrollbar-thin ${Ie==="queue"?"flex flex-col overflow-hidden":"overflow-y-auto space-y-2"}`,children:[Ie==="data"&&e.jsxs("div",{className:"space-y-2.5 animate-in fade-in duration-200 pb-2",children:[ke==="draw"?e.jsxs("div",{className:"p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 space-y-4",children:[e.jsxs("p",{className:"text-[11px] lg:text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-200/40 pb-2",children:[e.jsx(rn,{size:14,className:"stroke-[2.5]"}),"Cấu hình in Phiếu Rút Thăm"]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số bắt đầu"}),e.jsx("input",{type:"number",min:"1",value:Ae,onChange:S=>Ue(Math.max(1,parseInt(S.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số lượng cần in"}),e.jsx("input",{type:"number",min:"1",value:ve,onChange:S=>Ce(Math.max(1,parseInt(S.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]})]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer select-none py-1",children:[e.jsx("input",{type:"checkbox",checked:Qe,onChange:S=>ye(S.target.checked),className:"w-4 h-4 rounded text-rose-600 border-slate-300 dark:border-slate-700 focus:ring-rose-500 bg-white dark:bg-slate-900"}),e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300",children:"Tự động nhảy số liên tục"})]}),e.jsxs("div",{className:"bg-white/80 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:[e.jsx("span",{className:"font-bold text-indigo-600 dark:text-indigo-400",children:"Gợi ý in:"})," ",ve," phiếu rút thăm sẽ được in trên ",e.jsxs("span",{className:"font-bold text-slate-800 dark:text-white",children:[Math.ceil(ve/4)," trang A4"]})," (mỗi trang 4 phiếu). Các số thứ tự sẽ tự động điền từ ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Ae})," đến ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Ae+ve-1}),"."]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-[11px] lg:text-xs",children:[e.jsx(Pt,{size:14}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:W,className:"hidden"})]}),e.jsx($,{onClick:Q,variant:"secondary",className:"px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-[11px] lg:text-xs h-auto py-1.5 border-slate-200 dark:border-slate-600",children:"Reset"})]}),e.jsxs("div",{className:"p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1",children:[e.jsx(Qn,{size:12}),"Nhập từ File Mẫu"]}),e.jsxs("div",{className:"flex gap-1.5",children:[e.jsxs($,{variant:"ghost",onClick:ne,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Jn,{size:10}),"Tải File Mẫu"]}),e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Pt,{size:10}),"Nhập File Mẫu",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:X,className:"hidden"})]})]})]}),e.jsxs("div",{className:"p-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1",children:[e.jsx(cn,{size:12}),"Nhập file in giá từ ERP"]}),e.jsxs("div",{className:"grid grid-cols-1 gap-2",children:[e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Pt,{size:10}),"Máy Lọc Nước (Mẫu in 99)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:S=>he(S,"purifier"),className:"hidden"})]}),e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Pt,{size:10}),"Điện Tử/Lạnh (Mẫu in 97)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:S=>he(S,"appliance"),className:"hidden"})]})]})]}),d.length>0&&e.jsxs("div",{className:"mt-4 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-xs text-slate-800 dark:text-white",children:["Danh sách in (",be,"/",d.length,")"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx($,{variant:"ghost",onClick:()=>ue(!0),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx($,{variant:"ghost",onClick:()=>ue(!1),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-[10px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx($,{variant:"ghost",onClick:Y,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-[10px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx(Ot,{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:j,onChange:S=>R(S.target.value),className:"mb-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"}),e.jsx("div",{className:"space-y-2",children:Ve.map(S=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${S.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:S.selected,onChange:()=>re(S.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:S.name,children:S.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:S.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:S.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:S.percent})]})]})]},S.id))})]})]}),e.jsxs("div",{className:"mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-2.5",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(rn,{size:13,className:"text-indigo-500"}),e.jsx("span",{className:"text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider",children:"H.Dẫn in & Sử dụng"})]}),e.jsxs("div",{className:"p-3 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-500 dark:text-slate-400",children:"CẤU HÌNH IN CHROME (CTRL + P):"}),e.jsxs("ul",{className:"space-y-1 text-[11px] text-slate-600 dark:text-slate-300",children:[e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Khổ giấy khuyên dùng: ",e.jsx("strong",{children:"A4"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Chọn: ",e.jsx("strong",{children:"Hiển thị đồ họa nền (Background graphics)"})]})]})]})]}),e.jsx("div",{className:"border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300",children:ke==="draw"?e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Nhập nội dung ở phiếu số 1 (trang 1). Các phiếu còn lại tự động đồng bộ theo."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Nhảy số:"}),' Bật chế độ "Tự động nhảy số" để hệ thống tự động tăng dần từ số bắt đầu.']})]}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Click trực tiếp vào chữ trên sticker ở khung preview."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Tính % tự động:"})," Chỉ cần nhập Giá cũ & Giá mới."]})]})})]})]})]}),Ie==="queue"&&e.jsx("div",{className:"flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 pb-2",children:e.jsx(ir,{manualPages:r,savedLists:ie,showSavedLists:we,setShowSavedLists:le,saveCurrentList:$e,clearManualPages:ce,loadPageToEditor:me,removeManualPage:J,loadSavedList:m,deleteSavedList:A,togglePageSelection:_,toggleAllPagesSelection:ee,discountThreshold:De,handleDiscountThresholdChange:ge,activeQueuePageId:lt,setActiveQueuePageId:_e,discountDisplayMode:s,setDiscountDisplayMode:h,showBarcode:c,setShowBarcode:o,priceSource:ae,setPriceSource:Se})}),Ie==="history"&&e.jsx("div",{className:"space-y-2 animate-in fade-in duration-200 pb-2",children:Ne.length===0?e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"Chưa có lịch sử in"}):Ne.map(S=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group text-left",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:S.label}),e.jsxs("div",{className:"flex gap-1.5 mt-1 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(S.timestamp).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[S.pageCount," trang"]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:S.stickerType==="gia_soc"?"Giá Sốc":S.stickerType==="draw"?"Rút Thăm":"Giờ Vàng"})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx($,{variant:"ghost",onClick:()=>q(S),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors",title:"Khôi phục",children:e.jsx(ln,{size:13})}),e.jsx($,{variant:"ghost",onClick:()=>Ee(S.id),className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},S.id))})]})]})},cr=({isOpen:r,onClose:d,onSave:c,defaultName:o})=>{const[s,h]=i.useState(o);if(!r)return null;const j=R=>{R.preventDefault(),s.trim()&&c(s.trim())};return e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4",children:e.jsx("div",{className:"bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden",children:e.jsxs("div",{className:"p-6",children:[e.jsx("h2",{className:"text-xl font-bold text-slate-800 mb-4",children:"Lưu Danh Sách"}),e.jsxs("form",{onSubmit:j,children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{htmlFor:"listName",className:"block text-sm font-medium text-slate-700 mb-1",children:"Tên danh sách"}),e.jsx("input",{type:"text",id:"listName",value:s,onChange:R=>h(R.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500",placeholder:"Nhập tên danh sách...",autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"flex justify-end gap-3 mt-6",children:[e.jsx($,{type:"button",variant:"ghost",onClick:d,className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors",children:"Hủy"}),e.jsx($,{type:"submit",variant:"ghost",className:"bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors",children:"Lưu"})]})]})]})})})},dr=i.lazy(()=>pt(()=>import("./StickerEventApp-BUSzzcxV.js"),__vite__mapDeps([0,1,2,3,4,5,6]))),on="stickerPrinterState",Et="stickerPrintHistory",ft="stickerSavedLists",ur=r=>{if(!r)return"";let d=r;d=d.replace(/Máy lọc nước/gi,"MLN");const c=["RO nóng lạnh tủ đứng","\\(IMEI\\)","nước nóng lạnh","RO âm tủ","RO tủ đứng","điện giải nóng nguội","nóng lạnh RO","RO nóng nguội lạnh tủ đứng"];for(const o of c){const s=new RegExp(o,"gi");d=d.replace(s,"")}return d=d.replace(/\s+/g," ").trim(),d},Vt=(r,d)=>{let c=r.newPrice,o=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const s=Number(r.oldPrice.replace(/\D/g,""));let h=Number(r.servicePrice.replace(/\D/g,""));if(s>0&&h>0){h*1e3<=s*1.5&&h<s&&(h=h*1e3);const j=Math.round((h/s-1)*100);o=j<0?`${j}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const s=Number(r.oldPrice.replace(/\D/g,""));let h=Number(r.salePrice.replace(/\D/g,""));if(s>0&&h>0){h*1e3<=s*1.5&&h<s&&(h=h*1e3);const j=Math.round((h/s-1)*100);o=j<0?`${j}%`:""}}return{newPrice:c,percent:o}},Gt=(r,d,c,o,s="percent")=>{if(c==="draw")return`<div class="sticker-container" data-type="${c}" style="background-image:url('${o}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:2482/3512;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;"></div>`;let{newPrice:h,percent:j}=Vt(r,d),R=r.header,p=r.subHeader,M=r.footer;if(r.html&&(!R||!p||!M))try{const X=new DOMParser().parseFromString(r.html,"text/html"),ne=X.querySelector(".header-text"),Q=X.querySelector(".sub-header"),ue=X.querySelector(".footer-text");R===void 0&&ne&&(R=ne.textContent||""),p===void 0&&Q&&(p=Q.textContent||""),M===void 0&&ue&&(M=ue.textContent||"")}catch(W){console.error("Error parsing fallback fields from page.html:",W)}let Z="";if(r.code)try{Z=`<div class="barcode"><img src="${Wt(r.code)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${r.code}" /></div>`}catch(W){console.error("Barcode error:",W)}const B=c==="gio_vang"?`<div class="sub-header">${p||""}</div>`:"",k=`<div class="extra2">${h}</div>`;if(s==="amount"){const W=Number(String(r.oldPrice).replace(/\D/g,""));let X=Number(String(h).replace(/\D/g,""));if(W>0&&X>0){X*1e3<=W*1.5&&X<W&&(X=X*1e3);const ne=W-X;ne>0&&(j=`-${(ne/1e3).toLocaleString("vi-VN")}K`)}}return`<div class="sticker-container" data-type="${c}" style="background-image:url('${o}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
        ${Z}
        <div class="header-text">${R||""}</div>
        ${B}
        <div class="extra1">${j}</div>
        <div class="old">${r.oldPrice}</div>
        <div class="name">${r.label}</div>
        ${k}
        <div class="footer-text">${M||""}</div>
    </div>`},hr=(r,d)=>{if(r.stickerType!==d.stickerType||r.headerTextContent!==d.headerTextContent||r.subHeaderTextContent!==d.subHeaderTextContent||r.footerTextContent!==d.footerTextContent||r.showBarcode!==d.showBarcode||r.discountDisplayMode!==d.discountDisplayMode||r.pageCount!==d.pageCount||r.batchItems.length!==d.batchItems.length)return!1;for(let c=0;c<r.batchItems.length;c++){const o=r.batchItems[c],s=d.batchItems[c];if(o.name!==s.name||o.oldPrice!==s.oldPrice||o.newPrice!==s.newPrice||o.percent!==s.percent||o.imei!==s.imei||o.selected!==s.selected)return!1}if(r.manualPages.length!==d.manualPages.length)return!1;for(let c=0;c<r.manualPages.length;c++){const o=r.manualPages[c],s=d.manualPages[c];if(o.label!==s.label||o.oldPrice!==s.oldPrice||o.newPrice!==s.newPrice||o.percent!==s.percent||o.code!==s.code||o.header!==s.header||o.subHeader!==s.subHeader||o.footer!==s.footer||o.selected!==s.selected)return!1}return!0};function gr(){const{activeTab:r}=Ln(),{user:d}=qn(),[c,o]=i.useState(!1),[s,h]=i.useState("sticker"),[j,R]=i.useState(!1),[p,M]=i.useState("gia_soc"),[Z,B]=i.useState("/frame/X24_NEW.png"),[k,W]=i.useState("sale"),[X,ne]=i.useState([{id:"1",title:"",code:"1",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"2",title:"",code:"2",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"3",title:"",code:"3",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"4",title:"",code:"4",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""}]),[Q,ue]=i.useState(1),[re,Y]=i.useState(4),[q,Ee]=i.useState(!0),[ie,we]=i.useState(3.5),[le,$e]=i.useState(3.5),[ce,me]=i.useState(2.2),[J,m]=i.useState(2.2),[A,_]=i.useState(2.5),[ee,De]=i.useState(3.8),[ge,lt]=i.useState(3.8),[_e,Ie]=i.useState("header"),[je,ae]=i.useState(8),[Se,he]=i.useState(13),[ke,Ae]=i.useState(36.9),[Ue,ve]=i.useState(14.2),[Ce,Qe]=i.useState(3.6),[ye,be]=i.useState(26.5),[Te,Ve]=i.useState(3.2),[Ne,S]=i.useState("percent"),[We,yt]=i.useState(""),[Ke,Xe]=i.useState(null),[Je,Be]=i.useState("data");i.useEffect(()=>{p==="draw"&&Je==="queue"&&Be("data")},[p,Je]);const Nt=()=>{switch(_e){case"header":return"Tiêu đề";case"subHeader":return"Tiêu đề phụ";case"percent":return"% Giảm";case"oldPrice":return"Giá cũ";case"name":return"Tên SP";case"newPrice":return"Giá mới";case"footer":return"Khuyến mãi";default:return"Cỡ chữ"}},et=t=>{const a=window.getSelection();if(!a||a.rangeCount===0||a.isCollapsed)return!1;const n=a.getRangeAt(0);let x=n.commonAncestorContainer;x.nodeType===3&&(x=x.parentNode||x);let y=x,U=null;for(;y;){if(y.nodeType===1){const N=y;if(N.getAttribute("contenteditable")==="true"){U=N;break}}y=y.parentNode}if(U){const N=document.createElement("span");N.style.fontSize=`${t.toFixed(1)}cqw`;try{N.appendChild(n.extractContents()),n.insertNode(N);const b=new Event("input",{bubbles:!0});return U.dispatchEvent(b),!0}catch(b){console.error("Error applying font size to selection:",b)}}return!1},$t=()=>{switch(_e){case"header":return je;case"subHeader":return Se;case"percent":return ke;case"oldPrice":return Ue;case"name":return Ce;case"newPrice":return ye;case"footer":return Te;default:return je}},ct=()=>{switch(_e){case"drawTitle":return A;case"drawContentTopLeft":return ie;case"drawContentTopRight":return le;case"drawContentBottomLeft":return ce;case"drawContentBottomRight":return J;case"drawCode":return ee;case"drawFooter":return ge;default:return ie}},xt=t=>{const a=n=>typeof t=="function"?t(n):t;switch(_e){case"drawTitle":_(a);break;case"drawContentTopLeft":we(a);break;case"drawContentTopRight":$e(a);break;case"drawContentBottomLeft":me(a);break;case"drawContentBottomRight":m(a);break;case"drawCode":De(a);break;case"drawFooter":lt(a);break;default:we(a)}},Dt=()=>{switch(_e){case"drawTitle":return"Cỡ chữ Tiêu đề";case"drawContentTopLeft":return"Cỡ chữ Giải thưởng trái";case"drawContentTopRight":return"Cỡ chữ Giải thưởng phải";case"drawContentBottomLeft":return"Cỡ chữ Thông tin trái";case"drawContentBottomRight":return"Cỡ chữ Thông tin phải";case"drawCode":return"Cỡ chữ Mã số";case"drawFooter":return"Cỡ chữ Siêu thị";default:return"Cỡ chữ Giải thưởng trái"}},u=t=>{const a=n=>{const x=typeof t=="function"?t(n):t;return Number(x.toFixed(1))};switch(_e){case"header":ae(a);break;case"subHeader":he(a);break;case"percent":Ae(a);break;case"oldPrice":ve(a);break;case"name":Qe(a);break;case"newPrice":be(a);break;case"footer":Ve(a);break}},[l,f]=i.useState([]),[g,v]=i.useState("QUẠT ĐIỀU HOÀ"),[w,E]=i.useState("0 SUẤT/NGÀY"),[V,te]=i.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[oe,tt]=i.useState(""),[Fe,nt]=i.useState(!1),[jt,rt]=i.useState("123456"),[He,Me]=i.useState([]),[It,Mt]=i.useState([]),[dn,Kt]=i.useState(!1),[Rt,St]=i.useState([]),[un,Xt]=i.useState(!1),[dt,mt]=i.useState("Quạt điều hoà Daikiosan DMI03"),[_t,bt]=i.useState("5.490.000"),[Ht,at]=i.useState("3.490"),[Ze,hn]=i.useState(!1),[Yt,gn]=i.useState(!1),[Qt,Lt]=i.useState(!1);i.useEffect(()=>{Ze&&p==="draw"&&ne(t=>{var x;const a=t[0]||{id:"1",title:"",code:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},n=[];for(let y=0;y<re;y++){const U=q?(Q+y).toString():((x=t[y])==null?void 0:x.code)||"";y===0?n.push({...a,id:"1",code:q?Q.toString():a.code||"1"}):n.push({id:(y+1).toString(),title:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:"",code:U})}return n})},[Q,re,q,p,Ze]),i.useEffect(()=>{const t=dt.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);if(t)rt(t[1]);else{const a=dt.match(/\(([A-Za-z0-9]+)\)/);a&&rt(a[1])}},[dt]),i.useEffect(()=>{if(!Ke)return;const t=He.find(a=>a.id===Ke);if(t){const{newPrice:a}=Vt(t,k);at(a)}},[k,Ke,He]),i.useEffect(()=>{const t=()=>gn(window.innerWidth<1024);return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const wt=t=>{try{const a=new URL(window.location.href);a.searchParams.set("sub",t),window.history.replaceState(null,"",a.toString())}catch(a){console.error("Failed to sync sub-tab to URL:",a)}};i.useEffect(()=>{o(!0);let a=new URLSearchParams(window.location.search).get("sub");a||(a="event",wt("event")),a==="gia-soc"?(h("sticker"),M("gia_soc"),v("QUẠT ĐIỀU HOÀ"),B("/frame/X24_NEW.png"),ae(8)):a==="gio-vang"?(h("sticker"),M("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),B("/frame/GVO2-scaled.png"),ae(8)):a==="draw"?(h("sticker"),M("draw"),B("/frame/bg_phieu.png")):a==="event"&&(h("event"),R(!0));const n=setTimeout(()=>{pt(()=>import("./StickerEventApp-BUSzzcxV.js"),__vite__mapDeps([0,1,2,3,4,5,6])).catch(x=>{console.warn("Failed to preload StickerEventApp:",x)})},1e3);return()=>clearTimeout(n)},[]),i.useEffect(()=>{let t=!0;async function a(){try{const n=await Tt(on);if(n&&t){const N=new URLSearchParams(window.location.search).get("sub");if(N?N==="gia-soc"?(h("sticker"),M("gia_soc")):N==="gio-vang"?(h("sticker"),M("gio_vang")):N==="draw"?(h("sticker"),M("draw")):N==="event"&&(h("event"),R(!0)):(n.stickerMode&&h(n.stickerMode),n.stickerType&&M(n.stickerType)),n.bgImage&&B(n.bgImage),n.headerTextContent&&v(n.headerTextContent),n.subHeaderTextContent&&E(n.subHeaderTextContent),n.footerTextContent&&te(n.footerTextContent),n.showBarcode!=null&&nt(n.showBarcode),n.previewName&&mt(n.previewName),n.previewOldPrice&&bt(n.previewOldPrice),n.previewNewPrice){const H=String(n.previewNewPrice).replace(/\D/g,"");if(H){let C=Number(H);C>=1e5&&(C=Math.floor(C/1e3)),at(C.toLocaleString("vi-VN"))}else at(n.previewNewPrice)}n.discountDisplayMode&&S(n.discountDisplayMode),n.barcodeImei&&rt(n.barcodeImei),n.discountThreshold!=null&&yt(n.discountThreshold),n.searchTerm!=null&&tt(n.searchTerm);const b=(n.manualPages||[]).map(H=>{if(H.newPrice){const C=String(H.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{...H,newPrice:P.toLocaleString("vi-VN")}}}return H}),G=(n.batchItems||[]).map(H=>{if(H.newPrice){const C=String(H.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{...H,newPrice:P.toLocaleString("vi-VN")}}}return H});b.length===0&&G.length===0?Be("data"):n.activeSubTab&&Be(n.activeSubTab==="help"?"data":n.activeSubTab),Me(b),f(G),n.priceSource&&W(n.priceSource),n.headerTextSize!=null&&ae(n.headerTextSize),n.subHeaderTextSize!=null&&he(n.subHeaderTextSize),n.percentTextSize!=null&&Ae(n.percentTextSize),n.oldPriceTextSize!=null&&ve(n.oldPriceTextSize),n.nameTextSize!=null&&Qe(n.nameTextSize),n.newPriceTextSize!=null&&be(n.newPriceTextSize),n.footerTextSize!=null&&Ve(n.footerTextSize),n.drawTickets&&ne(n.drawTickets),n.drawStartNumber!=null&&ue(n.drawStartNumber),n.drawTotalTickets!=null&&Y(n.drawTotalTickets),n.drawAutoIncrement!=null&&Ee(n.drawAutoIncrement),n.drawContentTopLeftSize!=null&&we(n.drawContentTopLeftSize),n.drawContentTopRightSize!=null&&$e(n.drawContentTopRightSize),n.drawContentBottomLeftSize!=null&&me(n.drawContentBottomLeftSize),n.drawContentBottomRightSize!=null&&m(n.drawContentBottomRightSize),n.drawTitleSize!=null&&_(n.drawTitleSize),n.drawCodeSize!=null&&De(n.drawCodeSize),n.drawFooterSize!=null&&lt(n.drawFooterSize)}const x=await Tt(ft);x&&t&&St(x);const y=await Tt(Et);y&&t&&Mt(y)}catch(n){console.error("Error loading sticker data:",n)}finally{t&&hn(!0)}}return a(),()=>{t=!1}},[]),i.useEffect(()=>{const t=a=>{var n;((n=a.detail)==null?void 0:n.key)===ft&&Tt(ft).then(x=>{x&&St(x)})};return window.addEventListener("indexeddb-change",t),()=>window.removeEventListener("indexeddb-change",t)},[]),i.useEffect(()=>{if(!Ze)return;const t=setTimeout(async()=>{const a={stickerMode:s,stickerType:p,bgImage:Z,headerTextContent:g,subHeaderTextContent:w,footerTextContent:V,showBarcode:Fe,previewName:dt,previewOldPrice:_t,previewNewPrice:Ht,discountDisplayMode:Ne,headerTextSize:je,subHeaderTextSize:Se,percentTextSize:ke,oldPriceTextSize:Ue,nameTextSize:Ce,newPriceTextSize:ye,footerTextSize:Te,barcodeImei:jt,discountThreshold:We,searchTerm:oe,activeQueuePageId:Ke,activeSubTab:Je,manualPages:He,batchItems:l,priceSource:k,drawTickets:X,drawStartNumber:Q,drawTotalTickets:re,drawAutoIncrement:q,drawContentTopLeftSize:ie,drawContentTopRightSize:le,drawContentBottomLeftSize:ce,drawContentBottomRightSize:J,drawTitleSize:A,drawCodeSize:ee,drawFooterSize:ge,updatedAt:new Date().toISOString()};try{await ot(on,a)}catch(n){console.error("IndexedDB save failed",n)}},500);return()=>clearTimeout(t)},[Ze,s,p,Z,g,w,V,Fe,dt,_t,Ht,je,Se,ke,Ue,Ce,ye,Te,Ne,jt,We,oe,Ke,Je,He,l,k,X,Q,re,q,ie,le,ce,J,A,ee,ge]),i.useEffect(()=>{if(!Ze)return;const t=setTimeout(async()=>{try{await ot(ft,Rt)}catch(a){console.error("IndexedDB save savedLists failed",a)}},500);return()=>clearTimeout(t)},[Ze,Rt]),i.useEffect(()=>{if(!Ze)return;const t=setTimeout(async()=>{try{await ot(Et,It)}catch(a){console.error("IndexedDB save printHistory failed",a)}},500);return()=>clearTimeout(t)},[Ze,It]);const ut=t=>{if(!t)return 0;const a=t.replace(/[^0-9]/g,""),n=parseInt(a,10);return isNaN(n)?0:n},fn=t=>{yt(t);const a=t.replace(/[^0-9]/g,""),n=parseInt(a,10);isNaN(n)?(Me(x=>x.map(y=>({...y,selected:!0}))),f(x=>x.map(y=>({...y,selected:!0})))):(Me(x=>x.map(y=>{const U=ut(y.percent);return{...y,selected:U>=n}})),f(x=>x.map(y=>{const U=ut(y.percent);return{...y,selected:U>=n}})))},pn=t=>{var x;const a=(x=t.target.files)==null?void 0:x[0];if(!a)return;const n=new FileReader;n.onload=async y=>{var U;try{const N=(U=y.target)==null?void 0:U.result,b=await pt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),G=b.read(N,{type:"binary"}),H=G.SheetNames[0],C=G.Sheets[H],P=b.utils.sheet_to_json(C,{header:1}),O=[];for(let I=0;I<P.length;I++){const D=P[I];if(!D||D.length<9)continue;const z=D[4]?String(D[4]).trim():"",se=D[5]?String(D[5]).trim():"",L=D[42]?String(D[42]).trim():"";let F="";const fe=L.toUpperCase();fe.includes("IMEI:")?(F=L.substring(fe.indexOf("IMEI:")+5).trim(),F=F.replace(/\)$/,"").trim()):fe.includes("CODE:")?(F=L.substring(fe.indexOf("CODE:")+5).trim(),F=F.replace(/\)$/,"").trim()):L&&/^[A-Za-z0-9]+$/.test(L)&&L.length>3&&(F=L);const Pe=[z,se].filter(Boolean);L&&Pe.push(L.startsWith("(")?L:`(${L})`);const T=Pe.join(" ");if(!T||T==="TÊN SẢN PHẨM")continue;let K="";if(D[8]){const xe=String(D[8]).match(/\((-\d+%)\)/);xe&&(K=xe[1])}let pe="";if(D[7]){const xe=String(D[7]).replace(/\D/g,"");xe&&(pe=Number(xe).toLocaleString("vi-VN"))}let de="";if(D[6]){const xe=String(D[6]).replace(/\D/g,"");xe&&(de=Number(Math.floor(Number(xe)/1e3)).toLocaleString("vi-VN"))}const Ge=We.replace(/[^0-9]/g,""),Le=parseInt(Ge,10),st=isNaN(Le)?!0:ut(K)>=Le;O.push({id:`item_${I}_${Date.now()}`,name:T,oldPrice:pe,newPrice:de,percent:K,imei:F,selected:st})}if(f(O),Be("data"),O.length>0){const I=O[0];mt(I.name),bt(I.oldPrice),at(I.newPrice),rt(I.imei)}}catch{qe.error("Lỗi đọc file Excel")}},n.readAsBinaryString(a),t.target.value=""},xn=async()=>{const t=await pt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),a=t.utils.book_new();let n,x,y,U;if(p==="gia_soc")n=["TIÊU ĐỀ","CODE","TÊN SẢN PHẨM","GIÁ GỐC","GIÁ GIẢM","KHUYẾN MÃI"],x=[["QUẠT ĐIỀU HOÀ","ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"],["TỦ LẠNH","DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"]],y="Sticker_Template_Gia_Soc.xlsx",U=[{wch:20},{wch:15},{wch:40},{wch:18},{wch:18},{wch:45}];else{const b=new Date,G=b.getDay(),H=G===0?7:G,C=new Date(b);C.setDate(b.getDate()+(5-H));const P=new Date(b);P.setDate(b.getDate()+(7-H));const O=se=>String(se).padStart(2,"0"),I=`${O(C.getDate())}/${O(C.getMonth()+1)}`,D=`${O(P.getDate())}/${O(P.getMonth()+1)}`,z=`TỪ ${I} ĐẾN ${D}`;n=["CODE","SẢN PHẨM","GIÁ NIÊM YẾT","GIÁ GIẢM","THỜI GIAN ÁP DỤNG","SỐ LƯỢNG SUẤT"],x=[["ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000",z,"5 SUẤT/NGÀY"],["DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000",z,"5 SUẤT/NGÀY"]],y="Sticker_Template_Gio_Vang.xlsx",U=[{wch:15},{wch:40},{wch:18},{wch:18},{wch:22},{wch:18}]}const N=t.utils.aoa_to_sheet([n,...x]);N["!cols"]=U,t.utils.book_append_sheet(a,N,"Template"),t.writeFile(a,y)},Jt=t=>{if(t==null)return 0;const a=String(t).replace(/[^0-9]/g,"");return a?Number(a):0},qt=t=>{var n,x,y,U,N,b,G;t.label&&mt(t.label),t.oldPrice&&bt(t.oldPrice),t.code&&rt(t.code),t.header!=null&&v(t.header),t.footer!=null&&te(t.footer),t.subHeader!=null&&E(t.subHeader);const{newPrice:a}=Vt(t,k);if(at(a),!t.label&&t.html){const H=document.createElement("div");H.innerHTML=t.html;const C=H.querySelector(".sticker-container");if(C){const P=((n=C.querySelector(".header-text"))==null?void 0:n.textContent)||g,O=((x=C.querySelector(".name"))==null?void 0:x.textContent)||"",I=((y=C.querySelector(".old"))==null?void 0:y.textContent)||"",D=((U=C.querySelector(".extra2 span"))==null?void 0:U.textContent)||((N=C.querySelector(".extra2"))==null?void 0:N.textContent)||"",z=((b=C.querySelector(".footer-text"))==null?void 0:b.textContent)||V,se=((G=C.querySelector(".sub-header"))==null?void 0:G.textContent)||w;v(P),E(se),te(z),bt(I),at(D);const L=C.querySelector(".barcode img"),F=(L==null?void 0:L.getAttribute("alt"))||"";F&&rt(F),mt(O)}}f([])},mn=t=>{var x;const a=(x=t.target.files)==null?void 0:x[0];if(!a)return;const n=new FileReader;n.onload=async y=>{var U;try{const N=(U=y.target)==null?void 0:U.result,b=await pt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),G=b.read(N,{type:"binary"}),H=G.Sheets[G.SheetNames[0]],C=b.utils.sheet_to_json(H,{header:1});if(!C||C.length<2){qe.error("File không chứa đủ dữ liệu");return}const P=(C[0]||[]).map(T=>String(T).trim().toUpperCase());let O=-1,I=-1,D=-1,z=-1,se=-1,L=-1,F=-1;p==="gia_soc"?(O=P.findIndex(T=>T==="CODE"||T==="CODE:"),I=P.findIndex(T=>T==="TÊN SẢN PHẨM"||T==="SẢN PHẨM"),D=P.findIndex(T=>T==="GIÁ GỐC"||T==="GIÁ NIÊM YẾT"),z=P.indexOf("GIÁ GIẢM"),se=P.findIndex(T=>T==="TIÊU ĐỀ"||T==="THỜI GIAN ÁP DỤNG"),F=P.indexOf("KHUYẾN MÃI"),O===-1&&I===-1&&D===-1&&(se=0,O=1,I=2,D=3,z=4,F=5)):(O=P.findIndex(T=>T==="CODE"||T==="CODE:"),I=P.findIndex(T=>T==="SẢN PHẨM"||T==="TÊN SẢN PHẨM"),D=P.findIndex(T=>T==="GIÁ NIÊM YẾT"||T==="GIÁ GỐC"),z=P.indexOf("GIÁ GIẢM"),se=P.findIndex(T=>T==="THỜI GIAN ÁP DỤNG"||T==="TIÊU ĐỀ"),L=P.indexOf("SỐ LƯỢNG SUẤT"),O===-1&&I===-1&&D===-1&&(O=0,I=1,D=2,z=3,se=4,L=5));const fe=C[1];if(fe){let T=g,K=w,pe=V;if(se!==-1&&fe[se]!=null){const de=String(fe[se]).trim();de&&(T=de)}if(L!==-1&&fe[L]!=null){const de=String(fe[L]).trim();de&&(K=de)}if(F!==-1&&fe[F]!=null){const de=String(fe[F]).trim();de&&(pe=de)}T!==g&&v(T),K!==w&&E(K),pe!==V&&te(pe)}const Pe=[];for(let T=1;T<C.length;T++){const K=C[T];if(!K||K.length<2)continue;const pe=O!==-1&&K[O]!=null?String(K[O]).trim():"",de=I!==-1&&K[I]!=null?String(K[I]).trim():"";if(!de)continue;const Ge=D!==-1?Jt(K[D]):0,Le=z!==-1?Jt(K[z]):0,st=Ge?Ge.toLocaleString("vi-VN"):"",xe=Le?Number(Math.floor(Le/1e3)).toLocaleString("vi-VN"):"";let Ye="";Ge>0&&Le>0&&(Ye=`${Math.round((Le/Ge-1)*100)}%`);let Oe=g;if(se!==-1&&K[se]!=null){const Re=String(K[se]).trim();Re&&(Oe=Re)}let kt=w;if(L!==-1&&K[L]!=null){const Re=String(K[L]).trim();Re&&(kt=Re)}let ht=V;if(F!==-1&&K[F]!=null){const Re=String(K[F]).trim();Re&&(ht=Re)}let Ct="";if(pe)try{Ct=`<div class="barcode"><img src="${Wt(pe)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${pe}" /></div>`}catch(Re){console.error("Error generating barcode for template item:",Re)}const vt=p==="gio_vang"?`<div class="sub-header">${kt}</div>`:"";let gt="";p==="gio_vang"?gt=`<div class="extra2" style="display:flex;align-items:baseline;justify-content:center"><span>${xe}</span><span class="small-zeros">.000</span></div>`:gt=`<div class="extra2">${xe}</div>`;const Rn=`<div class="sticker-container" data-type="${p}" style="background-image:url('${Z}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
                        ${Ct}
                        <div class="header-text">${Oe}</div>
                        ${vt}
                        <div class="extra1">${Ye}</div>
                        <div class="old">${st}</div>
                        <div class="name">${de}</div>
                        ${gt}
                        <div class="footer-text">${ht}</div>
                    </div>`,_n=We.replace(/[^0-9]/g,""),Zt=parseInt(_n,10),Hn=isNaN(Zt)?!0:ut(Ye)>=Zt;Pe.push({id:`tpl_${T}_${Date.now()}`,html:Rn,label:de.substring(0,50),oldPrice:st,newPrice:xe,percent:Ye,timestamp:Date.now(),code:pe,selected:Hn,header:Oe,subHeader:kt,footer:ht})}if(Pe.length===0){qe.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Me(T=>[...T,...Pe]),Be("queue"),Pe.length>0&&qt(Pe[0]),qe.success(`Đã thêm ${Pe.length} sticker vào hàng đợi in`)}catch{qe.error("Lỗi đọc file Excel")}},n.readAsBinaryString(a),t.target.value=""},Ft=t=>{if(t==null||t==="")return"";const a=String(t).replace(/\D/g,"");if(!a)return"";const n=Number(a);return Number(Math.floor(n/1e3)).toLocaleString("vi-VN")},bn=t=>{if(t==null||t==="")return"";const a=String(t).replace(/\D/g,"");return a?Number(a).toLocaleString("vi-VN"):""},wn=(t,a)=>{var y;const n=(y=t.target.files)==null?void 0:y[0];if(!n)return;const x=new FileReader;x.onload=async U=>{var N;try{const b=(N=U.target)==null?void 0:N.result,G=await pt(()=>import("./vendor-excel-CkFp8p6R.js"),[]),H=G.read(b,{type:"binary"}),C=H.SheetNames[0],P=H.Sheets[C],O=G.utils.sheet_to_json(P,{header:1});if(!O||O.length<2){qe.error("File không chứa đủ dữ liệu");return}const I=[];for(let D=1;D<O.length;D++){const z=O[D];if(!z||z.length===0)continue;let se="",L="",F="",fe="",Pe="",T="",K="";if(a==="purifier"?(K="MÁY LỌC NƯỚC",se=z[55]!=null?String(z[55]).trim():"",L=z[44]!=null?String(z[44]).trim():"",F=z[33]!=null?String(z[33]).trim():"",fe=z[20]!=null?String(z[20]).trim():"",Pe=z[1]!=null?String(z[1]).trim():"",T=z[31]!=null?String(z[31]).trim():"",L&&(L=ur(L))):(K="DUY NHẤT HÔM NAY",se=z[28]!=null?String(z[28]).trim():"",L=z[27]!=null?String(z[27]).trim():"",F=z[16]!=null?String(z[16]).trim():"",fe=z[17]!=null?String(z[17]).trim():"",Pe=z[8]!=null?String(z[8]).trim():"",T=z[31]!=null?String(z[31]).trim():""),!L)continue;let pe=se;pe.includes("-")&&(pe=pe.split("-")[0].trim());const de=bn(F),Ge=Ft(fe),Le=Ft(Pe),st=k==="service"?Le||Ge:Ge||Le;let xe="";const Ye=Number(de.replace(/\D/g,""));let Oe=Number(st.replace(/\D/g,""));if(Ye>0&&Oe>0){Oe*1e3<=Ye*1.5&&Oe<Ye&&(Oe=Oe*1e3);const gt=Math.round((Oe/Ye-1)*100);xe=gt<0?`${gt}%`:""}const kt=We.replace(/[^0-9]/g,""),ht=parseInt(kt,10),Ct=isNaN(ht)?!0:ut(xe)>=ht,vt={id:`erp_${a}_${D}_${Date.now()}`,html:"",label:L,oldPrice:de,newPrice:st,percent:xe,timestamp:Date.now(),code:pe,selected:Ct,salePrice:Ge,servicePrice:Le,header:K,footer:T};vt.html=Gt(vt,k,p,Z),I.push(vt)}if(I.length===0){qe.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Me(D=>[...D,...I]),Be("queue"),I.length>0&&qt(I[0]),qe.success(`Đã thêm ${I.length} sticker vào hàng đợi in`)}catch(b){console.error(b),qe.error("Lỗi đọc file Excel ERP")}},x.readAsBinaryString(n),t.target.value=""},kn=t=>{f(a=>a.map(n=>n.id===t?{...n,selected:!n.selected}:n))},vn=t=>{f(a=>a.map(n=>({...n,selected:t})))},yn=()=>{var C,P,O,I;const t=document.getElementById("print-section");if(!t)return;const a=t.querySelector(".sticker-container");if(!a)return;const n=((C=a.querySelector(".name"))==null?void 0:C.textContent)||"Sticker",x=((P=a.querySelector(".old"))==null?void 0:P.textContent)||"",y=((O=a.querySelector(".extra2"))==null?void 0:O.textContent)||"",U=((I=a.querySelector(".extra1"))==null?void 0:I.textContent)||"",N=We.replace(/[^0-9]/g,""),b=parseInt(N,10),G=isNaN(b)?!0:ut(U)>=b,H={id:`page_${Date.now()}`,html:a.outerHTML,label:n.substring(0,50),oldPrice:x,newPrice:y,percent:U,timestamp:Date.now(),code:jt,selected:G,salePrice:y,header:g,footer:V,subHeader:w};Me(D=>[...D,H])},Nn=t=>{Me(a=>a.filter(n=>n.id!==t)),Ke===t&&Xe(null)},jn=()=>{Me([]),Xe(null)},Sn=t=>{Me(a=>a.map(n=>n.id===t?{...n,selected:n.selected===!1}:n))},Cn=t=>{Me(a=>a.map(n=>({...n,selected:t})))},Tn=()=>{He.length!==0&&Lt(!0)},Pn=t=>{const a={id:`list_${Date.now()}`,name:t,pages:He,timestamp:Date.now(),stickerType:p,headerTextContent:g};St(n=>{const x=[a,...n].slice(0,20);return ot(ft,x).catch(()=>{}),x}),Lt(!1),qe.success(`Đã lưu danh sách "${t}" thành công!`)},zn=t=>{Me(t.pages),t.stickerType&&M(t.stickerType),t.headerTextContent&&v(t.headerTextContent),Xt(!1),Xe(null)},En=t=>{St(a=>{const n=a.filter(x=>x.id!==t);return ot(ft,n).catch(()=>{}),n})},$n=t=>{M(t.stickerType),B(t.bgImage),ae(t.headerTextSize),t.subHeaderTextSize!=null&&he(t.subHeaderTextSize),t.percentTextSize!=null&&Ae(t.percentTextSize),t.oldPriceTextSize!=null&&ve(t.oldPriceTextSize),t.nameTextSize!=null&&Qe(t.nameTextSize),t.newPriceTextSize!=null&&be(t.newPriceTextSize),t.footerTextSize!=null&&Ve(t.footerTextSize),f(t.batchItems),v(t.headerTextContent),E(t.subHeaderTextContent),te(t.footerTextContent),nt(t.showBarcode),Me(t.manualPages||[]),t.discountDisplayMode&&S(t.discountDisplayMode),Kt(!1),Xe(null)},Dn=t=>{Mt(a=>{const n=a.filter(x=>x.id!==t);return ot(Et,n).catch(()=>{}),n})},In=()=>{f([]),tt(""),v("HÀNG TRƯNG BÀY"),te("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),ae(8),Xe(null)},Mn=()=>{const t=l.length>0?l.filter(N=>N.selected).length:He.length===0?1:0,a=He.filter(N=>N.selected!==!1),n=t+a.length;if(n===0){qe.error("Không có trang nào để in!");return}const x=document.createElement("div");if(x.id="print-host",x.innerHTML=`
            <style>
                #print-host .header-text { font-size: ${je}cqi !important; }
                #print-host .sub-header { font-size: ${Se}cqi !important; }
                #print-host .extra1 { font-size: ${ke}cqi !important; }
                #print-host .old { font-size: ${Ue}cqi !important; }
                #print-host .name { font-size: ${Ce}cqi !important; }
                #print-host .extra2 { font-size: ${ye}cqi !important; }
                #print-host .footer-text { font-size: ${Te}cqi !important; }
                #print-host .sticker-container {
                    outline: ${p==="draw"?"none":"1.5px dashed #6366f1"};
                    outline-offset: 1px;
                }
            </style>
        `,l.length>0)l.filter(b=>b.selected).forEach(b=>{const G={id:b.id,html:"",label:b.name,oldPrice:b.oldPrice,newPrice:b.newPrice,percent:b.percent,timestamp:Date.now(),code:Fe?b.imei:void 0,header:g,subHeader:w,footer:V};x.insertAdjacentHTML("beforeend",Gt(G,k,p,Z,Ne))});else if(He.length===0){const N=document.getElementById("print-section");N&&x.insertAdjacentHTML("beforeend",N.innerHTML)}a.forEach(N=>{let b=N.header||"",G=N.subHeader||"",H=N.footer||"";p==="gio_vang"?((!b||b==="SẢN PHẨM GIÁ SỐC"||b==="QUẠT ĐIỀU HOÀ"||!b.toUpperCase().startsWith("TỪ"))&&(b=g),(!G||!G.toUpperCase().includes("SUẤT"))&&(G=w)):p==="gia_soc"&&b&&(b.toUpperCase().startsWith("TỪ")||b.includes("/"))&&(b=g);const C={...N,header:b,subHeader:G,footer:H||V};x.insertAdjacentHTML("beforeend",Gt(C,k,p,Z,Ne))}),document.body.appendChild(x);const y=document.getElementById("root");y&&(y.style.display="none");const U={id:`history_${Date.now()}`,timestamp:Date.now(),label:g||"Sticker",pageCount:n,stickerType:p,bgImage:Z,headerTextSize:je,subHeaderTextSize:Se,percentTextSize:ke,oldPriceTextSize:Ue,nameTextSize:Ce,newPriceTextSize:ye,footerTextSize:Te,batchItems:l,headerTextContent:g,subHeaderTextContent:w,footerTextContent:V,showBarcode:Fe,manualPages:He,discountDisplayMode:Ne};Mt(N=>{const b=N.findIndex(C=>hr(C,U));let G;if(b!==-1){const C={...N[b],timestamp:Date.now()},P=N.filter((O,I)=>I!==b);G=[C,...P]}else G=[U,...N];const H=G.slice(0,20);return ot(Et,H).catch(()=>{}),H}),setTimeout(()=>{window.print(),y&&(y.style.display=""),document.body.removeChild(x)},200)};return e.jsxs("div",{className:"print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden",children:[c&&r==="tools-print-sticker"&&document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")&&Fn.createPortal(e.jsxs("div",{className:"flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs($,{variant:"ghost",onClick:()=>{h("sticker"),M("gia_soc"),v("QUẠT ĐIỀU HOÀ"),B("/frame/X24_NEW.png"),ae(8),wt("gia-soc")},className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${s==="sticker"&&p==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giá Sốc"}),e.jsxs("span",{className:"hidden lg:inline",children:[s==="sticker"&&p==="gia_soc"&&e.jsx(zt,{size:14,className:"inline mr-1 text-indigo-600 dark:text-indigo-400"}),"Giá Sốc"]})]}),e.jsxs($,{variant:"ghost",onClick:()=>{h("sticker"),M("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),B("/frame/GVO2-scaled.png"),ae(8),wt("gio-vang")},className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${s==="sticker"&&p==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giờ Vàng"}),e.jsxs("span",{className:"hidden lg:inline",children:[s==="sticker"&&p==="gio_vang"&&e.jsx(zt,{size:14,className:"inline mr-1 text-amber-600 dark:text-amber-400"}),"Giờ Vàng"]})]}),e.jsxs($,{variant:"ghost",onClick:()=>{h("sticker"),M("draw"),B("/frame/bg_phieu.png"),wt("draw"),Ie("drawContentTopLeft")},className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${s==="sticker"&&p==="draw"?"bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Rút Thăm"}),e.jsxs("span",{className:"hidden lg:inline",children:[s==="sticker"&&p==="draw"&&e.jsx(zt,{size:14,className:"inline mr-1 text-rose-600 dark:text-rose-400"}),"Phiếu Rút Thăm"]})]}),e.jsxs($,{variant:"ghost",onClick:()=>{h("event"),R(!0),wt("event")},className:`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${s==="event"?"bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Event"}),e.jsxs("span",{className:"hidden lg:inline",children:[s==="event"&&e.jsx(zt,{size:14,className:"inline mr-1 text-emerald-600 dark:text-emerald-400"}),e.jsx(cn,{size:14,className:"inline mr-1"}),"Event - Tồn kho"]})]})]}),s==="sticker"&&e.jsxs("div",{className:"flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400",children:p==="draw"?`${Dt()}:`:`${Nt()}:`}),e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]",children:[e.jsx($,{variant:"ghost",onMouseDown:t=>t.preventDefault(),onClick:()=>{if(p==="draw"){const t=ct(),a=Math.max(1,t-.2);xt(a),et(a)}else u(t=>Math.max(1,t-.2))},className:"bg-transparent hover:bg-transparent border-0 rounded-none h-full w-auto px-1.5 lg:px-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center",children:p==="draw"?ct().toFixed(1):$t()}),e.jsx($,{variant:"ghost",onMouseDown:t=>t.preventDefault(),onClick:()=>{if(p==="draw"){const a=ct()+.2;xt(a),et(a)}else u(t=>t+.2)},className:"bg-transparent hover:bg-transparent border-0 rounded-none h-full w-auto px-1.5 lg:px-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})]})]}),document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")),j&&e.jsx("div",{className:`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-200 ${s==="event"?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,children:e.jsx(Un,{name:"Event - Tồn kho",children:e.jsx(i.Suspense,{fallback:e.jsx("div",{className:"w-full h-full flex items-center justify-center bg-slate-50",children:e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx("div",{className:"w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"}),e.jsx("p",{className:"text-sm text-slate-500 font-medium",children:"Đang tải Event - Tồn kho..."})]})}),children:e.jsx(dr,{})})})}),e.jsxs("div",{className:`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${s==="event"?"invisible":"visible"}`,children:[e.jsx("div",{className:"flex flex-col gap-4 w-full max-w-sm shrink-0",children:e.jsx(ar,{batchItems:l,stickerType:p,showBarcode:Fe,discountDisplayMode:Ne,headerTextContent:g,subHeaderTextContent:w,footerTextContent:V,barcodeImei:jt,bgImage:Z,headerTextSize:je,subHeaderTextSize:Se,percentTextSize:ke,oldPriceTextSize:Ue,nameTextSize:Ce,newPriceTextSize:ye,footerTextSize:Te,previewName:dt,previewOldPrice:_t,previewNewPrice:Ht,setPreviewOldPrice:bt,setPreviewNewPrice:at,activeField:_e,setActiveField:Ie,setHeaderTextContent:v,setSubHeaderTextContent:E,setFooterTextContent:te,setBarcodeImei:rt,setPreviewName:mt,drawTickets:X,setDrawTickets:ne,drawAutoIncrement:q,drawContentTopLeftSize:ie,drawContentTopRightSize:le,drawContentBottomLeftSize:ce,drawContentBottomRightSize:J,drawTitleSize:A,drawCodeSize:ee,drawFooterSize:ge})}),e.jsx(lr,{manualPages:He,batchItems:l,savedLists:Rt,showSavedLists:un,setShowSavedLists:Xt,saveCurrentList:Tn,clearManualPages:jn,loadPageToEditor:qt,removeManualPage:Nn,loadSavedList:zn,deleteSavedList:En,togglePageSelection:Sn,toggleAllPagesSelection:Cn,showBarcode:Fe,setShowBarcode:nt,discountDisplayMode:Ne,setDiscountDisplayMode:S,searchTerm:oe,setSearchTerm:tt,printHistory:It,showHistory:dn,setShowHistory:Kt,handlePrint:Mn,addCurrentPage:yn,handleExcelUpload:pn,handleTemplateUpload:mn,downloadTemplate:xn,handleReset:In,toggleAllSelection:vn,toggleItemSelection:kn,clearBatchItems:()=>f([]),restoreHistory:$n,deleteHistory:Dn,discountThreshold:We,handleDiscountThresholdChange:fn,activeQueuePageId:Ke,setActiveQueuePageId:Xe,activeSubTab:Je,setActiveSubTab:Be,priceSource:k,setPriceSource:W,handleErpPriceUpload:wn,stickerType:p,drawStartNumber:Q,setDrawStartNumber:ue,drawTotalTickets:re,setDrawTotalTickets:Y,drawAutoIncrement:q,setDrawAutoIncrement:Ee})]}),Qt&&e.jsx(cr,{isOpen:Qt,onClose:()=>Lt(!1),onSave:Pn,defaultName:`DS ${new Date().toLocaleDateString("vi-VN")}`})]})}const mr=Object.freeze(Object.defineProperty({__proto__:null,default:gr},Symbol.toStringTag,{value:"Module"}));export{cr as S,mr as a};
