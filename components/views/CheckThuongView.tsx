import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Icon } from '../common/Icon';
import { getGlobalFont, saveSettingOrThrow } from '../../services/dbService';
import { Button } from '../shared/ui/Button';


export const CheckThuongView: React.FC = () => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasData, setHasData] = useState(false);
    const [codes, setCodes] = useState({ code1: '910', code2: '' });
    // Đọc được activeTab MỚI NHẤT bên trong listener của effect deps [] bên dưới (không re-subscribe
    // message/cloud-sync listener mỗi lần đổi tab) — dùng để chỉ hiện cảnh báo cập nhật Cloud khi
    // người dùng ĐANG xem đúng tab Check Thưởng, tránh toast lạc ngữ cảnh ở tab khác.
    const activeTabRef = useRef(activeTab);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    useEffect(() => {
        setMounted(true);
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'CHECK_THUONG_FILE_LOADED') {
                setHasData(true);
                if (e.data.code1) setCodes(prev => ({ ...prev, code1: e.data.code1 }));
                if (e.data.code2) setCodes(prev => ({ ...prev, code2: e.data.code2 }));
            } else if (e.data?.type === 'CHECK_THUONG_STATE_CHANGED') {
                if (e.data.payload) {
                    // BUG FIX: saveSetting() mặc định nuốt lỗi sau khi retry (giữ nguyên hành vi cho
                    // ~80 call site khác trong app — xem comment ở services/dbService/core.ts) nên
                    // .catch(console.error) trước đây KHÔNG BAO GIỜ thực sự chạy khi ghi IndexedDB
                    // thất bại (hết quota, Private Browsing chặn, DB hỏng...) — người dùng thao tác
                    // trong Check Thưởng nhưng dữ liệu âm thầm không được lưu, không hề biết. Dùng
                    // saveSettingOrThrow() để lỗi thật sự tới được đây và báo cho người dùng.
                    saveSettingOrThrow('checkthuong_data', e.data.payload).catch((err) => {
                        console.error('[CheckThuong] Lưu dữ liệu thất bại:', err);
                        toast.error('Không lưu được thay đổi Check Thưởng vào máy. Vui lòng thử lại hoặc tải lại trang.', { id: 'checkthuong-save-failed', duration: 6000 });
                    });
                }
            }
        };

        // Áp dụng thật sự bản Cloud mới vào iframe — chỉ chạy khi người dùng đã XÁC NHẬN qua toast
        // cảnh báo bên dưới (không còn tự động chạy ngay khi Cloud có bản mới, xem handleCloudUpdateAvailable).
        const handleCloudSync = () => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_RELOAD_DATA' }, '*');
        };

        // BUG FIX (mở 2 tab/thiết bị cùng sửa Check Thưởng = last-write-wins, im lặng): trước đây
        // useCloudSync.ts phát 'check-thuong-cloud-sync' và handleCloudSync ở trên ÁP DỤNG NGAY —
        // tab đang xem bị ghi đè dữ liệu (kể cả đang xem dở 1 mục) mà không hề biết có tab/thiết bị
        // khác vừa lưu đè. Dữ liệu Cloud mới đã được ghi an toàn vào IndexedDB (cả app chính lẫn
        // iframe) TRƯỚC KHI sự kiện này bắn — không mất dữ liệu, chỉ là UI đang xem chưa cập nhật.
        // Đổi sang: chỉ HỎI, để người dùng chủ động chọn tải lại hay giữ nguyên bản đang xem.
        const handleCloudUpdateAvailable = () => {
            if (activeTabRef.current !== 'check-thuong') return; // không làm phiền khi đang ở tab khác
            toast((t) => (
                <div className="flex flex-col gap-2 max-w-xs">
                    <span className="text-sm font-semibold text-slate-800">
                        Dữ liệu Check Thưởng vừa được cập nhật ở nơi khác (tab hoặc thiết bị khác).
                    </span>
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            Giữ bản đang xem
                        </Button>
                        <Button
                            variant="primary" size="sm"
                            onClick={() => {
                                toast.dismiss(t.id);
                                handleCloudSync();
                            }}
                        >
                            Tải lại dữ liệu mới
                        </Button>
                    </div>
                </div>
            ), { id: 'checkthuong-cloud-update', duration: 20000 });
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('check-thuong-cloud-update-available', handleCloudUpdateAvailable);
        // Giữ nguyên listener cũ 'check-thuong-cloud-sync' — hooks/useDataManagement.ts vẫn dùng
        // tên sự kiện này cho nhánh đối chiếu lúc BOOT app (chạy đúng 1 lần, không phải race-condition
        // đa tab đang mở SỐNG như nhánh useCloudSync.ts) — áp dụng ngay không cần hỏi vì tại thời
        // điểm đó gần như chắc chắn chưa có gì đang xem dở để mất.
        window.addEventListener('check-thuong-cloud-sync', handleCloudSync);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('check-thuong-cloud-sync', handleCloudSync);
            window.removeEventListener('check-thuong-cloud-update-available', handleCloudUpdateAvailable);
        };
    }, []);

    // Inject parent's custom font into the iframe document
    const injectFontIntoIframe = useCallback((fontValue: string) => {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;

        let styleEl = iframeDoc.getElementById('injected-global-font');
        if (!styleEl) {
            styleEl = iframeDoc.createElement('style');
            styleEl.id = 'injected-global-font';
            iframeDoc.head.appendChild(styleEl);
        }

        const activeFont = fontValue || 'UTM Avo';
        if (activeFont && activeFont !== 'UTM Avo') {
            styleEl.innerHTML = `body, div, span, p, a, h1, h2, h3, h4, h5, h6, table, th, td, button, input, label, select, textarea, strong, em, b, i { font-family: '${activeFont}', sans-serif !important; }`;
        } else {
            styleEl.innerHTML = `body, div, span, p, a, h1, h2, h3, h4, h5, h6, table, th, td, button, input, label, select, textarea, strong, em, b, i { font-family: 'UTM Avo', sans-serif !important; }`;
        }
    }, []);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const onLoad = () => {
            // 1. Copy all parent styles (including Tailwind) to iframe so we don't need Tailwind CDN
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc) {
                    const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
                    parentStyles.forEach(styleNode => {
                        iframeDoc.head.appendChild(styleNode.cloneNode(true));
                    });
                }
            } catch { /* non-critical */ }

            // 2. Read saved font and inject into iframe
            getGlobalFont().then(font => {
                injectFontIntoIframe(font || 'UTM Avo');
            });
        };
        iframe.addEventListener('load', onLoad);

        // Also observe parent's dynamic font style changes (when user picks a new font)
        const observer = new MutationObserver(() => {
            const parentStyle = document.getElementById('dynamic-font-style');
            if (parentStyle) {
                // Extract font name from parent style
                const match = parentStyle.innerHTML.match(/font-family:\s*'([^']+)'/);
                if (match) injectFontIntoIframe(match[1]);
            }
        });
        observer.observe(document.head, { childList: true, subtree: true, characterData: true });

        return () => {
            iframe.removeEventListener('load', onLoad);
            observer.disconnect();
        };
    }, [injectFontIntoIframe]);

    const handleSearch = () => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_SEARCH',
            code1: codes.code1,
            code2: codes.code2
        }, '*');
    };

    const handleCodeChange = (field: 'code1' | 'code2', value: string) => {
        setCodes(prev => {
            const newCodes = { ...prev, [field]: value };
            iframeRef.current?.contentWindow?.postMessage({
                type: 'CHECK_THUONG_SEARCH',
                code1: newCodes.code1,
                code2: newCodes.code2
            }, '*');
            return newCodes;
        });
    };

    const handleChangeFile = () => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_CHANGE_FILE'
        }, '*');
    };

    const renderSearchBar = (isMobile: boolean) => (
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'hidden lg:flex gap-3 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300'}`}>
            {/* Nhóm ô nhập mã kho — 1 pill trắng viền chung, phân cách bằng đường kẻ dọc (đúng chuẩn components/layout/Header.tsx) */}
            <div className={isMobile ? 'flex items-center gap-1' : 'flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}>
                <input
                    type="text"
                    placeholder="Kho 1"
                    className={`${isMobile ? 'w-14 px-2 py-1 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm' : 'w-36 px-4 py-2 text-sm'} font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:bg-sky-50/50 dark:focus:bg-sky-900/20 transition-colors`}
                    value={codes.code1}
                    onChange={(e) => handleCodeChange('code1', e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Kho 2"
                    className={`${isMobile ? 'w-14 px-2 py-1 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm' : 'w-32 px-4 py-2 text-sm border-l border-slate-100 dark:border-slate-700'} font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:bg-sky-50/50 dark:focus:bg-sky-900/20 transition-colors`}
                    value={codes.code2}
                    onChange={(e) => handleCodeChange('code2', e.target.value)}
                />
            </div>
            {/* Nhóm nút hành động (Xoá/Tải file) — pill trắng viền chung thứ 2 */}
            <div className={isMobile ? 'flex items-center gap-0.5' : 'flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}>
                <Button
                    variant="unstyled" size="none"
                    onClick={() => {
                        setCodes(prev => ({ ...prev, code2: '' }));
                        iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_SEARCH', code1: codes.code1, code2: '' }, '*');
                    }}
                    className={`${isMobile ? 'w-6 h-6 rounded-full' : 'p-2.5'} flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 transition-colors`}
                    title="Xoá mã kho đang so sánh"
                >
                    <Icon name="rotate-ccw" size={isMobile ? 3 : 3.5} />
                </Button>
                <Button
                    variant="unstyled" size="none"
                    onClick={handleChangeFile}
                    className={`${isMobile ? 'w-6 h-6 rounded-full ml-0.5' : 'p-2.5 border-l border-slate-100 dark:border-slate-700'} flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors`}
                    title="Tải file khác"
                >
                    <Icon name="upload" size={isMobile ? 3 : 3.5} />
                </Button>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 absolute top-0 left-0 right-0 bottom-20 lg:bottom-0">
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('global-header-actions') && createPortal(
                renderSearchBar(false),
                document.getElementById('global-header-actions')!
            )}
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('mobile-topbar-actions') && createPortal(
                renderSearchBar(true),
                document.getElementById('mobile-topbar-actions')!
            )}
            <iframe
                ref={iframeRef}
                src={`${import.meta.env?.BASE_URL || '/'}check-thuong.html`}
                title="Bảng Tra Cứu Thưởng Thi Đua"
                className="w-full h-full border-none flex-grow"
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            />
        </div>
    );
};

export default CheckThuongView;