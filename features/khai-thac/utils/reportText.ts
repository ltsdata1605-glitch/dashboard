import type { ReportDraft, CustomField, ItemGroup } from '../types';
import { COUNT_ITEMS, AMOUNT_ITEMS, GROUP_META, TEXT_GROUP_ORDER, parseTr, customCountFields, customRevenueFields } from '../catalog';

/** Số Tr gọn: 8 → "8", 8.5 → "8.5", 0.30000001 → "0.3". */
export function fmtTr(n: number): string {
    return String(parseFloat(n.toFixed(2)));
}

/** Tỉ lệ trả chậm % (làm tròn) trên tổng doanh thu; 0 khi chưa có doanh thu. */
export function installmentRate(revenueTotal: number, installment: number): number {
    if (revenueTotal <= 0) return 0;
    return Math.round((installment / revenueTotal) * 100);
}

function groupLine(draft: ReportDraft, group: ItemGroup, fields: CustomField[]): string | null {
    const parts: string[] = [];
    const counts = draft.counts[group] ?? {};

    // Nhóm Dịch vụ: các ô tiền cố định đứng TRƯỚC (Ví) và SAU (BH) các mục đếm — đúng thứ tự app gốc.
    if (group === 'services') {
        const vi = parseTr(draft.amounts.vi);
        if (vi > 0) parts.push(`Ví: ${fmtTr(vi)}`);
    }
    for (const item of COUNT_ITEMS[group]) {
        const v = Number(counts[item.key]) || 0;
        if (v > 0) parts.push(`${item.short}: ${v}`);
    }
    if (group === 'services') {
        const bh = parseTr(draft.amounts.insurance);
        if (bh > 0) parts.push(`BH: ${fmtTr(bh)}`);
    }
    for (const f of customCountFields(fields, group)) {
        const v = Number(counts[f.id]) || 0;
        if (v > 0) parts.push(`${f.name}: ${v}`);
    }
    for (const f of customRevenueFields(fields, group)) {
        const v = parseTr(draft.amounts[f.id]);
        if (v > 0) parts.push(`${f.name}: ${fmtTr(v)}`);
    }
    const other = draft.others[group];
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
    const inst = parseTr(draft.installment);
    const cash = Math.max(0, total - inst);
    const lines: string[] = ['📊 BÁO CÁO KHAI THÁC', ''];

    if (total > 0) {
        lines.push(`💰 Doanh thu: ${fmtTr(total)}tr`);
        lines.push(`   - T.Mặt: ${fmtTr(cash)}tr`);
        lines.push(`   - T.Chậm: ${fmtTr(inst)}Tr ~ ${installmentRate(total, inst)}% | Mở Ví: ${draft.moVi ? '✓' : '✗'}`);
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
    return AMOUNT_ITEMS.find(a => a.key === key)?.label ?? key;
}
