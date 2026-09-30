
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { Employee, ProcessedData, ProductConfig, FilterState, PendingExport } from '../types';
import { offerBatchShare, type BatchShareFile } from '../components/shared/ui/BatchShareToast';
import { isMobileLikeDevice } from '../utils/dataUtils';
import { exportElementAsImage, downloadBlob, shareBlob, canShareFiles, showExportOverlay, updateExportOverlay, hideExportOverlay } from '../services/uiService';
import type { ExportMode } from '../services/uiService';
import { COL, CATEGORY_TABLE_CLASS, getCategoryExportWidth } from '../constants';
import { getRowValue, getErrorMessage, sanitizeFilename } from '../utils/dataUtils';
import toast from 'react-hot-toast';
import { describeBatchOutcome, sameKhoSelection, waitUntil } from '../services/batchExportResult';
import type { BatchItemOutcome } from '../services/batchExportResult';

// Khớp phần destructure của exportElementAsImage (services/uiService.ts) — hàm đó vẫn nhận any,
// chỉ gõ kiểu phần gọi ở hook này. Export để DashboardContext.tsx dùng lại.
export interface ExportImageOptions {
    elementsToHide?: string[];
    forceOpenDetails?: boolean;
    scale?: number;
    isCompactTable?: boolean;
    captureAsDisplayed?: boolean;
    forcedWidth?: number | null;
    fitCategoryColumn?: boolean;
    fitAllColumns?: boolean;
    mode?: ExportMode;
    onCloneReady?: ((clone: HTMLElement) => void) | null;
}

interface ExportLogicProps {
    productConfig: ProductConfig | null;
    processedData: ProcessedData | null;
    uniqueFilterOptions: { kho: string[] };
    filterState: FilterState;
    handleFilterChange: (newFilters: Partial<FilterState>) => void;
    setStatus: (status: { message: string; type: 'info' | 'success' | 'error'; progress: number }) => void;
    /** Cờ Worker đang tính lại processedData sau khi đổi filter — dùng để handleBatchKhoExport
     *  đợi ĐÚNG lúc dữ liệu Kho mới đã sẵn sàng thay vì chỉ dựa vào timeout cố định. */
    isFilterProcessing?: boolean;
    /** Bộ lọc mà processedData đang hiển thị được tính cho (useDataManagement) — batch theo Kho chỉ
     *  chụp khi nó ĐÚNG là filterState hiện tại (cùng object) và đúng Kho yêu cầu. */
    processedFilterState?: FilterState | null;
}

/** Báo kết quả batch theo số ảnh xuất được THẬT (audit A03/A04). */
const reportBatchOutcome = (items: BatchItemOutcome[], fatalError?: unknown) => {
    const { type, message } = describeBatchOutcome(items, fatalError);
    if (type === 'success') toast.success(message, { id: 'batch-export-result', duration: 4000 });
    else toast.error(message, { id: 'batch-export-result', duration: 12000 });
};

/**
 * Điện thoại chia sẻ được tệp: gom ảnh cả lô rồi chia sẻ MỘT lần (components/shared/ui/BatchShareToast).
 * Trước đây mỗi ảnh gọi share riêng không chờ → iOS từ chối ngay từ ảnh đầu, để lại N thông báo "chạm
 * lại" chồng nhau. Trả về `mode` cho exportElementAsImage + hàm giao cả lô sau khi xong.
 */
const taoBoGomAnh = () => {
    const gom = isMobileLikeDevice() && typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
    const files: BatchShareFile[] = [];
    return {
        mode: (gom ? 'blob-only' : 'download') as 'blob-only' | 'download',
        them: (blob: Blob | null, filename: string) => { if (gom && blob) files.push({ blob, filename }); },
        giao: () => {
            if (!gom || files.length === 0) return;
            offerBatchShare(files, () => files.forEach(f => downloadBlob(f.blob, f.filename, true)));
        },
    };
};

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export const useExportLogic = ({
    productConfig,
    processedData,
    uniqueFilterOptions,
    filterState,
    handleFilterChange,
    setStatus,
    isFilterProcessing,
    processedFilterState
}: ExportLogicProps) => {
    const [isExporting, setIsExporting] = useState(false);
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

    // Ref gương của isFilterProcessing — handleBatchKhoExport là 1 useCallback chạy vòng lặp
    // async dài, closure của nó chỉ thấy giá trị prop LÚC TẠO callback, không tự cập nhật theo
    // state mới trong lúc đang chạy. Ref cho phép đọc giá trị TƯƠI ngay trong vòng lặp.
    const isFilterProcessingRef = useRef(isFilterProcessing);
    useEffect(() => {
        isFilterProcessingRef.current = isFilterProcessing;
    }, [isFilterProcessing]);

    // Cùng lý do như trên: vòng lặp batch Kho phải đọc giá trị ĐÃ COMMIT mới nhất. Cập nhật trong
    // useEffect (chạy sau commit) nên khi 2 ref khớp nhau thì DOM đã mang dữ liệu mới.
    const filterStateRef = useRef(filterState);
    const processedFilterStateRef = useRef(processedFilterState);
    useEffect(() => {
        filterStateRef.current = filterState;
        processedFilterStateRef.current = processedFilterState;
    }, [filterState, processedFilterState]);

    const handleExport = useCallback(async (element: HTMLElement | null, filename: string, options: ExportImageOptions = {}) => {
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
    }, []);

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

    const handleBatchExport = useCallback(async (employeesToExport: Employee[]) => {
        if (!employeesToExport.length || !productConfig || !processedData) return;
        setIsExporting(true);
        const total = employeesToExport.length;
        showExportOverlay('Đang xuất ảnh hàng loạt...', `0/${total}`);

        const outcomes: BatchItemOutcome[] = [];
        const gomAnh = taoBoGomAnh();
        let fatalError: unknown;
        let offscreenContainer: HTMLDivElement | null = null;
        let root: ReactDOM.Root | null = null;
        // Audit A04: import chunk + tạo root trước đây nằm NGOÀI try/finally — lỗi tải chunk (mạng
        // chập chờn, bản deploy mới) để overlay và isExporting kẹt vĩnh viễn. Nay mọi bước nằm trong.
        try {
            // Dynamically import PerformanceModal to break circular dependency
            const { default: PerformanceModal } = await import('../components/modals/PerformanceModal');

            offscreenContainer = document.createElement('div');
            offscreenContainer.style.cssText = 'position: absolute; left: -9999px; top: 0;';
            document.body.appendChild(offscreenContainer);
            root = ReactDOM.createRoot(offscreenContainer);
            const container = offscreenContainer;
            const activeRoot = root;

            for (let i = 0; i < employeesToExport.length; i++) {
                const employee = employeesToExport[i];
                updateExportOverlay(`Đang xuất: ${employee.name}`, `${i + 1}/${total}`);
                try {
                    await new Promise<void>(resolve => {
                        activeRoot.render(
                            React.createElement(PerformanceModal, {
                                isOpen: true,
                                onClose: () => {},
                                employeeName: employee.name,
                                fullSellerArray: processedData.employeeData.fullSellerArray,
                                validSalesData: processedData.filteredValidSalesData,
                                productConfig: productConfig,
                                onExport: async (el: HTMLElement, fn: string, opts?: ExportImageOptions) => { await exportElementAsImage(el, fn, opts); },
                                isBatchExporting: true
                            })
                        );
                        setTimeout(resolve, 800);
                    });
                    const modalContent = container.querySelector('.modal-content');
                    if (!modalContent) {
                        outcomes.push({ label: employee.name, ok: false, error: 'Không dựng được nội dung' });
                    } else {
                        const filename = `Phân Tích Hiệu Quả - ${sanitizeFilename(employee.name)}.png`;
                        // Bề rộng ảnh khớp với xuất lẻ ở PerformanceModal.handleExport: 800px, nới thêm
                        // nếu bảng Phụ kiện/ĐGD đang bật nhiều cột. Đếm cột ngay trên DOM vừa render vì
                        // luồng này chụp thẳng .modal-content, không đi qua handleExport của modal.
                        const categoryHeaderCells = modalContent.querySelectorAll(`.${CATEGORY_TABLE_CLASS} thead tr:last-child th`);
                        const blob = await exportElementAsImage(modalContent as HTMLElement, filename, { scale: 2, forceOpenDetails: true, forcedWidth: getCategoryExportWidth(categoryHeaderCells.length), mode: gomAnh.mode });
                        gomAnh.them(blob, filename);
                        outcomes.push(blob
                            ? { label: employee.name, ok: true }
                            : { label: employee.name, ok: false, error: 'Không tạo được ảnh' });
                    }
                } catch (itemError) {
                    console.error(`[Batch NV] Lỗi khi xuất ${employee.name}:`, itemError);
                    outcomes.push({ label: employee.name, ok: false, error: getErrorMessage(itemError) });
                }
                // Memory pressure relief: clear render + yield to GC between exports
                activeRoot.render(null);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) {
            console.error('Lỗi khi xuất ảnh hàng loạt theo nhân viên:', error);
            fatalError = error;
        } finally {
            setIsExporting(false);
            hideExportOverlay();
            try { root?.unmount(); } catch { /* đã unmount */ }
            offscreenContainer?.remove();
        }
        reportBatchOutcome(outcomes, fatalError);
        gomAnh.giao();
    }, [productConfig, processedData]);

    const handleBatchKhoExport = useCallback(async () => {
        if (uniqueFilterOptions.kho.length <= 1) {
            setStatus({ message: 'Chỉ có một kho, không thể xuất hàng loạt.', type: 'error', progress: 0 });
            return;
        }

        setIsExporting(true);
        const originalKho = filterState.kho;

        // Audit A03 (2026-09-29): trước đây chờ cờ isFilterProcessing về false, HẾT 8s VẪN CHỤP, và
        // 150ms đầu chỉ là đoán cờ đã kịp bật. Nay chờ tới khi processedData được tính cho ĐÚNG
        // filterState hiện tại (cùng object — useDataManagement gửi kèm object này theo từng lượt
        // PROCESS) và đúng Kho yêu cầu. Hết giờ → Kho đó báo lỗi, KHÔNG chụp dữ liệu cũ.
        const waitForKhoData = async (kho: string[], maxWaitMs = 20000): Promise<boolean> => {
            const ready = await waitUntil(() => {
                const current = filterStateRef.current;
                return !isFilterProcessingRef.current
                    && processedFilterStateRef.current === current
                    && sameKhoSelection(current.kho, kho);
            }, { timeoutMs: maxWaitMs, intervalMs: 100 });
            if (!ready) return false;
            // Đệm cho DOM vẽ lại (biểu đồ, phần tính trì hoãn) trước khi chụp — giữ như trước.
            await nextFrame();
            await nextFrame();
            await new Promise(resolve => setTimeout(resolve, 300));
            return true;
        };

        const outcomes: BatchItemOutcome[] = [];
        const gomAnh = taoBoGomAnh();
        let fatalError: unknown;
        try {
            const khosToExport = uniqueFilterOptions.kho.filter(k => k && k !== 'all');
            const total = khosToExport.length + 1; // +1 for warehouse summary
            showExportOverlay('Đang xuất báo cáo kho...', `1/${total}`);

            if (!document.getElementById('business-overview') || !document.getElementById('warehouse-summary-view')) {
                throw new Error('Không tìm thấy thành phần cần xuất (#business-overview or #warehouse-summary-view).');
            }

            // Export warehouse summary once (all khos, no highlight)
            updateExportOverlay('Đang xuất: Tổng hợp kho', `1/${total}`);
            handleFilterChange({ kho: [] }); // Reset to show all
            if (!(await waitForKhoData([]))) {
                outcomes.push({ label: 'Tổng hợp kho', ok: false, error: 'Dữ liệu chưa sẵn sàng (quá thời gian chờ)' });
            } else {
                // Tìm lại phần tử mỗi lượt — React có thể đã dựng lại nút DOM sau khi đổi bộ lọc.
                const warehouseElement = document.getElementById('warehouse-summary-view');
                const blob = warehouseElement ? await exportElementAsImage(warehouseElement, `Báo Cáo Kho Tổng Hợp.png`, {
                    elementsToHide: ['.hide-on-export'],
                    mode: gomAnh.mode,
                }) : null;
                gomAnh.them(blob, 'Báo Cáo Kho Tổng Hợp.png');
                outcomes.push({ label: 'Tổng hợp kho', ok: !!blob, error: blob ? undefined : 'Không tạo được ảnh' });
            }
            await new Promise(resolve => setTimeout(resolve, 800));

            // Then export business overview per kho
            for (let i = 0; i < khosToExport.length; i++) {
                const kho = khosToExport[i];
                updateExportOverlay(`Đang xuất: ${kho}`, `${i + 2}/${total}`);
                handleFilterChange({ kho: [kho] });
                if (!(await waitForKhoData([kho]))) {
                    outcomes.push({ label: kho, ok: false, error: 'Dữ liệu chưa sẵn sàng (quá thời gian chờ)' });
                    continue;
                }

                const overviewElement = document.getElementById('business-overview');
                const blob = overviewElement ? await exportElementAsImage(overviewElement, `Tổng Quan Kinh Doanh - ${kho}.png`, {
                    elementsToHide: ['.hide-on-export'],
                    captureAsDisplayed: true,
                    mode: gomAnh.mode,
                }) : null;
                gomAnh.them(blob, `Tổng Quan Kinh Doanh - ${kho}.png`);
                outcomes.push({ label: kho, ok: !!blob, error: blob ? undefined : 'Không tạo được ảnh' });

                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (error) {
            console.error("Lỗi khi xuất hàng loạt theo kho:", error);
            fatalError = error;
            setStatus({ message: 'Đã xảy ra lỗi trong quá trình xuất hàng loạt.', type: 'error', progress: 0 });
        } finally {
            handleFilterChange({ kho: originalKho });
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            setIsExporting(false);
            hideExportOverlay();
        }
        reportBatchOutcome(outcomes, fatalError);
        gomAnh.giao();
    }, [uniqueFilterOptions, filterState, handleFilterChange, setStatus]);

    const handleExportUncollectedSheet = useCallback(async () => {
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

            const clipboardMessage = `Các bạn hoàn tất xử lý và giải trình ĐƠN HÀNG CHƯA THU | CHƯA HỦY:

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

        } catch (error: unknown) {
            console.error("Lỗi khi xuất google sheet:", error);
            toastEl.style.backgroundColor = '#dc2626';
            toastEl.textContent = `❌ Lỗi: ${getErrorMessage(error) || 'Không thể xuất file'}`;
            setTimeout(() => {
                toastEl.style.opacity = '0';
                setTimeout(() => toastEl.remove(), 200);
            }, 4000);
        }
    }, [processedData, setStatus]);

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
