import type { DataRow, ProductConfig } from '../types';
import {
    computePivot,
    PIVOT_DIMENSIONS,
    PIVOT_METRICS,
    type PivotDimension,
    type PivotMetric,
} from './pivotService';

/**
 * Cảnh báo theo ngưỡng (KE_HOACH_TONG_THE.md mục 6 — *"thay vì người dùng tự soi bảng, hệ thống
 * đẩy thông báo khi chỉ số vượt ngưỡng"*).
 *
 * PHẠM VI CÓ CHỦ ĐÍCH — đọc kỹ trước khi mở rộng:
 * Bản này đánh giá ngưỡng **phía client, trên đúng dữ liệu người dùng đang xem**, và hiện cảnh báo
 * ngay trong app. Nó KHÔNG gửi thông báo đẩy/định kỳ — việc đó cần Cloud Function chạy theo lịch,
 * tức cần deploy (`npm run deploy:functions`) mà agent không tự làm được, và quan trọng hơn là
 * KHÔNG kiểm chứng được nếu viết mù. Phần giá trị cốt lõi ("không phải tự soi bảng") đã đạt; phần
 * gửi đi xa là bước sau, có thể dùng lại NGUYÊN hàm `evaluateAlerts()` này ở phía server.
 *
 * KHỚP SỐ: dùng lại `computePivot()` để tính, nên con số trong cảnh báo luôn bằng con số trên bảng
 * Phân tích động. Không có đường tính thứ hai.
 *
 * PHÂN QUYỀN: như mọi thứ khác trong loạt này — hàm chỉ tính trên mảng được truyền vào; nơi gọi
 * truyền `baseFilteredData` đã qua `computeRbacFilteredData()`. Nhân viên chỉ nhận cảnh báo về số
 * liệu của chính mình.
 */

export type AlertOperator = 'lt' | 'gt';

export interface AlertRule {
    id: string;
    enabled: boolean;
    /** Chiều để soi: mỗi giá trị của chiều này là 1 đối tượng được kiểm tra (mỗi Kho, mỗi NV...). */
    dimension: PivotDimension;
    metric: PivotMetric;
    /** 'lt' = cảnh báo khi THẤP HƠN ngưỡng; 'gt' = khi VƯỢT ngưỡng. */
    operator: AlertOperator;
    threshold: number;
    /** Tên do người dùng đặt; để trống thì sinh mô tả tự động. */
    label?: string;
}

export interface AlertHit {
    ruleId: string;
    ruleLabel: string;
    /** Nhãn chiều, vd "Kho". */
    dimensionLabel: string;
    /** Giá trị cụ thể bị cảnh báo, vd "K01". */
    itemLabel: string;
    metricLabel: string;
    value: number;
    threshold: number;
    operator: AlertOperator;
    /** Mức lệch so với ngưỡng, %. Dùng để sắp xếp cái nghiêm trọng lên trước. */
    deviationPercent: number;
}

const dimLabel = (d: PivotDimension) => PIVOT_DIMENSIONS.find(x => x.id === d)?.label ?? d;
const metricLabel = (m: PivotMetric) => PIVOT_METRICS.find(x => x.id === m)?.label ?? m;

export function describeRule(rule: AlertRule): string {
    if (rule.label?.trim()) return rule.label.trim();
    const huong = rule.operator === 'lt' ? 'thấp hơn' : 'vượt';
    return `${dimLabel(rule.dimension)} có ${metricLabel(rule.metric)} ${huong} ${rule.threshold.toLocaleString('vi-VN')}`;
}

/**
 * Chạy toàn bộ quy tắc trên dữ liệu hiện tại.
 *
 * @param sourceData PHẢI là dữ liệu đã lọc quyền (xem phần đầu file).
 * @returns Danh sách vi phạm, sắp xếp nghiêm trọng nhất lên trước.
 */
export function evaluateAlerts(
    sourceData: DataRow[],
    rules: AlertRule[],
    productConfig: ProductConfig | null
): AlertHit[] {
    const hits: AlertHit[] = [];

    for (const rule of rules) {
        if (!rule.enabled) continue;
        // Ngưỡng không hợp lệ (NaN do người dùng xoá trắng ô nhập) thì BỎ QUA thay vì cảnh báo
        // loạn — mọi phép so sánh với NaN đều false, dễ khiến quy tắc "im lặng" một cách khó hiểu.
        if (!Number.isFinite(rule.threshold)) continue;

        const pivot = computePivot(
            sourceData,
            { rowDims: [rule.dimension], colDim: null, metric: rule.metric },
            productConfig
        );

        for (const row of pivot.rows) {
            const viPham = rule.operator === 'lt' ? row.total < rule.threshold : row.total > rule.threshold;
            if (!viPham) continue;

            hits.push({
                ruleId: rule.id,
                ruleLabel: describeRule(rule),
                dimensionLabel: dimLabel(rule.dimension),
                itemLabel: row.label,
                metricLabel: metricLabel(rule.metric),
                value: row.total,
                threshold: rule.threshold,
                operator: rule.operator,
                deviationPercent: rule.threshold === 0
                    ? 0
                    : Math.abs((row.total - rule.threshold) / rule.threshold) * 100,
            });
        }
    }

    // Lệch nhiều nhất lên đầu — người dùng nhìn phát biết ngay cái nào đáng lo nhất.
    return hits.sort((a, b) => b.deviationPercent - a.deviationPercent);
}

/** Khoá lưu quy tắc trong IndexedDB (qua dbService.saveSetting/getSetting). */
export const ALERT_RULES_STORAGE_KEY = 'analysis_alert_rules';

export const createEmptyRule = (): AlertRule => ({
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    dimension: 'kho',
    metric: 'revenueQD',
    operator: 'lt',
    threshold: 0,
});
