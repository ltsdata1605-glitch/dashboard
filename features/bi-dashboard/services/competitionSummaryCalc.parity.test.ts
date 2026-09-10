import { describe, it, expect } from 'vitest';
import type { Employee, CompetitionHeader } from '../types/nhanVienTypes';
import { calculateRunRate } from './metricService';
import {
    computeColumnAverages,
    computeColumnRankings,
    computeTongBotMap,
    computeNoSaleMap,
    computeDatMap,
    computeStoreColumnDatCount,
    computeTongBotRedCutoff,
    type EmployeeDataMap,
} from './competitionSummaryCalc';

/**
 * TEST ĐỐI CHỨNG (parity) — chứng minh việc TÁCH LOGIC không làm đổi một con số nào.
 *
 * Cách làm: bên dưới là các công thức CHÉP NGUYÊN VĂN từ `CompetitionSummaryView.tsx` TRƯỚC khi
 * tách (bản tại commit `7811f47b`). Test chạy cả bản gốc lẫn bản đã tách trên hàng trăm bộ dữ liệu
 * sinh ngẫu nhiên và bắt buộc kết quả GIỐNG HỆT.
 *
 * Vì sao cần: test đặc tả thông thường chỉ kiểm những trường hợp mình NGHĨ RA. Còn ở đây, nếu tôi
 * đọc nhầm code gốc thì test đặc tả cũng sẽ nhầm theo và vẫn xanh. Test đối chứng thì không —
 * nó so với chính code cũ, nên bắt được cả lỗi mình không nghĩ tới.
 *
 * File này CÓ THỂ XOÁ sau khi Đợt 1 nghiệm thu xong: nó chỉ có ý nghĩa trong lúc chuyển giao.
 */

// ─────────── BẢN GỐC, chép nguyên văn từ component (KHÔNG sửa gì) ───────────

function origColumnAverages(visibleHeaders: CompetitionHeader[], employees: Employee[], employeeDataMap: EmployeeDataMap, getTargetForEmployee: (a?: string, b?: string) => number) {
    const averages: Record<string, { actual: number; percent: number }> = {};
    visibleHeaders.forEach(header => {
        let sumActual = 0;
        let sumPercent = 0;
        employees.forEach(emp => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
            const target = getTargetForEmployee(header.originalTitle, emp.originalName);
            const ht = target > 0 ? (actual / target) * 100 : 0;
            sumActual += actual;
            sumPercent += ht;
        });
        averages[header.title] = {
            actual: employees.length > 0 ? sumActual / employees.length : 0,
            percent: employees.length > 0 ? sumPercent / employees.length : 0
        };
    });
    return averages;
}

function origColumnRankings(visibleHeaders: CompetitionHeader[], employees: Employee[], employeeDataMap: EmployeeDataMap, getTargetForEmployee: (a?: string, b?: string) => number, showPercent: boolean) {
    const rankings: Record<string, Map<string, number>> = {};
    visibleHeaders.forEach(header => {
        const empValues = employees.map(emp => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
            const target = getTargetForEmployee(header.originalTitle, emp.originalName);
            const ht = target > 0 ? (actual / target) * 100 : 0;
            const value = showPercent ? ht : actual;
            return { empName: emp.name, value };
        });
        empValues.sort((a, b) => b.value - a.value);
        const rankMap = new Map<string, number>();
        let currentRank = 0;
        let prevValue = -1;
        empValues.forEach((item) => {
            if (item.value <= 0) { rankMap.set(item.empName, 999); return; }
            if (item.value !== prevValue) { currentRank++; prevValue = item.value; }
            rankMap.set(item.empName, currentRank);
        });
        rankings[header.title] = rankMap;
    });
    return rankings;
}

function origTongBot(employees: Employee[], visibleHeaders: CompetitionHeader[], employeeDataMap: EmployeeDataMap, getTargetForEmployee: (a?: string, b?: string) => number, columnAverages: Record<string, { actual: number; percent: number }>, showPercent: boolean) {
    const map = new Map<string, number>();
    employees.forEach(emp => {
        let count = 0;
        visibleHeaders.forEach(header => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
            const target = getTargetForEmployee(header.originalTitle, emp.originalName);
            const ht = target > 0 ? (actual / target) * 100 : 0;
            const averages = columnAverages[header.title];
            if (averages) {
                if (showPercent) { if (ht < averages.percent) count++; }
                else { if (actual < averages.actual) count++; }
            }
        });
        map.set(emp.name, count);
    });
    return map;
}

function origNoSale(employees: Employee[], visibleHeaders: CompetitionHeader[], employeeDataMap: EmployeeDataMap) {
    const map = new Map<string, number>();
    employees.forEach(emp => {
        let count = 0;
        visibleHeaders.forEach(header => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
            if (actual === 0) count++;
        });
        map.set(emp.name, count);
    });
    return map;
}

function origDat(employees: Employee[], visibleHeaders: CompetitionHeader[], employeeDataMap: EmployeeDataMap, getTargetForEmployee: (a?: string, b?: string) => number, daysPassed: number, daysInMonth: number) {
    const map = new Map<string, number>();
    employees.forEach(emp => {
        let count = 0;
        visibleHeaders.forEach(header => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
            const target = getTargetForEmployee(header.originalTitle, emp.originalName);
            if (target > 0) {
                const dkht = (calculateRunRate(actual, daysPassed, daysInMonth) / target) * 100;
                if (dkht >= 100 || actual >= target) { count++; }
            }
        });
        map.set(emp.name, count);
    });
    return map;
}

function origStoreColumnDat(visibleHeaders: CompetitionHeader[], employees: Employee[], employeeDataMap: EmployeeDataMap, getTargetForEmployee: (a?: string, b?: string) => number, daysPassed: number, daysInMonth: number) {
    let count = 0;
    visibleHeaders.forEach(header => {
        const totalActual = employees.reduce((sum, emp) => sum + (employeeDataMap.get(emp.name)?.values[header.title] ?? 0), 0);
        const totalTarget = employees.reduce((sum, emp) => sum + getTargetForEmployee(header.originalTitle, emp.originalName), 0);
        const totalDkht = totalTarget > 0 ? (calculateRunRate(totalActual, daysPassed, daysInMonth) / totalTarget) * 100 : 0;
        if (totalDkht >= 100 || (totalTarget > 0 && totalActual >= totalTarget)) count++;
    });
    return count;
}

function origRedCutoff(employees: Employee[], employeeTongBotMap: Map<string, number>) {
    const botValues = employees.map(emp => employeeTongBotMap.get(emp.name) ?? 0);
    botValues.sort((a, b) => b - a);
    const thresholdIndex = Math.max(0, Math.ceil(employees.length * 0.3) - 1);
    return botValues[thresholdIndex] ?? 0;
}

// ─────────── Sinh dữ liệu ngẫu nhiên tất định ───────────

/** PRNG có hạt giống — cùng seed cho cùng dữ liệu, nên test không bao giờ chập chờn. */
function rng(seed: number) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildCase(seed: number) {
    const r = rng(seed);
    const nEmp = 1 + Math.floor(r() * 12);
    const nCol = 1 + Math.floor(r() * 8);

    const employees: Employee[] = Array.from({ length: nEmp }, (_, i) => ({
        name: `NV${i}`, originalName: `ORIG${i}`, department: 'BP',
    }));
    const headers: CompetitionHeader[] = Array.from({ length: nCol }, (_, i) => ({
        title: `C${i}`, originalTitle: `ORIGC${i}`, metric: 'SLLK',
    }));

    const data: EmployeeDataMap = new Map();
    employees.forEach(e => {
        const values: Record<string, number | null> = {};
        headers.forEach(h => {
            const dice = r();
            // Cố tình trộn các ca hiểm: thiếu key, null, 0, số âm, số rất lớn.
            if (dice < 0.12) return;                        // thiếu hẳn key
            else if (dice < 0.2) values[h.title] = null;
            else if (dice < 0.32) values[h.title] = 0;
            else if (dice < 0.38) values[h.title] = -Math.floor(r() * 50);
            else values[h.title] = Math.floor(r() * 1_000_000);
        });
        data.set(e.name, { name: e.name, department: 'BP', values });
    });

    // Target: có người không có target (0), có người target rất nhỏ/rất lớn.
    const targetTable = new Map<string, number>();
    employees.forEach(e => headers.forEach(h => {
        const dice = r();
        targetTable.set(`${h.originalTitle}|${e.originalName}`, dice < 0.2 ? 0 : Math.floor(r() * 500_000));
    }));
    const getTarget = (t?: string, e?: string) => targetTable.get(`${t}|${e}`) ?? 0;

    const showPercent = r() < 0.5;
    const daysPassed = 1 + Math.floor(r() * 30);
    const daysInMonth = 28 + Math.floor(r() * 4);

    return { employees, headers, data, getTarget, showPercent, daysPassed, daysInMonth };
}

// ─────────── Đối chứng ───────────

describe('PARITY — bản tách phải cho kết quả GIỐNG HỆT bản gốc', () => {
    const SEEDS = Array.from({ length: 250 }, (_, i) => i + 1);

    it('computeColumnAverages', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(computeColumnAverages(c.headers, c.employees, c.data, c.getTarget), `seed ${s}`)
                .toEqual(origColumnAverages(c.headers, c.employees, c.data, c.getTarget));
        }
    });

    it('computeColumnRankings', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(computeColumnRankings(c.headers, c.employees, c.data, c.getTarget, c.showPercent), `seed ${s}`)
                .toEqual(origColumnRankings(c.headers, c.employees, c.data, c.getTarget, c.showPercent));
        }
    });

    it('computeTongBotMap', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            const avg = origColumnAverages(c.headers, c.employees, c.data, c.getTarget);
            expect(computeTongBotMap(c.headers, c.employees, c.data, c.getTarget, avg, c.showPercent), `seed ${s}`)
                .toEqual(origTongBot(c.employees, c.headers, c.data, c.getTarget, avg, c.showPercent));
        }
    });

    it('computeNoSaleMap', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(computeNoSaleMap(c.headers, c.employees, c.data), `seed ${s}`)
                .toEqual(origNoSale(c.employees, c.headers, c.data));
        }
    });

    it('computeDatMap', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(computeDatMap(c.headers, c.employees, c.data, c.getTarget, c.daysPassed, c.daysInMonth), `seed ${s}`)
                .toEqual(origDat(c.employees, c.headers, c.data, c.getTarget, c.daysPassed, c.daysInMonth));
        }
    });

    it('computeStoreColumnDatCount', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(computeStoreColumnDatCount(c.headers, c.employees, c.data, c.getTarget, c.daysPassed, c.daysInMonth), `seed ${s}`)
                .toBe(origStoreColumnDat(c.headers, c.employees, c.data, c.getTarget, c.daysPassed, c.daysInMonth));
        }
    });

    it('computeTongBotRedCutoff', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            const avg = origColumnAverages(c.headers, c.employees, c.data, c.getTarget);
            const bot = origTongBot(c.employees, c.headers, c.data, c.getTarget, avg, c.showPercent);
            expect(computeTongBotRedCutoff(c.employees, bot), `seed ${s}`).toBe(origRedCutoff(c.employees, bot));
        }
    });
});
