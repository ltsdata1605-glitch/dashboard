
import React, { useRef, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { UploadIcon } from './Icons';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import SummaryTableView from './dashboard/SummaryTableView';
import CompetitionView from './dashboard/CompetitionView';
import IndustryView from './dashboard/IndustryView';
import DashboardHeader from './dashboard/DashboardHeader';
import KpiOverview from './dashboard/KpiOverview';
import { useExportOptions } from '../hooks/useExportOptions';
import ExportOptionsModal from '../../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { exportElementAsImage, downloadBlob, shareBlob } from '../services/uiService';
import { Button } from '../../../components/shared/ui/Button';

interface DashboardProps {
    onNavigateToUpdater: (options?: { configTab?: 'data' | 'revenueTarget' | 'competitionTarget' }) => void;
    isActive?: boolean;
}

/**
 * Màn hình khi CHƯA có dữ liệu — chuẩn "Bảng điều khiển ca trực" (2026-09-11).
 *
 * Bản cũ có: lưới nền mờ dần theo mask hình elip, 3 quả cầu phát sáng `blur-[100px]`
 * `mix-blend-multiply` `animate-pulse` lệch pha nhau, chữ tiêu đề tô gradient 3 chặng, thẻ kính
 * `backdrop-blur-3xl` lồng 2 lớp bo góc kèm quầng sáng hiện khi rê chuột.
 *
 * Bỏ hết. Nguyên tắc gốc của chuẩn: **mỗi pixel dành cho số, không dành cho trang trí** — và ở màn
 * này người dùng chỉ cần biết ĐÚNG MỘT việc: chưa có dữ liệu thì bấm vào đâu. Ba quả cầu
 * `animate-pulse` còn tốn CPU vẽ lại liên tục trên chính loại laptop cũ mà chuẩn này nhắm tới.
 *
 * Giữ nguyên: nội dung chữ, 2 nút hành động, dải nhãn chân trang.
 */
const EmptyState: React.FC<{ onNavigate: () => void; message?: string }> = ({ onNavigate, message }) => (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-center items-center font-sans bg-slate-50 dark:bg-slate-900 pb-8">
        <div className="w-full max-w-[1000px] px-6 flex flex-col items-center text-center mt-4">

            <div className="mb-4">
                <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3">
                    {message ? message : (<>Dữ liệu phức tạp.<br/><span className="text-sky-700 dark:text-sky-400">Phân tích siêu tốc.</span></>)}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
                    Chuyển đổi tức thì hàng chục ngàn dòng báo cáo BI thành bảng phân tích trực quan.<br className="hidden sm:block"/>
                    Tối ưu hiệu suất bằng cách xử lý trực tiếp trên trình duyệt.
                </p>
            </div>

            <div className="w-full max-w-md mt-2">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            <UploadIcon className="h-6 w-6 text-sky-700 dark:text-sky-400" />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <Button
                                variant="unstyled" size="none"
                                onClick={onNavigate}
                                className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded text-white bg-sky-600 hover:bg-sky-700 transition-colors"
                            >
                                Cập nhật dữ liệu
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Local Processing</span>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Instant Speed</span>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Smart UI</span>
            </div>

        </div>
    </div>
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
        hasRealtimeData,
        hasCumulativeData
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
    const handleExportPNG = async (targetRef: React.RefObject<HTMLDivElement | null>, filenamePart: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        const original = targetRef.current;
        if (!original) return null;

        try {
            const safeName = filenamePart.replace(/[\\/:*?"<>|]/g, '_');
            const filename = `BI_PRO_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;

            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component', '.column-customizer', '.industry-view-controls', '#competition-view-controls', '.js-individual-view-toolbar', '.hide-on-export']
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
    const activeTargets = supermarketTargets[activeSupermarket] || { quyDoi: 40, traGop: 45 };

    if (!hasData) {
        return (
            <div className="space-y-6">
                <DashboardHeader
                    title="Tổng quan Siêu thị"
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
                        title="Tổng quan Siêu thị"
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
                            // Export everything inside printableRef for both tabs
                            const subTabLabel = activeSubTab === 'competition' ? 'Thi Đua' : 'Doanh Thu';
                            await handleExportPNG(printableRef, `${subTabLabel} ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`);
                            setIsHeaderExporting(false);
                        }}
                        isExporting={isHeaderExporting}
                    >
                        {/* Revenue tab: SummaryTableView merges into header container */}
                        {activeSubTab === 'revenue' && (
                            <div>
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
                                onExport={async () => { await handleExportPNG(printableRef, `Thi Đua ${isRealtimeView ? 'Thời Gian Thực' : 'Lũy Kế'} - ${activeSupermarket}`); }}
                                onNavigateToUpdater={onNavigateToUpdater}
                            />
                        )}
                    </DashboardHeader>

                    {activeSubTab === 'revenue' && (
                        <div className="mt-3 sm:mt-4">
                            <KpiOverview
                                isRealtime={isRealtimeView}
                                kpiData={currentKpiData}
                                targets={activeTargets}
                                supermarketDailyTargets={supermarketDailyTargets}
                                supermarketMonthlyTargets={supermarketMonthlyTargets}
                                activeSupermarket={activeSupermarket}
                            />
                        </div>
                    )}
                </div>

                <div className="mt-3 sm:mt-4">
                    {activeSubTab === 'revenue' && activeSupermarket !== 'Tổng' && (
                        <div className="js-industry-view-container">
                            <IndustryView
                                ref={industryTableRef}
                                isRealtime={isRealtimeView}
                                realtimeData={industryRealtimeParsed}
                                luykeData={industryLuyKeParsed}
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
