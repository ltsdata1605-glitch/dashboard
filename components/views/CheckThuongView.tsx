import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Icon } from '../common/Icon';
import { getGlobalFont, saveSettingOrThrow } from '../../services/dbService';
import { Button } from '../shared/ui/Button';
import { getCheckThuongDataFromIframeDb } from '../../services/checkThuongIframeService';
import { CheckThuongLeaderboardView } from '../../features/check-thuong';


export const CheckThuongView: React.FC = () => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasData, setHasData] = useState(false);
    const [codes, setCodes] = useState({ code1: '910', code2: '' });
    const [activeSubTab, setActiveSubTab] = useState<'search' | 'leaderboard'>('search');
    const [competitionData, setCompetitionData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [uploadTime, setUploadTime] = useState<string>('');
    // Đọc được activeTab MỚI NHẤT bên trong listener của effect deps [] bên dưới (không re-subscribe
    // message/cloud-sync listener mỗi lần đổi tab) — dùng để chỉ hiện cảnh báo cập nhật Cloud khi
    // người dùng ĐANG xem đúng tab Check Thưởng, tránh toast lạc ngữ cảnh ở tab khác.
    const activeTabRef = useRef(activeTab);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    useEffect(() => {
        setMounted(true);

        // Nạp trước dữ liệu đã lưu từ IndexedDB nếu có
        getCheckThuongDataFromIframeDb().then((saved) => {
            if (saved && saved.competitionData && saved.competitionData.length > 0) {
                setHasData(true);
                setCompetitionData(saved.competitionData);
                if (saved.fileName) setFileName(saved.fileName);
                if (saved.uploadTime) setUploadTime(saved.uploadTime);
                if (saved.code1) setCodes(prev => ({ ...prev, code1: saved.code1 }));
                if (saved.code2) setCodes(prev => ({ ...prev, code2: saved.code2 }));
            }
        });

        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'CHECK_THUONG_FILE_LOADED') {
                setHasData(true);
                if (e.data.code1) setCodes(prev => ({ ...prev, code1: e.data.code1 }));
                if (e.data.code2) setCodes(prev => ({ ...prev, code2: e.data.code2 }));
                if (e.data.competitionData && Array.isArray(e.data.competitionData)) {
                    setCompetitionData(e.data.competitionData);
                }
                if (e.data.fileName) setFileName(e.data.fileName);
                if (e.data.uploadTime) setUploadTime(e.data.uploadTime);
            } else if (e.data?.type === 'CHECK_THUONG_STATE_CHANGED' || e.data?.type === 'CHECK_THUONG_DATA_RESPONSE') {
                const payload = e.data.payload;
                if (payload) {
                    if (payload.competitionData && Array.isArray(payload.competitionData)) {
                        setCompetitionData(payload.competitionData);
                        setHasData(true);
                    }
                    if (payload.fileName) setFileName(payload.fileName);
                    if (payload.uploadTime) setUploadTime(payload.uploadTime);
                    if (payload.code1) setCodes(prev => ({ ...prev, code1: payload.code1 }));
                    if (payload.code2) setCodes(prev => ({ ...prev, code2: payload.code2 }));
                    if (e.data?.type === 'CHECK_THUONG_STATE_CHANGED') {
                        saveSettingOrThrow('checkthuong_data', payload).catch((err) => {
                            console.error('[CheckThuong] Lưu dữ liệu thất bại:', err);
                            toast.error('Không lưu được thay đổi Check Thưởng vào máy. Vui lòng thử lại hoặc tải lại trang.', { id: 'checkthuong-save-failed', duration: 6000 });
                        });
                    }
                }
            } else if (e.data?.type === 'CHECK_THUONG_SAVE_ERROR') {
                console.error('[CheckThuong] Lưu dữ liệu trong iframe thất bại:', e.data.message);
                toast.error('Không lưu được thay đổi Check Thưởng (bộ nhớ tạm bảng tra cứu). Vui lòng thử lại hoặc tải lại trang.', { id: 'checkthuong-iframe-save-failed', duration: 6000 });
            } else if (e.data?.type === 'CHECK_THUONG_LOAD_ERROR') {
                console.error('[CheckThuong] Tải dữ liệu đã lưu trong iframe thất bại:', e.data.message);
                toast.error('Không tải được dữ liệu Check Thưởng đã lưu trước đó. Vui lòng tải lại file Excel.', { id: 'checkthuong-iframe-load-failed', duration: 6000 });
            }
        };

        // Tự động áp dụng bản Cloud mới vào iframe — người dùng không cần phải click xác nhận hay cập nhật thủ công
        const handleCloudSync = () => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_RELOAD_DATA' }, '*');
        };

        const handleCloudUpdateAvailable = () => {
            handleCloudSync();
            toast.dismiss('checkthuong-cloud-update');
            if (activeTabRef.current === 'check-thuong') {
                toast.success('Đã tự động cập nhật dữ liệu Check Thưởng mới nhất', {
                    id: 'checkthuong-auto-synced',
                    duration: 2500,
                });
            }
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('check-thuong-cloud-update-available', handleCloudUpdateAvailable);
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

    const handleSelectStoreFromLeaderboard = (storeCode: string) => {
        setCodes({ code1: storeCode, code2: '' });
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_SEARCH',
            code1: storeCode,
            code2: ''
        }, '*');
        setActiveSubTab('search');
    };

    const renderSearchBar = (isMobile: boolean) => (
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'hidden lg:flex gap-2 bg-white/60 dark:bg-slate-900/60 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300'}`}>
            {/* CỤM NÚT CHUYỂN TAB: TRA CỨU / TOP THƯỞNG */}
            <div className="flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('search')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        activeSubTab === 'search'
                            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Tra cứu & So sánh siêu thị"
                >
                    <Icon name="search" size={3} />
                    <span className={isMobile ? 'hidden sm:inline' : 'inline'}>Tra cứu</span>
                </Button>

                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => {
                        setActiveSubTab('leaderboard');
                        if (competitionData.length === 0) {
                            iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_REQUEST_DATA' }, '*');
                        }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        activeSubTab === 'leaderboard'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300 text-slate-950 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Xem Bảng Xếp Hạng TOP Siêu Thị Thưởng Cao"
                >
                    <Icon name="trophy" size={3} />
                    <span>Top thưởng</span>
                </Button>
            </div>

            {/* CỤM Ô NHẬP MÃ KHO (KHI Ở TAB TRA CỨU) */}
            {activeSubTab === 'search' && (
                <>
                    <div className={isMobile ? 'flex items-center gap-1' : 'flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}>
                        <input
                            type="text"
                            placeholder="Kho 1"
                            className={`${isMobile ? 'w-14 px-2 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm' : 'w-20 px-2.5 py-1 text-xs text-center'} font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:bg-sky-50/50 dark:focus:bg-sky-900/20 transition-colors`}
                            value={codes.code1}
                            onChange={(e) => handleCodeChange('code1', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Kho 2"
                            className={`${isMobile ? 'w-14 px-2 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm' : 'w-20 px-2.5 py-1 text-xs text-center border-l border-slate-100 dark:border-slate-700'} font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:bg-sky-50/50 dark:focus:bg-sky-900/20 transition-colors`}
                            value={codes.code2}
                            onChange={(e) => handleCodeChange('code2', e.target.value)}
                        />
                    </div>
                    <div className={isMobile ? 'flex items-center gap-0.5' : 'flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}>
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => {
                                setCodes(prev => ({ ...prev, code2: '' }));
                                iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_SEARCH', code1: codes.code1, code2: '' }, '*');
                            }}
                            className={`${isMobile ? 'w-6 h-6 rounded-full' : 'p-1.5'} flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 transition-colors`}
                            title="Xoá mã kho đang so sánh"
                        >
                            <Icon name="rotate-ccw" size={3} />
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleChangeFile}
                            className={`${isMobile ? 'w-6 h-6 rounded-full ml-0.5' : 'p-1.5 border-l border-slate-100 dark:border-slate-700'} flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors`}
                            title="Tải file khác"
                        >
                            <Icon name="upload" size={3} />
                        </Button>
                    </div>
                </>
            )}

            {/* KHI Ở TAB TOP THƯỞNG: NÚT ĐỔI FILE */}
            {activeSubTab === 'leaderboard' && (
                <div className={isMobile ? 'flex items-center' : 'flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}>
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleChangeFile}
                        className={`${isMobile ? 'px-2 py-1 rounded-full' : 'px-2.5 py-1'} flex items-center gap-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-xs font-bold`}
                        title="Tải file khác"
                    >
                        <Icon name="upload" size={3} />
                        <span className={isMobile ? 'hidden sm:inline' : 'inline'}>Đổi file</span>
                    </Button>
                </div>
            )}
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

            {/* TAB 1: GIAO DIỆN TRA CỨU & SO SÁNH (IFRAME) */}
            <iframe
                ref={iframeRef}
                src={`${import.meta.env?.BASE_URL || '/'}check-thuong.html`}
                title="Bảng Tra Cứu Thưởng Thi Đua"
                className={`w-full h-full border-none flex-grow ${activeSubTab === 'search' ? 'block' : 'hidden'}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            />

            {/* TAB 2: GIAO DIỆN BẢNG XẾP HẠNG TOP SIÊU THỊ THƯỞNG CAO */}
            {activeSubTab === 'leaderboard' && (
                <div className="w-full h-full flex-grow overflow-hidden">
                    <CheckThuongLeaderboardView
                        competitionData={competitionData}
                        uploadTime={uploadTime}
                        fileName={fileName}
                        onSelectStore={handleSelectStoreFromLeaderboard}
                        onSwitchToSearch={() => setActiveSubTab('search')}
                    />
                </div>
            )}
        </div>
    );
};

export default CheckThuongView;