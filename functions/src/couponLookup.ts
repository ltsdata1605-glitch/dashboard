/**
 * Tra cứu trạng thái mã PMH khi người dùng DÁN MÃ (một mình) vào chat — phần thuần, tách khỏi
 * lineBotWebhook.ts để test đơn vị.
 */
import { formatShortUserName } from './userName';
import { formatPmhLabel } from './pmhSequence';

/** Tin nhắn chỉ gồm đúng 1 mã coupon (8-12 ký tự chữ/số, VD JVNAUU4ES2, YVFOLYOVAF) — không khoảng trắng. */
export function extractBareCouponCode(text: string): string | null {
    const t = String(text || '').trim();
    if (!/^[A-Za-z0-9]{8,12}$/.test(t)) return null;
    return t.toUpperCase();
}

export interface CouponLookupDoc {
    status?: unknown;
    usedBy?: unknown;
    usedAt?: unknown;
    cardIndex?: unknown;
    recipient?: unknown;
    productName?: unknown;
    categoryLabel?: unknown;
    type?: unknown;
}

/** "2026-09-22T08:08:00.000Z" -> "15:08" (cùng ngày VN) hoặc "15:08 21/09" (ngày khác). */
export function formatUsedAtVn(iso: unknown, now: Date = new Date()): string {
    const d = typeof iso === 'string' ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    const tz = 'Asia/Ho_Chi_Minh';
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
    const sameDay = d.toLocaleDateString('vi-VN', { timeZone: tz }) === now.toLocaleDateString('vi-VN', { timeZone: tz });
    if (sameDay) return time;
    // Tự ghép dd/MM: Intl 'vi-VN' trả "21-09" hay "21/09" tuỳ phiên bản ICU của Node/Cloud Functions.
    const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', timeZone: tz }).formatToParts(d);
    const dd = parts.find(p => p.type === 'day')?.value || '';
    const mm = parts.find(p => p.type === 'month')?.value || '';
    return `${time} ${dd}/${mm}`;
}

/**
 * Soạn câu trả lời từ các bản ghi tìm thấy (filtered_coupons + coupons cùng mã).
 * - Có bản ghi USED  -> "👉 PMH n đã được sử dụng lúc HH:mm!\n↳ User: Mã - Tên"
 * - Có bản ghi, chưa USED -> "✅ … CHƯA được sử dụng"
 * - Không có bản ghi -> null (caller quyết định im lặng hay báo không tìm thấy)
 */
export function buildCouponStatusReply(docs: CouponLookupDoc[], now: Date = new Date()): string | null {
    if (!docs || docs.length === 0) return null;
    const used = docs.find(d => d.status === 'USED');
    if (used) {
        const idx = Number(used.cardIndex);
        const label = idx > 0 ? `PMH ${formatPmhLabel(idx)}` : 'Mã này';
        const at = formatUsedAtVn(used.usedAt, now);
        const who = formatShortUserName(String(used.usedBy || 'Người dùng LINE'));
        return `👉 ${label} đã được sử dụng${at ? ` lúc ${at}` : ''}!\n↳ User: ${who}`;
    }
    const any = docs[0];
    const idx = Number(any.cardIndex);
    const label = idx > 0 ? `PMH ${formatPmhLabel(idx)}` : 'Mã này';
    const product = String(any.productName || any.categoryLabel || any.type || '').trim();
    const recipient = String(any.recipient || '').trim();
    const extra = [product ? `🛍️ ${product}` : '', recipient ? `👤 Cấp cho: ${recipient}` : ''].filter(Boolean).join('\n');
    return `✅ ${label} CHƯA được sử dụng.${extra ? `\n${extra}` : ''}`;
}
