
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { Employee, ProcessedData, ProductConfig, PendingExport } from '../types';
import { offerBatchShare, type BatchShareFile } from '../components/shared/ui/BatchShareToast';
import { isMobileLikeDevice } from '../utils/dataUtils';
import { exportElementAsImage, downloadBlob, shareBlob, canShareFiles } from '../services/uiService';
import { startExportJob, type ExportJob } from '../components/shared/export';
import type { ExportMode } from '../services/uiService';
import { COL, CATEGORY_TABLE_CLASS, getCategoryExportWidth } from '../constants';
import { getRowValue, getErrorMessage, sanitizeFilename } from '../utils/dataUtils';
import { toast } from '../components/shared/ui/toast';
import { useAuth } from '../contexts/AuthContext';
import { describeBatchOutcome } from '../services/batchExportResult';
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
    fitWidthToTable?: boolean;
    mode?: ExportMode;
    onCloneReady?: ((clone: HTMLElement) => void) | null;
    throwOnLineError?: boolean;
}

interface ExportLogicProps {
    productConfig: ProductConfig | null;
    processedData: ProcessedData | null;
    setStatus: (status: { message: string; type: 'info' | 'success' | 'error'; progress: number }) => void;
}

/** Báo kết quả batch theo số ảnh xuất được THẬT (audit A03/A04). */
/**
 * Tổng kết lượt hàng loạt — hiện NGAY TRÊN bảng tiến trình chung (components/shared/export), cùng câu chữ
 * describeBatchOutcome như trước (trước đây là toast riêng). Người dùng bấm Huỷ → câu "Đã huỷ — xuất được x/N".
 */
const reportBatchOutcome = (job: ExportJob, items: BatchItemOutcome[], fatalError?: unknown) => {
    if (job.cancelled && !fatalError) { job.finish(); return; }
    job.finish({ message: describeBatchOutcome(items, fatalError).message });
};
/** Ghi kết quả một mục vào cả danh sách tổng kết lẫn bảng tiến trình. */
const ghiKetQua = (job: ExportJob, outcomes: BatchItemOutcome[], o: BatchItemOutcome) => {
    outcomes.push(o);
    job.result(o.label, o.ok ? 'ok' : 'failed', o.error);
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

export const useExportLogic = ({
    productConfig,
    processedData,
    setStatus,
}: ExportLogicProps) => {
    const { user, departmentId } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

    const handleExport = useCallback(async (element: HTMLElement | null, filename: string, options: ExportImageOptions = {}): Promise<Blob | null> => {
        // Trả về ảnh đã dựng (null = lỗi) để luồng hàng loạt biết mục nào hỏng
        if (!element) return null;
        {
            setIsExporting(true);
            // Bảng chờ do bộ xuất ảnh chung tự mở (tiêu đề theo tên báo cáo)
            await new Promise(resolve => setTimeout(resolve, 150));
            const exportOptions = {
                elementsToHide: ['.hide-on-export'],
                mode: 'blob-only' as ExportMode,
                ...options
            };
            const blob = await exportElementAsImage(element, filename, exportOptions);
            setIsExporting(false);
            if (blob) {
                // Tự tải về máy + Tự sao chép ảnh vào clipboard để dán trực tiếp
                downloadBlob(blob, filename);
            }
            return blob;
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
        const job = startExportJob({ title: 'Xuất ảnh hàng loạt theo nhân viên', total });

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
                if (job.cancelled) break;
                const employee = employeesToExport[i];
                job.item(i, `Đang xuất: ${employee.name}`);
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
                        ghiKetQua(job, outcomes, { label: employee.name, ok: false, error: 'Không dựng được nội dung' });
                    } else {
                        const filename = `Phân Tích Hiệu Quả - ${sanitizeFilename(employee.name)}.png`;
                        // Bề rộng ảnh khớp với xuất lẻ ở PerformanceModal.handleExport: 800px, nới thêm
                        // nếu bảng Phụ kiện/ĐGD đang bật nhiều cột. Đếm cột ngay trên DOM vừa render vì
                        // luồng này chụp thẳng .modal-content, không đi qua handleExport của modal.
                        const categoryHeaderCells = modalContent.querySelectorAll(`.${CATEGORY_TABLE_CLASS} thead tr:last-child th`);
                        const blob = await exportElementAsImage(modalContent as HTMLElement, filename, { scale: 2, forceOpenDetails: true, forcedWidth: getCategoryExportWidth(categoryHeaderCells.length), mode: gomAnh.mode });
                        gomAnh.them(blob, filename);
                        ghiKetQua(job, outcomes, blob
                            ? { label: employee.name, ok: true }
                            : { label: employee.name, ok: false, error: 'Không tạo được ảnh' });
                    }
                } catch (itemError) {
                    console.error(`[Batch NV] Lỗi khi xuất ${employee.name}:`, itemError);
                    ghiKetQua(job, outcomes, { label: employee.name, ok: false, error: getErrorMessage(itemError) });
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
            try { root?.unmount(); } catch { /* đã unmount */ }
            offscreenContainer?.remove();
        }
        reportBatchOutcome(job, outcomes, fatalError);
        gomAnh.giao();
    }, [productConfig, processedData]);

    const handleExportUncollectedSheet = useCallback(async () => {
        if (!processedData?.uncollectedOrders || processedData.uncollectedOrders.length === 0) {
            setStatus({ message: 'Không có đơn hàng chưa thu | chưa hủy nào để xuất.', type: 'error', progress: 0 });
            return;
        }

        const toastEl = document.createElement('div');
        toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .2s';
        toastEl.textContent = 'Đang tạo Google Sheet...';
        document.body.appendChild(toastEl);

        try {
            toastEl.textContent = 'Đang xác thực Google...';
            sessionStorage.removeItem('googleOAuthToken');
            const { loginWithGoogleForceConsent } = await import('../services/firebase');
            await loginWithGoogleForceConsent();
            let token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Không thể lấy token xác thực.');

            toastEl.textContent = 'Đang tạo Google Sheet...';
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

            toastEl.textContent = `Đang ghi ${rows.length} đơn hàng...`;

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
            msgDiv.textContent = 'Đã tạo Google Sheet & sao chép tin nhắn!';
            msgDiv.style.fontWeight = '600';
            toastEl.appendChild(msgDiv);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

            const openBtn = document.createElement('a');
            openBtn.href = url;
            openBtn.target = '_blank';
            openBtn.textContent = 'Mở Sheet';
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
            toastEl.textContent = `Lỗi: ${getErrorMessage(error) || 'Không thể xuất file'}`;
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
        handleExportUncollectedSheet,
        pendingExport,
        handlePendingDownload,
        handlePendingShare,
        handlePendingClose,
    };
};
