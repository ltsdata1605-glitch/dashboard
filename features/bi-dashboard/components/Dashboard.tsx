
import React, { useRef, useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UploadIcon } from './Icons';
import { Clock, TrendingUp, Sparkles } from 'lucide-react';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import SummaryTableView from './dashboard/SummaryTableView';
import CompetitionView from './dashboard/CompetitionView';
import IndustryView from './dashboard/IndustryView';
import DashboardHeader from './dashboard/DashboardHeader';
import KpiOverview from './dashboard/KpiOverview';
import { shortenSupermarketName, type SubTab } from '../utils/dashboardHelpers';
import { useExportOptions } from '../hooks/useExportOptions';
import ExportOptionsModal from '../../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { exportElementAsImage, downloadBlob, shareBlob } from '../services/uiService';
import { Button } from '../../../components/shared/ui/Button';
import { FeatureLandingLayout } from '../../../components/shared/ui';
import { useBiAutoSync } from '../hooks/useBiAutoSync';

interface DashboardProps {
    onNavigateToUpdater: (options?: { configTab?: 'data' | 'revenueTarget' | 'competitionTarget'; supermarketName?: string; scrollToConfig?: boolean }) => void;
    isActive?: boolean;
    onStartAutoSync?: (mode: 'realtime' | 'luyke') => void;
}

/**
 * Màn hình khi CHƯA có dữ liệu — Đồng bộ chuẩn Landing Page sang trọng giống Phân Tích:
 * - Ambient background grid + 3 quả cầu phát sáng nhịp nhàng
 * - Typography 3-phase gradient (sky via rose to sky)
 * - Glassmorphism card với quầng sáng viền mờ ảo
 * - Card upload / điều hướng thao tác cập nhật dữ liệu
 * - Dải huy hiệu tin cậy chân trang
 */
const EmptyState: React.FC<{ onNavigate: () => void; message?: string }> = ({ onNavigate, message }) => (
    <FeatureLandingLayout>
        <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100/50 dark:border-sky-500/20">
                <UploadIcon className="h-5 w-5" />
            </div>
            <div className="text-left flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">Nhập dữ liệu Báo cáo BI</h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hỗ trợ dán hoặc nạp dữ liệu BI</p>
            </div>
        </div>

        <button
            type="button"
            onClick={onNavigate}
            className="w-full relative group/dropzone flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-slate-200 dark:border-slate-700/60 hover:border-sky-400/50 dark:hover:border-sky-500/50 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 hover:bg-sky-50/30 dark:hover:bg-sky-950/20 transition-all duration-300 overflow-hidden p-4"
        >
            <div className="w-10 h-10 mb-3 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/dropzone:scale-110 transition-transform duration-300 group-hover/dropzone:shadow-sky-100 text-slate-400 group-hover/dropzone:text-sky-500">
                <UploadIcon className="h-5 w-5" />
            </div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                <span className="text-sky-600 dark:text-sky-400 font-semibold">Cập nhật dữ liệu</span> hoặc nạp báo cáo mới
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Tự động đồng bộ từ Tampermonkey hoặc nhập thủ công
            </p>
        </button>

        <p className="mt-3 text-[12px] font-medium text-slate-500 dark:text-slate-400 text-center">
            {message || 'Chưa có dữ liệu nào được nạp.'}
        </p>
    </FeatureLandingLayout>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToUpdater, isActive, onStartAutoSync }) => {
    const {
        activeMainTab, setActiveMainTab,
        activeSubTab, setActiveSubTab,
        activeSupermarket, setActiveSupermarket,
        supermarkets,
        isBatchExporting, setIsBatchExporting,
        isBatchExportingCumulative, setIsBatchExportingCumulative,
        isBatchExportingCompetition, setIsBatchExportingCompetition,
        summaryRealtimeParsed, summaryLuyKeParsed,
        industryRealtimeParsed, industryLuyKeParsed,
        augmentedRealtimeData, augmentedLuyKeData,
        supermarketDailyTargets, supermarketMonthlyTargets, supermarketTargets,
        summaryRealtimeTs,
        competitionRealtimeTs,
        competitionLuyKeTs,
        getKpiData,
        summaryLuyKe,
        hasRealtimeData,
        hasCumulativeData,
        useAdjustedTarget,
        setUseAdjustedTarget
    } = useDashboardLogic(isActive);

    const printableRef = useRef<HTMLDivElement>(null);
    const summaryTableRef = useRef<HTMLDivElement>(null);
    const industryTableRef = useRef<HTMLDivElement>(null);
    const competitionViewRef = useRef<HTMLDivElement>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    // Nếu BiWrapper đã quản lý useBiAutoSync tập trung, dùng onStartAutoSync từ prop; fallback nếu dùng lẻ loi
    const fallbackAutoSync = useBiAutoSync(onStartAutoSync ? null : activeSupermarket);
    const handleStartAutoSync = onStartAutoSync || fallbackAutoSync.handleStartAutoSync;
    const exportOptions = useExportOptions();
    const exportOptionsContextValue = useMemo(
        () => ({ showExportOptions: exportOptions.showExportOptions }),
        [exportOptions.showExportOptions]
    );
    const [isHeaderExporting, setIsHeaderExporting] = useState(false);

    // --- Export Logic Tối Ưu Tuyệt Đối Cho Bảng Báo Cáo ---
    const handleExportPNG = async (
        targetRef: React.RefObject<HTMLDivElement | null>,
        filenamePart: string,
        autoAction?: 'download' | 'share' | 'cancel' | null,
        /** Tuỳ chọn thêm cho exportElementAsImage — vd bảng Thi đua dùng fitAllColumns + fitWidthToTable. */
        extraOptions?: Record<string, unknown>,
    ): Promise<'download' | 'share' | 'cancel' | null> => {
        const original = targetRef.current;
        if (!original) return null;

        try {
            const safeName = filenamePart.replace(/[\\/:*?"<>|]/g, '_');
            const filename = `BI_PRO_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;

            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component', '.column-customizer', '.industry-view-controls', '#competition-view-controls', '.js-individual-view-toolbar', '.hide-on-export'],
                ...(extraOptions || {})
            });

            if (blob) {
                if (autoAction === 'download') {
                    downloadBlob(blob, filename);
                    return 'download';
                } else if (autoAction === 'share') {
                    await shareBlob(blob, filename);
                    return 'share';
                } else {
                    return await exportOptions.showExportOptions(blob, filename);
                }
            } else {
                toast.error('Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại!');
            }
            return null;
        } catch (err) {
            console.error('Export error', err);
            toast.error('Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại!');
            return null;
        }
    };

    const runBatchExport = async (mode: 'realtime' | 'cumulative' | 'competition') => {
        const setExporting = mode === 'competition' ? setIsBatchExportingCompetition : (mode === 'realtime' ? setIsBatchExporting : setIsBatchExportingCumulative);
        setExporting(true);
        const originalSm = activeSupermarket;
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        try {
            for (const sm of ['Tổng', ...supermarkets]) {
                setActiveSupermarket(sm);
                await sleep(1500);
                const targetRef = pageRef;
                const label = mode === 'competition'
                    ? `Thi Đua ${activeMainTab === 'realtime' ? 'Thời Gian Thực' : 'Lũy Kế'}`
                    : (mode === 'realtime' ? 'Doanh Thu' : 'Doanh Thu Lũy Kế');
                const extraOpts = mode === 'competition' ? { fitAllColumns: true, fitWidthToTable: true } : { captureAsDisplayed: true };
                const action = await handleExportPNG(targetRef, `${label} - ${sm}`, autoAction, extraOpts);
                if (action === 'cancel') break;
                autoAction = action;
            }
        } catch (e) {
            console.error(e);
            toast.error('Lỗi xuất hàng loạt.');
        } finally {
            setActiveSupermarket(originalSm);
            setExporting(false);
        }
    };

    // Tự động chuyển sang Luỹ kế nếu khởi động mà Realtime chưa có dữ liệu nhưng Luỹ kế đã có sẵn
    const hasAutoSwitchedRef = useRef(false);
    useEffect(() => {
        if (!hasAutoSwitchedRef.current && !hasRealtimeData && hasCumulativeData && activeMainTab === 'realtime') {
            hasAutoSwitchedRef.current = true;
            setActiveMainTab('cumulative');
        }
    }, [hasRealtimeData, hasCumulativeData, activeMainTab, setActiveMainTab]);

    // ─── Tự xuất ảnh theo hẹn giờ (2026-10-02) ───
    // Khung Auto Sync Pro (gốc) gửi `ycx-bi-auto-export:request` {requestId, mode, areas} sau khi lượt BI hẹn giờ đổ dữ
    // liệu xong; ở đây dựng ảnh từng khu vực rồi trả `ycx-bi-auto-export:done` {images, errors}. Hai khu vực chỉ nói
    // chuyện qua sự kiện (CLAUDE.md mục 1) — gửi LINE là việc của bên gốc.
    const autoRef = useRef({ isActive, supermarkets, activeMainTab, activeSubTab, activeSupermarket, setActiveMainTab, setActiveSubTab, setActiveSupermarket });
    autoRef.current = { isActive, supermarkets, activeMainTab, activeSubTab, activeSupermarket, setActiveMainTab, setActiveSubTab, setActiveSupermarket };
    useEffect(() => {
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        const KHU_VUC: Record<string, { sub: SubTab; tong: boolean; kind: 'page' | 'industry' | 'competition'; ten: string }> = {
            'bi-doanh-thu-tong': { sub: 'revenue', tong: true, kind: 'page', ten: 'Doanh Thu' },
            'bi-doanh-thu-tung-st': { sub: 'revenue', tong: false, kind: 'page', ten: 'Doanh Thu' },
            'bi-nganh-hang-tung-st': { sub: 'revenue', tong: false, kind: 'industry', ten: 'Ngành Hàng' },
            'bi-thi-dua-tong': { sub: 'competition', tong: true, kind: 'competition', ten: 'Thi Đua' },
            'bi-thi-dua-tung-st': { sub: 'competition', tong: false, kind: 'competition', ten: 'Thi Đua' },
        };
        let dangChay = false;
        const onRequest = async (e: Event) => {
            const d = (e as CustomEvent).detail as { requestId?: string; mode?: string; areas?: string[] } | null;
            if (!d?.requestId || dangChay) return;
            dangChay = true;
            const images: { area: string; label: string; blob: Blob }[] = [];
            const errors: { area: string; error: string }[] = [];
            const r = () => autoRef.current;
            const t0 = Date.now();
            while (!r().isActive && Date.now() - t0 < 20_000) await sleep(250);
            const truoc = { main: r().activeMainTab, sub: r().activeSubTab, sm: r().activeSupermarket };
            const realtime = d.mode !== 'luyke';
            try {
                if (!r().isActive) throw new Error('mục Siêu thị của Report BI chưa mở được');
                r().setActiveMainTab(realtime ? 'realtime' : 'cumulative');
                const nhan = realtime ? 'Thời Gian Thực' : 'Lũy Kế';
                const laDienThoai = window.innerWidth < 1024 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
                for (const area of d.areas || []) {
                    const kv = KHU_VUC[area];
                    if (!kv) { errors.push({ area, error: 'khu vực không rõ' }); continue; }
                    const ds = kv.tong ? ['Tổng'] : r().supermarkets.filter(sm => sm !== 'Tổng');
                    if (ds.length === 0) errors.push({ area, error: 'chưa có siêu thị nào' });
                    for (const sm of ds) {
                        r().setActiveSubTab(kv.sub);
                        r().setActiveSupermarket(sm);
                        await sleep(1800);
                        const el = kv.kind === 'industry' ? industryTableRef.current : printableRef.current;
                        const label = `${kv.ten} ${nhan} - ${sm}`;
                        if (!el) { errors.push({ area, error: `${sm}: chưa có dữ liệu` }); continue; }
                        try {
                            const blob = await exportElementAsImage(el, `BI_PRO_${label.replace(/[\\/:*?"<>|]/g, '_')}.png`, {
                                mode: 'blob-only',
                                elementsToHide: ['.no-print', '.export-button-component', '.column-customizer', '.industry-view-controls', '#competition-view-controls', '.js-individual-view-toolbar', '.hide-on-export'],
                                ...(kv.kind === 'competition' ? { fitAllColumns: true, fitWidthToTable: true } : { captureAsDisplayed: true }),
                                // Gửi LINE: chụp nét hơn (bộ xuất ảnh tự hạ khi vượt trần canvas)
                                ...(laDienThoai ? {} : { scale: 3 }),
                            });
                            if (blob) images.push({ area, label, blob }); else errors.push({ area, error: `${sm}: không dựng được ảnh` });
                        } catch (err) {
                            errors.push({ area, error: `${sm}: ${err instanceof Error ? err.message : String(err)}` });
                        }
                    }
                }
            } catch (err) {
                errors.push({ area: 'Report BI', error: err instanceof Error ? err.message : String(err) });
            } finally {
                r().setActiveMainTab(truoc.main);
                r().setActiveSubTab(truoc.sub);
                r().setActiveSupermarket(truoc.sm);
                dangChay = false;
                window.dispatchEvent(new CustomEvent('ycx-bi-auto-export:done', { detail: { requestId: d.requestId, images, errors } }));
            }
        };
        window.addEventListener('ycx-bi-auto-export:request', onRequest);
        return () => window.removeEventListener('ycx-bi-auto-export:request', onRequest);
    }, []);

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!hasRealtimeData && !hasCumulativeData) {
        return (
            <>
                <EmptyState onNavigate={onNavigateToUpdater} />
            </>
        );
    }

    const isRealtimeView = activeMainTab === 'realtime';
    const hasData = isRealtimeView ? hasRealtimeData : hasCumulativeData;
    const currentKpiData = getKpiData(isRealtimeView);
    const activeTargets = supermarketTargets[activeSupermarket]
        || supermarketTargets[shortenSupermarketName(activeSupermarket)]
        || supermarketTargets[activeSupermarket.toUpperCase()]
        || supermarketTargets['Tổng']
        || { quyDoi: 40, traGop: 45 };

    if (!hasData) {
        return (
            <div className="space-y-6">
                <DashboardHeader
                    title="SIÊU THỊ"
                    activeMainTab={activeMainTab}
                    setActiveMainTab={setActiveMainTab}
                    activeSubTab={activeSubTab}
                    setActiveSubTab={setActiveSubTab}
                    supermarkets={supermarkets}
                    activeSupermarket={activeSupermarket}
                    setActiveSupermarket={setActiveSupermarket}
                    onBatchExport={() => { }}
                    isBatchExporting={false}
                    onStartAutoSync={handleStartAutoSync}
                >
                    <div className="py-12 px-6 sm:py-16 sm:px-8 border-t border-slate-200 dark:border-slate-700/60 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/40 dark:to-slate-900/20 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 shadow-sm">
                            <Clock className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                            {isRealtimeView ? 'Chưa có dữ liệu Realtime hôm nay' : 'Chưa có dữ liệu Luỹ kế'}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
                            {isRealtimeView
                                ? 'Hệ thống chưa ghi nhận dữ liệu thời gian thực trong ngày. Dữ liệu sẽ tự động hiển thị khi đồng bộ từ Tampermonkey hoặc tải lên từ Báo cáo BI.'
                                : 'Hệ thống chưa ghi nhận dữ liệu báo cáo luỹ kế. Vui lòng nạp file báo cáo để xem phân tích chi tiết.'}
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            {isRealtimeView && hasCumulativeData && (
                                <Button
                                    variant="primary"
                                    onClick={() => setActiveMainTab('cumulative')}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Xem báo cáo Luỹ kế</span>
                                </Button>
                            )}
                            {!isRealtimeView && hasRealtimeData && (
                                <Button
                                    variant="primary"
                                    onClick={() => setActiveMainTab('realtime')}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                                >
                                    <Clock className="w-4 h-4" />
                                    <span>Xem báo cáo Realtime</span>
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => onNavigateToUpdater({ configTab: 'data' })}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <UploadIcon className="w-4 h-4 text-sky-500" />
                                <span>Cập nhật dữ liệu</span>
                            </Button>
                        </div>

                        {isRealtimeView && (
                            <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500/80" />
                                <span>Mẹo: Bạn có thể bật UserScript Tampermonkey trên trang báo cáo MWG để tự động thu thập số liệu.</span>
                            </div>
                        )}
                    </div>
                </DashboardHeader>
            </div>
        );
    }

    return (
        <ExportOptionsProvider value={exportOptionsContextValue}>
            <div className="space-y-3 sm:space-y-6" ref={pageRef}>
                <div ref={printableRef} className="space-y-3 sm:space-y-6">
                    <DashboardHeader
                        title="SIÊU THỊ"
                        activeMainTab={activeMainTab}
                        setActiveMainTab={setActiveMainTab}
                        activeSubTab={activeSubTab}
                        setActiveSubTab={setActiveSubTab}
                        supermarkets={supermarkets}
                        activeSupermarket={activeSupermarket}
                        setActiveSupermarket={setActiveSupermarket}
                        onBatchExport={() => {
                            if (activeSubTab === 'competition') runBatchExport('competition');
                            else runBatchExport(isRealtimeView ? 'realtime' : 'cumulative');
                        }}
                        isBatchExporting={isBatchExporting || isBatchExportingCumulative || isBatchExportingCompetition}
                        onExport={async () => {
                            setIsHeaderExporting(true);
                            const exportTarget = printableRef;
                            const subTabLabel = activeSubTab === 'competition' ? 'Thi Đua' : 'Doanh Thu';
                            await handleExportPNG(exportTarget, `${subTabLabel} ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`, null, { captureAsDisplayed: true });
                            setIsHeaderExporting(false);
                        }}
                        isExporting={isHeaderExporting}
                        onStartAutoSync={handleStartAutoSync}
                    >
                        {/* Revenue tab: KpiOverview + SummaryTableView merges into header container */}
                        {activeSubTab === 'revenue' && (
                            <div>
                                <KpiOverview
                                    isRealtime={isRealtimeView}
                                    kpiData={currentKpiData}
                                    targets={activeTargets}
                                    supermarketDailyTargets={supermarketDailyTargets}
                                    supermarketMonthlyTargets={supermarketMonthlyTargets}
                                    activeSupermarket={activeSupermarket}
                                    summaryLuyKeData={summaryLuyKe}
                                    onNavigateToUpdater={onNavigateToUpdater}
                                />
                                <SummaryTableView
                                    key={isRealtimeView ? 'summary-realtime' : 'summary-luyke'}
                                    ref={summaryTableRef}
                                    data={isRealtimeView ? summaryRealtimeParsed.table : summaryLuyKeParsed.table}
                                    isCumulative={!isRealtimeView}
                                    supermarketDailyTargets={supermarketDailyTargets}
                                    supermarketMonthlyTargets={supermarketMonthlyTargets}
                                    activeSupermarket={activeSupermarket}
                                    onExport={async () => { await handleExportPNG(summaryTableRef, `Bảng Doanh Thu${!isRealtimeView ? ' Lũy Kế' : ''} - ${activeSupermarket}`, null, { captureAsDisplayed: true }); }}
                                    updateTimestamp={isRealtimeView ? summaryRealtimeTs : null}
                                    supermarketTargets={supermarketTargets}
                                    useAdjustedTarget={useAdjustedTarget}
                                    setUseAdjustedTarget={setUseAdjustedTarget}
                                />
                            </div>
                        )}

                        {/* Competition tab: CompetitionView merges into header container */}
                        {activeSubTab === 'competition' && (
                            <CompetitionView
                                key={isRealtimeView ? 'competition-realtime' : 'competition-luyke'}
                                ref={competitionViewRef}
                                data={isRealtimeView ? augmentedRealtimeData : augmentedLuyKeData}
                                isRealtime={isRealtimeView}
                                activeSupermarket={activeSupermarket}
                                setActiveSupermarket={setActiveSupermarket}
                                onBatchExport={() => runBatchExport('competition')}
                                isBatchExporting={isBatchExportingCompetition}
                                updateTimestamp={isRealtimeView ? competitionRealtimeTs : competitionLuyKeTs}
                                onExport={async () => { await handleExportPNG(printableRef, `Thi Đua ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`, null, { fitAllColumns: true, fitWidthToTable: true }); }}
                                onNavigateToUpdater={onNavigateToUpdater}
                            />
                        )}
                    </DashboardHeader>
                </div>

                <div className="mt-3 sm:mt-4">
                    {activeSubTab === 'revenue' && activeSupermarket !== 'Tổng' && (isRealtimeView ? industryRealtimeParsed : industryLuyKeParsed) && (
                        <div className="js-industry-view-container">
                            <IndustryView
                                ref={industryTableRef}
                                isRealtime={isRealtimeView}
                                realtimeData={industryRealtimeParsed}
                                luykeData={industryLuyKeParsed}
                                activeSupermarket={activeSupermarket}
                                onExport={async () => { await handleExportPNG(industryTableRef, `Ngành Hàng ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`, null, { captureAsDisplayed: true }); }}
                            />
                        </div>
                    )}
                </div>
            </div>
            <ExportOptionsModal
                isOpen={!!exportOptions.pendingExport}
                onClose={exportOptions.handleClose}
                onDownload={exportOptions.handleDownload}
                onShare={exportOptions.handleShare}
                canShare={exportOptions.canShare}
                filename={exportOptions.pendingExport?.filename || ''}
            />
            {!onStartAutoSync && fallbackAutoSync.renderAutoSyncModal()}
        </ExportOptionsProvider>
    );
};

export default React.memo(Dashboard);
