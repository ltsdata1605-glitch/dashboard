import { db, auth } from '../firebase';
import { collection, doc, writeBatch, getDocs, query, where, Timestamp, deleteDoc, setDoc, getDoc, limit } from 'firebase/firestore';
import { Product, InventoryItem } from '../types';

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

const BATCH_SIZE = 500;

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

export const fetchAllUsers = async (storeId: string) => {
    if (!storeId) return [];
    const usersRef = collection(db, 'users');
    try {
        const q = query(usersRef, where('storeId', '==', storeId), limit(100)); // Add limit to prevent massive reads
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return [];
    }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'staff') => {
    if (!userId) throw new Error("User ID is required");
    const userRef = doc(db, 'users', userId);
    try {
        const batch = writeBatch(db);
        batch.update(userRef, { role });
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
};

export const deleteUserDoc = async (userId: string) => {
    if (!userId) throw new Error("User ID is required");
    const userRef = doc(db, 'users', userId);
    try {
        await deleteDoc(userRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
};

export const clearAllUsers = async (storeId: string) => {
    if (!storeId) return;
    const usersRef = collection(db, 'users');
    try {
    const q = query(usersRef, where('storeId', '==', storeId), limit(300));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + BATCH_SIZE);
            chunk.forEach(doc => {
                if (doc.data().username !== 'admin') {
                    batch.delete(doc.ref);
                }
            });
            await batch.commit();
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'users');
    }
};



export const saveListToFirestore = async (storeId: string, userId: string, listName: string, items: any[]) => {
  if (!storeId || !userId) throw new Error("Mã kho và User ID là bắt buộc.");
  
  const listsRef = collection(db, 'stores', storeId, 'savedLists');
  const newListRef = doc(listsRef);
  
  try {
    await setDoc(newListRef, {
      id: newListRef.id,
      name: listName,
      userId,
      storeId,
      createdAt: new Date().toISOString(),
      items: JSON.stringify(items),
      totalItems: items.length
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${storeId}/savedLists`);
  }
};

export const fetchSavedListsFromFirestore = async (storeId: string, userId?: string): Promise<any[]> => {
  if (!storeId) return [];
  
  const listsRef = collection(db, 'stores', storeId, 'savedLists');
  try {
    let q = query(listsRef, limit(30)); // Limit reads to save Firebase quota
    if (userId) {
      q = query(listsRef, where('userId', '==', userId), limit(30));
    }
    const snapshot = await getDocs(q);
    
    const lists = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        items: JSON.parse(data.items || '[]')
      };
    });
    
    return lists.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/savedLists`);
    return [];
  }
};

export const deleteSavedListFromFirestore = async (storeId: string, listId: string) => {
  if (!storeId || !listId) throw new Error("Mã kho và List ID là bắt buộc.");
  
  const listRef = doc(db, 'stores', storeId, 'savedLists', listId);
  try {
    await deleteDoc(listRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/savedLists/${listId}`);
  }
};

export const saveUserState = async (userId: string, state: { displayedProducts: any[], inventoryFilters: any }) => {
  if (!userId) return;
  
  const stateRef = doc(db, 'users', userId, 'state', 'current');
  try {
    await setDoc(stateRef, {
      displayedProducts: JSON.stringify(state.displayedProducts),
      inventoryFilters: JSON.stringify(state.inventoryFilters),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error saving user state:", error);
    // Silent fail for state sync to not interrupt UX
  }
};

export const fetchUserState = async (userId: string): Promise<{ displayedProducts: any[], inventoryFilters: any } | null> => {
  if (!userId) return null;
  
  const stateRef = doc(db, 'users', userId, 'state', 'current');
  try {
    const docSnap = await getDoc(stateRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        displayedProducts: JSON.parse(data.displayedProducts || '[]'),
        inventoryFilters: JSON.parse(data.inventoryFilters || '{}')
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
