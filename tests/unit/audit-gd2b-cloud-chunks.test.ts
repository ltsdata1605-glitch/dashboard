/**
 * Audit 2026-10-07 — GĐ2b (D03/D04). Chạy THẬT chunkData / uploadProcessedData / downloadProcessedData
 * (users/{uid}/salesData) trên Firestore giả trong bộ nhớ.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DataRow } from '../../types';

interface Ref { path: string; id: string }
const store = new Map<string, Record<string, unknown>>();

vi.mock('../../services/firebase', () => ({ db: { __isDb: true }, auth: { currentUser: null }, functions: {}, app: {} }));
vi.mock('firebase/firestore', () => {
    const join = (first: unknown, rest: string[]) => {
        const base = (first as Ref)?.path;
        return base ? [base, ...rest].join('/') : rest.join('/');
    };
    const mkRef = (path: string): Ref => ({ path, id: path.split('/').pop()! });
    return {
        doc: (first: unknown, ...rest: string[]) => mkRef(join(first, rest)),
        collection: (first: unknown, ...rest: string[]) => mkRef(join(first, rest)),
        getDoc: async (ref: Ref) => ({ exists: () => store.has(ref.path), data: () => store.get(ref.path) }),
        getDocs: async (ref: Ref) => {
            const docs = [...store.entries()]
                .filter(([p]) => p.startsWith(`${ref.path}/`) && !p.slice(ref.path.length + 1).includes('/'))
                .map(([p, d]) => ({ id: p.split('/').pop()!, ref: mkRef(p), data: () => d }));
            return { docs, empty: docs.length === 0 };
        },
        writeBatch: () => {
            const q: Array<() => void> = [];
            return {
                set: (ref: Ref, v: Record<string, unknown>) => q.push(() => store.set(ref.path, JSON.parse(JSON.stringify(v)))),
                delete: (ref: Ref) => q.push(() => store.delete(ref.path)),
                commit: async () => q.forEach((f) => f()),
            };
        },
        serverTimestamp: () => 'ts',
    };
});

const cloud = await import('../../services/cloudDataService');
const user = { uid: 'u1' } as never;
const viRow = (i: number): DataRow => ({ 'Tên sản phẩm': `Tủ lạnh Inverter ngăn đá dưới số ${i} — điều hoà Nhật Bản`.repeat(8), 'Doanh thu': i } as unknown as DataRow);

beforeEach(() => store.clear());

describe('D04 — chunk theo BYTE UTF-8', () => {
    it('mọi chunk tiếng Việt có dấu đều ≤ 800KB tính theo byte (dưới trần 1MiB của Firestore)', () => {
        const rows = Array.from({ length: 3000 }, (_, i) => viRow(i));
        const chunks = cloud.chunkData(rows);
        expect(chunks.length).toBeGreaterThan(1);
        for (const c of chunks) {
            expect(Buffer.byteLength(JSON.stringify(c), 'utf8')).toBeLessThanOrEqual(800 * 1024);
        }
        expect(chunks.flat()).toHaveLength(3000);
    });

    it('utf8ByteLength khớp Buffer.byteLength (cả emoji / cặp surrogate)', () => {
        for (const sAmple of ['abc', 'Điện Máy Xanh', '日本', 'Mã 🎁 PMH 😀', '']) {
            expect(cloud.utf8ByteLength(sAmple)).toBe(Buffer.byteLength(sAmple, 'utf8'));
        }
    });
});

describe('D03 — dữ liệu cá nhân trên cloud luôn toàn vẹn', () => {
    const data = Array.from({ length: 2500 }, (_, i) => viRow(i));

    it('tải lên rồi tải xuống đủ dòng; lần tải lên sau dọn hết chunk phiên bản cũ', async () => {
        await cloud.uploadProcessedData(user, data, 'a.xlsx', 1);
        await cloud.uploadProcessedData(user, data.slice(0, 10), 'b.xlsx', 2);
        const res = await cloud.downloadProcessedData(user);
        expect(res?.data).toHaveLength(10);
        const meta = store.get('users/u1/salesData/meta') as { rev: string };
        const chunkIds = [...store.keys()].filter((p) => p.startsWith('users/u1/salesData/') && !p.endsWith('/meta'));
        expect(chunkIds.every((p) => p.split('/').pop()!.startsWith(`${meta.rev}_`))).toBe(true);
    });

    it('thiếu 1 chunk → báo lỗi, KHÔNG trả về nửa dữ liệu như thành công', async () => {
        await cloud.uploadProcessedData(user, data, 'a.xlsx', 1);
        const chunk = [...store.keys()].find((p) => p.startsWith('users/u1/salesData/') && !p.endsWith('/meta'))!;
        store.delete(chunk);
        await expect(cloud.downloadProcessedData(user)).rejects.toThrow(/Thiếu/);
    });

    it('meta cũ (không rev) vẫn đọc được chunk_* kiểu cũ; số dòng lệch metadata → báo lỗi', async () => {
        store.set('users/u1/salesData/meta', { filename: 'x', savedAt: 1, fileLastModified: 1, totalRows: 3, chunkCount: 1, version: 1, uploadedFrom: 'laptop' });
        store.set('users/u1/salesData/chunk_0', { rows: [{ a: 1 }, { a: 2 }, { a: 3 }] });
        expect((await cloud.downloadProcessedData(user))?.data).toHaveLength(3);
        store.set('users/u1/salesData/chunk_0', { rows: [{ a: 1 }] });
        await expect(cloud.downloadProcessedData(user)).rejects.toThrow(/khác metadata/);
    });
});
