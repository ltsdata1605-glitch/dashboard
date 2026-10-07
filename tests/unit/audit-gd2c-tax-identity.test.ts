/**
 * Audit 2026-10-07 — D08. Máy A và máy B đều có bản ghi Thuế id=1 (khoá tự tăng IndexedDB của từng máy)
 * nhưng là 2 bản ghi KHÁC NHAU. Chạy THẬT taxSyncService trên IndexedDB giả + Firestore giả.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SavedTaxRecord } from '../../features/tax-calculator/types/tax.types';

let local: SavedTaxRecord[] = [];
let nextId = 1;
let cloud: SavedTaxRecord[] = [];

vi.mock('react-hot-toast', () => ({ default: Object.assign(() => undefined, { error: () => undefined }) }));
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1' } } }));
vi.mock('firebase/firestore', () => ({
    doc: () => ({}),
    serverTimestamp: () => 'ts',
    getDoc: async () => ({ exists: () => true, data: () => ({ records: cloud }) }),
    setDoc: async (_r: unknown, v: { records: SavedTaxRecord[] }) => { cloud = v.records; },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) => fn({
        get: async () => ({ exists: () => true, data: () => ({ records: cloud }) }),
        set: (_r: unknown, v: { records: SavedTaxRecord[] }) => { cloud = JSON.parse(JSON.stringify(v.records)); },
    }),
}));
vi.mock('../../features/tax-calculator/services/taxIndexedDbService', () => ({
    taxIndexedDbService: {
        getAll: async () => local.map((r) => ({ ...r })),
        save: async (r: Omit<SavedTaxRecord, 'id'>) => { const id = nextId++; local.push({ ...r, id } as SavedTaxRecord); return id; },
        delete: async (id: number) => { local = local.filter((r) => r.id !== id); },
        updateMonth: async (k: number | string, m: string) => { local = local.map((r) => (r.id === k || r.createdAt === k ? { ...r, monthYear: m } : r)); },
        updateMonths: async () => undefined,
        clearAll: async () => { local = []; },
    },
}));

const { taxSyncService } = await import('../../features/tax-calculator/services/taxSyncService');
const rec = (createdAt: string, monthYear: string, id: number) => ({ id, createdAt, monthYear, fullName: createdAt } as unknown as SavedTaxRecord);

beforeEach(() => {
    // Máy này: 1 bản id=1 (tạo lúc A). Cloud: bản của máy này + bản máy KHÁC cũng mang id=1 (tạo lúc B).
    local = [rec('2026-09-01T00:00:00.000Z', '08/2026', 1)];
    nextId = 2;
    cloud = [rec('2026-09-01T00:00:00.000Z', '08/2026', 1), rec('2026-09-05T00:00:00.000Z', '08/2026', 1)];
});

describe('D08 — ID lịch sử Thuế duy nhất xuyên thiết bị', () => {
    it('danh sách hợp nhất không có 2 dòng trùng id; bản của máy khác được lưu vào máy này', async () => {
        const list = await taxSyncService.getAllRecords();
        expect(list).toHaveLength(2);
        expect(new Set(list.map((r) => r.id)).size).toBe(2);
        expect(local).toHaveLength(2);
    });

    it('đổi kỳ lương bản id=1 của máy này KHÔNG đổi bản của máy khác trên cloud', async () => {
        await taxSyncService.getAllRecords();
        await taxSyncService.updateRecordMonth(1, '09/2026');
        const mine = cloud.find((r) => r.createdAt === '2026-09-01T00:00:00.000Z')!;
        const other = cloud.find((r) => r.createdAt === '2026-09-05T00:00:00.000Z')!;
        expect(mine.monthYear).toBe('09/2026');
        expect(other.monthYear).toBe('08/2026');
    });

    it('xoá bản của máy khác (sau khi hợp nhất) chỉ xoá đúng bản đó', async () => {
        const list = await taxSyncService.getAllRecords();
        const other = list.find((r) => r.createdAt === '2026-09-05T00:00:00.000Z')!;
        await taxSyncService.deleteRecord(other.id as number, other.createdAt);
        expect(cloud.map((r) => r.createdAt)).toEqual(['2026-09-01T00:00:00.000Z']);
        expect(local.map((r) => r.createdAt)).toEqual(['2026-09-01T00:00:00.000Z']);
    });
});
