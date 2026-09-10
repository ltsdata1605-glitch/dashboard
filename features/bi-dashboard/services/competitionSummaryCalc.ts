import type { Employee, CompetitionHeader } from '../types/nhanVienTypes';
import { isSameEmployee } from '../utils/nhanVienHelpers';
import { calculateRunRate } from './metricService';

/**
 * Logic tính toán của bảng "Tổng hợp Thi đua" — TÁCH RA từ `CompetitionSummaryView.tsx` (Đợt 1 của
 * dự án làm lại Report BI, xem implementation_plan.md).
 *
 * VÌ SAO FILE NÀY NẰM Ở `services/` CHỨ KHÔNG PHẢI CẠNH COMPONENT:
 * Mục tiêu của Đợt 1 là để giao diện trở thành thứ VỨT ĐI ĐƯỢC. Nếu logic nằm trong
 * `components/`, nó sẽ bị vứt cùng lúc với UI — đúng thứ chúng ta đang cố tránh. Mọi phép tính ở
 * đây phải sống sót qua đợt lột xác giao diện.
 *
 * NGUYÊN TẮC TÁCH (Đợt 1 là refactor THUẦN):
 * Toàn bộ công thức được chép NGUYÊN VĂN từ component. KHÔNG sửa một con số nào, kể cả chỗ trông
 * khả nghi — nghi ngờ thì báo user, không tự sửa trong cùng đợt. Trộn refactor với sửa lỗi là cách
 * chắc chắn nhất để sau này không truy được nguyên nhân khi số liệu lệch.
 *
 * THAY ĐỔI DUY NHẤT ĐƯỢC PHÉP: các hàm phụ thuộc ngày tháng nay NHẬN `daysPassed`/`daysInMonth`
 * qua tham số thay vì tự gọi `new Date()` bên trong. Đây không phải đổi hành vi (nơi gọi truyền
 * đúng giá trị cũ qua `getMonthProgress()`), mà là điều kiện cần để viết được test tất định —
 * hàm tự đọc đồng hồ hệ thống thì cho kết quả khác nhau tuỳ ngày chạy test.
 */

/** Bảng tra số liệu thực hiện của nhân viên: tên NV → { values: { tên cột → số } }. */
export type EmployeeDataMap = Map<string, { name: string; department: string; values: Record<string, number | null> }>;

/** Bảng target: tên chương trình → (tên NV → target). */
export type CompetitionTargets = Map<string, Map<string, number>>;

/** Hàm tra target của 1 nhân viên cho 1 chương trình. */
export type TargetResolver = (origTitle?: string, empOrigName?: string) => number;

/**
 * Tra target của nhân viên cho một chương trình thi đua.
 *
 * Dò theo 3 tầng nới lỏng dần, vì tên chương trình và tên nhân viên giữa 2 nguồn dữ liệu (bảng
 * target dán tay vs báo cáo hệ thống) thường không khớp tuyệt đối:
 *   1. Khớp CHÍNH XÁC cả tên chương trình lẫn tên nhân viên.
 *   2. Cùng chương trình, nhưng tên NV khớp lỏng qua `isSameEmployee` (khác dấu/khoảng trắng/mã).
 *   3. Tên chương trình khớp lỏng (chứa nhau, không phân biệt hoa thường/khoảng trắng thừa).
 */
export function resolveEmployeeTarget(
    targets: CompetitionTargets,
    origTitle?: string,
    empOrigName?: string
): number {
    if (!origTitle || !empOrigName) return 0;

    const exactMap = targets.get(origTitle);
    if (exactMap) {
        const val = exactMap.get(empOrigName);
        if (val !== undefined) return val;
        for (const [eName, v] of exactMap.entries()) {
            if (isSameEmployee(eName, empOrigName)) return v;
        }
    }

    const cleanTitle = origTitle.trim().toLowerCase();
    for (const [progTitle, tMap] of targets.entries()) {
        const cleanProg = progTitle.trim().toLowerCase();
        if (cleanProg === cleanTitle || cleanProg.includes(cleanTitle) || cleanTitle.includes(cleanProg)) {
            const val = tMap.get(empOrigName);
            if (val !== undefined) return val;
            for (const [eName, v] of tMap.entries()) {
                if (isSameEmployee(eName, empOrigName)) return v;
            }
        }
    }
    return 0;
}

/** Số thực hiện của 1 nhân viên ở 1 cột; thiếu dữ liệu tính là 0. */
const actualOf = (data: EmployeeDataMap, empName: string, colTitle: string): number =>
    data.get(empName)?.values[colTitle] ?? 0;

/** % hoàn thành so với target; target = 0 thì trả 0 (không chia cho 0). */
const htOf = (actual: number, target: number): number => (target > 0 ? (actual / target) * 100 : 0);

/**
 * Tiến độ tháng dùng cho run rate.
 *
 * `daysPassed = ngày hôm nay - 1` (dữ liệu thi đua chốt tới hết hôm qua), tối thiểu 1 để không bao
 * giờ chia cho 0 vào ngày mùng 1.
 */
export function getMonthProgress(now: Date = new Date()): { daysPassed: number; daysInMonth: number } {
    return {
        daysPassed: Math.max(1, now.getDate() - 1),
        daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    };
}

export interface ColumnAverage {
    actual: number;
    percent: number;
}

/** Trung bình Thực hiện và trung bình %HT của từng cột, tính trên TOÀN BỘ nhân viên. */
export function computeColumnAverages(
    headers: CompetitionHeader[],
    employees: Employee[],
    data: EmployeeDataMap,
    getTarget: TargetResolver
): Record<string, ColumnAverage> {
    const averages: Record<string, ColumnAverage> = {};
    headers.forEach(header => {
        let sumActual = 0;
        let sumPercent = 0;
        employees.forEach(emp => {
            const actual = actualOf(data, emp.name, header.title);
            sumActual += actual;
            sumPercent += htOf(actual, getTarget(header.originalTitle, emp.originalName));
        });
        averages[header.title] = {
            actual: employees.length > 0 ? sumActual / employees.length : 0,
            percent: employees.length > 0 ? sumPercent / employees.length : 0,
        };
    });
    return averages;
}

/** Hạng của nhân viên khi cột đó không có số liệu (<= 0) — đẩy xuống cuối bảng. */
export const RANK_NO_DATA = 999;

/**
 * Xếp hạng "dense rank" giảm dần cho từng cột.
 *
 * Dense rank = bằng điểm thì cùng hạng, và hạng kế tiếp KHÔNG bị nhảy cóc (1,1,2 chứ không 1,1,3).
 * Giá trị <= 0 không được xếp hạng mà nhận `RANK_NO_DATA`.
 */
export function computeColumnRankings(
    headers: CompetitionHeader[],
    employees: Employee[],
    data: EmployeeDataMap,
    getTarget: TargetResolver,
    showPercent: boolean
): Record<string, Map<string, number>> {
    const rankings: Record<string, Map<string, number>> = {};
    headers.forEach(header => {
        const empValues = employees.map(emp => {
            const actual = actualOf(data, emp.name, header.title);
            const ht = htOf(actual, getTarget(header.originalTitle, emp.originalName));
            return { empName: emp.name, value: showPercent ? ht : actual };
        });

        empValues.sort((a, b) => b.value - a.value);

        const rankMap = new Map<string, number>();
        let currentRank = 0;
        let prevValue = -1;
        empValues.forEach(item => {
            if (item.value <= 0) {
                rankMap.set(item.empName, RANK_NO_DATA);
                return;
            }
            if (item.value !== prevValue) {
                currentRank++;
                prevValue = item.value;
            }
            rankMap.set(item.empName, currentRank);
        });
        rankings[header.title] = rankMap;
    });
    return rankings;
}

/**
 * "Tổng BOT" — với mỗi nhân viên, đếm số cột mà họ nằm DƯỚI trung bình cột.
 *
 * So theo %HT hay theo số tuyệt đối là tuỳ công tắc `showPercent` người dùng đang bật.
 */
export function computeTongBotMap(
    headers: CompetitionHeader[],
    employees: Employee[],
    data: EmployeeDataMap,
    getTarget: TargetResolver,
    averages: Record<string, ColumnAverage>,
    showPercent: boolean
): Map<string, number> {
    const map = new Map<string, number>();
    employees.forEach(emp => {
        let count = 0;
        headers.forEach(header => {
            const avg = averages[header.title];
            if (!avg) return;
            const actual = actualOf(data, emp.name, header.title);
            if (showPercent) {
                if (htOf(actual, getTarget(header.originalTitle, emp.originalName)) < avg.percent) count++;
            } else {
                if (actual < avg.actual) count++;
            }
        });
        map.set(emp.name, count);
    });
    return map;
}

/** "NoSale" — số cột mà nhân viên chưa phát sinh gì (thực hiện = 0). */
export function computeNoSaleMap(
    headers: CompetitionHeader[],
    employees: Employee[],
    data: EmployeeDataMap
): Map<string, number> {
    const map = new Map<string, number>();
    employees.forEach(emp => {
        let count = 0;
        headers.forEach(header => {
            if (actualOf(data, emp.name, header.title) === 0) count++;
        });
        map.set(emp.name, count);
    });
    return map;
}

/**
 * "Đạt" — số nhóm mà nhân viên đạt chỉ tiêu.
 *
 * Tính là ĐẠT nếu THOẢ MỘT TRONG HAI: dự kiến hoàn thành theo run rate >= 100%, HOẶC đã vượt target
 * trên thực tế. Điều kiện thứ hai cần thiết vì run rate chiếu theo nhịp trung bình — người dồn toàn
 * bộ doanh số vào cuối tháng có thể đã vượt target rồi mà run rate vẫn báo chưa tới.
 *
 * Cột không có target (target = 0) KHÔNG được tính là đạt.
 */
export function computeDatMap(
    headers: CompetitionHeader[],
    employees: Employee[],
    data: EmployeeDataMap,
    getTarget: TargetResolver,
    daysPassed: number,
    daysInMonth: number
): Map<string, number> {
    const map = new Map<string, number>();
    employees.forEach(emp => {
        let count = 0;
        headers.forEach(header => {
            const target = getTarget(header.originalTitle, emp.originalName);
            if (target > 0) {
                const actual = actualOf(data, emp.name, header.title);
                const dkht = (calculateRunRate(actual, daysPassed, daysInMonth) / target) * 100;
                if (dkht >= 100 || actual >= target) count++;
            }
        });
        map.set(emp.name, count);
    });
    return map;
}

/**
 * %Đạt trung bình toàn siêu thị = tổng ô đạt / tổng ô có thể đạt.
 * Dùng làm ngưỡng tô đỏ cho nhân viên dưới mặt bằng chung.
 */
export function computeStoreDatPercent(
    employees: Employee[],
    totalHeaderCount: number,
    datMap: Map<string, number>
): number {
    const totalPossible = employees.length * totalHeaderCount;
    if (totalPossible === 0) return 0;
    let totalDatSum = 0;
    employees.forEach(emp => { totalDatSum += datMap.get(emp.name) ?? 0; });
    return (totalDatSum / totalPossible) * 100;
}

/**
 * "Đạt" của dòng TỔNG — số cột mà SỐ LIỆU GỘP CẢ SIÊU THỊ đạt chỉ tiêu.
 *
 * Lưu ý: đây KHÔNG phải tổng cột "Đạt" của từng nhân viên. Nó cộng toàn bộ thực hiện và toàn bộ
 * target của mọi nhân viên trong cột rồi mới so — nên siêu thị vẫn có thể "đạt" ở một cột mà đa số
 * nhân viên không đạt, nếu vài người vượt đủ nhiều để kéo tổng lên.
 */
export function computeStoreColumnDatCount(
    headers: CompetitionHeader[],
    employees: Employee[],
    data: EmployeeDataMap,
    getTarget: TargetResolver,
    daysPassed: number,
    daysInMonth: number
): number {
    let count = 0;
    headers.forEach(header => {
        const totalActual = employees.reduce((sum, emp) => sum + actualOf(data, emp.name, header.title), 0);
        const totalTarget = employees.reduce((sum, emp) => sum + getTarget(header.originalTitle, emp.originalName), 0);
        const totalDkht = totalTarget > 0
            ? (calculateRunRate(totalActual, daysPassed, daysInMonth) / totalTarget) * 100
            : 0;
        if (totalDkht >= 100 || (totalTarget > 0 && totalActual >= totalTarget)) count++;
    });
    return count;
}

/**
 * Ngưỡng tô đỏ cột "Tổng BOT": lấy giá trị ở mốc TOP 30% khi sắp giảm dần.
 * Nhân viên có Tổng BOT >= ngưỡng này bị tô đỏ (nằm trong nhóm 30% yếu nhất).
 */
export function computeTongBotRedCutoff(
    employees: Employee[],
    tongBotMap: Map<string, number>
): number {
    const botValues = employees.map(emp => tongBotMap.get(emp.name) ?? 0);
    botValues.sort((a, b) => b - a);
    const thresholdIndex = Math.max(0, Math.ceil(employees.length * 0.3) - 1);
    return botValues[thresholdIndex] ?? 0;
}
