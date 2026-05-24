
import React, { useRef, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Card from './Card';
import { UploadIcon, CogIcon } from './Icons';
import { Switch } from './dashboard/DashboardWidgets';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import SummaryTableView from './dashboard/SummaryTableView';
import CompetitionView from './dashboard/CompetitionView';
import IndustryView from './dashboard/IndustryView';
import DashboardHeader from './dashboard/DashboardHeader';
import KpiOverview from './dashboard/KpiOverview';
import * as db from '../utils/db';
import { useExportOptions } from '../../../hooks/useExportOptions';
import ExportOptionsModal from '../../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';

interface DashboardProps {
    onNavigateToUpdater: () => void;
}

const EmptyState: React.FC<{ onNavigate: () => void; onRestore: () => void; message?: string }> = ({ onNavigate, onRestore, message }) => (
    <div className="relative min-h-[calc(100vh-120px)] flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F8FAFC] dark:bg-[#0B0F19] selection:bg-indigo-500/20 selection:text-indigo-600 pb-8">
        
        {/* Ambient Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

        {/* Animated Glow Orbs */}
        <div className="absolute top-[10%] left-[20%] w-[200px] h-[200px] bg-indigo-500/30 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-pulse pointer-events-none"></div>
        <div className="absolute top-[10%] right-[20%] w-[200px] h-[200px] bg-purple-500/30 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-pulse [animation-delay:2s] pointer-events-none"></div>
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[250px] h-[250px] bg-blue-500/30 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-pulse [animation-delay:4s] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-[1000px] px-6 flex flex-col items-center text-center mt-4">
            
            {/* Hero Typography */}
            <div className="mb-4">
                <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3 drop-shadow-sm">
                    {message ? message : (<>Dữ liệu phức tạp.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-fuchsia-400 dark:to-cyan-400">Phân tích siêu tốc.</span></>)}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed tracking-tight">
                    Chuyển đổi tức thì hàng chục ngàn dòng báo cáo BI thành bảng phân tích trực quan.<br className="hidden sm:block"/>
                    Tối ưu hiệu suất bằng cách xử lý trực tiếp trên trình duyệt.
                </p>
            </div>

            {/* Main Action Area - Glass Card */}
            <div className="w-full max-w-md mt-2">
                <div className="relative group">
                    {/* Glow effect behind */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-blue-500/40 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                    
                    <div className="relative bg-white/70 dark:bg-[#111827]/70 backdrop-blur-3xl rounded-[24px] p-1.5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-white dark:ring-white/10">
                        <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-[20px] overflow-hidden border border-slate-100 dark:border-white/5 p-5">
                            
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50">
                                    <UploadIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                    <button
                                        onClick={onNavigate}
                                        className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-white bg-[#0584c7] hover:bg-[#046ca3] shadow-md shadow-[#0584c7]/20 transition-all active:scale-95"
                                    >
                                        Cập nhật dữ liệu
                                    </button>
                                    <span className="text-slate-400 dark:text-slate-500 hidden sm:block text-[11px] font-medium uppercase tracking-wider">hoặc</span>
                                    <button
                                        onClick={onRestore}
                                        className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-all active:scale-95"
                                    >
                                        <UploadIcon className="h-4 w-4" /> Khôi phục
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Trust Indicators */}
            <div className="mt-8 flex items-center justify-center gap-6 text-center">
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Local Processing</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Instant Speed</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Smart UI</span>
                </div>
            </div>

        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToUpdater }) => {
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
    } = useDashboardLogic();

    const printableRef = useRef<HTMLDivElement>(null);
    const summaryTableRef = useRef<HTMLDivElement>(null);
    const industryTableRef = useRef<HTMLDivElement>(null);
    const competitionViewRef = useRef<HTMLDivElement>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const columnSelectorRef = useRef<HTMLDivElement>(null);
    const exportOptions = useExportOptions();
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [isHeaderExporting, setIsHeaderExporting] = useState(false);

    // --- Restore Logic ---
    const handleRestoreClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error('Định dạng file không hợp lệ.');

                const parsedContent = JSON.parse(content);
                let dataToRestore: { key: string; value: any }[] = [];

                if (Array.isArray(parsedContent)) {
                    dataToRestore = parsedContent;
                } else if (parsedContent.data && Array.isArray(parsedContent.data)) {
                    dataToRestore = parsedContent.data;
                } else {
                    throw new Error('Cấu trúc file backup không hợp lệ.');
                }

                if (dataToRestore.length === 0) throw new Error('File backup rỗng.');

                await db.clearStore();
                await db.setMany(dataToRestore);

                const navState = {
                    'main-active-view': 'dashboard',
                    'dashboard-main-tab': 'realtime',
                    'dashboard-sub-tab': 'revenue',
                    'dashboard-active-supermarket': 'Tổng'
                };
                for (const [key, value] of Object.entries(navState)) {
                    await db.set(key, value);
                }

                // db.set() và db.setMany() mới đã tự bắn event indexeddb-change
                // nên không cần dispatch thêm

                // Tắt thông báo thành công theo yêu cầu
            } catch (error) {
                console.error('Restore failed:', error);
                toast.error(`Khôi phục thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- Export Logic Tối Ưu Tuyệt Đối Cho Bảng Báo Cáo ---
    const handleExportPNG = async (targetRef: React.RefObject<HTMLDivElement | null>, filenamePart: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        const original = targetRef.current;
        if (!original) return null;

        try {
            const safeName = filenamePart.replace(/[^a-zA-Z0-9]/g, '_');
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
                const prefix = mode === 'competition' ? `ThiDua_${activeMainTab}` : (mode === 'realtime' ? 'DoanhThu' : 'DoanhThu_LuyKe');
                const action = await handleExportPNG(targetRef, `${prefix}_${sm}`, autoAction);
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

    if (!hasRealtimeData && !hasCumulativeData) {
        return (
            <>
                <EmptyState onNavigate={onNavigateToUpdater} onRestore={handleRestoreClick} />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
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
                    onRestore={handleRestoreClick}
                    message={`Không có dữ liệu ${isRealtimeView ? 'Realtime' : 'Luỹ kế'}. Vui lòng cập nhật.`}
                />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
        );
    }

    return (
        <ExportOptionsProvider value={{ showExportOptions: exportOptions.showExportOptions }}>
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
                            await handleExportPNG(printableRef, `Dashboard_${activeSubTab}_${isRealtimeView ? 'RT' : 'LK'}_${activeSupermarket}`);
                            setIsHeaderExporting(false);
                        }}
                        isExporting={isHeaderExporting}
                    >
                        {/* Revenue tab: SummaryTableView merges into header container */}
                        {activeSubTab === 'revenue' && (
                            <div>
                                <SummaryTableView
                                    ref={summaryTableRef}
                                    data={isRealtimeView ? summaryRealtimeParsed.table : summaryLuyKeParsed.table}
                                    isCumulative={!isRealtimeView}
                                    supermarketDailyTargets={supermarketDailyTargets}
                                    supermarketMonthlyTargets={supermarketMonthlyTargets}
                                    activeSupermarket={activeSupermarket}
                                    onExport={async () => { await handleExportPNG(summaryTableRef, `BangDoanhThu${!isRealtimeView ? 'LuyKe' : ''}_${activeSupermarket}`); }}
                                    updateTimestamp={isRealtimeView ? summaryRealtimeTs : null}
                                    supermarketTargets={supermarketTargets}
                                />
                            </div>
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

                    {activeSubTab === 'competition' && (
                        <div className="mt-3 sm:mt-4">
                            <CompetitionView
                                ref={competitionViewRef}
                                data={isRealtimeView ? augmentedRealtimeData : augmentedLuyKeData}
                                isRealtime={isRealtimeView}
                                activeSupermarket={activeSupermarket}
                                setActiveSupermarket={setActiveSupermarket}
                                onBatchExport={() => runBatchExport('competition')}
                                isBatchExporting={isBatchExportingCompetition}
                                updateTimestamp={isRealtimeView ? competitionRealtimeTs : competitionLuyKeTs}
                                onExport={async () => { await handleExportPNG(printableRef, `ThiDua_${isRealtimeView ? 'RT' : 'LK'}_${activeSupermarket}`); }}
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
                                activeSupermarket={activeSupermarket}
                                onExport={async () => { await handleExportPNG(industryTableRef, `NganhHang_${isRealtimeView ? 'RT' : 'LK'}_${activeSupermarket}`); }}
                            />
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
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
