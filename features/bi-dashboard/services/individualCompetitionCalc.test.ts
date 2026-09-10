import { describe, it, expect } from 'vitest';
import { isSameEmployee } from '../utils/nhanVienHelpers';
import { calculateRunRate } from './metricService';
import {
    findEmployeeRow,
    computeRank,
    computeCompetitionStats,
    computePerformanceRow,
    getIndividualMonthProgress,
    type EmployeeLikeRow,
    type PerformanceItem,
} from './individualCompetitionCalc';

/** Đợt 1.3 — logic báo cáo Thi đua Cá nhân. Đặc tả + PARITY với công thức gốc. */

const row = (o: Partial<EmployeeLikeRow> & Record<string, unknown> = {}): EmployeeLikeRow =>
    ({ type: 'employee', originalName: 'A', ...o }) as EmployeeLikeRow;

describe('findEmployeeRow', () => {
    it('chỉ tìm trong dòng type = employee, bỏ qua dòng tổng/bộ phận', () => {
        const rows = [row({ type: 'department', originalName: 'A', tag: 'bp' }), row({ originalName: 'A', tag: 'nv' })];
        expect((findEmployeeRow(rows, 'A') as unknown as Record<string, unknown>).tag).toBe('nv');
    });

    it('khớp tên LỎNG (khác khoảng trắng/hoa thường)', () => {
        expect(findEmployeeRow([row({ originalName: '  nguyễn văn a ' })], 'Nguyễn Văn A')).toBeTruthy();
    });

    it('rows null/undefined ⇒ null, không ném lỗi', () => {
        expect(findEmployeeRow(null, 'A')).toBeNull();
        expect(findEmployeeRow(undefined, 'A')).toBeNull();
    });

    it('dòng thiếu originalName thì không khớp ai', () => {
        expect(findEmployeeRow([row({ originalName: undefined })], 'A')).toBeUndefined();
    });
});

describe('computeRank', () => {
    const rows = [
        row({ originalName: 'A', dtlk: 100 }),
        row({ originalName: 'B', dtlk: 300 }),
        row({ originalName: 'C', dtlk: 200 }),
    ];

    it('xếp GIẢM DẦN, người cao nhất hạng 1', () => {
        expect(computeRank(rows, 'dtlk', 'B')).toEqual({ rank: 1, total: 3 });
        expect(computeRank(rows, 'dtlk', 'C')).toEqual({ rank: 2, total: 3 });
        expect(computeRank(rows, 'dtlk', 'A')).toEqual({ rank: 3, total: 3 });
    });

    it('không tìm thấy ⇒ hạng = TỔNG SỐ NGƯỜI (đứng bét), không phải 0', () => {
        expect(computeRank(rows, 'dtlk', 'KHONGCO')).toEqual({ rank: 3, total: 3 });
    });

    it('thiếu khoá chỉ số thì coi như 0', () => {
        const r = [row({ originalName: 'A' }), row({ originalName: 'B', dtlk: 5 })];
        expect(computeRank(r, 'dtlk', 'B').rank).toBe(1);
    });

    it('danh sách rỗng ⇒ rank 0 / total 0', () => {
        expect(computeRank([], 'dtlk', 'A')).toEqual({ rank: 0, total: 0 });
    });

    it('bỏ qua dòng không phải employee khi đếm tổng', () => {
        const r = [row({ originalName: 'A', dtlk: 1 }), row({ type: 'department', originalName: 'BP', dtlk: 999 })];
        expect(computeRank(r, 'dtlk', 'A')).toEqual({ rank: 1, total: 1 });
    });
});

describe('getIndividualMonthProgress — CỐ Ý khác bản của bảng Tổng hợp', () => {
    it('daysPassed = hôm nay - 1, KHÔNG có chốt tối thiểu 1', () => {
        expect(getIndividualMonthProgress(new Date(2026, 8, 10)).daysPassed).toBe(9);
    });

    it('ngày mùng 1 cho daysPassed = 0 (khác competitionSummaryCalc, giữ đúng bản gốc)', () => {
        expect(getIndividualMonthProgress(new Date(2026, 8, 1)).daysPassed).toBe(0);
    });
});

describe('computeCompetitionStats — phân nhóm theo %DKHT', () => {
    const item = (target: number, actual: number): PerformanceItem =>
        ({ name: 'x', target, actual, completion: 0, remaining: 0 });

    it('phân đúng 4 nhóm: đạt / gần đạt / chưa đạt / NoSale', () => {
        // 10 ngày trôi, tháng 30 ngày ⇒ run rate = actual * 3
        const items = [
            item(100, 40),   // 120% → đạt
            item(100, 30),   // 90%  → gần đạt
            item(100, 10),   // 30%  → chưa đạt
            item(100, 0),    // 0%   → NoSale
            item(0, 500),    // không target → 0 → NoSale
        ];
        const s = computeCompetitionStats(items, 10, 30);
        expect(s).toMatchObject({ total: 5, dkhtDat: 1, dkhtGanDat: 1, dkhtChuaDat: 1, noSale: 2 });
    });

    it('ĐÚNG mốc 80 tính là "gần đạt", đúng mốc 100 tính là "đạt"', () => {
        const s80 = computeCompetitionStats([item(100, 80 / 3)], 10, 30);
        expect(s80.dkhtGanDat).toBe(1);
        const s100 = computeCompetitionStats([item(100, 100 / 3)], 10, 30);
        expect(s100.dkhtDat).toBe(1);
    });

    it('danh sách rỗng ⇒ mọi số = 0, avgDkht = 0 chứ không NaN', () => {
        const s = computeCompetitionStats([], 10, 30);
        expect(s).toEqual({ total: 0, dkhtDat: 0, dkhtGanDat: 0, dkhtChuaDat: 0, noSale: 0, avgDkht: 0 });
    });

    it('ngày mùng 1 (daysPassed = 0): TẤT CẢ rơi vào NoSale — hệ quả có thật của bản gốc', () => {
        const s = computeCompetitionStats([item(100, 999)], 0, 30);
        expect(s.noSale, 'run rate trả 0 khi daysPassed <= 0').toBe(1);
        expect(s.dkhtDat).toBe(0);
    });
});

describe('computePerformanceRow', () => {
    it('remaining = actual - target, ÂM khi chưa đạt', () => {
        expect(computePerformanceRow(100, 30)).toEqual({ completion: 30, remaining: -70 });
    });

    it('không target ⇒ completion 0, không chia cho 0', () => {
        const r = computePerformanceRow(0, 50);
        expect(r.completion).toBe(0);
        expect(Number.isFinite(r.completion)).toBe(true);
    });
});

// ─────────── PARITY với công thức gốc chép nguyên văn ───────────

function origGetRank(rows: EmployeeLikeRow[], key: string, originalName: string) {
    const empRows = (rows || []).filter(r => r.type === 'employee');
    const sorted = [...empRows].sort((a, b) => ((b as unknown as Record<string, unknown>)[key] as number || 0) - ((a as unknown as Record<string, unknown>)[key] as number || 0));
    const idx = sorted.findIndex(r => isSameEmployee(r.originalName, originalName));
    return { rank: idx >= 0 ? idx + 1 : empRows.length, total: empRows.length };
}

function origCompStats(allItems: PerformanceItem[], daysPassed: number, daysInMonth: number) {
    const total = allItems.length;
    const dkhtValues = allItems.map(i => {
        if (!i.target || i.target <= 0) return 0;
        return (calculateRunRate(i.actual, daysPassed, daysInMonth) / i.target) * 100;
    });
    return {
        total,
        dkhtDat: dkhtValues.filter(d => d >= 100).length,
        dkhtGanDat: dkhtValues.filter(d => d >= 80 && d < 100).length,
        dkhtChuaDat: dkhtValues.filter(d => d > 0 && d < 80).length,
        noSale: dkhtValues.filter(d => d === 0).length,
        avgDkht: total > 0 ? dkhtValues.reduce((s, d) => s + d, 0) / total : 0,
    };
}

function rng(seed: number) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

describe('PARITY — bản tách giống hệt bản gốc', () => {
    const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

    it('computeRank', () => {
        for (const seed of SEEDS) {
            const r = rng(seed);
            const n = Math.floor(r() * 10);
            const rows: EmployeeLikeRow[] = Array.from({ length: n }, (_, i) => ({
                type: r() < 0.15 ? 'department' : 'employee',
                originalName: r() < 0.1 ? undefined : `NV${i}`,
                dtlk: r() < 0.2 ? undefined : Math.floor(r() * 1000),
            }) as EmployeeLikeRow);
            const target = r() < 0.3 ? 'KHONGCO' : `NV${Math.floor(r() * Math.max(1, n))}`;
            expect(computeRank(rows, 'dtlk', target), `seed ${seed}`).toEqual(origGetRank(rows, 'dtlk', target));
        }
    });

    it('computeCompetitionStats', () => {
        for (const seed of SEEDS) {
            const r = rng(seed);
            const n = Math.floor(r() * 15);
            const items: PerformanceItem[] = Array.from({ length: n }, () => ({
                name: 'x',
                target: r() < 0.2 ? 0 : Math.floor(r() * 500),
                actual: r() < 0.15 ? 0 : Math.floor(r() * 800),
                completion: 0, remaining: 0,
            }));
            const daysPassed = Math.floor(r() * 31);   // CÓ ca 0 (ngày mùng 1)
            const daysInMonth = 28 + Math.floor(r() * 4);
            expect(computeCompetitionStats(items, daysPassed, daysInMonth), `seed ${seed}`)
                .toEqual(origCompStats(items, daysPassed, daysInMonth));
        }
    });
});
