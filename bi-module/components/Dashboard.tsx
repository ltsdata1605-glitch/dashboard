
import React, { useRef } from 'react';
import Card from './Card';
import { UploadIcon } from './Icons';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import SummaryTableView from './dashboard/SummaryTableView';
import CompetitionView from './dashboard/CompetitionView';
import IndustryView from './dashboard/IndustryView';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardToolbar from './dashboard/DashboardToolbar';
import KpiOverview from './dashboard/KpiOverview';
import { SupermarketNavBar } from './dashboard/DashboardWidgets';
import * as db from '../utils/db';
import { useExportOptions } from '../../hooks/useExportOptions';
import ExportOptionsModal from '../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';

interface DashboardProps {
    onNavigateToUpdater: () => void;
}

const EmptyState: React.FC<{ onNavigate: () => void; onRestore: () => void; message?: string }> = ({ onNavigate, onRestore, message }) => (
    <div className="relative min-h-[calc(100vh-180px)] flex flex-col justify-center items-center overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19] selection:bg-indigo-500/20 rounded-xl">
        {/* Ambient Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        
        {/* Glow Orbs */}
        <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-sky-500/25 dark:bg-sky-600/15 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 pointer-events-none"></div>
        <div className="absolute top-[10%] right-[20%] w-[300px] h-[300px] bg-indigo-500/25 dark:bg-indigo-600/15 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-[800px] px-6 flex flex-col items-center text-center">
            {/* Badge */}
            <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-200/50 dark:border-sky-500/20 bg-white/80 dark:bg-sky-500/10 backdrop-blur-xl shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-800 dark:text-sky-300">Report BI Pro</span>
                </div>
            </div>

            {/* Hero Typography */}
            <div className="mb-6">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-4 drop-shadow-sm">
                    {message ? message : (<>Báo cáo BI.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400">Chuyên nghiệp.</span></>)}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
                    Tổng hợp doanh thu, thi đua và phân tích ngành hàng theo thời gian thực.<br className="hidden sm:block"/>
                    Cập nhật dữ liệu từ BI hoặc khôi phục từ file backup.
                </p>
            </div>

            {/* Action Card */}
            <div className="w-full max-w-md">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/30 via-blue-500/30 to-indigo-500/30 rounded-[24px] blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
                    <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-2xl p-6 shadow-lg ring-1 ring-slate-200/60 dark:ring-white/10">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                                <UploadIcon className="h-6 w-6 text-sky-500 dark:text-sky-400" />
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                <button 
                                    onClick={onNavigate} 
                                    className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-md shadow-sky-500/20 transition-all active:scale-95"
                                >
                                    Cập nhật dữ liệu
                                </button>
                                <span className="text-slate-300 dark:text-slate-600 hidden sm:block text-sm">hoặc</span>
                                <button 
                                    onClick={onRestore}
                                    className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm transition-all active:scale-95"
                                >
                                    <UploadIcon className="h-4 w-4" /> Khôi phục
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 grid grid-cols-3 gap-6 text-center">
                <div className="space-y-0.5">
                    <div className="flex justify-center text-slate-400 mb-1"><UploadIcon className="h-4 w-4" /></div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Dán & Cập nhật</p>
                    <p className="text-[10px] text-slate-500">Từ BI trực tiếp</p>
                </div>
                <div className="space-y-0.5">
                    <div className="flex justify-center text-slate-400 mb-1"><UploadIcon className="h-4 w-4" /></div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Offline Ready</p>
                    <p className="text-[10px] text-slate-500">Lưu trữ cục bộ IndexedDB</p>
                </div>
                <div className="space-y-0.5">
                    <div className="flex justify-center text-slate-400 mb-1"><UploadIcon className="h-4 w-4" /></div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Export Pro</p>
                    <p className="text-[10px] text-slate-500">Chia sẻ ảnh HD</p>
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const exportOptions = useExportOptions();

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
                alert(`❌ Khôi phục thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
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
            const filename = `BI_PRO_${safeName}_${new Date().toISOString().slice(0,10)}.png`;
            
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component', '.column-customizer', '.industry-view-controls', '#competition-view-controls', '.js-individual-view-toolbar']
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
                const targetRef = mode === 'competition' ? competitionViewRef : printableRef;
                const prefix = mode === 'competition' ? `ThiDua_${activeMainTab}` : (mode === 'realtime' ? 'DoanhThu' : 'DoanhThu_LuyKe');
                const action = await handleExportPNG(targetRef, `${prefix}_${sm}`, autoAction);
                if (action === 'cancel') break;
                autoAction = action;
            }
            alert('✅ Đã hoàn tất xuất hàng loạt cho tất cả siêu thị!');
        } catch (e) {
            console.error(e);
            alert('❌ Lỗi xuất hàng loạt.');
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
                <DashboardHeader title="Tổng quan Siêu thị" activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} />
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
        <div className="space-y-3 sm:space-y-6">
            <DashboardHeader title="Tổng quan Siêu thị" activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} />
            
            <div className="mt-3 sm:mt-8">
                <DashboardToolbar 
                    id={isRealtimeView ? "realtime-controls" : "cumulative-controls"}
                    activeSubTab={activeSubTab}
                    setActiveSubTab={setActiveSubTab}
                />
                
                <SupermarketNavBar 
                    supermarkets={supermarkets}
                    activeSupermarket={activeSupermarket}
                    setActiveSupermarket={setActiveSupermarket}
                    onBatchExport={() => {
                        if (activeSubTab === 'competition') runBatchExport('competition');
                        else runBatchExport(isRealtimeView ? 'realtime' : 'cumulative');
                    }}
                    isBatchExporting={isBatchExporting || isBatchExportingCumulative || isBatchExportingCompetition}
                />

                <div className="mt-3 sm:mt-8">
                    {activeSubTab === 'revenue' && (
                        <div ref={printableRef} className="space-y-3 sm:space-y-6">
                            <SummaryTableView 
                                ref={summaryTableRef}
                                data={isRealtimeView ? summaryRealtimeParsed.table : summaryLuyKeParsed.table} 
                                isCumulative={!isRealtimeView}
                                supermarketDailyTargets={supermarketDailyTargets} 
                                supermarketMonthlyTargets={supermarketMonthlyTargets}
                                activeSupermarket={activeSupermarket}
                                onExport={() => handleExportPNG(printableRef, `BangDoanhThu${!isRealtimeView ? 'LuyKe' : ''}_${activeSupermarket}`)}
                                updateTimestamp={isRealtimeView ? summaryRealtimeTs : null}
                                supermarketTargets={supermarketTargets}
                            />
                            
                            <KpiOverview 
                                isRealtime={isRealtimeView}
                                kpiData={currentKpiData}
                                targets={activeTargets}
                                supermarketDailyTargets={supermarketDailyTargets}
                                supermarketMonthlyTargets={supermarketMonthlyTargets}
                                activeSupermarket={activeSupermarket}
                            />

                            {activeSupermarket !== 'Tổng' && (
                                <div className="js-industry-view-container">
                                    <IndustryView 
                                        ref={industryTableRef}
                                        isRealtime={isRealtimeView} 
                                        realtimeData={industryRealtimeParsed} 
                                        luykeData={industryLuyKeParsed} 
                                        activeSupermarket={activeSupermarket}
                                        onExport={() => handleExportPNG(industryTableRef, `NganhHang_${isRealtimeView ? 'RT' : 'LK'}_${activeSupermarket}`)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeSubTab === 'competition' && (
                        <CompetitionView
                            ref={competitionViewRef}
                            data={isRealtimeView ? augmentedRealtimeData : augmentedLuyKeData}
                            isRealtime={isRealtimeView}
                            activeSupermarket={activeSupermarket}
                            setActiveSupermarket={setActiveSupermarket}
                            onBatchExport={() => runBatchExport('competition')}
                            isBatchExporting={isBatchExportingCompetition}
                            updateTimestamp={isRealtimeView ? competitionRealtimeTs : competitionLuyKeTs}
                            onExport={() => handleExportPNG(competitionViewRef, `ThiDua_${isRealtimeView ? 'RT' : 'LK'}_${activeSupermarket}`)}
                        />
                    )}
                </div>
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
