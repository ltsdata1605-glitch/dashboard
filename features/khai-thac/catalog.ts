import { ITEM_GROUPS } from './types';
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
        // Bổ sung 2026-09-21 theo yêu cầu chủ dự án.
        { key: 'mango', label: 'Mango', short: 'Mango', icon: 'play-square' },
        { key: 'icalme', label: 'iCalme', short: 'iCalme', icon: 'smartphone-nfc' },
        { key: 'kaspersky', label: 'Kaspersky', short: 'Kaspersky', icon: 'shield' },
    ],
    // Nhóm Bảo hiểm chỉ có ô tiền (AMOUNT_ITEMS), không có mục đếm.
    insurance: [],
    accessories: [
        { key: 'camera', label: 'Camera', short: 'Cam', icon: 'camera' },
        { key: 'sdp', label: 'Sạc dự phòng', short: 'SDP', icon: 'battery-charging' },
        { key: 'den', label: 'Đèn', short: 'Đèn', icon: 'lightbulb' },
        { key: 'loa', label: 'Loa', short: 'Loa', icon: 'speaker' },
        { key: 'taiNghe', label: 'Tai nghe', short: 'T.Nghe', icon: 'headphones' },
    ],
};

/**
 * Ô tiền (Tr) cố định theo nhóm — hiện TRƯỚC các mục đếm trong khối. `Bảo hiểm BHMR` cũ (khoá
 * `insurance`, nằm trong Dịch vụ) đã bỏ 2026-09-21, thay bằng nhóm Bảo hiểm riêng với 2 ô.
 */
export const AMOUNT_ITEMS: Record<ItemGroup, CatalogItem[]> = {
    products: [],
    household: [],
    services: [{ key: 'vi', label: 'Ví (Tr)', short: 'Ví', icon: 'wallet' }],
    insurance: [
        { key: 'bhKhac', label: 'Bảo hiểm Khác (Tr)', short: 'Khác', icon: 'shield-check' },
        { key: 'bhDmx', label: 'Bảo hiểm ĐMX (Tr)', short: 'ĐMX', icon: 'shield-check' },
    ],
    accessories: [],
};

/** Mọi ô tiền cố định, phẳng — để tra nhãn và cộng dồn. */
export const ALL_AMOUNT_ITEMS: CatalogItem[] = ITEM_GROUPS.flatMap(g => AMOUNT_ITEMS[g]);

export const GROUP_META: Record<ItemGroup, { label: string; short: string; emoji: string; icon: string; otherPlaceholder: string | null }> = {
    products: { label: 'Sản phẩm chính', short: 'S.Phẩm', emoji: '📦', icon: 'package', otherPlaceholder: 'Sản phẩm chính khác…' },
    household: { label: 'Điện gia dụng', short: 'G.Dụng', emoji: '🏠', icon: 'fan', otherPlaceholder: 'Gia dụng khác…' },
    services: { label: 'Dịch vụ bổ sung', short: 'D.Vụ', emoji: '🛠', icon: 'shield-check', otherPlaceholder: 'Dịch vụ khác…' },
    // Không có dòng "khác" — "Bảo hiểm Khác" đã là một ô cố định, thêm dòng khác nữa sẽ rối.
    insurance: { label: 'Bảo hiểm', short: 'B.Hiểm', emoji: '🛡', icon: 'shield-check', otherPlaceholder: null },
    accessories: { label: 'Phụ kiện', short: 'P.Kiện', emoji: '🎧', icon: 'headphones', otherPlaceholder: 'Phụ kiện khác…' },
};

/** Thứ tự nhóm trong văn bản báo cáo — giữ app gốc (S.Phẩm → D.Vụ → P.Kiện → G.Dụng), Bảo hiểm chen sau D.Vụ. */
export const TEXT_GROUP_ORDER: ItemGroup[] = ['products', 'services', 'insurance', 'accessories', 'household'];

export function emptyCounts(): Record<ItemGroup, Record<string, number>> {
    return { products: {}, household: {}, services: {}, insurance: {}, accessories: {} };
}

export function emptyOthers(): ReportDraft['others'] {
    return {
        products: { name: '', count: 0 },
        household: { name: '', count: 0 },
        services: { name: '', count: 0 },
        insurance: { name: '', count: 0 },
        accessories: { name: '', count: 0 },
    };
}

/**
 * Di trú ô tiền của bản ghi cũ: `insurance` (Bảo hiểm BHMR, trước 2026-09-21) → `bhDmx` (BHMR là
 * bảo hành mở rộng của ĐMX). Không ghi đè nếu bản ghi đã có `bhDmx`.
 */
export function migrateAmounts(amounts: Record<string, string> | undefined | null): Record<string, string> {
    const out: Record<string, string> = { ...(amounts ?? {}) };
    if (out.insurance !== undefined) {
        if (out.bhDmx === undefined || out.bhDmx === '') out.bhDmx = out.insurance;
        delete out.insurance;
    }
    return out;
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
