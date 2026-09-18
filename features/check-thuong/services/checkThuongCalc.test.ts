import { describe, it, expect } from 'vitest';
import {
    parseNumber,
    isAchieved100,
    extractStoreCodeAndName,
    parseStoreSummaryFromData,
    filterAndSortStoreSummaries,
    getDistinctChannels,
    calculateSystemStats
} from './checkThuongCalc';

describe('checkThuongCalc', () => {
    describe('parseNumber', () => {
        it('parses numbers and strings in Vietnamese and US currency formats', () => {
            expect(parseNumber(123456)).toBe(123456);
            expect(parseNumber('33.689.389')).toBe(33689389);
            expect(parseNumber('33,689,389')).toBe(33689389);
            expect(parseNumber('1.250.000,50')).toBe(1250000.5);
            expect(parseNumber('-')).toBe(0);
            expect(parseNumber('')).toBe(0);
            expect(parseNumber(null)).toBe(0);
        });
    });

    describe('isAchieved100', () => {
        it('detects if percent is >= 100%', () => {
            expect(isAchieved100(1.0)).toBe(true);
            expect(isAchieved100(1.2)).toBe(true);
            expect(isAchieved100(1.05)).toBe(true);
            expect(isAchieved100(0.99)).toBe(false);
            expect(isAchieved100(0.852)).toBe(false);
            expect(isAchieved100(0.649)).toBe(false);
            expect(isAchieved100('0.852')).toBe(false);
            expect(isAchieved100('1.05')).toBe(true);
            expect(isAchieved100('120%')).toBe(true);
            expect(isAchieved100('85%')).toBe(false);
            expect(isAchieved100('100%')).toBe(true);
        });
    });

    describe('extractStoreCodeAndName', () => {
        it('extracts store code and store name cleanly', () => {
            expect(extractStoreCodeAndName('910 - ĐMX 99 Hùng Vương')).toEqual({
                storeCode: '910',
                storeName: 'ĐMX 99 Hùng Vương'
            });
            expect(extractStoreCodeAndName('1024 - TGDD Trần Phú')).toEqual({
                storeCode: '1024',
                storeName: 'TGDD Trần Phú'
            });
            expect(extractStoreCodeAndName('910')).toEqual({
                storeCode: '910',
                storeName: '910'
            });
        });
    });

    describe('parseStoreSummaryFromData', () => {
        const sampleData: any[][] = [
            // Row 1: Store 910, Nganh 1
            ['', '', '', 'DMX', '910 - ĐMX 99 Hùng Vương', 'ĐIỆN THOẠI', 1.2, 0, 1, 1, 1, 0, 0, '10.000.000'],
            // Row 2: Store 910, Nganh 2
            ['', '', '', 'DMX', '910 - ĐMX 99 Hùng Vương', 'TỦ LẠNH', 0.8, 0, 5, 5, 5, 0, 0, '5.000.000'],
            // Row 3: Store 1024, Nganh 1
            ['', '', '', 'TGDD', '1024 - TGDD Trần Hưng Đạo', 'ĐIỆN THOẠI', 1.5, 0, 1, 1, 1, 0, 0, '25.000.000'],
            // Row 4: Store 1024, Nganh 2
            ['', '', '', 'TGDD', '1024 - TGDD Trần Hưng Đạo', 'LAPTOP', 1.1, 0, 2, 2, 2, 0, 0, '15.000.000'],
        ];

        it('aggregates stores, calculates categories count, percentage and bonus', () => {
            const summaries = parseStoreSummaryFromData(sampleData);
            expect(summaries).toHaveLength(2);

            // Store 1024 should be rank 1 (40,000,000 > 15,000,000)
            expect(summaries[0].storeCode).toBe('1024');
            expect(summaries[0].rank).toBe(1);
            expect(summaries[0].totalBonus).toBe(40000000);
            expect(summaries[0].totalCategories).toBe(2);
            expect(summaries[0].achievedCount).toBe(2);
            expect(summaries[0].achievedPercent).toBe(100);

            // Store 910 should be rank 2 (15,000,000)
            expect(summaries[1].storeCode).toBe('910');
            expect(summaries[1].rank).toBe(2);
            expect(summaries[1].totalBonus).toBe(15000000);
            expect(summaries[1].totalCategories).toBe(2);
            expect(summaries[1].achievedCount).toBe(1);
            expect(summaries[1].achievedPercent).toBe(50);
        });
    });

    describe('filterAndSortStoreSummaries & calculateSystemStats', () => {
        const stores = [
            {
                rank: 1,
                rawStore: '1024 - TGDD Trần Hưng Đạo',
                storeCode: '1024',
                storeName: 'TGDD Trần Hưng Đạo',
                channel: 'TGDD',
                totalCategories: 10,
                achievedCount: 8,
                achievedPercent: 80,
                totalBonus: 50000000,
                rows: []
            },
            {
                rank: 2,
                rawStore: '910 - ĐMX 99 Hùng Vương',
                storeCode: '910',
                storeName: 'ĐMX 99 Hùng Vương',
                channel: 'DMX',
                totalCategories: 10,
                achievedCount: 6,
                achievedPercent: 60,
                totalBonus: 30000000,
                rows: []
            }
        ];

        it('filters by channel', () => {
            const filtered = filterAndSortStoreSummaries(stores, {
                channel: 'DMX',
                searchQuery: '',
                sortBy: 'rank',
                sortOrder: 'asc'
            });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].storeCode).toBe('910');
        });

        it('filters by search query', () => {
            const filtered = filterAndSortStoreSummaries(stores, {
                channel: 'ALL',
                searchQuery: 'Hùng Vương',
                sortBy: 'rank',
                sortOrder: 'asc'
            });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].storeCode).toBe('910');
        });

        it('sorts correctly by channel, name, bonus and code', () => {
            // Sort by channel asc: DMX before TGDD
            const byChannelAsc = filterAndSortStoreSummaries(stores, {
                channel: 'ALL',
                searchQuery: '',
                sortBy: 'channel',
                sortOrder: 'asc'
            });
            expect(byChannelAsc[0].channel).toBe('DMX');

            // Sort by channel desc: TGDD before DMX
            const byChannelDesc = filterAndSortStoreSummaries(stores, {
                channel: 'ALL',
                searchQuery: '',
                sortBy: 'channel',
                sortOrder: 'desc'
            });
            expect(byChannelDesc[0].channel).toBe('TGDD');

            // Sort by name asc: "99 Hùng Vương" before "Thốt Nốt"
            const byNameAsc = filterAndSortStoreSummaries(stores, {
                channel: 'ALL',
                searchQuery: '',
                sortBy: 'name',
                sortOrder: 'asc'
            });
            expect(byNameAsc[0].storeCode).toBe('910');

            // Sort by bonus desc: 50.000.000 (1024) before 30.000.000 (910)
            const byBonusDesc = filterAndSortStoreSummaries(stores, {
                channel: 'ALL',
                searchQuery: '',
                sortBy: 'bonus',
                sortOrder: 'desc'
            });
            expect(byBonusDesc[0].storeCode).toBe('1024');
        });

        // Bổ sung 2026-09-18: ca dữ liệu RỖNG. Trước đây ca này chỉ có ở
    // `tests/unit/check-thuong-top-logic.test.ts` — file đó KHÔNG import code thật mà tự chép lại
    // logic, nên nó kiểm một bản sao chứ không kiểm production (nó còn kiểm khái niệm "top 20"
    // vốn không hề tồn tại trong `checkThuongCalc.ts`). Đã xoá file đó và chuyển ca hữu ích sang
    // đây, nơi hàm THẬT được gọi.
    it('xử lý dữ liệu rỗng mà không ném lỗi', () => {
        expect(parseStoreSummaryFromData([])).toEqual([]);
        expect(getDistinctChannels([])).toEqual([]);
        const stats = calculateSystemStats([]);
        expect(stats).toBeDefined();
        expect(filterAndSortStoreSummaries([], { channel: 'all', search: '', sortBy: 'bonus', sortDir: 'desc' } as never)).toEqual([]);
    });

    it('gets distinct channels', () => {
            expect(getDistinctChannels(stores)).toEqual(['DMX', 'TGDD']);
        });

        it('calculates system stats accurately', () => {
            const stats = calculateSystemStats(stores);
            expect(stats.totalStores).toBe(2);
            expect(stats.totalBonus).toBe(80000000);
            expect(stats.avgAchievedPercent).toBe(70);
            expect(stats.topStore?.storeCode).toBe('1024');
        });
    });
});
