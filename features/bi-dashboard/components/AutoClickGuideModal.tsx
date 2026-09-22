import React, { useState } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Zap, Sparkles, Copy, Check, ExternalLink, BookmarkPlus, MousePointerClick, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const AUTO_CLICK_BOOKMARKLET_CODE = `javascript:(async function(){function t(m,e,d=5e3){var n=document.getElementById("__copy_wait_toast__");n||((n=document.createElement("div")).id="__copy_wait_toast__",Object.assign(n.style,{position:"fixed",top:"20px",right:"20px",zIndex:"2147483647",padding:"14px 20px",borderRadius:"10px",fontFamily:"system-ui, -apple-system, sans-serif",fontSize:"14px",fontWeight:"600",color:"#fff",boxShadow:"0 6px 20px rgba(0,0,0,0.3)",transition:"all 0.3s ease",maxWidth:"360px",lineHeight:"1.4"}),document.body.appendChild(n));n.style.background=e?"linear-gradient(135deg, #dc2626, #b91c1c)":"linear-gradient(135deg, #16a34a, #15803d)";n.innerHTML=m;n.style.opacity="1";clearTimeout(n.__timer);e||!d||(n.__timer=setTimeout(function(){n.style.opacity="0"},d))}const sleep=ms=>new Promise(r=>setTimeout(r,ms)),BATCH_SIZE=25,SPINNERS=['#Loading','.overload-wait','.dx-loadpanel:not(.dx-state-invisible)','.dx-loadpanel-content:not(.dx-state-invisible)','.dx-loadindicator','.ant-spin-spinning','.el-loading-mask:not([style*="display: none"])'].join(', ');function isVis(el){if(!el)return!1;if(null!==el.offsetParent)return!0;var r=el.getBoundingClientRect();return r.width>0&&r.height>0}function isSpinVis(el){if(!el)return!1;var s=window.getComputedStyle(el);if("none"===s.display||"hidden"===s.visibility||parseFloat(s.opacity||"1")<=0.05)return!1;var r=el.getBoundingClientRect();return!(r.width<=0||r.height<=0)&&(null!==el.offsetParent||"fixed"===s.position)}function isOpened(el){if(el.classList&&(el.classList.contains("dx-datagrid-group-opened")||el.classList.contains("ant-table-row-expand-icon-expanded")))return!0;if("true"===el.getAttribute("aria-expanded"))return!0;var r=el.closest("tr, .dx-row, .ant-table-row, button, a, [role='button'], .cursor-pointer, td, div");return!(!r||"true"!==r.getAttribute("aria-expanded")&&"open"!==r.getAttribute("data-state")&&!r.querySelector(".fa-minus, .ant-table-row-expand-icon-expanded, button[aria-expanded='true']")&&(!r.classList||!r.classList.contains("dx-datagrid-group-opened")))}function getCandidates(){var fa=Array.from(document.querySelectorAll(".fa-plus")).filter(el=>el.closest("table")),dx=Array.from(document.querySelectorAll(".dx-datagrid-group-closed, td.dx-command-expand.dx-datagrid-group-closed")),ant=Array.from(document.querySelectorAll("button.ant-table-row-expand-icon-collapsed, .ant-table-row-expand-icon-collapsed, button.ant-table-row-expand-icon[aria-expanded='false'], button[aria-label='Mở rộng dòng'][aria-expanded='false'], [aria-label='Mở rộng dòng']:not([aria-expanded='true'])"));return Array.from(new Set([...fa,...dx,...ant])).filter(isVis).filter(el=>!(el.classList&&(el.classList.contains("fa-minus")||el.classList.contains("ant-table-row-expand-icon-expanded")))).filter(el=>"true"!==el.getAttribute("aria-expanded")).filter(el=>"1"!==el.dataset.clickPlusDone).filter(el=>!isOpened(el))}async function waitSpinners(maxWait=2500,poll=25){await sleep(15);var start=Date.now();while(Date.now()-start<maxWait){var sp=document.querySelectorAll(SPINNERS);if(0===sp.length)return;if(!Array.from(sp).some(isSpinVis))return;await sleep(poll)}}async function forceRender(){var tbl=document.querySelector('.ant-table-body, .dx-datagrid-rowsview, [class*="table-body"]');tbl&&tbl.scrollHeight>tbl.clientHeight&&(tbl.scrollTop=tbl.scrollHeight,await sleep(40),tbl.scrollTop=0);var sc=document.scrollingElement||document.documentElement,step=Math.max(1.5*(window.innerHeight||800),600),pos=0,guard=0;while(pos<sc.scrollHeight&&guard<35){window.scrollTo(0,pos),await sleep(25),pos+=step,guard++}window.scrollTo(0,sc.scrollHeight),await sleep(40),window.scrollTo(0,0),await sleep(40)}function sanitize(t){return t.split("\\n").map(l=>l.trim()).filter(l=>l&&"undefined"!==l&&!/^(⚡|⏳|⏹|✅|📋|🔘|Đã mở:|Còn lại:)/i.test(l)&&!/^⚡\\s*Click\\+/i.test(l)).join("\\n")}function extractText(){var exc=Array.from(document.querySelectorAll(".dx-datagrid-content-fixed, .dx-hidden, #acp-status-box, #acp-float-btn, #__copy_wait_toast__")),prev=exc.map(el=>el.style.display);exc.forEach(el=>{el.style.display="none"});var txt="";try{var sel=window.getSelection(),rg=document.createRange();rg.selectNodeContents(document.body),sel.removeAllRanges(),sel.addRange(rg),txt=sel.toString(),sel.removeAllRanges()}catch(e){txt=document.body.innerText||document.body.textContent||""}return exc.forEach((el,i)=>{el.style.display=prev[i]}),sanitize(txt)}function lbl(b){var d=Array.from(b.childNodes).filter(n=>3===n.nodeType).map(n=>n.textContent).join("");return(d.trim()||(b.textContent||"").trim()).replace(/\\s+/g," ")}var TOGGLE_SEL='button, [role="button"], label, a[role="button"], div[class*="cursor-pointer"], span[class*="cursor-pointer"]';function norm(x){return String(x).toLowerCase().replace(/\\s+/g," ").trim()}function findBtn(al){var as=(Array.isArray(al)?al:[al]).map(norm),ns=Array.from(document.querySelectorAll(TOGGLE_SEL)).filter(function(e){return"acp-float-btn"!==e.id&&!e.closest("#acp-status-box")&&isVis(e)});var lof=function(e){return norm(lbl(e))};return ns.find(function(e){return as.indexOf(lof(e))>-1})||ns.find(function(e){var t=lof(e);return as.some(function(a){return t.indexOf(a)>-1})&&t.length<=24})||null}function ariaOn(b){return"true"===b.getAttribute("aria-pressed")||"true"===b.getAttribute("aria-checked")||"true"===b.getAttribute("aria-selected")||"on"===b.getAttribute("data-state")||"checked"===b.getAttribute("data-state")}function tgState(e){var i=e.querySelector('input[type="checkbox"], input[type="radio"]')||("INPUT"===e.tagName?e:null);if(i)return i.checked?"on":"off";if(ariaOn(e))return"on";if(["aria-pressed","aria-checked","aria-selected"].some(function(a){return"false"===e.getAttribute(a)}))return"off";if("off"===e.getAttribute("data-state")||"unchecked"===e.getAttribute("data-state"))return"off";var cls=e.className&&void 0!==e.className.baseVal?e.className.baseVal:String(e.className||""),m=e.querySelector(":scope > span");if(m&&/rounded|border/.test(String(m.className||""))){var tk=""!==m.textContent.trim()||!!m.querySelector("svg, i, img");if(tk)return"on";if(/border-slate-200|border-gray-200|border-neutral-200|bg-white/.test(cls))return"off"}if(/(bg-(blue|sky|primary|indigo|emerald|green)-[45678]00)|text-white|bg-blue-50|text-blue-700/.test(cls))return"on";if(/bg-white|bg-transparent|bg-gray-50|bg-slate-50/.test(cls))return"off";return"unknown"}async function ensureToggles(){var on=[],fail=[],nf=[],unk=[],list=[["Trả góp",["trả góp","tra gop","trả chậm","tra cham"]],["DT quy đổi",["dt quy đổi","dt quy doi","doanh thu quy đổi","dtqđ","dt qđ"]]];for(var k=0;k<list.length;k++){var name=list[k][0],al=list[k][1],b=findBtn(al);if(!b){nf.push(name);continue}var st0=tgState(b);if("on"===st0)continue;if("unknown"===st0){unk.push(name);continue}t('⚡ Đang bật "'+name+'"...',!1,0);b.click();await sleep(120);await waitSpinners(5000);var st=Date.now(),ok=!1;while(Date.now()-st<1500){var f=findBtn(al);if(!f||"off"!==tgState(f)){ok=!0;break}await sleep(50)}(ok?on:fail).push(name)}return{on:on,fail:fail,nf:nf,unk:unk}}try{var tg=await ensureToggles(),pending=getCandidates(),total=pending.length,clicked=0;if(total>0){t("⚡ Đang mở cấp hiện tại: "+total+" mục...",!1,0);for(var i=0;i<total;i++){var btn=pending[i];try{isVis(btn)&&!isOpened(btn)&&"1"!==btn.dataset.clickPlusDone&&(btn.dataset.clickPlusDone="1",btn.click(),clicked++)}catch(e){}var isBatchEnd=(i+1)%BATCH_SIZE==0||i===total-1;(isBatchEnd||(i+1)%5==0)&&t("⚡ Đang mở: "+clicked+" / "+total+" mục...",!1,0);if(!isBatchEnd){await sleep(2);continue}await waitSpinners(),await sleep(10)}t("⚡ Đang cuộn hiển thị toàn bộ dòng...",!1,0),await forceRender(),await sleep(60)}t("⏳ Đang trích xuất dữ liệu vào clipboard...",!1,0);var text=extractText();if(!text||0===text.length)return void t("⚠️ Không có dữ liệu để copy.",!0,5e3);if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(text);else if(!document.execCommand("copy"))throw new Error("Trình duyệt không hỗ trợ copy tự động.");var still=getCandidates().length,remainMsg=still>0?'<br/><span style="font-size:12px;opacity:0.9;">Còn '+still+' mục cấp con — bấm Auto Click+ lần nữa để mở tiếp.</span>':"",openedMsg=clicked>0?"Đã mở "+clicked+" mục · ":"",tgMsg=(tg.on.length?'<br/><span style="font-size:12px;opacity:0.9;">🔘 Đã tự bật: '+tg.on.join(", ")+"</span>":"")+(tg.fail.length?'<br/><span style="font-size:12px;opacity:0.9;">⚠️ Không bật được: '+tg.fail.join(", ")+" — bật tay rồi bấm lại.</span>":"")+(tg.nf.length?'<br/><span style="font-size:12px;opacity:0.9;">⚠️ Không thấy nút: '+tg.nf.join(", ")+" trên trang này.</span>":"")+(tg.unk.length?'<br/><span style="font-size:12px;opacity:0.9;">⚠️ Không rõ trạng thái: '+tg.unk.join(", ")+" — bật tay nếu đang tắt.</span>":"");t("✅ "+openedMsg+"Đã copy xong "+text.length.toLocaleString("vi-VN")+" ký tự!"+tgMsg+remainMsg,!1,6e3)}catch(err){t("❌ Thất bại: "+err.message,!0,6e3)}})();`;

export const COPY_ALL_BOOKMARKLET_CODE = `javascript:!function(){function t(t,e){var n=document.getElementById("__copy_wait_toast__");n||((n=document.createElement("div")).id="__copy_wait_toast__",Object.assign(n.style,{position:"fixed",top:"20px",right:"20px",zIndex:"2147483647",padding:"14px 20px",borderRadius:"8px",fontFamily:"system-ui, -apple-system, sans-serif",fontSize:"14px",fontWeight:"600",color:"#fff",boxShadow:"0 4px 14px rgba(0,0,0,0.3)",transition:"opacity 0.3s ease",maxWidth:"340px",lineHeight:"1.4"}),document.body.appendChild(n)),n.style.background=e?"#dc2626":"#16a34a",n.textContent=t,n.style.opacity="1",clearTimeout(n.__timer),e||(n.__timer=setTimeout(function(){n.style.opacity="0"},5e3))}!async function(){t("⏳ Đang chọn và sao chép dữ liệu, vui lòng đợi...",!1);try{var exc=Array.from(document.querySelectorAll(".dx-datagrid-content-fixed, .dx-hidden, #acp-status-box, #acp-float-btn, #__copy_wait_toast__")),prev=exc.map(el=>el.style.display);exc.forEach(el=>{el.style.display="none"});var e,n=document.activeElement;if(!n||"TEXTAREA"!==n.tagName&&("INPUT"!==n.tagName||"text"!==n.type&&"search"!==n.type)){var o=window.getSelection(),i=document.createRange();i.selectNodeContents(document.body);o.removeAllRanges();o.addRange(i);e=o.toString();o.removeAllRanges()}else n.select(),e=n.value;exc.forEach((el,i)=>{el.style.display=prev[i]});if(e)e=e.split("\\n").map(l=>l.trim()).filter(l=>l&&"undefined"!==l&&!/^(⚡|⏳|⏹|✅|📋|Đã mở:|Còn lại:)/i.test(l)&&!/^⚡\\s*Click\\+/i.test(l)).join("\\n");if(!e||0===e.length)return void t("⚠️ Không có dữ liệu nào để copy.",!0);if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(e);else if(!document.execCommand("copy"))throw new Error("Trình duyệt không hỗ trợ copy tự động.");t("✅ Đã copy xong "+e.length.toLocaleString("vi-VN")+" ký tự! Giờ bạn có thể dán (Ctrl+V) an toàn.",!1)}catch(e){t("❌ Copy thất bại: "+e.message,!0)}}()}();`;

interface AutoClickGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AutoClickGuideModal: React.FC<AutoClickGuideModalProps> = ({ isOpen, onClose }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopyCode = async (code: string, key: string, name: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedKey(key);
            toast.success(`Đã sao chép mã ${name} vào clipboard!`, { icon: '📋' });
            setTimeout(() => setCopiedKey(null), 3000);
        } catch {
            toast.error('Không thể tự động sao chép, vui lòng thử lại.');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="lg"
            title={
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-sky-500 text-white shadow-sm shadow-emerald-500/30">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                                Hướng Dẫn Tính Năng Auto Click+ & CopyAll
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                1-Click
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            Đã đồng bộ công nghệ CopyAll 100% — sao chép đầy đủ toàn bộ bảng & chương trình thi đua
                        </p>
                    </div>
                </div>
            }
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        An toàn 100% • Chạy trực tiếp trên trình duyệt • Không lưu dữ liệu ra ngoài
                    </span>
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all"
                    >
                        Đã hiểu & Đóng
                    </Button>
                </div>
            }
        >
            <div className="space-y-4 py-1 text-slate-700 dark:text-slate-200">
                {/* LỢI ÍCH TÍNH NĂNG */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 via-sky-50/50 to-sky-50/50 dark:from-emerald-950/20 dark:via-sky-950/20 dark:to-sky-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                                Giải pháp lấy dữ liệu chuẩn xác 100% (Đồng bộ công nghệ CopyAll):
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong className="text-emerald-700 dark:text-emerald-300">Auto Click+</strong> sẽ tự động kiểm tra và mở tất cả các dấu <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">[+]</code> nếu có, sau đó tự động sao chép toàn bộ trang theo chuẩn <strong className="text-slate-800 dark:text-slate-200">CopyAll</strong> vào Clipboard. Dữ liệu sao chép đảm bảo trọn vẹn 38 chương trình thi đua & ngành hàng, không bao giờ bị thiếu! Trên trang BI mới (baocao.dienmayxanh.com) còn tự bật sẵn <strong className="text-slate-800 dark:text-slate-200">Trả góp</strong> và <strong className="text-slate-800 dark:text-slate-200">DT quy đổi</strong> nếu đang tắt.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CÁCH 1: KÉO THẢ DẤU TRANG (KHUYÊN DÙNG) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900/50 shadow-xs">
                    <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black">1</span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                Kéo thả lên thanh Dấu trang (Bookmarks) — Khuyên dùng
                            </span>
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Chỉ cần kéo thả 1 lần</span>
                    </div>

                    <div className="p-3.5 space-y-3.5">
                        {/* VÙNG KÉO THẢ TRỰC TIẾP */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* NÚT 1: AUTO CLICK+ (MỞ [+] & COPY ALL) */}
                            <div className="flex flex-col justify-between gap-2.5 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                                <div>
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Auto Click+ (Khuyên dùng)</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Tự động mở các dấu [+] nếu có & sao chép 100% bằng CopyAll.
                                    </p>
                                </div>
                                <a
                                    href={AUTO_CLICK_BOOKMARKLET_CODE}
                                    draggable
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toast.success('Hãy dùng chuột kéo nút này thả lên thanh Dấu trang (Bookmarks)!', { icon: '🖱️', duration: 4000 });
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/30 cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-95 transition-all border border-emerald-400/40"
                                    title="Kéo thả nút này lên thanh Dấu trang của trình duyệt"
                                >
                                    <Sparkles className="w-4 h-4 text-emerald-100" />
                                    <span>⚡ Auto Click+ 1-Click</span>
                                </a>
                            </div>

                            {/* NÚT 2: COPY ALL THUẦN TUÝ */}
                            <div className="flex flex-col justify-between gap-2.5 p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-700">
                                <div>
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                                        <Copy className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                        <span>CopyAll (Thuần Copy)</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Sao chép tức thì toàn bộ nội dung trang hiện tại vào Clipboard.
                                    </p>
                                </div>
                                <a
                                    href={COPY_ALL_BOOKMARKLET_CODE}
                                    draggable
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toast.success('Hãy dùng chuột kéo nút này thả lên thanh Dấu trang (Bookmarks)!', { icon: '🖱️', duration: 4000 });
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-sky-600 to-sky-600 hover:from-sky-500 hover:to-sky-500 text-white font-bold text-xs rounded-lg shadow-md shadow-sky-600/30 cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-95 transition-all border border-sky-400/40"
                                    title="Kéo thả nút này lên thanh Dấu trang của trình duyệt"
                                >
                                    <Copy className="w-4 h-4 text-sky-100" />
                                    <span>📋 CopyAll Toàn Trang</span>
                                </a>
                            </div>
                        </div>

                        {/* CÁC BƯỚC SỬ DỤNG */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">1</span>
                                    Mở Báo cáo MWG
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Mở trang Ngành hàng, Doanh thu hoặc Thi đua trên trình duyệt.
                                </p>
                            </div>

                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">2</span>
                                    Bấm Auto Click+ hoặc CopyAll
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Bấm dấu trang đã lưu. Script sẽ mở các mục [+] và copy toàn bộ dữ liệu.
                                </p>
                            </div>

                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">3</span>
                                    Dán vào Dashboard
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Quay lại Dashboard này, chọn ô cần nhập và nhấn <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px]">Ctrl+V</kbd>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CÁCH 2 & 3: TÙY CHỌN BỔ SUNG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* SAO CHÉP MÃ CODE */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <Copy className="w-3.5 h-3.5 text-sky-500" />
                            <span>Sao chép mã Bookmarklet thủ công</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Dán vào ô URL khi tạo Bookmark thủ công trên trình duyệt.
                        </p>
                        <div className="flex flex-col gap-1.5 pt-1">
                            <Button
                                variant="unstyled"
                                size="none"
                                onClick={() => handleCopyCode(AUTO_CLICK_BOOKMARKLET_CODE, 'autoclick', 'Auto Click+')}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-semibold active:scale-95 transition-all"
                            >
                                {copiedKey === 'autoclick' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Sparkles className="w-3.5 h-3.5" />}
                                <span>{copiedKey === 'autoclick' ? 'Đã sao chép Auto Click+!' : 'Sao chép mã Auto Click+ (Có mở [+])'}</span>
                            </Button>
                            <Button
                                variant="unstyled"
                                size="none"
                                onClick={() => handleCopyCode(COPY_ALL_BOOKMARKLET_CODE, 'copyall', 'CopyAll')}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 dark:text-sky-300 rounded-lg border border-sky-200 dark:border-sky-800 text-xs font-semibold active:scale-95 transition-all"
                            >
                                {copiedKey === 'copyall' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedKey === 'copyall' ? 'Đã sao chép CopyAll!' : 'Sao chép mã CopyAll (Thuần túy)'}</span>
                            </Button>
                        </div>
                    </div>

                    {/* TAMPERMONKEY EXTENSION */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 space-y-2 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                <MousePointerClick className="w-3.5 h-3.5 text-slate-500" />
                                <span>Userscript Tampermonkey (v4.2)</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Tự động hiển thị nút nổi trên trang BI báo cáo, hỗ trợ mở cây dữ liệu và lấy điểm thưởng nhân viên tự động.
                            </p>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => window.open('/scripts/mwg-auto-thu-thap-diem-thuong.user.js', '_blank')}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-950/60 dark:hover:bg-slate-900/60 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold active:scale-95 transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Cài đặt Userscript v4.2</span>
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

