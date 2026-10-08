/**
 * Audit D11 (2026-10-08) — hàng chờ gửi lại lịch sử Thuế lên cloud. Chạy THẬT taxSyncService trên IndexedDB
 * giả + Firestore giả có công tắc "mất mạng" (runTransaction/getDoc ném lỗi như Firestore thật khi offline).
 * Trước: lưu/xoá/đổi tháng lúc mất mạng là mất hẳn phần cloud; mở lại thì bản CLOUD đè lại máy (bản đã xoá
 * hiện về, tháng vừa sửa quay về cũ).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SavedTaxRecord } from '../../features/tax-calculator/types/tax.types';

let local: SavedTaxRecord[] = [];
let nextId = 1;
let cloud: SavedTaxRecord[] = [];
let matMang = false;
const ls = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string, v: string) => { ls.set(k, v); },
    removeItem: (k: string) => { ls.delete(k); }, clear: () => ls.clear(), key: () => null, length: 0,
};
const offline = () => { if (matMang) throw new Error('Failed to get document because the client is offline.'); };

vi.mock('react-hot-toast', () => ({ default: Object.assign(() => undefined, { error: () => undefined }) }));
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1' } } }));
vi.mock('firebase/firestore', () => ({
    doc: () => ({}),
    serverTimestamp: () => 'ts',
    getDoc: async () => { offline(); return { exists: () => true, data: () => ({ records: cloud }) }; },
    setDoc: async (_r: unknown, v: { records: SavedTaxRecord[] }) => { offline(); cloud = v.records; },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
        offline();
        return fn({
            get: async () => ({ exists: () => true, data: () => ({ records: cloud }) }),
            set: (_r: unknown, v: { records: SavedTaxRecord[] }) => { cloud = JSON.parse(JSON.stringify(v.records)); },
        });
    },
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

const { taxSyncService, docHangCho } = await import('../../features/tax-calculator/services/taxSyncService');
const rec = (createdAt: string, monthYear: string, id: number) => ({ id, createdAt, monthYear, fullName: createdAt } as unknown as SavedTaxRecord);
const A = '2026-09-01T00:00:00.000Z';

beforeEach(() => {
    local = [rec(A, '08/2026', 1)];
    nextId = 2;
    cloud = [rec(A, '08/2026', 1)];
    matMang = false;
    ls.clear();
});

describe('D11 — hàng chờ cloud lịch sử Thuế', () => {
    it('lưu lúc mất mạng: báo "pending", có mạng lại thì lần mở sau tự đẩy lên cloud', async () => {
        matMang = true;
        const r = await taxSyncService.saveRecord({ createdAt: '2026-10-01T00:00:00.000Z', monthYear: '09/2026' } as Omit<SavedTaxRecord, 'id'>);
        expect(r.cloud).toBe('pending');
        expect(cloud).toHaveLength(1);
        expect(docHangCho('u1').upsert).toEqual(['2026-10-01T00:00:00.000Z']);
        matMang = false;
        await taxSyncService.getAllRecords();
        expect(cloud.map((x) => x.createdAt).sort()).toEqual([A, '2026-10-01T00:00:00.000Z']);
        expect(docHangCho('u1').upsert).toEqual([]);
    });

    it('xoá lúc mất mạng: mở lại KHÔNG kéo bản đã xoá về; có mạng thì xoá luôn trên cloud', async () => {
        matMang = true;
        await taxSyncService.deleteRecord(1, A);
        expect(local).toHaveLength(0);
        // Mở lại khi vẫn mất mạng → bản cloud không đọc được, không hiện lại
        expect(await taxSyncService.getAllRecords()).toHaveLength(0);
        matMang = false;
        const list = await taxSyncService.getAllRecords();
        expect(list).toHaveLength(0);
        expect(local).toHaveLength(0);
        expect(cloud).toHaveLength(0);
    });

    it('đổi tháng lúc mất mạng: mở lại giữ tháng MỚI (không bị bản cloud đè), rồi đẩy tháng mới lên cloud', async () => {
        matMang = true;
        await taxSyncService.updateRecordMonth(1, '09/2026');
        matMang = false;
        const list = await taxSyncService.getAllRecords();
        expect(list.find((x) => x.createdAt === A)!.monthYear).toBe('09/2026');
        expect(cloud.find((x) => x.createdAt === A)!.monthYear).toBe('09/2026');
    });

});
