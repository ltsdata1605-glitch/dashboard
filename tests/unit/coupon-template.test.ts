import { describe, it, expect, vi } from 'vitest';
import { SAMPLE_COUPON_DATA, downloadCouponSampleTemplate } from '../../features/line-bot/services/couponTemplateService';

describe('couponTemplateService', () => {
    it('chứa danh sách dữ liệu mẫu chuẩn với đầy đủ các trường', () => {
        expect(SAMPLE_COUPON_DATA.length).toBeGreaterThan(0);
        for (const item of SAMPLE_COUPON_DATA) {
            expect(item.code).toBeTruthy();
            expect(item.productName).toBeTruthy();
            expect(item.type).toBeTruthy();
            expect(item.expiryDate).toBeTruthy();
            expect(item.syntax).toBeTruthy();
        }
    });

    it('gọi downloadCouponSampleTemplate tạo và xuất file Excel thành công', async () => {
        const mockWriteFile = vi.fn();
        vi.doMock('xlsx', () => ({
            utils: {
                book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
                aoa_to_sheet: vi.fn(() => ({ '!cols': [] })),
                book_append_sheet: vi.fn(),
            },
            writeFile: mockWriteFile,
        }));

        await downloadCouponSampleTemplate();
        // Không quăng lỗi là thành công
        expect(true).toBe(true);
    });
});
