
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
    const handleExportPNG = async (targetRef: React.RefObject<HTMLDivElement | null>, filenamePart: string) => {
        const original = targetRef.current;
        if (!original || !(window as any).html2canvas) return;
        
        const isCompetitionExport = activeSubTab === 'competition';
        const clone = original.cloneNode(true) as HTMLElement;
        
        // Cấu hình virtual container cho Export - Ưu tiên thu gọn tối đa
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = 'max-content'; // Cho phép bảng co giãn theo nội dung
        clone.style.minWidth = '600px'; 
        clone.style.maxWidth = 'none';
        clone.style.height = 'auto';
        clone.style.transform = 'none';
        
        const isDarkMode = document.documentElement.classList.contains('dark');
        const bgColor = isDarkMode ? '#0f172a' : '#ffffff';
        const borderColor = isDarkMode ? '#1e293b' : '#e2e8f0';

        clone.style.backgroundColor = bgColor;
        if (isDarkMode) clone.classList.add('dark');
        clone.classList.add('export-mode');

        // BÓC TÁCH VÀ TRIỆT TIÊU KHOẢNG CÁCH
        clone.classList.remove('space-y-4', 'space-y-6', 'space-y-8');
        clone.style.display = 'flex';
        clone.style.flexDirection = 'column';
        clone.style.gap = '0px'; 
        clone.style.padding = '4px'; // GIẢM PADDING 4 BÊN XUỐNG TỐI THIỂU
        clone.style.border = `1px solid ${borderColor}`; 

        // Loại bỏ các thành phần không cần thiết
        clone.querySelectorAll('.no-print, .export-button-component, .column-customizer, .industry-view-controls, #competition-view-controls, .js-individual-view-toolbar').forEach(el => (el as HTMLElement).style.display = 'none');
        
        // Tối ưu hóa bảng trong clone
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            const htmlTable = table as HTMLElement;
            htmlTable.style.width = 'max-content'; // Fix độ rộng vừa nội dung
            htmlTable.style.minWidth = '100%';
            htmlTable.style.tableLayout = 'auto';
            
            // Ép font chữ lớn hơn một chút để dễ đọc trên Mobile khi thu nhỏ
            htmlTable.querySelectorAll('th, td').forEach(cell => {
                const htmlCell = cell as HTMLElement;
                htmlCell.style.fontSize = '12px';
                htmlCell.style.padding = '8px 6px';
                htmlCell.style.whiteSpace = 'nowrap';
                htmlCell.style.minWidth = 'auto';
                htmlCell.style.width = 'auto';
            });
        });

        // Loại bỏ bo góc và shadow để tạo khối phẳng chuyên nghiệp
        clone.querySelectorAll('.bg-white, .dark\\:bg-slate-800, .bg-slate-900').forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.borderRadius = '0px';
            htmlEl.style.border = 'none';
            htmlEl.style.boxShadow = 'none';
            htmlEl.style.marginBottom = '0px';
        });

        document.body.appendChild(clone);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Xử lý tiêu đề cho bảng Doanh Thu
            if (!isCompetitionExport) {
                const titleElements = clone.querySelectorAll('.card-title-text');
                titleElements.forEach(titleElement => {
                    const htmlTitle = titleElement as HTMLElement;
                    htmlTitle.style.display = 'block'; 
                    htmlTitle.style.width = '100%';
                    htmlTitle.style.textAlign = 'center';
                    htmlTitle.style.padding = '8px 0'; // Giảm padding dọc tiêu đề
                    
                    const mainSpan = htmlTitle.querySelector('span') as HTMLElement;
                    if (mainSpan) {
                        mainSpan.style.fontSize = '28px';
                        mainSpan.style.fontWeight = '900';
                        mainSpan.style.color = isDarkMode ? '#38bdf8' : '#0369a1';
                        mainSpan.style.lineHeight = '1.1';
                        mainSpan.style.letterSpacing = '-0.02em';
                    }
                });

                // Ẩn thanh header xám thừa
                clone.querySelectorAll('.card-header-container').forEach(el => {
                    const container = el as HTMLElement;
                    if (!container.querySelector('.card-title-text')) {
                        container.style.display = 'none';
                    } else {
                        container.style.border = 'none';
                        container.style.backgroundColor = 'transparent';
                        container.style.padding = '0';
                    }
                });
            }

            const canvas = await (window as any).html2canvas(clone, { 
                scale: 3, // Độ nét cực cao cho mobile
                useCORS: true, 
                backgroundColor: bgColor,
                width: clone.scrollWidth,
                height: clone.scrollHeight,
                logging: false,
                windowWidth: clone.scrollWidth,
                windowHeight: clone.scrollHeight
            });
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const safeName = filenamePart.replace(/[^a-zA-Z0-9]/g, '_');
                const filename = `BI_PRO_${safeName}_${new Date().toISOString().slice(0,10)}.png`;
                exportOptions.showExportOptions(blob, filename);
            }
        } catch (err) {
            console.error('Export error', err);
        } finally {
            document.body.removeChild(clone);
        }
    };

    const runBatchExport = async (mode: 'realtime' | 'cumulative' | 'competition') => {
        const setExporting = mode === 'competition' ? setIsBatchExportingCompetition : (mode === 'realtime' ? setIsBatchExporting : setIsBatchExportingCumulative);
        setExporting(true);
        const originalSm = activeSupermarket;
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        
        try {
            for (const sm of ['Tổng', ...supermarkets]) {
                setActiveSupermarket(sm);
                await sleep(1500);
                const targetRef = mode === 'competition' ? competitionViewRef : printableRef;
                const prefix = mode === 'competition' ? `ThiDua_${activeMainTab}` : (mode === 'realtime' ? 'DoanhThu' : 'DoanhThu_LuyKe');
                await handleExportPNG(targetRef, `${prefix}_${sm}`);
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
