import { SavedTaxRecord } from '../types/tax.types';

export interface TaxHistoryMonthGroup {
    /** Khoá sắp xếp dạng "YYYY-MM" */
    key: string;
    /** Nhãn hiển thị: "Tháng 8/2026" */
    label: string;
    records: SavedTaxRecord[];
    totalTax: number;
    totalProxy: number;
}

/**
 * Tháng của một bản ghi: ưu tiên tháng LƯƠNG bóc từ phiếu (`monthYear`), vì người dùng rà soát
 * theo kỳ lương chứ không theo lúc bấm lưu. Không có thì lùi về tháng tạo bản ghi.
 * Chấp nhận "08/2026", "8/2026", "T08/2026", "Tháng 08/2026", "2026-08".
 */
export const monthKeyOfRecord = (record: SavedTaxRecord): string => {
    const raw = (record.monthYear || '').trim();

    // Loại trừ tiền tố ngày chuyển khoản CK dd/mm/yyyy nếu có
    const clean = raw.replace(/^CK\s*\d{1,2}\/\d{1,2}\/\d{4}/i, '').trim();

    // 1. Dạng T08.2026 hoặc T8.2026 / T08/2026
    const tDot = clean.match(/\bT(0?[1-9]|1[0-2])\s*[/\.]\s*(\d{4})\b/i);
    if (tDot) {
        const month = Number(tDot[1]);
        return `${tDot[2]}-${String(month).padStart(2, '0')}`;
    }

    // 2. Dạng MM/YYYY hoặc M/YYYY (không phải ngày dd/mm/yyyy)
    const slash = clean.match(/(?<!\d\/)(?:^|\D)(0?[1-9]|1[0-2])\s*[/\-.]\s*(\d{4})(?!\/\d)/);
    if (slash) {
        const month = Number(slash[1]);
        if (month >= 1 && month <= 12) return `${slash[2]}-${String(month).padStart(2, '0')}`;
    }

    // 3. Dạng ISO YYYY-MM
    const iso = clean.match(/(\d{4})\s*[/\-.]\s*(0?[1-9]|1[0-2])/);
    if (iso) {
        const month = Number(iso[2]);
        if (month >= 1 && month <= 12) return `${iso[1]}-${String(month).padStart(2, '0')}`;
    }

    const created = new Date(record.createdAt);
    if (!Number.isNaN(created.getTime())) {
        return `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    }
    return 'khong-ro';
};

export const monthLabel = (key: string): string => {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (!m) return 'Không rõ tháng';
    return `Tháng ${Number(m[2])}/${m[1]}`;
};

/**
 * Gom lịch sử tính thuế theo tháng để dễ rà soát (chủ dự án yêu cầu 2026-09-23).
 * Tháng mới nhất lên đầu; trong mỗi tháng, bản ghi mới lưu lên đầu.
 */
export const groupRecordsByMonth = (records: SavedTaxRecord[]): TaxHistoryMonthGroup[] => {
    const buckets = new Map<string, SavedTaxRecord[]>();

    records.forEach(rec => {
        const key = monthKeyOfRecord(rec);
        const list = buckets.get(key);
        if (list) list.push(rec);
        else buckets.set(key, [rec]);
    });

    return Array.from(buckets.entries())
        .map(([key, list]) => {
            const sorted = [...list].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            return {
                key,
                label: monthLabel(key),
                records: sorted,
                totalTax: sorted.reduce((sum, r) => sum + (r.taxOnProxyAmount || 0), 0),
                totalProxy: sorted.reduce((sum, r) => sum + (r.proxyAmount || 0), 0),
            };
        })
        .sort((a, b) => {
            if (a.key === 'khong-ro') return 1;
            if (b.key === 'khong-ro') return -1;
            return b.key.localeCompare(a.key);
        });
};
