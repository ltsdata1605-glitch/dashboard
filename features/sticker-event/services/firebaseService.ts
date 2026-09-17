import { db, auth } from '../firebase';
import { collection, doc, writeBatch, getDocs, query, where, Timestamp, deleteDoc, setDoc, getDoc, limit, orderBy, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Product, InventoryItem, SavedList, InventoryFilters, SavedListItem, StickerEventUserRecord, ManualProductDoc } from '../types';
import { stickerAdminUpdateUser } from './adminUserService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// QUOTA FIX (2026-09-17, audit hạn mức Firestore gói Spark — xem implementation_plan.md mục
// "Audit hạn mức đọc/ghi Firestore"): trước đây mọi lượt dọn chunk đều phát MÙ 50 lệnh xoá
// chunk_0..chunk_49 bất kể thực tế chỉ có ~10 chunk, dựa trên giả định ghi trong comment cũ là
// "xoá doc không tồn tại là no-op (no cost)" — KHÔNG có gì bảo đảm điều đó, Firestore tính phí
// theo lệnh xoá gửi lên. Nay ghi luôn số chunk thật vào metadata (`chunkCount`) và chỉ xoá đúng
// những chunk từng được ghi.
const CHUNK_META_KEY: Record<string, string> = {
    productChunks: 'products',
    inventoryChunks: 'inventory',
};

// Chỉ dùng cho dữ liệu ghi TRƯỚC bản sửa này (metadata chưa có field `chunkCount`): phải quét
// rộng đúng 1 lần để dọn hết chunk cũ, sau đó `chunkCount` luôn có nên không bao giờ dùng lại.
const LEGACY_MAX_CHUNKS = 50;

/** Số chunk đã ghi ở lần trước, hoặc `null` nếu metadata chưa từng lưu `chunkCount`. */
const readPreviousChunkCount = async (storeId: string, collectionName: string): Promise<number | null> => {
    const metaKey = CHUNK_META_KEY[collectionName];
    if (!metaKey) return null;
    try {
        const snap = await getDoc(doc(db, 'stores', storeId, 'metadata', metaKey));
        const count = snap.exists() ? (snap.data() as { chunkCount?: unknown }).chunkCount : undefined;
        return typeof count === 'number' && count >= 0 ? count : null;
    } catch {
        // Đọc metadata thất bại → trả null để bên gọi dùng LEGACY_MAX_CHUNKS (quét rộng, an toàn
        // về mặt dọn sạch dữ liệu), thay vì bỏ qua việc dọn và để lại chunk mồ côi vĩnh viễn.
        return null;
    }
};

/** Xoá chunk trong khoảng [from, to) bằng 1 batch. Khoảng rỗng → không gửi request nào. */
const deleteChunkRange = async (storeId: string, collectionName: string, from: number, to: number) => {
    if (to <= from) return;
    const batch = writeBatch(db);
    for (let i = from; i < to; i++) {
        batch.delete(doc(db, 'stores', storeId, collectionName, `chunk_${i}`));
    }
    await batch.commit();
};

export const uploadProductsToFirestore = async (storeId: string, products: Product[]) => {
  if (!storeId) throw new Error("Mã kho không hợp lệ.");
  
  const chunksRef = collection(db, 'stores', storeId, 'productChunks');
  
  try {
    // Ghi ĐÈ chunk mới TRƯỚC, dọn chunk dư SAU (đảo ngược thứ tự cũ "xoá hết rồi ghi lại"):
    // mọi chunk có chỉ số < newChunkCount đều được setDoc ghi đè nên không sót dữ liệu cũ, mà
    // nếu lượt ghi lỗi giữa đường thì dữ liệu cũ vẫn còn dùng được thay vì bị xoá trắng trước.
    const previousChunkCount = await readPreviousChunkCount(storeId, 'productChunks');

    const CHUNK_SIZE = 400; // Group 400 products into 1 document
    const newChunkCount = Math.ceil(products.length / CHUNK_SIZE);
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const chunkId = `chunk_${Math.floor(i / CHUNK_SIZE)}`;
      await setDoc(doc(chunksRef, chunkId), {
        items: JSON.stringify(chunk),
        count: chunk.length,
        updatedAt: Timestamp.now()
      });
    }

    // Chỉ xoá phần DƯ ra so với lần ghi trước — lần ghi lại cùng cỡ dữ liệu tốn 0 lệnh xoá.
    await deleteChunkRange(storeId, 'productChunks', newChunkCount, previousChunkCount ?? LEGACY_MAX_CHUNKS);

    // Also update a master timestamp doc for smart sync
    const now = Timestamp.now();
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'products'), {
        lastUpdated: now,
        totalItems: products.length,
        chunkCount: newChunkCount
    });
    // Write merged sync doc (saves 1 read per session for all users)
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'sync'), {
        productsLastUpdated: now,
        totalProducts: products.length
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${storeId}/productChunks`);
  }
};

export const uploadInventoryToFirestore = async (storeId: string, inventory: InventoryItem[]) => {
  if (!storeId) throw new Error("Mã kho không hợp lệ.");
  
  const chunksRef = collection(db, 'stores', storeId, 'inventoryChunks');
  
  try {
    // Cùng cách với uploadProductsToFirestore ở trên: ghi đè trước, dọn phần dư sau.
    const previousChunkCount = await readPreviousChunkCount(storeId, 'inventoryChunks');

    const CHUNK_SIZE = 300; // Inventory items are larger, use smaller chunks
    const newChunkCount = Math.ceil(inventory.length / CHUNK_SIZE);
    for (let i = 0; i < inventory.length; i += CHUNK_SIZE) {
      const chunk = inventory.slice(i, i + CHUNK_SIZE);
      const chunkId = `chunk_${Math.floor(i / CHUNK_SIZE)}`;
      await setDoc(doc(chunksRef, chunkId), {
        items: JSON.stringify(chunk),
        count: chunk.length,
        updatedAt: Timestamp.now()
      });
    }

    await deleteChunkRange(storeId, 'inventoryChunks', newChunkCount, previousChunkCount ?? LEGACY_MAX_CHUNKS);

    // Update master timestamp
    const now = Timestamp.now();
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'inventory'), {
        lastUpdated: now,
        totalItems: inventory.length,
        chunkCount: newChunkCount
    });
    // Write merged sync doc (saves 1 read per session for all users)
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'sync'), {
        inventoryLastUpdated: now,
        totalInventory: inventory.length
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${storeId}/inventoryChunks`);
  }
};

export const fetchProductsFromFirestore = async (storeId: string): Promise<Product[]> => {
  if (!storeId) return [];
  
  const chunksRef = collection(db, 'stores', storeId, 'productChunks');
  try {
    const snapshot = await getDocs(chunksRef);
    let allProducts: Product[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.items) {
        const chunk: Product[] = JSON.parse(data.items);
        allProducts = [...allProducts, ...chunk];
      }
    });
    
    return allProducts.map(p => ({ ...p, selected: false, quantity: 1 }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/productChunks`);
    return [];
  }
};

export const fetchInventoryFromFirestore = async (storeId: string): Promise<InventoryItem[]> => {
  if (!storeId) return [];
  
  const chunksRef = collection(db, 'stores', storeId, 'inventoryChunks');
  try {
    const snapshot = await getDocs(chunksRef);
    let allInventory: InventoryItem[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.items) {
        const chunk: InventoryItem[] = JSON.parse(data.items);
        allInventory = [...allInventory, ...chunk];
      }
    });
    
    return allInventory;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/inventoryChunks`);
    return [];
  }
};

/**
 * Xoá sạch dữ liệu chunk của 1 collection trên Firestore.
 *
 * ⚠️ `collectionName` phải là tên collection THẬT (`productChunks` / `inventoryChunks`).
 * Trước bản sửa 2026-09-17 có 3 chỗ gọi hàm này với `'products'` / `'inventory'` — 2 collection
 * KHÔNG TỒN TẠI — nên 50 lệnh xoá mỗi lượt đều bay vào hư không: vừa tốn hạn mức, vừa là BUG
 * THẬT ở nút "Xóa toàn bộ dữ liệu" (báo xoá thành công nhưng chunk trên Firestore còn nguyên,
 * mở app lần sau local rỗng nên smart-sync tải lại tất cả).
 */
export const clearStoreDataOnFirestore = async (storeId: string, collectionName: string) => {
    if (!storeId) return;
    const previousChunkCount = await readPreviousChunkCount(storeId, collectionName);
    try {
        await deleteChunkRange(storeId, collectionName, 0, previousChunkCount ?? LEGACY_MAX_CHUNKS);
        // Hạ `chunkCount` về 0 để lượt dọn kế tiếp không phải xoá gì nữa. Giữ `lastUpdated` cũ
        // (không bump) — bump lên sẽ khiến mọi máy khác tưởng có dữ liệu mới và tải lại vô ích.
        const metaKey = CHUNK_META_KEY[collectionName];
        if (metaKey) {
            await setDoc(doc(db, 'stores', storeId, 'metadata', metaKey), {
                totalItems: 0,
                chunkCount: 0
            }, { merge: true });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/${collectionName}`);
    }
}

export const fetchAllUsers = async (storeId: string): Promise<StickerEventUserRecord[]> => {
    if (!storeId) return [];
    const usersRef = collection(db, 'users');
    try {
        const q = query(usersRef, where('storeId', '==', storeId), limit(100)); // Add limit to prevent massive reads
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as StickerEventUserRecord);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return [];
    }
};

// Cả 3 hàm dưới đây gọi Cloud Function stickerAdminUpdateUser thay vì ghi
// trực tiếp từ client — giữ nguyên chữ ký hàm để UserManagementModal.tsx/
// SuperAdminModal.tsx không cần sửa gì thêm. Server kiểm tra caller có phải
// admin/superadmin, và (trừ superadmin) target phải cùng storeId với caller.
export const updateUserRole = async (userId: string, role: 'admin' | 'staff') => {
    if (!userId) throw new Error("User ID is required");
    try {
        await stickerAdminUpdateUser({ action: 'setRole', targetUid: userId, role });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
};

export const deleteUserDoc = async (userId: string) => {
    if (!userId) throw new Error("User ID is required");
    try {
        await stickerAdminUpdateUser({ action: 'delete', targetUid: userId });
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
};

export const clearAllUsers = async (storeId: string) => {
    if (!storeId) return;
    try {
        await stickerAdminUpdateUser({ action: 'clearStore', storeId });
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'users');
    }
};



// BUG FIX (user báo cáo: admin lưu danh sách sau khi xử lý toàn bộ tồn kho "không lưu được",
// nhân viên "lúc lưu được lúc không"): trước đây LUÔN nhét toàn bộ items vào 1 field của 1
// document — Firestore giới hạn cứng 1MiB/document, danh sách đủ lớn (đặc biệt khi admin lưu
// TOÀN BỘ tồn kho chưa lọc ngay sau khi xử lý file, hoặc nhân viên tình cờ đang xem 1 tập lớn)
// khiến setDoc() throw lỗi MỌI LẦN (không phải lỗi mạng tạm thời — "thử lại" không bao giờ
// thành công) — người dùng chỉ thấy thông báo chung chung "Có lỗi xảy ra khi lưu danh sách".
// Áp dụng ĐÚNG pattern chunking đã có sẵn cho products/inventory (uploadProductsToFirestore/
// uploadInventoryToFirestore ở trên) — items ở đây rất nhỏ (chỉ {msp, quantity}, không phải
// Product đầy đủ) nên chunk lớn hơn nhiều (3000) vẫn an toàn dưới ngưỡng 1MiB.
const SAVED_LIST_CHUNK_SIZE = 3000;

// QUOTA FIX (2026-09-17): cache phiên cho danh sách đã lưu.
//
// fetchSavedListsFromFirestore() là nguồn tốn lượt ĐỌC Firestore lớn nhất của In Sticker: mỗi lần
// mở "DS đã lưu" là 1 query limit(500) cho TỪNG store (store của user + 'SUPERADMIN'), và trước
// bản sửa này còn đọc thêm cả subcollection itemChunks của mọi danh sách lớn. Hai nơi gọi nó đều
// gọi lại VÔ ĐIỀU KIỆN mỗi lần mở (SavedListsModal useEffect[storeId], toggleShowSavedLists),
// nên mở panel vài chục lần trong ngày là cạn hạn mức 50.000 lượt đọc.
//
// TTL 10 phút là mức đánh đổi: danh sách chỉ đổi khi CHÍNH người dùng này lưu/xoá (đã xử lý bằng
// invalidateSavedListsCache() ngay tại 2 hàm ghi, nên thấy ngay lập tức, không phải chờ TTL), hoặc
// khi NGƯỜI KHÁC cùng kho lưu danh sách mới (admin xem danh sách của nhân viên) — trường hợp này
// chậm nhất 10 phút mới thấy, chấp nhận được cho 1 danh sách đã lưu.
const SAVED_LISTS_CACHE_TTL_MS = 10 * 60 * 1000;

// QUOTA FIX mục 3b (2026-09-17): phân trang thay cho 1 query limit(500) cục.
//
// Vì sao KHÔNG chỉ đơn giản hạ limit xuống 50: query hiện tại KHÔNG có `orderBy`, nên Firestore
// trả về theo document ID — mà ID ở đây là ID tự sinh NGẪU NHIÊN của `doc()`, không liên quan gì
// tới thời gian tạo. Hạ limit khi không có orderBy sẽ ÂM THẦM ẨN danh sách của người dùng; đúng
// lỗi mà comment cũ trong hàm này ghi là lý do họ đã NÂNG limit lên.
//
// Cách làm: sắp theo `createdAt` giảm dần rồi lấy từng trang 50. `createdAt` là chuỗi ISO-8601 nên
// thứ tự chữ cái TRÙNG với thứ tự thời gian. Chỉ cần index ĐƠN TRƯỜNG (Firestore tự tạo sẵn cho
// mọi field) — KHÔNG cần composite index, nên không phải tạo/deploy `firestore.indexes.json`
// (repo hiện không có file đó).
const SAVED_LISTS_PAGE_SIZE = 50;

/** Trần cứng: GIỮ ĐÚNG bằng limit(500) cũ, để không lần nào trả về ít danh sách hơn trước. */
const SAVED_LISTS_MAX_DOCS = 500;

/**
 * Với người chỉ được xem danh sách của CHÍNH MÌNH, một trang có thể bị bộ lọc quyền loại sạch.
 * Nên tiếp tục lấy trang sau cho tới khi đủ số này, hoặc hết dữ liệu, hoặc chạm trần.
 * Admin (`userIdentifier` undefined) không bị lọc gì nên luôn dừng ngay sau trang đầu.
 */
const SAVED_LISTS_MIN_WANTED = 20;

const savedListsCache = new Map<string, { at: number; lists: SavedList[] }>();

/** Xoá cache để lượt đọc kế tiếp lấy dữ liệu mới. Gọi ngay sau mọi thao tác lưu/xoá danh sách. */
export const invalidateSavedListsCache = () => savedListsCache.clear();

export const saveListToFirestore = async (storeId: string, userId: string, listName: string, items: any[], stickerMeta?: { stickerType?: string; headerTextContent?: string; pages?: any[] }) => {
  if (!userId) throw new Error("User ID là bắt buộc.");
  const targetStoreId = storeId || 'SUPERADMIN';
  const currentUid = auth.currentUser?.uid || '';

  const listsRef = collection(db, 'stores', targetStoreId, 'savedLists');
  const newListRef = doc(listsRef);

  const baseDoc = {
    id: newListRef.id,
    name: listName,
    userId,
    authUid: currentUid,
    storeId: targetStoreId,
    createdAt: new Date().toISOString(),
    totalItems: items.length,
    ...(stickerMeta ? { stickerMeta: JSON.stringify(stickerMeta) } : {})
  };

  try {
    if (items.length > SAVED_LIST_CHUNK_SIZE) {
      await setDoc(newListRef, { ...baseDoc, itemsChunked: true });
      const chunksRef = collection(newListRef, 'itemChunks');
      for (let i = 0; i < items.length; i += SAVED_LIST_CHUNK_SIZE) {
        const chunk = items.slice(i, i + SAVED_LIST_CHUNK_SIZE);
        const chunkId = `chunk_${Math.floor(i / SAVED_LIST_CHUNK_SIZE)}`;
        await setDoc(doc(chunksRef, chunkId), {
          items: JSON.stringify(chunk),
          count: chunk.length
        });
      }
    } else {
      await setDoc(newListRef, { ...baseDoc, items: JSON.stringify(items) });
    }
    invalidateSavedListsCache();
    return newListRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${targetStoreId}/savedLists`);
    throw error;
  }
};

export const fetchSavedListsFromFirestore = async (
  storeId: string,
  userIdentifier?: string,
  options?: { forceRefresh?: boolean }
): Promise<SavedList[]> => {
  const storeIdsToFetch = Array.from(new Set([storeId, 'SUPERADMIN'].filter(Boolean)));
  let combinedLists: SavedList[] = [];
  const currentUid = auth.currentUser?.uid || '';

  // Cache phiên — xem giải thích ở SAVED_LISTS_CACHE_TTL_MS. Trả bản COPY để nơi gọi có sort/
  // filter tại chỗ cũng không làm bẩn cache.
  const cacheKey = `${storeIdsToFetch.join(',')}|${userIdentifier ?? '*'}|${currentUid}`;
  if (!options?.forceRefresh) {
    const hit = savedListsCache.get(cacheKey);
    if (hit && Date.now() - hit.at < SAVED_LISTS_CACHE_TTL_MS) {
      return hit.lists.slice();
    }
  }

  for (const sId of storeIdsToFetch) {
    const listsRef = collection(db, 'stores', sId, 'savedLists');
    try {
      // Lọc theo quyền xem TRƯỚC khi giải mã items — tránh tốn thêm lượt đọc subcollection
      // itemChunks (danh sách lớn đã chunk, xem saveListToFirestore) cho các danh sách sẽ bị lọc
      // bỏ ngay sau đó (vd nhân viên chỉ xem danh sách của chính mình).
      //
      // CỐ Ý lọc ở CLIENT chứ không dùng `where(...)` ở server: bộ so khớp này mờ (khớp `userId`
      // HOẶC `authUid`, không phân biệt hoa thường) để không bỏ sót danh sách cũ lưu từ thời chưa
      // có field `authUid`. Chuyển thành `where` sẽ làm những danh sách di sản đó biến mất, và
      // `where` + `orderBy` còn cần composite index phải deploy riêng.
      const canView = (docSnap: QueryDocumentSnapshot<DocumentData>): boolean => {
        if (!userIdentifier) return true; // Admin / SuperAdmin xem toàn bộ danh sách
        const data = docSnap.data();
        const itemUserId = String(data.userId || '').toLowerCase();
        const itemAuthUid = String(data.authUid || '').toLowerCase();
        const targetId = String(userIdentifier || '').toLowerCase();
        const targetUid = String(currentUid).toLowerCase();

        return (
          itemUserId === targetId ||
          itemAuthUid === targetId ||
          (targetUid && itemAuthUid === targetUid) ||
          (targetUid && itemUserId === targetUid)
        );
      };

      // QUOTA FIX mục 3b: lấy từng trang 50 theo `createdAt` giảm dần, dừng ngay khi đã đủ dùng.
      // Admin dừng sau 1 trang (không bị lọc gì) → 50 lượt đọc thay cho 500.
      //
      // Có fallback về ĐÚNG hành vi cũ (1 query `limit(500)` không sắp xếp) nếu query có `orderBy`
      // thất bại: comment cũ trong hàm này ghi lại rằng `orderBy('createdAt','desc')` từng làm
      // modal rất chậm, nghi do Firestore phải build index lần đầu trên collection đã nhiều dữ
      // liệu. Có fallback thì kể cả khi index chưa sẵn, tính năng vẫn chạy y như trước.
      const filteredDocs: QueryDocumentSnapshot<DocumentData>[] = [];
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
      let scanned = 0;
      let usedFallback = false;

      while (scanned < SAVED_LISTS_MAX_DOCS) {
        const pageSize = Math.min(SAVED_LISTS_PAGE_SIZE, SAVED_LISTS_MAX_DOCS - scanned);
        let pageDocs: QueryDocumentSnapshot<DocumentData>[];
        try {
          const q = cursor
            ? query(listsRef, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
            : query(listsRef, orderBy('createdAt', 'desc'), limit(pageSize));
          pageDocs = (await getDocs(q)).docs;
        } catch (pageError) {
          console.warn(`[SavedLists] Phân trang theo createdAt thất bại, quay về 1 query limit(${SAVED_LISTS_MAX_DOCS}):`, pageError);
          usedFallback = true;
          break;
        }

        scanned += pageDocs.length;
        filteredDocs.push(...pageDocs.filter(canView));

        // Hết dữ liệu, hoặc đã đủ cho màn hình liệt kê.
        if (pageDocs.length < pageSize) break;
        if (filteredDocs.length >= SAVED_LISTS_MIN_WANTED) break;

        // Chặn con trỏ KHÔNG TIẾN: nếu trang sau vẫn bắt đầu từ đúng document cũ thì mọi trang
        // tiếp theo sẽ lặp lại cùng dữ liệu cho tới khi chạm trần 500 — tốn 500 lượt đọc để lấy
        // đúng 50 document. Trần cứng vẫn giữ an toàn về chi phí, nhưng dừng ở đây thì rẻ hơn
        // nhiều. (Bug này lộ ra thật khi viết test: bộ mock đọc sai `startAfter` và tạo đúng vòng
        // lặp đó — đáng chặn ở code thật thay vì tin API luôn hành xử như mong đợi.)
        const nextCursor = pageDocs[pageDocs.length - 1];
        if (cursor && nextCursor.ref.path === cursor.ref.path) break;
        cursor = nextCursor;
      }

      if (usedFallback) {
        filteredDocs.length = 0;
        const snapshot = await getDocs(query(listsRef, limit(SAVED_LISTS_MAX_DOCS)));
        filteredDocs.push(...snapshot.docs.filter(canView));
      }

      // BUG FIX: danh sách lớn (vd admin lưu toàn bộ tồn kho chưa lọc) được chunk vào subcollection
      // riêng thay vì nhét thẳng vào field `items` (xem saveListToFirestore — tránh vượt giới hạn
      // 1MiB/document của Firestore, nguyên nhân chính khiến "Lưu DS" thất bại). Ở đây phải nhận
      // diện + ráp lại đúng để KHÔNG phá hành vi hiện có: fetchSavedListsFromFirestore() vẫn trả
      // kèm `items` đầy đủ cho mọi danh sách như trước (useStickerPrinterData.ts dùng ngay `c.items`
      // lúc liệt kê tổng quan để build preview, không tải lazy riêng).
      const lists: SavedList[] = await Promise.all(filteredDocs.map(async (docSnap) => {
        const data = docSnap.data();
        let parsedStickerMeta = undefined;
        if (data.stickerMeta) {
          try {
            parsedStickerMeta = JSON.parse(data.stickerMeta);
          } catch {
            // stickerMeta hỏng → để undefined, danh sách vẫn tải được phần còn lại. CÓ CHỦ Ý
            // không ném lỗi: 1 danh sách lỗi metadata không được làm hỏng cả màn hình.
          }
        }

        // QUOTA FIX (2026-09-17): KHÔNG còn đọc subcollection itemChunks ở đây.
        //
        // Danh sách lớn được chunk vào `itemChunks` (xem saveListToFirestore). Trước bản sửa này,
        // mỗi lần LIỆT KÊ đều getDocs(itemChunks) cho TỪNG danh sách đã chunk — tốn thêm nhiều
        // lượt đọc cho dữ liệu mà màn hình liệt kê không dùng (chỉ hiện tên/ngày/`totalItems`).
        // Giờ chỉ đánh dấu `itemsChunked` để nơi gọi tự tải bằng fetchSavedListItems() khi người
        // dùng thực sự mở danh sách đó.
        //
        // Danh sách KHÔNG chunk vẫn parse `items` như cũ: field đó nằm ngay trên document cha vừa
        // đọc rồi, nên miễn phí hoàn toàn — giữ lại để không đổi hành vi nơi gọi.
        let parsedItems: SavedListItem[] = [];
        if (!data.itemsChunked) {
          try {
            parsedItems = JSON.parse(data.items || '[]');
          } catch (e) {
            console.error('Error parsing items JSON:', e);
          }
        }

        return {
          ...data,
          items: parsedItems,
          itemsChunked: data.itemsChunked === true,
          stickerMeta: parsedStickerMeta
        } as SavedList & { stickerMeta?: any };
      }));

      combinedLists = combinedLists.concat(lists);
    } catch (error) {
      console.warn(`Fetch saved lists failed for store ${sId}:`, error);
    }
  }

  // Remove duplicates by ID and sort by createdAt descending
  const map = new Map<string, SavedList>();
  combinedLists.forEach(item => map.set(item.id, item));
  const result = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  savedListsCache.set(cacheKey, { at: Date.now(), lists: result });
  return result.slice();
};

export const deleteSavedListFromFirestore = async (storeId: string, listId: string) => {
  if (!storeId || !listId) throw new Error("Mã kho và List ID là bắt buộc.");

  const listRef = doc(db, 'stores', storeId, 'savedLists', listId);
  try {
    // Dọn luôn subcollection itemChunks (nếu danh sách này đã bị chunk lúc lưu, xem
    // saveListToFirestore) — Firestore KHÔNG tự xoá subcollection khi xoá doc cha, để sót sẽ tồn
    // tại vĩnh viễn dù không còn ai đọc/tham chiếu tới. Xoá theo tên dự đoán được (chunk_0..49,
    // cùng cách clearStoreDataOnFirestore() ở trên) — xoá doc không tồn tại là no-op, không tốn
    // phí, nên không cần đọc trước để biết chính xác có bao nhiêu chunk.
    const MAX_CHUNKS = 50;
    const batch = writeBatch(db);
    for (let i = 0; i < MAX_CHUNKS; i++) {
      batch.delete(doc(listRef, 'itemChunks', `chunk_${i}`));
    }
    batch.delete(listRef);
    await batch.commit();
    invalidateSavedListsCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/savedLists/${listId}`);
  }
};

/**
 * Tải `items` của ĐÚNG 1 danh sách, dùng khi người dùng thực sự mở danh sách đó.
 *
 * Tách ra khỏi lượt liệt kê (xem `itemsChunked` trong types.ts): trước bản sửa 2026-09-17,
 * fetchSavedListsFromFirestore() đọc itemChunks của MỌI danh sách ngay lúc liệt kê, dù màn hình
 * chỉ hiện tên/ngày/số lượng. Giờ chỉ đọc chunk của danh sách người dùng bấm vào.
 */
export const fetchSavedListItems = async (storeId: string, listId: string): Promise<SavedListItem[]> => {
  if (!storeId || !listId) return [];
  const listRef = doc(db, 'stores', storeId, 'savedLists', listId);
  try {
    const snap = await getDoc(listRef);
    if (!snap.exists()) return [];
    const data = snap.data();
    if (!data.itemsChunked) {
      try {
        return JSON.parse(data.items || '[]') as SavedListItem[];
      } catch {
        return [];
      }
    }
    const chunksSnap = await getDocs(collection(listRef, 'itemChunks'));
    let parsed: SavedListItem[] = [];
    chunksSnap.docs.forEach(chunkDoc => {
      const chunkData = chunkDoc.data();
      if (!chunkData.items) return;
      try {
        parsed = parsed.concat(JSON.parse(chunkData.items));
      } catch (e) {
        console.error('Error parsing saved list chunk:', e);
      }
    });
    return parsed;
  } catch (error) {
    console.error('Error fetching saved list items:', error);
    return [];
  }
};

// BUG FIX: cùng lớp lỗi với saveListToFirestore() đã sửa (vượt giới hạn 1MiB/document của
// Firestore) — displayedProducts ở đây là Product[] ĐẦY ĐỦ (cùng shape đã phải chunk 400/doc ở
// uploadProductsToFirestore), không rút gọn như saveListToFirestore (chỉ {msp, quantity}). Hàm
// này tự động chạy debounce 1s MỖI LẦN displayedProducts đổi (xem hooks/useStickerEventState.ts)
// + lúc đóng tab/ẩn tab — chunk theo đúng cách "Lưu danh sách" (ghi từng đợt setDoc riêng) sẽ
// tạo RẤT NHIỀU write Firestore không cần thiết cho 1 tính năng chỉ để tiện khôi phục phiên làm
// việc giữa các thiết bị (không quan trọng bằng "Lưu danh sách" chủ động của người dùng). Chọn
// cách an toàn hơn: nếu danh sách quá lớn để lưu an toàn trong 1 document, bỏ qua riêng phần
// displayedProducts (không throw, không chặn lưu inventoryFilters) — trước đây setDoc() throw
// khiến CẢ HAI đều không được lưu, và lỗi bị nuốt hoàn toàn ("Silent fail... not interrupt UX")
// nên người dùng không hề biết đồng bộ đa thiết bị đã âm thầm ngừng hoạt động từ lúc đó.
const USER_STATE_MAX_PRODUCTS = 3000;

export const saveUserState = async (userId: string, state: { displayedProducts: Product[], inventoryFilters: InventoryFilters }) => {
  if (!userId) return;

  const stateRef = doc(db, 'users', userId, 'state', 'current');
  const tooLarge = state.displayedProducts.length > USER_STATE_MAX_PRODUCTS;
  try {
    await setDoc(stateRef, {
      ...(tooLarge ? { displayedProductsTooLarge: true } : { displayedProducts: JSON.stringify(state.displayedProducts) }),
      inventoryFilters: JSON.stringify(state.inventoryFilters),
      updatedAt: Timestamp.now()
    });
    if (tooLarge) {
      console.warn(`[Cloud Sync Sticker] displayedProducts quá lớn (${state.displayedProducts.length} sản phẩm) để đồng bộ trạng thái phiên — chỉ lưu bộ lọc, dùng "Lưu danh sách" nếu cần lưu chắc chắn.`);
    }
  } catch (error) {
    console.error("Error saving user state:", error);
    // Silent fail for state sync to not interrupt UX
  }
};

export const fetchUserState = async (userId: string): Promise<{ displayedProducts: Product[], inventoryFilters: InventoryFilters, updatedAt: number } | null> => {
  if (!userId) return null;
  
  const stateRef = doc(db, 'users', userId, 'state', 'current');
  try {
    const docSnap = await getDoc(stateRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // data.displayedProducts vắng mặt khi saveUserState() đã bỏ qua vì quá lớn
      // (displayedProductsTooLarge=true) — fallback '[]' là đúng hành vi mong muốn (session
      // restore không có sẵn danh sách, người dùng lọc lại), không phải lỗi.
      return {
        displayedProducts: JSON.parse(data.displayedProducts || '[]'),
        inventoryFilters: JSON.parse(data.inventoryFilters || '{}'),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user state:", error);
    return null;
  }
};

// ========== MANUAL PRODUCTS (Shared per store, persistent) ==========

// Định nghĩa đã chuyển sang ../types (xem lý do ở đó). Re-export để mọi nơi đang
// `import { ManualProductDoc } from './services/firebaseService'` không phải sửa.
export type { ManualProductDoc };

/**
 * Cập nhật mốc thời gian đổi dữ liệu sản phẩm nhập tay vào `metadata/sync`.
 *
 * QUOTA FIX (2026-09-17, mục 5 — xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore"):
 * trước bản sửa này `fetchManualProducts()` chạy MỖI LẦN mở app với `limit(200)`, không có mốc nào
 * để biết dữ liệu có đổi hay không — trong khi products/inventory đã có sẵn cơ chế smart-sync đúng
 * như vậy. Ghi thêm 1 field vào document `metadata/sync` (document mà mọi phiên đều đã đọc sẵn để
 * đồng bộ products/inventory) nên KHÔNG tốn thêm lượt đọc nào.
 */
const touchManualProductsTimestamp = async (storeId: string) => {
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'sync'), {
        manualProductsLastUpdated: Timestamp.now()
    }, { merge: true });
};

export const saveManualProduct = async (storeId: string, product: Omit<ManualProductDoc, 'id'>, docId?: string): Promise<string> => {
  if (!storeId) throw new Error("Mã kho không hợp lệ.");
  
  const manualRef = collection(db, 'stores', storeId, 'manualProducts');
  const targetDoc = docId ? doc(manualRef, docId) : doc(manualRef);
  
  try {
    await setDoc(targetDoc, {
      ...product,
      id: targetDoc.id,
      updatedAt: new Date().toISOString(),
    });
    await touchManualProductsTimestamp(storeId);
    return targetDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${storeId}/manualProducts`);
    return '';
  }
};

export const fetchManualProducts = async (storeId: string): Promise<ManualProductDoc[]> => {
  if (!storeId) return [];
  
  const manualRef = collection(db, 'stores', storeId, 'manualProducts');
  try {
    const q = query(manualRef, limit(200));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data() } as ManualProductDoc));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/manualProducts`);
    return [];
  }
};

export const deleteManualProduct = async (storeId: string, docId: string): Promise<void> => {
  if (!storeId || !docId) throw new Error("Mã kho và ID sản phẩm là bắt buộc.");
  
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'manualProducts', docId));
    await touchManualProductsTimestamp(storeId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/manualProducts/${docId}`);
  }
};
