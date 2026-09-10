import type { Employee, CompetitionHeader } from '../types/nhanVienTypes';

/**
 * Dòng tổng của siêu thị (tên bắt đầu bằng "ĐMX -" / "DMX -"), KHÔNG phải nhân viên.
 *
 * Chuyển từ `CompetitionGroupView.tsx` vào đây cùng logic dùng nó. ⚠️ `hooks/useCompetitionData.ts`
 * có một hàm CÙNG TÊN nhưng luật khác — CỐ Ý không gộp (CLAUDE.md mục 1: cùng tên ở 2 nơi không
 * mặc nhiên là trùng lặp).
 */
const isStoreRow = (name: string) => /^ĐMX\s*-/i.test(name) || /^DMX\s*-/i.test(name);

/**
 * Logic thẻ Thi đua theo NHÓM (sub-tab "Nhóm") — tách từ `CompetitionGroupView.tsx` (Đợt 1.6,
 * file cuối của Đợt 1). Đặt ở `services/` để sống sót khi đập bỏ `components/`.
 *
 * REFACTOR THUẦN: chép nguyên văn, không đổi con số nào.
 */

export type EmployeeDataMap = Map<string, { name: string; department: string; values: Record<string, number | null> }>;
export type CompetitionTargets = Map<string, Map<string, number>>;

export type SortKey = 'name' | 'target' | 'actual' | 'completion' | 'remaining';
export interface SortConfig {
    key: SortKey;
    direction: 'asc' | 'desc';
}

/** Số liệu của 1 nhân viên ở 1 hạng mục thi đua. */
export interface EmployeeMetrics {
    target: number;
    actual: number;
    completion: number;
    remaining: number;
}

export function getEmployeeMetrics(
    emp: Employee,
    header: CompetitionHeader,
    data: EmployeeDataMap,
    targets: CompetitionTargets
): EmployeeMetrics {
    const target = targets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
    const actual = data.get(emp.name)?.values[header.title] ?? 0;
    return {
        target,
        actual,
        completion: target > 0 ? (actual / target) * 100 : 0,
        // ÂM khi chưa đạt — cùng quy ước "Còn Lại" ở mọi bảng Thi đua khác. Đừng đảo dấu.
        remaining: actual - target,
    };
}

/**
 * Lọc ra nhân viên CÓ LIÊN QUAN tới hạng mục này, rồi sắp xếp theo cột đang chọn.
 *
 * "Có liên quan" = có số thực hiện HOẶC có target. Người không có cả hai bị loại hẳn khỏi thẻ, nên
 * thẻ chỉ hiện đúng những ai thật sự tham gia hạng mục đó. Dòng tổng của siêu thị (`isStoreRow`)
 * luôn bị loại — nó không phải nhân viên.
 */
export function selectAndSortEmployees(
    employees: Employee[],
    header: CompetitionHeader,
    data: EmployeeDataMap,
    targets: CompetitionTargets,
    sortConfig: SortConfig
): Employee[] {
    const relevant = employees.filter(emp => {
        if (isStoreRow(emp.name)) return false;
        const actual = data.get(emp.name)?.values[header.title];
        const target = targets.get(header.originalTitle)?.get(emp.originalName);
        return actual !== undefined || target !== undefined;
    });

    return [...relevant].sort((empA, empB) => {
        const a = getEmployeeMetrics(empA, header, data, targets);
        const b = getEmployeeMetrics(empB, header, data, targets);

        let valA: number, valB: number;
        switch (sortConfig.key) {
            case 'name': {
                const compare = empA.name.localeCompare(empB.name);
                return sortConfig.direction === 'asc' ? compare : -compare;
            }
            case 'target': valA = a.target; valB = b.target; break;
            case 'actual': valA = a.actual; valB = b.actual; break;
            case 'completion': valA = a.completion; valB = b.completion; break;
            case 'remaining': valA = a.remaining; valB = b.remaining; break;
            default: return 0;
        }
        const diff = valA - valB;
        return sortConfig.direction === 'asc' ? diff : -diff;
    });
}

/** Gộp toàn thẻ: cộng dồn target/thực hiện của mọi nhân viên đang hiển thị. */
export function computeGrandTotals(
    employees: Employee[],
    header: CompetitionHeader,
    data: EmployeeDataMap,
    targets: CompetitionTargets
): EmployeeMetrics {
    let target = 0;
    let actual = 0;
    employees.forEach(emp => {
        target += targets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
        actual += data.get(emp.name)?.values[header.title] ?? 0;
    });
    return {
        target,
        actual,
        completion: target > 0 ? (actual / target) * 100 : 0,
        remaining: actual - target,
    };
}

export interface HighlightStats {
    /** Trung bình Thực hiện, CHỈ tính người có số > 0. */
    averageActual: number;
    /** tên gốc NV → hạng theo Thực hiện (1 = cao nhất). Người có số = 0 KHÔNG có hạng. */
    rankedByActual: Map<string, number>;
    /** tên gốc NV → hạng theo %HT. Người có %HT = 0 KHÔNG có hạng. */
    rankedByCompletion: Map<string, number>;
}

/**
 * Số liệu phục vụ tô màu: trung bình và bảng xếp hạng để đánh dấu TOP 3.
 *
 * Người chưa phát sinh gì (giá trị = 0) bị LOẠI khỏi cả phép tính trung bình lẫn bảng xếp hạng —
 * nếu tính vào, trung bình bị kéo tụt và "TOP 3" có thể rơi vào người chưa bán được gì.
 */
export function computeHighlightStats(
    employees: Employee[],
    header: CompetitionHeader,
    data: EmployeeDataMap,
    targets: CompetitionTargets
): HighlightStats {
    const stats = employees.map(emp => {
        const m = getEmployeeMetrics(emp, header, data, targets);
        return { emp: emp.originalName, actual: m.actual, completion: m.completion };
    });

    const validActuals = stats.filter(s => s.actual > 0);
    const averageActual = validActuals.length > 0
        ? validActuals.reduce((s, a) => s + a.actual, 0) / validActuals.length
        : 0;

    const rankedByActual = new Map<string, number>();
    [...validActuals].sort((a, b) => b.actual - a.actual).forEach((s, i) => rankedByActual.set(s.emp, i + 1));

    const rankedByCompletion = new Map<string, number>();
    [...stats.filter(s => s.completion > 0)]
        .sort((a, b) => b.completion - a.completion)
        .forEach((s, i) => rankedByCompletion.set(s.emp, i + 1));

    return { averageActual, rankedByActual, rankedByCompletion };
}

/** Nhóm nhân viên theo bộ phận. Chế độ "list" thì dồn hết vào một nhóm "Tất cả". */
export function groupByDepartment(
    employees: Employee[],
    viewMode: 'group' | 'list'
): Record<string, Employee[]> {
    if (viewMode === 'list') return { 'Tất cả': employees };
    return employees.reduce((acc, emp) => {
        if (!acc[emp.department]) acc[emp.department] = [];
        acc[emp.department].push(emp);
        return acc;
    }, {} as Record<string, Employee[]>);
}

export interface TimeProgress {
    label: string;
    percentage: number;
}

/**
 * Quỹ thời gian đã trôi qua.
 *
 * Realtime đo theo GIỜ BÁN HÀNG trong ngày (8h00–21h30), không phải 0–24h — ngoài khung đó thì kẹp
 * về 0% hoặc 100%. Luỹ kế đo theo NGÀY trong tháng, dùng `dayPassed - 1` vì ngày hôm nay chưa xong.
 */
export function computeTimeProgress(isRealtime: boolean, now: Date = new Date()): TimeProgress {
    if (isRealtime) {
        const startMinutes = 8 * 60;            // 8h00
        const endMinutes = 21 * 60 + 30;        // 21h30
        const totalMinutes = endMinutes - startMinutes;
        const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

        let pct = 0;
        if (nowMinutes <= startMinutes) pct = 0;
        else if (nowMinutes >= endMinutes) pct = 100;
        else pct = ((nowMinutes - startMinutes) / totalMinutes) * 100;

        return { label: '(8h00 - 21h30)', percentage: Math.min(100, Math.max(0, pct)) };
    }

    const dayPassed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
        label: `(${dayPassed} / ${daysInMonth} ngày)`,
        percentage: ((dayPassed - 1) / daysInMonth) * 100,
    };
}
