import { describe, it, expect } from 'vitest';
import { isDateExpired, getVietnamTodayString } from '../../features/line-bot/services/couponParser';
import type { Coupon } from '../../features/line-bot/types/lineBot.types';

describe('PMH Hết Hạn Tự Động Xoá Khỏi Kho', () => {
    const today = getVietnamTodayString(); // ví dụ '2026-10-23'

    it('Xác định chính xác ngày hết hạn so với hôm nay', () => {
        // Ngày quá khứ -> Đã hết hạn
        expect(isDateExpired('2026-10-18', today)).toBe(true);
        expect(isDateExpired('2026-09-30', today)).toBe(true);

        // Hôm nay -> Chưa hết hạn (vẫn dùng được trong ngày)
        expect(isDateExpired(today, today)).toBe(false);

        // Tương lai -> Còn hạn
        expect(isDateExpired('2026-10-31', today)).toBe(false);
        expect(isDateExpired('2026-11-15', today)).toBe(false);

        // Không có hạn -> Vô thời hạn (không hết hạn)
        expect(isDateExpired(undefined, today)).toBe(false);
    });

    it('Tất cả PMH quá hạn sử dụng đều bị loại trừ khỏi kho (bất kể trạng thái UNUSED, SENT hay REVOKED)', () => {
        const mockCoupons: Coupon[] = [
            {
                id: 'c1',
                code: 'DMX111',
                type: 'Giờ Vàng Giá Sốc',
                status: 'SENT',
                expiryDate: '2026-10-18', // Đã hết hạn (như Đợt #2 của người dùng)
                createdAt: '2026-10-16T08:49:49.000Z',
                updatedAt: '2026-10-16T08:49:49.000Z'
            },
            {
                id: 'c2',
                code: 'DMX222',
                type: 'Giờ Vàng Giá Sốc',
                status: 'UNUSED',
                expiryDate: '2026-10-18', // Đã hết hạn
                createdAt: '2026-10-16T08:49:49.000Z',
                updatedAt: '2026-10-16T08:49:49.000Z'
            },
            {
                id: 'c3',
                code: 'VIVO888',
                type: 'VIVO',
                status: 'UNUSED',
                expiryDate: '2026-10-31', // Còn hạn (như Đợt #1 của người dùng)
                createdAt: '2026-10-15T15:51:39.000Z',
                updatedAt: '2026-10-15T15:51:39.000Z'
            }
        ];

        // Lọc kho
        const activeCoupons = mockCoupons.filter(c => !(c.expiryDate && isDateExpired(c.expiryDate, today)));

        expect(activeCoupons).toHaveLength(1);
        expect(activeCoupons[0].id).toBe('c3');
        expect(activeCoupons[0].code).toBe('VIVO888');
    });

    it('Đợt nạp đã hết hạn (như Đợt #2 Hạn 2026-10-18) không còn xuất hiện trong Lịch Sử Các Lần Nạp', () => {
        const mockCoupons: Coupon[] = [
            {
                id: 'c1',
                code: 'DMX1',
                type: 'Giờ Vàng Giá Sốc',
                status: 'SENT',
                expiryDate: '2026-10-18',
                importBatchId: 'batch_dot_2',
                createdAt: '2026-10-16T08:49:49.000Z',
                updatedAt: '2026-10-16T08:49:49.000Z'
            },
            {
                id: 'c2',
                code: 'VIVO1',
                type: 'VIVO',
                status: 'UNUSED',
                expiryDate: '2026-10-31',
                importBatchId: 'batch_dot_1',
                createdAt: '2026-10-15T15:51:39.000Z',
                updatedAt: '2026-10-15T15:51:39.000Z'
            }
        ];

        // Mô phỏng logic tính importBatches trong CouponImportModal
        const map = new Map<string, { batchKey: string; expDate: string; count: number }>();
        for (const c of mockCoupons) {
            if (c.expiryDate && isDateExpired(c.expiryDate, today)) {
                continue; // PMH hết hạn bị bỏ qua
            }
            const key = c.importBatchId || 'default';
            if (!map.has(key)) {
                map.set(key, { batchKey: key, expDate: c.expiryDate || '', count: 0 });
            }
            map.get(key)!.count++;
        }

        const visibleBatches = Array.from(map.values()).filter(b => !(b.expDate && isDateExpired(b.expDate, today)));

        // Chỉ còn lại Đợt #1 (VIVO), Đợt #2 (hết hạn 18/10) đã bị xoá hoàn toàn khỏi kho
        expect(visibleBatches).toHaveLength(1);
        expect(visibleBatches[0].batchKey).toBe('batch_dot_1');
    });
});
