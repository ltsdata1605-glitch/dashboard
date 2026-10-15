import { describe, it, expect } from 'vitest';
import { soLuotConLai, uocTinhNotifyConLai, choPhepGuiTuDong } from '../../functions/src/lineQuota';

const now = { date: '2026-10-15', dow: 4, minutes: 10 * 60 }; // Thứ 5 15/10, 10:00

describe('ưu tiên hạn mức cho Gửi Notify', () => {
    it('đếm lượt còn lại tới hết tháng theo đúng luật lặp', () => {
        expect(soLuotConLai({ time: '08:00', repeatType: 'DAILY' }, now)).toBe(16);   // 08:00 hôm nay đã qua → 16→31
        expect(soLuotConLai({ time: '21:00', repeatType: 'DAILY' }, now)).toBe(17);
        expect(soLuotConLai({ time: '09:00', repeatType: 'WEEKDAYS' }, now)).toBe(11); // 16/10 → 30/10, trừ T7/CN
        expect(soLuotConLai({ time: '09:00', repeatType: 'ONCE', specificDate: '2026-10-20' }, now)).toBe(1);
        expect(soLuotConLai({ time: '09:00', repeatType: 'DAILY', active: false }, now)).toBe(0);
    });
    it('ước tính tin = lượt × tổng thành viên nhóm nhận', () => {
        const lich = [{ time: '21:00', repeatType: 'DAILY' as const, targetType: 'SPECIFIC_GROUPS', targetGroupIds: ['A'] }, { time: '20:00', repeatType: 'DAILY' as const }];
        expect(uocTinhNotifyConLai(lich, { A: 30, B: 10 }, ['A', 'B'], now)).toBe(17 * 30 + 17 * 40);
    });
    it('báo cáo tự động chỉ gửi khi còn đủ cho Notify', () => {
        expect(choPhepGuiTuDong({ limit: 1000, used: 100, chiPhi: 30, duTruNotify: 800 })).toBe(true);
        expect(choPhepGuiTuDong({ limit: 1000, used: 200, chiPhi: 30, duTruNotify: 800 })).toBe(false);
        expect(choPhepGuiTuDong({ limit: null, used: 999999, chiPhi: 30, duTruNotify: 1e9 })).toBe(true);
        expect(choPhepGuiTuDong({ limit: 1000, used: null, chiPhi: 1, duTruNotify: 0 })).toBe(false);
    });
});
