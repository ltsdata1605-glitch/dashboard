import { BonusMetrics } from '../types/nhanVienTypes';
import { parseNumber } from '../../../utils/dataUtils';

export type BonusParseResult = { metrics: BonusMetrics } | { error: string };

/**
 * Tính BonusMetrics từ 1 khối TSV (định dạng y hệt khi copy bảng HRM > Quản lý điểm
 * thưởng > Điểm thưởng nhân viên bằng Ctrl+C). Hàm thuần, không side effect — dùng
 * chung cho cả luồng dán tay (BonusDataModal) và luồng Tự động (áp thẳng không qua modal).
 */
export function parseBonusBlock(data: string): BonusParseResult {
    const lines = data.split('\n').filter(l => l.trim());
    const totalLine = lines.find(l => l.startsWith('Tổng cộng'));
    if (!totalLine) return { error: 'Không tìm thấy dòng Tổng cộng. Hãy đảm bảo bạn copy đủ bảng từ HRM.' };

    const parts = totalLine.split('\t');
    const erp = parseNumber(parts[2]) - parseNumber(parts[3]);
    const tNong = parseNumber(parts[4]);
    const tong = parseNumber(parts[8]);

    const dateRows = lines.filter(l => /^\d{2}\/\d{2}\/\d{4}/.test(l));
    if (dateRows.length === 0) return { error: 'Không xác định được số ngày dữ liệu.' };

    const dParts = dateRows[dateRows.length - 1].split('\t')[0].split('/');
    const daysInMonth = new Date(Number(dParts[2]), Number(dParts[1]), 0).getDate();

    const daily: Record<string, number> = {};
    dateRows.forEach(row => {
        const rowParts = row.split('\t');
        if (rowParts.length > 8) {
            const dateStr = rowParts[0].trim();
            daily[dateStr] = parseNumber(rowParts[8]);
        }
    });

    const metrics: BonusMetrics = {
        erp, tNong, tong,
        dKien: (tong / dateRows.length) * daysInMonth,
        pNong: tong > 0 ? (tNong / tong) * 100 : 0,
        updatedAt: new Date().toLocaleString('vi-VN'),
        dailyData: daily
    };

    return { metrics };
}

import { extractEmployeeId, standardizeEmployeeName, formatEmployeeName } from './nhanVienHelpers';

/**
 * Chuyển đổi chuỗi thời gian updatedAt (VD: "20:16:34 9/9/2026") thành timestamp miliseconds.
 */
export function parseBonusUpdatedAt(str?: string): number {
    if (!str) return 0;
    const trimmed = str.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
        const [timePart, datePart] = parts;
        if (timePart.includes(':') && datePart.includes('/')) {
            const timeSegments = timePart.split(':').map(Number);
            const [d, m, y] = datePart.split('/').map(Number);
            if (d && m && y) {
                const date = new Date(y, m - 1, d, timeSegments[0] || 0, timeSegments[1] || 0, timeSegments[2] || 0);
                if (!isNaN(date.getTime())) return date.getTime();
            }
        }
    }
    const t = Date.parse(trimmed);
    return isNaN(t) ? 0 : t;
}

/**
 * Tra cứu BonusMetrics cho nhân viên một cách chính xác tuyệt đối và đồng bộ:
 * 1. Khớp qua Mã nhân viên trích xuất (extractEmployeeId) - định danh duy nhất trong MWG.
 * 2. Nếu có nhiều bản ghi (ví dụ key cũ dạng "Tên - Mã" và key mới dạng "Mã - Tên"),
 *    tự động so sánh `updatedAt` để luôn trả về bản ghi MỚI NHẤT, tránh tình trạng lấy nhầm số cũ.
 * 3. Dự phòng tra cứu qua các biến thể tên (canonical, swapped, formatted).
 */
export function getBonusForEmployee(
    bonusData?: Record<string, BonusMetrics | null>,
    originalName?: string,
    name?: string
): BonusMetrics | null {
    if (!bonusData || (!originalName && !name)) return null;

    const empId = (originalName ? extractEmployeeId(originalName) : '') || (name ? extractEmployeeId(name) : '');

    const candidateEntries: { key: string; metrics: BonusMetrics }[] = [];

    // 1. Khớp qua Employee ID (chuẩn xác nhất trong hệ thống MWG)
    if (empId) {
        for (const [key, metrics] of Object.entries(bonusData)) {
            if (metrics && extractEmployeeId(key) === empId) {
                candidateEntries.push({ key, metrics });
            }
        }
    }

    // 2. Nếu không tìm thấy qua empId hoặc empId rỗng, thử tìm qua các biến thể tên
    if (candidateEntries.length === 0) {
        const testKeys = new Set<string>();
        [originalName, name].forEach(n => {
            if (!n) return;
            testKeys.add(n);
            testKeys.add(n.toLowerCase().trim());
            const canonical = standardizeEmployeeName(n);
            testKeys.add(canonical);
            testKeys.add(canonical.toLowerCase().trim());
            const formatted = formatEmployeeName(n);
            testKeys.add(formatted);
            testKeys.add(formatted.toLowerCase().trim());
            if (n.includes(' - ')) {
                const parts = n.split(' - ').map(p => p.trim());
                testKeys.add(`${parts[1]} - ${parts[0]}`);
                testKeys.add(`${parts[1]} - ${parts[0]}`.toLowerCase().trim());
            }
        });

        for (const k of testKeys) {
            const m = bonusData[k];
            if (m && !candidateEntries.some(c => c.metrics === m)) {
                candidateEntries.push({ key: k, metrics: m });
            }
        }
    }

    if (candidateEntries.length === 0) return null;
    if (candidateEntries.length === 1) return candidateEntries[0].metrics;

    // 3. Nếu có nhiều hơn 1 bản ghi khớp: Luôn ưu tiên bản ghi có updatedAt mới nhất!
    candidateEntries.sort((a, b) => {
        const tA = parseBonusUpdatedAt(a.metrics.updatedAt);
        const tB = parseBonusUpdatedAt(b.metrics.updatedAt);
        if (tA !== tB) return tB - tA; // Mới nhất lên đầu
        return (b.metrics.tong || 0) - (a.metrics.tong || 0);
    });

    return candidateEntries[0].metrics;
}

