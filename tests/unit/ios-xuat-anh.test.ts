/**
 * Xuất ảnh trên Safari iOS (2026-09-27): trần diện tích canvas ~16,7 triệu px — vượt trần Safari trả
 * ảnh TRẮNG không báo lỗi; iPadOS 13+ báo UA "Macintosh" nên phải nhận qua maxTouchPoints.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { capPixelRatioForArea, IOS_MAX_CANVAS_AREA, isMobileLikeDevice, isNotAllowedError, isAbortError } from '../../utils/dataUtils';

describe('capPixelRatioForArea', () => {
    it('ảnh nhỏ: giữ nguyên tỉ lệ', () => {
        expect(capPixelRatioForArea(800, 1200, 1.5)).toBe(1.5);
    });
    it('bảng rộng 3000×2500 @1.5 (16,9 triệu px) → giảm cho vừa trần', () => {
        const r = capPixelRatioForArea(3000, 2500, 1.5);
        expect(r).toBeLessThan(1.5);
        expect(3000 * 2500 * r * r).toBeLessThanOrEqual(IOS_MAX_CANVAS_AREA);
    });
    it('quá lớn kể cả @1 → cho phép < 1 (mờ hơn còn hơn ảnh trắng)', () => {
        const r = capPixelRatioForArea(6000, 5000, 1.5);
        expect(r).toBeLessThan(1);
        expect(6000 * 5000 * r * r).toBeLessThanOrEqual(IOS_MAX_CANVAS_AREA);
    });
    it('số không hợp lệ: không đụng vào', () => {
        expect(capPixelRatioForArea(0, 100, 2)).toBe(2);
        expect(capPixelRatioForArea(NaN, 100, 2)).toBe(2);
    });
});

describe('isMobileLikeDevice', () => {
    afterEach(() => vi.unstubAllGlobals());
    const gia = (ua: string, maxTouchPoints: number, innerWidth = 1024) => {
        vi.stubGlobal('navigator', { userAgent: ua, maxTouchPoints });
        vi.stubGlobal('window', { innerWidth });
    };
    it('iPhone', () => { gia('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5, 390); expect(isMobileLikeDevice()).toBe(true); });
    it('iPad đời mới báo "Macintosh" nhưng có cảm ứng', () => { gia('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15', 5); expect(isMobileLikeDevice()).toBe(true); });
    it('Mac thật (không cảm ứng) vẫn là desktop', () => { gia('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0, 1440); expect(isMobileLikeDevice()).toBe(false); });
});

describe('phân loại lỗi share', () => {
    it('NotAllowedError (hết hiệu lực chạm) khác AbortError (người dùng huỷ)', () => {
        const e = { name: 'NotAllowedError' };
        expect(isNotAllowedError(e)).toBe(true);
        expect(isAbortError(e)).toBe(false);
        expect(isNotAllowedError({ name: 'AbortError' })).toBe(false);
    });
});
