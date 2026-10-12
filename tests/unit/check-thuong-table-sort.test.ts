import { describe, it, expect } from 'vitest';
import { getGroupDefinitions, sortByPercentDesc } from '../../features/check-thuong/services/checkThuongSearch';
import { CHECK_THUONG_COLS } from '../../features/check-thuong/services/checkThuongCalc';

describe('CheckThuong Category Table Sorting', () => {
    const mockRows: any[][] = [
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'TAI NGHE', '1.587', '34.75', '10', '1', '', '0', '0', '780000'],
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'CÁP - SẠC', '1.044', '3.12', '10', '6', '', '0', '0', '173000'],
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'AUDIO', '2.673', '205.779', '10', '1', '', '0', '0', '1700000'],
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'VAS', '1.737', '395.769', '10', '1', '', '0', '0', '8100000']
    ];

    it('sorts rows by % dự kiến descending by default', () => {
        const sorted = sortByPercentDesc(mockRows);
        expect(sorted[0][CHECK_THUONG_COLS.NGANH_HANG]).toBe('AUDIO'); // 267.3%
        expect(sorted[1][CHECK_THUONG_COLS.NGANH_HANG]).toBe('VAS'); // 173.7%
        expect(sorted[2][CHECK_THUONG_COLS.NGANH_HANG]).toBe('TAI NGHE'); // 158.7%
        expect(sorted[3][CHECK_THUONG_COLS.NGANH_HANG]).toBe('CÁP - SẠC'); // 104.4%
    });

    it('ensures getGroupDefinitions applies % dự kiến descending sort to achieved group', () => {
        const preprocessed = {
            uniqueStores: new Set<string>(['910']),
            categoryStats: new Map(),
            storeSummaries: [],
            noFundGroups: new Set<string>()
        };
        const groups = getGroupDefinitions(mockRows, preprocessed as any);
        const achieved = groups.find(g => g.key === 'achieved');
        expect(achieved).toBeDefined();
        expect(achieved?.data[0][CHECK_THUONG_COLS.NGANH_HANG]).toBe('AUDIO');
        expect(achieved?.data[1][CHECK_THUONG_COLS.NGANH_HANG]).toBe('VAS');
        expect(achieved?.data[2][CHECK_THUONG_COLS.NGANH_HANG]).toBe('TAI NGHE');
        expect(achieved?.data[3][CHECK_THUONG_COLS.NGANH_HANG]).toBe('CÁP - SẠC');
    });
});
