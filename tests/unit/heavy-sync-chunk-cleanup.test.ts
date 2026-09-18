/**
 * Mục 7 của bản sửa hạn mức Firestore: bỏ lượt ĐỌC ăn theo mỗi lần ghi khoá nặng.
 *
 * Trước bản sửa 2026-09-18, `syncHeavySettingToCloud()` gọi `getDocs(chunksRef)` sau MỖI lần ghi để
 * dọn chunk cũ/dư — kể cả khi dữ liệu không chunk và subcollection rỗng (query rỗng vẫn bị Firestore
 * tính tối thiểu 1 lượt đọc). Khoá nặng được ghi lại mỗi 2 giây có thay đổi, nên đây là lượt đọc ăn
 * theo từng lượt ghi. Xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore".
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface Ref { path: string }

const ops = { reads: 0, deletes: 0, setDocs: 0, batchCommits: 0 };
const resetOps = () => { ops.reads = 0; ops.deletes = 0; ops.setDocs = 0; ops.batchCommits = 0; };
const existingChunks = new Set<string>();

vi.mock('../../services/firebase', () => ({ db: { __isDb: true }, auth: { currentUser: null }, functions: {}, app: {} }));
vi.mock('../../services/dbService', () => ({
    getSetting: async () => null,
    touchLastModified: async () => undefined,
}));

vi.mock('firebase/firestore', () => {
    const join = (first: unknown, rest: string[]) => {
        const base = (first as Ref)?.path;
        return base ? `${base}/${rest.join('/')}` : rest.join('/');
    };
    return {
        doc: (first: unknown, ...rest: string[]): Ref => ({ path: join(first, rest) }),
        collection: (first: unknown, ...rest: string[]): Ref => ({ path: join(first, rest) }),
        getDoc: async () => ({ exists: () => false, data: () => undefined }),
        setDoc: async () => { ops.setDocs += 1; },
        getDocs: async (ref: Ref) => {
            const docs = [...existingChunks]
                .filter((p) => p.startsWith(`${ref.path}/`))
                .map((p) => ({ id: p.split('/').pop()!, ref: { path: p } }));
            ops.reads += Math.max(1, docs.length); // query rỗng vẫn tính tối thiểu 1 lượt đọc
            return { docs, empty: docs.length === 0 };
        },
        deleteDoc: async (ref: Ref) => { ops.deletes += 1; existingChunks.delete(ref.path); },
        writeBatch: () => {
            const queued: Array<() => void> = [];
            return {
                set: (ref: Ref) => { ops.setDocs += 1; queued.push(() => existingChunks.add(ref.path)); },
                delete: (ref: Ref) => { ops.deletes += 1; queued.push(() => existingChunks.delete(ref.path)); },
                commit: async () => { ops.batchCommits += 1; queued.forEach((f) => f()); },
            };
        },
        serverTimestamp: () => ({ __server: true }),
        Timestamp: { now: () => ({ toMillis: () => 1 }) },
    };
});

const { syncHeavySettingToCloud } = await import('../../services/firestoreService');
const user = { uid: 'uid_test' } as never;

/** Cho microtask của phần dọn chunk chạy nền kịp hoàn tất. */
const flush = () => new Promise((r) => setTimeout(r, 0));

const smallValue = { a: 1 };

describe('Mục 7 — ghi khoá nặng KHÔNG còn kèm lượt đọc', () => {
    beforeEach(() => { resetOps(); existingChunks.clear(); });

    it('lần ghi ĐẦU TIÊN của một khoá vẫn quét 1 lần (chưa biết trạng thái cũ — cố ý an toàn)', async () => {
        await syncHeavySettingToCloud(user, 'khoa_moi_1', smallValue);
        await flush();
        expect(ops.reads).toBe(1);
    });

    it('các lần ghi SAU: 0 lượt đọc (trước bản sửa: 1 lượt mỗi lần ghi)', async () => {
        await syncHeavySettingToCloud(user, 'khoa_moi_2', smallValue);
        await flush();
        resetOps();

        for (let i = 0; i < 10; i++) {
            await syncHeavySettingToCloud(user, 'khoa_moi_2', { a: i });
            await flush();
        }

        expect(ops.reads).toBe(0);      // trước bản sửa sẽ là 10
        expect(ops.setDocs).toBe(10);   // vẫn ghi đủ 10 lần, không bớt chức năng
        expect(ops.deletes).toBe(0);    // biết trước đó 0 chunk → không xoá gì
    });

    it('mỗi khoá có bộ nhớ riêng, không dùng lẫn của nhau', async () => {
        await syncHeavySettingToCloud(user, 'khoa_A', smallValue);
        await flush();
        resetOps();

        await syncHeavySettingToCloud(user, 'khoa_B', smallValue); // khoá khác → vẫn quét 1 lần
        await flush();
        expect(ops.reads).toBe(1);

        resetOps();
        await syncHeavySettingToCloud(user, 'khoa_A', smallValue); // đã biết → 0 lượt đọc
        await flush();
        expect(ops.reads).toBe(0);
    });

    it('dữ liệu LỚN phải chunk: lần ghi sau vẫn 0 lượt đọc và chunk được ghi đủ', async () => {
        // ~700.000 ký tự > CHUNK_CHAR_SIZE 300.000 → 3 chunk.
        const big = { blob: 'x'.repeat(700_000) };

        await syncHeavySettingToCloud(user, 'khoa_lon', big);
        await flush();
        const chunksAfterFirst = [...existingChunks].filter((p) => p.includes('/khoa_lon/chunks/')).length;
        expect(chunksAfterFirst).toBe(3);

        resetOps();
        await syncHeavySettingToCloud(user, 'khoa_lon', big);
        await flush();
        expect(ops.reads).toBe(0);
        expect([...existingChunks].filter((p) => p.includes('/khoa_lon/chunks/')).length).toBe(3);
    });

    it('dữ liệu co lại: xoá ĐÚNG phần chunk dư, không cần đọc, không để chunk mồ côi', async () => {
        await syncHeavySettingToCloud(user, 'khoa_co', { blob: 'x'.repeat(700_000) }); // 3 chunk
        await flush();
        resetOps();

        await syncHeavySettingToCloud(user, 'khoa_co', { blob: 'x'.repeat(310_000) }); // còn 2 chunk
        await flush();

        expect(ops.reads).toBe(0);
        expect(ops.deletes).toBe(1); // chỉ chunk_2
        expect([...existingChunks].filter((p) => p.includes('/khoa_co/chunks/')).length).toBe(2);
    });

    it('từ CHUNK về KHÔNG chunk: dọn sạch mọi chunk cũ mà không cần đọc', async () => {
        await syncHeavySettingToCloud(user, 'khoa_thu_nho', { blob: 'x'.repeat(700_000) }); // 3 chunk
        await flush();
        resetOps();

        await syncHeavySettingToCloud(user, 'khoa_thu_nho', smallValue); // nhỏ lại
        await flush();

        expect(ops.reads).toBe(0);
        expect(ops.deletes).toBe(3); // xoá đúng 3 chunk cũ — không để lại rác vĩnh viễn
        expect([...existingChunks].filter((p) => p.includes('/khoa_thu_nho/chunks/')).length).toBe(0);
    });
});
