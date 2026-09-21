import type { SavedReport, ReportDraft, CustomField, ItemGroup, DashboardRange } from '../types';
import { ITEM_GROUPS } from '../types';
import { COUNT_ITEMS, AMOUNT_ITEMS, parseTr, customCountFields, customRevenueFields, migrateAmounts } from '../catalog';

/** YYYY-MM-DD theo giờ máy (KHÔNG dùng toISOString — lệch ngày sau 17h ở múi giờ +7). */
export function localDateKey(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Thứ Hai đầu tuần chứa `d` (tuần Thứ Hai → Chủ Nhật). */
export function startOfWeek(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = x.getDay(); // 0 = CN
    x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
    return x;
}

export function isInRange(dateKey: string, range: DashboardRange, now: Date = new Date()): boolean {
    if (range === 'today') return dateKey === localDateKey(now);
    if (range === 'month') return dateKey.slice(0, 7) === localDateKey(now).slice(0, 7);
    const monday = startOfWeek(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return dateKey >= localDateKey(monday) && dateKey <= localDateKey(sunday);
}

export interface RankedItem {
    key: string;
    label: string;
    count: number;
}

export interface DashboardSummary {
    orders: number;
    revenueTotal: number;
    installment: number;
    cash: number;
    installmentRate: number;
    moViCount: number;
    priceWarCount: number;
    viTr: number;
    /** Tổng mọi ô bảo hiểm (Khác + ĐMX + BHMR cũ đã di trú). */
    insuranceTr: number;
    /** Tổng tiền (Tr) từng ô tiền cố định, theo khoá (vi, bhKhac, bhDmx…). */
    amounts: Record<string, number>;
    /** Tổng số lượng từng mục theo nhóm (kể cả mục tuỳ chỉnh dạng đếm), đã sắp giảm dần. */
    ranking: Record<ItemGroup, RankedItem[]>;
    /** Tổng tiền (Tr) của mục tuỳ chỉnh dạng tiền, theo id. */
    customRevenue: Record<string, number>;
    otherCounts: Record<ItemGroup, number>;
}

const emptyByGroup = <T,>(make: () => T): Record<ItemGroup, T> =>
    Object.fromEntries(ITEM_GROUPS.map(g => [g, make()])) as Record<ItemGroup, T>;

export function summarize(reports: SavedReport[], fields: CustomField[]): DashboardSummary {
    let revenueTotal = 0, installment = 0, moViCount = 0, priceWarCount = 0;
    const sums = emptyByGroup<Record<string, number>>(() => ({}));
    const otherCounts = emptyByGroup<number>(() => 0);
    const amounts: Record<string, number> = {};
    const customRevenue: Record<string, number> = {};

    for (const r of reports) {
        const total = parseTr(r.revenueTotal);
        const inst = parseTr(r.installment);
        revenueTotal += total;
        installment += inst;
        if (r.moVi) moViCount++;
        if (r.priceWar) priceWarCount++;
        const rAmounts = migrateAmounts(r.amounts);
        for (const g of ITEM_GROUPS) {
            for (const item of AMOUNT_ITEMS[g]) amounts[item.key] = (amounts[item.key] ?? 0) + parseTr(rAmounts[item.key]);
            const counts = r.counts?.[g] ?? {};
            for (const [k, v] of Object.entries(counts)) sums[g][k] = (sums[g][k] ?? 0) + (Number(v) || 0);
            otherCounts[g] += Number(r.others?.[g]?.count) || 0;
        }
        for (const f of fields) {
            if (f.type === 'revenue') customRevenue[f.id] = (customRevenue[f.id] ?? 0) + parseTr(rAmounts[f.id]);
        }
    }

    const ranking = {} as Record<ItemGroup, RankedItem[]>;
    for (const g of ITEM_GROUPS) {
        const items: RankedItem[] = [
            ...COUNT_ITEMS[g].map(i => ({ key: i.key, label: i.label, count: sums[g][i.key] ?? 0 })),
            ...customCountFields(fields, g).map(f => ({ key: f.id, label: f.name, count: sums[g][f.id] ?? 0 })),
        ];
        ranking[g] = items.sort((a, b) => b.count - a.count);
    }

    const cash = Math.max(0, revenueTotal - installment);
    return {
        orders: reports.length,
        revenueTotal,
        installment,
        cash,
        installmentRate: revenueTotal > 0 ? Math.round((installment / revenueTotal) * 100) : 0,
        moViCount,
        priceWarCount,
        viTr: amounts.vi ?? 0,
        insuranceTr: AMOUNT_ITEMS.insurance.reduce((s, item) => s + (amounts[item.key] ?? 0), 0),
        amounts,
        ranking,
        customRevenue,
        otherCounts,
    };
}

/** Tổng số lượng của một nhóm trong một đơn (mục chuẩn + tuỳ chỉnh đếm + "khác"). */
export function groupTotal(r: ReportDraft, g: ItemGroup): number {
    const counts = r.counts?.[g] ?? {};
    const base = Object.values(counts).reduce<number>((s, v) => s + (Number(v) || 0), 0);
    return base + (Number(r.others?.[g]?.count) || 0);
}

/**
 * Cảnh báo mặt hàng "3 ngày liên tiếp không khai thác": hôm nay (nháp + các đơn đã lưu hôm nay)
 * = 0 VÀ 2 ngày có báo cáo gần nhất trước đó đều = 0. Gộp theo NGÀY chứ không theo đơn — một ngày
 * có nhiều đơn, lấy 2 đơn gần nhất sẽ chỉ nhìn được nửa ngày.
 */
export function streakWarnings(draft: ReportDraft, reports: SavedReport[], fields: CustomField[], now: Date = new Date()): string[] {
    const today = localDateKey(now);
    const pastDays = Array.from(new Set(reports.map(r => r.date).filter(d => d < today))).sort().slice(-2);
    if (pastDays.length < 2) return [];

    const items = ITEM_GROUPS.flatMap(g => [
        ...COUNT_ITEMS[g].map(i => ({ g, key: i.key, label: i.label })),
        ...customCountFields(fields, g).map(f => ({ g, key: f.id, label: f.name })),
    ]);

    const sumOn = (day: string, g: ItemGroup, key: string) =>
        reports.filter(r => r.date === day).reduce((s, r) => s + (Number(r.counts?.[g]?.[key]) || 0), 0);

    const out: string[] = [];
    for (const it of items) {
        const todayVal = (Number(draft.counts?.[it.g]?.[it.key]) || 0) + sumOn(today, it.g, it.key);
        if (todayVal > 0) continue;
        if (pastDays.every(d => sumOn(d, it.g, it.key) === 0)) out.push(it.label);
    }
    return out;
}

export { customRevenueFields };
