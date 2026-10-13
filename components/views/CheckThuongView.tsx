import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { toast } from '../shared/ui/toast';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { saveSettingOrThrow, saveSettingFromCloud } from '../../services/dbService';
import { Button } from '../shared/ui/Button';
import { getUnifiedCheckThuongData } from '../../services/checkThuongIframeService';
import { CheckThuongLeaderboardView, CheckThuongSearchView } from '../../features/check-thuong';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { assembleChunkedHeavyValue, restoreNestedArraysFromFirestore } from '../../services/firestoreService';
import { extractCloudTimeMs } from '../../services/heavySyncPolicy';

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
        } catch (err: any) {
            console.error('[CheckThuong] Lỗi đồng bộ thủ công:', err);
            toast.error(`Đồng bộ thất bại: ${err?.message || 'Lỗi mạng hoặc kết nối'}`, { id: toastId, duration: 5000 });
        } finally {
            setIsSyncingCloud(false);
        }
    }, [user, isDemoMode]);

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

    const renderSearchBar = (isMobile: boolean) => (
        // data-thay-tieu-de (iPhone): cả thanh công cụ nằm trên thanh trên → khung app ẩn chữ tiêu đề dưới 540px (styles.css)
        <div data-thay-tieu-de={isMobile ? '' : undefined} className={`flex items-center ${isMobile ? 'gap-1 shrink-0' : 'hidden lg:flex gap-2 bg-white/60 dark:bg-slate-900/60 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300'}`}>
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
                    onClick={() => setActiveSubTab('leaderboard')}
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
                            className={`${isMobile ? 'w-11 sm:w-14 h-full px-1 text-[13px]' : 'w-20 px-2.5 py-1 text-xs'} font-bold text-center text-slate-800 dark:text-slate-100 bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-colors`}
                            value={codes.code1}
                            onChange={(e) => handleCodeChange('code1', e.target.value)}
                        />
                        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 shrink-0" />
                        <input
                            type="text"
                            placeholder="Kho 2"
                            className={`${isMobile ? 'w-11 sm:w-14 h-full px-1 text-[13px]' : 'w-20 px-2.5 py-1 text-xs'} font-bold text-center text-slate-800 dark:text-slate-100 bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-colors`}
                            value={codes.code2}
                            onChange={(e) => handleCodeChange('code2', e.target.value)}
                        />
                    </div>
                    <div className={`flex items-center gap-1 shrink-0 ${isMobile ? '' : 'rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                        {codes.code2 && (
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => handleCodeChange('code2', '')}
                                className={`${isMobile ? 'w-7 h-7 rounded-full border border-rose-200/60 dark:border-rose-800/60 shadow-xs' : 'p-1.5'} flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 transition-colors`}
                                title="Xoá mã kho đang so sánh"
                            >
                                <AppIcon name="reset" size="xs" />
                            </Button>
                        )}
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => fileInputHiddenRef.current?.click()}
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
                        onClick={() => fileInputHiddenRef.current?.click()}
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

            {/* Portal timestamp into mobile top bar subtitle */}
            {mounted && activeTab === 'check-thuong' && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <button
                    type="button"
                    onClick={handleManualCloudSync}
                    title="Chạm để kiểm tra & đồng bộ dữ liệu Check Thưởng mới nhất từ Đám Mây"
                    className="inline-flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all text-left group cursor-pointer max-w-full truncate"
                >
                    <AppIcon name="refresh" size="xs" spin={isSyncingCloud} className="text-sky-500 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
                    <span className={`truncate ${isSyncingCloud ? 'text-sky-600 dark:text-sky-400 font-semibold animate-pulse' : ''}`}>
                        {isSyncingCloud ? 'Đang đồng bộ...' : (formattedUploadTime ? `Cập nhật: ${formattedUploadTime}` : 'Cập nhật dữ liệu')}
                    </span>
                </button>,
                document.getElementById('mobile-topbar-subtitle')!
            )}

            {/* Portal timestamp into desktop header subtitle */}
            {mounted && activeTab === 'check-thuong' && document.getElementById('desktop-header-subtitle') && createPortal(
                <button
                    type="button"
                    onClick={handleManualCloudSync}
                    title="Bấm để kiểm tra & đồng bộ dữ liệu Check Thưởng mới nhất từ Đám Mây"
                    className="inline-flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all text-left group cursor-pointer"
                >
                    <AppIcon name="refresh" size="xs" spin={isSyncingCloud} className="text-sky-500 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
                    <span className={isSyncingCloud ? 'text-sky-600 dark:text-sky-400 font-semibold animate-pulse' : ''}>
                        {isSyncingCloud ? 'Đang đồng bộ từ Cloud...' : (formattedUploadTime ? `Cập nhật: ${formattedUploadTime}` : 'Đồng bộ đám mây')}
                    </span>
                </button>,
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