import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Chủ dự án chốt 2026-09-26: thẻ cấp từ KHO (chọn trong danh sách `tk`, duyệt lẻ, form xin PMH)
 * cũng phải được ĐÁNH SỐ và **reset đầu tháng** như thẻ "LỌC PMH".
 *
 * Trước đây chỉ luồng lọc phiếu gọi allocatePmhSequence(); 3 luồng cấp từ kho không gọi nên
 * `cardIndex` rơi về mặc định `|| 1` → **mọi thẻ đều hiện "PMH 0001"**, không gọi tên được một
 * thẻ cụ thể (ảnh chụp nhóm 910 ngày 26/09: thẻ lọc 0037/0064/0065, thẻ Event 0001).
 *
 * Test dựng Firestore giả để kiểm ĐÚNG hành vi bộ đếm: chung một dải theo tháng, và sang tháng
 * mới thì về lại 0001.
 */
const khoDem = new Map<string, number>();

vi.mock('../../functions/src/firebaseAdmin', () => {
    const docRef = (path: string) => ({ path });
    return {
        db: {
            collection: (c: string) => ({
                doc: (d: string) => ({
                    collection: (c2: string) => ({ doc: (d2: string) => docRef(`${c}/${d}/${c2}/${d2}`) }),
                }),
            }),
            runTransaction: async (fn: (tx: unknown) => Promise<number>) => fn({
                get: async (ref: { path: string }) => ({
                    exists: khoDem.has(ref.path),
                    data: () => ({ value: khoDem.get(ref.path) }),
                }),
                set: (ref: { path: string }, data: { value: number }) => { khoDem.set(ref.path, data.value); },
            }),
        },
    };
});

const { allocatePmhSequence, pmhCounterPeriod, formatPmhLabel, couponKind } =
    await import('../../functions/src/pmhSequence');

describe('Số thẻ: MỖI LOẠI một dải riêng, reset theo tháng', () => {
    beforeEach(() => khoDem.clear());

    it('thẻ đầu tiên trong tháng là 0001', async () => {
        const n = await allocatePmhSequence('bot-1', 1, new Date('2026-09-26T03:00:00Z'));
        expect(formatPmhLabel(n)).toBe('0001');
    });

    it('lọc PMH cấp cả dải; thẻ PMH cấp từ kho sau đó NỐI TIẾP cùng dải', async () => {
        const t = new Date('2026-09-26T03:00:00Z');
        const dauLo = await allocatePmhSequence('bot-1', 3, t, 'pmh');
        expect([dauLo, dauLo + 1, dauLo + 2].map(formatPmhLabel)).toEqual(['0001', '0002', '0003']);
        const tuKho = await allocatePmhSequence('bot-1', 1, t, 'pmh');
        expect(formatPmhLabel(tuKho)).toBe('0004');
    });

    it('Event và GVGS đếm ĐỘC LẬP với PMH — mỗi loại bắt đầu lại từ 0001', async () => {
        const t = new Date('2026-09-26T03:00:00Z');
        await allocatePmhSequence('bot-1', 68, t, 'pmh');          // PMH đã chạy tới 0068
        const event1 = await allocatePmhSequence('bot-1', 1, t, 'event');
        const gvgs1 = await allocatePmhSequence('bot-1', 1, t, 'gvgs');
        const event2 = await allocatePmhSequence('bot-1', 1, t, 'event');
        expect(formatPmhLabel(event1)).toBe('0001');
        expect(formatPmhLabel(gvgs1)).toBe('0001');
        expect(formatPmhLabel(event2)).toBe('0002');
        // và PMH vẫn đi tiếp từ 0069, KHÔNG bị hai loại kia đẩy số
        expect(formatPmhLabel(await allocatePmhSequence('bot-1', 1, t, 'pmh'))).toBe('0069');
    });

    it('couponKind quy mọi cách viết về đúng 3 loại', () => {
        expect(couponKind('Event')).toBe('event');
        expect(couponKind('MÃ COUPON EVENT')).toBe('event');
        for (const c of ['Giờ Vàng', 'GVGS', 'gv', 'Gio Vang']) expect(couponKind(c), c).toBe('gvgs');
        for (const c of ['MM200', 'MM700', 'PMH', '', undefined]) expect(couponKind(c), String(c)).toBe('pmh');
    });

    it('thẻ LỌC PMH giữ NGUYÊN khoá bộ đếm cũ — số đang chạy giữa tháng không nhảy về 0001', async () => {
        const t = new Date('2026-09-26T03:00:00Z');
        // Giả lập bộ đếm cũ của tháng (khoá "pmh-2026-09") đã chạy tới 68
        await allocatePmhSequence('bot-1', 68, t, 'pmh');
        expect(formatPmhLabel(await allocatePmhSequence('bot-1', 1, t, 'pmh'))).toBe('0069');
    });

    it('mỗi bot có bộ đếm riêng, không giẫm số của nhau', async () => {
        const t = new Date('2026-09-26T03:00:00Z');
        await allocatePmhSequence('bot-1', 5, t);
        const botKhac = await allocatePmhSequence('bot-2', 1, t);
        expect(formatPmhLabel(botKhac)).toBe('0001');
    });

    it('sang tháng mới thì reset về 0001 (mốc 00:00 ngày 01 giờ VN)', async () => {
        const cuoiThang9 = new Date('2026-09-30T16:00:00Z');   // 23:00 VN 30/09
        const dauThang10 = new Date('2026-09-30T18:00:00Z');   // 01:00 VN 01/10
        expect(pmhCounterPeriod(cuoiThang9)).toBe('2026-09');
        expect(pmhCounterPeriod(dauThang10)).toBe('2026-10');

        await allocatePmhSequence('bot-1', 40, cuoiThang9, 'event');
        const sauReset = await allocatePmhSequence('bot-1', 1, dauThang10, 'event');
        expect(formatPmhLabel(sauReset)).toBe('0001');
    });

    it('Firestore lỗi -> trả 0 để không chặn việc gửi thẻ', async () => {
        const loi = await allocatePmhSequence('', 1);
        expect(loi).toBe(0);
    });
});
