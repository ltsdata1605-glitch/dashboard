import { db, auth } from '../firebase';
import { collection, doc, writeBatch, getDocs, query, where, Timestamp, deleteDoc, setDoc, getDoc, limit } from 'firebase/firestore';
import { Product, InventoryItem, SavedList, InventoryFilters, SavedListItem, StickerEventUserRecord } from '../types';
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

export const uploadProductsToFirestore = async (storeId: string, products: Product[]) => {
  if (!storeId) throw new Error("Mã kho không hợp lệ.");
  
  const chunksRef = collection(db, 'stores', storeId, 'productChunks');
  
  try {
    // Clear old chunks first
    await clearStoreDataOnFirestore(storeId, 'productChunks');

    const CHUNK_SIZE = 400; // Group 400 products into 1 document
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const chunkId = `chunk_${Math.floor(i / CHUNK_SIZE)}`;
      await setDoc(doc(chunksRef, chunkId), {
        items: JSON.stringify(chunk),
        count: chunk.length,
        updatedAt: Timestamp.now()
      });
    }
    
    // Also update a master timestamp doc for smart sync
    const now = Timestamp.now();
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'products'), {
        lastUpdated: now,
        totalItems: products.length
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
    // Clear old chunks first
    await clearStoreDataOnFirestore(storeId, 'inventoryChunks');

    const CHUNK_SIZE = 300; // Inventory items are larger, use smaller chunks
    for (let i = 0; i < inventory.length; i += CHUNK_SIZE) {
      const chunk = inventory.slice(i, i + CHUNK_SIZE);
      const chunkId = `chunk_${Math.floor(i / CHUNK_SIZE)}`;
      await setDoc(doc(chunksRef, chunkId), {
        items: JSON.stringify(chunk),
        count: chunk.length,
        updatedAt: Timestamp.now()
      });
    }

    // Update master timestamp
    const now = Timestamp.now();
    await setDoc(doc(db, 'stores', storeId, 'metadata', 'inventory'), {
        lastUpdated: now,
        totalItems: inventory.length
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

export const clearStoreDataOnFirestore = async (storeId: string, collectionName: string) => {
    if (!storeId) return;
    // Delete chunks by predictable name pattern to avoid wasting reads
    // Firestore delete on non-existent docs is a no-op (no cost)
    const MAX_CHUNKS = 50; // More than enough for typical data sizes
    const batch = writeBatch(db);
    for (let i = 0; i < MAX_CHUNKS; i++) {
        batch.delete(doc(db, 'stores', storeId, collectionName, `chunk_${i}`));
    }
    try {
        await batch.commit();
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
    return newListRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${targetStoreId}/savedLists`);
    throw error;
  }
};

export const fetchSavedListsFromFirestore = async (storeId: string, userIdentifier?: string): Promise<SavedList[]> => {
  const storeIdsToFetch = Array.from(new Set([storeId, 'SUPERADMIN'].filter(Boolean)));
  let combinedLists: SavedList[] = [];
  const currentUid = auth.currentUser?.uid || '';

  for (const sId of storeIdsToFetch) {
    const listsRef = collection(db, 'stores', sId, 'savedLists');
    try {
      // BUG FIX: limit(100) KHÔNG có orderBy khiến Firestore trả về theo thứ tự không đảm bảo mới
      // nhất (mặc định theo document ID — ở đây là ID tự sinh ngẫu nhiên của doc(), không liên quan
      // gì tới thời gian tạo) — kho đã tích luỹ trên 100 danh sách thì bản vừa lưu có thể bị rớt khỏi
      // kết quả dù ghi thành công. Đã thử thêm orderBy('createdAt','desc') nhưng khiến modal load rất
      // chậm trên thực tế (nghi ngờ do lần đầu Firestore phải build index cho field này trên collection
      // đã có sẵn nhiều dữ liệu) — bỏ orderBy, thay bằng nâng limit lên rộng rãi + dựa vào sort phía
      // client đã có sẵn cuối hàm (Array.from(map.values()).sort(...)) để không phụ thuộc index nào.
      const q = query(listsRef, limit(500));
      const snapshot = await getDocs(q);

      // Lọc theo quyền xem TRƯỚC khi giải mã items — tránh tốn thêm lượt đọc subcollection
      // itemChunks (danh sách lớn đã chunk, xem saveListToFirestore) cho các danh sách sẽ bị lọc
      // bỏ ngay sau đó (vd nhân viên chỉ xem danh sách của chính mình).
      const filteredDocs = snapshot.docs.filter(doc => {
        if (!userIdentifier) return true; // Admin / SuperAdmin xem toàn bộ danh sách
        const data = doc.data();
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
      });

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
          } catch (e) {}
        }

        let parsedItems: SavedListItem[] = [];
        if (data.itemsChunked) {
          try {
            const chunksSnap = await getDocs(collection(docSnap.ref, 'itemChunks'));
            chunksSnap.docs.forEach(chunkDoc => {
              const chunkData = chunkDoc.data();
              if (chunkData.items) {
                try {
                  parsedItems = parsedItems.concat(JSON.parse(chunkData.items));
                } catch (e) {
                  console.error('Error parsing saved list chunk:', e);
                }
              }
            });
          } catch (e) {
            console.error('Error fetching saved list chunks:', e);
          }
        } else {
          try {
            parsedItems = JSON.parse(data.items || '[]');
          } catch (e) {
            console.error('Error parsing items JSON:', e);
          }
        }

        return {
          ...data,
          items: parsedItems,
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
  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/savedLists/${listId}`);
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

export interface ManualProductDoc {
  id: string;
  sanPham: string;
  msp: string;
  giaGoc: string;
  giaGiam: string;
  thuongERP: number;
  thuongNong: number;
  tongThuong: number;
  khuyenMai: string;
  ngayIn: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/manualProducts/${docId}`);
  }
};
