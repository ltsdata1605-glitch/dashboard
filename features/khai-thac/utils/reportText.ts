import type { ReportDraft, CustomField, ItemGroup } from '../types';
import { COUNT_ITEMS, AMOUNT_ITEMS, ALL_AMOUNT_ITEMS, GROUP_META, TEXT_GROUP_ORDER, parseTr, customCountFields, customRevenueFields, migrateAmounts, resolveTraGop } from '../catalog';

/** Số Tr gọn: 8 → "8", 8.5 → "8.5", 0.30000001 → "0.3". */
export function fmtTr(n: number): string {
    return String(parseFloat(n.toFixed(2)));
}

function groupLine(draft: ReportDraft, group: ItemGroup, fields: CustomField[]): string | null {
    const parts: string[] = [];
    const counts = draft.counts?.[group] ?? {};
    const amounts = migrateAmounts(draft.amounts);

    // Mục đếm trước, ô tiền cố định sau (nhóm Ưu tiên: SIM, ĐH rồi BH Khác, BH ĐMX).
    for (const item of COUNT_ITEMS[group]) {
        const v = Number(counts[item.key]) || 0;
        if (v > 0) parts.push(`${item.short}: ${v}`);
    }
    for (const item of AMOUNT_ITEMS[group]) {
        const v = parseTr(amounts[item.key]);
        if (v > 0) parts.push(`${item.short}: ${fmtTr(v)}`);
    }
    for (const f of customCountFields(fields, group)) {
        const v = Number(counts[f.id]) || 0;
        if (v > 0) parts.push(`${f.name}: ${v}`);
    }
    for (const f of customRevenueFields(fields, group)) {
        const v = parseTr(amounts[f.id]);
        if (v > 0) parts.push(`${f.name}: ${fmtTr(v)}`);
    }
    const other = draft.others?.[group];
    if (other && other.name.trim() && other.count > 0) parts.push(`${other.name.trim()}: ${other.count}`);

    if (parts.length === 0) return null;
    const meta = GROUP_META[group];
    return `${meta.emoji} ${meta.short}: ${parts.join(' | ')}`;
}

/**
 * Văn bản báo cáo gửi Zalo/Line — GIỮ NGUYÊN định dạng của app gốc (nhân viên đã quen mẫu này).
 */
export function buildReportText(draft: ReportDraft, fields: CustomField[]): string {
    const total = parseTr(draft.revenueTotal);
    const lines: string[] = ['📊 BÁO CÁO KHAI THÁC', ''];

    // Từ 2026-09-21 không còn ô số trả chậm (T.Mặt/T.Chậm) — chỉ còn 2 cờ Trả góp / Mở Ví.
    if (total > 0) {
        lines.push(`💰 Doanh thu: ${fmtTr(total)}tr`);
        lines.push(`   - Trả góp: ${resolveTraGop(draft) ? '✓' : '✗'} | Mở Ví: ${draft.moVi ? '✓' : '✗'}`);
    }

    for (const group of TEXT_GROUP_ORDER) {
        const line = groupLine(draft, group, fields);
        if (line) lines.push(line);
    }

    if (draft.priceWar) lines.push('⚔️ Chiến giá: ✓');

    if (draft.notes.trim()) {
        lines.push('');
        lines.push(`📝 ${draft.notes.trim()}`);
    }

    return lines.join('\n').trim();
}

/** Nhãn hiển thị cho khoá ô tiền cố định. */
export function amountLabel(key: string): string {
    return ALL_AMOUNT_ITEMS.find(a => a.key === key)?.label ?? key;
}
