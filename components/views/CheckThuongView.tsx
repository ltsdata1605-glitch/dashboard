import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { toast } from '../shared/ui/toast';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { getGlobalFont, saveSettingOrThrow, saveSettingFromCloud } from '../../services/dbService';
import { Button } from '../shared/ui/Button';
import { laPhongGoogle, tenHoPhong, urlPhongGoogle } from '../shared/ui/googleFonts';
import { offerShareRetry } from '../shared/ui/ShareRetryToast';
import { downloadBlob } from '../../services/uiService';
import { getUnifiedCheckThuongData, saveCheckThuongDataToIframeDb } from '../../services/checkThuongIframeService';
import { CheckThuongLeaderboardView } from '../../features/check-thuong';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { assembleChunkedHeavyValue, restoreNestedArraysFromFirestore } from '../../services/firestoreService';
import { extractCloudTimeMs } from '../../services/heavySyncPolicy';


export const CheckThuongView: React.FC = () => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasData, setHasData] = useState(false);
    const [codes, setCodes] = useState({ code1: '910', code2: '' });
    const [activeSubTab, setActiveSubTab] = useState<'search' | 'leaderboard'>('search');
    const [competitionData, setCompetitionData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [uploadTime, setUploadTime] = useState<string>('');
    const { user, isDemoMode } = useAuth();
    const [isSyncingCloud, setIsSyncingCloud] = useState(false);
    // Đọc được activeTab MỚI NHẤT bên trong listener của effect deps [] bên dưới (không re-subscribe
    // message/cloud-sync listener mỗi lần đổi tab) — dùng để chỉ hiện cảnh báo cập nhật Cloud khi
    // người dùng ĐANG xem đúng tab Check Thưởng, tránh toast lạc ngữ cảnh ở tab khác.
    const activeTabRef = useRef(activeTab);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    const handleManualCloudSync = useCallback(async () => {
        if (!user || isDemoMode) {
            toast.error('Vui lòng đăng nhập tài khoản đám mây (Google) trên cả Điện Thoại và Laptop để đồng bộ dữ liệu!', {
                id: 'checkthuong-cloud-login-req',
                duration: 5000,
            });
            return;
        }

        setIsSyncingCloud(true);
        const toastId = toast.loading('Đang kiểm tra và đồng bộ dữ liệu Check Thưởng từ Đám Mây...', { id: 'checkthuong-cloud-syncing' });

        try {
            const docRef = doc(db, 'users', user.uid, 'configs', 'checkthuong_data');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                toast.info('Chưa có dữ liệu Check Thưởng trên Đám Mây để đồng bộ.', { id: toastId, duration: 4000 });
                setIsSyncingCloud(false);
                return;
            }

            const data = docSnap.data();
            let val: any;
            if (data?.chunked) {
                val = await assembleChunkedHeavyValue(docSnap.ref);
            } else {
                val = restoreNestedArraysFromFirestore(data?.value);
            }

            if (!val || !val.competitionData || !Array.isArray(val.competitionData) || val.competitionData.length === 0) {
                toast.info('Dữ liệu Check Thưởng trên Đám Mây không hợp lệ hoặc đang trống.', { id: toastId, duration: 4000 });
                setIsSyncingCloud(false);
                return;
            }

            const cloudTime = extractCloudTimeMs(data) || Date.now();
            await saveSettingFromCloud('checkthuong_data', val, cloudTime);
            await saveCheckThuongDataToIframeDb(val);

            setHasData(true);
            setCompetitionData(val.competitionData);
            if (val.fileName) setFileName(val.fileName);
            if (val.uploadTime) setUploadTime(val.uploadTime);
            if (val.code1) setCodes(prev => ({ ...prev, code1: val.code1 }));
            if (val.code2) setCodes(prev => ({ ...prev, code2: val.code2 }));

            iframeRef.current?.contentWindow?.postMessage({
                type: 'CHECK_THUONG_INIT_DATA',
                payload: val
            }, window.location.origin);

            const timeStr = val.uploadTime ? new Date(val.uploadTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(val.uploadTime).toLocaleDateString('vi-VN') : '';
            toast.success(`Đã đồng bộ thành công dữ liệu Check Thưởng từ Đám Mây${timeStr ? ` (${timeStr})` : ''}!`, { id: toastId, duration: 4000 });
        } catch (err: any) {
            console.error('[CheckThuong] Lỗi đồng bộ thủ công:', err);
            toast.error(`Đồng bộ thất bại: ${err?.message || 'Lỗi mạng hoặc kết nối'}`, { id: toastId, duration: 5000 });
        } finally {
            setIsSyncingCloud(false);
        }
    }, [user, isDemoMode]);

    useEffect(() => {
        setMounted(true);

        // Nạp trước dữ liệu đã lưu từ IndexedDB hợp nhất (cả keyval-store và BI_HUB_DATABASE_V2)
        getUnifiedCheckThuongData().then((saved) => {
            if (saved && saved.competitionData && saved.competitionData.length > 0) {
                setHasData(true);
                setCompetitionData(saved.competitionData);
                if (saved.fileName) setFileName(saved.fileName);
                if (saved.uploadTime) setUploadTime(saved.uploadTime);
                if (saved.code1) setCodes(prev => ({ ...prev, code1: saved.code1 }));
                if (saved.code2) setCodes(prev => ({ ...prev, code2: saved.code2 }));
                // Gửi ngay cho iframe nếu iframe đã sẵn sàng
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'CHECK_THUONG_INIT_DATA',
                    payload: saved
                }, window.location.origin);
            }
        });

        const handleMessage = (e: MessageEvent) => {
            // Audit 2026-10-07 (S11): MỌI loại tin chỉ nhận từ đúng iframe Check Thưởng của mình (cùng
            // origin). Trước đây chỉ nhánh SHARE_RETRY kiểm — cửa sổ lạ giữ tham chiếu tới app (mở
            // popup/khung) bơm được số thưởng giả và ghi đè 'checkthuong_data' đã lưu.
            if (e.source !== iframeRef.current?.contentWindow || e.origin !== window.location.origin) return;
            if (e.data?.type === 'CHECK_THUONG_FILE_LOADED') {
                setHasData(true);
                if (e.data.code1) setCodes(prev => ({ ...prev, code1: e.data.code1 }));
                if (e.data.code2) setCodes(prev => ({ ...prev, code2: e.data.code2 }));
                if (e.data.competitionData && Array.isArray(e.data.competitionData)) {
                    setCompetitionData(e.data.competitionData);
                }
                if (e.data.fileName) setFileName(e.data.fileName);
                if (e.data.uploadTime) setUploadTime(e.data.uploadTime);

                if (e.data.competitionData && Array.isArray(e.data.competitionData) && e.data.competitionData.length > 0) {
                    // Nếu nạp từ bộ nhớ tạm (cache), không ghi đè mốc thời gian Date.now() để không chặn bản cập nhật mới từ Cloud
                    if (!e.data.fromCache) {
                        const filePayload = {
                            schemaVersion: 1,
                            source: 'check-thuong',
                            competitionData: e.data.competitionData,
                            fileName: e.data.fileName || 'file_cu.xlsx',
                            uploadTime: e.data.uploadTime || null,
                            code1: e.data.code1 || '910',
                            code2: e.data.code2 || '',
                            lastModified: e.data.lastModified || Date.now()
                        };
                        saveSettingOrThrow('checkthuong_data', filePayload).catch(err => {
                            console.error('[CheckThuong] Lưu dữ liệu từ file loaded thất bại:', err);
                        });
                    }
                }
            } else if (e.data?.type === 'CHECK_THUONG_REQUEST_DATA_FROM_PARENT') {
                getUnifiedCheckThuongData().then((saved) => {
                    if (saved && saved.competitionData && saved.competitionData.length > 0) {
                        iframeRef.current?.contentWindow?.postMessage({
                            type: 'CHECK_THUONG_INIT_DATA',
                            payload: saved
                        }, window.location.origin);
                    } else {
                        // Báo "không có dữ liệu" để iframe hiện màn nạp file ngay — trước đây nó luôn chờ đủ 500 ms (GĐ2 tăng tốc).
                        iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_NO_DATA' }, window.location.origin);
                    }
                });
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
            } else if (e.data?.type === 'CHECK_THUONG_SHARE_RETRY') {
                // Chỉ nhận từ đúng iframe Check Thưởng của mình (cùng origin) — trang lạ không được
                // tự bật bảng chia sẻ với file tuỳ ý.
                if (e.source !== iframeRef.current?.contentWindow || e.origin !== window.location.origin) return;
                if (!(e.data.blob instanceof Blob)) return;
                const blob: Blob = e.data.blob;
                const filename = String(e.data.filename || 'Check_thuong.png');
                const ten = filename.replace(/\.png$/i, '').replace(/_/g, ' ');
                offerShareRetry(
                    { files: [new File([blob], filename, { type: 'image/png' })], title: ten, text: ten },
                    () => downloadBlob(blob, filename, true),
                );
            } else if (e.data?.type === 'CHECK_THUONG_SAVE_ERROR') {
                console.error('[CheckThuong] Lưu dữ liệu trong iframe thất bại:', e.data.message);
                toast.error('Không lưu được thay đổi Check Thưởng (bộ nhớ tạm bảng tra cứu). Vui lòng thử lại hoặc tải lại trang.', { id: 'checkthuong-iframe-save-failed', duration: 6000 });
            } else if (e.data?.type === 'CHECK_THUONG_LOAD_ERROR') {
                console.error('[CheckThuong] Tải dữ liệu đã lưu trong iframe thất bại:', e.data.message);
                toast.error('Không tải được dữ liệu Check Thưởng đã lưu trước đó. Vui lòng tải lại file Excel.', { id: 'checkthuong-iframe-load-failed', duration: 6000 });
            }
        };

        // Tự động áp dụng bản Cloud mới vào iframe — người dùng không cần phải click xác nhận hay cập nhật thủ công
        const handleCloudSync = (e?: any) => {
            const payload = e?.detail?.payload;
            if (payload && payload.competitionData && payload.competitionData.length > 0) {
                setHasData(true);
                setCompetitionData(payload.competitionData);
                if (payload.fileName) setFileName(payload.fileName);
                if (payload.uploadTime) setUploadTime(payload.uploadTime);
                if (payload.code1) setCodes(prev => ({ ...prev, code1: payload.code1 }));
                if (payload.code2) setCodes(prev => ({ ...prev, code2: payload.code2 }));
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'CHECK_THUONG_INIT_DATA',
                    payload
                }, window.location.origin);
            } else {
                getUnifiedCheckThuongData().then((saved) => {
                    if (saved && saved.competitionData && saved.competitionData.length > 0) {
                        iframeRef.current?.contentWindow?.postMessage({
                            type: 'CHECK_THUONG_INIT_DATA',
                            payload: saved
                        }, window.location.origin);
                    } else {
                        iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_RELOAD_DATA' }, window.location.origin);
                    }
                });
            }
        };

        const handleCloudUpdateAvailable = (e?: any) => {
            handleCloudSync(e);
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
        // iframe đang nạp dở: document tạm chưa có <head> → lần 'load' sau sẽ chèn lại.
        if (!iframeDoc?.head) return;

        let styleEl = iframeDoc.getElementById('injected-global-font');
        if (!styleEl) {
            styleEl = iframeDoc.createElement('style');
            styleEl.id = 'injected-global-font';
            iframeDoc.head.appendChild(styleEl);
        }

        const activeFont = fontValue || 'UTM Avo';
        // Phông Google nay nạp theo nhu cầu (components/shared/ui/googleFonts.ts) — trang cha chưa chắc đã có sẵn thẻ <link>
        // của phông này lúc iframe chép stylesheet → tự gắn link vào iframe (một lần mỗi họ).
        if (laPhongGoogle(activeFont) && !iframeDoc.head.querySelector(`link[data-phong-google="${tenHoPhong(activeFont)}"]`)) {
            const link = iframeDoc.createElement('link');
            link.rel = 'stylesheet';
            link.href = urlPhongGoogle([activeFont]);
            link.dataset.phongGoogle = tenHoPhong(activeFont);
            iframeDoc.head.appendChild(link);
        }
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
            setIsIframeLoaded(true);
            // 1. Copy all parent styles (including Tailwind) to iframe so we don't need Tailwind CDN
            try {
                const iframeDoc = iframe.contentDocument;
                // onLoad chạy 2 lần cho cùng 1 document (sự kiện 'load' + nhánh readyState bên dưới) →
                // trước đây chép MỌI stylesheet 2 lần: CSS bị phân tích 2 lần, link phông tải 2 lần
                // (đo 2026-09-30). Đánh dấu document đã chép.
                // Bỏ qua document tạm `about:blank` (iframe chưa nạp xong trang thật) — chép vào đó là tải phí.
                if (iframeDoc?.head && iframeDoc.URL.includes('check-thuong') && !iframeDoc.head.hasAttribute('data-parent-styles-copied')) {
                    iframeDoc.head.setAttribute('data-parent-styles-copied', '');
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

            // 3. Đẩy dữ liệu Check Thưởng ngay xuống iframe để render lập tức mà không phải chờ
            getUnifiedCheckThuongData().then(saved => {
                if (saved && saved.competitionData && saved.competitionData.length > 0) {
                    iframe.contentWindow?.postMessage({
                        type: 'CHECK_THUONG_INIT_DATA',
                        payload: saved
                    }, window.location.origin);
                }
            });
        };
        iframe.addEventListener('load', onLoad);
        if (iframe.contentDocument && (iframe.contentDocument.readyState === 'complete' || iframe.contentDocument.readyState === 'interactive')) {
            onLoad();
        }

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
        }, window.location.origin);
    };

    const handleCodeChange = (field: 'code1' | 'code2', value: string) => {
        setCodes(prev => {
            const newCodes = { ...prev, [field]: value };
            iframeRef.current?.contentWindow?.postMessage({
                type: 'CHECK_THUONG_SEARCH',
                code1: newCodes.code1,
                code2: newCodes.code2
            }, window.location.origin);
            return newCodes;
        });
    };

    const handleChangeFile = () => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_CHANGE_FILE'
        }, window.location.origin);
    };

    const handleSelectStoreFromLeaderboard = (storeCode: string) => {
        setCodes({ code1: storeCode, code2: '' });
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_SEARCH',
            code1: storeCode,
            code2: ''
        }, window.location.origin);
        setActiveSubTab('search');
    };

    const renderSearchBar = (isMobile: boolean) => (
        <div className={`flex items-center ${isMobile ? 'gap-1 shrink-0' : 'hidden lg:flex gap-2 bg-white/60 dark:bg-slate-900/60 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300'}`}>
            {/* CỤM NÚT CHUYỂN TAB: TRA CỨU / TOP THƯỞNG */}
            <div className={`flex items-center ${isMobile ? 'p-0.5 h-7' : 'p-0.5'} rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs shrink-0`}>
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('search')}
                    className={`flex items-center gap-1 ${isMobile ? 'h-6 px-1.5 text-[11px]' : 'px-2.5 py-1 text-xs'} rounded-full font-bold transition-all ${
                        activeSubTab === 'search'
                            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Tra cứu & So sánh siêu thị"
                >
                    <AppIcon name="search" size="xs" />
                    <span className={isMobile ? 'hidden min-[420px]:inline' : 'inline'}>Tra cứu</span>
                </Button>

                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => {
                        setActiveSubTab('leaderboard');
                        if (competitionData.length === 0) {
                            iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_REQUEST_DATA' }, window.location.origin);
                        }
                    }}
                    className={`flex items-center gap-1 ${isMobile ? 'h-6 px-1.5 text-[11px]' : 'px-2.5 py-1 text-xs'} rounded-full font-bold transition-all ${
                        activeSubTab === 'leaderboard'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300 text-slate-950 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Xem Bảng Xếp Hạng TOP Siêu Thị Thưởng Cao"
                >
                    <AppIcon name="trophy" size="xs" />
                    <span>Top</span>
                    <span className={isMobile ? 'hidden min-[420px]:inline' : 'inline'}> thưởng</span>
                </Button>
            </div>

            {/* CỤM Ô NHẬP MÃ KHO (KHI Ở TAB TRA CỨU) */}
            {activeSubTab === 'search' && (
                <>
                    <div className={`flex items-center rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs shrink-0 ${isMobile ? 'h-7' : ''}`}>
                        <input
                            type="text"
                            placeholder="Kho 1"
                            className={`${isMobile ? 'w-11 sm:w-14 h-full px-1 text-[11px]' : 'w-20 px-2.5 py-1 text-xs'} font-bold text-center text-slate-800 dark:text-slate-100 bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-colors`}
                            value={codes.code1}
                            onChange={(e) => handleCodeChange('code1', e.target.value)}
                        />
                        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 shrink-0" />
                        <input
                            type="text"
                            placeholder="Kho 2"
                            className={`${isMobile ? 'w-11 sm:w-14 h-full px-1 text-[11px]' : 'w-20 px-2.5 py-1 text-xs'} font-bold text-center text-slate-800 dark:text-slate-100 bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-colors`}
                            value={codes.code2}
                            onChange={(e) => handleCodeChange('code2', e.target.value)}
                        />
                    </div>
                    <div className={`flex items-center gap-1 shrink-0 ${isMobile ? '' : 'rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => {
                                setCodes(prev => ({ ...prev, code2: '' }));
                                iframeRef.current?.contentWindow?.postMessage({ type: 'CHECK_THUONG_SEARCH', code1: codes.code1, code2: '' }, window.location.origin);
                            }}
                            className={`${isMobile ? 'w-7 h-7 rounded-full border border-rose-200/60 dark:border-rose-800/60 shadow-xs' : 'p-1.5'} flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 transition-colors`}
                            title="Xoá mã kho đang so sánh"
                        >
                            <AppIcon name="reset" size="xs" />
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleChangeFile}
                            className={`${isMobile ? 'w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs' : 'p-1.5 border-l border-slate-100 dark:border-slate-700'} flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors`}
                            title="Tải file khác"
                        >
                            <AppIcon name="upload" size="xs" />
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleManualCloudSync}
                            disabled={isSyncingCloud}
                            className={`${isMobile ? 'w-7 h-7 rounded-full border border-sky-200/70 dark:border-sky-800/70 shadow-xs' : 'p-1.5 border-l border-slate-100 dark:border-slate-700'} flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 transition-colors ${isSyncingCloud ? 'opacity-70' : ''}`}
                            title="Đồng bộ dữ liệu từ Đám Mây (từ điện thoại / máy khác)"
                        >
                            <AppIcon name={isSyncingCloud ? 'refresh' : 'cloudDownload'} size="xs" className={isSyncingCloud ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </>
            )}

            {/* KHI Ở TAB TOP THƯỞNG: NÚT ĐỔI FILE & ĐỒNG BỘ CLOUD */}
            {activeSubTab === 'leaderboard' && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleChangeFile}
                        className={`${isMobile ? 'h-7 px-2 text-[11px] rounded-full border border-slate-200 dark:border-slate-700 shadow-xs' : 'px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 shadow-sm'} flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors font-bold`}
                        title="Tải file khác"
                    >
                        <AppIcon name="upload" size="xs" />
                        <span>Đổi file</span>
                    </Button>
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleManualCloudSync}
                        disabled={isSyncingCloud}
                        className={`${isMobile ? 'h-7 px-2 text-[11px] rounded-full border border-sky-200/70 dark:border-sky-800/70 shadow-xs' : 'px-2.5 py-1 text-xs rounded-full border border-sky-200 dark:border-sky-800 shadow-sm'} flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 transition-colors font-bold ${isSyncingCloud ? 'opacity-70' : ''}`}
                        title="Đồng bộ dữ liệu từ Đám Mây (từ điện thoại / máy khác)"
                    >
                        <AppIcon name={isSyncingCloud ? 'refresh' : 'cloudDownload'} size="xs" className={isSyncingCloud ? 'animate-spin' : ''} />
                        <span>Đồng bộ Cloud</span>
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
            {/* Mobile: portal thanh công cụ nhỏ gọn trực tiếp lên thanh Bar trên cùng (#mobile-topbar-actions) */}
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('mobile-topbar-actions') && createPortal(
                renderSearchBar(true),
                document.getElementById('mobile-topbar-actions')!
            )}

            {/* TAB 1: GIAO DIỆN TRA CỨU & SO SÁNH (IFRAME) */}
            <div className={`w-full h-full flex-grow relative ${activeSubTab === 'search' ? 'flex flex-col' : 'hidden'}`}>
                {!isIframeLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
                        <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-sky-500 rounded-full animate-spin" />
                        <span className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Đang tải bảng tra cứu thưởng...</span>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={`${import.meta.env?.BASE_URL || '/'}check-thuong.html`}
                    title="Bảng Tra Cứu Thưởng Thi Đua"
                    className={`w-full h-full border-none flex-grow transition-opacity duration-200 ${isIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
                />
            </div>

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