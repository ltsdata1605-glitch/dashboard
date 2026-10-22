import { describe, expect, it, vi } from 'vitest';
import { isLightSyncKey } from '../../utils/localDbScope';

// services/syncService (laKhoaDongBoCu) import services/firebase — không dựng Firebase thật trong test đơn vị.
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null } }));

// Chỉ khoá đồng bộ nhẹ mới được đóng mốc `localSettingsLastModified` (2026-09-28). Trước đây mọi lượt
// ghi đều đóng mốc → máy luôn "mới hơn Cloud", không nhận thay đổi cấu hình từ máy khác.
describe('isLightSyncKey', () => {
    it.each(['kpiCardConfig', 'warehouseColumnConfig', 'dashboard_global_filters_v2', 'industryVisibleGroups', 'printSettings', 'bi_supermarket-list', 'force_push_override'])('%s → đồng bộ nhẹ', k => {
        expect(isLightSyncKey(k)).toBe(true);
    });
    it.each([
        'cached_user_role', 'cached_lightCloudPulled_v1', 'lastModified_kpiCardConfig', 'localSettingsLastModified',
        'productConfig', 'global_product_config_updated_at', 'customTabs', 'customExploitationTabs', 'analysis-employees-list', 'checkthuong_data',
        'bi_config-Tân Hiệp-thidua', 'bi_bonus-data-Tân Hiệp', 'bi_nhanvien-active-tab', 'active-tab-x',
        'summary-realtime', 'salesFilesRegistry', 'stickerSavedLists',
        'warehouseViewMode', 'warehouseVerticalKhoFilter',
    ])('%s → KHÔNG', k => {
        expect(isLightSyncKey(k)).toBe(false);
    });
});

it('mốc cấu hình ngành hàng của máy (global_product_config_updated_at): riêng từng máy — không đi đường mới lẫn đường cũ', async () => {
    const { isLocalOnlyKey } = await import('../../utils/localDbScope');
    const { laKhoaDongBoCu } = await import('../../services/syncService');
    expect(isLocalOnlyKey('global_product_config_updated_at')).toBe(true);
    expect(isLightSyncKey('global_product_config_updated_at')).toBe(false);
    expect(laKhoaDongBoCu('global_product_config_updated_at')).toBe(false);
});

describe('isHeavySyncKey — nhận diện đầy đủ khóa nặng thi đua và cấu hình lớn', () => {
    it.each([
        'checkthuong_data',
        'competition-luy-ke',
        'competition-realtime',
        'summary-luy-ke',
        'summary-realtime',
        'bi_competition-luy-ke',
        'bi_competition-realtime',
        'bi_summary-luy-ke',
        'bi_summary-realtime',
        'config-Tân Hiệp-thidua',
        'bi_config-Tân Hiệp-thidua',
        'analysis-employees-list',
        'productConfig',
        'tile-custom-links',
        'bi_tile-custom-links',
        'hidden-cols-summary-realtime',
        'bi_hidden-cols-summary-realtime',
        'hidden-cols-summary-luyke',
        'bi_hidden-cols-summary-luyke',
        'hidden-supermarkets-summary-realtime',
        'bi_hidden-supermarkets-summary-realtime',
        'global-hidden-cols-industry-v2',
        'bi_global-hidden-cols-industry-v2',
        'global-hidden-industries',
        'global-hidden-sub-industries',
        'global-industry-kpi-cards-v1',
        'global-industry-kpi-focus-metric-v1',
        'competition-visible-cols-realtime-v6',
        'competition-visible-cols-luyke-v6'
    ])('%s → là khoá nặng', async (k) => {
        const { isHeavySyncKey } = await import('../../utils/localDbScope');
        expect(isHeavySyncKey(k)).toBe(true);
    });
});

describe('bộ đệm Kho không phải cấu hình nhẹ + so giá trị', () => {
    it('khoDataCache_/khoDataAppliedSnapshot:: → KHÔNG đồng bộ nhẹ', async () => {
        expect(isLightSyncKey('khoDataCache_910_realtime_uid')).toBe(false);
        expect(isLightSyncKey('khoDataAppliedSnapshot::910')).toBe(false);
    });
    it('giongNhau: so sâu, hiểu Set; không so được thì coi là khác', async () => {
        const { giongNhau } = await import('../../utils/localDbScope');
        expect(giongNhau({ a: [1, 2], b: new Set(['x']) }, { a: [1, 2], b: new Set(['x']) })).toBe(true);
        expect(giongNhau({ a: 1 }, { a: 2 })).toBe(false);
        expect(giongNhau(new Set(['x']), new Set(['y']))).toBe(false);
        const vong: Record<string, unknown> = {}; vong.self = vong;
        expect(giongNhau(vong, vong)).toBe(true); // cùng tham chiếu
        expect(giongNhau(vong, { self: {} })).toBe(false); // JSON lỗi vòng → khác
    });
});

it('giongNhau bỏ qua thứ tự khoá (Firestore trả map đã xếp a→z)', async () => {
    const { giongNhau } = await import('../../utils/localDbScope');
    expect(giongNhau({ b: 1, a: { d: 2, c: 3 } }, { a: { c: 3, d: 2 }, b: 1 })).toBe(true);
    expect(giongNhau([1, 2], [2, 1])).toBe(false); // mảng vẫn giữ thứ tự
});
