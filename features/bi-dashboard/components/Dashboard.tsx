
import React, { useRef, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { UploadIcon } from './Icons';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import SummaryTableView from './dashboard/SummaryTableView';
import CompetitionView from './dashboard/CompetitionView';
import IndustryView from './dashboard/IndustryView';
import DashboardHeader from './dashboard/DashboardHeader';
import KpiOverview from './dashboard/KpiOverview';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { useExportOptions } from '../hooks/useExportOptions';
import ExportOptionsModal from '../../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { exportElementAsImage, downloadBlob, shareBlob } from '../services/uiService';
import { Button } from '../../../components/shared/ui/Button';
import { FeatureLandingLayout } from '../../../components/shared/ui';

interface DashboardProps {
    onNavigateToUpdater: (options?: { configTab?: 'data' | 'revenueTarget' | 'competitionTarget'; supermarketName?: string; scrollToConfig?: boolean }) => void;
    isActive?: boolean;
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

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToUpdater, isActive }) => {
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
            }
            return null;
        } catch (err) {
            console.error('Export error', err);
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
                const action = await handleExportPNG(targetRef, `${label} - ${sm}`, autoAction);
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
                    activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab}
                    activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab}
                    supermarkets={supermarkets} activeSupermarket={activeSupermarket} setActiveSupermarket={setActiveSupermarket}
                    onBatchExport={() => { }} isBatchExporting={false}
                />
                <EmptyState
                    onNavigate={onNavigateToUpdater}
                    message={`Không có dữ liệu ${isRealtimeView ? 'Realtime' : 'Luỹ kế'}. Vui lòng cập nhật.`}
                />
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
                            const exportTarget = (activeSubTab === 'revenue' && activeSupermarket !== 'Tổng' && pageRef.current) ? pageRef : printableRef;
                            const subTabLabel = activeSubTab === 'competition' ? 'Thi Đua' : 'Doanh Thu';
                            await handleExportPNG(exportTarget, `${subTabLabel} ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`);
                            setIsHeaderExporting(false);
                        }}
                        isExporting={isHeaderExporting}
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
                                    onExport={async () => { await handleExportPNG(summaryTableRef, `Bảng Doanh Thu${!isRealtimeView ? ' Lũy Kế' : ''} - ${activeSupermarket}`); }}
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
                                onExport={async () => { await handleExportPNG(industryTableRef, `Ngành Hàng ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`); }}
                            />
                        </div>
                    )}
                </div>
                <ExportOptionsModal
                    isOpen={!!exportOptions.pendingExport}
                    onClose={exportOptions.handleClose}
                    onDownload={exportOptions.handleDownload}
                    onShare={exportOptions.handleShare}
                    canShare={exportOptions.canShare}
                    filename={exportOptions.pendingExport?.filename || ''}
                />
            </div>
        </ExportOptionsProvider>
    );
};

export default React.memo(Dashboard);
