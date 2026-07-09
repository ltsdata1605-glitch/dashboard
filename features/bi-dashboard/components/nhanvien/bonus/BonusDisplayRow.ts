// 1 dòng hiển thị trong bảng thưởng: hoặc là nhân viên (spread Employee + rank), hoặc dòng tổng theo phòng ban/tổng cộng
export interface BonusDisplayRow {
    type?: 'total' | 'department' | 'employee';
    name: string;
    originalName?: string;
    department?: string;
    rank?: number;
    sumDtqd?: number;
    sumErp?: number;
    sumTnong?: number;
    sumTong?: number;
    sumDkien?: number;
    dailySums?: Record<string, number>;
}
