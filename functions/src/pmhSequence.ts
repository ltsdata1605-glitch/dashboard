/**
 * Số thứ tự thẻ PMH lọc được — CHẠY THEO THÁNG (giờ VN): 0001, 0002, … và tự về 0001 khi sang
 * tháng mới (chủ dự án chốt 2026-09-22). Trước đây số trên thẻ chỉ là vị trí trong 1 lần lọc
 * (1..N) nên trùng nhau liên tục giữa các lần, không dùng để gọi tên 1 thẻ cụ thể được.
 *
 * Bộ đếm: line_bots/{uid}/counters/pmh-{YYYY-MM} { value }. Mỗi lượt lọc cấp cả DẢI liên tiếp
 * trong 1 transaction (1 lượt đọc + 1 ghi cho cả lô, không phải mỗi thẻ 1 lượt).
 */
import { db } from './firebaseAdmin';

/** "2026-09" theo giờ VN (UTC+7) — mốc reset là 00:00 ngày 01 giờ VN. */
export function pmhCounterPeriod(now: Date = new Date()): string {
    const vn = new Date(now.getTime() + 7 * 3600 * 1000);
    return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 1 -> "0001"; giữ nguyên bề rộng khi vượt 4 chữ số (10000). */
export function formatPmhLabel(n: number | string | undefined | null): string {
    const num = Number(n);
    if (!Number.isFinite(num) || num <= 0) return String(n ?? '');
    return String(Math.floor(num)).padStart(4, '0');
}

/** Ba loại thẻ đếm ĐỘC LẬP nhau (chủ dự án chốt 2026-09-26). */
export type CouponKind = 'event' | 'gvgs' | 'pmh';

/** Quy mọi cách viết categoryLabel về 1 trong 3 loại. */
export function couponKind(categoryLabel: string | undefined | null): CouponKind {
    const cat = String(categoryLabel || '').toLowerCase();
    if (cat.includes('event')) return 'event';
    if (cat.includes('giờ vàng') || cat.includes('gio vang') || cat.includes('gvgs') || /^gv\b/.test(cat)) return 'gvgs';
    return 'pmh';
}

/**
 * Cấp `count` số liên tiếp cho tháng hiện tại CỦA RIÊNG LOẠI `kind`, trả về số ĐẦU TIÊN của dải.
 * Lỗi Firestore -> trả 0 để caller tự quyết (không chặn việc gửi thẻ).
 *
 * Khoá bộ đếm: `pmh-{tháng}` cho thẻ LỌC PMH — CỐ Ý GIỮ NGUYÊN khoá cũ để số đang chạy giữa tháng
 * không bị nhảy về 0001 và trùng với các thẻ đã phát. Hai loại mới dùng khoá riêng
 * `pmh-event-{tháng}` / `pmh-gvgs-{tháng}`, nên chúng bắt đầu từ 0001 như yêu cầu.
 */
export async function allocatePmhSequence(uid: string, count: number, now: Date = new Date(), kind: CouponKind = 'pmh'): Promise<number> {
    if (!uid || count <= 0) return 0;
    const period = pmhCounterPeriod(now);
    const docId = kind === 'pmh' ? `pmh-${period}` : `pmh-${kind}-${period}`;
    const ref = db.collection('line_bots').doc(uid).collection('counters').doc(docId);
    try {
        return await db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const current = snap.exists ? Number(snap.data()?.value) || 0 : 0;
            const start = current + 1;
            tx.set(ref, { value: current + count, period, kind, updatedAt: new Date().toISOString() }, { merge: true });
            return start;
        });
    } catch (err) {
        console.warn('[pmhSequence] Không cấp được số thứ tự:', err);
        return 0;
    }
}

/**
 * Nhãn gọi tên thẻ trong tin xác nhận sử dụng (chủ dự án chốt 2026-09-26) — khác nhau theo LOẠI:
 *   - thẻ LỌC PMH      -> "PMH 68"
 *   - thẻ Event        -> "Coupon Event 68"
 *   - thẻ Giờ Vàng/GVGS-> "Coupon GVGS 68"
 * Trước đây mọi loại đều ghi "PMH …" nên đọc trong nhóm không biết mã vừa dùng thuộc loại nào.
 */
export function couponUsedLabel(categoryLabel: string | undefined | null, index: number | string): string {
    // Đệm 0 cho KHỚP HỆT huy hiệu in trên thẻ ("PMH 0068") — chủ dự án chốt 2026-09-26.
    const so = formatPmhLabel(index);
    switch (couponKind(categoryLabel)) {
        case 'event': return `Coupon Event ${so}`;
        case 'gvgs': return `Coupon GVGS ${so}`;
        default: return `PMH ${so}`;   // categoryLabel lúc này là loại phiếu: MM200, MM300…
    }
}

/** Câu xác nhận đầy đủ. Bot đẩy tin trích dẫn và trang LIFF (bản dự phòng) phải ra ĐÚNG một chuỗi. */
export function buildCouponUsedText(params: {
    categoryLabel?: string | null;
    index: number | string;
    timeStr: string;
    userName: string;
}): string {
    return `👉 ${couponUsedLabel(params.categoryLabel, params.index)} sử dụng lúc ${params.timeStr}!\n↳ User: ${params.userName}`;
}
