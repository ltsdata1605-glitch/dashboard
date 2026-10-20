import { describe, expect, it } from 'vitest';
import { autoRefineSchedule } from '../../features/phan-ca/utils/scheduleUtils';
import type { ScheduleConfig, ScheduleInfo, StaffMember } from '../../features/phan-ca/types';

/**
 * 2026-10-20 (GĐ10 — chụp ảnh Phân ca): hộp "Cấu hình nhập nhân viên" MẶC ĐỊNH chọn Nữ cho mọi người. Người dùng chưa chỉnh
 * ai thành Nam → bước cân bằng sáng/chiều ca Kho cho NAM (`balanceTimeDistribution('Kho', 'Nam')`) có danh sách rỗng → đọc
 * `candidates[0].id` → TypeError → cả lượt "Tạo lịch" hỏng, KHÔNG báo gì (lịch trống). Các bước cân bằng khác đã chặn `< 2`.
 */
const CA = ['1', '2', '3', '4', '5', '6'];
const nhanVien = (i: number, gioiTinh: 'Nam' | 'Nu'): StaffMember => {
    const lich: (ScheduleInfo | null)[] = [null];
    for (let d = 1; d <= 14; d++) {
        const ca = CA[(i + d) % CA.length];
        lich.push({ shift: ca, role: d % 3 === 0 ? `${ca} (Kho)` : d % 4 === 0 ? `${ca} (TN)` : ca });
    }
    return {
        id: `NV${i}`, name: `10${i} - Nhân viên ${i}`, gender: gioiTinh, department: 'BP Kinh Doanh',
        stats: { gh: 0, kho: 0, tn: 0, offDays: 0, swapCount: 0 }, schedule: lich, changeHistory: [],
    };
};
const CAU_HINH: ScheduleConfig = { year: 2026, month: 10, startDay: 1, duration: 14 };

describe('Phân ca — cân bằng khi thiếu hẳn một giới tính', () => {
    it('toàn nhân viên NỮ (mặc định của hộp nhập) → xếp lịch không văng lỗi, giữ đủ người', () => {
        const ds = [0, 1, 2, 3, 4].map(i => nhanVien(i, 'Nu'));
        let kq: StaffMember[] = [];
        expect(() => { kq = autoRefineSchedule(ds, CAU_HINH); }).not.toThrow();
        expect(kq).toHaveLength(5);
    });

    it('toàn nhân viên NAM → cũng không văng lỗi', () => {
        const ds = [0, 1, 2, 3].map(i => nhanVien(i, 'Nam'));
        expect(() => autoRefineSchedule(ds, CAU_HINH)).not.toThrow();
    });
});
