import { beforeEach, describe, expect, it, vi } from 'vitest';

// Audit A31: 2 lượt lưu chen nhau không được làm mất bản ghi trên cloud.
// Firestore giả: 1 document trong bộ nhớ; getDoc trả ẢNH CHỤP (như thật), runTransaction chạy tuần tự
// (Firestore thật chạy lại transaction khi có ghi chen — kết quả tương đương tuần tự).
const store: { data: { records: { createdAt: string }[] } | null } = { data: null };
const snap = () => { const d = store.data ? JSON.parse(JSON.stringify(store.data)) : null; return { exists: () => !!d, data: () => d }; };
const tick = () => new Promise(r => setTimeout(r, 5));
let khoa: Promise<unknown> = Promise.resolve();

vi.mock('firebase/firestore', () => ({
    doc: () => ({}),
    serverTimestamp: () => 'ts',
    getDoc: async () => { const s = snap(); await tick(); return s; },
    setDoc: async (_r: unknown, v: { records: { createdAt: string }[] }) => { await tick(); store.data = { records: v.records }; },
    runTransaction: (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
        const chay = khoa.then(async () => {
            let ghi: { records: { createdAt: string }[] } | null = null;
            await fn({ get: async () => { await tick(); return snap(); }, set: (_r: unknown, v: typeof ghi) => { ghi = v; } });
            if (ghi) store.data = { records: (ghi as { records: { createdAt: string }[] }).records };
        });
        khoa = chay.catch(() => {});
        return chay;
    },
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn() }) }));
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1' } } }));
let nextId = 1;
vi.mock('../../features/tax-calculator/services/taxIndexedDbService', () => ({
    taxIndexedDbService: { save: async () => nextId++, delete: async () => {}, updateMonth: async () => {}, updateMonths: async () => {} },
}));

const { taxSyncService } = await import('../../features/tax-calculator/services/taxSyncService');
const rec = (createdAt: string) => ({ createdAt } as unknown as Parameters<typeof taxSyncService.saveRecord>[0]);

describe('taxSyncService — đọc-sửa-ghi trong transaction', () => {
    beforeEach(() => { store.data = { records: [{ createdAt: 'cu' }] }; });

    it('2 lượt lưu cùng lúc → cả 2 bản ghi đều lên cloud', async () => {
        await Promise.all([taxSyncService.saveRecord(rec('a')), taxSyncService.saveRecord(rec('b'))]);
        expect(store.data!.records.map(r => r.createdAt).sort()).toEqual(['a', 'b', 'cu']);
    });

    it('lưu và xoá chen nhau → không hồi sinh bản đã xoá, không mất bản mới', async () => {
        await Promise.all([taxSyncService.saveRecord(rec('moi')), taxSyncService.deleteRecord(99, 'cu')]);
        expect(store.data!.records.map(r => r.createdAt)).toEqual(['moi']);
    });

    it('không còn trần 100 bản: 150 bản giữ đủ trên cloud', async () => {
        store.data = { records: Array.from({ length: 149 }, (_, i) => ({ createdAt: `cu-${i}` })) };
        await taxSyncService.saveRecord(rec('moi'));
        expect(store.data!.records).toHaveLength(150);
        expect(store.data!.records[0].createdAt).toBe('moi');
    });

    it('lịch sử chạm giới hạn 1 MB của document: bỏ bớt bản CŨ NHẤT khỏi cloud, giữ bản mới', async () => {
        const dai = 'x'.repeat(2000);
        store.data = { records: Array.from({ length: 600 }, (_, i) => ({ createdAt: `cu-${i}`, ghiChu: dai } as { createdAt: string })) };
        await taxSyncService.saveRecord(rec('moi'));
        const r = store.data!.records;
        expect(r[0].createdAt).toBe('moi');
        expect(r.length).toBeLessThan(601);
        expect(JSON.stringify(r).length * 1.5).toBeLessThanOrEqual(900_000);
        expect(r[r.length - 1].createdAt).toBe(`cu-${r.length - 2}`); // cắt ở phía cũ nhất
    });
});
