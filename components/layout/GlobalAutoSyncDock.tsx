import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    Zap, TrendingUp, Sparkles, ChevronRight, ChevronLeft, Gift,
    FileSpreadsheet, CalendarRange, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import AutoSyncScheduleButton from './AutoSyncScheduleButton';
import {
    claimScheduleRun, dueSchedules, getSchedules, loadSchedules, nextScheduleTime, onSchedulesChanged, scheduleHasRun,
    SCHEDULE_LABELS, type ScheduleKey, type Schedules,
} from '../../services/autoSyncSchedule';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useIndexedDBState } from '../../features/bi-dashboard/hooks/useIndexedDBState';
import { useBiAutoSync } from '../../features/bi-dashboard/hooks/useBiAutoSync';
import { TampermonkeyInstallGuideModal } from '../../features/bi-dashboard/components/common/TampermonkeyInstallGuideModal';
import {
    YCX_MIN_USERSCRIPT_VERSION, YCX_REPORT_URL, YCX_USERSCRIPT_URL,
    compareVersions, detectYcxUserscript, fetchLatestYcxUserscriptVersion,
    listenYcxJob, newYcxJobId, resolveYcxMode, startYcxJob, ycxBufferToFile, ycxSteps,
    type YcxMode, type YcxStep,
} from '../../services/ycxAutoSyncService';

type YcxPhase = 'idle' | 'running' | 'error' | 'done';
type ScriptState = { checked: boolean; installed: boolean; version?: string };

const TEN_YCX: Record<YcxMode, string> = { realtime: 'YCX Realtime', luyke: 'YCX Luỹ kế' };

export default function GlobalAutoSyncDock() {
    const { activeTab, setActiveTab } = useActiveTab();

    // ─── Bi Auto Sync Setup ───
    const [activeSupermarket] = useIndexedDBState<string>('dashboard-active-supermarket', 'Tổng');
    const { handleStartAutoSync: startBiSync, renderAutoSyncModal } = useBiAutoSync(activeSupermarket);
    const [dockThuGonLuu, setIsDockCollapsed] = useIndexedDBState<boolean>('bi-dock-collapsed', false);

    // Màn hình hẹp < 1536px: mặc định thu gọn thành cột icon để không che dữ liệu
    const [manHep, setManHep] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1536 : false));
    const [dockMoTam, setDockMoTam] = useState(false);
    const isDockCollapsed = manHep ? !dockMoTam : dockThuGonLuu;
    const moDock = () => (manHep ? setDockMoTam(true) : setIsDockCollapsed(false));
    const thuGonDock = () => (manHep ? setDockMoTam(false) : setIsDockCollapsed(true));

    const [showGuideModal, setShowGuideModal] = useState(false);
    const [bonusStatus, setBonusStatus] = useState<{ isBusy: boolean; label?: string }>({ isBusy: false });

    // ─── YCX Auto Sync Setup ───
    const [ycxScript, setYcxScript] = useState<ScriptState>({ checked: false, installed: false });
    const [latestYcxVer, setLatestYcxVer] = useState<string | null>(null);
    const [ycxModalOpen, setYcxModalOpen] = useState(false);
    const [ycxPhase, setYcxPhase] = useState<YcxPhase>('idle');
    const [ycxStep, setYcxStep] = useState<YcxStep | null>(null);
    const [ycxMessage, setYcxMessage] = useState('');
    const [ycxLog, setYcxLog] = useState<{ at: number; text: string }[]>([]);
    /** Chế độ lượt YCX đang chạy (Luỹ kế bấm ngày 01 → Realtime) và nút người dùng đã bấm */
    const [ycxMode, setYcxMode] = useState<YcxMode>('realtime');
    const [ycxYeuCau, setYcxYeuCau] = useState<YcxMode>('realtime');
    const ycxJobRef = useRef<string | null>(null);
    const [lich, setLich] = useState<Schedules>(() => getSchedules());
    useEffect(() => {
        void loadSchedules().then(() => setLich({ ...getSchedules() }));
        return onSchedulesChanged(() => setLich({ ...getSchedules() }));
    }, []);
    const nhanHen = (k: ScheduleKey) => { const t = nextScheduleTime(lich[k]); return t ? `⏰ Hẹn ${t}` : null; };
    const ycxStopRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const handleResize = () => setManHep(window.innerWidth < 1536);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Lắng nghe trạng thái tiến trình Tự động Đổ Thưởng từ AutoBonusPanel
    useEffect(() => {
        const handleBonusStatus = (e: any) => {
            const d = e.detail;
            if (d?.isBusy) {
                let lbl = 'Đang chạy...';
                if (d.progress) lbl = `${d.progress.done}/${d.progress.total}`;
                else if (d.monthProgress) lbl = `Kỳ ${d.monthProgress.monthIndex + 1}/${d.monthProgress.monthTotal}`;
                setBonusStatus({ isBusy: true, label: lbl });
            } else {
                setBonusStatus({ isBusy: false });
            }
        };
        window.addEventListener('ycx-auto-bonus-status-changed', handleBonusStatus);
        return () => window.removeEventListener('ycx-auto-bonus-status-changed', handleBonusStatus);
    }, []);

    // Dò userscript định kỳ & khi focus cửa sổ
    const kiemTraYcxScript = useCallback(async () => {
        const r = await detectYcxUserscript(1200);
        setYcxScript({ checked: true, ...r });
        return r;
    }, []);

    useEffect(() => {
        const t = setTimeout(kiemTraYcxScript, 1000);
        const onFocus = () => { void kiemTraYcxScript(); };
        window.addEventListener('focus', onFocus);
        return () => { clearTimeout(t); window.removeEventListener('focus', onFocus); };
    }, [kiemTraYcxScript]);

    useEffect(() => {
        if (ycxModalOpen && !latestYcxVer) {
            void fetchLatestYcxUserscriptVersion().then(setLatestYcxVer);
        }
    }, [ycxModalOpen, latestYcxVer]);

    useEffect(() => () => ycxStopRef.current?.(), []);

    const ghiYcxLog = (text: string) => setYcxLog((l) => [...l.slice(-30), { at: Date.now(), text }]);

    const ycxScriptDu = ycxScript.installed && compareVersions(ycxScript.version || '0', YCX_MIN_USERSCRIPT_VERSION) >= 0;

    // ─── Handlers ───
    // auto === true: lượt hẹn giờ — AutoBonusPanel chạy thẳng kỳ "Hiện tại" (không mở hộp chọn kỳ). Mục Thưởng có thể
    // chưa tải xong → bắn lại tới khi panel xác nhận (tối đa ~15s).
    const handleTriggerAutoBonus = useCallback((auto?: unknown) => {
        const tuDong = auto === true;
        if (activeTab !== 'employees') {
            setActiveTab('employees');
        }
        window.dispatchEvent(new CustomEvent('nhanvien-switch-tab', { detail: { tab: 'bonus' } }));
        if (!tuDong) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ycx-trigger-auto-bonus'));
            }, 150);
            return;
        }
        let daNhan = false;
        const onAck = () => { daNhan = true; };
        window.addEventListener('ycx-auto-bonus-trigger-ack', onAck, { once: true });
        let lan = 0;
        const thu = () => {
            if (daNhan || lan++ > 15) { window.removeEventListener('ycx-auto-bonus-trigger-ack', onAck); return; }
            window.dispatchEvent(new CustomEvent('nhanvien-switch-tab', { detail: { tab: 'bonus' } }));
            window.dispatchEvent(new CustomEvent('ycx-trigger-auto-bonus', { detail: { auto: true } }));
            setTimeout(thu, 1000);
        };
        setTimeout(thu, 300);
    }, [activeTab, setActiveTab]);

    // auto: lượt hẹn giờ — không có cú bấm nên mở tab MWG nhờ userscript (tuChayTiep), Luỹ kế lấy tháng mặc định
    const handleStartBiSync = useCallback((mode: 'realtime' | 'luyke', auto = false) => {
        if (activeTab !== 'employees') {
            setActiveTab('employees');
        }
        if (auto) void startBiSync(mode, { tuChayTiep: true });
        else startBiSync(mode);
    }, [activeTab, setActiveTab, startBiSync]);

    useEffect(() => {
        const handleBiTrigger = (e: any) => {
            const mode = e.detail?.mode;
            if (mode === 'realtime' || mode === 'luyke') {
                handleStartBiSync(mode);
            }
        };
        window.addEventListener('ycx-trigger-bi-auto-sync', handleBiTrigger);
        return () => window.removeEventListener('ycx-trigger-bi-auto-sync', handleBiTrigger);
    }, [handleStartBiSync]);

    const handleTriggerYcxSync = useCallback((requested: YcxMode = 'realtime', opts: { auto?: boolean } = {}) => {
        // Luỹ kế = 01 → hôm qua; hôm nay ngày 01 thì chưa có ngày nào để luỹ kế → chạy Realtime (chủ dự án chốt)
        const mode = resolveYcxMode(requested);
        setYcxYeuCau(requested);
        setYcxMode(mode);
        setYcxModalOpen(true);
        if (!ycxScriptDu) {
            setYcxPhase('idle');
            void kiemTraYcxScript();
            return;
        }
        ycxStopRef.current?.();
        const jobId = newYcxJobId();
        ycxJobRef.current = jobId;
        setYcxPhase('running');
        setYcxStep('open');
        setYcxMessage('Đang mở report.mwgroup.vn…');
        setYcxLog([]);
        ghiYcxLog(`Bắt đầu lượt Tự động ${TEN_YCX[mode]}`);
        if (requested !== mode) {
            ghiYcxLog('Hôm nay là ngày 01 — chưa có ngày nào để luỹ kế, chạy Realtime');
            toast('Hôm nay là ngày 01 — YCX Luỹ kế chạy Realtime', { icon: '📅' });
        }

        ycxStopRef.current = listenYcxJob(jobId, (m) => {
            if (ycxJobRef.current !== jobId) return;
            if (m.type === 'progress') {
                setYcxStep(m.step);
                setYcxMessage(m.message);
                ghiYcxLog(m.message);
            } else if (m.type === 'error') {
                if (m.step) setYcxStep(m.step);
                setYcxPhase('error');
                setYcxMessage(m.message);
                ghiYcxLog(`Lỗi: ${m.message}`);
            } else if (m.type === 'file') {
                setYcxStep('load');
                setYcxMessage(`Đã tải "${m.fileName}" (${(m.buffer.byteLength / 1048576).toFixed(1)} MB) — đang nạp vào Phân tích…`);
                ghiYcxLog(`Đã nhận file ${m.fileName}`);
                ycxStopRef.current?.();
                ycxStopRef.current = null;
                const file = ycxBufferToFile(m.buffer, m.fileName);

                setYcxPhase('done');
                setYcxModalOpen(false);

                // Lưu file tạm vào global để DashboardView nhận ngay cả khi đang chuyển tab.
                // mode: Realtime → "Tệp Realtime", Luỹ kế → "Lũy kế / Quá khứ"
                (window as any).__pendingYcxAutoSyncFile = file;
                (window as any).__pendingYcxAutoSyncMode = mode;
                window.dispatchEvent(new CustomEvent('ycx-auto-sync-file', { detail: { file, mode } }));

                if (activeTab !== 'analysis') {
                    setActiveTab('analysis');
                    toast.success(`Đã tự động tải file ${TEN_YCX[mode]} và chuyển sang Phân Tích!`);
                }
            }
        });

        void startYcxJob(jobId, mode, { auto: opts.auto }).then((ok) => {
            if (ok) return;
            setYcxPhase('error');
            setYcxMessage(opts.auto
                ? 'Hẹn giờ không mở được tab report.mwgroup.vn — cần userscript bản 7.16 trở lên (Tampermonkey).'
                : 'Trình duyệt chặn mở tab mới — cho phép cửa sổ bật lên (pop-up) cho dashboard.pro.vn rồi bấm lại.');
        });
    }, [ycxScriptDu, kiemTraYcxScript, activeTab, setActiveTab]);

    const huyYcx = () => {
        ycxStopRef.current?.();
        ycxStopRef.current = null;
        ycxJobRef.current = null;
        setYcxPhase('idle');
        setYcxStep(null);
        setYcxModalOpen(false);
    };

    const dongYcxModal = () => {
        setYcxModalOpen(false);
        if (ycxPhase !== 'running') {
            setYcxPhase('idle');
            setYcxStep(null);
        }
    };

    // ─── Hẹn giờ tự chạy cho 5 nút (services/autoSyncSchedule.ts) ───
    const chayTheoLichRef = useRef<(k: ScheduleKey) => void>(() => {});
    chayTheoLichRef.current = (k: ScheduleKey) => {
        if (k === 'bi-realtime') handleStartBiSync('realtime', true);
        else if (k === 'bi-luyke') handleStartBiSync('luyke', true);
        else if (k === 'bonus') handleTriggerAutoBonus(true);
        else if (k === 'ycx-realtime') handleTriggerYcxSync('realtime', { auto: true });
        else if (k === 'ycx-luyke') handleTriggerYcxSync('luyke', { auto: true });
    };
    useEffect(() => {
        const tick = () => {
            // Mỗi lượt chỉ chạy 1 nút — nút khác đến hạn cùng lúc sẽ chạy ở lượt sau (30s), đỡ giành tab
            const den = dueSchedules(getSchedules(), new Date(), scheduleHasRun)[0];
            if (!den || !claimScheduleRun(den.marker)) return;
            toast(`⏰ ${den.time} — tự chạy ${SCHEDULE_LABELS[den.key]}`, { duration: 6000 });
            chayTheoLichRef.current(den.key);
        };
        const t0 = setTimeout(tick, 5000);
        const t = setInterval(tick, 30_000);
        return () => { clearTimeout(t0); clearInterval(t); };
    }, []);

    const ycxDangChay = ycxPhase === 'running';
    const ycxStepList = ycxSteps(ycxMode);
    const curYcxStep = ycxStep ? ycxStepList.findIndex((x) => x.id === ycxStep) : -1;

    return (
        <>
            {/* Floating Action Dock: 4 nút luôn nổi trên Laptop/Desktop với thiết kế kính mờ cao cấp & hiệu ứng ánh kim */}
            <aside
                aria-label="Thao tác tự động Auto Sync Pro"
                data-testid="ycx-auto-dock"
                className={`preserve-rounded hidden lg:flex flex-col fixed right-4 xl:right-7 top-32 z-40 transition-all duration-300 ease-out no-print hide-on-export select-none animate-in fade-in slide-in-from-right-4 ${
                    isDockCollapsed ? 'w-auto p-1.5' : 'w-[224px] p-3 gap-2.5'
                } rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)]`}
            >
                {isDockCollapsed ? (
                    <div className="preserve-rounded flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={moDock}
                            title="Mở rộng bảng Auto Sync"
                            aria-label="Mở rộng khung Auto Sync YCX"
                            className="preserve-rounded p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStartBiSync('realtime')}
                            title="Tự động Realtime (Report BI)"
                            className="preserve-rounded relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500 via-amber-500 to-amber-600 text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                            <Zap className="w-4 h-4 fill-amber-200" />{lich['bi-realtime']?.enabled && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" aria-label="Có hẹn giờ" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStartBiSync('luyke')}
                            title="Tự động Luỹ kế (Report BI)"
                            className="preserve-rounded relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                            <TrendingUp className="w-4 h-4" />{lich['bi-luyke']?.enabled && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" aria-label="Có hẹn giờ" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleTriggerAutoBonus}
                            title={bonusStatus.isBusy ? `Tự động Đổ Thưởng (${bonusStatus.label || 'Đang chạy'})` : 'Tự động Đổ Thưởng'}
                            className={`preserve-rounded relative p-2.5 rounded-xl bg-gradient-to-br from-sky-600 via-sky-600 to-sky-700 text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                bonusStatus.isBusy ? 'ring-2 ring-sky-400 animate-pulse' : ''
                            }`}
                        >
                            <Gift className="w-4 h-4 text-sky-100" />{lich['bonus']?.enabled && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" aria-label="Có hẹn giờ" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTriggerYcxSync('realtime')}
                            title={ycxDangChay && ycxMode === 'realtime' ? 'Tự động YCX Realtime (Đang chạy...)' : 'Tự động YCX Realtime (Phân Tích)'}
                            aria-label="Tự động YCX Realtime"
                            className={`preserve-rounded relative p-2.5 rounded-xl bg-gradient-to-br from-sky-700 via-sky-700 to-sky-800 text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                ycxDangChay && ycxMode === 'realtime' ? 'ring-2 ring-sky-400 animate-pulse' : ''
                            }`}
                        >
                            <FileSpreadsheet className="w-4 h-4 text-sky-100" />{lich['ycx-realtime']?.enabled && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" aria-label="Có hẹn giờ" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTriggerYcxSync('luyke')}
                            title={ycxDangChay && ycxMode === 'luyke' ? 'Tự động YCX Luỹ kế (Đang chạy...)' : 'Tự động YCX Luỹ kế (Phân Tích, 01 → hôm qua)'}
                            aria-label="Tự động YCX Luỹ kế"
                            className={`preserve-rounded relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-700 to-emerald-800 text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                ycxDangChay && ycxMode === 'luyke' ? 'ring-2 ring-emerald-400 animate-pulse' : ''
                            }`}
                        >
                            <CalendarRange className="w-4 h-4 text-emerald-100" />{lich['ycx-luyke']?.enabled && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" aria-label="Có hẹn giờ" />}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header trạng thái sắc nét với live pulse & nút thu gọn */}
                        <div className="preserve-rounded flex items-center justify-between px-1 pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5" title="Sẵn sàng đồng bộ tự động">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ycxDangChay || bonusStatus.isBusy ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ycxDangChay || bonusStatus.isBusy ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></span>
                                </span>
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Auto Sync Pro
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={thuGonDock}
                                title="Thu gọn bảng"
                                aria-label="Thu gọn khung Auto Sync YCX"
                                className="preserve-rounded p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="relative">
                        {/* Nút 1: Tự động Realtime (BI) */}
                        <button
                            type="button"
                            onClick={() => handleStartBiSync('realtime')}
                            aria-label="Tự động Realtime (Report BI)"
                            title="Tự động thu thập dữ liệu Realtime từ MWG qua Tampermonkey"
                            className="preserve-rounded group relative overflow-hidden flex items-center gap-3 pl-3 pr-9 py-2.5 w-full rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-600 border border-amber-300/40 dark:border-amber-400/30 shadow-[0_6px_20px_rgba(245,158,11,0.32),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.48),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap text-left"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 pointer-events-none" />
                            <div className="preserve-rounded relative w-8 h-8 rounded-lg bg-black/15 flex items-center justify-center shrink-0 border border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform duration-200">
                                <Zap className="h-4 w-4 text-amber-100 fill-amber-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight drop-shadow-sm truncate">
                                    BI Realtime
                                </span>
                                <span className="text-[11px] font-semibold text-amber-100/90 leading-none mt-1 truncate">
                                    {nhanHen('bi-realtime') || '⚡ Hôm nay'}
                                </span>
                            </div>
                        </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AutoSyncScheduleButton scheduleKey="bi-realtime" tone="dark" compact />
                            </div>
                        </div>

                        <div className="relative">
                        {/* Nút 2: Tự động Luỹ kế (BI) */}
                        <button
                            type="button"
                            onClick={() => handleStartBiSync('luyke')}
                            aria-label="Tự động Luỹ kế (Report BI)"
                            title="Tự động thu thập dữ liệu Luỹ kế từ MWG qua Tampermonkey"
                            className="preserve-rounded group relative overflow-hidden flex items-center gap-3 pl-3 pr-9 py-2.5 w-full rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:from-emerald-700 active:to-emerald-700 border border-emerald-300/40 dark:border-emerald-400/30 shadow-[0_6px_20px_rgba(16,185,129,0.32),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.48),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap text-left"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 pointer-events-none" />
                            <div className="preserve-rounded relative w-8 h-8 rounded-lg bg-black/15 flex items-center justify-center shrink-0 border border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform duration-200">
                                <TrendingUp className="h-4 w-4 text-emerald-100 drop-shadow-[0_0_6px_rgba(110,231,183,0.9)]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight drop-shadow-sm truncate">
                                    BI Luỹ kế
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-100/90 leading-none mt-1 truncate">
                                    {nhanHen('bi-luyke') || '📈 Tháng đến nay'}
                                </span>
                            </div>
                        </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AutoSyncScheduleButton scheduleKey="bi-luyke" tone="dark" compact />
                            </div>
                        </div>

                        <div className="relative">
                        {/* Nút 3: Tự động Đổ Thưởng (HRM) */}
                        <button
                            type="button"
                            onClick={handleTriggerAutoBonus}
                            aria-label="Tự động Đổ Thưởng"
                            title="Tự động thu thập điểm và đổ thưởng nhân viên từ HRM qua Tampermonkey"
                            className="preserve-rounded group relative overflow-hidden flex items-center gap-3 pl-3 pr-9 py-2.5 w-full rounded-xl font-bold text-white bg-gradient-to-r from-sky-600 via-sky-600 to-sky-600 hover:from-sky-500 hover:from-sky-500 active:from-sky-700 active:to-sky-700 border border-sky-300/40 dark:border-sky-400/30 shadow-[0_6px_20px_rgba(147,51,234,0.32),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_8px_25px_rgba(147,51,234,0.48),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap text-left"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 pointer-events-none" />
                            <div className={`preserve-rounded relative w-8 h-8 rounded-lg bg-black/15 flex items-center justify-center shrink-0 border border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform duration-200 ${
                                bonusStatus.isBusy ? 'animate-pulse' : ''
                            }`}>
                                <Gift className="h-4 w-4 text-sky-100 drop-shadow-[0_0_6px_rgba(216,180,254,0.9)]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight drop-shadow-sm truncate">
                                    Đổ Thưởng
                                </span>
                                <span className="text-[11px] font-semibold text-sky-100/90 leading-none mt-1 truncate">
                                    {bonusStatus.isBusy ? `⚡ ${bonusStatus.label || 'Đang xử lý...'}` : (nhanHen('bonus') || '🎁 Nhân viên')}
                                </span>
                            </div>
                        </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AutoSyncScheduleButton scheduleKey="bonus" tone="dark" compact />
                            </div>
                        </div>

                        <div className="relative">
                        {/* Nút 4: YCX Realtime (Phân Tích) */}
                        <button
                            type="button"
                            onClick={() => handleTriggerYcxSync('realtime')}
                            title="Tự động xuất & nạp file YCX Realtime từ report.mwgroup.vn (báo cáo 77)"
                            aria-label="Tự động YCX Realtime"
                            className="preserve-rounded group relative overflow-hidden flex items-center gap-3 pl-3 pr-9 py-2.5 w-full rounded-xl font-bold text-white bg-gradient-to-r from-sky-700 via-sky-700 to-sky-800 hover:from-sky-600 hover:to-sky-700 active:from-sky-800 active:to-sky-800 border border-sky-400/40 dark:border-sky-400/30 shadow-[0_6px_20px_rgba(3,105,161,0.32),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_8px_25px_rgba(3,105,161,0.48),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap text-left"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 pointer-events-none" />
                            <div className={`preserve-rounded relative w-8 h-8 rounded-lg bg-black/15 flex items-center justify-center shrink-0 border border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform duration-200 ${
                                ycxDangChay && ycxMode === 'realtime' ? 'animate-pulse' : ''
                            }`}>
                                <FileSpreadsheet className="h-4 w-4 text-sky-100 drop-shadow-[0_0_6px_rgba(186,230,253,0.9)]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight drop-shadow-sm truncate">
                                    YCX Realtime
                                </span>
                                <span className="text-[11px] font-semibold text-sky-100/90 leading-none mt-1 truncate">
                                    {ycxDangChay && ycxMode === 'realtime' ? '⚡ Đang chạy… bấm để xem' : (nhanHen('ycx-realtime') || '⚡ Đổ & cập nhật')}
                                </span>
                            </div>
                        </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AutoSyncScheduleButton scheduleKey="ycx-realtime" tone="dark" compact />
                            </div>
                        </div>


                        <div className="relative">
                        {/* Nút 5: YCX Luỹ kế (Phân Tích) — Từ 01 đầu tháng → Đến HÔM QUA; ngày 01 chạy Realtime */}
                        <button
                            type="button"
                            onClick={() => handleTriggerYcxSync('luyke')}
                            title="Tự động xuất & nạp file YCX Luỹ kế (01 → hôm qua) từ report.mwgroup.vn (báo cáo 77). Ngày 01 sẽ chạy Realtime."
                            aria-label="Tự động YCX Luỹ kế"
                            className="preserve-rounded group relative overflow-hidden flex items-center gap-3 pl-3 pr-9 py-2.5 w-full rounded-xl font-bold text-white bg-gradient-to-r from-emerald-700 via-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-800 active:to-emerald-800 border border-emerald-400/40 dark:border-emerald-400/30 shadow-[0_6px_20px_rgba(4,120,87,0.32),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_8px_25px_rgba(4,120,87,0.48),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap text-left"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 pointer-events-none" />
                            <div className={`preserve-rounded relative w-8 h-8 rounded-lg bg-black/15 flex items-center justify-center shrink-0 border border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform duration-200 ${
                                ycxDangChay && ycxMode === 'luyke' ? 'animate-pulse' : ''
                            }`}>
                                <CalendarRange className="h-4 w-4 text-emerald-100 drop-shadow-[0_0_6px_rgba(167,243,208,0.9)]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight drop-shadow-sm truncate">
                                    YCX Luỹ kế
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-100/90 leading-none mt-1 truncate">
                                    {ycxDangChay && ycxMode === 'luyke' ? '⚡ Đang chạy… bấm để xem' : (nhanHen('ycx-luyke') || '📅 01 → hôm qua')}
                                </span>
                            </div>
                        </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AutoSyncScheduleButton scheduleKey="ycx-luyke" tone="dark" compact />
                            </div>
                        </div>

                        {/* Footer micro-tag: bấm để xem hướng dẫn cài đặt & kiểm tra kết nối */}
                        <button
                            type="button"
                            onClick={() => setShowGuideModal(true)}
                            title="Bấm để xem hướng dẫn cài đặt tiện ích Tampermonkey hoặc kiểm tra kết nối"
                            className="preserve-rounded flex items-center justify-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer w-full text-center"
                        >
                            <Sparkles className="w-3 h-3 text-amber-500/80 shrink-0" />
                            <span>Tampermonkey • Hướng dẫn {ycxScript.checked ? (ycxScript.installed ? `(bản ${ycxScript.version || '?'})` : '(chưa cài)') : ''}</span>
                        </button>
                    </>
                )}
            </aside>

            {/* Modal tiến trình YCX Realtime */}
            <Modal
                isOpen={ycxModalOpen}
                onClose={dongYcxModal}
                title={`Tự động ${TEN_YCX[ycxMode]}`}
                subTitle="report.mwgroup.vn · Báo cáo 77 · Chi tiết yêu cầu xuất"
                maxWidth="md"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        {ycxDangChay && <Button variant="secondary" size="sm" onClick={huyYcx}>Huỷ lượt này</Button>}
                        {ycxPhase === 'error' && <Button variant="primary" size="sm" onClick={() => handleTriggerYcxSync(ycxYeuCau)}>Chạy lại</Button>}
                        {ycxPhase === 'idle' && ycxScriptDu && <Button variant="primary" size="sm" onClick={() => handleTriggerYcxSync(ycxYeuCau)}>Bắt đầu</Button>}
                        <Button variant="secondary" size="sm" onClick={dongYcxModal}>{ycxDangChay ? 'Ẩn (vẫn chạy)' : 'Đóng'}</Button>
                    </div>
                }
            >
                <div className="space-y-3 text-[13px] text-slate-700 dark:text-slate-300" data-testid="ycx-auto-modal">
                    {!ycxScriptDu ? (
                        <div className="border-l-[3px] border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 space-y-2 rounded-r" data-testid="ycx-auto-need-script">
                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                                {ycxScript.installed
                                    ? `Tampermonkey đang chạy bản ${ycxScript.version || '?'} — cần bản ${YCX_MIN_USERSCRIPT_VERSION} trở lên để tự động trên report.mwgroup.vn.`
                                    : 'Chưa thấy userscript "MWG - Tự động lấy điểm thưởng" trên trang này.'}
                            </p>
                            <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300 text-xs">
                                <li>Bấm <b>Cài / cập nhật userscript</b> → Tampermonkey hiện trang cài → bấm Cài đặt / Cập nhật{latestYcxVer ? ` (bản mới nhất ${latestYcxVer})` : ''}.</li>
                                <li>Lần đầu tải file, Tampermonkey có thể hỏi quyền truy cập tên miền — chọn <b>Luôn cho phép</b>.</li>
                                <li>Tải lại trang Dashboard rồi bấm lại <b>Tự động {TEN_YCX[ycxYeuCau]}</b>.</li>
                            </ol>
                            <div className="flex gap-2 pt-1">
                                <Button variant="primary" size="sm" onClick={() => window.open(YCX_USERSCRIPT_URL, '_blank')}>Cài / cập nhật userscript</Button>
                                <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Tải lại trang</Button>
                            </div>
                        </div>
                    ) : ycxPhase === 'idle' ? (
                        <div className="space-y-2">
                            {ycxYeuCau === 'luyke' && ycxMode === 'realtime' && (
                                <p className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-1.5 text-amber-800" data-testid="ycx-luyke-ngay-1">Hôm nay là ngày 01 — chưa có ngày nào để luỹ kế, sẽ chạy <b>Realtime</b>.</p>
                            )}
                            <p>Dashboard sẽ mở <b>{YCX_REPORT_URL.replace('https://', '')}</b> ở tab mới và tự động thao tác:</p>
                            <ol className="list-decimal pl-5 space-y-1 text-xs">
                                {ycxStepList.map((s) => <li key={s.id}>{s.label}</li>)}
                            </ol>
                            <p className="text-[12px] text-slate-500">Yêu cầu đã đăng nhập sẵn tài khoản MWG trên trình duyệt này.</p>
                        </div>
                    ) : (
                        <>
                            <ol className="space-y-1.5" data-testid="ycx-auto-steps">
                                {ycxStepList.map((s, i) => {
                                    const xong = ycxPhase === 'done' || i < curYcxStep;
                                    const dang = i === curYcxStep && ycxPhase === 'running';
                                    const loi = i === curYcxStep && ycxPhase === 'error';
                                    return (
                                        <li key={s.id} className={`flex items-center gap-2 border-l-[3px] pl-2 ${loi ? 'border-rose-500 text-rose-700 dark:text-rose-400' : xong ? 'border-emerald-500 text-slate-700 dark:text-slate-300' : dang ? 'border-sky-500 text-sky-800 dark:text-sky-300 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                            <span className="w-4 shrink-0 text-center" aria-hidden>
                                                {loi ? <AlertCircle className="w-3.5 h-3.5 text-rose-500 inline" /> : xong ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" /> : dang ? <span className="inline-block h-3 w-3 rounded-full border-2 border-sky-200 border-t-sky-600 animate-spin align-middle" /> : '·'}
                                            </span>
                                            <span>{s.label}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                            <p className={`px-3 py-2 border-l-[3px] rounded-r ${ycxPhase === 'error' ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' : 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300'}`} data-testid="ycx-auto-message">
                                {ycxMessage}
                            </p>
                            {ycxPhase === 'error' && (
                                <p className="text-[12px] text-slate-500">
                                    Có thể làm tay: mở <a className="text-sky-700 dark:text-sky-400 underline" href={YCX_REPORT_URL} target="_blank" rel="noreferrer">báo cáo 77</a> → Xuất excel → Lịch sử xuất excel → Tải file excel → bấm <b>File YCX</b> → <b>{ycxMode === 'luyke' ? 'Lũy kế / Quá khứ' : 'Tệp Realtime'}</b>.
                                </p>
                            )}
                            {ycxLog.length > 1 && (
                                <details className="text-[12px] text-slate-500">
                                    <summary className="cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-300">Nhật ký tiến trình ({ycxLog.length})</summary>
                                    <ul className="mt-1 max-h-32 overflow-auto tabular-nums space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                        {ycxLog.map((l, i) => <li key={i}>{new Date(l.at).toLocaleTimeString('vi-VN')} — {l.text}</li>)}
                                    </ul>
                                </details>
                            )}
                        </>
                    )}
                </div>
            </Modal>

            {/* Modals hỗ trợ từ BI Auto Sync & Tampermonkey */}
            {renderAutoSyncModal()}
            <TampermonkeyInstallGuideModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
                onRetry={kiemTraYcxScript}
            />
        </>
    );
}
