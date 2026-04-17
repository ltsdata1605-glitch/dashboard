
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
    <Card title="Chưa có dữ liệu">
        <div className="mt-4 text-center py-10">
            <UploadIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-300">{message || "Hãy bắt đầu bằng cách cập nhật báo cáo mới nhất."}</p>
            
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                    onClick={onNavigate} 
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent text-sm font-semibold rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                    <UploadIcon className="h-5 w-5" />
                    <span>Đi đến trang cập nhật</span>
                </button>
                <button 
                    onClick={onRestore}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 border-slate-600 text-sm font-semibold rounded-full shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                    <UploadIcon className="h-5 w-5" />
                    <span>Khôi phục từ File</span>
                </button>
            </div>
        </div>
    </Card>
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

                const keysToNotify = [
                    ...Object.keys(navState),
                    'summary-realtime',
                    'summary-luy-ke',
                    'competition-realtime',
                    'competition-luy-ke',
                    'supermarket-list'
                ];
                keysToNotify.forEach(key => {
                    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
                });

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
                elementsToHide: ['.no-print', '.export-button-component', '.column-customizer', '.industry-view-controls', '#competition-view-controls', '.js-individual-view-toolbar']
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
        <div className="space-y-6">
            <DashboardHeader title="Tổng quan Siêu thị" activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} />
            
            <div className="mt-8">
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

                <div className="mt-8">
                    {activeSubTab === 'revenue' && (
                        <div ref={printableRef} className="space-y-6">
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

export default Dashboard;
