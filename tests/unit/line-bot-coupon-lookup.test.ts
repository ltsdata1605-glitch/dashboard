import { describe, expect, it } from 'vitest';
import { extractBareCouponCode, formatUsedAtVn, buildCouponStatusReply } from '../../functions/src/couponLookup';

describe('extractBareCouponCode — chỉ nhận tin là đúng 1 mã', () => {
    it('nhận mã 8-12 ký tự chữ/số (kể cả toàn chữ), trả về in HOA', () => {
        expect(extractBareCouponCode('JVNAUU4ES2')).toBe('JVNAUU4ES2');
        expect(extractBareCouponCode('  yvfolyovaf ')).toBe('YVFOLYOVAF');
        expect(extractBareCouponCode('9HSQPCV7C0')).toBe('9HSQPCV7C0');
    });
    it('không nhận lệnh/câu thường', () => {
        for (const t of ['tk', 'loc csd', 'huy JVNAUU4ES2', 'JVNAUU4ES2 ok', 'DUYỆT', '123', 'ABCDEFGHIJKLMN', '', 'e1'])
            expect(extractBareCouponCode(t), t).toBeNull();
    });
});

describe('formatUsedAtVn', () => {
    const now = new Date('2026-09-22T09:00:00Z'); // 16:00 VN 22/09
    it('cùng ngày VN -> chỉ giờ', () => {
        expect(formatUsedAtVn('2026-09-22T08:08:00.000Z', now)).toBe('15:08');
    });
    it('khác ngày -> giờ + dd/mm', () => {
        expect(formatUsedAtVn('2026-09-21T08:08:00.000Z', now)).toBe('15:08 21/09');
    });
    it('không hợp lệ -> rỗng', () => {
        expect(formatUsedAtVn(undefined, now)).toBe('');
        expect(formatUsedAtVn('abc', now)).toBe('');
    });
});

describe('buildCouponStatusReply', () => {
    const now = new Date('2026-09-22T09:00:00Z');
    it('đã dùng -> đúng mẫu tin xác nhận, tên gọn', () => {
        const r = buildCouponStatusReply([
            { status: 'UNUSED' },
            { status: 'USED', usedBy: 'ĐMST- Thu-51115-AIO', usedAt: '2026-09-22T08:08:00.000Z', cardIndex: 1 },
        ], now);
        expect(r).toBe('👉 PMH 1 đã được sử dụng lúc 15:08!\n↳ User: 51115 - Thu');
    });
    it('chưa dùng -> báo chưa sử dụng kèm sản phẩm/người nhận', () => {
        const r = buildCouponStatusReply([{ status: 'UNUSED', cardIndex: 2, categoryLabel: 'MM200', recipient: 'STR_ Trường_21453-TC' }], now);
        expect(r).toBe('✅ PMH 2 CHƯA được sử dụng.\n🛍️ MM200\n👤 Cấp cho: STR_ Trường_21453-TC');
    });
    it('coupon kho (không cardIndex) -> "Mã này"', () => {
        expect(buildCouponStatusReply([{ status: 'SENT', type: 'EVENT' }], now)).toBe('✅ Mã này CHƯA được sử dụng.\n🛍️ EVENT');
        expect(buildCouponStatusReply([{ status: 'USED', usedBy: 'HGI_Huy_143998_TC', usedAt: '2026-09-22T08:08:00.000Z' }], now))
            .toBe('👉 Mã này đã được sử dụng lúc 15:08!\n↳ User: 143998 - Huy');
    });
    it('không có bản ghi -> null', () => {
        expect(buildCouponStatusReply([], now)).toBeNull();
    });
});
