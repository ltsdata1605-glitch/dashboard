import type { SchedulingRules, DailyRequirements } from './types';

export const rotateArray = <T,>(arr: T[], count: number): T[] => {
    const len = arr.length;
    if (len === 0) return [];
    const shift = count % len;
    if (shift === 0) return [...arr];
    return [...arr.slice(shift), ...arr.slice(0, shift)];
};

export const getDefaultMonthYear = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

export const DEFAULT_RULES: SchedulingRules = {
  gh: { '2345': 1 },
  kho: { '123': 2, '456': 2 },
  tn: { '123': 1, '456': 1 },
  ghGender: 'Nam',
  khoGender: 'All',
  tnGender: 'All',
};

export const ZERO_REQUIREMENTS: DailyRequirements = {
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0
};

// Cập nhật các mẫu ca mặc định theo yêu cầu mới
export const DEFAULT_PATTERNS_HUNG_VUONG_910_99 = {
  'BP All In One': [
    "123", "456", "2345", "123", "456", "23", "45", "123", "456", "2345", 
    "123", "456", "2345", "123", "456"
  ],
  'BP Quản lý/Trưởng Ca': [
    "A.Hiệp 123", "12345", "23456", "T.Thạnh 123", "123", "456", "12356"
  ],
  'BP Tiếp Đón Khách Hàng': [
    "123", "456", "245"
  ]
};


export const HOURS_CONFIG: { [key: string]: number } = { '1': 1, '2': 3, '3': 3, '4': 3, '5': 3, '6': 0.5 };

// Khoảng cách tối thiểu (số ngày) giữa 2 lần làm cùng 1 loại ca đặc biệt của 1 người.
// Dùng chung bởi thuật toán tinh chỉnh (scheduleUtils.ts::autoRefineSchedule) và bước
// ước lượng khả thi mẫu ca AI (AiSuggestPatternModal.tsx) — giữ 1 nguồn duy nhất để
// không bị lệch số nếu sau này chỉnh sửa quy tắc.
export const KHO_TN_MIN_GAP_DAYS = 2;
export const GH_MIN_GAP_DAYS = 6; // Giao Hàng: ~1 tuần/lần (rolling, không tính theo tuần lịch)

export const DEFAULT_SHIFT_DEFINITIONS = {
  '1': { startTime: '08:00', endTime: '09:00' },
  '2': { startTime: '09:00', endTime: '12:00' },
  '3': { startTime: '12:00', endTime: '15:00' },
  '4': { startTime: '15:00', endTime: '18:00' },
  '5': { startTime: '18:00', endTime: '21:00' },
  '6': { startTime: '21:00', endTime: '21:30' }
};
