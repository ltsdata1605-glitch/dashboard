const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/StickerEventApp-XJGykbW3.js","assets/index-BOXEGiCa.js","assets/vendor-ui-BoQAhSeD.js","assets/vendor-charts-B95VUJRi.js","assets/vendor-firebase-Bpyixda8.js","assets/index-CS3VplT_.css","assets/uiService-C0Y8dE4Y.js"])))=>i.map(i=>d[i]);
import{j as e,B as Qe,b as Ot,u as Ln,a as qn,_ as ht,s as st,E as Un,e as Ct,z as Le}from"./index-BOXEGiCa.js";import{e as ot,a as i,B as Bn,j as Gn,k as On,P as en,l as tn,X as Ut,m as nn,n as An,i as At,o as Vn,p as Wn,q as Kn,s as ln,t as Xn,u as Yn,v as rn,w as Tt,F as Qn,D as Jn,x as cn,f as Pt}from"./vendor-ui-BoQAhSeD.js";import{r as Zn}from"./vendor-charts-B95VUJRi.js";const Fn=104,er=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]],tr=[2,3,3,1,1,1,2];function nr(r){const d=[Fn];for(let o=0;o<r.length;o++){const u=r.charCodeAt(o)-32;u<0||u>95||d.push(u)}let c=d[0];for(let o=1;o<d.length;o++)c+=d[o]*o;c%=103,d.push(c);const a=d.map(o=>er[o]);return a.push(tr),a}function Wt(r,d=40,c="#000"){if(!r)return"";const a=nr(r);let o=0;for(const U of a)for(const k of U)o+=k;const u=10,j=o+u*2,M=3,x=document.createElement("canvas");x.width=j*M,x.height=d*M;const I=x.getContext("2d");if(!I)return"";I.fillStyle="#fff",I.fillRect(0,0,x.width,x.height),I.fillStyle=c;let F=u*M;for(const U of a)for(let k=0;k<U.length;k++){const V=U[k]*M;k%2===0&&I.fillRect(F,0,V,x.height),F+=V}return x.toDataURL("image/png")}function sn({value:r,height:d=40,barColor:c="#000",className:a,style:o}){const[u,j]=ot.useState("");return i.useEffect(()=>{if(r)try{const M=Wt(r,d,c);j(M)}catch(M){console.error("Error generating barcode data URL:",M)}},[r,d,c]),!r||!u?null:e.jsx("img",{src:u,className:a,style:{imageRendering:"pixelated",width:"100%",height:"100%",objectFit:"fill",...o},alt:r})}const rr=ot.memo(({ticket:r,firstTicket:d,onChange:c,index:a,drawContentTopLeftSize:o,drawContentTopRightSize:u,drawContentBottomLeftSize:j,drawContentBottomRightSize:M,drawTitleSize:x,drawCodeSize:I,drawFooterSize:F,activeField:U,setActiveField:k,isAutoIncrement:V,totalIndex:X})=>{const te=i.useCallback(R=>{c({title:R})},[c]),Q=i.useCallback(R=>{c({code:R})},[c]),ce=i.useCallback(R=>{c({footer:R})},[c]),ne=i.useCallback(R=>{c({contentTop:R})},[c]),Y=i.useCallback(R=>{c({contentBottom:R})},[c]),L=i.useCallback(R=>{c({contentTopRight:R})},[c]),ze=i.useCallback(R=>{c({contentBottomRight:R})},[c]),oe=Pe(r.title,te,!0),me=Pe(r.code,Q,!0),ae=Pe(r.footer,ce,!0),Ee=Pe(r.contentTop||"",ne,!0),ie=Pe(r.contentTopRight||"",L,!0),xe=Pe(r.contentBottom||"",Y,!0),J=Pe(r.contentBottomRight||"",ze,!0),m=X!==void 0?X===0:a===0,A=d||r;return e.jsxs("div",{className:"draw-ticket-block","data-index":a,children:[m?e.jsx("div",{ref:oe.ref,onInput:oe.handleInput,onClick:()=>k==null?void 0:k("drawTitle"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-title-left animate-pulse-once ${U==="drawTitle"?"active-field":""}`,style:{fontSize:`${x||3.6}cqw`},"data-placeholder":"Nhập tiêu đề..."}):e.jsx("div",{className:"display-title-left",style:{fontSize:`${x||3.6}cqw`},dangerouslySetInnerHTML:{__html:A.title}}),e.jsx("div",{className:"display-title-right",style:{fontSize:`${x||3.6}cqw`},dangerouslySetInnerHTML:{__html:A.title}}),m?e.jsx("div",{ref:Ee.ref,onInput:Ee.handleInput,onClick:()=>k==null?void 0:k("drawContentTopLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-left ${U==="drawContentTopLeft"?"active-field":""}`,style:{fontSize:`${o||3.5}cqw`},"data-placeholder":"Nhập thông tin 1 (Họ tên, SĐT...)"}):e.jsx("div",{className:"display-content-top-left",style:{fontSize:`${o||3.5}cqw`},dangerouslySetInnerHTML:{__html:A.contentTop||""}}),m?e.jsx("div",{ref:ie.ref,onInput:ie.handleInput,onClick:()=>k==null?void 0:k("drawContentTopRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-top-right ${U==="drawContentTopRight"?"active-field":""}`,style:{fontSize:`${u||3.5}cqw`},"data-placeholder":"Nhập thông tin 3 (Tự gõ...)"}):e.jsx("div",{className:"display-content-top-right",style:{fontSize:`${u||3.5}cqw`},dangerouslySetInnerHTML:{__html:A.contentTopRight||""}}),V?e.jsx("div",{className:"display-code-left",style:{fontSize:`${I||3.8}cqw`},children:r.code}):e.jsx("div",{ref:me.ref,onInput:me.handleInput,onClick:()=>k==null?void 0:k("drawCode"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-code-left ${U==="drawCode"?"active-field":""}`,style:{fontSize:`${I||3.8}cqw`},"data-placeholder":"Số"}),e.jsx("div",{className:"display-code-right",style:{fontSize:`${I||3.8}cqw`},children:r.code}),m?e.jsx("div",{ref:xe.ref,onInput:xe.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomLeft"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-left ${U==="drawContentBottomLeft"?"active-field":""}`,style:{fontSize:`${j||2.2}cqw`},"data-placeholder":"Nhập thông tin 2 (Địa chỉ...)"}):e.jsx("div",{className:"display-content-bottom-left",style:{fontSize:`${j||2.2}cqw`},dangerouslySetInnerHTML:{__html:A.contentBottom||""}}),m?e.jsx("div",{ref:J.ref,onInput:J.handleInput,onClick:()=>k==null?void 0:k("drawContentBottomRight"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-content-bottom-right ${U==="drawContentBottomRight"?"active-field":""}`,style:{fontSize:`${M||2.2}cqw`},"data-placeholder":"Nhập thông tin 4 (Tự gõ...)"}):e.jsx("div",{className:"display-content-bottom-right",style:{fontSize:`${M||2.2}cqw`},dangerouslySetInnerHTML:{__html:A.contentBottomRight||""}}),m?e.jsx("div",{ref:ae.ref,onInput:ae.handleInput,onClick:()=>k==null?void 0:k("drawFooter"),contentEditable:!0,suppressContentEditableWarning:!0,className:`input-footer-left ${U==="drawFooter"?"active-field":""}`,style:{fontSize:`${F||3.8}cqw`},"data-placeholder":"Nhập tên siêu thị..."}):e.jsx("div",{className:"display-footer-left",style:{fontSize:`${F||3.8}cqw`},dangerouslySetInnerHTML:{__html:A.footer}})]})});function Pe(r,d,c=!1){const a=i.useRef(null),o=i.useRef(null);i.useEffect(()=>{a.current&&a.current!==o.current&&(o.current=a.current,(c?a.current.innerHTML:a.current.innerText)!==r&&(c?a.current.innerHTML=r:a.current.innerText=r))}),i.useEffect(()=>{a.current&&document.activeElement!==a.current&&(c?a.current.innerHTML:a.current.innerText)!==r&&(c?a.current.innerHTML=r:a.current.innerText=r)},[r,c]);const u=i.useCallback(j=>{d==null||d(c?j.currentTarget.innerHTML:j.currentTarget.innerText)},[d,c]);return{ref:a,handleInput:u}}const on=(r,d)=>{const c=Number(r.replace(/\D/g,""));let a=Number(d.replace(/\D/g,""));if(c<=0||a<=0)return null;a*1e3<=c*1.5&&a<c&&(a=a*1e3);const o=c-a;if(o<=0)return null;let u="",j="";if(o<1e6)u=(o/1e3).toString(),j="K";else{const M=o/1e6;u=Number(M.toFixed(1)).toString(),j="triệu"}return e.jsxs("span",{className:"discount-amount font-bold",children:[e.jsx("span",{className:"discount-label",children:"-"}),e.jsx("span",{className:"discount-num",children:u}),e.jsx("span",{className:`discount-unit ${j==="triệu"?"unit-trieu":"unit-k"}`,children:j})]})},Bt=(r,d)=>{const c=Number(r.replace(/\D/g,""));let a=Number(d.replace(/\D/g,""));if(c<=0||a<=0)return null;a*1e3<=c*1.5&&a<c&&(a=a*1e3);const o=Math.round((a/c-1)*100);return o<0?`${o}%`:""},sr=({batchItems:r,stickerType:d,showBarcode:c,discountDisplayMode:a,headerTextContent:o,subHeaderTextContent:u,footerTextContent:j,barcodeImei:M,bgImage:x,headerTextSize:I,subHeaderTextSize:F,percentTextSize:U,oldPriceTextSize:k,nameTextSize:V,newPriceTextSize:X,footerTextSize:te,previewName:Q,previewOldPrice:ce,previewNewPrice:ne,activeField:Y,setActiveField:L,setHeaderTextContent:ze,setSubHeaderTextContent:oe,setFooterTextContent:me,setBarcodeImei:ae,setPreviewName:Ee,setPreviewOldPrice:ie,setPreviewNewPrice:xe,updateBatchItem:J,drawTickets:m=[],setDrawTickets:A,drawContentTopLeftSize:R,drawContentTopRightSize:ee,drawContentBottomLeftSize:$e,drawContentBottomRightSize:ue,drawTitleSize:at,drawCodeSize:Re,drawFooterSize:De,drawAutoIncrement:ye})=>{const[re,Ne]=ot.useState(0),de=Math.ceil((m||[]).length/4);ot.useEffect(()=>{re>=de&&Ne(0)},[m==null?void 0:m.length,de,re]);const be=i.useRef(null),Ae=i.useRef(new Map),qe=i.useCallback(f=>{const l=Ae.current;let g=l.get(f);return g||(g=h=>{A==null||A(v=>v.map((w,E)=>E===f?{...w,...h}:w))},l.set(f,g)),g},[A]),[we,je]=ot.useState(null),[Je,ke]=ot.useState(null),pe=i.useRef(null);ot.useEffect(()=>{const f=()=>{const l=window.getSelection();if(!l||l.rangeCount===0||l.isCollapsed){je(null),ke(null);return}const g=l.getRangeAt(0);let h=g.commonAncestorContainer;h.nodeType===3&&(h=h.parentNode||h);let v=h,w=!1;for(;v;){if(v.nodeType===1&&v.getAttribute("contenteditable")==="true"){w=!0;break}v=v.parentNode}if(!w){je(null),ke(null);return}pe.current=g.cloneRange();const E=g.getClientRects();if(E.length>0){const O=E[0];je({top:O.top+window.scrollY-50,left:O.left+window.scrollX+O.width/2})}else je(null),ke(null)};return document.addEventListener("selectionchange",f),()=>{document.removeEventListener("selectionchange",f)}},[]);const Se=(f,l)=>{let g=pe.current;const h=window.getSelection();if(!g&&h&&h.rangeCount>0&&(g=h.getRangeAt(0)),!g)return;let v=g.commonAncestorContainer;v.nodeType===3&&(v=v.parentNode||v);let w=v,E=null;for(;w;){if(w.nodeType===1&&w.getAttribute("contenteditable")==="true"){E=w;break}w=w.parentNode}if(!E)return;if(g.collapsed)try{const W=E.innerHTML,Ce=f==="fontFamily"?"font-family":f;E.innerHTML=`<span style="${Ce}: ${l}">${W}</span>`;const xt=new Event("input",{bubbles:!0});E.dispatchEvent(xt);const Be=document.createRange();Be.selectNodeContents(E),h&&(h.removeAllRanges(),h.addRange(Be)),pe.current=Be;return}catch(W){console.error("Error applying custom style to container:",W)}h&&(h.removeAllRanges(),h.addRange(g));const O=document.createElement("span");O.style[f]=l;try{O.appendChild(g.extractContents()),g.insertNode(O);const W=document.createRange();W.selectNodeContents(O),h&&(h.removeAllRanges(),h.addRange(W)),pe.current=W;const Ce=new Event("input",{bubbles:!0});E.dispatchEvent(Ce)}catch(W){console.error("Error applying custom style to selection:",W)}},Ve=f=>{let l=pe.current;const g=window.getSelection();l&&g&&(g.removeAllRanges(),g.addRange(l)),document.execCommand(f,!1),g&&g.rangeCount>0&&(pe.current=g.getRangeAt(0).cloneRange());const h=window.getSelection();if(!h||h.rangeCount===0)return;let w=h.getRangeAt(0).commonAncestorContainer;w.nodeType===3&&(w=w.parentNode||w);let E=w;for(;E;){if(E.nodeType===1&&E.getAttribute("contenteditable")==="true"){const O=new Event("input",{bubbles:!0});E.dispatchEvent(O);break}E=E.parentNode}},ve=Pe(ce,ie),S=Pe(ne,xe),We=f=>{et(f),ve.handleInput(f)},vt=f=>{et(f),S.handleInput(f)},Ke=i.useCallback(f=>{Ee(f)},[Ee]),Xe=Pe(Q,Ke),Ze=Pe(o,ze),Ue=Pe(u,oe),yt=Pe(j,me),et=f=>{const l=f.currentTarget,g=l.innerText;if(/[a-zA-Z]/.test(g))return;const h=g.replace(/\D/g,"");if(!h)return;let v=parseInt(h,10);l.classList.contains("extra2")&&v>=1e5&&(v=Math.floor(v/1e3));const E=v.toLocaleString("vi-VN");if(g!==E){l.innerText=E;const W=document.createRange(),Ce=window.getSelection();Ce&&(W.selectNodeContents(l),W.collapse(!1),Ce.removeAllRanges(),Ce.addRange(W))}const O=l.closest(".sticker-container");O&&Et(O)},Et=f=>{const l=f.querySelector(".old"),g=f.querySelector(".extra2"),h=f.querySelector(".extra1");if(!l||!g||!h)return;const v=Number(l.innerText.replace(/\D/g,""));let w=Number(g.innerText.replace(/\D/g,""));if(v>0&&w>0)if(w*1e3<=v*1.5&&w<v&&(w=w*1e3),a==="amount"){const E=v-w;if(E>0){let O="",W="";E<1e6?(O=(E/1e3).toString(),W="K"):(O=Number((E/1e6).toFixed(1)).toString(),W="triệu");const Ce=W==="triệu"?"unit-trieu":"unit-k";h.innerHTML=`<span class="discount-amount font-bold"><span class="discount-label">-</span><span class="discount-num">${O}</span><span class="discount-unit ${Ce}">${W}</span></span>`}else h.innerText=""}else{const E=Math.round((w/v-1)*100);E<0?h.innerText=`${E}%`:h.innerText=""}},it=()=>{const f=window.getSelection();if(!f||f.rangeCount===0)return 3.5;let g=f.getRangeAt(0).commonAncestorContainer;g.nodeType===Node.TEXT_NODE&&(g=g.parentElement);const h=g==null?void 0:g.closest('span[style*="font-size"]');if(h){const w=h.style.fontSize.match(/([\d.]+)/);if(w)return parseFloat(w[1])}return 3.5},gt=f=>{const l=it(),g=Math.max(.5,Math.min(20,parseFloat((l+f).toFixed(1))));if(Se("fontSize",`${g}cqw`),pe.current){const h=window.getSelection();h&&(h.removeAllRanges(),h.addRange(pe.current))}},$t=f=>{const l=parseFloat(f);!isNaN(l)&&l>0&&Se("fontSize",`${l}cqw`)};return e.jsxs("div",{className:"bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-sm mx-auto overflow-hidden no-print-bg",children:[e.jsx("style",{children:i.useMemo(()=>`
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
                 `,[d,x,I,U,V,k,X,te,F])}),e.jsxs("div",{id:"print-section",className:"w-full",children:[d==="draw"?(()=>{const f=[];for(let l=0;l<m.length;l+=4)f.push(m.slice(l,l+4));return f.map((l,g)=>e.jsx("div",{className:`sticker-container draw-page ${g===re?"active-preview-page":""}`,"data-type":"draw",style:{backgroundImage:`url(${x})`,pageBreakAfter:g<f.length-1?"always":"auto",marginBottom:g<f.length-1?"20px":"0"},children:l.map((h,v)=>{const w=g*4+v;return e.jsx(rr,{index:v,ticket:h,firstTicket:m[0],isAutoIncrement:ye,drawContentTopLeftSize:R,drawContentTopRightSize:ee,drawContentBottomLeftSize:$e,drawContentBottomRightSize:ue,drawTitleSize:at,drawCodeSize:Re,drawFooterSize:De,activeField:Y,setActiveField:L,totalIndex:w,onChange:qe(w)},h.id||w)})},g))})():r.length>0?e.jsxs(e.Fragment,{children:[r.filter(f=>f.selected).slice(0,20).map((f,l,g)=>e.jsxs("div",{className:"sticker-container","data-type":d,style:{pageBreakAfter:l<g.length-1?"always":"auto",backgroundImage:`url(${x})`},children:[c&&f.imei&&e.jsx("div",{className:"barcode",children:e.jsx(sn,{value:f.imei})}),e.jsx("div",{className:`header-text ${Y==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("header"),onBlur:h=>ze(h.currentTarget.innerText),children:o}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${Y==="subHeader"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("subHeader"),onBlur:h=>oe(h.currentTarget.innerText),children:u}),e.jsx("div",{className:`extra1 ${Y==="percent"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("percent"),onBlur:h=>J==null?void 0:J(f.id,{percent:h.currentTarget.innerText}),children:a==="amount"&&on(f.oldPrice,f.newPrice)||f.percent},a),e.jsx("div",{className:`old ${Y==="oldPrice"?"active-field":""}`,onInput:et,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("oldPrice"),onBlur:h=>{const v=h.currentTarget.innerText,w=Bt(v,f.newPrice)||"";J==null||J(f.id,{oldPrice:v,percent:w})},children:f.oldPrice}),e.jsx("div",{className:`name ${Y==="name"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("name"),onBlur:h=>J==null?void 0:J(f.id,{name:h.currentTarget.innerText}),children:f.name}),e.jsx("div",{className:`extra2 ${Y==="newPrice"?"active-field":""}`,onInput:et,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("newPrice"),onBlur:h=>{const v=h.currentTarget.innerText,w=Bt(f.oldPrice,v)||"";J==null||J(f.id,{newPrice:v,percent:w})},children:f.newPrice}),e.jsx("div",{className:`footer-text ${Y==="footer"?"active-field":""}`,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("footer"),onBlur:h=>me(h.currentTarget.innerText),children:j})]},f.id)),r.filter(f=>f.selected).length>20&&e.jsxs("div",{className:"w-full py-4 text-center text-sm font-medium text-slate-500 bg-white/50 rounded-lg border border-slate-200 mt-4 shadow-sm",children:[e.jsx("span",{className:"text-indigo-600 font-bold",children:"Chế độ xem trước:"})," Đang hiển thị 20 sticker đầu tiên (trong tổng số ",r.filter(f=>f.selected).length," sticker).",e.jsx("br",{}),e.jsx("i",{children:"Tất cả sticker sẽ được in đầy đủ khi bấm nút IN."})]})]}):e.jsxs("div",{className:"sticker-container","data-type":d,style:{backgroundImage:`url(${x})`},children:[c&&M&&e.jsx("div",{className:"barcode",children:e.jsx(sn,{value:M})}),e.jsx("div",{className:`header-text ${Y==="header"?"active-field":""}`,style:d==="gia_soc"?{color:"white",backgroundColor:"transparent"}:{color:"black",backgroundColor:"transparent"},ref:Ze.ref,onInput:Ze.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("header")}),d==="gio_vang"&&e.jsx("div",{className:`sub-header ${Y==="subHeader"?"active-field":""}`,ref:Ue.ref,onInput:Ue.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("subHeader")}),e.jsx("div",{className:`extra1 ${Y==="percent"?"active-field":""}`,ref:be,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("percent"),children:a==="amount"?on(ce,ne):Bt(ce,ne)},a),e.jsx("div",{className:`old ${Y==="oldPrice"?"active-field":""}`,ref:ve.ref,onInput:We,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("oldPrice")}),e.jsx("div",{className:`name ${Y==="name"?"active-field":""}`,ref:Xe.ref,onInput:Xe.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("name")}),e.jsx("div",{className:`extra2 ${Y==="newPrice"?"active-field":""}`,ref:S.ref,onInput:vt,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("newPrice")}),e.jsx("div",{className:`footer-text ${Y==="footer"?"active-field":""}`,ref:yt.ref,onInput:yt.handleInput,contentEditable:!0,suppressContentEditableWarning:!0,onClick:()=>L("footer")})]}),(()=>{const f=we?we.top-window.scrollY<180:!1;return we&&e.jsxs("div",{className:"fixed z-[9999] -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden",style:{top:`${we.top}px`,left:`${we.left}px`},onMouseDown:l=>{l.preventDefault()},children:[e.jsxs("div",{className:"relative",children:[e.jsxs("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>ke(Je==="font"?null:"font"),className:"bg-transparent text-white text-[11px] font-semibold px-2 py-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border-r border-slate-700/80 mr-0.5",children:["Font ",e.jsx("span",{className:"text-[7px] opacity-75",children:"▼"})]}),Je==="font"&&e.jsx("div",{onMouseDown:l=>l.preventDefault(),className:`absolute left-0 mb-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 flex flex-col min-w-[150px] max-h-[200px] overflow-y-auto z-[10000] scrollbar-thin overflow-x-hidden ${f?"top-full mt-2":"bottom-full mb-2"}`,children:[{name:"UTM Avo",val:"'UTM Avo', sans-serif"},{name:"Plus Jakarta Sans",val:"'Plus Jakarta Sans', sans-serif"},{name:"Inter",val:"'Inter', sans-serif"},{name:"Oswald",val:"'Oswald', sans-serif"},{name:"Roboto Condensed",val:"'Roboto Condensed', sans-serif"},{name:"Fjalla One",val:"'Fjalla One', sans-serif"},{name:"Jost",val:"'Jost', sans-serif"},{name:"Josefin Sans",val:"'Josefin Sans', sans-serif"},{name:"Alata Regular",val:"'Alata Regular', sans-serif"},{name:"Shopee Text",val:"'Shopee Text', sans-serif"},{name:"SF Pro Display",val:"'SF Pro Display', sans-serif"},{name:"Samsung Sharp Sans",val:"'Samsung Sharp Sans', sans-serif"},{name:"Shopee Display",val:"'Shopee Display', sans-serif"},{name:"UTM Colossalis",val:"'UTM Colossalis', sans-serif"}].map(l=>e.jsx("button",{onMouseDown:g=>g.preventDefault(),onClick:()=>{Se("fontFamily",l.val),ke(null)},className:"px-3 py-1.5 text-left text-[11px] text-slate-200 hover:text-white hover:bg-slate-800 transition-colors w-full whitespace-nowrap",style:{fontFamily:l.val},children:l.name},l.val))})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print",children:[e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>gt(-.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Giảm size chữ",children:"-"}),e.jsx("input",{type:"text",onMouseDown:l=>l.stopPropagation(),onClick:l=>l.stopPropagation(),value:it().toFixed(1),onChange:l=>$t(l.target.value),className:"w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500",title:"Kích thước cqw"}),e.jsx("button",{onMouseDown:l=>l.preventDefault(),onClick:()=>gt(.2),className:"w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors",title:"Tăng size chữ",children:"+"})]}),e.jsx("button",{onClick:()=>Ve("bold"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In đậm (Bold)",children:e.jsx(Bn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ve("italic"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"In nghiêng (Italic)",children:e.jsx(Gn,{size:13,className:"stroke-[2.5]"})}),e.jsx("button",{onClick:()=>Ve("underline"),className:"p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors",title:"Gạch chân (Underline)",children:e.jsx(On,{size:13,className:"stroke-[2.5]"})}),e.jsx("div",{className:"absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95"})]})})()]}),d==="draw"&&de>1&&e.jsxs("div",{className:"flex flex-wrap items-center justify-center gap-1.5 mt-4 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 no-print",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-500 mr-1.5 uppercase",children:"Trang xem trước:"}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:()=>Ne(f=>Math.max(0,f-1)),disabled:re===0,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:"<"}),Array.from({length:de}).map((f,l)=>de>5&&l!==0&&l!==de-1&&Math.abs(l-re)>1?l===1&&re>2?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):l===de-2&&re<de-3?e.jsx("span",{className:"text-[10px] text-slate-400",children:"..."},l):null:e.jsx("button",{onClick:()=>Ne(l),className:`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${re===l?"bg-rose-600 text-white shadow-sm font-black":"bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"}`,children:l+1},l)),e.jsx("button",{onClick:()=>Ne(f=>Math.min(de-1,f+1)),disabled:re===de-1,className:"w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50",children:">"})]})]})]})},or=r=>{if(!r)return"";let d=r.replace(/^[\(\[]\d+[\)\]]\s*/,"");return d=d.replace(/\s*[\(\[]\d+[\)\]]$/,""),d.trim()},ar=(r,d)=>{let c=r.newPrice,a=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.servicePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const j=Math.round((u/o-1)*100);a=j<0?`${j}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.salePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const j=Math.round((u/o-1)*100);a=j<0?`${j}%`:""}}return{newPrice:c,percent:a}},ir=({manualPages:r,savedLists:d,showSavedLists:c,setShowSavedLists:a,saveCurrentList:o,clearManualPages:u,loadPageToEditor:j,removeManualPage:M,loadSavedList:x,deleteSavedList:I,togglePageSelection:F,toggleAllPagesSelection:U,discountThreshold:k,handleDiscountThresholdChange:V,activeQueuePageId:X,setActiveQueuePageId:te,discountDisplayMode:Q,setDiscountDisplayMode:ce,showBarcode:ne,setShowBarcode:Y,priceSource:L,setPriceSource:ze})=>{const[oe,me]=i.useState(""),[ae,Ee]=i.useState(()=>typeof window>"u"?!1:localStorage.getItem("hasSeenStickerDiscountTooltip")!=="true"),ie=()=>{localStorage.setItem("hasSeenStickerDiscountTooltip","true"),Ee(!1)},xe=r.filter(m=>{const A=oe.toLowerCase().trim();if(!A)return!0;const R=m.label.toLowerCase().includes(A),ee=m.code?m.code.toLowerCase().includes(A):!1;return R||ee}),J=r.length>0&&r.every(m=>m.selected!==!1);return e.jsxs("div",{className:"w-full h-full flex flex-col no-print space-y-3 overflow-hidden",children:[ae&&e.jsx("style",{children:`
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
                `}),r.length===0&&e.jsxs("div",{className:"flex items-center justify-between shrink-0 py-1 bg-slate-50 dark:bg-slate-900/20 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40",children:[e.jsx("span",{className:"text-[11px] font-bold text-slate-500 dark:text-slate-400",children:"Cấu hình in nhãn:"}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsxs("div",{className:"relative flex items-center",children:[e.jsx(Qe,{onClick:()=>{ce(Q==="percent"?"amount":"percent"),ae&&ie()},size:"icon",variant:"secondary",className:`h-8 w-8 transition-all ${ae?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":Q==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:Q==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:Q==="percent"?e.jsx(en,{size:14}):e.jsx(tn,{size:14})}),ae&&e.jsxs("div",{className:"absolute right-0 top-9 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx("button",{onClick:ie,className:"text-indigo-200 hover:text-white p-0.5",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx("button",{onClick:ie,className:"self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx(Qe,{onClick:()=>Y(!ne),size:"icon",variant:"secondary",className:`h-8 w-8 transition-colors ${ne?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:ne?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:14})})]})]}),r.length>0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[e.jsxs("h4",{className:"font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2",children:[e.jsx("input",{type:"checkbox",checked:J,onChange:m=>U(m.target.checked),className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0",title:"Chọn tất cả / Bỏ chọn tất cả"}),e.jsxs("span",{className:"text-xs font-bold text-slate-700 dark:text-slate-300",children:["Số lượng: ",r.length]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 shrink-0",children:[e.jsx(Ot,{type:"text",placeholder:"% Giảm",value:k,onChange:m=>V(m.target.value),className:"!w-12 !h-7 text-center px-1 text-[10px] rounded-lg font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white",title:"Nhập % giảm tối thiểu",fullWidth:!1}),e.jsxs("div",{className:"relative flex items-center",children:[e.jsx(Qe,{onClick:()=>{ce(Q==="percent"?"amount":"percent"),ae&&ie()},size:"icon",variant:"secondary",className:`h-7 w-7 transition-all ${ae?"discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20":Q==="amount"?"!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:Q==="percent"?"Hiển thị: % Giảm (Click đổi sang Số tiền)":"Hiển thị: Số tiền (Click đổi sang % Giảm)",children:Q==="percent"?e.jsx(en,{size:13}):e.jsx(tn,{size:13})}),ae&&e.jsxs("div",{className:"absolute right-0 top-8 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsxs("div",{className:"font-bold flex items-center justify-between",children:[e.jsx("span",{children:"💡 Kiểu giảm giá mới!"}),e.jsx("button",{onClick:ie,className:"text-indigo-200 hover:text-white p-0.5",children:e.jsx(Ut,{size:12})})]}),e.jsxs("p",{className:"leading-relaxed text-slate-100",children:["Click vào đây để chuyển đổi hiển thị giữa ",e.jsx("strong",{children:"% Giảm"})," hoặc ",e.jsx("strong",{children:"Số tiền"})," trên sticker!"]}),e.jsx("button",{onClick:ie,className:"self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm",children:"Đã hiểu"}),e.jsx("div",{className:"absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500"})]})]}),e.jsx(Qe,{onClick:()=>Y(!ne),size:"icon",variant:"secondary",className:`h-7 w-7 transition-colors ${ne?"!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800":"text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`,title:ne?"Mã Vạch: Đang bật (Click để tắt)":"Mã Vạch: Đang tắt (Click để bật)",children:e.jsx(nn,{size:13})}),e.jsx("div",{className:"h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"}),e.jsx(Qe,{onClick:o,size:"icon",variant:"secondary",className:"h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Lưu danh sách",children:e.jsx(An,{size:13})}),e.jsx(Qe,{onClick:u,size:"icon",variant:"secondary",className:"h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors",title:"Xóa tất cả",children:e.jsx(At,{size:13})})]})]}),r.some(m=>m.servicePrice||m.salePrice)&&e.jsxs("div",{className:"flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full shrink-0 mb-1",children:[e.jsx("button",{onClick:()=>ze("sale"),className:`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${L==="sale"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá giảm"}),e.jsx("button",{onClick:()=>ze("service"),className:`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${L==="service"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Giá Dịch vụ"})]}),e.jsx("div",{className:"relative shrink-0 mb-1",children:e.jsx(Ot,{type:"text",placeholder:"Tìm theo tên hoặc mã sản phẩm...",value:oe,onChange:m=>me(m.target.value),className:"h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 text-slate-750 dark:text-slate-350",fullWidth:!0,rightIcon:oe?"x":void 0,onRightIconClick:oe?()=>me(""):void 0})}),e.jsxs("div",{className:"space-y-2 flex-1 overflow-y-auto pr-1",children:[xe.map((m,A)=>e.jsxs("div",{tabIndex:0,"data-queue-index":A,className:`flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group outline-none ${m.id===X?"border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20":"border-slate-100 dark:border-slate-700"} ${m.selected===!1?"opacity-50":""}`,onClick:()=>{te(m.id),j(m)},onKeyDown:R=>{if(R.key==="ArrowDown"){R.preventDefault();const ee=A+1;if(ee<xe.length){const $e=xe[ee];te($e.id),j($e),setTimeout(()=>{const ue=document.querySelector(`[data-queue-index="${ee}"]`);ue==null||ue.focus()},10)}}else if(R.key==="ArrowUp"){R.preventDefault();const ee=A-1;if(ee>=0){const $e=xe[ee];te($e.id),j($e),setTimeout(()=>{const ue=document.querySelector(`[data-queue-index="${ee}"]`);ue==null||ue.focus()},10)}}},title:"Click hoặc dùng mũi tên Lên/Xuống để chỉnh sửa",children:[e.jsxs("div",{className:"flex items-center gap-2.5 min-w-0 flex-1",children:[e.jsx("input",{type:"checkbox",checked:m.selected!==!1,onChange:R=>{R.stopPropagation(),F(m.id)},className:"w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"}),e.jsx("span",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0",children:A+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs text-slate-700 dark:text-slate-300 truncate font-medium",children:or(m.label)}),e.jsx("div",{className:"flex gap-2 mt-0.5 text-[10px]",children:(()=>{const{newPrice:R,percent:ee}=ar(m,L);return e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-red-600 font-bold",children:R}),m.oldPrice&&e.jsx("span",{className:"line-through text-slate-400",children:m.oldPrice}),ee&&e.jsx("span",{className:"text-green-600 font-bold",children:ee})]})})()})]})]}),e.jsx("button",{onClick:R=>{R.stopPropagation(),M(m.id)},className:"text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100",children:e.jsx(Ut,{size:14})})]},m.id)),xe.length===0&&e.jsx("p",{className:"text-xs text-slate-400 dark:text-slate-500 text-center py-4",children:"Không tìm thấy sticker nào phù hợp"})]})]}),d.length>0&&r.length===0&&e.jsxs("div",{className:"p-0 space-y-3 flex-1 flex flex-col overflow-hidden",children:[e.jsxs("button",{onClick:()=>a(!c),className:"w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(Vn,{size:16,className:"text-emerald-500"}),"Danh sách đã lưu (",d.length,")"]}),c?e.jsx(Wn,{size:16}):e.jsx(Kn,{size:16})]}),c&&e.jsx("div",{className:"mt-3 space-y-2 flex-1 overflow-y-auto pr-1",children:d.map(m=>e.jsxs("div",{className:"flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:m.name}),e.jsxs("div",{className:"flex gap-2 mt-0.5 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(m.timestamp).toLocaleDateString("vi-VN")}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[m.pages.length," trang"]})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>x(m),className:"p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold",title:"Tải danh sách",children:e.jsx(ln,{size:13})}),e.jsx("button",{onClick:()=>I(m.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},m.id))})]}),r.length===0&&d.length===0&&e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"D.Sách in trống"})]})},lr=({manualPages:r,batchItems:d,showBarcode:c,setShowBarcode:a,discountDisplayMode:o,setDiscountDisplayMode:u,searchTerm:j,setSearchTerm:M,printHistory:x,showHistory:I,setShowHistory:F,handlePrint:U,addCurrentPage:k,handleExcelUpload:V,handleTemplateUpload:X,downloadTemplate:te,handleReset:Q,toggleAllSelection:ce,toggleItemSelection:ne,clearBatchItems:Y,restoreHistory:L,deleteHistory:ze,savedLists:oe,showSavedLists:me,setShowSavedLists:ae,saveCurrentList:Ee,clearManualPages:ie,loadPageToEditor:xe,removeManualPage:J,loadSavedList:m,deleteSavedList:A,togglePageSelection:R,toggleAllPagesSelection:ee,discountThreshold:$e,handleDiscountThresholdChange:ue,activeQueuePageId:at,setActiveQueuePageId:Re,activeSubTab:De,setActiveSubTab:ye,priceSource:re,setPriceSource:Ne,handleErpPriceUpload:de,stickerType:be,drawStartNumber:Ae,setDrawStartNumber:qe,drawTotalTickets:we,setDrawTotalTickets:je,drawAutoIncrement:Je,setDrawAutoIncrement:ke})=>{const pe=d.filter(S=>S.selected).length,Se=r.filter(S=>S.selected!==!1).length,Ve=d.filter(S=>S.name.toLowerCase().includes(j.toLowerCase())),ve=i.useMemo(()=>x.filter(S=>S.stickerType===be),[x,be]);return e.jsxs("div",{className:"w-full max-w-sm aspect-[197/285] bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 p-5 lg:p-6 no-print flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"flex gap-2 mb-3 shrink-0",children:[e.jsxs(Qe,{onClick:U,className:"flex-1 !bg-[#fbbc04] hover:!bg-[#f0b400] !text-black font-black text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-yellow-500/10 border-transparent",leftIcon:e.jsx(Xn,{size:16}),children:["BẤM ĐỂ IN (",d.length>0?pe+Se:r.length>0?Se:1,")"]}),e.jsx(Qe,{onClick:k,className:"bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md shadow-indigo-500/10 border-transparent",title:"Thêm trang hiện tại vào hàng đợi in",leftIcon:e.jsx(Yn,{size:16}),children:"Thêm"})]}),e.jsxs("div",{className:"flex border-b border-slate-100 dark:border-slate-700 mb-4 shrink-0",children:[e.jsx("button",{onClick:()=>ye("data"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${De==="data"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:"Dữ liệu"}),be!=="draw"&&e.jsxs("button",{onClick:()=>ye("queue"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${De==="queue"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["D.Sách (",r.length,")"]}),e.jsxs("button",{onClick:()=>ye("history"),className:`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${De==="history"?"border-indigo-600 text-indigo-600 dark:text-indigo-400":"border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:["Lịch sử (",ve.length,")"]})]}),e.jsxs("div",{className:`flex-1 pr-1 -mr-1 scrollbar-thin ${De==="queue"?"flex flex-col overflow-hidden":"overflow-y-auto space-y-2"}`,children:[De==="data"&&e.jsxs("div",{className:"space-y-2.5 animate-in fade-in duration-200 pb-2",children:[be==="draw"?e.jsxs("div",{className:"p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 space-y-4",children:[e.jsxs("p",{className:"text-[11px] lg:text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-200/40 pb-2",children:[e.jsx(rn,{size:14,className:"stroke-[2.5]"}),"Cấu hình in Phiếu Rút Thăm"]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số bắt đầu"}),e.jsx("input",{type:"number",min:"1",value:Ae,onChange:S=>qe(Math.max(1,parseInt(S.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400",children:"Số lượng cần in"}),e.jsx("input",{type:"number",min:"1",value:we,onChange:S=>je(Math.max(1,parseInt(S.target.value)||1)),className:"w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"})]})]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer select-none py-1",children:[e.jsx("input",{type:"checkbox",checked:Je,onChange:S=>ke(S.target.checked),className:"w-4 h-4 rounded text-rose-600 border-slate-300 dark:border-slate-700 focus:ring-rose-500 bg-white dark:bg-slate-900"}),e.jsx("span",{className:"text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300",children:"Tự động nhảy số liên tục"})]}),e.jsxs("div",{className:"bg-white/80 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed",children:[e.jsx("span",{className:"font-bold text-indigo-600 dark:text-indigo-400",children:"Gợi ý in:"})," ",we," phiếu rút thăm sẽ được in trên ",e.jsxs("span",{className:"font-bold text-slate-800 dark:text-white",children:[Math.ceil(we/4)," trang A4"]})," (mỗi trang 4 phiếu). Các số thứ tự sẽ tự động điền từ ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Ae})," đến ",e.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:Ae+we-1}),"."]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30",children:[e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-[11px] lg:text-xs",children:[e.jsx(Tt,{size:14}),"File giá ĐSD - TBBM",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:V,className:"hidden"})]}),e.jsx(Qe,{onClick:Q,variant:"secondary",className:"px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-[11px] lg:text-xs h-auto py-1.5 border-slate-200 dark:border-slate-600",children:"Reset"})]}),e.jsxs("div",{className:"p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1",children:[e.jsx(Qn,{size:12}),"Nhập từ File Mẫu"]}),e.jsxs("div",{className:"flex gap-1.5",children:[e.jsxs("button",{onClick:te,className:"flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Jn,{size:10}),"Tải File Mẫu"]}),e.jsxs("label",{className:"flex-1 flex items-center justify-center gap-1 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm",children:[e.jsx(Tt,{size:10}),"Nhập File Mẫu",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:X,className:"hidden"})]})]})]}),e.jsxs("div",{className:"p-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30",children:[e.jsxs("p",{className:"text-[10px] lg:text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1",children:[e.jsx(cn,{size:12}),"Nhập file in giá từ ERP"]}),e.jsxs("div",{className:"grid grid-cols-1 gap-2",children:[e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Tt,{size:10}),"Máy Lọc Nước (Mẫu in 99)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:S=>de(S,"purifier"),className:"hidden"})]}),e.jsxs("label",{className:"flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center",children:[e.jsx(Tt,{size:10}),"Điện Tử/Lạnh (Mẫu in 97)",e.jsx("input",{type:"file",accept:".xlsx, .xls, .csv",onChange:S=>de(S,"appliance"),className:"hidden"})]})]})]}),d.length>0&&e.jsxs("div",{className:"mt-4 border-t border-slate-200 dark:border-slate-700 pt-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-3",children:[e.jsxs("h4",{className:"font-bold text-xs text-slate-800 dark:text-white",children:["Danh sách in (",pe,"/",d.length,")"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>ce(!0),className:"text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase",children:"Chọn hết"}),e.jsx("button",{onClick:()=>ce(!1),className:"text-[10px] text-slate-500 hover:text-slate-600 font-bold uppercase",children:"Bỏ chọn"}),e.jsx("button",{onClick:Y,className:"text-[10px] text-red-500 hover:text-red-600 font-bold uppercase",children:"Xóa"})]})]}),e.jsx(Ot,{type:"text",placeholder:"Tìm tên sản phẩm hoặc IMEI...",value:j,onChange:S=>M(S.target.value),className:"mb-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"}),e.jsx("div",{className:"space-y-2",children:Ve.map(S=>e.jsxs("label",{className:`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${S.selected?"border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20":"border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`,children:[e.jsx("input",{type:"checkbox",checked:S.selected,onChange:()=>ne(S.id),className:"mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"font-bold text-xs text-slate-800 dark:text-white truncate",title:S.name,children:S.name}),e.jsxs("div",{className:"flex gap-3 mt-1.5 text-[11px]",children:[e.jsx("span",{className:"font-bold text-red-600",children:S.newPrice}),e.jsx("span",{className:"line-through text-slate-400",children:S.oldPrice}),e.jsx("span",{className:"text-green-600 font-bold",children:S.percent})]})]})]},S.id))})]})]}),e.jsxs("div",{className:"mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-2.5",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(rn,{size:13,className:"text-indigo-500"}),e.jsx("span",{className:"text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider",children:"H.Dẫn in & Sử dụng"})]}),e.jsxs("div",{className:"p-3 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-500 dark:text-slate-400",children:"CẤU HÌNH IN CHROME (CTRL + P):"}),e.jsxs("ul",{className:"space-y-1 text-[11px] text-slate-600 dark:text-slate-300",children:[e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Khổ giấy khuyên dùng: ",e.jsx("strong",{children:"A4"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Lề (Margins): ",e.jsx("strong",{children:"Không Có (None)"})]})]}),e.jsxs("li",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-indigo-500 shrink-0"}),e.jsxs("span",{children:["Chọn: ",e.jsx("strong",{children:"Hiển thị đồ họa nền (Background graphics)"})]})]})]})]}),e.jsx("div",{className:"border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300",children:be==="draw"?e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Nhập nội dung ở phiếu số 1 (trang 1). Các phiếu còn lại tự động đồng bộ theo."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Nhảy số:"}),' Bật chế độ "Tự động nhảy số" để hệ thống tự động tăng dần từ số bắt đầu.']})]}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Sửa nhanh:"})," Click trực tiếp vào chữ trên sticker ở khung preview."]}),e.jsxs("p",{children:["⚡ ",e.jsx("strong",{children:"Tính % tự động:"})," Chỉ cần nhập Giá cũ & Giá mới."]})]})})]})]})]}),De==="queue"&&e.jsx("div",{className:"flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 pb-2",children:e.jsx(ir,{manualPages:r,savedLists:oe,showSavedLists:me,setShowSavedLists:ae,saveCurrentList:Ee,clearManualPages:ie,loadPageToEditor:xe,removeManualPage:J,loadSavedList:m,deleteSavedList:A,togglePageSelection:R,toggleAllPagesSelection:ee,discountThreshold:$e,handleDiscountThresholdChange:ue,activeQueuePageId:at,setActiveQueuePageId:Re,discountDisplayMode:o,setDiscountDisplayMode:u,showBarcode:c,setShowBarcode:a,priceSource:re,setPriceSource:Ne})}),De==="history"&&e.jsx("div",{className:"space-y-2 animate-in fade-in duration-200 pb-2",children:ve.length===0?e.jsx("p",{className:"text-xs text-slate-400 text-center py-12",children:"Chưa có lịch sử in"}):ve.map(S=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group text-left",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-bold text-slate-800 dark:text-white truncate",children:S.label}),e.jsxs("div",{className:"flex gap-1.5 mt-1 text-[10px] text-slate-400",children:[e.jsx("span",{children:new Date(S.timestamp).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[S.pageCount," trang"]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:S.stickerType==="gia_soc"?"Giá Sốc":S.stickerType==="draw"?"Rút Thăm":"Giờ Vàng"})]})]}),e.jsxs("div",{className:"flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>L(S),className:"p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors",title:"Khôi phục",children:e.jsx(ln,{size:13})}),e.jsx("button",{onClick:()=>ze(S.id),className:"p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors",title:"Xóa",children:e.jsx(At,{size:13})})]})]},S.id))})]})]})},cr=({isOpen:r,onClose:d,onSave:c,defaultName:a})=>{const[o,u]=i.useState(a);if(!r)return null;const j=M=>{M.preventDefault(),o.trim()&&c(o.trim())};return e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4",children:e.jsx("div",{className:"bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden",children:e.jsxs("div",{className:"p-6",children:[e.jsx("h2",{className:"text-xl font-bold text-slate-800 mb-4",children:"Lưu Danh Sách"}),e.jsxs("form",{onSubmit:j,children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{htmlFor:"listName",className:"block text-sm font-medium text-slate-700 mb-1",children:"Tên danh sách"}),e.jsx("input",{type:"text",id:"listName",value:o,onChange:M=>u(M.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500",placeholder:"Nhập tên danh sách...",autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"flex justify-end gap-3 mt-6",children:[e.jsx("button",{type:"button",onClick:d,className:"px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors",children:"Hủy"}),e.jsx("button",{type:"submit",className:"px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors",children:"Lưu"})]})]})]})})})},dr=i.lazy(()=>ht(()=>import("./StickerEventApp-XJGykbW3.js"),__vite__mapDeps([0,1,2,3,4,5,6]))),an="stickerPrinterState",zt="stickerPrintHistory",ft="stickerSavedLists",ur=r=>{if(!r)return"";let d=r;d=d.replace(/Máy lọc nước/gi,"MLN");const c=["RO nóng lạnh tủ đứng","\\(IMEI\\)","nước nóng lạnh","RO âm tủ","RO tủ đứng","điện giải nóng nguội","nóng lạnh RO","RO nóng nguội lạnh tủ đứng"];for(const a of c){const o=new RegExp(a,"gi");d=d.replace(o,"")}return d=d.replace(/\s+/g," ").trim(),d},Vt=(r,d)=>{let c=r.newPrice,a=r.percent;if(d==="service"&&r.servicePrice){if(c=r.servicePrice,r.oldPrice&&r.servicePrice){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.servicePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const j=Math.round((u/o-1)*100);a=j<0?`${j}%`:""}}}else if(r.salePrice&&(c=r.salePrice,r.oldPrice&&r.salePrice)){const o=Number(r.oldPrice.replace(/\D/g,""));let u=Number(r.salePrice.replace(/\D/g,""));if(o>0&&u>0){u*1e3<=o*1.5&&u<o&&(u=u*1e3);const j=Math.round((u/o-1)*100);a=j<0?`${j}%`:""}}return{newPrice:c,percent:a}},Gt=(r,d,c,a,o="percent")=>{if(c==="draw")return`<div class="sticker-container" data-type="${c}" style="background-image:url('${a}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:2482/3512;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;"></div>`;let{newPrice:u,percent:j}=Vt(r,d),M=r.header,x=r.subHeader,I=r.footer;if(r.html&&(!M||!x||!I))try{const X=new DOMParser().parseFromString(r.html,"text/html"),te=X.querySelector(".header-text"),Q=X.querySelector(".sub-header"),ce=X.querySelector(".footer-text");M===void 0&&te&&(M=te.textContent||""),x===void 0&&Q&&(x=Q.textContent||""),I===void 0&&ce&&(I=ce.textContent||"")}catch(V){console.error("Error parsing fallback fields from page.html:",V)}let F="";if(r.code)try{F=`<div class="barcode"><img src="${Wt(r.code)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${r.code}" /></div>`}catch(V){console.error("Barcode error:",V)}const U=c==="gio_vang"?`<div class="sub-header">${x||""}</div>`:"",k=`<div class="extra2">${u}</div>`;if(o==="amount"){const V=Number(String(r.oldPrice).replace(/\D/g,""));let X=Number(String(u).replace(/\D/g,""));if(V>0&&X>0){X*1e3<=V*1.5&&X<V&&(X=X*1e3);const te=V-X;te>0&&(j=`-${(te/1e3).toLocaleString("vi-VN")}K`)}}return`<div class="sticker-container" data-type="${c}" style="background-image:url('${a}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
        ${F}
        <div class="header-text">${M||""}</div>
        ${U}
        <div class="extra1">${j}</div>
        <div class="old">${r.oldPrice}</div>
        <div class="name">${r.label}</div>
        ${k}
        <div class="footer-text">${I||""}</div>
    </div>`},fr=(r,d)=>{if(r.stickerType!==d.stickerType||r.headerTextContent!==d.headerTextContent||r.subHeaderTextContent!==d.subHeaderTextContent||r.footerTextContent!==d.footerTextContent||r.showBarcode!==d.showBarcode||r.discountDisplayMode!==d.discountDisplayMode||r.pageCount!==d.pageCount||r.batchItems.length!==d.batchItems.length)return!1;for(let c=0;c<r.batchItems.length;c++){const a=r.batchItems[c],o=d.batchItems[c];if(a.name!==o.name||a.oldPrice!==o.oldPrice||a.newPrice!==o.newPrice||a.percent!==o.percent||a.imei!==o.imei||a.selected!==o.selected)return!1}if(r.manualPages.length!==d.manualPages.length)return!1;for(let c=0;c<r.manualPages.length;c++){const a=r.manualPages[c],o=d.manualPages[c];if(a.label!==o.label||a.oldPrice!==o.oldPrice||a.newPrice!==o.newPrice||a.percent!==o.percent||a.code!==o.code||a.header!==o.header||a.subHeader!==o.subHeader||a.footer!==o.footer||a.selected!==o.selected)return!1}return!0};function hr(){const{activeTab:r}=Ln(),{user:d}=qn(),[c,a]=i.useState(!1),[o,u]=i.useState("sticker"),[j,M]=i.useState(!1),[x,I]=i.useState("gia_soc"),[F,U]=i.useState("/frame/X24_NEW.png"),[k,V]=i.useState("sale"),[X,te]=i.useState([{id:"1",title:"",code:"1",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"2",title:"",code:"2",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"3",title:"",code:"3",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},{id:"4",title:"",code:"4",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""}]),[Q,ce]=i.useState(1),[ne,Y]=i.useState(4),[L,ze]=i.useState(!0),[oe,me]=i.useState(3.5),[ae,Ee]=i.useState(3.5),[ie,xe]=i.useState(2.2),[J,m]=i.useState(2.2),[A,R]=i.useState(3.6),[ee,$e]=i.useState(3.8),[ue,at]=i.useState(3.8),[Re,De]=i.useState("header"),[ye,re]=i.useState(8),[Ne,de]=i.useState(13),[be,Ae]=i.useState(36.9),[qe,we]=i.useState(14.2),[je,Je]=i.useState(3.6),[ke,pe]=i.useState(26.5),[Se,Ve]=i.useState(3.2),[ve,S]=i.useState("percent"),[We,vt]=i.useState(""),[Ke,Xe]=i.useState(null),[Ze,Ue]=i.useState("data");i.useEffect(()=>{x==="draw"&&Ze==="queue"&&Ue("data")},[x,Ze]);const yt=()=>{switch(Re){case"header":return"Tiêu đề";case"subHeader":return"Tiêu đề phụ";case"percent":return"% Giảm";case"oldPrice":return"Giá cũ";case"name":return"Tên SP";case"newPrice":return"Giá mới";case"footer":return"Khuyến mãi";default:return"Cỡ chữ"}},et=t=>{const s=window.getSelection();if(!s||s.rangeCount===0||s.isCollapsed)return!1;const n=s.getRangeAt(0);let p=n.commonAncestorContainer;p.nodeType===3&&(p=p.parentNode||p);let y=p,q=null;for(;y;){if(y.nodeType===1){const N=y;if(N.getAttribute("contenteditable")==="true"){q=N;break}}y=y.parentNode}if(q){const N=document.createElement("span");N.style.fontSize=`${t.toFixed(1)}cqw`;try{N.appendChild(n.extractContents()),n.insertNode(N);const b=new Event("input",{bubbles:!0});return q.dispatchEvent(b),!0}catch(b){console.error("Error applying font size to selection:",b)}}return!1},Et=()=>{switch(Re){case"header":return ye;case"subHeader":return Ne;case"percent":return be;case"oldPrice":return qe;case"name":return je;case"newPrice":return ke;case"footer":return Se;default:return ye}},it=()=>{switch(Re){case"drawTitle":return A;case"drawContentTopLeft":return oe;case"drawContentTopRight":return ae;case"drawContentBottomLeft":return ie;case"drawContentBottomRight":return J;case"drawCode":return ee;case"drawFooter":return ue;default:return oe}},gt=t=>{const s=n=>typeof t=="function"?t(n):t;switch(Re){case"drawTitle":R(s);break;case"drawContentTopLeft":me(s);break;case"drawContentTopRight":Ee(s);break;case"drawContentBottomLeft":xe(s);break;case"drawContentBottomRight":m(s);break;case"drawCode":$e(s);break;case"drawFooter":at(s);break;default:me(s)}},$t=()=>{switch(Re){case"drawTitle":return"Cỡ chữ Tiêu đề";case"drawContentTopLeft":return"Cỡ chữ Giải thưởng trái";case"drawContentTopRight":return"Cỡ chữ Giải thưởng phải";case"drawContentBottomLeft":return"Cỡ chữ Thông tin trái";case"drawContentBottomRight":return"Cỡ chữ Thông tin phải";case"drawCode":return"Cỡ chữ Mã số";case"drawFooter":return"Cỡ chữ Siêu thị";default:return"Cỡ chữ Giải thưởng trái"}},f=t=>{const s=n=>{const p=typeof t=="function"?t(n):t;return Number(p.toFixed(1))};switch(Re){case"header":re(s);break;case"subHeader":de(s);break;case"percent":Ae(s);break;case"oldPrice":we(s);break;case"name":Je(s);break;case"newPrice":pe(s);break;case"footer":Ve(s);break}},[l,g]=i.useState([]),[h,v]=i.useState("QUẠT ĐIỀU HOÀ"),[w,E]=i.useState("0 SUẤT/NGÀY"),[O,W]=i.useState("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),[Ce,xt]=i.useState(""),[Be,Dt]=i.useState(!1),[Nt,tt]=i.useState("123456"),[_e,Ie]=i.useState([]),[It,Mt]=i.useState([]),[dn,Kt]=i.useState(!1),[Rt,jt]=i.useState([]),[un,Xt]=i.useState(!1),[lt,pt]=i.useState("Quạt điều hoà Daikiosan DMI03"),[_t,mt]=i.useState("5.490.000"),[Ht,nt]=i.useState("3.490"),[Fe,fn]=i.useState(!1),[Yt,hn]=i.useState(!1),[Qt,Lt]=i.useState(!1);i.useEffect(()=>{Fe&&x==="draw"&&te(t=>{var p;const s=t[0]||{id:"1",title:"",code:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:""},n=[];for(let y=0;y<ne;y++){const q=L?(Q+y).toString():((p=t[y])==null?void 0:p.code)||"";y===0?n.push({...s,id:"1",code:L?Q.toString():s.code||"1"}):n.push({id:(y+1).toString(),title:"",footer:"",contentTop:"",contentTopRight:"",contentBottom:"",contentBottomRight:"",code:q})}return n})},[Q,ne,L,x,Fe]),i.useEffect(()=>{const t=lt.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);if(t)tt(t[1]);else{const s=lt.match(/\(([A-Za-z0-9]+)\)/);s&&tt(s[1])}},[lt]),i.useEffect(()=>{if(!Ke)return;const t=_e.find(s=>s.id===Ke);if(t){const{newPrice:s}=Vt(t,k);nt(s)}},[k,Ke,_e]),i.useEffect(()=>{const t=()=>hn(window.innerWidth<1024);return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const bt=t=>{try{const s=new URL(window.location.href);s.searchParams.set("sub",t),window.history.replaceState(null,"",s.toString())}catch(s){console.error("Failed to sync sub-tab to URL:",s)}};i.useEffect(()=>{a(!0);let s=new URLSearchParams(window.location.search).get("sub");s||(s="event",bt("event")),s==="gia-soc"?(u("sticker"),I("gia_soc"),v("QUẠT ĐIỀU HOÀ"),U("/frame/X24_NEW.png"),re(8)):s==="gio-vang"?(u("sticker"),I("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),U("/frame/GVO2-scaled.png"),re(8)):s==="draw"?(u("sticker"),I("draw"),U("/frame/bg_phieu.png")):s==="event"&&(u("event"),M(!0));const n=setTimeout(()=>{ht(()=>import("./StickerEventApp-XJGykbW3.js"),__vite__mapDeps([0,1,2,3,4,5,6])).catch(p=>{console.warn("Failed to preload StickerEventApp:",p)})},1e3);return()=>clearTimeout(n)},[]),i.useEffect(()=>{let t=!0;async function s(){try{const n=await Ct(an);if(n&&t){const N=new URLSearchParams(window.location.search).get("sub");if(N?N==="gia-soc"?(u("sticker"),I("gia_soc")):N==="gio-vang"?(u("sticker"),I("gio_vang")):N==="draw"?(u("sticker"),I("draw")):N==="event"&&(u("event"),M(!0)):(n.stickerMode&&u(n.stickerMode),n.stickerType&&I(n.stickerType)),n.bgImage&&U(n.bgImage),n.headerTextContent&&v(n.headerTextContent),n.subHeaderTextContent&&E(n.subHeaderTextContent),n.footerTextContent&&W(n.footerTextContent),n.showBarcode!=null&&Dt(n.showBarcode),n.previewName&&pt(n.previewName),n.previewOldPrice&&mt(n.previewOldPrice),n.previewNewPrice){const _=String(n.previewNewPrice).replace(/\D/g,"");if(_){let C=Number(_);C>=1e5&&(C=Math.floor(C/1e3)),nt(C.toLocaleString("vi-VN"))}else nt(n.previewNewPrice)}n.discountDisplayMode&&S(n.discountDisplayMode),n.barcodeImei&&tt(n.barcodeImei),n.discountThreshold!=null&&vt(n.discountThreshold),n.searchTerm!=null&&xt(n.searchTerm);const b=(n.manualPages||[]).map(_=>{if(_.newPrice){const C=String(_.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{..._,newPrice:P.toLocaleString("vi-VN")}}}return _}),B=(n.batchItems||[]).map(_=>{if(_.newPrice){const C=String(_.newPrice).replace(/\D/g,"");if(C){let P=Number(C);if(P>=1e5)return P=Math.floor(P/1e3),{..._,newPrice:P.toLocaleString("vi-VN")}}}return _});b.length===0&&B.length===0?Ue("data"):n.activeSubTab&&Ue(n.activeSubTab==="help"?"data":n.activeSubTab),Ie(b),g(B),n.priceSource&&V(n.priceSource),n.headerTextSize!=null&&re(n.headerTextSize),n.subHeaderTextSize!=null&&de(n.subHeaderTextSize),n.percentTextSize!=null&&Ae(n.percentTextSize),n.oldPriceTextSize!=null&&we(n.oldPriceTextSize),n.nameTextSize!=null&&Je(n.nameTextSize),n.newPriceTextSize!=null&&pe(n.newPriceTextSize),n.footerTextSize!=null&&Ve(n.footerTextSize),n.drawTickets&&te(n.drawTickets),n.drawStartNumber!=null&&ce(n.drawStartNumber),n.drawTotalTickets!=null&&Y(n.drawTotalTickets),n.drawAutoIncrement!=null&&ze(n.drawAutoIncrement),n.drawContentTopLeftSize!=null&&me(n.drawContentTopLeftSize),n.drawContentTopRightSize!=null&&Ee(n.drawContentTopRightSize),n.drawContentBottomLeftSize!=null&&xe(n.drawContentBottomLeftSize),n.drawContentBottomRightSize!=null&&m(n.drawContentBottomRightSize),n.drawTitleSize!=null&&R(n.drawTitleSize),n.drawCodeSize!=null&&$e(n.drawCodeSize),n.drawFooterSize!=null&&at(n.drawFooterSize)}const p=await Ct(ft);p&&t&&jt(p);const y=await Ct(zt);y&&t&&Mt(y)}catch(n){console.error("Error loading sticker data:",n)}finally{t&&fn(!0)}}return s(),()=>{t=!1}},[]),i.useEffect(()=>{const t=s=>{var n;((n=s.detail)==null?void 0:n.key)===ft&&Ct(ft).then(p=>{p&&jt(p)})};return window.addEventListener("indexeddb-change",t),()=>window.removeEventListener("indexeddb-change",t)},[]),i.useEffect(()=>{if(!Fe)return;const t=setTimeout(async()=>{const s={stickerMode:o,stickerType:x,bgImage:F,headerTextContent:h,subHeaderTextContent:w,footerTextContent:O,showBarcode:Be,previewName:lt,previewOldPrice:_t,previewNewPrice:Ht,discountDisplayMode:ve,headerTextSize:ye,subHeaderTextSize:Ne,percentTextSize:be,oldPriceTextSize:qe,nameTextSize:je,newPriceTextSize:ke,footerTextSize:Se,barcodeImei:Nt,discountThreshold:We,searchTerm:Ce,activeQueuePageId:Ke,activeSubTab:Ze,manualPages:_e,batchItems:l,priceSource:k,drawTickets:X,drawStartNumber:Q,drawTotalTickets:ne,drawAutoIncrement:L,drawContentTopLeftSize:oe,drawContentTopRightSize:ae,drawContentBottomLeftSize:ie,drawContentBottomRightSize:J,drawTitleSize:A,drawCodeSize:ee,drawFooterSize:ue,updatedAt:new Date().toISOString()};try{await st(an,s)}catch(n){console.error("IndexedDB save failed",n)}},500);return()=>clearTimeout(t)},[Fe,o,x,F,h,w,O,Be,lt,_t,Ht,ye,Ne,be,qe,je,ke,Se,ve,Nt,We,Ce,Ke,Ze,_e,l,k,X,Q,ne,L,oe,ae,ie,J,A,ee,ue]),i.useEffect(()=>{if(!Fe)return;const t=setTimeout(async()=>{try{await st(ft,Rt)}catch(s){console.error("IndexedDB save savedLists failed",s)}},500);return()=>clearTimeout(t)},[Fe,Rt]),i.useEffect(()=>{if(!Fe)return;const t=setTimeout(async()=>{try{await st(zt,It)}catch(s){console.error("IndexedDB save printHistory failed",s)}},500);return()=>clearTimeout(t)},[Fe,It]);const ct=t=>{if(!t)return 0;const s=t.replace(/[^0-9]/g,""),n=parseInt(s,10);return isNaN(n)?0:n},gn=t=>{vt(t);const s=t.replace(/[^0-9]/g,""),n=parseInt(s,10);isNaN(n)?(Ie(p=>p.map(y=>({...y,selected:!0}))),g(p=>p.map(y=>({...y,selected:!0})))):(Ie(p=>p.map(y=>{const q=ct(y.percent);return{...y,selected:q>=n}})),g(p=>p.map(y=>{const q=ct(y.percent);return{...y,selected:q>=n}})))},xn=t=>{var p;const s=(p=t.target.files)==null?void 0:p[0];if(!s)return;const n=new FileReader;n.onload=async y=>{var q;try{const N=(q=y.target)==null?void 0:q.result,b=await ht(()=>import("./vendor-excel-CkFp8p6R.js"),[]),B=b.read(N,{type:"binary"}),_=B.SheetNames[0],C=B.Sheets[_],P=b.utils.sheet_to_json(C,{header:1}),G=[];for(let D=0;D<P.length;D++){const $=P[D];if(!$||$.length<9)continue;const z=$[4]?String($[4]).trim():"",se=$[5]?String($[5]).trim():"",H=$[42]?String($[42]).trim():"";let Z="";const fe=H.toUpperCase();fe.includes("IMEI:")?(Z=H.substring(fe.indexOf("IMEI:")+5).trim(),Z=Z.replace(/\)$/,"").trim()):fe.includes("CODE:")?(Z=H.substring(fe.indexOf("CODE:")+5).trim(),Z=Z.replace(/\)$/,"").trim()):H&&/^[A-Za-z0-9]+$/.test(H)&&H.length>3&&(Z=H);const Te=[z,se].filter(Boolean);H&&Te.push(H.startsWith("(")?H:`(${H})`);const T=Te.join(" ");if(!T||T==="TÊN SẢN PHẨM")continue;let K="";if($[8]){const ge=String($[8]).match(/\((-\d+%)\)/);ge&&(K=ge[1])}let he="";if($[7]){const ge=String($[7]).replace(/\D/g,"");ge&&(he=Number(ge).toLocaleString("vi-VN"))}let le="";if($[6]){const ge=String($[6]).replace(/\D/g,"");ge&&(le=Number(Math.floor(Number(ge)/1e3)).toLocaleString("vi-VN"))}const Ge=We.replace(/[^0-9]/g,""),He=parseInt(Ge,10),rt=isNaN(He)?!0:ct(K)>=He;G.push({id:`item_${D}_${Date.now()}`,name:T,oldPrice:he,newPrice:le,percent:K,imei:Z,selected:rt})}if(g(G),Ue("data"),G.length>0){const D=G[0];pt(D.name),mt(D.oldPrice),nt(D.newPrice),tt(D.imei)}}catch{Le.error("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},pn=async()=>{const t=await ht(()=>import("./vendor-excel-CkFp8p6R.js"),[]),s=t.utils.book_new();let n,p,y,q;if(x==="gia_soc")n=["TIÊU ĐỀ","CODE","TÊN SẢN PHẨM","GIÁ GỐC","GIÁ GIẢM","KHUYẾN MÃI"],p=[["QUẠT ĐIỀU HOÀ","ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"],["TỦ LẠNH","DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000","Khuyến mãi áp dụng đến hết ngày 3/5/2026"]],y="Sticker_Template_Gia_Soc.xlsx",q=[{wch:20},{wch:15},{wch:40},{wch:18},{wch:18},{wch:45}];else{const b=new Date,B=b.getDay(),_=B===0?7:B,C=new Date(b);C.setDate(b.getDate()+(5-_));const P=new Date(b);P.setDate(b.getDate()+(7-_));const G=se=>String(se).padStart(2,"0"),D=`${G(C.getDate())}/${G(C.getMonth()+1)}`,$=`${G(P.getDate())}/${G(P.getMonth()+1)}`,z=`TỪ ${D} ĐẾN ${$}`;n=["CODE","SẢN PHẨM","GIÁ NIÊM YẾT","GIÁ GIẢM","THỜI GIAN ÁP DỤNG","SỐ LƯỢNG SUẤT"],p=[["ABC123","Quạt điều hoà Daikiosan DMI03","5490000","3490000",z,"5 SUẤT/NGÀY"],["DEF456","Tủ lạnh Samsung RT29K5012S8","8990000","6990000",z,"5 SUẤT/NGÀY"]],y="Sticker_Template_Gio_Vang.xlsx",q=[{wch:15},{wch:40},{wch:18},{wch:18},{wch:22},{wch:18}]}const N=t.utils.aoa_to_sheet([n,...p]);N["!cols"]=q,t.utils.book_append_sheet(s,N,"Template"),t.writeFile(s,y)},Jt=t=>{if(t==null)return 0;const s=String(t).replace(/[^0-9]/g,"");return s?Number(s):0},qt=t=>{var n,p,y,q,N,b,B;t.label&&pt(t.label),t.oldPrice&&mt(t.oldPrice),t.code&&tt(t.code),t.header!=null&&v(t.header),t.footer!=null&&W(t.footer),t.subHeader!=null&&E(t.subHeader);const{newPrice:s}=Vt(t,k);if(nt(s),!t.label&&t.html){const _=document.createElement("div");_.innerHTML=t.html;const C=_.querySelector(".sticker-container");if(C){const P=((n=C.querySelector(".header-text"))==null?void 0:n.textContent)||h,G=((p=C.querySelector(".name"))==null?void 0:p.textContent)||"",D=((y=C.querySelector(".old"))==null?void 0:y.textContent)||"",$=((q=C.querySelector(".extra2 span"))==null?void 0:q.textContent)||((N=C.querySelector(".extra2"))==null?void 0:N.textContent)||"",z=((b=C.querySelector(".footer-text"))==null?void 0:b.textContent)||O,se=((B=C.querySelector(".sub-header"))==null?void 0:B.textContent)||w;v(P),E(se),W(z),mt(D),nt($);const H=C.querySelector(".barcode img"),Z=(H==null?void 0:H.getAttribute("alt"))||"";Z&&tt(Z),pt(G)}}g([])},mn=t=>{var p;const s=(p=t.target.files)==null?void 0:p[0];if(!s)return;const n=new FileReader;n.onload=async y=>{var q;try{const N=(q=y.target)==null?void 0:q.result,b=await ht(()=>import("./vendor-excel-CkFp8p6R.js"),[]),B=b.read(N,{type:"binary"}),_=B.Sheets[B.SheetNames[0]],C=b.utils.sheet_to_json(_,{header:1});if(!C||C.length<2){Le.error("File không chứa đủ dữ liệu");return}const P=(C[0]||[]).map(T=>String(T).trim().toUpperCase());let G=-1,D=-1,$=-1,z=-1,se=-1,H=-1,Z=-1;x==="gia_soc"?(G=P.findIndex(T=>T==="CODE"||T==="CODE:"),D=P.findIndex(T=>T==="TÊN SẢN PHẨM"||T==="SẢN PHẨM"),$=P.findIndex(T=>T==="GIÁ GỐC"||T==="GIÁ NIÊM YẾT"),z=P.indexOf("GIÁ GIẢM"),se=P.findIndex(T=>T==="TIÊU ĐỀ"||T==="THỜI GIAN ÁP DỤNG"),Z=P.indexOf("KHUYẾN MÃI"),G===-1&&D===-1&&$===-1&&(se=0,G=1,D=2,$=3,z=4,Z=5)):(G=P.findIndex(T=>T==="CODE"||T==="CODE:"),D=P.findIndex(T=>T==="SẢN PHẨM"||T==="TÊN SẢN PHẨM"),$=P.findIndex(T=>T==="GIÁ NIÊM YẾT"||T==="GIÁ GỐC"),z=P.indexOf("GIÁ GIẢM"),se=P.findIndex(T=>T==="THỜI GIAN ÁP DỤNG"||T==="TIÊU ĐỀ"),H=P.indexOf("SỐ LƯỢNG SUẤT"),G===-1&&D===-1&&$===-1&&(G=0,D=1,$=2,z=3,se=4,H=5));const fe=C[1];if(fe){let T=h,K=w,he=O;if(se!==-1&&fe[se]!=null){const le=String(fe[se]).trim();le&&(T=le)}if(H!==-1&&fe[H]!=null){const le=String(fe[H]).trim();le&&(K=le)}if(Z!==-1&&fe[Z]!=null){const le=String(fe[Z]).trim();le&&(he=le)}T!==h&&v(T),K!==w&&E(K),he!==O&&W(he)}const Te=[];for(let T=1;T<C.length;T++){const K=C[T];if(!K||K.length<2)continue;const he=G!==-1&&K[G]!=null?String(K[G]).trim():"",le=D!==-1&&K[D]!=null?String(K[D]).trim():"";if(!le)continue;const Ge=$!==-1?Jt(K[$]):0,He=z!==-1?Jt(K[z]):0,rt=Ge?Ge.toLocaleString("vi-VN"):"",ge=He?Number(Math.floor(He/1e3)).toLocaleString("vi-VN"):"";let Ye="";Ge>0&&He>0&&(Ye=`${Math.round((He/Ge-1)*100)}%`);let Oe=h;if(se!==-1&&K[se]!=null){const Me=String(K[se]).trim();Me&&(Oe=Me)}let wt=w;if(H!==-1&&K[H]!=null){const Me=String(K[H]).trim();Me&&(wt=Me)}let dt=O;if(Z!==-1&&K[Z]!=null){const Me=String(K[Z]).trim();Me&&(dt=Me)}let St="";if(he)try{St=`<div class="barcode"><img src="${Wt(he)}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${he}" /></div>`}catch(Me){console.error("Error generating barcode for template item:",Me)}const kt=x==="gio_vang"?`<div class="sub-header">${wt}</div>`:"";let ut="";x==="gio_vang"?ut=`<div class="extra2" style="display:flex;align-items:baseline;justify-content:center"><span>${ge}</span><span class="small-zeros">.000</span></div>`:ut=`<div class="extra2">${ge}</div>`;const Rn=`<div class="sticker-container" data-type="${x}" style="background-image:url('${F}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
                        ${St}
                        <div class="header-text">${Oe}</div>
                        ${kt}
                        <div class="extra1">${Ye}</div>
                        <div class="old">${rt}</div>
                        <div class="name">${le}</div>
                        ${ut}
                        <div class="footer-text">${dt}</div>
                    </div>`,_n=We.replace(/[^0-9]/g,""),Ft=parseInt(_n,10),Hn=isNaN(Ft)?!0:ct(Ye)>=Ft;Te.push({id:`tpl_${T}_${Date.now()}`,html:Rn,label:le.substring(0,50),oldPrice:rt,newPrice:ge,percent:Ye,timestamp:Date.now(),code:he,selected:Hn,header:Oe,subHeader:wt,footer:dt})}if(Te.length===0){Le.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Ie(T=>[...T,...Te]),Ue("queue"),Te.length>0&&qt(Te[0]),Le.success(`Đã thêm ${Te.length} sticker vào hàng đợi in`)}catch{Le.error("Lỗi đọc file Excel")}},n.readAsBinaryString(s),t.target.value=""},Zt=t=>{if(t==null||t==="")return"";const s=String(t).replace(/\D/g,"");if(!s)return"";const n=Number(s);return Number(Math.floor(n/1e3)).toLocaleString("vi-VN")},bn=t=>{if(t==null||t==="")return"";const s=String(t).replace(/\D/g,"");return s?Number(s).toLocaleString("vi-VN"):""},wn=(t,s)=>{var y;const n=(y=t.target.files)==null?void 0:y[0];if(!n)return;const p=new FileReader;p.onload=async q=>{var N;try{const b=(N=q.target)==null?void 0:N.result,B=await ht(()=>import("./vendor-excel-CkFp8p6R.js"),[]),_=B.read(b,{type:"binary"}),C=_.SheetNames[0],P=_.Sheets[C],G=B.utils.sheet_to_json(P,{header:1});if(!G||G.length<2){Le.error("File không chứa đủ dữ liệu");return}const D=[];for(let $=1;$<G.length;$++){const z=G[$];if(!z||z.length===0)continue;let se="",H="",Z="",fe="",Te="",T="",K="";if(s==="purifier"?(K="MÁY LỌC NƯỚC",se=z[55]!=null?String(z[55]).trim():"",H=z[44]!=null?String(z[44]).trim():"",Z=z[33]!=null?String(z[33]).trim():"",fe=z[20]!=null?String(z[20]).trim():"",Te=z[1]!=null?String(z[1]).trim():"",T=z[31]!=null?String(z[31]).trim():"",H&&(H=ur(H))):(K="DUY NHẤT HÔM NAY",se=z[28]!=null?String(z[28]).trim():"",H=z[27]!=null?String(z[27]).trim():"",Z=z[16]!=null?String(z[16]).trim():"",fe=z[17]!=null?String(z[17]).trim():"",Te=z[8]!=null?String(z[8]).trim():"",T=z[31]!=null?String(z[31]).trim():""),!H)continue;let he=se;he.includes("-")&&(he=he.split("-")[0].trim());const le=bn(Z),Ge=Zt(fe),He=Zt(Te),rt=k==="service"?He||Ge:Ge||He;let ge="";const Ye=Number(le.replace(/\D/g,""));let Oe=Number(rt.replace(/\D/g,""));if(Ye>0&&Oe>0){Oe*1e3<=Ye*1.5&&Oe<Ye&&(Oe=Oe*1e3);const ut=Math.round((Oe/Ye-1)*100);ge=ut<0?`${ut}%`:""}const wt=We.replace(/[^0-9]/g,""),dt=parseInt(wt,10),St=isNaN(dt)?!0:ct(ge)>=dt,kt={id:`erp_${s}_${$}_${Date.now()}`,html:"",label:H,oldPrice:le,newPrice:rt,percent:ge,timestamp:Date.now(),code:he,selected:St,salePrice:Ge,servicePrice:He,header:K,footer:T};kt.html=Gt(kt,k,x,F),D.push(kt)}if(D.length===0){Le.error("Không tìm thấy dữ liệu hợp lệ trong file.");return}Ie($=>[...$,...D]),Ue("queue"),D.length>0&&qt(D[0]),Le.success(`Đã thêm ${D.length} sticker vào hàng đợi in`)}catch(b){console.error(b),Le.error("Lỗi đọc file Excel ERP")}},p.readAsBinaryString(n),t.target.value=""},kn=t=>{g(s=>s.map(n=>n.id===t?{...n,selected:!n.selected}:n))},vn=t=>{g(s=>s.map(n=>({...n,selected:t})))},yn=()=>{var C,P,G,D;const t=document.getElementById("print-section");if(!t)return;const s=t.querySelector(".sticker-container");if(!s)return;const n=((C=s.querySelector(".name"))==null?void 0:C.textContent)||"Sticker",p=((P=s.querySelector(".old"))==null?void 0:P.textContent)||"",y=((G=s.querySelector(".extra2"))==null?void 0:G.textContent)||"",q=((D=s.querySelector(".extra1"))==null?void 0:D.textContent)||"",N=We.replace(/[^0-9]/g,""),b=parseInt(N,10),B=isNaN(b)?!0:ct(q)>=b,_={id:`page_${Date.now()}`,html:s.outerHTML,label:n.substring(0,50),oldPrice:p,newPrice:y,percent:q,timestamp:Date.now(),code:Nt,selected:B,salePrice:y,header:h,footer:O,subHeader:w};Ie($=>[...$,_])},Nn=t=>{Ie(s=>s.filter(n=>n.id!==t)),Ke===t&&Xe(null)},jn=()=>{Ie([]),Xe(null)},Sn=t=>{Ie(s=>s.map(n=>n.id===t?{...n,selected:n.selected===!1}:n))},Cn=t=>{Ie(s=>s.map(n=>({...n,selected:t})))},Tn=()=>{_e.length!==0&&Lt(!0)},Pn=t=>{const s={id:`list_${Date.now()}`,name:t,pages:_e,timestamp:Date.now(),stickerType:x,headerTextContent:h};jt(n=>{const p=[s,...n].slice(0,20);return st(ft,p).catch(()=>{}),p}),Lt(!1),Le.success(`Đã lưu danh sách "${t}" thành công!`)},zn=t=>{Ie(t.pages),t.stickerType&&I(t.stickerType),t.headerTextContent&&v(t.headerTextContent),Xt(!1),Xe(null)},En=t=>{jt(s=>{const n=s.filter(p=>p.id!==t);return st(ft,n).catch(()=>{}),n})},$n=t=>{I(t.stickerType),U(t.bgImage),re(t.headerTextSize),t.subHeaderTextSize!=null&&de(t.subHeaderTextSize),t.percentTextSize!=null&&Ae(t.percentTextSize),t.oldPriceTextSize!=null&&we(t.oldPriceTextSize),t.nameTextSize!=null&&Je(t.nameTextSize),t.newPriceTextSize!=null&&pe(t.newPriceTextSize),t.footerTextSize!=null&&Ve(t.footerTextSize),g(t.batchItems),v(t.headerTextContent),E(t.subHeaderTextContent),W(t.footerTextContent),Dt(t.showBarcode),Ie(t.manualPages||[]),t.discountDisplayMode&&S(t.discountDisplayMode),Kt(!1),Xe(null)},Dn=t=>{Mt(s=>{const n=s.filter(p=>p.id!==t);return st(zt,n).catch(()=>{}),n})},In=()=>{g([]),xt(""),v("HÀNG TRƯNG BÀY"),W("Khuyến mãi áp dụng đến hết ngày 3/5/2026"),re(8),Xe(null)},Mn=()=>{const t=l.length>0?l.filter(N=>N.selected).length:_e.length===0?1:0,s=_e.filter(N=>N.selected!==!1),n=t+s.length;if(n===0){Le.error("Không có trang nào để in!");return}const p=document.createElement("div");if(p.id="print-host",p.innerHTML=`
            <style>
                #print-host .header-text { font-size: ${ye}cqi !important; }
                #print-host .sub-header { font-size: ${Ne}cqi !important; }
                #print-host .extra1 { font-size: ${be}cqi !important; }
                #print-host .old { font-size: ${qe}cqi !important; }
                #print-host .name { font-size: ${je}cqi !important; }
                #print-host .extra2 { font-size: ${ke}cqi !important; }
                #print-host .footer-text { font-size: ${Se}cqi !important; }
                #print-host .sticker-container {
                    outline: ${x==="draw"?"none":"1.5px dashed #6366f1"};
                    outline-offset: 1px;
                }
            </style>
        `,l.length>0)l.filter(b=>b.selected).forEach(b=>{const B={id:b.id,html:"",label:b.name,oldPrice:b.oldPrice,newPrice:b.newPrice,percent:b.percent,timestamp:Date.now(),code:Be?b.imei:void 0,header:h,subHeader:w,footer:O};p.insertAdjacentHTML("beforeend",Gt(B,k,x,F,ve))});else if(_e.length===0){const N=document.getElementById("print-section");N&&p.insertAdjacentHTML("beforeend",N.innerHTML)}s.forEach(N=>{let b=N.header||"",B=N.subHeader||"",_=N.footer||"";x==="gio_vang"?((!b||b==="SẢN PHẨM GIÁ SỐC"||b==="QUẠT ĐIỀU HOÀ"||!b.toUpperCase().startsWith("TỪ"))&&(b=h),(!B||!B.toUpperCase().includes("SUẤT"))&&(B=w)):x==="gia_soc"&&b&&(b.toUpperCase().startsWith("TỪ")||b.includes("/"))&&(b=h);const C={...N,header:b,subHeader:B,footer:_||O};p.insertAdjacentHTML("beforeend",Gt(C,k,x,F,ve))}),document.body.appendChild(p);const y=document.getElementById("root");y&&(y.style.display="none");const q={id:`history_${Date.now()}`,timestamp:Date.now(),label:h||"Sticker",pageCount:n,stickerType:x,bgImage:F,headerTextSize:ye,subHeaderTextSize:Ne,percentTextSize:be,oldPriceTextSize:qe,nameTextSize:je,newPriceTextSize:ke,footerTextSize:Se,batchItems:l,headerTextContent:h,subHeaderTextContent:w,footerTextContent:O,showBarcode:Be,manualPages:_e,discountDisplayMode:ve};Mt(N=>{const b=N.findIndex(C=>fr(C,q));let B;if(b!==-1){const C={...N[b],timestamp:Date.now()},P=N.filter((G,D)=>D!==b);B=[C,...P]}else B=[q,...N];const _=B.slice(0,20);return st(zt,_).catch(()=>{}),_}),setTimeout(()=>{window.print(),y&&(y.style.display=""),document.body.removeChild(p)},200)};return e.jsxs("div",{className:"print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden",children:[c&&r==="tools-print-sticker"&&document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")&&Zn.createPortal(e.jsxs("div",{className:"flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0",children:[e.jsxs("div",{className:"flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50",children:[e.jsxs("button",{onClick:()=>{u("sticker"),I("gia_soc"),v("QUẠT ĐIỀU HOÀ"),U("/frame/X24_NEW.png"),re(8),bt("gia-soc")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="gia_soc"?"bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giá Sốc"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="gia_soc"&&e.jsx(Pt,{size:14,className:"inline mr-1 text-indigo-600 dark:text-indigo-400"}),"Giá Sốc"]})]}),e.jsxs("button",{onClick:()=>{u("sticker"),I("gio_vang"),v("TỪ 00/00 ĐẾN 00/00"),U("/frame/GVO2-scaled.png"),re(8),bt("gio-vang")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="gio_vang"?"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Giờ Vàng"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="gio_vang"&&e.jsx(Pt,{size:14,className:"inline mr-1 text-amber-600 dark:text-amber-400"}),"Giờ Vàng"]})]}),e.jsxs("button",{onClick:()=>{u("sticker"),I("draw"),U("/frame/bg_phieu.png"),bt("draw"),De("drawContentTopLeft")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="sticker"&&x==="draw"?"bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Rút Thăm"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="sticker"&&x==="draw"&&e.jsx(Pt,{size:14,className:"inline mr-1 text-rose-600 dark:text-rose-400"}),"Phiếu Rút Thăm"]})]}),e.jsxs("button",{onClick:()=>{u("event"),M(!0),bt("event")},className:`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${o==="event"?"bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm":"text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`,children:[e.jsx("span",{className:"lg:hidden",children:"Event"}),e.jsxs("span",{className:"hidden lg:inline",children:[o==="event"&&e.jsx(Pt,{size:14,className:"inline mr-1 text-emerald-600 dark:text-emerald-400"}),e.jsx(cn,{size:14,className:"inline mr-1"}),"Event - Tồn kho"]})]})]}),o==="sticker"&&e.jsxs("div",{className:"flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200",children:[e.jsx("span",{className:"text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400",children:x==="draw"?`${$t()}:`:`${yt()}:`}),e.jsxs("div",{className:"flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]",children:[e.jsx("button",{onMouseDown:t=>t.preventDefault(),onClick:()=>{if(x==="draw"){const t=it(),s=Math.max(1,t-.2);gt(s),et(s)}else f(t=>Math.max(1,t-.2))},className:"px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Giảm size",children:"-"}),e.jsx("span",{className:"px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center",children:x==="draw"?it().toFixed(1):Et()}),e.jsx("button",{onMouseDown:t=>t.preventDefault(),onClick:()=>{if(x==="draw"){const s=it()+.2;gt(s),et(s)}else f(t=>t+.2)},className:"px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors",title:"Tăng size",children:"+"})]})]})]}),document.getElementById(Yt?"mobile-topbar-actions":"global-header-actions")),j&&e.jsx("div",{className:`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-200 ${o==="event"?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,children:e.jsx(Un,{name:"Event - Tồn kho",children:e.jsx(i.Suspense,{fallback:e.jsx("div",{className:"w-full h-full flex items-center justify-center bg-slate-50",children:e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx("div",{className:"w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"}),e.jsx("p",{className:"text-sm text-slate-500 font-medium",children:"Đang tải Event - Tồn kho..."})]})}),children:e.jsx(dr,{})})})}),e.jsxs("div",{className:`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${o==="event"?"invisible":"visible"}`,children:[e.jsx("div",{className:"flex flex-col gap-4 w-full max-w-sm shrink-0",children:e.jsx(sr,{batchItems:l,stickerType:x,showBarcode:Be,discountDisplayMode:ve,headerTextContent:h,subHeaderTextContent:w,footerTextContent:O,barcodeImei:Nt,bgImage:F,headerTextSize:ye,subHeaderTextSize:Ne,percentTextSize:be,oldPriceTextSize:qe,nameTextSize:je,newPriceTextSize:ke,footerTextSize:Se,previewName:lt,previewOldPrice:_t,previewNewPrice:Ht,setPreviewOldPrice:mt,setPreviewNewPrice:nt,activeField:Re,setActiveField:De,setHeaderTextContent:v,setSubHeaderTextContent:E,setFooterTextContent:W,setBarcodeImei:tt,setPreviewName:pt,drawTickets:X,setDrawTickets:te,drawAutoIncrement:L,drawContentTopLeftSize:oe,drawContentTopRightSize:ae,drawContentBottomLeftSize:ie,drawContentBottomRightSize:J,drawTitleSize:A,drawCodeSize:ee,drawFooterSize:ue})}),e.jsx(lr,{manualPages:_e,batchItems:l,savedLists:Rt,showSavedLists:un,setShowSavedLists:Xt,saveCurrentList:Tn,clearManualPages:jn,loadPageToEditor:qt,removeManualPage:Nn,loadSavedList:zn,deleteSavedList:En,togglePageSelection:Sn,toggleAllPagesSelection:Cn,showBarcode:Be,setShowBarcode:Dt,discountDisplayMode:ve,setDiscountDisplayMode:S,searchTerm:Ce,setSearchTerm:xt,printHistory:It,showHistory:dn,setShowHistory:Kt,handlePrint:Mn,addCurrentPage:yn,handleExcelUpload:xn,handleTemplateUpload:mn,downloadTemplate:pn,handleReset:In,toggleAllSelection:vn,toggleItemSelection:kn,clearBatchItems:()=>g([]),restoreHistory:$n,deleteHistory:Dn,discountThreshold:We,handleDiscountThresholdChange:gn,activeQueuePageId:Ke,setActiveQueuePageId:Xe,activeSubTab:Ze,setActiveSubTab:Ue,priceSource:k,setPriceSource:V,handleErpPriceUpload:wn,stickerType:x,drawStartNumber:Q,setDrawStartNumber:ce,drawTotalTickets:ne,setDrawTotalTickets:Y,drawAutoIncrement:L,setDrawAutoIncrement:ze})]}),Qt&&e.jsx(cr,{isOpen:Qt,onClose:()=>Lt(!1),onSave:Pn,defaultName:`DS ${new Date().toLocaleDateString("vi-VN")}`})]})}const mr=Object.freeze(Object.defineProperty({__proto__:null,default:hr},Symbol.toStringTag,{value:"Module"}));export{cr as S,mr as a};
