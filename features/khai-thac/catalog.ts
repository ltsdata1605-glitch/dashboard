import { ITEM_GROUPS } from './types';
import type { ItemGroup, ReportDraft, CustomField } from './types';
import { evaluateExpression, hasOperator } from './utils/expression';

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
        // Bổ sung 2026-09-21 theo yêu cầu chủ dự án. DCNB = dụng cụ nhà bếp.
        { key: 'bepDien', label: 'Bếp điện', short: 'B.Điện', icon: 'plug-zap' },
        { key: 'bepGas', label: 'Bếp gas', short: 'B.Gas', icon: 'flame' },
        { key: 'dcnb', label: 'DCNB', short: 'DCNB', icon: 'coffee' },
    ],
    // Nhóm "Vas" (tên cũ "Dịch vụ bổ sung", đổi 2026-09-21). SIM/Đồng hồ đã chuyển sang nhóm Ưu tiên.
    services: [
        { key: 'vieon', label: 'Vieon', short: 'Vieon', icon: 'play-square' },
        { key: 'mango', label: 'Mango', short: 'Mango', icon: 'play-square' },
        { key: 'icalme', label: 'iCalme', short: 'iCalme', icon: 'smartphone-nfc' },
        { key: 'kaspersky', label: 'Kaspersky', short: 'Kaspersky', icon: 'shield' },
    ],
    // Nhóm "Ưu tiên" (khoá nội bộ `insurance` giữ nguyên vì đã có dữ liệu lưu theo khoá này):
    // 2 mục đếm SIM/Đồng hồ (chuyển từ Vas sang 2026-09-21) + 2 ô tiền bảo hiểm (AMOUNT_ITEMS).
    insurance: [
        { key: 'sim', label: 'SIM', short: 'SIM', icon: 'cpu' },
        { key: 'dongHo', label: 'Đồng hồ', short: 'ĐH', icon: 'watch' },
    ],
    accessories: [
        { key: 'camera', label: 'Camera', short: 'Cam', icon: 'camera' },
        { key: 'sdp', label: 'Sạc dự phòng', short: 'SDP', icon: 'battery-charging' },
        { key: 'den', label: 'Đèn', short: 'Đèn', icon: 'lightbulb' },
        { key: 'loa', label: 'Loa', short: 'Loa', icon: 'speaker' },
        { key: 'taiNghe', label: 'Tai nghe', short: 'T.Nghe', icon: 'headphones' },
    ],
};

/**
 * Ô tiền (Tr) cố định theo nhóm — hiện TRƯỚC các mục đếm trong khối. Đã bỏ 2026-09-21: `Bảo hiểm
 * BHMR` (khoá `insurance`, thay bằng nhóm Bảo hiểm riêng) và `Ví (Tr)` (khoá `vi` — Mở Ví giờ chỉ
 * là nút bật/tắt ở khối Doanh thu; số tiền ví cũ trong bản ghi cũ không hiện nữa).
 */
export const AMOUNT_ITEMS: Record<ItemGroup, CatalogItem[]> = {
    products: [],
    household: [],
    services: [],
    insurance: [
        { key: 'bhKhac', label: 'Bảo hiểm Khác (Tr)', short: 'BH Khác', icon: 'shield-check' },
        { key: 'bhDmx', label: 'Bảo hiểm ĐMX (Tr)', short: 'BH ĐMX', icon: 'shield-check' },
    ],
    accessories: [],
};

/** Mọi ô tiền cố định, phẳng — để tra nhãn và cộng dồn. */
export const ALL_AMOUNT_ITEMS: CatalogItem[] = ITEM_GROUPS.flatMap(g => AMOUNT_ITEMS[g]);

export const GROUP_META: Record<ItemGroup, { label: string; short: string; emoji: string; icon: string; otherPlaceholder: string | null }> = {
    products: { label: 'Sản phẩm chính', short: 'S.Phẩm', emoji: '📦', icon: 'package', otherPlaceholder: 'Sản phẩm chính khác…' },
    household: { label: 'Gia dụng', short: 'G.Dụng', emoji: '🏠', icon: 'fan', otherPlaceholder: 'Gia dụng khác…' },
    services: { label: 'Vas', short: 'Vas', emoji: '🛠', icon: 'shield-check', otherPlaceholder: 'Vas khác…' },
    // Không có dòng "khác" — "Bảo hiểm Khác" đã là một ô cố định, thêm dòng khác nữa sẽ rối.
    insurance: { label: 'Ưu tiên', short: 'Ư.Tiên', emoji: '⭐', icon: 'star', otherPlaceholder: null },
    accessories: { label: 'Phụ kiện', short: 'P.Kiện', emoji: '🎧', icon: 'headphones', otherPlaceholder: 'Phụ kiện khác…' },
};

/**
 * Thứ tự nhóm trong văn bản báo cáo — theo đúng thứ tự form (`ITEM_GROUPS`) từ 2026-09-21. Trước đó
 * giữ thứ tự app gốc (S.Phẩm → Vas → P.Kiện → G.Dụng); tách hằng riêng để nếu cần đổi lại chỉ sửa đây.
 */
export const TEXT_GROUP_ORDER: ItemGroup[] = ITEM_GROUPS;

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

/** Đơn cũ (trước 2026-09-21) chỉ có ô số trả chậm — có số > 0 nghĩa là có trả góp. */
export function resolveTraGop(r: { traGop?: boolean; installment?: string }): boolean {
    if (typeof r.traGop === 'boolean') return r.traGop;
    return parseTr(r.installment) > 0;
}

export function createEmptyDraft(staffName = ''): ReportDraft {
    return {
        staffName,
        revenueTotal: '',
        traGop: false,
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

/**
 * Đọc số Tr từ ô nhập. Chuỗi có phép tính ("5+3+4") được tính ra giá trị; biểu thức dở ("5+") thì
 * lấy phần số đầu như trước để xem trước không nhảy về 0 giữa lúc gõ.
 */
export function parseTr(value: string | number | undefined | null): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
    const str = String(value);
    if (hasOperator(str)) {
        const v = evaluateExpression(str);
        if (v !== null) return v > 0 ? v : 0;
    }
    const n = parseFloat(str.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Mục tuỳ chỉnh dạng ĐẾM của một nhóm — để dựng dòng đếm và cộng dồn. */
export function customCountFields(fields: CustomField[], group: ItemGroup): CustomField[] {
    return fields.filter(f => f.group === group && f.type === 'count');
}

export function customRevenueFields(fields: CustomField[], group: ItemGroup): CustomField[] {
    return fields.filter(f => f.group === group && f.type === 'revenue');
}
