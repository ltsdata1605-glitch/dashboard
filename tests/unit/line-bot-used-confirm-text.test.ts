import { describe, expect, it } from 'vitest';
import { couponUsedLabel, buildCouponUsedText } from '../../functions/src/pmhSequence';

/**
 * Chủ dự án chốt 2026-09-26: tin xác nhận sử dụng phải nói RÕ LOẠI thẻ, thay cho câu cũ luôn ghi
 * "PMH …" cho mọi loại:
 *   Event  -> 👉 Coupon Event 68 sử dụng lúc 14:33!
 *   Lọc    -> 👉 PMH 68 sử dụng lúc 14:33!
 *   GVGS   -> 👉 Coupon GVGS 68 sử dụng lúc 14:33!
 */
describe('couponUsedLabel — nhãn theo loại thẻ', () => {
    it('Event', () => {
        expect(couponUsedLabel('Event', 68)).toBe('Coupon Event 0068');
        expect(couponUsedLabel('MÃ COUPON EVENT', 5)).toBe('Coupon Event 0005');
    });

    it('Giờ Vàng / GVGS — mọi cách viết đều ra GVGS', () => {
        for (const cat of ['Giờ Vàng', 'giờ vàng', 'GVGS', 'gvgs', 'Gio Vang', 'gv']) {
            expect(couponUsedLabel(cat, 68), cat).toBe('Coupon GVGS 0068');
        }
    });

    it('thẻ LỌC PMH — categoryLabel là loại phiếu (MM200/MM300/MM700)', () => {
        for (const cat of ['MM200', 'MM300', 'MM700', 'PMH', '', undefined, null]) {
            expect(couponUsedLabel(cat as string, 68), String(cat)).toBe('PMH 0068');
        }
    });
});

describe('buildCouponUsedText — đúng từng chữ theo mẫu chủ dự án đưa', () => {
    const chung = { index: 68, timeStr: '14:33', userName: '24754 - Ngân' };

    it('Event', () => {
        expect(buildCouponUsedText({ ...chung, categoryLabel: 'Event' }))
            .toBe('👉 Coupon Event 0068 sử dụng lúc 14:33!\n↳ User: 24754 - Ngân');
    });
    it('Lọc PMH', () => {
        expect(buildCouponUsedText({ ...chung, categoryLabel: 'MM200' }))
            .toBe('👉 PMH 0068 sử dụng lúc 14:33!\n↳ User: 24754 - Ngân');
    });
    it('GVGS', () => {
        expect(buildCouponUsedText({ ...chung, categoryLabel: 'Giờ Vàng' }))
            .toBe('👉 Coupon GVGS 0068 sử dụng lúc 14:33!\n↳ User: 24754 - Ngân');
    });
    it('bỏ hẳn cụm "đã được" của câu cũ', () => {
        const t = buildCouponUsedText({ ...chung, categoryLabel: 'Event' });
        expect(t).not.toContain('đã được');
    });
});

/**
 * BỘ ĐỌC LẠI của webhook (mục 1.8) dùng chính câu này để đánh dấu mã đã dùng. Đổi chữ mà quên
 * nới điều kiện thì mã KHÔNG còn được ghi nhận — nên chốt cứng cả 2 biểu thức ở đây.
 */
describe('webhook đọc lại được câu MỚI lẫn câu CŨ', () => {
    const nhanDien = (t: string) => t.includes('sử dụng lúc') && t.includes('👉');
    const laySo = (t: string) => {
        const m = t.match(/👉[^\n]*?(\d+)\s*(?:đã\s*được\s*)?sử\s*dụng\s*lúc/i);
        return m ? Number(m[1]) : undefined;
    };

    const cauMoi = [
        '👉 Coupon Event 0068 sử dụng lúc 14:33!\n↳ User: 24754 - Ngân',
        '👉 PMH 0068 sử dụng lúc 14:33!\n↳ User: 24754 - Ngân',
        '👉 Coupon GVGS 0068 sử dụng lúc 14:33!\n↳ User: 24754 - Ngân',
    ];
    it.each(cauMoi)('câu mới: nhận diện được và lấy đúng số thẻ — %s', (t) => {
        expect(nhanDien(t)).toBe(true);
        expect(laySo(t)).toBe(68);
    });

    it('câu CŨ vẫn nhận (tin cũ còn trong nhóm)', () => {
        const cu = '👉 PMH 68 đã được sử dụng lúc 14:33!\n↳ User: 24754 - Ngân';
        expect(nhanDien(cu)).toBe(true);
        expect(laySo(cu)).toBe(68);
    });

    it('"Mã này" — KHÔNG được vớ nhầm số giờ trong "lúc 14:33" làm số thẻ', () => {
        const t = '👉 Mã này sử dụng lúc 14:33!\n↳ User: 24754 - Ngân';
        expect(nhanDien(t)).toBe(true);
        expect(laySo(t)).toBeUndefined();
    });

    it('tin nhắn thường không bị nhận nhầm', () => {
        for (const t of ['ok em', 'PMH 68', 'e9', 'csd', 'sử dụng lúc nào vậy?'])
            expect(nhanDien(t), t).toBe(false);
    });
});
