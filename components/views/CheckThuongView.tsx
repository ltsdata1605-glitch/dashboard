import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { toast } from '../shared/ui/toast';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { saveSettingOrThrow, saveSettingFromCloud } from '../../services/dbService';
import { Button } from '../shared/ui/Button';
import { usePageActions } from '../shared/ui/PageActions';
import { getUnifiedCheckThuongData } from '../../services/checkThuongIframeService';
import { CheckThuongLeaderboardView, CheckThuongSearchView } from '../../features/check-thuong';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { assembleChunkedHeavyValue, restoreNestedArraysFromFirestore } from '../../services/firestoreService';
import { extractCloudTimeMs } from '../../services/heavySyncPolicy';
import { useSystemTraffic } from '../../hooks/useSystemTraffic';

export const CheckThuongView: React.FC = () => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [codes, setCodes] = useState({ code1: '910', code2: '' });
    const [activeSubTab, setActiveSubTab] = useState<'search' | 'leaderboard'>('search');
    const [competitionData, setCompetitionData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [uploadTime, setUploadTime] = useState<string>('');
    const { user, isDemoMode } = useAuth();
    const [isSyncingCloud, setIsSyncingCloud] = useState(false);
    const { totalVisits, onlineUsers } = useSystemTraffic();
    const [cloudFeedback, setCloudFeedback] = useState<{
        message: string;
        mobileMessage: string;
        status: 'success' | 'updated' | 'error';
    } | null>(null);
    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputHiddenRef = useRef<HTMLInputElement>(null);

    // Định dạng ngày giờ cập nhật chuẩn hh:mm:ss dd/MM/yyyy
    const formattedUploadTime = React.useMemo(() => {
        if (!uploadTime) return '';
        try {
            const d = new Date(uploadTime);
            if (!isNaN(d.getTime())) {
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const seconds = String(d.getSeconds()).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
            }
        } catch {}
        return String(uploadTime).replace(' - ', ' ');
    }, [uploadTime]);

    // Định dạng giờ phút giây ngắn gọn cho thanh điều hướng mobile (chuẩn như tab Phân tích)
    const shortUploadTime = React.useMemo(() => {
        if (!uploadTime) return '';
        try {
            const d = new Date(uploadTime);
            if (!isNaN(d.getTime())) {
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const seconds = String(d.getSeconds()).padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            }
        } catch {}
        if (typeof uploadTime === 'string') {
            const match = uploadTime.match(/\b\d{2}:\d{2}:\d{2}\b/);
            if (match) return match[0];
            if (uploadTime.length >= 8) return uploadTime.slice(0, 8);
        }
        return '';
    }, [uploadTime]);

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

        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
        }
        setCloudFeedback(null);
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

            setHasData(true);
            setCompetitionData(val.competitionData);
            if (val.fileName) setFileName(val.fileName);
            if (val.uploadTime) {
                setUploadTime(val.uploadTime);
            } else if (val.lastModified) {
                setUploadTime(new Date(val.lastModified).toISOString());
            } else {
                setUploadTime(new Date(cloudTime).toISOString());
            }
            if (val.code1) setCodes(prev => ({ ...prev, code1: val.code1 }));
            if (val.code2) setCodes(prev => ({ ...prev, code2: val.code2 }));

            const timeStr = val.uploadTime ? new Date(val.uploadTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(val.uploadTime).toLocaleDateString('vi-VN') : '';
            toast.success(`Đã đồng bộ thành công dữ liệu Check Thưởng từ Đám Mây${timeStr ? ` (${timeStr})` : ''}!`, { id: toastId, duration: 4000 });
            setCloudFeedback({
                message: 'Đã đồng bộ mới nhất!',
                mobileMessage: 'Đã đồng bộ',
                status: 'success'
            });
            feedbackTimerRef.current = setTimeout(() => {
                setCloudFeedback(null);
                feedbackTimerRef.current = null;
            }, 3500);
        } catch (err: any) {
            console.error('[CheckThuong] Lỗi đồng bộ thủ công:', err);
            toast.error(`Đồng bộ thất bại: ${err?.message || 'Lỗi mạng hoặc kết nối'}`, { id: toastId, duration: 5000 });
            setCloudFeedback({
                message: 'Lỗi đồng bộ!',
                mobileMessage: 'Lỗi mạng',
                status: 'error'
            });
            feedbackTimerRef.current = setTimeout(() => {
                setCloudFeedback(null);
                feedbackTimerRef.current = null;
            }, 3500);
        } finally {
            setIsSyncingCloud(false);
        }
    }, [user, isDemoMode]);

    useEffect(() => {
        return () => {
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    useEffect(() => {
        setMounted(true);

        // Nạp trước dữ liệu đã lưu từ IndexedDB hợp nhất
        getUnifiedCheckThuongData().then((saved) => {
            if (saved && saved.competitionData && saved.competitionData.length > 0) {
                setHasData(true);
                setCompetitionData(saved.competitionData);
                if (saved.fileName) setFileName(saved.fileName);
                if (saved.uploadTime) {
                    setUploadTime(saved.uploadTime);
                } else if (saved.lastModified) {
                    setUploadTime(new Date(saved.lastModified).toISOString());
                }
                if (saved.code1) setCodes(prev => ({ ...prev, code1: saved.code1 }));
                if (saved.code2) setCodes(prev => ({ ...prev, code2: saved.code2 }));
            }
        });

        // Tự động lắng nghe cập nhật Cloud
        const handleCloudSync = (e?: any) => {
            const payload = e?.detail?.payload;
            if (payload && payload.competitionData && payload.competitionData.length > 0) {
                setHasData(true);
                setCompetitionData(payload.competitionData);
                if (payload.fileName) setFileName(payload.fileName);
                if (payload.uploadTime) setUploadTime(payload.uploadTime);
                if (payload.code1) setCodes(prev => ({ ...prev, code1: payload.code1 }));
                if (payload.code2) setCodes(prev => ({ ...prev, code2: payload.code2 }));
            } else {
                getUnifiedCheckThuongData().then((saved) => {
                    if (saved && saved.competitionData && saved.competitionData.length > 0) {
                        setHasData(true);
                        setCompetitionData(saved.competitionData);
                        if (saved.fileName) setFileName(saved.fileName);
                        if (saved.uploadTime) setUploadTime(saved.uploadTime);
                        if (saved.code1) setCodes(prev => ({ ...prev, code1: saved.code1 }));
                        if (saved.code2) setCodes(prev => ({ ...prev, code2: saved.code2 }));
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

        window.addEventListener('check-thuong-cloud-update-available', handleCloudUpdateAvailable);
        window.addEventListener('check-thuong-cloud-sync', handleCloudSync);

        return () => {
            window.removeEventListener('check-thuong-cloud-sync', handleCloudSync);
            window.removeEventListener('check-thuong-cloud-update-available', handleCloudUpdateAvailable);
        };
    }, []);

    const handleFileLoaded = useCallback((res: {
        competitionData: any[][];
        fileName: string;
        uploadTime: string;
        lastModified: number;
    }) => {
        setHasData(true);
        setCompetitionData(res.competitionData);
        setFileName(res.fileName);
        setUploadTime(res.uploadTime);

        const filePayload = {
            schemaVersion: 1,
            source: 'check-thuong',
            competitionData: res.competitionData,
            fileName: res.fileName,
            uploadTime: res.uploadTime,
            code1: codes.code1 || '910',
            code2: codes.code2 || '',
            lastModified: res.lastModified
        };

        saveSettingOrThrow('checkthuong_data', filePayload).catch(err => {
            console.error('[CheckThuong] Lưu dữ liệu thất bại:', err);
        });
    }, [codes]);

    const handleCodeChange = (field: 'code1' | 'code2', value: string) => {
        setCodes(prev => {
            const newCodes = { ...prev, [field]: value };
            if (hasData && competitionData.length > 0) {
                saveSettingOrThrow('checkthuong_data', {
                    schemaVersion: 1,
                    source: 'check-thuong',
                    competitionData,
                    fileName,
                    uploadTime,
                    code1: newCodes.code1,
                    code2: newCodes.code2,
                    lastModified: Date.now()
                }).catch(err => {
                    console.error('[CheckThuong] Lưu mã kho thất bại:', err);
                });
            }
            return newCodes;
        });
    };

    const handleSelectStoreFromLeaderboard = (storeCode: string) => {
        setCodes({ code1: storeCode, code2: '' });
        setActiveSubTab('search');
    };

    // Trên mobile: các nút thao tác [Tải file khác] [Đồng bộ Cloud] được đưa vào viên nhộng capsule cùng nút Chuông
    usePageActions(mounted && activeTab === 'check-thuong' && hasData ? {
        scope: 'mobile',
        title: 'Check thưởng',
        quick: [
            {
                id: 'tai-file',
                label: 'Tải file khác',
                icon: 'upload',
                onSelect: () => fileInputHiddenRef.current?.click(),
            },
            {
                id: 'dong-bo-cloud',
                label: 'Đồng bộ dữ liệu từ Đám Mây (từ điện thoại / máy khác)',
                icon: isSyncingCloud ? 'refresh' : 'cloudDownload',
                onSelect: handleManualCloudSync,
                disabled: isSyncingCloud,
            }
        ]
    } : null);

    const renderSearchBar = (isMobile: boolean) => (
        // data-thay-tieu-de (iPhone): cả thanh công cụ nằm trên thanh trên → khung app ẩn chữ tiêu đề dưới 540px (styles.css)
        <div data-thay-tieu-de={isMobile ? '' : undefined} className={`flex items-center ${isMobile ? 'gap-1 shrink-0 ml-auto justify-end' : 'hidden lg:flex gap-2 bg-white/60 dark:bg-slate-900/60 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300'}`}>
            {/* CỤM NÚT CHUYỂN TAB: TRA CỨU / TOP THƯỞNG — Đồng bộ kích thước capsule 34px / nút 32px chuẩn Zalo/iOS */}
            <div className={`flex items-center ${isMobile ? 'h-[34px] min-h-[34px] p-0.5 shadow-2xs' : 'p-0.5 shadow-xs'} rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shrink-0`}>
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('search')}
                    className={`flex items-center justify-center gap-1 ${isMobile ? 'w-8 h-8 min-w-[32px] min-h-[32px] p-0 text-xs ycx-hit' : 'px-2.5 py-1 text-xs'} rounded-full font-bold transition-all ${
                        activeSubTab === 'search'
                            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Tra cứu & So sánh siêu thị"
                    aria-label="Tra cứu"
                >
                    <AppIcon name="search" size={isMobile ? 'sm' : 'xs'} />
                    <span className={isMobile ? 'hidden min-[520px]:inline' : 'inline'}>Tra cứu</span>
                </Button>

                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('leaderboard')}
                    className={`flex items-center justify-center gap-1 ${isMobile ? 'h-8 px-2 text-xs ycx-hit' : 'px-2.5 py-1 text-xs'} rounded-full font-bold transition-all ${
                        activeSubTab === 'leaderboard'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300 text-slate-950 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Xem Bảng Xếp Hạng TOP Siêu Thị Thưởng Cao"
                    aria-label="Top thưởng"
                >
                    <AppIcon name="trophy" size={isMobile ? 'sm' : 'xs'} />
                    <span className={isMobile ? 'inline' : 'inline'}>Top</span>
                    <span className={isMobile ? 'hidden min-[520px]:inline' : 'inline'}> thưởng</span>
                </Button>
            </div>

            {/* CỤM Ô NHẬP MÃ KHO (KHI Ở TAB TRA CỨU) — Đồng bộ kích thước capsule 34px / ô nhập 32px chuẩn Zalo/iOS */}
            {activeSubTab === 'search' && (
                <>
                    <div className={`flex items-center rounded-full overflow-hidden bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs shrink-0 ${isMobile ? 'h-[34px] min-h-[34px] p-0.5' : ''}`}>
                        <input
                            type="text"
                            placeholder="Kho 1"
                            className={`${isMobile ? 'w-10 min-[400px]:w-11 min-[430px]:w-13 sm:w-20 h-8 px-0.5 text-[13px] rounded-full' : 'w-20 px-2.5 py-1 text-xs'} font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:shadow-xs focus:outline-none transition-colors`}
                            value={codes.code1}
                            onChange={(e) => handleCodeChange('code1', e.target.value)}
                        />
                        <div className={`w-px ${isMobile ? 'h-4' : 'h-3.5'} bg-slate-300/80 dark:bg-slate-600/80 shrink-0 mx-0.5`} />
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="Kho 2"
                                className={`${isMobile ? (codes.code2 ? 'w-12 pr-5 pl-0.5 text-[13px]' : 'w-10 min-[400px]:w-11 min-[430px]:w-13 sm:w-20 px-0.5 text-[13px]') : 'w-20 px-2.5 py-1 text-xs'} h-8 font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:shadow-xs focus:outline-none transition-colors rounded-full`}
                                value={codes.code2}
                                onChange={(e) => handleCodeChange('code2', e.target.value)}
                            />
                            {isMobile && codes.code2 && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => handleCodeChange('code2', '')}
                                    className="absolute right-0.5 w-5 h-5 rounded-full text-rose-500 hover:text-rose-600 active:scale-95 flex items-center justify-center ycx-hit"
                                    title="Xoá mã kho đang so sánh"
                                    aria-label="Xoá mã kho đang so sánh"
                                >
                                    <AppIcon name="reset" size="xs" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* Trên desktop: hiển thị nút xoá so sánh, tải file, đồng bộ cloud */}
                    {!isMobile && (
                        <div className="flex items-center gap-1 shrink-0 rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                            {codes.code2 && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => handleCodeChange('code2', '')}
                                    className="p-1.5 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 transition-colors"
                                    title="Xoá mã kho đang so sánh"
                                >
                                    <AppIcon name="reset" size="xs" />
                                </Button>
                            )}
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => fileInputHiddenRef.current?.click()}
                                className="p-1.5 border-l border-slate-100 dark:border-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                                title="Tải file khác"
                            >
                                <AppIcon name="upload" size="xs" />
                            </Button>
                            <Button
                                variant="unstyled" size="none"
                                onClick={handleManualCloudSync}
                                disabled={isSyncingCloud}
                                className={`p-1.5 border-l border-slate-100 dark:border-slate-700 flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 transition-colors ${isSyncingCloud ? 'opacity-70' : ''}`}
                                title="Đồng bộ dữ liệu từ Đám Mây (từ điện thoại / máy khác)"
                            >
                                <AppIcon name={isSyncingCloud ? 'refresh' : 'cloudDownload'} size="xs" className={isSyncingCloud ? 'animate-spin' : ''} />
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* KHI Ở TAB TOP THƯỞNG TRÊN LAPTOP: NÚT ĐỔI FILE & ĐỒNG BỘ CLOUD (MOBILE ĐÃ CÓ CON NHỘNG) */}
            {activeSubTab === 'leaderboard' && !isMobile && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => fileInputHiddenRef.current?.click()}
                        className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors font-bold"
                        title="Tải file khác"
                    >
                        <AppIcon name="upload" size="xs" />
                        <span>Đổi file</span>
                    </Button>
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleManualCloudSync}
                        disabled={isSyncingCloud}
                        className={`px-2.5 py-1 text-xs rounded-full border border-sky-200 dark:border-sky-800 shadow-sm flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 transition-colors font-bold ${isSyncingCloud ? 'opacity-70' : ''}`}
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
        <div className="w-full flex-1 flex flex-col bg-white dark:bg-slate-900 min-h-0">
            {/* Input file ẩn cho nút "Đổi file / Tải file" trên toolbar */}
            <input
                ref={fileInputHiddenRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                        const { parseCheckThuongFile } = await import('../../features/check-thuong');
                        const res = await parseCheckThuongFile(file);
                        handleFileLoaded(res);
                        toast.success(`Đã nạp file: ${file.name}`);
                    } catch (err: any) {
                        toast.error(`Lỗi nạp file: ${err?.message || 'Không thể đọc file'}`);
                    }
                }}
            />

            {/* Portal timestamp & traffic stats into mobile top bar subtitle (Chuẩn như tab Phân tích) */}
            {mounted && activeTab === 'check-thuong' && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleManualCloudSync}
                        title="Chạm để kiểm tra & đồng bộ dữ liệu Check Thưởng mới nhất từ Đám Mây"
                        className={`inline-flex items-center gap-1 text-left shrink-0 cursor-pointer transition-all duration-200 active:scale-95 ${
                            cloudFeedback
                                ? (cloudFeedback.status === 'error'
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-emerald-600 dark:text-emerald-400 font-semibold')
                                : isSyncingCloud
                                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                    : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {cloudFeedback ? (
                            <AppIcon
                                name={cloudFeedback.status === 'error' ? 'error' : 'success'}
                                size="xs"
                                className={cloudFeedback.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}
                            />
                        ) : (
                            <AppIcon
                                name="refresh"
                                size="xs"
                                spin={isSyncingCloud}
                                className="text-sky-500 group-hover:rotate-180 transition-transform duration-300"
                            />
                        )}
                        <span className={isSyncingCloud ? 'animate-pulse' : ''}>
                            {cloudFeedback
                                ? cloudFeedback.mobileMessage
                                : isSyncingCloud
                                    ? 'Đang kiểm tra...'
                                    : (shortUploadTime || (formattedUploadTime ? formattedUploadTime.slice(0, 8) : 'Chưa có'))}
                        </span>
                    </Button>
                </div>,
                document.getElementById('mobile-topbar-subtitle')!
            )}

            {/* Portal timestamp & traffic stats into desktop header subtitle (Chuẩn như tab Phân tích) */}
            {mounted && activeTab === 'check-thuong' && document.getElementById('desktop-header-subtitle') && createPortal(
                <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleManualCloudSync}
                        title="Bấm để kiểm tra & đồng bộ dữ liệu Check Thưởng mới nhất từ Đám Mây"
                        className={`inline-flex items-center gap-1.5 text-left group cursor-pointer transition-all duration-200 active:scale-95 ${
                            cloudFeedback
                                ? (cloudFeedback.status === 'error'
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-emerald-600 dark:text-emerald-400 font-semibold')
                                : isSyncingCloud
                                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                    : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {cloudFeedback ? (
                            <AppIcon
                                name={cloudFeedback.status === 'error' ? 'error' : 'success'}
                                size="xs"
                                className={cloudFeedback.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}
                            />
                        ) : (
                            <AppIcon
                                name="refresh"
                                size="xs"
                                spin={isSyncingCloud}
                                className="text-sky-500 group-hover:rotate-180 transition-transform duration-300"
                            />
                        )}
                        <span className={isSyncingCloud ? 'animate-pulse' : ''}>
                            {cloudFeedback
                                ? cloudFeedback.message
                                : isSyncingCloud
                                    ? 'Đang kiểm tra...'
                                    : (formattedUploadTime ? `Cập nhật: ${formattedUploadTime}` : 'Đồng bộ đám mây')}
                        </span>
                    </Button>
                    {totalVisits !== undefined && (
                        <>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <AppIcon name="users" size="xs" className="text-sky-500/80" />
                                <span>{totalVisits >= 1000 ? `${(totalVisits / 1000).toFixed(1)}k` : totalVisits} lượt truy cập</span>
                            </span>
                        </>
                    )}
                    {onlineUsers !== undefined && (
                        <>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>{onlineUsers} đang online</span>
                            </span>
                        </>
                    )}
                </div>,
                document.getElementById('desktop-header-subtitle')!
            )}

            {/* Portal search bar into desktop header */}
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('global-header-actions') && createPortal(
                renderSearchBar(false),
                document.getElementById('global-header-actions')!
            )}

            {/* Portal search bar into mobile top bar */}
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('mobile-topbar-actions') && createPortal(
                renderSearchBar(true),
                document.getElementById('mobile-topbar-actions')!
            )}

            {/* TAB 1: GIAO DIỆN TRA CỨU & SO SÁNH (NATIVE REACT - NO IFRAME) */}
            {activeSubTab === 'search' && (
                <CheckThuongSearchView
                    competitionData={competitionData}
                    code1={codes.code1}
                    code2={codes.code2}
                    formattedUploadTime={formattedUploadTime}
                    onFileLoaded={handleFileLoaded}
                    onManualCloudSync={handleManualCloudSync}
                    isSyncingCloud={isSyncingCloud}
                />
            )}

            {/* TAB 2: GIAO DIỆN BẢNG XẾP HẠNG TOP SIÊU THỊ THƯỞNG CAO */}
            {activeSubTab === 'leaderboard' && (
                <div className="w-full flex-grow">
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