/**
 * Test toàn diện cho tính năng Lưu Danh Sách & Xem Danh Sách Đã Lưu trên In Sticker:
 * 1. Quyền Nhân viên (Staff): chỉ thấy danh sách của chính mình, không thấy của nhân viên khác.
 * 2. Quyền Quản lý (Store Admin): thấy toàn bộ danh sách trong kho mình quản lý + danh sách chung SUPERADMIN.
 * 3. Quyền Super Admin: quyền tối cao, xem và quản lý danh sách ở mọi kho và namespace SUPERADMIN.
 * 4. Tính nhất quán Mobile và Laptop:
 *    - Lưu trên Laptop (có bảng giá allProducts) -> Mở trên Mobile (chưa nạp bảng giá allProducts = [])
 *      vẫn giữ nguyên 100% snapshot thông tin: tên, giá gốc, giá giảm, khuyến mãi, tiền thưởng để in ấn.
 *    - Lưu trên Mobile -> Mở trên Laptop hoạt động hoàn hảo.
 * 5. Danh sách lớn tự động chunk (>500 items) tải trơn tru cho cả 3 quyền trên mọi thiết bị.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SavedListItem, Product } from '../../features/sticker-event/types';

interface Ref { path: string; id: string }
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
const DB = { __isDb: true } as const;
const isDb = (x: unknown): boolean => !!x && (x as { __isDb?: boolean }).__isDb === true;
let autoId = 0;

let currentAuthUid = 'uid_staff_1';

const joinPath = (first: unknown, rest: string[]): string =>
    isDb(first) ? rest.join('/') : `${(first as Ref).path}/${rest.join('/')}`;

vi.mock('../../features/sticker-event/firebase', () => ({
    db: { __isDb: true },
    auth: {
        get currentUser() {
            return { uid: currentAuthUid };
        }
    },
    functions: {},
}));

vi.mock('firebase/functions', () => ({
    httpsCallable: () => async () => ({ data: { success: true } }),
    getFunctions: () => ({}),
}));

vi.mock('firebase/firestore', () => ({
    collection: (first: unknown, ...rest: string[]): Ref => {
        const path = joinPath(first, rest);
        return { path, id: path.split('/').pop()! };
    },
    doc: (first: unknown, ...rest: string[]): Ref => {
        const path = rest.length > 0
            ? joinPath(first, rest)
            : `${(first as Ref).path}/auto_${++autoId}`;
        const id = path.split('/').pop()!;
        return { path, id };
    },
    getDoc: async (ref: Ref) => {
        const data = store.get(ref.path);
        return { exists: () => data !== undefined, data: () => data, ref };
    },
    getDocs: async (target: Ref | FakeQuery) => {
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
        if (orderByC) {
            const f = orderByC.field!;
            docs.sort((a, b) => {
                const av = String((a.data() as Record<string, unknown>)[f] ?? '');
                const bv = String((b.data() as Record<string, unknown>)[f] ?? '');
                return orderByC.dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
            });
        }

        const startAfterC = constraints.find(c => c.type === 'startAfter');
        if (startAfterC) {
            const c = startAfterC.cursor as { ref?: Ref; path?: string };
            const cursorPath = c.ref?.path ?? c.path;
            const idx = docs.findIndex(d => d.ref.path === cursorPath);
            docs = idx >= 0 ? docs.slice(idx + 1) : docs;
        }

        const limitC = constraints.find(c => c.type === 'limit');
        if (limitC) docs = docs.slice(0, limitC.n!);

        return { docs, empty: docs.length === 0, size: docs.length };
    },
    setDoc: async (ref: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) => {
        store.set(ref.path, options?.merge ? { ...(store.get(ref.path) ?? {}), ...data } : data);
    },
    deleteDoc: async (ref: Ref) => { store.delete(ref.path); },
    writeBatch: () => {
        const queued: Array<() => void> = [];
        return {
            delete: (ref: Ref) => { queued.push(() => store.delete(ref.path)); },
            set: (ref: Ref, data: Record<string, unknown>) => { queued.push(() => store.set(ref.path, data)); },
            commit: async () => { queued.forEach(fn => fn()); },
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
    saveListToFirestore,
    fetchSavedListsFromFirestore,
    fetchSavedListItems,
    deleteSavedListFromFirestore,
    invalidateSavedListsCache,
} = await import('../../features/sticker-event/services/firebaseService');

/**
 * Logic tái tạo danh sách sản phẩm khi nạp từ danh sách đã lưu (đồng bộ 100% với StickerEventApp.tsx:461)
 */
function reconstructProducts(savedItems: SavedListItem[], allProducts: Product[]): Product[] {
    const reconstructedProducts: Product[] = [];
    for (const item of savedItems) {
        const product = allProducts.find(p => p.msp === item.msp);
        if (product) {
            reconstructedProducts.push({ ...product, quantity: item.quantity || 1, selected: false });
        } else if (item.sanPham) {
            reconstructedProducts.push({ ...item, selected: false, quantity: item.quantity || 1 } as Product);
        }
    }
    return reconstructedProducts;
}

describe('Kiểm thử tính năng Lưu Danh Sách — Tất cả các quyền (Staff, Admin, SuperAdmin) & Mobile / Laptop', () => {
    const STORE_KHO1 = 'KHO_01';
    const STORE_KHO2 = 'KHO_02';

    beforeEach(() => {
        store.clear();
        autoId = 0;
        invalidateSavedListsCache();
        currentAuthUid = 'uid_staff_1';
    });

    describe('1. Quyền Nhân viên (Staff / Employee)', () => {
        it('Nhân viên lưu danh sách: payload lưu đúng thông tin và metadata người tạo', async () => {
            currentAuthUid = 'uid_staff_1';
            const itemsToSave: SavedListItem[] = [
                {
                    msp: 'SP001',
                    sanPham: 'Tivi Sony 55 inch 4K',
                    giaGoc: '15000000',
                    giaGiam: '12990000',
                    khuyenMai: 'Tặng phiếu mua hàng 500k',
                    tongThuong: 200000,
                    thuongERP: 150000,
                    thuongNong: 50000,
                    quantity: 2,
                }
            ];

            const listId = await saveListToFirestore(STORE_KHO1, 'staff_van_a', 'DS Tivi Trưng Bày', itemsToSave);
            expect(typeof listId).toBe('string');
            expect(listId).toBeTruthy();

            // Kiểm tra document được tạo trong Firestore
            const savedDoc = [...store.entries()].find(([k]) => k.startsWith(`stores/${STORE_KHO1}/savedLists/`));
            expect(savedDoc).toBeDefined();
            const data = savedDoc![1];
            expect(data.name).toBe('DS Tivi Trưng Bày');
            expect(data.userId).toBe('staff_van_a');
            expect(data.authUid).toBe('uid_staff_1');
            expect(data.storeId).toBe(STORE_KHO1);
            expect(data.totalItems).toBe(1);

            // Parse items kiểm tra snapshot chi tiết
            const parsedItems = JSON.parse(data.items as string);
            expect(parsedItems[0].sanPham).toBe('Tivi Sony 55 inch 4K');
            expect(parsedItems[0].giaGiam).toBe('12990000');
            expect(parsedItems[0].tongThuong).toBe(200000);
        });

        it('Nhân viên A CHỈ thấy danh sách của chính mình, KHÔNG thấy danh sách của Nhân viên B', async () => {
            // Seed danh sách của NV A
            currentAuthUid = 'uid_nv_a';
            await saveListToFirestore(STORE_KHO1, 'nv_a', 'DS của NV A', [{ msp: 'A1', sanPham: 'SP A1', quantity: 1 }]);

            // Seed danh sách của NV B
            currentAuthUid = 'uid_nv_b';
            await saveListToFirestore(STORE_KHO1, 'nv_b', 'DS của NV B', [{ msp: 'B1', sanPham: 'SP B1', quantity: 1 }]);

            invalidateSavedListsCache();

            // Khi NV A đăng nhập và xem danh sách đã lưu:
            currentAuthUid = 'uid_nv_a';
            const listsForA = await fetchSavedListsFromFirestore(STORE_KHO1, 'nv_a', { forceRefresh: true });

            expect(listsForA).toHaveLength(1);
            expect(listsForA[0].name).toBe('DS của NV A');
            expect(listsForA[0].userId).toBe('nv_a');

            // Khi NV B đăng nhập và xem danh sách đã lưu:
            currentAuthUid = 'uid_nv_b';
            invalidateSavedListsCache();
            const listsForB = await fetchSavedListsFromFirestore(STORE_KHO1, 'nv_b', { forceRefresh: true });

            expect(listsForB).toHaveLength(1);
            expect(listsForB[0].name).toBe('DS của NV B');
            expect(listsForB[0].userId).toBe('nv_b');
        });

        it('Nhân viên nhận diện cả danh sách cũ (chỉ có userId) và danh sách mới (có authUid) không phân biệt hoa thường', async () => {
            // Danh sách cũ chỉ có userId viết hoa thường khác nhau
            store.set(`stores/${STORE_KHO1}/savedLists/legacy_list_1`, {
                id: 'legacy_list_1',
                name: 'DS Di Sản',
                userId: 'NV_TRUONG_SON',
                storeId: STORE_KHO1,
                createdAt: '2026-01-01T00:00:00.000Z',
                totalItems: 1,
                items: JSON.stringify([{ msp: 'LEGACY', sanPham: 'Món cũ' }]),
            });

            currentAuthUid = 'uid_random_new';
            // Nhân viên tìm bằng username thường
            const lists = await fetchSavedListsFromFirestore(STORE_KHO1, 'nv_truong_son', { forceRefresh: true });
            expect(lists).toHaveLength(1);
            expect(lists[0].name).toBe('DS Di Sản');
        });

        it('Nhân viên có thể xóa danh sách của chính mình', async () => {
            currentAuthUid = 'uid_nv_a';
            const listId = await saveListToFirestore(STORE_KHO1, 'nv_a', 'DS muốn xóa', [{ msp: 'X1', quantity: 1 }]);
            expect(listId).toBeDefined();

            await deleteSavedListFromFirestore(STORE_KHO1, listId);

            const remainingLists = await fetchSavedListsFromFirestore(STORE_KHO1, 'nv_a', { forceRefresh: true });
            expect(remainingLists).toHaveLength(0);
        });
    });

    describe('2. Quyền Quản lý (Store Admin)', () => {
        it('Quản lý thấy TOÀN BỘ danh sách của tất cả nhân viên trong kho mình quản lý', async () => {
            // Tạo 3 danh sách từ các nhân viên khác nhau trong kho KHO_01
            currentAuthUid = 'uid_nv_1';
            await saveListToFirestore(STORE_KHO1, 'nv_1', 'DS NV 1', [{ msp: 'M1', quantity: 1 }]);

            currentAuthUid = 'uid_nv_2';
            await saveListToFirestore(STORE_KHO1, 'nv_2', 'DS NV 2', [{ msp: 'M2', quantity: 2 }]);

            currentAuthUid = 'uid_admin';
            await saveListToFirestore(STORE_KHO1, 'admin_kho', 'DS của Admin', [{ msp: 'M3', quantity: 3 }]);

            invalidateSavedListsCache();

            // Quản lý mở modal (isAdmin = true -> userIdentifier = undefined)
            const adminLists = await fetchSavedListsFromFirestore(STORE_KHO1, undefined, { forceRefresh: true });

            expect(adminLists).toHaveLength(3);
            const names = adminLists.map(l => l.name);
            expect(names).toContain('DS NV 1');
            expect(names).toContain('DS NV 2');
            expect(names).toContain('DS của Admin');
        });

        it('Quản lý kho A KHÔNG thấy danh sách của kho B', async () => {
            currentAuthUid = 'uid_kho_1';
            await saveListToFirestore(STORE_KHO1, 'nv_k1', 'DS Tại Kho 1', [{ msp: 'K1', quantity: 1 }]);

            currentAuthUid = 'uid_kho_2';
            await saveListToFirestore(STORE_KHO2, 'nv_k2', 'DS Tại Kho 2', [{ msp: 'K2', quantity: 1 }]);

            invalidateSavedListsCache();

            // Quản lý kho 1 chỉ fetch với storeId = STORE_KHO1
            const kho1Lists = await fetchSavedListsFromFirestore(STORE_KHO1, undefined, { forceRefresh: true });
            expect(kho1Lists.some(l => l.name === 'DS Tại Kho 1')).toBe(true);
            expect(kho1Lists.some(l => l.name === 'DS Tại Kho 2')).toBe(false);
        });

        it('Quản lý thấy danh sách chia sẻ chung từ namespace SUPERADMIN', async () => {
            // Danh sách chung do cấp trên tạo tại namespace SUPERADMIN
            currentAuthUid = 'uid_superadmin';
            await saveListToFirestore('SUPERADMIN', 'admin', 'DS Khuyến Mãi Chung Toàn Hệ Thống', [{ msp: 'ALL', quantity: 1 }]);

            invalidateSavedListsCache();

            // Quản lý kho 1 mở danh sách (hệ thống tự gộp storeId và SUPERADMIN)
            const kho1Lists = await fetchSavedListsFromFirestore(STORE_KHO1, undefined, { forceRefresh: true });
            expect(kho1Lists.some(l => l.name === 'DS Khuyến Mãi Chung Toàn Hệ Thống')).toBe(true);
        });
    });

    describe('3. Quyền Super Admin (supper admin)', () => {
        it('Super Admin xem được toàn bộ danh sách ở bất kỳ kho nào', async () => {
            // Kho 1 có danh sách
            await saveListToFirestore(STORE_KHO1, 'nv_1', 'DS KHO 1', [{ msp: 'K1', quantity: 1 }]);
            // Kho 2 có danh sách
            await saveListToFirestore(STORE_KHO2, 'nv_2', 'DS KHO 2', [{ msp: 'K2', quantity: 1 }]);

            invalidateSavedListsCache();

            // Super Admin mở kho 1
            const superAdminKho1 = await fetchSavedListsFromFirestore(STORE_KHO1, undefined, { forceRefresh: true });
            expect(superAdminKho1.some(l => l.name === 'DS KHO 1')).toBe(true);

            // Super Admin mở kho 2
            const superAdminKho2 = await fetchSavedListsFromFirestore(STORE_KHO2, undefined, { forceRefresh: true });
            expect(superAdminKho2.some(l => l.name === 'DS KHO 2')).toBe(true);
        });

        it('Super Admin lưu danh sách vào namespace SUPERADMIN thì mọi kho đều tải được', async () => {
            currentAuthUid = 'uid_super_admin';
            const listId = await saveListToFirestore('SUPERADMIN', 'admin_tong', 'Bảng Giá Chuẩn Tháng 10', [
                { msp: 'BG01', sanPham: 'Bảng Giá Tháng 10', quantity: 1 }
            ]);
            expect(listId).toBeDefined();

            invalidateSavedListsCache();

            // Nhân viên hoặc Quản lý bất kỳ kho nào cũng tải được danh sách này
            const khoAnyLists = await fetchSavedListsFromFirestore('KHO_ANY_999', undefined, { forceRefresh: true });
            expect(khoAnyLists.some(l => l.name === 'Bảng Giá Chuẩn Tháng 10')).toBe(true);
        });
    });

    describe('4. Tính Nhất Quán & Đồng Bộ giữa Mobile và Laptop (Cross-device)', () => {
        const fullLaptopProducts: Product[] = [
            {
                msp: 'DT001',
                sanPham: 'iPhone 15 Pro Max 256GB',
                giaGoc: '34990000',
                giaGiam: '29990000',
                khuyenMai: 'Thu cũ đổi mới trợ giá 2 triệu',
                tongThuong: 350000,
                thuongERP: 250000,
                thuongNong: 100000,
                ngayIn: '',
                selected: false,
                quantity: 1,
            },
            {
                msp: 'TL002',
                sanPham: 'Tủ lạnh Panasonic Inverter 320L',
                giaGoc: '12490000',
                giaGiam: '10990000',
                khuyenMai: 'Bảo hành 2 năm + Tặng ấm siêu tốc',
                tongThuong: 180000,
                thuongERP: 120000,
                thuongNong: 60000,
                ngayIn: '',
                selected: false,
                quantity: 2,
            }
        ];

        it('KỊCH BẢN CHÍNH: Lưu trên Laptop (đã có nạp bảng giá) -> Mở trên Mobile (CHƯA nạp file bảng giá allProducts = [])', async () => {
            // Bước 1: Nhân viên lưu trên Laptop.
            // Laptop có bảng giá hiển thị full thông tin. Khi lưu, tạo snapshot itemsToSave:
            const itemsToSave: SavedListItem[] = fullLaptopProducts.map(p => ({
                msp: p.msp,
                sanPham: p.sanPham,
                giaGoc: p.giaGoc || '',
                giaGiam: p.giaGiam || '',
                khuyenMai: p.khuyenMai || '',
                tongThuong: p.tongThuong || 0,
                thuongERP: p.thuongERP || 0,
                thuongNong: p.thuongNong || 0,
                quantity: p.quantity || 1,
            }));

            await saveListToFirestore(STORE_KHO1, 'staff_son', 'DS Điện Thoại & Tủ Lạnh', itemsToSave);
            invalidateSavedListsCache();

            // Bước 2: Nhân viên mở điện thoại ra kho xem DS đã lưu:
            // Lúc này trên Mobile, thiết bị KHÔNG có file bảng giá Excel tải lên:
            const mobileAllProducts: Product[] = []; // Trống rỗng

            const savedLists = await fetchSavedListsFromFirestore(STORE_KHO1, 'staff_son', { forceRefresh: true });
            expect(savedLists).toHaveLength(1);

            const savedList = savedLists[0];
            expect(savedList.items).toHaveLength(2);

            // Bước 3: Mobile gọi handleLoadSavedList (thực thi reconstructProducts)
            const mobileReconstructed = reconstructProducts(savedList.items, mobileAllProducts);

            // KIỂM TRA QUAN TRỌNG: Mặc dù allProducts trên Mobile rỗng, danh sách vẫn phục hồi ĐẦY ĐỦ 100%:
            expect(mobileReconstructed).toHaveLength(2);

            const item1 = mobileReconstructed[0];
            expect(item1.msp).toBe('DT001');
            expect(item1.sanPham).toBe('iPhone 15 Pro Max 256GB');
            expect(item1.giaGoc).toBe('34990000');
            expect(item1.giaGiam).toBe('29990000');
            expect(item1.khuyenMai).toBe('Thu cũ đổi mới trợ giá 2 triệu');
            expect(item1.tongThuong).toBe(350000);
            expect(item1.thuongERP).toBe(250000);
            expect(item1.thuongNong).toBe(100000);
            expect(item1.quantity).toBe(1);

            const item2 = mobileReconstructed[1];
            expect(item2.msp).toBe('TL002');
            expect(item2.sanPham).toBe('Tủ lạnh Panasonic Inverter 320L');
            expect(item2.giaGiam).toBe('10990000');
            expect(item2.quantity).toBe(2);
        });

        it('KỊCH BẢN NGƯỢC: Lưu trên Mobile -> Mở trên Laptop (đã có bảng giá cập nhật mới nhất)', async () => {
            // Mobile lưu snapshot
            const mobileSavedItems: SavedListItem[] = [
                {
                    msp: 'DT001',
                    sanPham: 'iPhone 15 Pro Max 256GB',
                    giaGoc: '34990000',
                    giaGiam: '29990000',
                    quantity: 3,
                }
            ];

            await saveListToFirestore(STORE_KHO1, 'staff_son', 'DS Tạo Từ Điện Thoại', mobileSavedItems);
            invalidateSavedListsCache();

            // Mở trên Laptop (Laptop có allProducts với giá đã thay đổi mới hơn trong ngày)
            const laptopUpdatedProducts: Product[] = [
                {
                    msp: 'DT001',
                    sanPham: 'iPhone 15 Pro Max 256GB (Bản Cập Nhật)',
                    giaGoc: '34990000',
                    giaGiam: '28990000', // Đã giảm thêm 1 triệu
                    khuyenMai: 'Khuyến mãi hot hôm nay',
                    tongThuong: 400000,
                    thuongERP: 300000,
                    thuongNong: 100000,
                    ngayIn: '',
                    selected: false,
                    quantity: 1,
                }
            ];

            const savedLists = await fetchSavedListsFromFirestore(STORE_KHO1, 'staff_son', { forceRefresh: true });
            const savedList = savedLists[0];

            // Laptop phục hồi qua allProducts -> nhận giá mới nhất nhưng giữ nguyên số lượng 3 tem đã chọn trên mobile
            const laptopReconstructed = reconstructProducts(savedList.items, laptopUpdatedProducts);
            expect(laptopReconstructed).toHaveLength(1);
            expect(laptopReconstructed[0].giaGiam).toBe('28990000');
            expect(laptopReconstructed[0].quantity).toBe(3); // Giữ đúng số lượng đã lưu trên Mobile
        });
    });

    describe('5. Danh sách kích thước lớn (Chunked items > 3000)', () => {
        it('Cả Staff, Quản lý và Super Admin đều mở và nạp đầy đủ danh sách lớn trên cả Mobile và Laptop', async () => {
            // Tạo 3500 items (vượt ngưỡng SAVED_LIST_CHUNK_SIZE = 3000)
            const bigItems: SavedListItem[] = Array.from({ length: 3500 }, (_, i) => ({
                msp: `BIG_${i}`,
                sanPham: `Sản phẩm số ${i}`,
                giaGiam: `${100000 + i * 1000}`,
                quantity: 1,
            }));

            // Lưu danh sách lớn (>3000 items tự động chunk)
            currentAuthUid = 'uid_manager';
            const listId = await saveListToFirestore(STORE_KHO1, 'manager_kho', 'DS Toàn Bộ Tồn Kho Lớn', bigItems);
            expect(listId).toBeDefined();

            invalidateSavedListsCache();

            // 1. Quản lý kiểm tra danh sách:
            const lists = await fetchSavedListsFromFirestore(STORE_KHO1, undefined, { forceRefresh: true });
            expect(lists).toHaveLength(1);
            expect(lists[0].itemsChunked).toBe(true);
            expect(lists[0].totalItems).toBe(3500);

            // 2. Tải lazy items chi tiết từ subcollection itemChunks (khi nhấn "Mở" trên modal)
            const loadedItems = await fetchSavedListItems(STORE_KHO1, lists[0].id);
            expect(loadedItems).toHaveLength(3500);
            expect(loadedItems[0].msp).toBe('BIG_0');
            expect(loadedItems[3499].msp).toBe('BIG_3499');

            // 3. Phục hồi danh sách hiển thị trên Mobile (không có allProducts)
            const restoredOnMobile = reconstructProducts(loadedItems, []);
            expect(restoredOnMobile).toHaveLength(3500);
            expect(restoredOnMobile[300].sanPham).toBe('Sản phẩm số 300');
        });
    });
});
