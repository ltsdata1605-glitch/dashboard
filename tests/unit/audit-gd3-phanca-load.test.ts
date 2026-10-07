import { describe, expect, it } from 'vitest';
import { loadPhanCaScope } from '../../features/phan-ca/hooks/loadPhanCaScope';

/**
 * Audit 2026-10-07 — GĐ3: đo thời gian nạp 1 phạm vi Phân ca với độ trễ mạng giả 150ms/khoá
 * (4G siêu thị). Cách cũ: 10 lượt tuần tự. Cách mới: song song.
 */
const LATENCY = 150;
const store: Record<string, unknown> = { 'ST::nams': [{ name: 'A', department: 'BP' }], 'ST::schedule-2026-10': [{ id: 's1' }] };
const slowLoad = <T,>(key: string, def: T): Promise<T> =>
    new Promise((r) => setTimeout(() => r((store[key] as T) ?? def), LATENCY));
const getKey = (k: string) => `ST::${k}`;
const defaults = { rules: { gh: {}, kho: {}, tn: {} } as never, dailyRequirements: {} as never, shiftDefinitions: {} as never };

describe('Phân ca — nạp phạm vi song song', () => {
    it('chờ ~1 vòng mạng thay vì 10; dữ liệu nạp ra giống hệt', async () => {
        const keys = ['nams', 'nus', 'rules', 'departmentPatterns', 'dailyRequirements', 'shiftDefinitions',
            'schedule-2026-10', 'history-2026-10', 'unresolved-2026-10', 'busySchedule-2026-10'];
        const t0 = performance.now();
        for (const k of keys) await slowLoad(getKey(k), null); // cách CŨ: tuần tự
        const sequentialMs = performance.now() - t0;

        const t1 = performance.now();
        const res = await loadPhanCaScope(slowLoad, getKey, '2026-10', defaults);
        const parallelMs = performance.now() - t1;

        console.log(`[đo] tuần tự ${Math.round(sequentialMs)}ms → song song ${Math.round(parallelMs)}ms (trễ giả ${LATENCY}ms/khoá)`);
        expect(parallelMs).toBeLessThan(LATENCY * 2);
        expect(sequentialMs).toBeGreaterThan(LATENCY * 9);
        expect(res.nams).toEqual([{ name: 'A', department: 'BP' }]);
        expect(res.schedule).toEqual([{ id: 's1' }]);
        expect(res.busySchedule).toEqual({});
        expect(res.keys.scheduleKey).toBe('ST::schedule-2026-10');
    });
});
