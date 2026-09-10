import { describe, it, expect } from 'vitest';
import type { Employee, CompetitionHeader } from '../types/nhanVienTypes';
import {
    resolveEmployeeTarget,
    getMonthProgress,
    computeColumnAverages,
    computeColumnRankings,
    computeTongBotMap,
    computeNoSaleMap,
    computeDatMap,
    computeStoreDatPercent,
    computeStoreColumnDatCount,
    computeTongBotRedCutoff,
    RANK_NO_DATA,
    type EmployeeDataMap,
    type CompetitionTargets,
} from './competitionSummaryCalc';

/**
 * CHARACTERIZATION TEST — khoá hành vi HIỆN TẠI của bảng Tổng hợp Thi đua làm đặc tả, trước khi
 * lột xác giao diện (Đợt 1, xem implementation_plan.md).
 *
 * Mục đích không phải chứng minh công thức ĐÚNG, mà chứng minh nó KHÔNG ĐỔI. Nếu sau này dựng lại
 * giao diện mà một trong các test này đỏ, nghĩa là số liệu người dùng nhìn thấy đã lệch — kể cả khi
 * màn hình trông vẫn bình thường.
 */

const emp = (name: string, originalName = name): Employee => ({ name, originalName, department: 'BP' });

const dataMap = (rows: Record<string, Record<string, number | null>>): EmployeeDataMap => {
    const m: EmployeeDataMap = new Map();
    for (const [name, values] of Object.entries(rows)) m.set(name, { name, department: 'BP', values });
    return m;
};

const targets = (rows: Record<string, Record<string, number>>): CompetitionTargets => {
    const m: CompetitionTargets = new Map();
    for (const [prog, per] of Object.entries(rows)) m.set(prog, new Map(Object.entries(per)));
    return m;
};

const H = (title: string, originalTitle = title): CompetitionHeader => ({ title, originalTitle, metric: 'SLLK' });

describe('resolveEmployeeTarget — dò target qua 3 tầng nới lỏng', () => {
    const t = targets({ 'SIM MANGO': { 'A': 100 }, '  vay tiền mặt  ': { 'B': 50 } });

    it('khớp chính xác cả chương trình lẫn nhân viên', () => {
        expect(resolveEmployeeTarget(t, 'SIM MANGO', 'A')).toBe(100);
    });

    it('khớp lỏng tên chương trình: thừa khoảng trắng + khác hoa thường', () => {
        expect(resolveEmployeeTarget(t, 'VAY TIỀN MẶT', 'B')).toBe(50);
    });

    it('khớp lỏng theo kiểu CHỨA NHAU', () => {
        expect(resolveEmployeeTarget(t, 'SIM', 'A'), 'tên ngắn nằm trong tên dài').toBe(100);
    });

    it('thiếu tham số hoặc không tìm thấy thì trả 0, KHÔNG ném lỗi', () => {
        expect(resolveEmployeeTarget(t, undefined, 'A')).toBe(0);
        expect(resolveEmployeeTarget(t, 'SIM MANGO', undefined)).toBe(0);
        expect(resolveEmployeeTarget(t, 'KHÔNG CÓ', 'A')).toBe(0);
    });
});

describe('getMonthProgress — nhịp thời gian cho run rate', () => {
    it('daysPassed = hôm nay - 1 (dữ liệu chốt tới hết hôm qua)', () => {
        expect(getMonthProgress(new Date(2026, 8, 10))).toEqual({ daysPassed: 9, daysInMonth: 30 });
    });

    it('ngày mùng 1 KHÔNG cho ra 0 (tránh chia cho 0)', () => {
        expect(getMonthProgress(new Date(2026, 8, 1)).daysPassed).toBe(1);
    });

    it('tháng 2 năm nhuận ra 29 ngày', () => {
        expect(getMonthProgress(new Date(2024, 1, 15)).daysInMonth).toBe(29);
    });
});

describe('computeColumnAverages', () => {
    const headers = [H('C1')];
    const employees = [emp('A'), emp('B')];
    const data = dataMap({ A: { C1: 100 }, B: { C1: 200 } });

    it('trung bình tính trên TOÀN BỘ nhân viên, kể cả người bằng 0', () => {
        const r = computeColumnAverages(headers, [...employees, emp('C')], dataMap({ A: { C1: 100 }, B: { C1: 200 }, C: { C1: 0 } }), () => 0);
        expect(r.C1.actual, '(100+200+0)/3').toBe(100);
    });

    it('%HT trung bình dùng target riêng của từng người', () => {
        const r = computeColumnAverages(headers, employees, data, (_t, e) => (e === 'A' ? 100 : 400));
        expect(r.C1.percent, '(100% + 50%)/2').toBe(75);
    });

    it('target = 0 thì %HT tính là 0, không ra Infinity', () => {
        const r = computeColumnAverages(headers, employees, data, () => 0);
        expect(r.C1.percent).toBe(0);
        expect(Number.isFinite(r.C1.percent)).toBe(true);
    });

    it('không có nhân viên nào thì trả 0 chứ không NaN', () => {
        const r = computeColumnAverages(headers, [], dataMap({}), () => 100);
        expect(r.C1).toEqual({ actual: 0, percent: 0 });
    });

    it('nhân viên thiếu dữ liệu cột đó được tính là 0', () => {
        const r = computeColumnAverages(headers, employees, dataMap({ A: { C1: 100 }, B: {} }), () => 0);
        expect(r.C1.actual).toBe(50);
    });
});

describe('computeColumnRankings — dense rank', () => {
    const headers = [H('C1')];

    it('bằng điểm thì CÙNG hạng và hạng kế tiếp KHÔNG nhảy cóc', () => {
        const employees = [emp('A'), emp('B'), emp('C')];
        const data = dataMap({ A: { C1: 50 }, B: { C1: 50 }, C: { C1: 10 } });
        const r = computeColumnRankings(headers, employees, data, () => 0, false).C1;
        expect(r.get('A')).toBe(1);
        expect(r.get('B')).toBe(1);
        expect(r.get('C'), 'dense rank: hạng 2 chứ không phải 3').toBe(2);
    });

    it('giá trị <= 0 bị đẩy xuống cuối bằng RANK_NO_DATA', () => {
        const employees = [emp('A'), emp('B')];
        const data = dataMap({ A: { C1: 5 }, B: { C1: 0 } });
        const r = computeColumnRankings(headers, employees, data, () => 0, false).C1;
        expect(r.get('A')).toBe(1);
        expect(r.get('B')).toBe(RANK_NO_DATA);
    });

    it('bật %HT thì xếp theo % chứ không theo số tuyệt đối — có thể ĐẢO thứ hạng', () => {
        const employees = [emp('A'), emp('B')];
        const data = dataMap({ A: { C1: 100 }, B: { C1: 50 } });
        const getTarget = (_t?: string, e?: string) => (e === 'A' ? 1000 : 50); // A 10%, B 100%

        expect(computeColumnRankings(headers, employees, data, getTarget, false).C1.get('A'), 'theo số: A dẫn').toBe(1);
        expect(computeColumnRankings(headers, employees, data, getTarget, true).C1.get('B'), 'theo %: B dẫn').toBe(1);
    });
});

describe('computeTongBotMap — đếm số cột dưới trung bình', () => {
    const headers = [H('C1'), H('C2')];
    const employees = [emp('A'), emp('B')];
    const data = dataMap({ A: { C1: 10, C2: 10 }, B: { C1: 90, C2: 90 } });

    it('đếm đúng số cột nằm dưới trung bình (chế độ số tuyệt đối)', () => {
        const avg = computeColumnAverages(headers, employees, data, () => 0);
        const r = computeTongBotMap(headers, employees, data, () => 0, avg, false);
        expect(r.get('A'), 'A dưới trung bình cả 2 cột').toBe(2);
        expect(r.get('B'), 'B trên trung bình cả 2 cột').toBe(0);
    });

    it('ĐÚNG BẰNG trung bình thì KHÔNG tính là dưới (dùng < chứ không <=)', () => {
        const eq = dataMap({ A: { C1: 50 }, B: { C1: 50 } });
        const h1 = [H('C1')];
        const avg = computeColumnAverages(h1, employees, eq, () => 0);
        const r = computeTongBotMap(h1, employees, eq, () => 0, avg, false);
        expect(r.get('A')).toBe(0);
    });

    it('cột không có dữ liệu trung bình thì bỏ qua, không vỡ', () => {
        const r = computeTongBotMap(headers, employees, data, () => 0, {}, false);
        expect(r.get('A')).toBe(0);
    });
});

describe('computeNoSaleMap', () => {
    it('đếm số cột chưa phát sinh gì', () => {
        const headers = [H('C1'), H('C2'), H('C3')];
        const data = dataMap({ A: { C1: 0, C2: 5, C3: 0 } });
        expect(computeNoSaleMap(headers, [emp('A')], data).get('A')).toBe(2);
    });

    it('thiếu dữ liệu cũng tính là chưa phát sinh', () => {
        const data = dataMap({ A: {} });
        expect(computeNoSaleMap([H('C1')], [emp('A')], data).get('A')).toBe(1);
    });
});

describe('computeDatMap — "Đạt" theo run rate HOẶC vượt target thực tế', () => {
    const headers = [H('C1')];
    const employees = [emp('A')];

    it('đạt nhờ RUN RATE dù thực tế chưa tới target', () => {
        // 50 sau 10 ngày → dự kiến 150 cho tháng 30 ngày → 150% target 100
        const r = computeDatMap(headers, employees, dataMap({ A: { C1: 50 } }), () => 100, 10, 30);
        expect(r.get('A')).toBe(1);
    });

    it('đạt nhờ VƯỢT TARGET THỰC TẾ dù run rate chưa tới', () => {
        // 100 vào ngày 29/30 → run rate ~103 nhưng đã bằng target; nhánh actual >= target phải bắt được
        const r = computeDatMap(headers, employees, dataMap({ A: { C1: 100 } }), () => 100, 29, 30);
        expect(r.get('A'), 'người dồn số cuối tháng vẫn phải được tính đạt').toBe(1);
    });

    it('chưa đạt cả hai đường thì không tính', () => {
        const r = computeDatMap(headers, employees, dataMap({ A: { C1: 10 } }), () => 1000, 15, 30);
        expect(r.get('A')).toBe(0);
    });

    it('cột KHÔNG có target thì không bao giờ tính là đạt', () => {
        const r = computeDatMap(headers, employees, dataMap({ A: { C1: 99999 } }), () => 0, 10, 30);
        expect(r.get('A')).toBe(0);
    });
});

describe('computeStoreDatPercent', () => {
    it('tổng ô đạt / tổng ô có thể đạt', () => {
        const datMap = new Map([['A', 3], ['B', 1]]);
        expect(computeStoreDatPercent([emp('A'), emp('B')], 4, datMap), '4/8').toBe(50);
    });

    it('không có nhân viên hoặc không có cột thì trả 0, không NaN', () => {
        expect(computeStoreDatPercent([], 4, new Map())).toBe(0);
        expect(computeStoreDatPercent([emp('A')], 0, new Map())).toBe(0);
    });
});

describe('computeStoreColumnDatCount — gộp cả siêu thị rồi mới so', () => {
    it('KHÁC với tổng "Đạt" từng người: siêu thị đạt dù đa số nhân viên không đạt', () => {
        const headers = [H('C1')];
        const employees = [emp('A'), emp('B'), emp('C')];
        // Tổng thực hiện 300 = tổng target 300 → siêu thị ĐẠT ở cột này...
        const data = dataMap({ A: { C1: 280 }, B: { C1: 10 }, C: { C1: 10 } });
        const getTarget = () => 100;

        expect(computeStoreColumnDatCount(headers, employees, data, getTarget, 29, 30)).toBe(1);

        const perEmp = computeDatMap(headers, employees, data, getTarget, 29, 30);
        expect(perEmp.get('B'), '...nhưng B thì không đạt').toBe(0);
        expect(perEmp.get('C'), '...C cũng không').toBe(0);
    });

    it('cột không có target nào thì không tính là đạt', () => {
        const r = computeStoreColumnDatCount([H('C1')], [emp('A')], dataMap({ A: { C1: 500 } }), () => 0, 10, 30);
        expect(r).toBe(0);
    });
});

describe('computeTongBotRedCutoff — ngưỡng TOP 30%', () => {
    it('lấy giá trị ở mốc 30% khi sắp giảm dần', () => {
        const employees = [emp('A'), emp('B'), emp('C'), emp('D'), emp('E')];
        const bot = new Map([['A', 10], ['B', 8], ['C', 5], ['D', 2], ['E', 0]]);
        // ceil(5 * 0.3) - 1 = 1 → phần tử thứ 2 của [10,8,5,2,0]
        expect(computeTongBotRedCutoff(employees, bot)).toBe(8);
    });

    it('danh sách rỗng trả 0, không vỡ', () => {
        expect(computeTongBotRedCutoff([], new Map())).toBe(0);
    });

    it('một nhân viên thì ngưỡng chính là giá trị của họ', () => {
        expect(computeTongBotRedCutoff([emp('A')], new Map([['A', 4]]))).toBe(4);
    });
});
