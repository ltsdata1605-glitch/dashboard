import { describe, it, expect } from 'vitest';
import { parseNumber } from '../utils/dashboardHelpers';
import {
    resolveDailyTarget,
    resolveRateTarget,
    computeHqqd,
    computeMonthlyTarget,
    computeMonthlyQdPercent,
    computeDtThucProgress,
    percentOf,
    ALL_STORES_KEY,
    type TargetOverrides,
} from './kpiOverviewCalc';

/**
 * Test cho logic 4 thẻ KPI màn Tổng quan (Đợt 1.2).
 *
 * Gồm 2 phần: đặc tả hành vi hiện tại, và PARITY — chạy song song công thức GỐC chép nguyên văn từ
 * `KpiOverview.tsx` (bản trước commit tách) trên dữ liệu ngẫu nhiên, bắt buộc giống hệt.
 */

describe('computeHqqd — hiệu quả quy đổi', () => {
    it('DTQĐ bằng đúng DT thực ⇒ 0%, KHÔNG phải 100%', () => {
        expect(computeHqqd(100, 100)).toBe(0);
    });

    it('DTQĐ gấp rưỡi DT thực ⇒ 50%', () => {
        expect(computeHqqd(100, 150)).toBe(50);
    });

    it('chưa có doanh thu thực ⇒ 0, không chia cho 0', () => {
        expect(computeHqqd(0, 500)).toBe(0);
        expect(Number.isFinite(computeHqqd(0, 500))).toBe(true);
    });
});

describe('resolveDailyTarget — thứ tự ưu tiên target', () => {
    const defaults = { A: 100, B: 200 };

    it('target tự đặt cho đúng siêu thị được ưu tiên', () => {
        expect(resolveDailyTarget('A', { A: 999 }, defaults, () => 0)).toBe(999);
    });

    it('target tự đặt = 0 coi như CHƯA đặt, quay về mặc định', () => {
        expect(resolveDailyTarget('A', { A: 0 }, defaults, () => 0)).toBe(100);
    });

    it('xem "Tổng": cộng mọi siêu thị, mỗi nơi vẫn ưu tiên giá trị tự đặt', () => {
        expect(resolveDailyTarget(ALL_STORES_KEY, { A: 500 }, defaults, () => 0), '500 + 200').toBe(700);
    });

    it('xem "Tổng" có target riêng cho "Tổng" thì dùng luôn, không cộng nữa', () => {
        expect(resolveDailyTarget(ALL_STORES_KEY, { Tổng: 1234, A: 500 }, defaults, () => 0)).toBe(1234);
    });

    it('siêu thị không có trong bảng ⇒ 0', () => {
        expect(resolveDailyTarget('KHONGCO', undefined, defaults, () => 0)).toBe(0);
    });

    it('xem "Tổng" mà KHÔNG có siêu thị nào ⇒ dùng nhánh dự phòng (khác nhau giữa DTQĐ và DT Thực)', () => {
        expect(resolveDailyTarget(ALL_STORES_KEY, undefined, {}, () => 777)).toBe(777);
    });
});

describe('computeMonthlyTarget', () => {
    it('chế độ Realtime ⇒ 0 (không dùng target tháng)', () => {
        expect(computeMonthlyTarget(true, 'A', { A: 500 })).toBe(0);
    });

    it('Luỹ kế, xem "Tổng" ⇒ cộng mọi siêu thị', () => {
        expect(computeMonthlyTarget(false, ALL_STORES_KEY, { A: 100, B: 250 })).toBe(350);
    });

    it('không có bảng target tháng ⇒ 0', () => {
        expect(computeMonthlyTarget(false, 'A', undefined)).toBe(0);
    });
});

describe('computeMonthlyQdPercent', () => {
    it('có target tháng ⇒ tính theo target', () => {
        expect(computeMonthlyQdPercent(50, 200, '99%')).toBe(25);
    });

    it('CHƯA có target tháng ⇒ dùng lại số hệ thống đã tính sẵn, không trả 0', () => {
        expect(computeMonthlyQdPercent(50, 0, '87%')).toBe(parseNumber('87%'));
    });
});

describe('computeDtThucProgress', () => {
    it('chưa có target ⇒ undefined (để giao diện ẨN thanh tiến độ, không vẽ 0%)', () => {
        expect(computeDtThucProgress(true, 100, 0, 0)).toBeUndefined();
    });

    it('Realtime dùng target NGÀY, Luỹ kế dùng target THÁNG', () => {
        expect(computeDtThucProgress(true, 50, 100, 999)).toBe(50);
        expect(computeDtThucProgress(false, 50, 999, 100)).toBe(50);
    });

    it('làm tròn LÊN (Math.ceil)', () => {
        expect(computeDtThucProgress(true, 1, 3, 0), '33,3% → 34%').toBe(34);
    });
});

describe('resolveRateTarget — HQQĐ / Trả chậm', () => {
    it('ưu tiên tự đặt > hệ thống > mặc định', () => {
        expect(resolveRateTarget('A', { A: 60 }, 50, 40)).toBe(60);
        expect(resolveRateTarget('A', undefined, 50, 40)).toBe(50);
        expect(resolveRateTarget('A', undefined, undefined, 40)).toBe(40);
    });

    it('KHÁC resolveDailyTarget: ở đây tự đặt = 0 VẪN được dùng (?? chứ không phải > 0)', () => {
        expect(resolveRateTarget('A', { A: 0 }, 50, 40), 'giữ đúng hành vi bản gốc').toBe(0);
    });
});

// ─────────── PARITY: bản gốc chép nguyên văn từ KpiOverview.tsx ───────────

function origTotalVuotTroi(activeSupermarket: string, customDTQDTargets: TargetOverrides, supermarketDailyTargets: Record<string, number>) {
    let totalVuotTroi = 0;
    if (activeSupermarket === 'Tổng') {
        if (customDTQDTargets && customDTQDTargets['Tổng'] !== undefined && customDTQDTargets['Tổng'] > 0) {
            totalVuotTroi = customDTQDTargets['Tổng'];
        } else {
            const storeKeys = Object.keys(supermarketDailyTargets);
            if (storeKeys.length > 0) {
                totalVuotTroi = storeKeys.reduce((acc, k) => acc + ((customDTQDTargets && customDTQDTargets[k]) ?? supermarketDailyTargets[k] ?? 0), 0);
            } else {
                totalVuotTroi = Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
            }
        }
    } else {
        if (customDTQDTargets && customDTQDTargets[activeSupermarket] !== undefined && customDTQDTargets[activeSupermarket] > 0) {
            totalVuotTroi = customDTQDTargets[activeSupermarket];
        } else {
            totalVuotTroi = supermarketDailyTargets[activeSupermarket] || 0;
        }
    }
    return totalVuotTroi;
}

function origTotalDTThuc(activeSupermarket: string, customDTThucTargets: TargetOverrides, supermarketDailyTargets: Record<string, number>, totalVuotTroi: number) {
    let totalDTThucDailyTarget = 0;
    if (activeSupermarket === 'Tổng') {
        if (customDTThucTargets && customDTThucTargets['Tổng'] !== undefined && customDTThucTargets['Tổng'] > 0) {
            totalDTThucDailyTarget = customDTThucTargets['Tổng'];
        } else {
            const storeKeys = Object.keys(supermarketDailyTargets);
            if (storeKeys.length > 0) {
                totalDTThucDailyTarget = storeKeys.reduce((acc, k) => acc + ((customDTThucTargets && customDTThucTargets[k]) ?? supermarketDailyTargets[k] ?? 0), 0);
            } else {
                totalDTThucDailyTarget = totalVuotTroi;
            }
        }
    } else {
        if (customDTThucTargets && customDTThucTargets[activeSupermarket] !== undefined && customDTThucTargets[activeSupermarket] > 0) {
            totalDTThucDailyTarget = customDTThucTargets[activeSupermarket];
        } else {
            totalDTThucDailyTarget = supermarketDailyTargets[activeSupermarket] || 0;
        }
    }
    return totalDTThucDailyTarget;
}

function origMonthly(isRealtime: boolean, activeSupermarket: string, supermarketMonthlyTargets: Record<string, number> | undefined) {
    let totalVuotTroiMonthly = 0;
    if (!isRealtime && supermarketMonthlyTargets) {
        totalVuotTroiMonthly = supermarketMonthlyTargets[activeSupermarket] || 0;
        if (activeSupermarket === 'Tổng') {
            totalVuotTroiMonthly = Object.values(supermarketMonthlyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
    }
    return totalVuotTroiMonthly;
}

function rng(seed: number) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildCase(seed: number) {
    const r = rng(seed);
    const nStores = Math.floor(r() * 5);           // 0..4 — CÓ ca không siêu thị nào
    const names = Array.from({ length: nStores }, (_, i) => `ST${i}`);
    const daily: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    names.forEach(n => {
        daily[n] = r() < 0.15 ? 0 : Math.floor(r() * 5000);
        monthly[n] = r() < 0.15 ? 0 : Math.floor(r() * 100000);
    });

    const mk = (): TargetOverrides => {
        if (r() < 0.25) return undefined;
        const o: Record<string, number> = {};
        [...names, 'Tổng'].forEach(n => { if (r() < 0.5) o[n] = r() < 0.2 ? 0 : Math.floor(r() * 8000); });
        return o;
    };

    const pool = [...names, 'Tổng', 'KHONGCO'];
    return {
        activeSupermarket: pool[Math.floor(r() * pool.length)],
        daily, monthly,
        customQd: mk(), customThuc: mk(),
        isRealtime: r() < 0.5,
        dtlk: Math.floor(r() * 50000),
        dtqd: Math.floor(r() * 80000),
        dtDuKienQD: Math.floor(r() * 90000),
        htRaw: `${Math.floor(r() * 200)}%`,
    };
}

describe('PARITY — bản tách phải cho kết quả GIỐNG HỆT bản gốc', () => {
    const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);

    it('totalVuotTroi (target DTQĐ)', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(
                resolveDailyTarget(c.activeSupermarket, c.customQd, c.daily,
                    () => Object.values(c.daily).reduce<number>((sum, v) => sum + Number(v), 0)),
                `seed ${s} / ${c.activeSupermarket}`
            ).toBe(origTotalVuotTroi(c.activeSupermarket, c.customQd, c.daily));
        }
    });

    it('totalDTThucDailyTarget (nhánh dự phòng KHÁC với DTQĐ)', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            const tvt = origTotalVuotTroi(c.activeSupermarket, c.customQd, c.daily);
            expect(
                resolveDailyTarget(c.activeSupermarket, c.customThuc, c.daily, () => tvt),
                `seed ${s} / ${c.activeSupermarket}`
            ).toBe(origTotalDTThuc(c.activeSupermarket, c.customThuc, c.daily, tvt));
        }
    });

    it('totalVuotTroiMonthly', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            expect(
                computeMonthlyTarget(c.isRealtime, c.activeSupermarket, c.monthly), `seed ${s}`
            ).toBe(origMonthly(c.isRealtime, c.activeSupermarket, c.monthly));
        }
    });

    it('hqqd / htTargetVuotTroi / htTargetVuotTroiMonthly', () => {
        for (const s of SEEDS) {
            const c = buildCase(s);
            const tvt = origTotalVuotTroi(c.activeSupermarket, c.customQd, c.daily);
            const tvtM = origMonthly(c.isRealtime, c.activeSupermarket, c.monthly);

            expect(computeHqqd(c.dtlk, c.dtqd), `hqqd seed ${s}`)
                .toBe(c.dtlk > 0 ? ((c.dtqd / c.dtlk) - 1) * 100 : 0);
            expect(percentOf(c.dtqd, tvt), `htTargetVuotTroi seed ${s}`)
                .toBe(tvt > 0 ? (c.dtqd / tvt) * 100 : 0);
            expect(computeMonthlyQdPercent(c.dtDuKienQD, tvtM, c.htRaw), `monthlyQd seed ${s}`)
                .toBe(tvtM > 0 ? (c.dtDuKienQD / tvtM) * 100 : parseNumber(c.htRaw));
        }
    });
});
