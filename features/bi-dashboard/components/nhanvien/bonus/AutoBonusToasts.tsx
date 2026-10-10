import { toast } from '../../../../../components/shared/ui/toast';
import { BonusAutoSummary } from '../../../hooks/useBonusAutoBridge';
import { MultiMonthSummary } from '../../../hooks/useMultiMonthBonusRun';

/**
 * Kết quả "Tự động đổ thưởng" — dùng hệ toast chung (components/shared/ui/toast) từ 2026-10-10, thay 2 khung toast tự vẽ
 * (thẻ có thanh đếm ngược + thẻ viền vàng). Giữ nguyên hành vi với nơi gọi (GlobalAutoBonusManager):
 *   - thành công: tự ẩn sau 5s, xong thì gọi `onDismissed` (đặt lại trạng thái tiến trình);
 *   - có lỗi / dừng giữa chừng: KHÔNG tự ẩn, nút "Xem chi tiết" mở bảng lỗi; người dùng tự tắt (×/vuốt) → `onDismissed`.
 */
const SUCCESS_DURATION_MS = 5000;
const TOAST_ID = 'ycx-auto-bonus-result';
const MULTI_MONTH_TOAST_ID = 'ycx-multi-month-bonus-result';

interface ResultHandlers { onViewDetail: () => void; onDismissed: () => void }

function showSuccess(id: string, headline: string, onDismissed: () => void) {
    let done = false;
    const once = () => { if (!done) { done = true; onDismissed(); } };
    toast.success(headline, { id, duration: SUCCESS_DURATION_MS, onDismiss: once });
    // Tự hết giờ thì toast không gọi onDismiss — đặt lại trạng thái đúng lúc toast tắt như bản cũ (chỉ một lần).
    setTimeout(once, SUCCESS_DURATION_MS);
}

function showIssue(id: string, headline: string, handlers: ResultHandlers) {
    toast.action({
        id,
        kind: 'warning',
        title: headline,
        onDismiss: handlers.onDismissed,
        actions: [{ label: 'Xem chi tiết', primary: true, onClick: handlers.onViewDetail }],
    });
}

/** Chọn đúng loại toast (thành công tự ẩn / có vấn đề không tự ẩn) dựa vào summary. */
export function showAutoBonusResultToast(summary: BonusAutoSummary, handlers: ResultHandlers): void {
    const allOk = !summary.stoppedEarly && summary.successCount === summary.total && summary.total > 0;
    if (allOk) {
        showSuccess(TOAST_ID, `${summary.total}/${summary.total} nhân viên cập nhật thành công`, handlers.onDismissed);
        return;
    }
    const errorCount = summary.total - summary.successCount;
    const headline = summary.stoppedEarly
        ? `Đã dừng: xong ${summary.total} nhân viên (${summary.successCount} thành công${errorCount > 0 ? `, ${errorCount} lỗi` : ''})`
        : `${summary.successCount}/${summary.total} thành công, ${errorCount} lỗi`;
    showIssue(TOAST_ID, headline, handlers);
}

/** Toast lỗi toàn cục (job-level, không có kết quả nhân viên nào cả). */
export function showAutoBonusErrorToast(message: string, onDismissed: () => void): void {
    toast.error(message, { id: TOAST_ID, duration: 6000 });
    setTimeout(onDismissed, 6000);
}

/** Toast kết quả cho lượt "Chạy N tháng" (lựa chọn Năm) hoặc "So sánh cùng kỳ" (2 kỳ) —
 * cùng UX 2 biến thể như trên, chỉ khác đơn vị đếm là THÁNG/KỲ thay vì nhân viên. */
export function showMultiMonthResultToast(summary: MultiMonthSummary, handlers: ResultHandlers): void {
    const unit = summary.kind === 'compare' ? 'kỳ' : 'tháng';
    const errorMonths = summary.monthResults.filter(m => !!m.error).length;
    const allOk = !summary.stoppedEarly && errorMonths === 0 && summary.monthsDone === summary.monthsTotal && summary.monthsTotal > 0;
    if (allOk) {
        showSuccess(MULTI_MONTH_TOAST_ID, `Xong ${summary.monthsTotal}/${summary.monthsTotal} ${unit}`, handlers.onDismissed);
        return;
    }
    const headline = summary.stoppedEarly
        ? `Đã dừng: xong ${summary.monthsDone}/${summary.monthsTotal} ${unit}${errorMonths > 0 ? ` · ${errorMonths} ${unit} lỗi` : ''}`
        : `Xong ${summary.monthsDone}/${summary.monthsTotal} ${unit} · ${errorMonths} ${unit} lỗi`;
    showIssue(MULTI_MONTH_TOAST_ID, headline, handlers);
}
