/**
 * XUẤT ẢNH — điểm vào DUY NHẤT cho mọi khu vực (gốc, Report BI, Phân Ca, In Sticker, Check thưởng,
 * Khai thác, Thuế). Kế hoạch "Hợp nhất xuất ảnh" trong implementation_plan.md.
 *
 *   exportElementAsImage(el, 'ten-file.png', { progressTitle: 'Xuất ảnh Thi đua' })
 *       → chụp (co cột vừa nội dung + chân ảnh) → máy tính tải về / điện thoại mở chia sẻ, có bảng chờ.
 *
 *   const job = startExportJob({ title: 'Xuất ảnh theo nhân viên', total: n });
 *   for (...) { if (job.cancelled) break; job.item(i, ten); const b = await exportElementAsImage(...);
 *               job.result(ten, b ? 'ok' : 'failed'); }
 *   job.finish();
 *       → hàng loạt: thanh tiến trình, Huỷ, tổng kết mục lỗi.
 */
export {
    exportElementAsImage, downloadBlob, shareBlob, canShareFiles, fixOklchColors, EXPORT_MIN_WIDTH,
    type ExportMode, type ExportImageOptions,
} from './captureEngine';
export {
    startExportJob, getActiveExportJob, requestCancelExport, closeExportPanel,
    showExportOverlay, updateExportOverlay, hideExportOverlay,
    type ExportJob, type ExportJobState, type ExportItemStatus,
} from './exportProgress';
export { fitTablesToContent, appendExportFooter, exportFooterText } from './exportLayout';
