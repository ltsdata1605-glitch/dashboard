import { describe, it, expect } from 'vitest';
import { prepareTaxRefundRows, buildTaxRefundWorkbook } from './taxExportExcelService';
import { SavedTaxRecord } from '../types/tax.types';

describe('taxExportExcelService', () => {
    const mockRecords: SavedTaxRecord[] = [
        {
            id: 1,
            name: 'NGUYEN PHUOC LOC',
            monthYear: '08/2026',
            totalIncome: 39463013,
            dependents: 0,
            proxyAmount: 2201000,
            taxOnProxyAmount: 163368,
            netRefundToFriend: 2037632,
            bankAccount: '0123456789',
            bankCode: 'MB',
            proxyItemsDetail: 'Thưởng ERP còn lại (976,972 đ); Thưởng thêm Hệ số K (802,056 đ)',
            createdAt: '2026-09-26T10:00:00Z',
        },
        {
            id: 2,
            name: 'TRAN VAN A',
            monthYear: '08/2026',
            totalIncome: 25000000,
            dependents: 1,
            proxyAmount: 1000000,
            taxOnProxyAmount: 100000,
            bankAccount: '9876543210',
            bankCode: 'Vietcombank',
            createdAt: '2026-09-26T10:05:00Z',
        },
    ];

    it('chuẩn bị đúng các cột và tính tổng chính xác', () => {
        const { dataRows, totals } = prepareTaxRefundRows(mockRecords);

        expect(dataRows).toHaveLength(2);
        expect(totals.count).toBe(2);
        expect(totals.totalProxy).toBe(3201000);
        expect(totals.totalTax).toBe(263368);
        expect(totals.totalRefund).toBe(2937632);

        // Row 1 checks
        const row1 = dataRows[0];
        expect(row1.name).toBe('NGUYEN PHUOC LOC');
        expect(row1.monthYear).toBe('08/2026');
        expect(row1.proxyDetail).toContain('Thưởng ERP còn lại');
        expect(row1.proxyAmount).toBe(2201000);
        expect(row1.taxOnProxy).toBe(163368);
        expect(row1.refundToTreasury).toBe(2037632);
        expect(row1.qrUrl).toContain('sepay.vn');
        expect(row1.qrFormula).toContain('=IMAGE(');

        // Row 2 checks (fallback proxy detail)
        const row2 = dataRows[1];
        expect(row2.name).toBe('TRAN VAN A');
        expect(row2.proxyDetail).toContain('Khoản nhận thay');
        expect(row2.refundToTreasury).toBe(900000); // 1,000,000 - 100,000
    });

    it('tạo đối tượng Workbook hợp lệ chứa đầy đủ dữ liệu và tiêu đề', () => {
        const wb = buildTaxRefundWorkbook(mockRecords, { monthLabel: 'Tháng 08/2026' });
        expect(wb).toBeDefined();
        expect(wb.SheetNames.length).toBeGreaterThan(0);
        const ws = wb.Sheets[wb.SheetNames[0]];
        expect(ws).toBeDefined();
    });
});
