import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { toast } from '../shared/ui/toast';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { saveSettingOrThrow, saveSettingFromCloud } from '../../services/dbService';
import { Button } from '../shared/ui/Button';
import { TopBarActions } from '../shared/ui/TopBarActions';
import { usePageActions } from '../shared/ui/PageActions';
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

    // Trên mobile: nút thao tác [Tải file khác] được đưa vào viên nhộng capsule cùng nút Chuông (đồng bộ đám mây đã có ở nút giờ cập nhật)
    usePageActions(mounted && activeTab === 'check-thuong' && hasData ? {
        scope: 'mobile',
        title: 'Check thưởng',
        quick: [
            {
                id: 'tai-file',
                label: 'Tải file khác',
                icon: 'upload',
                onSelect: () => fileInputHiddenRef.current?.click(),
            }
        ]
    } : null);

    const renderDesktopBar = () => (
        <TopBarActions enabled={activeTab === 'check-thuong' && hasData}>
            {/* CỤM VIÊN NHỘNG CHUẨN 100% THEO HÌNH 2 (REPORT BI): TRA CỨU / TOP THƯỞNG / MÃ KHO */}
            <TopBarActions.Group>
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('search')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-base font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none ${
                        activeSubTab === 'search'
                            ? 'bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                    }`}
                    title="Tra cứu & So sánh siêu thị"
                    aria-label="Tra cứu"
                >
                    <AppIcon name="search" size="md" />
                    <span>Tra cứu</span>
                </Button>

                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('leaderboard')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-base font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none border-l border-slate-100 dark:border-slate-700 ${
                        activeSubTab === 'leaderboard'
                            ? 'bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                    }`}
                    title="Xem Bảng Xếp Hạng TOP Siêu Thị Thưởng Cao"
                    aria-label="Top thưởng"
                >
                    <AppIcon name="trophy" size="md" />
                    <span>Top thưởng</span>
                </Button>

                {/* CỤM Ô NHẬP MÃ KHO (KHI Ở TAB TRA CỨU) — Nối liền trong cùng 1 viên thuốc chuẩn */}
                {activeSubTab === 'search' && (
                    <>
                        <div className="border-l border-slate-100 dark:border-slate-700 flex items-center h-full">
                            <input
                                type="text"
                                placeholder="Kho 1"
                                className="w-20 px-3 py-2 text-base font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent focus:bg-slate-50 dark:focus:bg-slate-700/50 focus:outline-none transition-colors"
                                value={codes.code1}
                                onChange={(e) => handleCodeChange('code1', e.target.value)}
                            />
                        </div>
                        <TopBarActions.Divider className="h-4" />
                        <div className="relative flex items-center h-full">
                            <input
                                type="text"
                                placeholder="Kho 2"
                                className="w-20 px-3 py-2 text-base font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent focus:bg-slate-50 dark:focus:bg-slate-700/50 focus:outline-none transition-colors"
                                value={codes.code2}
                                onChange={(e) => handleCodeChange('code2', e.target.value)}
                            />
                            {codes.code2 && (
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    type="button"
                                    onClick={() => handleCodeChange('code2', '')}
                                    className="absolute right-1 text-slate-400 hover:text-rose-500 p-1"
                                    title="Xoá kho 2"
                                >
                                    <AppIcon name="close" size="xs" />
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </TopBarActions.Group>

            {/* CỤM NÚT THAO TÁC FILE & ĐỒNG BỘ CLOUD (ĐỒNG BỘ ĐỘ CAO 40PX CHUẨN) */}
            {activeSubTab === 'search' && (
                <TopBarActions.Group>
                    <TopBarActions.Button
                        onClick={() => fileInputHiddenRef.current?.click()}
                        icon="upload"
                        iconSize="md"
                        className="w-10 h-10 flex items-center justify-center"
                        title="Tải file khác"
                    />
                    <TopBarActions.Button
                        onClick={handleManualCloudSync}
                        disabled={isSyncingCloud}
                        icon={isSyncingCloud ? 'refresh' : 'cloudDownload'}
                        iconSize="md"
                        spin={isSyncingCloud}
                        borderLeft
                        className="w-10 h-10 flex items-center justify-center"
                        title="Đồng bộ dữ liệu từ Đám Mây (từ điện thoại / máy khác)"
                    />
                </TopBarActions.Group>
            )}

            {/* KHI Ở TAB TOP THƯỞNG TRÊN LAPTOP */}
            {activeSubTab === 'leaderboard' && (
                <TopBarActions.Group>
                    <TopBarActions.Button
                        onClick={() => fileInputHiddenRef.current?.click()}
                        icon="upload"
                        iconSize="md"
                        label="Đổi file"
                        title="Tải file khác"
                    />
                    <TopBarActions.Button
                        onClick={handleManualCloudSync}
                        disabled={isSyncingCloud}
                        icon={isSyncingCloud ? 'refresh' : 'cloudDownload'}
                        iconSize="md"
                        spin={isSyncingCloud}
                        label="Đồng bộ Cloud"
                        borderLeft
                        variant="sky"
                        title="Đồng bộ dữ liệu từ Đám Mây (từ điện thoại / máy khác)"
                    />
                </TopBarActions.Group>
            )}
        </TopBarActions>
    );

    const renderMobileSearchBar = () => (
        <div data-thay-tieu-de="" className="flex items-center gap-1 shrink-0 ml-auto justify-end">
            {/* CỤM NÚT CHUYỂN TAB: TRA CỨU / TOP THƯỞNG — Đồng bộ kích thước capsule 34px / nút 32px chuẩn Zalo/iOS */}
            <div className="flex items-center h-[34px] min-h-[34px] p-0.5 shadow-2xs rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('search')}
                    className={`flex items-center justify-center gap-1 w-8 h-8 min-w-[32px] min-h-[32px] p-0 text-xs ycx-hit rounded-full font-bold transition-all ${
                        activeSubTab === 'search'
                            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                    title="Tra cứu & So sánh siêu thị"
                    aria-label="Tra cứu"
                >
                    <AppIcon name="search" size="sm" />
                    <span className="hidden min-[520px]:inline">Tra cứu</span>
                </Button>

                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setActiveSubTab('leaderboard')}
                    className={`flex items-center justify-center gap-1 h-8 px-2 text-xs ycx-hit rounded-full font-bold transition-all ${
                        activeSubTab === 'leaderboard'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300 text-slate-950 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                    title="Xem Bảng Xếp Hạng TOP Siêu Thị Thưởng Cao"
                    aria-label="Top thưởng"
                >
                    <AppIcon name="trophy" size="sm" />
                    <span>Top</span>
                    <span className="hidden min-[520px]:inline"> thưởng</span>
                </Button>
            </div>

            {/* CỤM Ô NHẬP MÃ KHO (KHI Ở TAB TRA CỨU) */}
            {activeSubTab === 'search' && (
                <div className="flex items-center rounded-full overflow-hidden h-[34px] min-h-[34px] p-0.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs shrink-0">
                    <input
                        type="text"
                        placeholder="Kho 1"
                        className="w-10 min-[400px]:w-11 min-[430px]:w-13 sm:w-20 h-8 px-0.5 text-[13px] rounded-full font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent focus:bg-slate-50 dark:focus:bg-slate-700 focus:shadow-xs focus:outline-none transition-colors"
                        value={codes.code1}
                        onChange={(e) => handleCodeChange('code1', e.target.value)}
                    />
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            placeholder="Kho 2"
                            className={`${codes.code2 ? 'w-12 pr-5 pl-0.5 text-[13px]' : 'w-10 min-[400px]:w-11 min-[430px]:w-13 sm:w-20 px-0.5 text-[13px]'} h-8 font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent focus:bg-slate-50 dark:focus:bg-slate-700 focus:shadow-xs focus:outline-none transition-colors rounded-full`}
                            value={codes.code2}
                            onChange={(e) => handleCodeChange('code2', e.target.value)}
                        />
                        {codes.code2 && (
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
                </div>,
                document.getElementById('desktop-header-subtitle')!
            )}

            {/* Desktop header toolbar via TopBarActions (tự động portal) */}
            {renderDesktopBar()}

            {/* Portal search bar into mobile top bar */}
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('mobile-topbar-actions') && createPortal(
                renderMobileSearchBar(),
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