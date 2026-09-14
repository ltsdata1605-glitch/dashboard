import React, { useState } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Zap, Sparkles, Copy, Check, ExternalLink, BookmarkPlus, MousePointerClick, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const AUTO_CLICK_BOOKMARKLET_CODE = `javascript:(async function(){function S(m,e,d=5e3){var t=document.getElementById("__copy_wait_toast__");t||((t=document.createElement("div")).id="__copy_wait_toast__",Object.assign(t.style,{position:"fixed",top:"20px",right:"20px",zIndex:"2147483647",padding:"14px 20px",borderRadius:"10px",fontFamily:"system-ui, -apple-system, sans-serif",fontSize:"14px",fontWeight:"600",color:"#fff",boxShadow:"0 6px 20px rgba(0,0,0,0.25)",transition:"all 0.3s ease",maxWidth:"360px",lineHeight:"1.4"}),document.body.appendChild(t)),t.style.background=e?"linear-gradient(135deg, #dc2626, #b91c1c)":m.includes("✅")?"linear-gradient(135deg, #16a34a, #15803d)":"linear-gradient(135deg, #0ea5e9, #2563eb)",t.innerHTML=m,t.style.opacity="1",clearTimeout(t.__timer),e||!d||(t.__timer=setTimeout(function(){t.style.opacity="0"},d))}const sleep=ms=>new Promise(r=>setTimeout(r,ms)),nextFrame=()=>new Promise(r=>requestAnimationFrame(r)),SPINNERS=['#Loading','.overload-wait','.animate-spin','.dx-loadpanel-content','.dx-loadpanel:not(.dx-state-invisible)','.dx-loadindicator','.ant-spin-spinning','.el-loading-mask','[class*="spinner" i]','[class*="loading" i]'].join(', ');function isVis(el){return!!(el&&null!==el.offsetParent)}function isSpinVis(el){if(!el)return!1;var s=window.getComputedStyle(el);if("none"===s.display||"hidden"===s.visibility||0===parseFloat(s.opacity||"1"))return!1;if("fixed"===s.position){var r=el.getBoundingClientRect();return r.width>0&&r.height>0}return null!==el.offsetParent}function isPlus(el){return el&&el.classList&&el.classList.contains("fa-plus")&&!el.classList.contains("fa-minus")}function isOpened(el){var c=el.closest('button, a, [role="button"], .cursor-pointer, td, div');return!(!c||"true"!==c.getAttribute("aria-expanded")&&"open"!==c.getAttribute("data-state")&&!c.querySelector(".fa-minus"))}function getButtons(){return Array.from(new Set(Array.from(document.querySelectorAll(".fa-solid.fa-plus.text-gray-700, .fa-plus")))).filter(isVis).filter(isPlus).filter(b=>"1"!==b.dataset.clickPlusDone).filter(b=>!isOpened(b))}async function waitSpinners(maxMs=6e3){await sleep(60);var start=Date.now();while(Date.now()-start<maxMs){if(!Array.from(document.querySelectorAll(SPINNERS)).some(isSpinVis))return;await sleep(100)}}async function forceRender(){var sc=document.scrollingElement||document.documentElement,step=Math.max(window.innerHeight||800,400),pos=0,guard=0;while(pos<sc.scrollHeight&&guard<500){window.scrollTo(0,pos),await sleep(100),pos+=step,guard++}window.scrollTo(0,sc.scrollHeight),await sleep(200),window.scrollTo(0,0),await sleep(200)}async function copyText(){var txt="",ae=document.activeElement;if(ae&&("TEXTAREA"===ae.tagName||"INPUT"===ae.tagName&&("text"===ae.type||"search"===ae.type)))ae.select(),txt=ae.value;else{var sel=window.getSelection(),rg=document.createRange();rg.selectNodeContents(document.body),sel.removeAllRanges(),sel.addRange(rg),txt=sel.toString()||document.body.innerText||document.body.textContent||""}if(!txt||0===txt.length)return{ok:!1,len:0};try{if(navigator.clipboard&&navigator.clipboard.writeText)return await navigator.clipboard.writeText(txt),{ok:!0,len:txt.length}}catch(e){}try{return{ok:document.execCommand("copy"),len:txt.length}}catch(e){return{ok:!1,len:txt.length}}}try{var pending=getButtons(),total=0,BATCH=4;if(pending.length>0){S(\`⚡ Đang tự động mở \${pending.length} mục dữ liệu...\`,!1,0);for(var i=0;i<pending.length;i++){var btn=pending[i];try{isVis(btn)&&isPlus(btn)&&!isOpened(btn)&&(btn.dataset.clickPlusDone="1",btn.click(),total++)}catch(e){}S(\`⚡ Đã mở: \${total} | Còn: \${pending.length-i-1}\`,!1,0),(i+1)%BATCH==0||i===pending.length-1?(await nextFrame(),await waitSpinners(5e3),await sleep(60)):await sleep(25)}S("⌛ Đang cuộn hiển thị toàn bộ dòng...",!1,0),await forceRender(),await waitSpinners(6e3),await sleep(300)}else S("⌛ Đang chọn và sao chép dữ liệu...",!1,0);var res=await copyText();if(!res.ok||0===res.len)return void S("⚠️ Không có dữ liệu để copy hoặc quyền bị hạn chế. Nhấn Ctrl+C để copy thủ công.",!0,6e3);var msg=total>0?\`Đã mở \${total} mục & \`:"";S(\`✅ \${msg}Đã copy xong \${res.len.toLocaleString("vi-VN")} ký tự!<br/><span style="font-size:12px;opacity:0.9;">Giờ bạn có thể dán (Ctrl+V) an toàn.</span>\`,!1,5e3)}catch(e){S(\`❌ Thất bại: \${e.message}\`,!0,6e3)}})();`;

interface AutoClickGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AutoClickGuideModal: React.FC<AutoClickGuideModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(AUTO_CLICK_BOOKMARKLET_CODE);
            setCopied(true);
            toast.success('Đã sao chép mã Bookmarklet vào clipboard!', { icon: '📋' });
            setTimeout(() => setCopied(false), 3000);
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
                    <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-500/30">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                                Hướng Dẫn Tính Năng Auto Click+
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                1-Click
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            Tự động bung cây dữ liệu và sao chép 100% nội dung báo cáo MWG chỉ với 1 cú nhấp
                        </p>
                    </div>
                </div>
            }
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        An toàn 100% • Chạy trực tiếp trên trình duyệt
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
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-sky-50/50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-sky-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                                Giải pháp lấy dữ liệu siêu tốc, không cần thao tác tay:
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Trên trang báo cáo MWG (Ngành hàng, Doanh thu, Thi đua), số liệu bị gom trong các dấu <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">[+]</code>. 
                                <strong className="text-slate-800 dark:text-slate-200"> Auto Click+</strong> sẽ tự động click mở tất cả các cấp, cuộn tải hết danh sách và sao chép sẵn vào Clipboard. Bạn chỉ cần quay lại đây và nhấn <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded font-mono text-[10px]">Ctrl + V</kbd>.
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
                                Cách cài đặt qua Dấu trang (Bookmarks) — Khuyên dùng
                            </span>
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Chỉ cần làm 1 lần</span>
                    </div>

                    <div className="p-3.5 space-y-3.5">
                        {/* VÙNG KÉO THẢ TRỰC TIẾP */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                            <div className="flex items-center gap-2.5">
                                <BookmarkPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div className="text-xs">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                        Kéo nút này thả lên thanh Dấu trang (Bookmarks bar):
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        (Nếu thanh dấu trang đang ẩn, nhấn <kbd className="px-1 py-0.2 bg-white dark:bg-slate-800 border rounded font-mono text-[10px]">Ctrl+Shift+B</kbd> trên Windows hoặc <kbd className="px-1 py-0.2 bg-white dark:bg-slate-800 border rounded font-mono text-[10px]">Cmd+Shift+B</kbd> trên Mac)
                                    </p>
                                </div>
                            </div>

                            <a
                                href={AUTO_CLICK_BOOKMARKLET_CODE}
                                draggable
                                onClick={(e) => {
                                    e.preventDefault();
                                    toast.success('Hãy dùng chuột kéo nút này thả lên thanh Dấu trang của trình duyệt!', { icon: '🖱️', duration: 4000 });
                                }}
                                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/30 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all border border-emerald-400/40"
                                title="Kéo thả nút này lên thanh Dấu trang của trình duyệt"
                            >
                                <Sparkles className="w-4 h-4 text-emerald-100" />
                                <span>⚡ Auto Click+</span>
                            </a>
                        </div>

                        {/* CÁC BƯỚC SỬ DỤNG */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">1</span>
                                    Mở Báo cáo MWG
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Mở trang báo cáo Ngành hàng, Doanh thu hoặc Thi đua cần lấy dữ liệu.
                                </p>
                            </div>

                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">2</span>
                                    Bấm Auto Click+
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Bấm vào dấu trang vừa lưu. Script sẽ tự động bung tất cả dấu [+] và copy dữ liệu.
                                </p>
                            </div>

                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">3</span>
                                    Dán vào Dashboard
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Quay lại Dashboard này, chọn ô tương ứng và nhấn <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px]">Ctrl+V</kbd>.
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
                            <span>Sao chép mã Bookmarklet</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Tạo Bookmark mới thủ công trên trình duyệt và dán đoạn mã JavaScript vào ô Địa chỉ (URL).
                        </p>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={handleCopyCode}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 dark:text-sky-300 rounded-lg border border-sky-200 dark:border-sky-800 text-xs font-semibold active:scale-95 transition-all"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Đã sao chép mã!' : 'Sao chép mã JavaScript'}</span>
                        </Button>
                    </div>

                    {/* TAMPERMONKEY EXTENSION */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <MousePointerClick className="w-3.5 h-3.5 text-purple-500" />
                            <span>Userscript Tampermonkey</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Tự động hiển thị nút Click+ cố định nổi trên trang BI và hỗ trợ thu thập điểm thưởng.
                        </p>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => window.open('/scripts/mwg-auto-thu-thap-diem-thuong.user.js', '_blank')}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800 text-xs font-semibold active:scale-95 transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Cài đặt Userscript</span>
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
