import type { ItemGroup, ReportDraft, CustomField } from './types';

/**
 * Danh mục mặt hàng cố định của từng nhóm. `short` là nhãn viết tắt dùng trong văn bản báo cáo
 * gửi Zalo/Line — GIỮ NGUYÊN như app gốc vì nhân viên đã quen mẫu đó.
 * `icon` là tên icon lucide (kebab-case) dùng qua `components/common/Icon`.
 */
export interface CatalogItem {
    key: string;
    label: string;
    short: string;
    icon: string;
}

export const COUNT_ITEMS: Record<ItemGroup, CatalogItem[]> = {
    products: [
        { key: 'tivi', label: 'Tivi', short: 'Tivi', icon: 'tv' },
        { key: 'tuLanh', label: 'Tủ lạnh', short: 'TL', icon: 'thermometer-snowflake' },
        { key: 'mayGiat', label: 'Máy giặt', short: 'MG', icon: 'waves' },
        { key: 'mayLanh', label: 'Máy lạnh', short: 'ML', icon: 'wind' },
        { key: 'smpTab', label: 'SMP / Tab', short: 'SMP', icon: 'smartphone' },
        { key: 'laptop', label: 'Laptop', short: 'LT', icon: 'laptop' },
    ],
    household: [
        { key: 'mln', label: 'Máy lọc nước', short: 'MLN', icon: 'droplets' },
        { key: 'qdh', label: 'Quạt điều hoà', short: 'QĐH', icon: 'tornado' },
        { key: 'quat', label: 'Quạt gió', short: 'Quạt', icon: 'fan' },
        { key: 'noiCom', label: 'Nồi cơm', short: 'N.Cơm', icon: 'chef-hat' },
        { key: 'noiChien', label: 'Nồi chiên', short: 'N.Chiên', icon: 'flame' },
        { key: 'locKk', label: 'Máy lọc KK', short: 'LKK', icon: 'sparkles' },
    ],
    services: [
        { key: 'vieon', label: 'Vieon', short: 'Vieon', icon: 'play-square' },
        { key: 'sim', label: 'SIM', short: 'SIM', icon: 'cpu' },
        { key: 'dongHo', label: 'Đồng hồ', short: 'ĐH', icon: 'watch' },
    ],
    accessories: [
        { key: 'camera', label: 'Camera', short: 'Cam', icon: 'camera' },
        { key: 'sdp', label: 'Sạc dự phòng', short: 'SDP', icon: 'battery-charging' },
        { key: 'den', label: 'Đèn', short: 'Đèn', icon: 'lightbulb' },
        { key: 'loa', label: 'Loa', short: 'Loa', icon: 'speaker' },
    ],
};

/** Ô tiền (Tr) cố định — chỉ nhóm Dịch vụ có. */
export const AMOUNT_ITEMS: CatalogItem[] = [
    { key: 'vi', label: 'Ví (Tr)', short: 'Ví', icon: 'wallet' },
    { key: 'insurance', label: 'Bảo hiểm BHMR (Tr)', short: 'BH', icon: 'shield-check' },
];

export const GROUP_META: Record<ItemGroup, { label: string; short: string; emoji: string; icon: string; otherPlaceholder: string }> = {
    products: { label: 'Sản phẩm chính', short: 'S.Phẩm', emoji: '📦', icon: 'package', otherPlaceholder: 'Sản phẩm chính khác…' },
    household: { label: 'Điện gia dụng', short: 'G.Dụng', emoji: '🏠', icon: 'fan', otherPlaceholder: 'Gia dụng khác…' },
    services: { label: 'Dịch vụ bổ sung', short: 'D.Vụ', emoji: '🛠', icon: 'shield-check', otherPlaceholder: 'Dịch vụ khác…' },
    accessories: { label: 'Phụ kiện', short: 'P.Kiện', emoji: '🎧', icon: 'headphones', otherPlaceholder: 'Phụ kiện khác…' },
};

/** Thứ tự nhóm trong văn bản báo cáo — giữ nguyên app gốc (S.Phẩm → D.Vụ → P.Kiện → G.Dụng). */
export const TEXT_GROUP_ORDER: ItemGroup[] = ['products', 'services', 'accessories', 'household'];

export const ITEM_GROUPS: ItemGroup[] = ['products', 'household', 'services', 'accessories'];

export function emptyCounts(): Record<ItemGroup, Record<string, number>> {
    return { products: {}, household: {}, services: {}, accessories: {} };
}

export function emptyOthers(): ReportDraft['others'] {
    return {
        products: { name: '', count: 0 },
        household: { name: '', count: 0 },
        services: { name: '', count: 0 },
        accessories: { name: '', count: 0 },
    };
}

export function createEmptyDraft(staffName = ''): ReportDraft {
    return {
        staffName,
        revenueTotal: '',
        installment: '',
        moVi: false,
        priceWar: false,
        counts: emptyCounts(),
        amounts: {},
        others: emptyOthers(),
        notes: '',
    };
}

/** Mã NV - Tên, ví dụ "21707 - Sơn". Cùng regex với app gốc. */
export function isValidStaffName(name: string): boolean {
    return /^\d+\s*-\s*\S+/.test(name.trim());
}

export function parseTr(value: string | number | undefined | null): number {
    if (value === undefined || value === null) return 0;
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Mục tuỳ chỉnh dạng ĐẾM của một nhóm — để dựng dòng đếm và cộng dồn. */
export function customCountFields(fields: CustomField[], group: ItemGroup): CustomField[] {
    return fields.filter(f => f.group === group && f.type === 'count');
}

export function customRevenueFields(fields: CustomField[], group: ItemGroup): CustomField[] {
    return fields.filter(f => f.group === group && f.type === 'revenue');
}
