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
 *
 *   <LineSendButton areaKey="bi:thi-dua" title="Thi Đua" run={xuatAnhThiDua} />
 *       → GỬI NHÓM LINE: chọn nhóm rồi chạy đúng hàm xuất ảnh đó; mọi ảnh nó giao ra được gửi vào nhóm (từng ảnh),
 *         có thẻ tiến trình, thử lại ảnh lỗi (lineDelivery.ts).
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
export {
    registerLineTransport, getLineTransport, runWithLineDelivery, sendBlobToLine, isLineSendBusy, isLineDeliveryActive,
    buildLineCaption, reportNameFromFilename,
    type LineGroup, type LineTransport, type LineSendOutcome, type LineDeliverySummary,
} from './lineDelivery';
export { LineSendButton, type LineSendButtonProps, type LineSendChoice } from './LineSendButton';
export { LineIcon } from './LineIcon';
