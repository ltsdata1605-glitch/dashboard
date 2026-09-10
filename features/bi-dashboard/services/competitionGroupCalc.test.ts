import { describe, it, expect } from 'vitest';
import type { Employee, CompetitionHeader } from '../types/nhanVienTypes';
import {
    getEmployeeMetrics,
    selectAndSortEmployees,
    computeGrandTotals,
    computeHighlightStats,
    groupByDepartment,
    computeTimeProgress,
    type EmployeeDataMap,
    type CompetitionTargets,
} from './competitionGroupCalc';

/** Đợt 1.6 — thẻ Thi đua theo Nhóm. File cuối của Đợt 1. */

const H: CompetitionHeader = { title: 'C1', originalTitle: 'ORIG_C1', metric: 'SLLK' };
const emp = (name: string, department = 'BP1'): Employee => ({ name, originalName: name, department });

const data = (rows: Record<string, number | null | undefined>): EmployeeDataMap => {
    const m: EmployeeDataMap = new Map();
    for (const [name, v] of Object.entries(rows)) {
        m.set(name, { name, department: 'BP1', values: v === undefined ? {} : { C1: v } });
    }
    return m;
};
const targets = (rows: Record<string, number>): CompetitionTargets =>
    new Map([['ORIG_C1', new Map(Object.entries(rows))]]);

describe('getEmployeeMetrics', () => {
    it('remaining ÂM khi chưa đạt, DƯƠNG khi vượt', () => {
        expect(getEmployeeMetrics(emp('A'), H, data({ A: 30 }), targets({ A: 100 })))
            .toEqual({ target: 100, actual: 30, completion: 30, remaining: -70 });
        expect(getEmployeeMetrics(emp('A'), H, data({ A: 150 }), targets({ A: 100 })).remaining).toBe(50);
    });

    it('không target ⇒ completion 0, không chia cho 0', () => {
        const m = getEmployeeMetrics(emp('A'), H, data({ A: 50 }), targets({}));
        expect(m.completion).toBe(0);
        expect(Number.isFinite(m.completion)).toBe(true);
    });
});

describe('selectAndSortEmployees — lọc ai được lên thẻ', () => {
    it('loại người KHÔNG có cả thực hiện lẫn target', () => {
        const list = [emp('A'), emp('B')];
        const r = selectAndSortEmployees(list, H, data({ A: 10, B: undefined }), targets({ A: 5 }), { key: 'actual', direction: 'desc' });
        expect(r.map(e => e.name)).toEqual(['A']);
    });

    it('CHỈ có target (chưa bán gì) vẫn được lên thẻ', () => {
        const r = selectAndSortEmployees([emp('A')], H, data({ A: undefined }), targets({ A: 100 }), { key: 'actual', direction: 'desc' });
        expect(r.map(e => e.name)).toEqual(['A']);
    });

    it('loại dòng TỔNG siêu thị ("ĐMX - ...") vì không phải nhân viên', () => {
        const list = [emp('ĐMX - Hùng Vương'), emp('A')];
        const r = selectAndSortEmployees(list, H, data({ 'ĐMX - Hùng Vương': 999, A: 10 }), targets({ A: 5 }), { key: 'actual', direction: 'desc' });
        expect(r.map(e => e.name)).toEqual(['A']);
    });

    it('sắp xếp được theo từng cột, cả 2 chiều', () => {
        const list = [emp('A'), emp('B')];
        const d = data({ A: 10, B: 90 });
        const t = targets({ A: 5, B: 1000 });   // A vượt 200%, B mới 9%
        const by = (key: 'actual' | 'completion', dir: 'asc' | 'desc') =>
            selectAndSortEmployees(list, H, d, t, { key, direction: dir }).map(e => e.name);

        expect(by('actual', 'desc'), 'B nhiều số hơn').toEqual(['B', 'A']);
        expect(by('completion', 'desc'), 'A đạt % cao hơn').toEqual(['A', 'B']);
        expect(by('actual', 'asc')).toEqual(['A', 'B']);
    });

    it('sắp theo tên dùng so sánh chuỗi, không phải số', () => {
        const list = [emp('Bình'), emp('An')];
        const r = selectAndSortEmployees(list, H, data({ 'Bình': 1, An: 1 }), targets({}), { key: 'name', direction: 'asc' });
        expect(r.map(e => e.name)).toEqual(['An', 'Bình']);
    });
});

describe('computeGrandTotals', () => {
    it('cộng dồn rồi mới tính %, không phải trung bình các %', () => {
        const r = computeGrandTotals([emp('A'), emp('B')], H, data({ A: 30, B: 70 }), targets({ A: 100, B: 100 }));
        expect(r).toEqual({ target: 200, actual: 100, completion: 50, remaining: -100 });
    });

    it('không ai có target ⇒ completion 0', () => {
        expect(computeGrandTotals([emp('A')], H, data({ A: 50 }), targets({})).completion).toBe(0);
    });
});

describe('computeHighlightStats — số liệu tô màu', () => {
    it('trung bình BỎ QUA người chưa phát sinh gì', () => {
        const r = computeHighlightStats([emp('A'), emp('B'), emp('C')], H, data({ A: 100, B: 200, C: 0 }), targets({}));
        expect(r.averageActual, '(100+200)/2 chứ không phải /3').toBe(150);
    });

    it('người có số = 0 KHÔNG được xếp hạng', () => {
        const r = computeHighlightStats([emp('A'), emp('B')], H, data({ A: 100, B: 0 }), targets({}));
        expect(r.rankedByActual.get('A')).toBe(1);
        expect(r.rankedByActual.has('B'), 'chưa bán gì thì không có hạng').toBe(false);
    });

    it('xếp hạng %HT tách riêng khỏi xếp hạng Thực hiện', () => {
        const r = computeHighlightStats([emp('A'), emp('B')], H, data({ A: 10, B: 90 }), targets({ A: 5, B: 1000 }));
        expect(r.rankedByActual.get('B'), 'B nhiều số nhất').toBe(1);
        expect(r.rankedByCompletion.get('A'), 'A đạt % cao nhất').toBe(1);
    });

    it('không ai có số ⇒ trung bình 0, không NaN', () => {
        const r = computeHighlightStats([emp('A')], H, data({ A: 0 }), targets({}));
        expect(r.averageActual).toBe(0);
    });
});

describe('groupByDepartment', () => {
    it('chế độ list dồn hết vào một nhóm "Tất cả"', () => {
        const r = groupByDepartment([emp('A', 'BP1'), emp('B', 'BP2')], 'list');
        expect(Object.keys(r)).toEqual(['Tất cả']);
    });

    it('chế độ group tách theo bộ phận', () => {
        const r = groupByDepartment([emp('A', 'BP1'), emp('B', 'BP2'), emp('C', 'BP1')], 'group');
        expect(Object.keys(r).sort()).toEqual(['BP1', 'BP2']);
        expect(r.BP1.map(e => e.name)).toEqual(['A', 'C']);
    });
});

describe('computeTimeProgress', () => {
    it('Realtime đo theo GIỜ BÁN HÀNG 8h00–21h30, không phải 0–24h', () => {
        // 14h45 = 405 phút sau 8h00, trên tổng 810 phút ⇒ đúng 50%
        expect(computeTimeProgress(true, new Date(2026, 8, 10, 14, 45, 0)).percentage).toBeCloseTo(50);
    });

    it('trước giờ mở cửa ⇒ 0%, sau giờ đóng ⇒ 100%', () => {
        expect(computeTimeProgress(true, new Date(2026, 8, 10, 6, 0, 0)).percentage).toBe(0);
        expect(computeTimeProgress(true, new Date(2026, 8, 10, 23, 0, 0)).percentage).toBe(100);
    });

    it('Luỹ kế đo theo ngày, KHÔNG tính ngày hôm nay (chưa xong)', () => {
        const r = computeTimeProgress(false, new Date(2026, 8, 10));
        expect(r.label).toBe('(10 / 30 ngày)');
        expect(r.percentage, '(10-1)/30').toBeCloseTo(30);
    });

    it('ngày mùng 1 ⇒ 0%, không âm', () => {
        expect(computeTimeProgress(false, new Date(2026, 8, 1)).percentage).toBe(0);
    });
});
