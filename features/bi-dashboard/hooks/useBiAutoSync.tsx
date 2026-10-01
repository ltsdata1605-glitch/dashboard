import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
    BiSyncMode,
    BiSyncProgress,
    startBiAutoSyncSession,
    readPendingAutoSync,
    savePendingAutoSync,
    clearPendingAutoSync,
    PENDING_MAX_RELOADS,
    applyBiSyncResults,
    onBiProgress,
    onBiDone,
    onBiError,
} from '../services/biAutoSyncService';
import { BiAutoSyncModal } from '../components/BiAutoSyncModal';

export function useBiAutoSync(activeSupermarket?: string | null) {
    const [autoSyncModalOpen, setAutoSyncModalOpen] = useState(false);
    const [autoSyncMode, setAutoSyncMode] = useState<BiSyncMode>('realtime');
    const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'not-installed' | 'outdated'>('idle');
    const [autoSyncCurrentVersion, setAutoSyncCurrentVersion] = useState<string>('');
    const [autoSyncLatestVersion, setAutoSyncLatestVersion] = useState<string>('');
    const [autoSyncProgress, setAutoSyncProgress] = useState<BiSyncProgress | null>(null);
    const [autoSyncError, setAutoSyncError] = useState<string>('');
    const workerWindowRef = useRef<Window | null>(null);
    const pendingReloadsRef = useRef(0);

    const handleStartAutoSync = useCallback(async (mode: BiSyncMode, opts: { tuChayTiep?: boolean } = {}) => {
        setAutoSyncMode(mode);
        setAutoSyncProgress(null);
        setAutoSyncError('');
        setAutoSyncStatus('running');
        setAutoSyncModalOpen(true);
        if (!opts.tuChayTiep) pendingReloadsRef.current = 0;

        try {
            const { workerWindow, workerOpened } = await startBiAutoSyncSession(mode, opts);
            workerWindowRef.current = workerWindow;
            clearPendingAutoSync();
            if (!workerOpened) {
                toast('Bấm "Mở lại tab MWG" để tiếp tục — trình duyệt chặn tự mở tab.', { icon: 'ℹ️', duration: 6000 });
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
                savePendingAutoSync({ mode, ts: Date.now(), reloads: pendingReloadsRef.current });
            } else {
                clearPendingAutoSync();
                setAutoSyncStatus('error');
                setAutoSyncError(msg || 'Không thể khởi chạy quy trình tự động.');
            }
        }
    }, []);

    // Tự chạy tiếp nếu có phiên dở do vừa cập nhật userscript
    const handleStartRef = useRef(handleStartAutoSync);
    handleStartRef.current = handleStartAutoSync;
    useEffect(() => {
        const p = readPendingAutoSync();
        if (!p) return;
        pendingReloadsRef.current = p.reloads;
        void handleStartRef.current(p.mode, { tuChayTiep: true });
    }, []);

    // Tự tải lại khi cập nhật xong Tampermonkey
    useEffect(() => {
        if (!autoSyncModalOpen || autoSyncStatus !== 'outdated') return;
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            const p = readPendingAutoSync();
            if (!p || p.reloads >= PENDING_MAX_RELOADS) return;
            savePendingAutoSync({ ...p, reloads: p.reloads + 1 });
            window.location.reload();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [autoSyncModalOpen, autoSyncStatus]);

    useEffect(() => {
        const unsubProgress = onBiProgress((prog) => {
            setAutoSyncProgress(prog);
            setAutoSyncStatus('running');
        });

        const unsubDone = onBiDone(async (payload) => {
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
            toast.success(`✨ Tự động cập nhật thành công ${res.successCount} mục dữ liệu ${modeLabel}!`, { duration: 4000 });
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
        <BiAutoSyncModal
            isOpen={autoSyncModalOpen}
            mode={autoSyncMode}
            status={autoSyncStatus}
            progress={autoSyncProgress}
            currentVersion={autoSyncCurrentVersion}
            latestVersion={autoSyncLatestVersion}
            errorMessage={autoSyncError}
            onClose={() => { setAutoSyncModalOpen(false); clearPendingAutoSync(); }}
            onCancel={() => {
                setAutoSyncStatus('idle');
                setAutoSyncProgress(null);
            }}
            onReopenWorker={() => {
                try {
                    const target = `https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=${autoSyncMode}&job_id=${autoSyncProgress?.jobId || 'reopen'}#ycx_mode=${autoSyncMode}`;
                    window.open(target, 'mwg_bi_worker');
                } catch (e) {
                    console.warn(e);
                }
            }}
        />
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
