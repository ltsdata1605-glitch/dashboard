import { beforeAll, describe, expect, it, vi } from 'vitest';

// services/analytics.worker.ts gắn self.onmessage lúc import → dựng `self` giả, bắt message trả về.
const gui: { type: string; payload: { generation: number; uniqueFilterOptions?: { kho: string[] } } }[] = [];
let onmessage: (e: { data: unknown }) => void;

vi.mock('../../services/filterService', () => ({ applyFiltersAndProcess: vi.fn() }));
vi.mock('../../utils/dataUtils', () => ({
    computeRbacFilteredData: (rows: unknown[]) => rows,
    // Trả lại đủ để kiểm: số dòng + kho duy nhất theo đúng thứ tự
    computeUniqueFilterOptions: (rows: { kho: string }[]) => ({ kho: [String(rows.length), ...new Set(rows.map(r => r.kho))] }),
    computeUnconfiguredGroups: () => [],
}));

beforeAll(async () => {
    const self = { postMessage: (m: (typeof gui)[number]) => gui.push(m), onmessage: null as unknown };
    (globalThis as unknown as { self: typeof self }).self = self;
    await import('../../services/analytics.worker');
    onmessage = self.onmessage as typeof onmessage;
});

const dong = (n: number, kho: string) => Array.from({ length: n }, () => ({ kho }));
const setData = (generation: number, extra: object) =>
    onmessage({ data: { type: 'SET_DATA', payload: { generation, rbacParams: {}, productConfig: null, departmentMap: null, ...extra } } });

describe('analytics worker — SET_DATA gửi theo khúc', () => {
    it('ghép đủ các khúc theo đúng thứ tự rồi mới xử lý', () => {
        gui.length = 0;
        onmessage({ data: { type: 'SET_DATA_CHUNK', payload: { generation: 1, rows: dong(3, 'A') } } });
        onmessage({ data: { type: 'SET_DATA_CHUNK', payload: { generation: 1, rows: dong(2, 'B') } } });
        expect(gui).toEqual([]); // khúc chưa đủ → chưa trả lời
        setData(1, { chunked: true });
        expect(gui).toHaveLength(1);
        expect(gui[0].type).toBe('SET_DATA_SUCCESS');
        expect(gui[0].payload.uniqueFilterOptions?.kho).toEqual(['5', 'A', 'B']);
    });

    it('generation mới đến giữa chừng → bỏ khúc dở của generation cũ', () => {
        gui.length = 0;
        onmessage({ data: { type: 'SET_DATA_CHUNK', payload: { generation: 2, rows: dong(4, 'CU') } } });
        onmessage({ data: { type: 'SET_DATA_CHUNK', payload: { generation: 3, rows: dong(1, 'MOI') } } });
        setData(3, { chunked: true });
        expect(gui[0].payload.generation).toBe(3);
        expect(gui[0].payload.uniqueFilterOptions?.kho).toEqual(['1', 'MOI']);
    });

    it('dữ liệu nhỏ vẫn đi 1 message như cũ', () => {
        gui.length = 0;
        setData(4, { originalData: dong(2, 'X') });
        expect(gui[0].payload.uniqueFilterOptions?.kho).toEqual(['2', 'X']);
    });
});
