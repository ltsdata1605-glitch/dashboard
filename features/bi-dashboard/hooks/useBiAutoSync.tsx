import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '../../../components/shared/ui/toast';
import confetti from 'canvas-confetti';
import {
    BiSyncMode,
    BiSyncProgress,
    startBiAutoSyncSession,
    claimPendingAutoSync,
    savePendingAutoSync,
    clearPendingAutoSync,
    PENDING_MAX_RELOADS,
    applyBiSyncResults,
    onBiProgress,
    onBiDone,
    onBiError,
} from '../services/biAutoSyncService';
import { startUserscriptUpdateWatcher } from '../services/userscriptProbeService';
import { BiAutoSyncModal } from '../components/BiAutoSyncModal';
import { LuyKeMonthPickerModal } from '../components/LuyKeMonthPickerModal';

export function useBiAutoSync(activeSupermarket?: string | null) {
    const [autoSyncModalOpen, setAutoSyncModalOpen] = useState(false);
    const [autoSyncMode, setAutoSyncMode] = useState<BiSyncMode>('realtime');
    const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'not-installed' | 'outdated'>('idle');
    const [autoSyncCurrentVersion, setAutoSyncCurrentVersion] = useState<string>('');
    const [autoSyncLatestVersion, setAutoSyncLatestVersion] = useState<string>('');
    const [autoSyncProgress, setAutoSyncProgress] = useState<BiSyncProgress | null>(null);
    const [autoSyncError, setAutoSyncError] = useState<string>('');
    // Mã lượt (jobId) CHÍNH nơi này đã khởi chạy — chỉ nhận kết quả đúng lượt đó (xem onBiDone bên dưới)
    const jobDangChoRef = React.useRef<string | null>(null);
    const workerWindowRef = useRef<Window | null>(null);
    const pendingReloadsRef = useRef(0);

    // Luỹ kế phải chọn tháng trước (giống nút ở mục Cập nhật) — gọi 'luyke' không kèm tháng thì mở bảng chọn tháng
    const [chonThangMo, setChonThangMo] = useState(false);
    const [autoSyncMonth, setAutoSyncMonth] = useState<string>('');

    const handleStartAutoSync = useCallback(async (mode: BiSyncMode, opts: { tuChayTiep?: boolean; month?: string } = {}) => {
        if (mode === 'luyke' && !opts.month && !opts.tuChayTiep) {
            setChonThangMo(true);
            return;
        }
        setAutoSyncMode(mode);
        setAutoSyncMonth(mode === 'luyke' ? (opts.month || '') : '');
        setAutoSyncProgress(null);
        setAutoSyncError('');
        setAutoSyncStatus('running');
        setAutoSyncModalOpen(true);
        if (!opts.tuChayTiep) pendingReloadsRef.current = 0;

        try {
            const { jobId, workerWindow, workerOpened } = await startBiAutoSyncSession(mode, opts);
            jobDangChoRef.current = jobId;
            workerWindowRef.current = workerWindow;
            clearPendingAutoSync();
            if (!workerOpened) {
                toast.info('Bấm "Mở lại tab MWG" để tiếp tục — trình duyệt chặn tự mở tab.', { duration: 6000 });
            }
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg === 'USERSCRIPT_NOT_INSTALLED') {
                clearPendingAutoSync();
                setAutoSyncStatus('not-installed');
            } else if (msg.startsWith('USERSCRIPT_OUTDATED')) {
                setAutoSyncStatus('outdated');
                setAutoSyncCurrentVersion(msg.split(':')[1] || '');
                setAutoSyncLatestVersion(msg.split(':')[2] || '');
                savePendingAutoSync({ mode, ts: Date.now(), reloads: pendingReloadsRef.current, month: opts.month });
            } else {
                clearPendingAutoSync();
                setAutoSyncStatus('error');
                setAutoSyncError(msg || 'Không thể khởi chạy quy trình tự động.');
            }
        }
    }, []);

    // Tự chạy tiếp lượt dở sau khi tải lại trang (nếu người dùng bấm F5 ngoài tab employees)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('tab=employees')) {
            return;
        }
        const p = claimPendingAutoSync();
        if (!p) return;
        pendingReloadsRef.current = p.reloads;
        void handleStartAutoSync(p.mode, { tuChayTiep: true, month: p.month });
    }, [handleStartAutoSync]);

    // Kiểm tra ngầm liên tục khi đang báo cần cập nhật Userscript
    useEffect(() => {
        if (!autoSyncModalOpen || autoSyncStatus !== 'outdated') return;
        const targetVer = autoSyncLatestVersion || '7.22';

        const stopWatcher = startUserscriptUpdateWatcher(targetVer, (installedVer) => {
            clearPendingAutoSync();
            setAutoSyncStatus('running');
            toast.success(`Đã nhận diện Userscript v${installedVer}! Tự động đổ dữ liệu...`, { duration: 4000 });
            void handleStartAutoSync(autoSyncMode, { month: autoSyncMonth, tuChayTiep: true });
        });

        return () => {
            stopWatcher();
        };
    }, [autoSyncModalOpen, autoSyncStatus, autoSyncLatestVersion, autoSyncMode, autoSyncMonth, handleStartAutoSync]);

    useEffect(() => {
        const unsubProgress = onBiProgress((prog) => {
            setAutoSyncProgress(prog);
            setAutoSyncStatus('running');
        });

        const unsubDone = onBiDone(async (payload) => {
            // Chỉ nhận kết quả của ĐÚNG lượt nơi này vừa khởi chạy, và chỉ một lần. Không chặn thì:
            // - mở trang là userscript (≤ 7.11) phát lại kết quả CŨ còn trong bộ nhớ Tampermonkey → pháo giấy + toast
            //   mỗi lần mở trang và GHI ĐÈ dữ liệu cũ lên (chủ dự án gặp 2026-10-01);
            // - trang có nhiều nơi nghe (DataUpdater + nút nổi + nút nhanh) × 2 kênh (event + postMessage) → 4 toast.
            if (!payload.jobId || payload.jobId !== jobDangChoRef.current) return;
            jobDangChoRef.current = null;
            setAutoSyncStatus('success');
            setAutoSyncModalOpen(false);
            try { window.focus(); } catch {}
            const res = await applyBiSyncResults(payload.mode, payload.results, activeSupermarket || null);

            confetti({
                particleCount: 80,
                spread: 80,
                origin: { y: 0.6 }
            });

            const modeLabel = payload.mode === 'realtime' ? 'Realtime' : 'Luỹ kế';
            toast.success(`Tự động cập nhật thành công ${res.successCount} mục dữ liệu ${modeLabel}!`, { duration: 4000 });

            // Tự động mở màn hình tương ứng khi chạy xong
            const { navigateToBiRealtime, navigateToBiLuyKe } = await import('../services/autoNavigationService');
            if (payload.mode === 'realtime') {
                void navigateToBiRealtime();
            } else {
                void navigateToBiLuyKe();
            }
        });

        const unsubError = onBiError((err) => {
            setAutoSyncStatus('error');
            setAutoSyncError(err.message || 'Lỗi quy trình tự động.');
            clearPendingAutoSync();
        });

        return () => {
            unsubProgress();
            unsubDone();
            unsubError();
        };
    }, [activeSupermarket]);

    const renderAutoSyncModal = () => (
        <>
        <LuyKeMonthPickerModal
            isOpen={chonThangMo}
            onClose={() => setChonThangMo(false)}
            onStart={(month) => { void handleStartAutoSync('luyke', { month }); }}
        />
        <BiAutoSyncModal
            month={autoSyncMonth}
            isOpen={autoSyncModalOpen}
            mode={autoSyncMode}
            status={autoSyncStatus}
            progress={autoSyncProgress}
            currentVersion={autoSyncCurrentVersion}
            latestVersion={autoSyncLatestVersion}
            errorMessage={autoSyncError}
            onRetry={() => { void handleStartAutoSync(autoSyncMode, { month: autoSyncMonth }); }}
            onClose={() => { setAutoSyncModalOpen(false); clearPendingAutoSync(); }}
            onCancel={() => {
                setAutoSyncStatus('idle');
                setAutoSyncProgress(null);
            }}
            onReopenWorker={() => {
                try {
                    const extra = autoSyncMode === 'luyke' && autoSyncMonth ? `&ycx_month=${autoSyncMonth}` : '';
                    const target = `https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=${autoSyncMode}&job_id=${autoSyncProgress?.jobId || 'reopen'}${extra}#ycx_mode=${autoSyncMode}${extra}`;
                    window.open(target, 'mwg_bi_worker');
                } catch (e) {
                    console.warn(e);
                }
            }}
        />
        </>
    );

    return {
        handleStartAutoSync,
        autoSyncMode,
        autoSyncStatus,
        autoSyncModalOpen,
        setAutoSyncModalOpen,
        renderAutoSyncModal,
    };
}
