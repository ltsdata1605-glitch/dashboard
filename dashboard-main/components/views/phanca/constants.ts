
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

export const DEFAULT_SHIFT_DEFINITIONS = {
  '1': { startTime: '08:00', endTime: '09:00' },
  '2': { startTime: '09:00', endTime: '12:00' },
  '3': { startTime: '12:00', endTime: '15:00' },
  '4': { startTime: '15:00', endTime: '18:00' },
  '5': { startTime: '18:00', endTime: '21:00' },
  '6': { startTime: '21:00', endTime: '21:30' }
};
