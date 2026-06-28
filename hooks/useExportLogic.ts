
import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import type { Employee, ProcessedData, ProductConfig, FilterState, PendingExport } from '../types';
import { exportElementAsImage, downloadBlob, shareBlob, canShareFiles, showExportOverlay, updateExportOverlay, hideExportOverlay } from '../services/uiService';
import type { ExportMode } from '../services/uiService';
import { COL } from '../constants';
import { getRowValue } from '../utils/dataUtils';

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
            showExportOverlay('Đang xuất ảnh...');
            await new Promise(resolve => setTimeout(resolve, 150));
            const exportOptions = {
                elementsToHide: ['.hide-on-export'],
                mode: 'blob-only' as ExportMode,
                ...options
            };
            const blob = await exportElementAsImage(element, filename, exportOptions);
            setIsExporting(false);
            hideExportOverlay();
            if (blob) {
                const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
                if (!isMobile) {
                    downloadBlob(blob, filename);
                } else {
                    await shareBlob(blob, filename);
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
        const total = employeesToExport.length;
        showExportOverlay('Đang xuất ảnh hàng loạt...', `0/${total}`);
        
        // Dynamically import PerformanceModal to break circular dependency
        const { default: PerformanceModal } = await import('../components/modals/PerformanceModal');

        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.cssText = 'position: absolute; left: -9999px; top: 0;';
        document.body.appendChild(offscreenContainer);
        const root = ReactDOM.createRoot(offscreenContainer);
        try {
            for (let i = 0; i < employeesToExport.length; i++) {
                const employee = employeesToExport[i];
                updateExportOverlay(`Đang xuất: ${employee.name}`, `${i + 1}/${total}`);
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
                    setTimeout(resolve, 800);
                });
                const modalContent = offscreenContainer.querySelector('.modal-content');
                if (modalContent) {
                    const filename = `phan-tich-hieu-qua-${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                    await exportElementAsImage(modalContent as HTMLElement, filename, { scale: 2, forceOpenDetails: true, forcedWidth: 960 });
                }
                // Memory pressure relief: clear render + yield to GC between exports
                root.render(null);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } finally {
            setIsExporting(false);
            hideExportOverlay();
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
            const total = khosToExport.length + 1; // +1 for warehouse summary
            showExportOverlay('Đang xuất báo cáo kho...', `1/${total}`);
            const overviewElement = document.getElementById('business-overview');
            const warehouseElement = document.getElementById('warehouse-summary-view');

            if (!overviewElement || !warehouseElement) {
                throw new Error('Không tìm thấy thành phần cần xuất (#business-overview or #warehouse-summary-view).');
            }

            // Export warehouse summary once (all khos, no highlight)
            updateExportOverlay('Đang xuất: Tổng hợp kho', `1/${total}`);
            handleFilterChange({ kho: [] }); // Reset to show all
            await new Promise(resolve => setTimeout(resolve, 1500));
            await exportElementAsImage(warehouseElement, `bao-cao-kho-tong-hop.png`, {
                elementsToHide: ['.hide-on-export'],
            });
            await new Promise(resolve => setTimeout(resolve, 800));
    
            // Then export business overview per kho
            for (let i = 0; i < khosToExport.length; i++) {
                const kho = khosToExport[i];
                updateExportOverlay(`Đang xuất: ${kho}`, `${i + 2}/${total}`);
                handleFilterChange({ kho: [kho] });
                await new Promise(resolve => setTimeout(resolve, 1500));

                await exportElementAsImage(overviewElement, `tong-quan-kinh-doanh-${kho}.png`, {
                    elementsToHide: ['.hide-on-export'],
                    captureAsDisplayed: true,
                });

                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (error) {
            console.error("Lỗi khi xuất hàng loạt theo kho:", error);
            setStatus({ message: 'Đã xảy ra lỗi trong quá trình xuất hàng loạt.', type: 'error', progress: 0 });
        } finally {
            handleFilterChange({ kho: originalKho });
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            setIsExporting(false);
            hideExportOverlay();
        }
    };

    const handleExportUncollectedSheet = async () => {
        if (!processedData?.uncollectedOrders || processedData.uncollectedOrders.length === 0) {
            setStatus({ message: 'Không có đơn hàng chưa thu | chưa hủy nào để xuất.', type: 'error', progress: 0 });
            return;
        }

        const toastEl = document.createElement('div');
        toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .2s';
        toastEl.textContent = '📊 Đang tạo Google Sheet...';
        document.body.appendChild(toastEl);

        try {
            toastEl.textContent = '🔑 Đang xác thực Google...';
            sessionStorage.removeItem('googleOAuthToken');
            const { loginWithGoogleForceConsent } = await import('../services/firebase');
            await loginWithGoogleForceConsent();
            let token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Không thể lấy token xác thực.');

            toastEl.textContent = '📊 Đang tạo Google Sheet...';
            const { exportToGoogleSheet } = await import('../services/googleSheetsService');

            const headers = [
                'Kho tạo',
                'Người tạo',
                'Mã đơn hàng',
                'Mã sản phẩm',
                'Tên sản phẩm',
                'Số lượng',
                'Trạng thái thu tiền',
                'Trạng thái xuất',
                'Trạng thái giao hàng',
                'Trạng thái hủy'
            ];

            const rows = processedData.uncollectedOrders.map(order => [
                getRowValue(order, COL.KHO_TAO) || '',
                getRowValue(order, COL.NGUOI_TAO) || '',
                getRowValue(order, COL.ID) || '',
                getRowValue(order, COL.PRODUCT_CODE) || '',
                getRowValue(order, COL.PRODUCT) || '',
                Number(getRowValue(order, COL.QUANTITY)) || 0,
                getRowValue(order, COL.TRANG_THAI_THU_TIEN) || '',
                getRowValue(order, COL.XUAT) || '',
                getRowValue(order, COL.TRANG_THAI_GIAO_HANG) || '',
                getRowValue(order, COL.TRANG_THAI_HUY) || ''
            ]);

            // Sắp xếp các dòng theo tên cột "Người tạo" (Index 1)
            const extractName = (val: string | number) => {
                const s = String(val);
                const parts = s.split('-');
                return parts.length > 1 ? parts.slice(1).join('-').trim() : s.trim();
            };
            rows.sort((a, b) => {
                const nameA = extractName(a[1]);
                const nameB = extractName(b[1]);
                return nameA.localeCompare(nameB, 'vi');
            });

            const now = new Date();
            const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            toastEl.textContent = `📊 Đang ghi ${rows.length} đơn hàng...`;

            const url = await exportToGoogleSheet(token, {
                title: `Đơn Hàng Chưa Thu Chưa Hủy - ${dateStr} ${timeStr}`,
                headers,
                rows,
                sheetName: 'ChuaThuChuaHuy'
            });

            // Build employee tags and copy clipboard message
            const uniqueCreators = new Set<string>();
            processedData.uncollectedOrders.forEach(order => {
                const creator = getRowValue(order, COL.NGUOI_TAO);
                if (creator) {
                    uniqueCreators.add(creator.toString().trim());
                }
            });
            const employeeTags = Array.from(uniqueCreators).map(creatorName => {
                const match = creatorName.match(/^(\d+)/);
                return match ? `@${match[1]}` : `@${creatorName}`;
            });

            const clipboardMessage = `Các bạn hoàn tất xử lý và giải trình đơn CHƯA THU | CHƯA HỦY:

Hoàn tất và giải trình xoá tên:
${employeeTags.join('\n')}

Link: ${url}`;

            await navigator.clipboard.writeText(clipboardMessage);

            // Show success toast with link button
            toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:14px 20px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:opacity .2s;display:flex;flex-direction:column;gap:10px;max-width:420px;width:90vw';
            toastEl.innerHTML = '';

            const msgDiv = document.createElement('div');
            msgDiv.textContent = '✅ Đã tạo Google Sheet & sao chép tin nhắn!';
            msgDiv.style.fontWeight = '600';
            toastEl.appendChild(msgDiv);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

            const openBtn = document.createElement('a');
            openBtn.href = url;
            openBtn.target = '_blank';
            openBtn.textContent = '📄 Mở Sheet';
            openBtn.style.cssText = 'padding:6px 14px;background:#fff;color:#16a34a;border-radius:8px;font-weight:700;font-size:12px;text-decoration:none;cursor:pointer';

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Đóng';
            closeBtn.style.cssText = 'padding:6px 14px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer';
            closeBtn.onclick = () => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); };

            btnRow.appendChild(openBtn);
            btnRow.appendChild(closeBtn);
            toastEl.appendChild(btnRow);

            setTimeout(() => {
                if (toastEl.parentNode) {
                    toastEl.style.opacity = '0';
                    setTimeout(() => toastEl.remove(), 200);
                }
            }, 10000); // 10s auto close

        } catch (error: any) {
            console.error("Lỗi khi xuất google sheet:", error);
            toastEl.style.backgroundColor = '#dc2626';
            toastEl.textContent = `❌ Lỗi: ${error?.message || 'Không thể xuất file'}`;
            setTimeout(() => {
                toastEl.style.opacity = '0';
                setTimeout(() => toastEl.remove(), 200);
            }, 4000);
        }
    };

    return {
        isExporting,
        handleExport,
        handleBatchExport,
        handleBatchKhoExport,
        handleExportUncollectedSheet,
        pendingExport,
        handlePendingDownload,
        handlePendingShare,
        handlePendingClose,
    };
};
