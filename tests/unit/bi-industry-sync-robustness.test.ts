import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBiIndustryContentValid, applyBiSyncResults } from '../../features/bi-dashboard/services/biAutoSyncService';
import { configStore } from '../../features/bi-dashboard/store/configStore';
import * as db from '../../features/bi-dashboard/utils/db';

describe('BI Industry Sync Robustness Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configStore.clearCache();
    });

    const sampleValidIndustryTsv = [
        'NGÀNH HÀNG / NHÓM HÀNG\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET (LK)\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
        'Apple\t2\t84\t100.0%\t84\t—\t—\t105\t-20%\t0\t0.0%',
        'Gia dụng\t19\t61\t100.0%\t33\t—\t—\t190\t-68%\t0\t0.0%',
        'Tổng\t71\t391\t100.0%\t296\t—\t—\t934\t-58%\t59\t20%'
    ].join('\n');

    const sampleHeaderOnlyTsv = [
        'NGÀNH HÀNG / NHÓM HÀNG\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET (LK)\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
        'Tổng\t0\t0\t100.0%\t0\t—\t—\t0\t0.0%\t0\t0.0%'
    ].join('\n');

    it('isBiIndustryContentValid detects valid vs invalid/empty industry content', () => {
        expect(isBiIndustryContentValid(sampleValidIndustryTsv)).toBe(true);
        expect(isBiIndustryContentValid(sampleHeaderOnlyTsv)).toBe(false);
        expect(isBiIndustryContentValid('')).toBe(false);
        expect(isBiIndustryContentValid(null)).toBe(false);
        expect(isBiIndustryContentValid('Short text')).toBe(false);
    });

    it('applyBiSyncResults stores industry under both prefixed (ĐMX HÙNG VƯƠNG) and clean (HÙNG VƯƠNG) keys', async () => {
        const mockSet = vi.spyOn(db, 'set').mockResolvedValue();

        const results = {
            summary: 'sample summary',
            competition: 'sample comp',
            industryByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleValidIndustryTsv
            }
        };

        const res = await applyBiSyncResults('realtime', results as any, 'HÙNG VƯƠNG');
        expect(res.successCount).toBeGreaterThan(0);
        expect(res.errors).toHaveLength(0);

        const savedKeys = mockSet.mock.calls.map(call => call[0]);
        
        // Phải lưu cả ĐMX HÙNG VƯƠNG và HÙNG VƯƠNG (không có tiền tố ĐMX)
        expect(savedKeys).toContain('config-ĐMX HÙNG VƯƠNG-industry-realtime');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-industry-realtime');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-industry-realtime-ts');
    });

    it('applyBiSyncResults for Luỹ kế stores industry with cleanName and matches activeSupermarket', async () => {
        const mockSet = vi.spyOn(db, 'set').mockResolvedValue();

        const results = {
            summary: 'sample summary lk',
            industryByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleValidIndustryTsv
            }
        };

        const res = await applyBiSyncResults('luyke', results as any, 'HÙNG VƯƠNG');
        expect(res.successCount).toBeGreaterThan(0);
        expect(res.errors).toHaveLength(0);

        const savedKeys = mockSet.mock.calls.map(call => call[0]);
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-industry-luyke');
        expect(savedKeys).toContain('config-ĐMX HÙNG VƯƠNG-industry-luyke');
    });

    it('does NOT overwrite existing valid industry data if incoming store data is empty/invalid', async () => {
        const mockSet = vi.spyOn(db, 'set').mockResolvedValue();

        const results = {
            summary: 'sample summary line 1\nsample summary line 2\nsample summary line 3',
            industryByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleHeaderOnlyTsv // invalid/empty data
            }
        };

        const res = await applyBiSyncResults('realtime', results as any, 'HÙNG VƯƠNG');
        expect(res.successCount).toBeGreaterThan(0);
        expect(res.errors).toHaveLength(0);

        const savedIndustryKeys = mockSet.mock.calls
            .map(call => call[0])
            .filter(key => key.includes('industry'));

        // Không được lưu dữ liệu rỗng/hỏng
        expect(savedIndustryKeys).toHaveLength(0);
    });

    it('applyBiSyncResults for Realtime stores both employee Thực and employee Quy đổi', async () => {
        const mockSet = vi.spyOn(db, 'set').mockResolvedValue();

        const sampleStaffThuc = [
            'NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU\t% TỈ TRỌNG\tTARGET\t% HT TARGET\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
            '107617 - Phạm Anh Nhân\t230\t791\t—\t—\t—\t—\t—\t50\t6.3%',
            'Tổng\t230\t791\t100.0%\t—\t—\t—\t—\t50\t6.3%'
        ].join('\n');

        const sampleStaffQd = [
            'NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tTARGET\t% HT TARGET\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
            '107617 - Phạm Anh Nhân\t230\t850\t—\t—\t—\t—\t—\t50\t5.9%',
            'Tổng\t230\t850\t100.0%\t—\t—\t—\t—\t50\t5.9%'
        ].join('\n');

        const results = {
            summary: 'sample summary line 1\nsample summary line 2',
            employeeThucByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleStaffThuc
            },
            employeeQdByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleStaffQd
            }
        };

        const res = await applyBiSyncResults('realtime', results as any, 'HÙNG VƯƠNG');
        expect(res.successCount).toBeGreaterThan(0);
        expect(res.errors).toHaveLength(0);

        const savedKeys = mockSet.mock.calls.map(call => call[0]);
        // Lưu Thực vào config-*-employee-realtime
        expect(savedKeys).toContain('config-ĐMX HÙNG VƯƠNG-employee-realtime');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-employee-realtime');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-employee-realtime-ts');

        // Lưu Quy đổi vào config-*-employee-realtime-qd
        expect(savedKeys).toContain('config-ĐMX HÙNG VƯƠNG-employee-realtime-qd');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-employee-realtime-qd');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-employee-realtime-qd-ts');
    });

    it('applyBiSyncResults for Luỹ kế stores both employee Thực and employee Quy đổi under danhsach & employee-luyke', async () => {
        const mockSet = vi.spyOn(db, 'set').mockResolvedValue();

        const sampleStaffThuc = [
            'NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU\t% TỈ TRỌNG\tTARGET\t% HT TARGET\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
            '107617 - Phạm Anh Nhân\t230\t791\t—\t—\t—\t—\t—\t50\t6.3%',
            'Tổng\t230\t791\t100.0%\t—\t—\t—\t—\t50\t6.3%'
        ].join('\n');

        const sampleStaffQd = [
            'NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tTARGET\t% HT TARGET\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
            '107617 - Phạm Anh Nhân\t230\t850\t—\t—\t—\t—\t—\t50\t5.9%',
            'Tổng\t230\t850\t100.0%\t—\t—\t—\t—\t50\t5.9%'
        ].join('\n');

        const results = {
            summary: 'sample summary lk line 1\nsample summary lk line 2',
            employeeThucByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleStaffThuc
            },
            employeeQdByStore: {
                '9560 - ĐMX HÙNG VƯƠNG': sampleStaffQd
            }
        };

        const res = await applyBiSyncResults('luyke', results as any, 'HÙNG VƯƠNG');
        expect(res.successCount).toBeGreaterThan(0);
        expect(res.errors).toHaveLength(0);

        const savedKeys = mockSet.mock.calls.map(call => call[0]);
        // Lưu Thực vào danhsach và employee-luyke
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-danhsach');
        expect(savedKeys).toContain('config-ĐMX HÙNG VƯƠNG-danhsach');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-employee-luyke');

        // Lưu Quy đổi vào danhsach-qd và employee-luyke-qd
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-danhsach-qd');
        expect(savedKeys).toContain('config-ĐMX HÙNG VƯƠNG-danhsach-qd');
        expect(savedKeys).toContain('config-HÙNG VƯƠNG-employee-luyke-qd');
    });
});
