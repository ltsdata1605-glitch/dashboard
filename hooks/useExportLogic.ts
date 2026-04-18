
import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import type { Employee, ProcessedData, ProductConfig, FilterState } from '../types';
import { exportElementAsImage, downloadBlob, shareBlob, canShareFiles } from '../services/uiService';
import type { ExportMode } from '../services/uiService';
import PerformanceModal from '../components/modals/PerformanceModal';

export interface PendingExport {
    blob: Blob;
    filename: string;
}

interface ExportLogicProps {
    productConfig: ProductConfig | null;
    processedData: ProcessedData | null;
    uniqueFilterOptions: { kho: string[] };
    filterState: FilterState;
    handleFilterChange: (newFilters: Partial<FilterState>) => void;
    setStatus: (status: { message: string; type: 'info' | 'success' | 'error'; progress: number }) => void;
}

export const useExportLogic = ({
    productConfig,
    processedData,
    uniqueFilterOptions,
    filterState,
    handleFilterChange,
    setStatus
}: ExportLogicProps) => {
    const [isExporting, setIsExporting] = useState(false);
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

    const handleExport = async (element: HTMLElement | null, filename: string, options: any = {}) => {
        if (element) {
            setIsExporting(true);
            await new Promise(resolve => setTimeout(resolve, 150));
            const exportOptions = {
                elementsToHide: ['.hide-on-export'],
                mode: 'blob-only' as ExportMode,
                ...options
            };
            const blob = await exportElementAsImage(element, filename, exportOptions);
            setIsExporting(false);
            if (blob) {
                const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
                if (!isMobile) {
                    downloadBlob(blob, filename);
                } else {
                    setPendingExport({ blob, filename });
                }
            }
        }
    };

    const handlePendingDownload = useCallback(() => {
        if (pendingExport) {
            downloadBlob(pendingExport.blob, pendingExport.filename);
            setPendingExport(null);
        }
    }, [pendingExport]);

    const handlePendingShare = useCallback(async () => {
        if (pendingExport) {
            await shareBlob(pendingExport.blob, pendingExport.filename);
            setPendingExport(null);
        }
    }, [pendingExport]);

    const handlePendingClose = useCallback(() => {
        setPendingExport(null);
    }, []);

    const handleBatchExport = async (employeesToExport: Employee[]) => {
        if (!employeesToExport.length || !productConfig || !processedData) return;
        setIsExporting(true);
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.cssText = 'position: absolute; left: -9999px; top: 0;';
        document.body.appendChild(offscreenContainer);
        const root = ReactDOM.createRoot(offscreenContainer);
        try {
            for (const employee of employeesToExport) {
                await new Promise<void>(resolve => {
                    root.render(
                        React.createElement(PerformanceModal, {
                            isOpen: true,
                            onClose: () => {},
                            employeeName: employee.name,
                            fullSellerArray: processedData.employeeData.fullSellerArray,
                            validSalesData: processedData.filteredValidSalesData,
                            productConfig: productConfig,
                            onExport: async (el: HTMLElement, fn: string, opts?: any) => { await exportElementAsImage(el, fn, opts); },
                            isBatchExporting: true
                        })
                    );
                    setTimeout(resolve, 1000);
                });
                const modalContent = offscreenContainer.querySelector('.modal-content');
                if (modalContent) {
                    const filename = `phan-tich-hieu-qua-${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                    await exportElementAsImage(modalContent as HTMLElement, filename, { scale: 2, forceOpenDetails: true });
                }
            }
        } finally {
            setIsExporting(false);
            root.unmount();
            document.body.removeChild(offscreenContainer);
        }
    };

    const handleBatchKhoExport = async () => {
        if (uniqueFilterOptions.kho.length <= 1) {
            setStatus({ message: 'Chỉ có một kho, không thể xuất hàng loạt.', type: 'error', progress: 0 });
            return;
        }
    
        setIsExporting(true);
        const originalKho = filterState.kho;
    
        try {
            const khosToExport = uniqueFilterOptions.kho.filter(k => k && k !== 'all');
            const overviewElement = document.getElementById('business-overview');
            const warehouseElement = document.getElementById('warehouse-summary-view');

            if (!overviewElement || !warehouseElement) {
                throw new Error('Không tìm thấy thành phần cần xuất (#business-overview or #warehouse-summary-view).');
            }
    
            for (const kho of khosToExport) {
                handleFilterChange({ kho: [kho] });
                await new Promise(resolve => setTimeout(resolve, 1500));
    
                let rowToHighlight: Element | null = warehouseElement.querySelector(`tr[data-kho-id="${kho}"]`);
                if (rowToHighlight) {
                    rowToHighlight.classList.add('is-highlighted-for-export');
                }
                
                await new Promise(resolve => setTimeout(resolve, 200)); // Short delay for highlight to render

                // Export #1: Business Overview
                await exportElementAsImage(overviewElement, `tong-quan-kinh-doanh-${kho}.png`, {
                    elementsToHide: ['.hide-on-export'],
                    captureAsDisplayed: false,
                    isCompactTable: true,
                    forcedWidth: 700,
                });

                await new Promise(resolve => setTimeout(resolve, 800));
    
                // Export #2: Warehouse Summary
                await exportElementAsImage(warehouseElement, `bao-cao-kho-${kho}.png`, {
                    elementsToHide: ['.hide-on-export'],
                    captureAsDisplayed: true,
                });
                
                if (rowToHighlight) {
                    rowToHighlight.classList.remove('is-highlighted-for-export');
                }
            }
        } catch (error) {
            console.error("Lỗi khi xuất hàng loạt theo kho:", error);
            setStatus({ message: 'Đã xảy ra lỗi trong quá trình xuất hàng loạt.', type: 'error', progress: 0 });
        } finally {
            handleFilterChange({ kho: originalKho });
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            setIsExporting(false);
        }
    };

    return {
        isExporting,
        handleExport,
        handleBatchExport,
        handleBatchKhoExport,
        pendingExport,
        handlePendingDownload,
        handlePendingShare,
        handlePendingClose,
    };
};
