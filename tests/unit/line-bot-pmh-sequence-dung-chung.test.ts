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

const { allocatePmhSequence, pmhCounterPeriod, formatPmhLabel } =
    await import('../../functions/src/pmhSequence');

describe('Số thẻ PMH dùng CHUNG một dải cho mọi luồng, reset theo tháng', () => {
    beforeEach(() => khoDem.clear());

    it('thẻ đầu tiên trong tháng là 0001', async () => {
        const n = await allocatePmhSequence('bot-1', 1, new Date('2026-09-26T03:00:00Z'));
        expect(formatPmhLabel(n)).toBe('0001');
    });

    it('lọc phiếu cấp cả dải, thẻ cấp từ kho sau đó nối tiếp — KHÔNG quay lại 0001', async () => {
        const t = new Date('2026-09-26T03:00:00Z');
        // Lọc 1 lô 3 thẻ (luồng "LỌC PMH")
        const dauLo = await allocatePmhSequence('bot-1', 3, t);
        expect([dauLo, dauLo + 1, dauLo + 2].map(formatPmhLabel)).toEqual(['0001', '0002', '0003']);
        // Rồi cấp 1 thẻ từ kho (luồng chọn trong danh sách `tk`)
        const tuKho = await allocatePmhSequence('bot-1', 1, t);
        expect(formatPmhLabel(tuKho)).toBe('0004');
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

        await allocatePmhSequence('bot-1', 40, cuoiThang9);
        const sauReset = await allocatePmhSequence('bot-1', 1, dauThang10);
        expect(formatPmhLabel(sauReset)).toBe('0001');
    });

    it('Firestore lỗi -> trả 0 để không chặn việc gửi thẻ', async () => {
        const loi = await allocatePmhSequence('', 1);
        expect(loi).toBe(0);
    });
});
