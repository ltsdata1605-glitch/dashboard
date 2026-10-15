import { describe, it, expect } from 'vitest';
import { isHeavySyncKey, isLightSyncKey, isLocalOnlyKey } from '../../utils/localDbScope';
import { isBiConfigKey } from '../../features/bi-dashboard/services/biCloudSyncService';
import { considerCloudDoc } from '../../services/heavySyncPolicy';

describe('Đồng bộ thiết lập cột lên Firebase (All column settings saved to Firebase)', () => {
    const columnSettingKeys = [
        // Bảng Doanh thu (Summary Table)
        'hidden-cols-summary-realtime',
        'hidden-cols-summary-luyke',
        'hidden-supermarkets-summary-realtime',
        'hidden-supermarkets-summary-luyke',
        'bi_hidden-cols-summary-realtime',
        'bi_hidden-cols-summary-luyke',
        'bi_hidden-supermarkets-summary-realtime',
        'bi_hidden-supermarkets-summary-luyke',

        // Bảng Chi tiết Ngành hàng (Industry View)
        'global-hidden-cols-industry-v2',
        'global-hidden-industries',
        'global-hidden-sub-industries',
        'bi_global-hidden-cols-industry-v2',
        'bi_global-hidden-industries',
        'bi_global-hidden-sub-industries',

        // Thẻ KPI Ngành hàng
        'global-industry-kpi-cards-v1',
        'global-industry-kpi-focus-metric-v1',
        'bi_global-industry-kpi-cards-v1',
        'bi_global-industry-kpi-focus-metric-v1',

        // Bảng Thi đua (Competition View)
        'competition-visible-cols-realtime-v6',
        'competition-visible-cols-luyke-v6',
        'bi_competition-visible-cols-realtime-v6',
        'bi_competition-visible-cols-luyke-v6',
    ];

    it.each(columnSettingKeys)('khóa "%s" BẮT BUỘC là isHeavySyncKey để tự động đồng bộ lên Firebase subcollection users/{uid}/configs', (key) => {
        expect(isHeavySyncKey(key)).toBe(true);
    });

    it.each(columnSettingKeys)('khóa "%s" KHÔNG được là local-only để đảm bảo không bị chặn đồng bộ', (key) => {
        expect(isLocalOnlyKey(key)).toBe(false);
    });

    it.each(columnSettingKeys)('khóa "%s" KHÔNG được là isLightSyncKey để tránh phình doc 1MB setting/configuration', (key) => {
        expect(isLightSyncKey(key)).toBe(false);
    });

    it.each(columnSettingKeys)('khóa "%s" được isBiConfigKey nhận diện để pullBiDataFromCloud tải đầy đủ về máy', (key) => {
        expect(isBiConfigKey(key)).toBe(true);
    });

    it('considerCloudDoc chấp nhận các khóa thiết lập cột từ Firebase Cloud', () => {
        const result = considerCloudDoc({
            isHeavyKey: isHeavySyncKey('bi_hidden-cols-summary-realtime'),
            hasPendingWrites: false,
            localWritePendingOrInFlight: false,
            data: { value: ['Lượt Khách LK', 'TB 3T'], updatedAt: 1729000000000 }
        });
        expect(result.consider).toBe(true);
        if (result.consider) {
            expect(result.cloudTimeMs).toBe(1729000000000);
        }
    });
});
