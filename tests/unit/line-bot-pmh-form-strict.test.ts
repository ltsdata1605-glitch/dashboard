import { describe, expect, it } from 'vitest';
import { isStrictPmhRequestForm } from '../../functions/src/pmhForm';

const DELIVERY_SUPPORT = `🚚  HỖ TRỢ GIAO HÀNG  🚚

Siêu thị: 910 -  ĐML_STR_STR - 99 Hùng Vương

- User bán: 276650
- SĐT KH: 0945343954
- MĐH: 00910SO26090336791


- Kho: 684
- Sản phẩm : Tủ Đông
- Địa chỉ giao : KĐT 5A
- Tải App POS: 20h 22/09
- Cần trợ : Giao trước 18h 22/9

Thanks Anh!`;

describe('isStrictPmhRequestForm — chỉ nhận đúng 100% cú pháp form xin PMH', () => {
    it('KHÔNG nhận tin hỗ trợ giao hàng (có MĐH + Sản phẩm nhưng không phải form)', () => {
        expect(isStrictPmhRequestForm(DELIVERY_SUPPORT)).toBe(false);
    });
    it('nhận form mẫu mặc định (SyntaxConfigTab)', () => {
        expect(isStrictPmhRequestForm('📝 FORM MẪU LẤY PMH\nLoại PMH: Bếp gas đôi Sunhouse SHB3105MD\nMĐH Áp dụng: 12345678')).toBe(true);
        expect(isStrictPmhRequestForm('FORM MẪU LẤY PMH\nLoại PMH: Tủ đông Kangaroo KG498KX3\nMĐH áp dụng: 00910SO26090336791')).toBe(true);
    });
    it('nhận form [ĐĂNG KÝ PMH] (sản phẩm ở tiêu đề hoặc dòng Loại)', () => {
        expect(isStrictPmhRequestForm('[ĐĂNG KÝ PMH] Tủ đông Kangaroo\nKho: 910\nMĐH: 88291029\nQuản lý: Sơn')).toBe(true);
        expect(isStrictPmhRequestForm('[ĐĂNG KÝ PMH]\nKho: 910\nMĐH: 88291029\nLoại: 100k\nQuản lý: Lê Trường Sơn')).toBe(true);
    });
    it('thiếu tiêu đề / thiếu Loại / thiếu MĐH -> từ chối', () => {
        expect(isStrictPmhRequestForm('Loại PMH: Tủ đông\nMĐH Áp dụng: 12345678')).toBe(false);          // không tiêu đề
        expect(isStrictPmhRequestForm('📝 FORM MẪU LẤY PMH\nMĐH Áp dụng: 12345678')).toBe(false);        // không loại
        expect(isStrictPmhRequestForm('📝 FORM MẪU LẤY PMH\nLoại PMH: Tủ đông')).toBe(false);            // không MĐH
        expect(isStrictPmhRequestForm('[ĐĂNG KÝ PMH]\nKho: 910\nMĐH: 88291029')).toBe(false);            // không sản phẩm
        expect(isStrictPmhRequestForm('Kho 910 xin mã PMH đơn hàng 12345678')).toBe(false);              // 1 dòng tự do
        expect(isStrictPmhRequestForm('tk')).toBe(false);
        expect(isStrictPmhRequestForm('')).toBe(false);
    });
    it('tiêu đề phải ở dòng ĐẦU — nhắc tới form ở giữa tin khác không tính', () => {
        expect(isStrictPmhRequestForm('Chào anh\n📝 FORM MẪU LẤY PMH\nLoại PMH: Tủ đông\nMĐH Áp dụng: 12345678')).toBe(false);
    });
});
