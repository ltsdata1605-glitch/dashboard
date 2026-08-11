import { useMemo } from 'react';
import { parseNumber } from '../utils/dashboardHelpers';

export interface ReportKpiValues {
    dtlk: number;
    dtqd: number;
    tc: number;
    hqqd: number;
}

// Trích số liệu DT Thực/DTQĐ/Trả Chậm/Hiệu Quả Quy Đổi cho siêu thị đang chọn từ bảng "Tổng hợp".
// Dùng chung cho ReportView (desktop) và MobileReportView để tránh 2 nơi tính trùng logic
// dễ lệch nhau (từng gây bug đổi nhãn sai ở bản mobile).
export function useReportKpiValues(
    data: { headers: string[]; rows: string[][] },
    activeSupermarket: string | null
): ReportKpiValues | null {
    return useMemo(() => {
        if (!data.headers || !data.headers.length) return null;
        const nameIdx = data.headers.indexOf('Tên miền');
        const dtIdx = data.headers.indexOf('DTLK');
        const dtqdIdx = data.headers.indexOf('DTQĐ');
        let tcIdx = data.headers.indexOf('Tỷ Trọng Trả Góp');
        if (tcIdx === -1) tcIdx = data.headers.indexOf('Tỷ Trọng Trả Chậm');

        if (nameIdx === -1 || dtIdx === -1 || dtqdIdx === -1) return null;

        const targetRow = data.rows.find(row => {
            const name = row[nameIdx];
            if (activeSupermarket && activeSupermarket !== 'Tổng') {
                return name === activeSupermarket;
            }
            return name === 'Tổng';
        });

        if (!targetRow) return null;

        const dtlk = parseNumber(targetRow[dtIdx]);
        const dtqd = parseNumber(targetRow[dtqdIdx]);
        const tc = tcIdx !== -1 ? parseNumber(targetRow[tcIdx]) : 0;
        const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;

        return { dtlk, dtqd, tc, hqqd };
    }, [data, activeSupermarket]);
}
