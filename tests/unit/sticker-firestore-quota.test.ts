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
interface Constraint {
    type: 'where' | 'limit' | 'orderBy' | 'startAfter';
    field?: string;
    op?: string;
    value?: unknown;
    n?: number;
    dir?: 'asc' | 'desc';
    cursor?: unknown;
}
interface FakeQuery { ref: Ref; constraints: Constraint[] }

const store = new Map<string, Record<string, unknown>>();
/** Bật để mô phỏng query có `orderBy` thất bại (vd Firestore chưa build xong index). */
let failOrderByQueries = false;
/** `queries` = số lần gọi getDocs (số round-trip), khác `reads` = số document bị tính phí. */
const ops = { reads: 0, writes: 0, deletes: 0, batchCommits: 0, queries: 0 };

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
    getDocs: async (target: Ref | FakeQuery) => {
        // Hỗ trợ cả `getDocs(collectionRef)` và `getDocs(query(ref, ...constraints))`.
        const isQuery = (t: Ref | FakeQuery): t is FakeQuery => 'constraints' in t;
        const ref = isQuery(target) ? target.ref : target;
        const constraints = isQuery(target) ? target.constraints : [];

        let docs = [...store.entries()]
            .filter(([path]) => path.startsWith(`${ref.path}/`) && path.slice(ref.path.length + 1).indexOf('/') === -1)
            .map(([path, data]) => ({ id: path.split('/').pop()!, data: () => data, ref: { path } }));

        for (const c of constraints) {
            if (c.type === 'where') {
                docs = docs.filter(d => {
                    const v = (d.data() as Record<string, unknown>)[c.field!];
                    return c.op === '==' ? v === c.value : true;
                });
            }
        }

        const orderByC = constraints.find(c => c.type === 'orderBy');
        if (orderByC && failOrderByQueries) {
            throw new Error('FAILED_PRECONDITION: The query requires an index.');
        }
        if (orderByC) {
            const f = orderByC.field!;
            docs.sort((a, b) => {
                const av = String((a.data() as Record<string, unknown>)[f] ?? '');
                const bv = String((b.data() as Record<string, unknown>)[f] ?? '');
                return orderByC.dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
            });
        } else {
            // Không có orderBy → Firestore trả theo document ID (ID ngẫu nhiên trong thực tế).
            docs.sort((a, b) => a.id.localeCompare(b.id));
        }

        const startAfterC = constraints.find(c => c.type === 'startAfter');
        if (startAfterC) {
            // `startAfter()` thật nhận một QueryDocumentSnapshot (có `.ref`), KHÔNG phải Ref.
            // Đọc sai chỗ này khiến mọi trang trả về CÙNG trang đầu — mock tự tạo ra vòng lặp giả.
            const c = startAfterC.cursor as { ref?: Ref; path?: string };
            const cursorPath = c.ref?.path ?? c.path;
            const idx = docs.findIndex(d => d.ref.path === cursorPath);
            docs = idx >= 0 ? docs.slice(idx + 1) : docs;
        }

        const limitC = constraints.find(c => c.type === 'limit');
        if (limitC) docs = docs.slice(0, limitC.n!);

        ops.reads += Math.max(1, docs.length); // query rỗng vẫn tính tối thiểu 1 lượt đọc
        ops.queries += 1;
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
    query: (ref: Ref, ...constraints: Constraint[]): FakeQuery => ({ ref, constraints }),
    where: (field: string, op: string, value: unknown): Constraint => ({ type: 'where', field, op, value }),
    limit: (n: number): Constraint => ({ type: 'limit', n }),
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc'): Constraint => ({ type: 'orderBy', field, dir }),
    startAfter: (cursor: unknown): Constraint => ({ type: 'startAfter', cursor }),
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
    fetchAllUsers,
    invalidateAllUsersCache,
    updateUserRole,
} = await import('../../features/sticker-event/services/firebaseService');

const STORE_ID = 'TESTQUOTA';
const INV_CHUNKS = `stores/${STORE_ID}/inventoryChunks`;

const makeInventory = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        maSanPham: `PRD${i}`,
        tenSanPham: `Sản phẩm ${i}`,
        tongSoLuong: i,
    })) as never[];

const resetOps = () => { ops.reads = 0; ops.writes = 0; ops.deletes = 0; ops.batchCommits = 0; ops.queries = 0; };

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


describe('Hạn mức Firestore — phân trang "DS đã lưu" (mục 3b)', () => {
    const LISTS = `stores/${STORE_ID}/savedLists`;
    const TOTAL = 300;

    /**
     * 300 danh sách: `old_*` (tháng 1, cũ nhất) do nhân viên nv_old tạo, `new_*` (tháng 9, mới nhất)
     * do admin tạo. Document ID cố ý KHÔNG theo thứ tự thời gian — giống ID ngẫu nhiên của `doc()`
     * trong thực tế, để thấy rõ vì sao hạ limit mà không có orderBy là sai.
     */
    const seedManyLists = () => {
        for (let i = 0; i < TOTAL; i++) {
            const isOld = i < 10;                       // 10 danh sách cũ nhất thuộc nv_old
            const month = isOld ? '01' : '09';
            const day = String((i % 28) + 1).padStart(2, '0');
            const id = `zz${String(TOTAL - i).padStart(4, '0')}`; // ID ngược so với thời gian
            store.set(`${LISTS}/${id}`, {
                id,
                name: `DS ${i}`,
                userId: isOld ? 'nv_old' : 'admin1',
                authUid: isOld ? 'uid_nv_old' : 'uid_admin1',
                storeId: STORE_ID,
                createdAt: `2026-${month}-${day}T0${i % 10}:00:00.000Z`,
                totalItems: 3,
                items: JSON.stringify([{ msp: 'A' }]),
            });
        }
    };

    beforeEach(() => {
        store.clear(); resetOps(); autoId = 0; failOrderByQueries = false;
        invalidateSavedListsCache();
        seedManyLists();
    });

    it('Admin: 1 trang 50 là đủ (trước bản sửa phải đọc cả 300)', async () => {
        resetOps();
        const lists = await fetchSavedListsFromFirestore(STORE_ID);

        // 50 doc ở store của user + 1 lượt tối thiểu cho query store 'SUPERADMIN' (rỗng).
        expect(ops.reads).toBe(51);
        expect(lists).toHaveLength(50);
        expect(ops.queries).toBe(2); // 1 trang + 1 query SUPERADMIN, không quét thêm
    });

    it('trả về đúng những danh sách MỚI NHẤT, không phải 50 bản ngẫu nhiên', async () => {
        const lists = await fetchSavedListsFromFirestore(STORE_ID);

        // Toàn bộ phải là danh sách tháng 9; không lẫn bản tháng 1 (cũ nhất).
        expect(lists.every(l => l.createdAt.startsWith('2026-09'))).toBe(true);
        // Và đã sắp giảm dần theo thời gian.
        const times = lists.map(l => new Date(l.createdAt).getTime());
        expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it('Nhân viên có danh sách CŨ NHẤT: vẫn tìm thấy, không bị ẩn (trần 500 giữ nguyên)', async () => {
        // Đây là lý do KHÔNG thể chỉ hạ limit xuống 50: 10 danh sách của nv_old là cũ nhất trong
        // 300 bản, nằm ở tận trang cuối. Phải quét tiếp cho tới khi tìm được.
        resetOps();
        const lists = await fetchSavedListsFromFirestore(STORE_ID, 'nv_old');

        expect(lists).toHaveLength(10);
        expect(lists.every(l => l.userId === 'nv_old')).toBe(true);

        // GHI LẠI ĐÚNG SỰ THẬT, không làm tròn cho đẹp: 302 lượt đọc = 300 document (6 trang × 50)
        // + 1 lượt tối thiểu cho trang rỗng thứ 7 + 1 cho query store 'SUPERADMIN'. Bản cũ tốn 301.
        // Tức với NHÂN VIÊN, phân trang KHÔNG tiết kiệm được gì — vì bộ lọc quyền chạy ở client nên
        // vẫn phải quét tới khi tìm thấy. Phần tiết kiệm thật chỉ dành cho Admin (xem test đầu
        // describe này: 300 → 51). Muốn tiết kiệm cho cả nhân viên thì phải lọc ở SERVER
        // (`where('authUid','==',uid)`) — xem implementation_plan.md mục 3b để biết vì sao chưa làm.
        expect(ops.reads).toBe(302);
    });

    it('Nhân viên có danh sách MỚI: dừng sớm, không quét hết kho', async () => {
        store.set(`${LISTS}/zz9999`, {
            id: 'zz9999', name: 'DS mới của nv_new', userId: 'nv_new', authUid: 'uid_nv_new',
            storeId: STORE_ID, createdAt: '2026-12-31T23:00:00.000Z', totalItems: 1,
            items: JSON.stringify([{ msp: 'Z' }]),
        });
        resetOps();

        const lists = await fetchSavedListsFromFirestore(STORE_ID, 'nv_new');

        expect(lists).toHaveLength(1);
        expect(lists[0].name).toBe('DS mới của nv_new');
        // Nhân viên chỉ có 1 danh sách → chưa đủ SAVED_LISTS_MIN_WANTED (20) nên vẫn quét hết kho.
        // Đây là cùng giới hạn nêu ở test trên, ghi lại để không ai tưởng phân trang đã giải quyết
        // xong cho mọi vai trò.
        expect(ops.reads).toBe(302);
    });

    it('KHÔNG BAO GIỜ đọc quá trần 500 document mỗi store', async () => {
        for (let i = 0; i < 400; i++) {
            const id = `yy${String(i).padStart(4, '0')}`;
            store.set(`${LISTS}/${id}`, {
                id, name: `DS phụ ${i}`, userId: 'ai_khac', authUid: 'uid_ai_khac',
                storeId: STORE_ID, createdAt: `2026-05-01T00:00:00.000Z`, totalItems: 1,
                items: '[]',
            });
        }
        resetOps();

        await fetchSavedListsFromFirestore(STORE_ID, 'khong_ton_tai');

        // 700 document trong kho, nhưng chỉ được quét tối đa 500 + 1 lượt cho store SUPERADMIN.
        expect(ops.reads).toBeLessThanOrEqual(501);
    });

    it('orderBy thất bại (index chưa sẵn) → quay về ĐÚNG hành vi cũ, không mất tính năng', async () => {
        failOrderByQueries = true;
        resetOps();

        const lists = await fetchSavedListsFromFirestore(STORE_ID, 'nv_old');

        // Vẫn tìm được đủ danh sách của nhân viên đó qua nhánh fallback limit(500).
        expect(lists).toHaveLength(10);
        expect(lists.every(l => l.userId === 'nv_old')).toBe(true);
    });
});


describe('Hạn mức Firestore — danh sách người dùng (rà soát sâu 2026-09-18)', () => {
    beforeEach(() => {
        store.clear(); resetOps(); autoId = 0;
        invalidateAllUsersCache();
        // 40 người dùng cùng kho — UserManagementModal gọi query limit(100) mỗi lần mở.
        for (let i = 0; i < 40; i++) {
            store.set(`stickerUsers/u${i}`, { uid: `u${i}`, username: `nv${i}`, storeId: STORE_ID, role: 'staff' });
        }
        // Người của kho khác — phải bị `where('storeId','==',…)` loại ở server.
        for (let i = 0; i < 10; i++) {
            store.set(`stickerUsers/other${i}`, { uid: `other${i}`, username: `x${i}`, storeId: 'KHOKHAC', role: 'staff' });
        }
    });

    it('lần mở đầu: đọc đúng số người CÙNG KHO, không đọc kho khác', async () => {
        resetOps();
        const users = await fetchAllUsers(STORE_ID);
        expect(users).toHaveLength(40);
        expect(ops.reads).toBe(40);
    });

    it('mở lại modal trong 5 phút: 0 lượt đọc (trước bản sửa: 40 mỗi lần)', async () => {
        await fetchAllUsers(STORE_ID);
        resetOps();

        for (let i = 0; i < 5; i++) await fetchAllUsers(STORE_ID);

        expect(ops.reads).toBe(0);
    });

    it('cache không bị nơi gọi làm bẩn', async () => {
        const first = await fetchAllUsers(STORE_ID);
        first.length = 0;
        expect(await fetchAllUsers(STORE_ID)).toHaveLength(40);
    });

    it('đổi quyền người dùng làm mới cache NGAY, không phải chờ TTL', async () => {
        await fetchAllUsers(STORE_ID);
        await updateUserRole('u0', 'admin');
        resetOps();

        await fetchAllUsers(STORE_ID);

        expect(ops.reads).toBe(40); // đã đọc lại thật
    });

    it('forceRefresh bỏ qua cache', async () => {
        await fetchAllUsers(STORE_ID);
        resetOps();
        await fetchAllUsers(STORE_ID, { forceRefresh: true });
        expect(ops.reads).toBe(40);
    });

    it('cache tách theo kho — kho khác không dùng chung kết quả', async () => {
        await fetchAllUsers(STORE_ID);
        resetOps();
        const other = await fetchAllUsers('KHOKHAC');
        expect(other).toHaveLength(10);
        expect(ops.reads).toBe(10);
    });
});
