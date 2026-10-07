/**
 * Audit 2026-10-07 — GĐ3: đo số request Firestore ĐỒNG THỜI cao nhất khi tải 1 Kho có 24 ô tháng ×
 * 5 chunk (120 chunk). Trước: bắn cả 120 cùng lúc. Sau: tối đa FILE_CONCURRENCY × CHUNK_CONCURRENCY.
 */
import { describe, it, expect, vi } from 'vitest';
import { mapWithLimit } from '../../services/mapWithLimit';

interface Ref { path: string; id: string }
const store = new Map<string, Record<string, unknown>>();
let inFlight = 0, peak = 0;

vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {}, app: {} }));
vi.mock('../../services/dbService', () => ({ getSetting: async () => null, saveSetting: async () => undefined }));
vi.mock('firebase/firestore', () => {
    const join = (first: unknown, rest: string[]) => [(first as Ref)?.path, ...rest].filter(Boolean).join('/');
    const mkRef = (path: string): Ref => ({ path, id: path.split('/').pop()! });
    return {
        doc: (first: unknown, ...rest: string[]) => mkRef(join(first, rest)),
        collection: (first: unknown, ...rest: string[]) => mkRef(join(first, rest)),
        getDoc: async (ref: Ref) => {
            inFlight++; peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, 2));
            inFlight--;
            return { exists: () => store.has(ref.path), data: () => store.get(ref.path) };
        },
        getDocs: async (ref: Ref) => {
            const docs = [...store.entries()]
                .filter(([p]) => p.startsWith(`${ref.path}/`) && !p.slice(ref.path.length + 1).includes('/'))
                .map(([p, d]) => ({ id: p.split('/').pop()!, ref: mkRef(p), data: () => d }));
            return { docs, empty: docs.length === 0, forEach: (fn: (d: unknown) => void) => docs.forEach(fn) };
        },
        writeBatch: () => ({ set: () => undefined, delete: () => undefined, commit: async () => undefined }),
        updateDoc: async () => undefined, deleteDoc: async () => undefined, serverTimestamp: () => 'ts',
    };
});

const { fetchAllowedKhoData } = await import('../../services/khoDataService');

describe('Tải dữ liệu Kho — giới hạn request đồng thời', () => {
    it('24 tháng × 5 chunk: đủ 120 dòng, đỉnh đồng thời ≤ 12 (trước: 120)', async () => {
        for (let m = 1; m <= 24; m++) {
            const month = `20${25 + Math.floor((m - 1) / 12)}-${String(((m - 1) % 12) + 1).padStart(2, '0')}`;
            const id = `m_${month.replace('-', '')}_u1`;
            store.set(`khoData/910/salesFiles/${id}`, { uploadedByUid: 'u1', uploadedAt: m, fileLastModified: m, chunkCount: 5, isActive: true, month, rev: 'r1' });
            for (let c = 0; c < 5; c++) {
                store.set(`khoData/910/salesFiles/${id}/chunks/r1_${c}`, { rows: [{ parsedDate: `${month}-15T00:00:00.000Z`, v: c }] });
            }
        }
        const { data } = await fetchAllowedKhoData('910');
        console.log(`[đo] 120 chunk — đỉnh request đồng thời: ${peak}`);
        expect(data).toHaveLength(120);
        expect(peak).toBeLessThanOrEqual(12);
    });

    it('mapWithLimit giữ đúng thứ tự kết quả và không vượt giới hạn', async () => {
        let live = 0, max = 0;
        const out = await mapWithLimit([5, 1, 4, 2, 3], 2, async (n) => {
            live++; max = Math.max(max, live);
            await new Promise((r) => setTimeout(r, n));
            live--;
            return n * 10;
        });
        expect(out).toEqual([50, 10, 40, 20, 30]);
        expect(max).toBe(2);
    });
});
