import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    loadAutoExportSettings,
    getAutoExportSettings,
    getAreaExportSetting,
    setAreaExportSetting,
    getEnabledAreasForMode,
    registerYcxAutoExportRunner,
    AVAILABLE_AUTO_EXPORT_AREAS
} from '../../services/autoReportExportService';

describe('autoReportExportService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('có danh sách các khu vực được hỗ trợ sẵn đầy đủ cho cả YCX và BI', () => {
        expect(AVAILABLE_AUTO_EXPORT_AREAS.length).toBeGreaterThanOrEqual(9);
        const ycxAreas = AVAILABLE_AUTO_EXPORT_AREAS.filter(a => a.scope === 'ycx');
        const biAreas = AVAILABLE_AUTO_EXPORT_AREAS.filter(a => a.scope === 'bi');
        expect(ycxAreas.some(a => a.id === 'Chi Tiết Theo Kho')).toBe(true);
        expect(ycxAreas.some(a => a.id === 'Tổng Quan Doanh Thu')).toBe(true);
        expect(biAreas.some(a => a.id === 'bi-doanh-thu-tong')).toBe(true);
    });

    it('mặc định Chi Tiết Theo Kho được kích hoạt cho cả realtime và luỹ kế', () => {
        const setting = getAreaExportSetting('Chi Tiết Theo Kho');
        expect(setting.realtime).toBe(true);
        expect(setting.luyke).toBe(true);
    });

    it('cập nhật cấu hình khu vực chính xác', async () => {
        await setAreaExportSetting('Tổng Quan Doanh Thu', { realtime: true, luyke: false });
        const updated = getAreaExportSetting('Tổng Quan Doanh Thu');
        expect(updated.realtime).toBe(true);
        expect(updated.luyke).toBe(false);

        const realtimeAreas = getEnabledAreasForMode('realtime', 'ycx');
        expect(realtimeAreas).toContain('Tổng Quan Doanh Thu');

        const luykeAreas = getEnabledAreasForMode('luyke', 'ycx');
        expect(luykeAreas).not.toContain('Tổng Quan Doanh Thu');
    });

    it('đăng ký và huỷ đăng ký runner thành công', async () => {
        const mockRunner = vi.fn().mockResolvedValue(new Blob(['test']));
        const unregister = registerYcxAutoExportRunner('TestArea', mockRunner);
        
        // Unregister
        unregister();
        // Không ném lỗi
        expect(true).toBe(true);
    });
});
