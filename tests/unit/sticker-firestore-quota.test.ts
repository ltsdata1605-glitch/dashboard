/**
 * Đếm CHÍNH XÁC số lượt đọc/ghi/xoá Firestore mà features/sticker-event/services/firebaseService.ts
 * phát ra — "lưới an toàn" cho bản sửa hạn mức 2026-09-17 (implementation_plan.md mục "Audit hạn
 * mức đọc/ghi Firestore"). Gói Spark chỉ cho 50.000 đọc / 20.000 ghi / 20.000 xoá mỗi ngày, dùng
 * CHUNG cho cả project dashboa-7e20b, nên số lượt thao tác ở đây là hành vi cần khoá lại bằng test
 * chứ không phải chi tiết nội bộ.
 *
 * Mock toàn bộ firebase/firestore bằng một "Firestore giả" có lưu trạng thái, để hàm thật chạy
 * nguyên vẹn (kể cả readPreviousChunkCount đọc lại metadata do chính lượt ghi trước tạo ra).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface Ref { path: string }

const store = new Map<string, Record<string, unknown>>();
const ops = { reads: 0, writes: 0, deletes: 0, batchCommits: 0 };

const DB = { __isDb: true } as const;
const isDb = (x: unknown): boolean => !!x && (x as { __isDb?: boolean }).__isDb === true;
let autoId = 0;

const joinPath = (first: unknown, rest: string[]): string =>
    isDb(first) ? rest.join('/') : `${(first as Ref).path}/${rest.join('/')}`;

vi.mock('../../features/sticker-event/firebase', () => ({
    db: { __isDb: true },
    auth: { currentUser: { uid: 'uid_test' } },
    functions: {},
}));

// firebaseService.ts import adminUserService.ts, file này gọi httpsCallable() ngay lúc nạp module.
vi.mock('firebase/functions', () => ({
    httpsCallable: () => async () => ({ data: { success: true } }),
    getFunctions: () => ({}),
}));

vi.mock('firebase/firestore', () => ({
    collection: (first: unknown, ...rest: string[]): Ref => ({ path: joinPath(first, rest) }),
    doc: (first: unknown, ...rest: string[]): Ref =>
        rest.length > 0
            ? { path: joinPath(first, rest) }
            : { path: `${(first as Ref).path}/auto_${++autoId}` },
    getDoc: async (ref: Ref) => {
        ops.reads += 1;
        const data = store.get(ref.path);
        return { exists: () => data !== undefined, data: () => data, ref };
    },
    getDocs: async (ref: Ref) => {
        const docs = [...store.entries()]
            .filter(([path]) => path.startsWith(`${ref.path}/`) && path.slice(ref.path.length + 1).indexOf('/') === -1)
            .map(([path, data]) => ({ id: path.split('/').pop()!, data: () => data, ref: { path } }));
        ops.reads += Math.max(1, docs.length); // query rỗng vẫn tính tối thiểu 1 lượt đọc
        return { docs, empty: docs.length === 0, size: docs.length };
    },
    setDoc: async (ref: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) => {
        ops.writes += 1;
        store.set(ref.path, options?.merge ? { ...(store.get(ref.path) ?? {}), ...data } : data);
    },
    deleteDoc: async (ref: Ref) => { ops.deletes += 1; store.delete(ref.path); },
    writeBatch: () => {
        const queued: Array<() => void> = [];
        return {
            delete: (ref: Ref) => { ops.deletes += 1; queued.push(() => store.delete(ref.path)); },
            set: (ref: Ref, data: Record<string, unknown>) => { ops.writes += 1; queued.push(() => store.set(ref.path, data)); },
            commit: async () => { ops.batchCommits += 1; queued.forEach(fn => fn()); },
        };
    },
    Timestamp: { now: () => ({ toMillis: () => 1_700_000_000_000 }) },
    serverTimestamp: () => ({ __server: true }),
    query: (ref: Ref) => ref,
    where: () => ({}),
    limit: () => ({}),
}));

const {
    uploadInventoryToFirestore,
    clearStoreDataOnFirestore,
    fetchSavedListsFromFirestore,
    fetchSavedListItems,
    saveListToFirestore,
    invalidateSavedListsCache,
    fetchManualProducts,
    saveManualProduct,
    deleteManualProduct,
} = await import('../../features/sticker-event/services/firebaseService');

const STORE_ID = 'TESTQUOTA';
const INV_CHUNKS = `stores/${STORE_ID}/inventoryChunks`;

const makeInventory = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        maSanPham: `PRD${i}`,
        tenSanPham: `Sản phẩm ${i}`,
        tongSoLuong: i,
    })) as never[];

const resetOps = () => { ops.reads = 0; ops.writes = 0; ops.deletes = 0; ops.batchCommits = 0; };

const countStoredChunks = () =>
    [...store.keys()].filter(p => p.startsWith(`${INV_CHUNKS}/chunk_`)).length;

describe('Hạn mức Firestore — upload tồn kho (3000 dòng, CHUNK_SIZE 300 → 10 chunk)', () => {
    beforeEach(() => { store.clear(); resetOps(); autoId = 0; });

    it('lần upload ĐẦU TIÊN trên dữ liệu cũ (metadata chưa có chunkCount): dọn rộng ĐÚNG 1 LẦN', async () => {
        // Giả lập dữ liệu legacy: 10 chunk đã có sẵn, metadata KHÔNG có field chunkCount.
        for (let i = 0; i < 10; i++) store.set(`${INV_CHUNKS}/chunk_${i}`, { items: '[]', count: 300 });
        store.set(`stores/${STORE_ID}/metadata/inventory`, { lastUpdated: 1, totalItems: 3000 });
        resetOps();

        await uploadInventoryToFirestore(STORE_ID, makeInventory(3000));

        expect(ops.reads).toBe(1);                       // 1 getDoc metadata
        expect(ops.writes).toBe(10 + 2);                 // 10 chunk + metadata/inventory + metadata/sync
        expect(ops.deletes).toBe(40);                    // dọn legacy chunk_10..chunk_49, chỉ 1 lần duy nhất
        expect(store.get(`stores/${STORE_ID}/metadata/inventory`)).toMatchObject({ chunkCount: 10 });
    });

    it('upload LẠI cùng cỡ dữ liệu: 0 lệnh xoá (trước bản sửa là 100)', async () => {
        await uploadInventoryToFirestore(STORE_ID, makeInventory(3000)); // lần 1 — tạo chunkCount
        resetOps();

        await uploadInventoryToFirestore(STORE_ID, makeInventory(3000)); // lần 2 — trạng thái ổn định

        expect(ops.deletes).toBe(0);
        expect(ops.reads).toBe(1);
        expect(ops.writes).toBe(12);
        expect(countStoredChunks()).toBe(10);
    });

    it('upload dữ liệu NHỎ HƠN: chỉ xoá đúng phần chunk dư, không xoá mù 50', async () => {
        await uploadInventoryToFirestore(STORE_ID, makeInventory(3000)); // 10 chunk
        resetOps();

        await uploadInventoryToFirestore(STORE_ID, makeInventory(600));  // 2 chunk

        expect(ops.deletes).toBe(8);                     // chunk_2..chunk_9
        expect(countStoredChunks()).toBe(2);             // không còn chunk mồ côi
        expect(store.get(`stores/${STORE_ID}/metadata/inventory`)).toMatchObject({ chunkCount: 2 });
    });

    it('upload dữ liệu RỖNG: xoá hết chunk, không ghi chunk nào', async () => {
        await uploadInventoryToFirestore(STORE_ID, makeInventory(600));  // 2 chunk
        resetOps();

        await uploadInventoryToFirestore(STORE_ID, makeInventory(0));

        expect(ops.deletes).toBe(2);
        expect(countStoredChunks()).toBe(0);
    });
});

describe('Hạn mức Firestore — clearStoreDataOnFirestore', () => {
    beforeEach(() => { store.clear(); resetOps(); autoId = 0; });

    it('xoá đúng tên collection THẬT và đúng số chunk đã ghi', async () => {
        await uploadInventoryToFirestore(STORE_ID, makeInventory(3000)); // 10 chunk
        resetOps();

        await clearStoreDataOnFirestore(STORE_ID, 'inventoryChunks');

        expect(ops.deletes).toBe(10);                    // không phải 50
        expect(countStoredChunks()).toBe(0);             // ĐÃ xoá thật — bug cũ để nguyên chunk trên cloud
        expect(store.get(`stores/${STORE_ID}/metadata/inventory`)).toMatchObject({ chunkCount: 0, totalItems: 0 });
    });

    it('gọi lần thứ 2 khi đã sạch: 0 lệnh xoá', async () => {
        await uploadInventoryToFirestore(STORE_ID, makeInventory(3000));
        await clearStoreDataOnFirestore(STORE_ID, 'inventoryChunks');
        resetOps();

        await clearStoreDataOnFirestore(STORE_ID, 'inventoryChunks');

        expect(ops.deletes).toBe(0);
        expect(ops.batchCommits).toBe(0);                // không gửi request nào lên mạng
    });
});


describe('Hạn mức Firestore — liệt kê "DS đã lưu" (nguồn tốn lượt ĐỌC lớn nhất)', () => {
    const LISTS = `stores/${STORE_ID}/savedLists`;

    /** 2 danh sách nhỏ (items nằm ngay trên doc cha) + 1 danh sách lớn đã chunk thành 5 chunk. */
    const seedLists = () => {
        for (const id of ['small_1', 'small_2']) {
            store.set(`${LISTS}/${id}`, {
                id, name: `DS ${id}`, userId: 'nv1', authUid: 'uid_test', storeId: STORE_ID,
                createdAt: '2026-09-01T00:00:00.000Z', totalItems: 2,
                items: JSON.stringify([{ msp: 'A' }, { msp: 'B' }]),
            });
        }
        store.set(`${LISTS}/big_1`, {
            id: 'big_1', name: 'DS lớn', userId: 'nv1', authUid: 'uid_test', storeId: STORE_ID,
            createdAt: '2026-09-02T00:00:00.000Z', totalItems: 15000, itemsChunked: true,
        });
        for (let i = 0; i < 5; i++) {
            store.set(`${LISTS}/big_1/itemChunks/chunk_${i}`, { items: JSON.stringify([{ msp: `C${i}` }]), count: 1 });
        }
    };

    beforeEach(() => { store.clear(); resetOps(); autoId = 0; invalidateSavedListsCache(); seedLists(); });

    it('liệt kê KHÔNG đọc subcollection itemChunks nữa', async () => {
        resetOps();
        const lists = await fetchSavedListsFromFirestore(STORE_ID);

        // 3 doc ở store của user + 1 lượt tối thiểu cho query store 'SUPERADMIN' (rỗng) = 4.
        // Trước bản sửa còn cộng thêm 5 lượt đọc chunk của danh sách lớn.
        expect(ops.reads).toBe(4);
        expect(lists).toHaveLength(3);

        // Danh sách nhỏ vẫn có items ngay (field nằm trên doc cha — miễn phí).
        expect(lists.find(l => l.id === 'small_1')!.items).toHaveLength(2);
        // Danh sách lớn: items rỗng + cờ itemsChunked để nơi gọi tự tải khi cần.
        const big = lists.find(l => l.id === 'big_1')!;
        expect(big.items).toEqual([]);
        expect(big.itemsChunked).toBe(true);
        expect(big.totalItems).toBe(15000);   // vẫn hiện đúng số lượng trên màn hình liệt kê
    });

    it('mở lại panel trong 10 phút: 0 lượt đọc (cache phiên)', async () => {
        await fetchSavedListsFromFirestore(STORE_ID);
        resetOps();

        const again = await fetchSavedListsFromFirestore(STORE_ID);

        expect(ops.reads).toBe(0);
        expect(again).toHaveLength(3);
    });

    it('cache không bị nơi gọi làm bẩn (trả về bản copy)', async () => {
        const first = await fetchSavedListsFromFirestore(STORE_ID);
        first.length = 0;                                  // nơi gọi sort/filter tại chỗ
        const second = await fetchSavedListsFromFirestore(STORE_ID);
        expect(second).toHaveLength(3);
    });

    it('lưu danh sách mới làm mới cache ngay, không phải chờ TTL', async () => {
        await fetchSavedListsFromFirestore(STORE_ID);
        await saveListToFirestore(STORE_ID, 'nv1', 'DS vừa lưu', [{ msp: 'Z' }]);
        resetOps();

        const after = await fetchSavedListsFromFirestore(STORE_ID);

        expect(ops.reads).toBeGreaterThan(0);              // đã đọc lại thật
        expect(after).toHaveLength(4);
        expect(after.some(l => l.name === 'DS vừa lưu')).toBe(true);
    });

    it('mở panel 10 lần liên tiếp: 4 lượt đọc (đo baseline bản cũ trên CÙNG dữ liệu: 90)', async () => {
        resetOps();
        for (let i = 0; i < 10; i++) await fetchSavedListsFromFirestore(STORE_ID);
        expect(ops.reads).toBe(4);
    });

    it('forceRefresh bỏ qua cache', async () => {
        await fetchSavedListsFromFirestore(STORE_ID);
        resetOps();
        await fetchSavedListsFromFirestore(STORE_ID, undefined, { forceRefresh: true });
        expect(ops.reads).toBe(4);
    });

    it('fetchSavedListItems chỉ đọc chunk của ĐÚNG danh sách được mở', async () => {
        resetOps();
        const items = await fetchSavedListItems(STORE_ID, 'big_1');

        expect(items).toHaveLength(5);                     // 5 chunk × 1 item
        expect(ops.reads).toBe(1 + 5);                     // 1 doc cha + 5 chunk, không đọc DS khác
    });

    it('fetchSavedListItems trên danh sách KHÔNG chunk: chỉ 1 lượt đọc', async () => {
        resetOps();
        const items = await fetchSavedListItems(STORE_ID, 'small_1');
        expect(items).toHaveLength(2);
        expect(ops.reads).toBe(1);
    });
});


describe('Hạn mức Firestore — sản phẩm nhập tay (smart-sync, mục 5)', () => {
    const MANUAL = `stores/${STORE_ID}/manualProducts`;
    const SYNC_META = `stores/${STORE_ID}/metadata/sync`;

    const makeManualDoc = (i: number) => ({
        id: `m${i}`, sanPham: `SP ${i}`, msp: `MSP${i}`, giaGoc: '10000', giaGiam: '9000',
        thuongERP: 0, thuongNong: 0, tongThuong: 0, khuyenMai: '', ngayIn: '',
        createdBy: 'nv1', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    });

    beforeEach(() => {
        store.clear(); resetOps(); autoId = 0;
        for (let i = 0; i < 200; i++) store.set(`${MANUAL}/m${i}`, makeManualDoc(i));
    });

    it('fetchManualProducts đọc 200 document — chi phí MỖI LẦN mở app trước khi có smart-sync', async () => {
        resetOps();
        const docs = await fetchManualProducts(STORE_ID);
        expect(docs).toHaveLength(200);
        expect(ops.reads).toBe(200);
    });

    it('thêm sản phẩm nhập tay có cập nhật mốc trong metadata/sync', async () => {
        resetOps();
        await saveManualProduct(STORE_ID, makeManualDoc(999));

        const sync = store.get(SYNC_META);
        expect(sync).toBeDefined();
        expect(sync!.manualProductsLastUpdated).toBeDefined();
        expect(ops.writes).toBe(2); // 1 document sản phẩm + 1 lần merge vào metadata/sync
    });

    it('xoá sản phẩm nhập tay cũng cập nhật mốc', async () => {
        await saveManualProduct(STORE_ID, makeManualDoc(999));
        const before = (store.get(SYNC_META) as { manualProductsLastUpdated?: unknown }).manualProductsLastUpdated;
        store.set(SYNC_META, { manualProductsLastUpdated: null }); // xoá dấu để chắc chắn ghi lại
        resetOps();

        await deleteManualProduct(STORE_ID, 'm0');

        expect((store.get(SYNC_META) as { manualProductsLastUpdated?: unknown }).manualProductsLastUpdated).not.toBeNull();
        expect(before).toBeDefined();
        expect(ops.deletes).toBe(1);
    });

    it('mốc được ghi vào CHÍNH document metadata/sync mà mọi phiên đã đọc sẵn → 0 lượt đọc thêm', async () => {
        // Cùng document với productsLastUpdated/inventoryLastUpdated, nên smart-sync của
        // manualProducts không phát sinh lượt đọc nào ngoài lượt đọc metadata/sync vốn đã có.
        await uploadInventoryToFirestore(STORE_ID, makeInventory(300));
        await saveManualProduct(STORE_ID, makeManualDoc(999));

        const sync = store.get(SYNC_META) as Record<string, unknown>;
        expect(Object.keys(sync)).toContain('inventoryLastUpdated');
        expect(Object.keys(sync)).toContain('manualProductsLastUpdated');
    });
});
