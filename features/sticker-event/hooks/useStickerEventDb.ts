import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, InventoryItem } from '../types';
import { ManualProductWithId } from '../ManualInputModal';
import { 
  saveData, 
  clearData, 
  saveDisplayedProducts, 
  saveInventoryData 
} from '../services/fileParser';
import { 
  fetchProductsFromFirestore, 
  fetchInventoryFromFirestore, 
  saveManualProduct, 
  fetchManualProducts, 
  deleteManualProduct, 
  ManualProductDoc,
  clearStoreDataOnFirestore 
} from '../services/firebaseService';

interface UseStickerEventDbProps {
  user: User | null;
  userData: any;
  employeeName: string;
  displayedProducts: Product[];
  setDisplayedProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setIsLoading: (val: boolean) => void;
  setIsInitializing: (val: boolean) => void;
  setError: (val: string | null) => void;
  showAlert: (message: string, title?: string) => void;
  fileName: string | null;
  setFileName: (val: string | null) => void;
  fileExportDate: string | null;
  setFileExportDate: (val: string | null) => void;
  setUploadTimestamp: (val: Date | null) => void;
  setInventoryUploadTimestamp: (val: Date | null) => void;
  allProducts: Product[];
  setAllProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  manualProducts: ManualProductWithId[];
  setManualProducts: React.Dispatch<React.SetStateAction<ManualProductWithId[]>>;
}

export function useStickerEventDb({
  user,
  userData,
  employeeName,
  displayedProducts,
  setDisplayedProducts,
  setIsLoading,
  setIsInitializing,
  setError,
  showAlert,
  fileName,
  setFileName,
  fileExportDate,
  setFileExportDate,
  setUploadTimestamp,
  setInventoryUploadTimestamp,
  allProducts,
  setAllProducts,
  inventory,
  setInventory,
  manualProducts,
  setManualProducts,
}: UseStickerEventDbProps) {

  const loadFirestoreData = useCallback(async (
    storeId: string, 
    localProducts: Product[], 
    localInventory: InventoryItem[],
    localProdTs: Date | null,
    localInvTs: Date | null
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Verify store has an admin (for Staff users) — cached in sessionStorage
      if (userData?.role === 'staff') {
        const adminCacheKey = `adminCheck_${storeId}`;
        const cachedAdminCheck = sessionStorage.getItem(adminCacheKey);
        
        if (!cachedAdminCheck) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('storeId', '==', storeId), where('role', '==', 'admin'), limit(1));
          
          let adminCheckSnapshot;
          let retries = 3;
          while (retries > 0) {
              try {
                  adminCheckSnapshot = await getDocs(q);
                  break;
              } catch (err: any) {
                  console.warn(`Lỗi kiểm tra admin (còn ${retries - 1} lần thử):`, err);
                  retries--;
                  if (retries === 0) throw err;
                  await new Promise(resolve => setTimeout(resolve, 1000));
              }
          }
          
          if (adminCheckSnapshot!.empty) {
            setError(`Mã kho "${storeId}" hiện không có Quản trị viên quản lý. Bạn không thể xem dữ liệu.`);
            setAllProducts([]);
            setInventory([]);
            setIsLoading(false);
            setIsInitializing(false);
            return;
          }
          sessionStorage.setItem(adminCacheKey, 'true');
        }
      }

      // Smart Sync: Check single merged metadata doc
      const syncMetaRef = doc(db, 'stores', storeId, 'metadata', 'sync');
      let syncMetaSnap;
      let retries = 3;
      while (retries > 0) {
          try {
              syncMetaSnap = await getDoc(syncMetaRef);
              break;
          } catch (err: any) {
              console.warn(`Lỗi tải metadata (còn ${retries - 1} lần thử):`, err);
              retries--;
              if (retries === 0) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000));
          }
      }

      let firestoreLatestProducts = 0;
      let firestoreLatestInv = 0;
      
      if (syncMetaSnap!.exists()) {
        const syncData = syncMetaSnap!.data();
        firestoreLatestProducts = syncData.productsLastUpdated?.toMillis() || 0;
        firestoreLatestInv = syncData.inventoryLastUpdated?.toMillis() || 0;
      } else {
        const [prodMetaSnap, invMetaSnap] = await Promise.all([
            getDoc(doc(db, 'stores', storeId, 'metadata', 'products')),
            getDoc(doc(db, 'stores', storeId, 'metadata', 'inventory'))
        ]);
        firestoreLatestProducts = prodMetaSnap.exists() ? prodMetaSnap.data().lastUpdated?.toMillis() || 0 : 0;
        firestoreLatestInv = invMetaSnap.exists() ? invMetaSnap.data().lastUpdated?.toMillis() || 0 : 0;
      }

      const localLatestProducts = localProdTs?.getTime() || 0;
      const localLatestInv = localInvTs?.getTime() || 0;

      const shouldFetchProducts = firestoreLatestProducts > localLatestProducts || localProducts.length === 0;
      const shouldFetchInventory = firestoreLatestInv > localLatestInv || localInventory.length === 0;

      if (shouldFetchProducts || shouldFetchInventory) {
          const fetchPromises = [];
          if (shouldFetchProducts) fetchPromises.push(fetchProductsFromFirestore(storeId));
          else fetchPromises.push(Promise.resolve(localProducts));

          if (shouldFetchInventory) fetchPromises.push(fetchInventoryFromFirestore(storeId));
          else fetchPromises.push(Promise.resolve(localInventory));

          const [firestoreProducts, firestoreInventory] = await Promise.all(fetchPromises);
          
          if (shouldFetchProducts && firestoreProducts.length > 0) {
              setAllProducts(firestoreProducts);
              if (firestoreLatestProducts > 0) setUploadTimestamp(new Date(firestoreLatestProducts));
              saveData(firestoreProducts, {
                  fileName: fileName || 'Dữ liệu từ server',
                  uploadTimestamp: new Date(firestoreLatestProducts),
                  fileExportDate: fileExportDate
              });
          }

          if (shouldFetchInventory && firestoreInventory.length > 0) {
              setInventory(firestoreInventory);
              if (firestoreLatestInv > 0) setInventoryUploadTimestamp(new Date(firestoreLatestInv));
              saveInventoryData(firestoreInventory, new Date(firestoreLatestInv));
          }
      } else {
          if (firestoreLatestProducts > 0) setUploadTimestamp(new Date(firestoreLatestProducts));
          if (firestoreLatestInv > 0) setInventoryUploadTimestamp(new Date(firestoreLatestInv));
      }

      // Load manual products
      try {
        const manualDocs = await fetchManualProducts(storeId);
        const manualProds: ManualProductWithId[] = manualDocs.map(d => ({
          sanPham: d.sanPham,
          msp: d.msp,
          giaGoc: d.giaGoc,
          giaGiam: d.giaGiam,
          thuongERP: d.thuongERP,
          thuongNong: d.thuongNong,
          tongThuong: d.tongThuong,
          khuyenMai: d.khuyenMai,
          ngayIn: d.ngayIn,
          selected: false,
          quantity: 1,
          firebaseId: d.id,
        }));
        setManualProducts(manualProds);
        setAllProducts(prev => {
          const filtered = prev.filter(p => !(p as ManualProductWithId).firebaseId);
          return [...filtered, ...manualProds];
        });
      } catch (err) {
        console.error('Error loading manual products:', err);
      }

    } catch (err: any) {
      console.error("Error loading from Firestore:", err);
      let displayError = "Lỗi tải dữ liệu từ server. Vui lòng kiểm tra kết nối mạng hoặc quyền truy cập.";
      try {
        const errObj = JSON.parse(err.message);
        if (errObj.error) {
          displayError = `Lỗi hệ thống: ${errObj.error}`;
          if (errObj.error.includes('insufficient permissions')) {
            displayError = "Bạn không có quyền truy cập dữ liệu của kho này. Vui lòng liên hệ Admin để kiểm tra quyền hạn.";
          } else if (errObj.error.includes('Quota exceeded')) {
            displayError = "Hệ thống đã hết hạn mức truy cập miễn phí trong ngày. Vui lòng quay lại vào ngày mai hoặc nâng cấp gói dịch vụ.";
          }
        }
      } catch (e) {
        if (err.message) displayError = err.message;
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, [userData, fileName, fileExportDate, setIsLoading, setIsInitializing, setError, setUploadTimestamp, setInventoryUploadTimestamp]);

  const handleManualSave = useCallback(async (product: ManualProductWithId): Promise<string> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newProd: ManualProductWithId = { ...product, firebaseId: tempId };
    
    setManualProducts(prev => [...prev, newProd]);
    setAllProducts(prev => [...prev, newProd]);
    
    setDisplayedProducts(prev => {
      const updated = [{ ...newProd, selected: false, quantity: newProd.quantity || 1 }, ...prev];
      saveDisplayedProducts(updated);
      return updated;
    });

    if (userData?.storeId) {
      const docData: Omit<ManualProductDoc, 'id'> = {
        sanPham: product.sanPham,
        msp: product.msp,
        giaGoc: product.giaGoc,
        giaGiam: product.giaGiam,
        thuongERP: product.thuongERP,
        thuongNong: product.thuongNong,
        tongThuong: product.tongThuong,
        khuyenMai: product.khuyenMai,
        ngayIn: product.ngayIn,
        createdBy: employeeName || user?.uid || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveManualProduct(userData.storeId, docData).then(docId => {
        if (docId) {
          setManualProducts(prev => prev.map(p => p.firebaseId === tempId ? { ...p, firebaseId: docId } : p));
          setAllProducts(prev => prev.map(p => (p as ManualProductWithId).firebaseId === tempId ? { ...p, firebaseId: docId } as Product : p));
        }
      }).catch(err => {
        console.error('Background Firebase save failed:', err);
      });
    }

    return tempId;
  }, [userData, employeeName, user, setDisplayedProducts]);

  const handleManualDelete = useCallback(async (docId: string) => {
    setManualProducts(prev => prev.filter(p => p.firebaseId !== docId));
    setAllProducts(prev => prev.filter(p => (p as ManualProductWithId).firebaseId !== docId));
    setDisplayedProducts(prev => {
      const updated = prev.filter(p => (p as ManualProductWithId).firebaseId !== docId);
      saveDisplayedProducts(updated);
      return updated;
    });

    if (userData?.storeId && !docId.startsWith('temp_')) {
      deleteManualProduct(userData.storeId, docId).catch(err => {
        console.error('Background Firebase delete failed:', err);
      });
    }
  }, [userData, setDisplayedProducts]);

  const handleManualUpdate = useCallback(async (product: ManualProductWithId) => {
    if (!product.firebaseId) return;
    
    setManualProducts(prev => prev.map(p => p.firebaseId === product.firebaseId ? product : p));
    setAllProducts(prev => prev.map(p => (p as ManualProductWithId).firebaseId === product.firebaseId ? product : p));

    if (userData?.storeId && !product.firebaseId.startsWith('temp_')) {
      const docData: Omit<ManualProductDoc, 'id'> = {
        sanPham: product.sanPham,
        msp: product.msp,
        giaGoc: product.giaGoc,
        giaGiam: product.giaGiam,
        thuongERP: product.thuongERP,
        thuongNong: product.thuongNong,
        tongThuong: product.tongThuong,
        khuyenMai: product.khuyenMai,
        ngayIn: product.ngayIn,
        createdBy: employeeName || user?.uid || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveManualProduct(userData.storeId, docData, product.firebaseId).catch(err => {
        console.error('Background Firebase update failed:', err);
      });
    }
  }, [userData, employeeName, user]);

  const executeClearAll = useCallback(async () => {
    setIsLoading(true);
    try {
        if (userData && userData.storeId) {
            await Promise.all([
                clearStoreDataOnFirestore(userData.storeId, 'products'),
                clearStoreDataOnFirestore(userData.storeId, 'inventory')
            ]);
        }
        setAllProducts([]);
        setInventory([]);
        setDisplayedProducts([]);
        setFileName(null);
        setUploadTimestamp(null);
        setInventoryUploadTimestamp(null);
        setFileExportDate(null);
        await clearData();
        showAlert("Đã xóa toàn bộ dữ liệu tồn kho và giá.");
    } catch (err) {
        console.error(err);
        setError("Lỗi khi xóa dữ liệu hệ thống.");
    } finally {
        setIsLoading(false);
    }
  }, [userData, setDisplayedProducts, setIsLoading, setError, showAlert, setFileName, setUploadTimestamp, setInventoryUploadTimestamp, setFileExportDate]);

  return {
    allProducts,
    setAllProducts,
    inventory,
    setInventory,
    manualProducts,
    setManualProducts,
    loadFirestoreData,
    handleManualSave,
    handleManualDelete,
    handleManualUpdate,
    executeClearAll,
  };
}
