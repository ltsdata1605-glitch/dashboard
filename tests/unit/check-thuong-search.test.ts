import { describe, it, expect } from 'vitest';
import {
    createStoreMatcher,
    filterStoreData,
    preProcessCompetitionData,
    getGroupDefinitions,
    analyzeStoreData,
    compareTwoStores
} from '../../features/check-thuong/services/checkThuongSearch';
import { CHECK_THUONG_COLS } from '../../features/check-thuong/services/checkThuongCalc';

describe('checkThuongSearch service', () => {
    // Mock row format:
    // [0..2, 3: KENH, 4: SIEU_THI, 5: NGANH_HANG, 6: %, 7: DU_KIEN_VUOT, 8: LAY_TOP, 9: HANG_VUOT, 10: HANG_TARGET, 11: THUONG_VUOT, 12: THUONG_TOP, 13: TONG_THUONG]
    const sampleData: any[][] = [
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'TIVI', '1.2', '50', '10', '2', '1', '1000000', '500000', '1500000'],
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'TỦ LẠNH', '0.9', '-10', '10', '15', '20', '0', '0', '0'],
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'MÁY GIẶT', '0', '0', '10', '50', '60', '0', '0', '0'],
        ['', '', '', 'DMX', '910 - Vĩnh Phúc', 'GIA DỤNG', '0.8', '-5', '10', '9', '8', '500000', '0', '500000'],
        ['', '', '', 'DMX', '123 - Hà Nội', 'TIVI', '1.1', '30', '10', '5', '4', '800000', '400000', '1200000'],
        ['', '', '', 'DMX', '123 - Hà Nội', 'TỦ LẠNH', '1.05', '10', '10', '8', '6', '600000', '300000', '900000'],
        ['', '', '', 'DMX', '123 - Hà Nội', 'MÁY GIẶT', '1.0', '15', '10', '1', '1', '700000', '0', '700000'],
    ];

    it('matches store by numeric code or partial text correctly', () => {
        const match910 = createStoreMatcher('910');
        expect(match910(sampleData[0])).toBe(true);
        expect(match910(sampleData[4])).toBe(false);

        const matchVinhPhuc = createStoreMatcher('Vĩnh Phúc');
        expect(matchVinhPhuc(sampleData[0])).toBe(true);
        expect(matchVinhPhuc(sampleData[4])).toBe(false);

        const filtered910 = filterStoreData(sampleData, '910');
        expect(filtered910.length).toBe(4);
    });

    it('preprocesses competition data and correctly calculates group definitions', () => {
        const preprocessed = preProcessCompetitionData(sampleData);
        expect(preprocessed.noFundGroups.size).toBe(0); // All channels in sample have awards

        const store910Rows = filterStoreData(sampleData, '910');
        const groups = getGroupDefinitions(store910Rows, preprocessed);

        const achievedGroup = groups.find(g => g.key === 'achieved');
        expect(achievedGroup?.data.length).toBe(2); // TIVI and GIA DỤNG
        // Verify default sort by % dự kiến descending: TIVI (1.2) before GIA DỤNG (0.8)
        expect(achievedGroup?.data[0][CHECK_THUONG_COLS.NGANH_HANG]).toBe('TIVI');
        expect(achievedGroup?.data[1][CHECK_THUONG_COLS.NGANH_HANG]).toBe('GIA DỤNG');

        const nearlyGroup = groups.find(g => g.key === 'nearly');
        expect(nearlyGroup?.data.length).toBe(1); // TỦ LẠNH (rank 15 is <= cutoff 10 + 20)

        const noSaleGroup = groups.find(g => g.key === 'noSale');
        expect(noSaleGroup?.data.length).toBe(1); // MÁY GIẶT (0%)

        const achieved100Group = groups.find(g => g.key === 'achieved100');
        expect(achieved100Group?.data.length).toBe(1); // TIVI (1.2 >= 1.0)
    });

    it('correctly analyzes store data for warnings, opportunities, and no-sale', () => {
        const preprocessed = preProcessCompetitionData(sampleData);
        const store910Rows = filterStoreData(sampleData, '910');
        const analysis = analyzeStoreData(store910Rows, preprocessed);

        expect(analysis.achievedCount).toBe(2);
        expect(analysis.totalCategories).toBe(4);
        expect(analysis.noSaleCount).toBe(1);
        expect(analysis.warningList.length).toBe(1);
        expect(analysis.warningList[0].nganhHang).toBe('GIA DỤNG');
        expect(analysis.warningList[0].currentRank).toBe(8);
        expect(analysis.warningList[0].cutoffRank).toBe(10);
        expect(analysis.opportunityList.length).toBeGreaterThanOrEqual(1);
    });

    it('correctly compares two stores and calculates differences', () => {
        const store1Rows = filterStoreData(sampleData, '910');
        const store2Rows = filterStoreData(sampleData, '123');

        const comparison = compareTwoStores(store1Rows, store2Rows);
        expect(comparison.length).toBe(4);

        const tiviComp = comparison.find(c => c.category === 'TIVI');
        expect(tiviComp).toBeDefined();
        expect(tiviComp?.bonus1).toBe(1500000);
        expect(tiviComp?.bonus2).toBe(1200000);
        expect(tiviComp?.bonusDiff).toBe(300000);
    });
});
