import { describe, expect, it } from 'vitest';
import { fillKpisFromHeader, headerKpisBelongToActive } from '../../features/bi-dashboard/services/summaryKpiFallback';

// KPI đầu bảng = số của cả CỤM (3 siêu thị).
const HEADER = { dtDuKien: '9.999', dtDuKienQD: '8.888', lkhach: '5.000', tlpv: '55%', lbill: '1.200' };
const MULTI_ROWS = [['Tổng', '100'], ['ĐMX Quận 1', '40'], ['ĐMX Quận 2', '30'], ['ĐMX Quận 3', '30']];
const ONE_ROWS = [['ĐMX Quận 1', '40']];
const ONE_WITH_TOTAL_ROWS = [['Tổng', '40'], ['ĐMX Quận 1', '40']];

describe('Audit D16 — KPI đầu bảng chỉ bù cho đúng đối tượng', () => {
    it('siêu thị thiếu cột trong báo cáo nhiều siêu thị KHÔNG nhận số của cả cụm', () => {
        const kpis: Record<string, string> = { dtlk: '40' }; // hàng của siêu thị không có cột DT Dự Kiến
        fillKpisFromHeader(kpis, HEADER, MULTI_ROWS, 'ĐMX Quận 1');
        expect(kpis.dtDuKien).toBeUndefined();
        expect(kpis.dtDuKienQD).toBeUndefined();
        expect(kpis.lkhach).toBeUndefined();
        expect(kpis.tlpv).toBeUndefined();
        expect(kpis.lbillBH).toBe('N/A');
        expect(kpis.lbillTH).toBe('N/A');
    });

    it("xem 'Tổng' vẫn được bù từ KPI đầu bảng", () => {
        const kpis: Record<string, string> = {};
        fillKpisFromHeader(kpis, HEADER, MULTI_ROWS, 'Tổng');
        expect(kpis.dtDuKien).toBe('9.999');
        expect(kpis.lkhach).toBe('5.000');
        expect(kpis.lbillBH).toBe('1.200'); // lbillBH lấy từ lbill khi đầu bảng không có
    });

    it('báo cáo chỉ có đúng 1 siêu thị: số đầu bảng chính là của siêu thị đó', () => {
        for (const rows of [ONE_ROWS, ONE_WITH_TOTAL_ROWS]) {
            const kpis: Record<string, string> = {};
            fillKpisFromHeader(kpis, HEADER, rows, 'ĐMX Quận 1');
            expect(kpis.dtDuKien).toBe('9.999');
        }
    });

    it('số của chính siêu thị không bị đầu bảng ghi đè', () => {
        const kpis: Record<string, string> = { dtDuKien: '123', lbillBH: '77' };
        fillKpisFromHeader(kpis, HEADER, MULTI_ROWS, 'Tổng');
        expect(kpis.dtDuKien).toBe('123');
        expect(kpis.lbillBH).toBe('77');
    });

    it('headerKpisBelongToActive: dòng tổng không tính là siêu thị', () => {
        expect(headerKpisBelongToActive(MULTI_ROWS, 'ĐMX Quận 1')).toBe(false);
        expect(headerKpisBelongToActive(ONE_WITH_TOTAL_ROWS, 'ĐMX Quận 1')).toBe(true);
        expect(headerKpisBelongToActive(MULTI_ROWS, 'Tổng')).toBe(true);
    });
});
