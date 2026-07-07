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
