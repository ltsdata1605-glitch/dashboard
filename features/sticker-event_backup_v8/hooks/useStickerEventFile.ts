import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Product, InventoryItem } from '../types';
import { 
  parseProductFile, 
  saveData, 
  saveDisplayedProducts, 
  parseInventoryFile, 
  saveInventoryData,
  saveEmployeeName
} from '../services/fileParser';
import { 
  uploadProductsToFirestore, 
  uploadInventoryToFirestore,
  clearStoreDataOnFirestore
} from '../services/firebaseService';

interface UseStickerEventFileProps {
  user: User | null;
  userData: any;
  employeeName: string;
  setEmployeeName: (name: string) => void;
  setIsEditingEmployeeName: (val: boolean) => void;
  allProducts: Product[];
  setAllProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  displayedProducts: Product[];
  setDisplayedProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setIsLoading: (val: boolean) => void;
  setError: (val: string | null) => void;
  showAlert: (message: string, title?: string) => void;
  fileName: string | null;
  setFileName: (val: string | null) => void;
  uploadTimestamp: Date | null;
  setUploadTimestamp: (val: Date | null) => void;
  inventoryUploadTimestamp: Date | null;
  setInventoryUploadTimestamp: (val: Date | null) => void;
  fileExportDate: string | null;
  setFileExportDate: (val: string | null) => void;
}

export function useStickerEventFile({
  user,
  userData,
  employeeName,
  setEmployeeName,
  setIsEditingEmployeeName,
  allProducts,
  setAllProducts,
  inventory,
  setInventory,
  displayedProducts,
  setDisplayedProducts,
  setIsLoading,
  setError,
  showAlert,
  fileName,
  setFileName,
  uploadTimestamp,
  setUploadTimestamp,
  inventoryUploadTimestamp,
  setInventoryUploadTimestamp,
  fileExportDate,
  setFileExportDate,
}: UseStickerEventFileProps) {

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role !== 'admin') {
        showAlert("Chỉ quản trị viên mới có quyền tải file bảng giá.");
        return;
    }

    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      setError(null);
      setAllProducts([]);
      setDisplayedProducts([]);
      setFileName(null);
      setUploadTimestamp(null);
      setFileExportDate(null);
      
      try {
        let latestExportDate: string | null = null;
        const fileNames: string[] = [];
        const productMap = new Map<string, Product>();
        let partialError = null;

        if (userData && userData.storeId) {
            await clearStoreDataOnFirestore(userData.storeId, 'products');
        }

        for (const file of files) {
          fileNames.push(file.name);
          try {
            const { products, exportDate } = await parseProductFile(file);
            for (const product of products) {
              if (!productMap.has(product.msp)) {
                productMap.set(product.msp, product);
              }
            }
            if (!latestExportDate || (exportDate && exportDate > latestExportDate)) {
              latestExportDate = exportDate;
            }
          } catch (fileParseError) {
            console.error(`Lỗi khi xử lý tệp ${file.name}:`, fileParseError);
            partialError = `Lỗi khi xử lý tệp '${file.name}'. Các tệp hợp lệ khác đã được tải lên.`;
          }
        }

        const combinedProducts = Array.from(productMap.values());
        if (combinedProducts.length === 0 && partialError) {
            setError(partialError || 'Không có sản phẩm nào được tải lên. Vui lòng kiểm tra lại định dạng tệp.');
            setIsLoading(false);
            if (event.target) event.target.value = '';
            return;
        } else if (partialError) {
            setError(partialError);
        }

        const newUploadTimestamp = new Date();
        setAllProducts(combinedProducts);

        const fileNamesForStorage = fileNames.join(', ');
        let displayFileName: string | null = null;
        if (fileNames.length === 1) {
            displayFileName = fileNames[0];
        } else if (fileNames.length > 1) {
            displayFileName = `${fileNames.length} tệp đã được tải lên`;
        }
        setFileName(displayFileName);
        setUploadTimestamp(newUploadTimestamp);
        setFileExportDate(latestExportDate);
        
        await saveData(combinedProducts, {
          fileName: fileNamesForStorage,
          uploadTimestamp: newUploadTimestamp,
          fileExportDate: latestExportDate
        });

        if (userData && userData.storeId) {
            await uploadProductsToFirestore(userData.storeId, combinedProducts);
        }

      } catch (err) {
        setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (event.target) {
            event.target.value = '';
        }
      }
    }
  }, [userData, showAlert, setIsLoading, setError, setDisplayedProducts, setAllProducts, fileName, fileExportDate]);

  const handleDownloadSampleInventory = useCallback((itemsToUse?: InventoryItem[]) => {
    const targetInventory = itemsToUse || inventory;
    if (targetInventory.length === 0) return;

    const groupedByNganhHang = targetInventory.reduce((acc, item) => {
      const nganhHang = item.nganhHang || 'Khong_xac_dinh';
      if (!acc[nganhHang]) acc[nganhHang] = [];
      if (item.maSanPham) acc[nganhHang].push(item.maSanPham);
      return acc;
    }, {} as Record<string, string[]>);

    const downloadFiles = async () => {
      const XLSX = await import('xlsx');
      const entries = Object.entries(groupedByNganhHang) as [string, string[]][];
      for (let i = 0; i < entries.length; i++) {
        const [nganhHang, maSanPhams] = entries[i];
        if (maSanPhams.length === 0) continue;

        const uniqueMaSanPhams = Array.from(new Set(maSanPhams));
        const wb = XLSX.utils.book_new();
        const data = [['Mã sản phẩm']];
        uniqueMaSanPhams.forEach(msp => {
          data.push([msp]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ c: 0, r: R });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].t = 's';
          ws[cellAddress].z = '@';
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Sample');
        const safeFileName = nganhHang.replace(/[/\\?%*:|"<>]/g, '-');
        XLSX.writeFile(wb, `${safeFileName}.xls`, { bookType: 'biff8' });

        if (i < entries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    downloadFiles();
  }, [inventory]);

  const handleInventoryFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role !== 'admin') {
        showAlert("Chỉ quản trị viên mới có quyền tải file tồn kho.");
        return;
    }

    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      try {
        if (userData && userData.storeId) {
            await clearStoreDataOnFirestore(userData.storeId, 'inventory');
        }

        const items = await parseInventoryFile(file);
        const newTimestamp = new Date();
        setInventory(items);
        setInventoryUploadTimestamp(newTimestamp);
        
        await saveInventoryData(items, newTimestamp);

        if (userData && userData.storeId) {
            await uploadInventoryToFirestore(userData.storeId, items);
        }

        setError(null);
        
        setTimeout(() => {
            handleDownloadSampleInventory(items);
        }, 500);

      } catch (err) {
        setError('Lỗi khi xử lý file tồn kho. Vui lòng kiểm tra định dạng file.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (event.target) event.target.value = '';
      }
    }
  }, [userData, showAlert, setIsLoading, setError, setInventory, handleDownloadSampleInventory]);

  const handleExport = useCallback(() => {
    if (displayedProducts.length === 0) return;

    const dataToExport = {
        employeeName: employeeName,
        products: displayedProducts.map(p => ({
            msp: p.msp,
            quantity: p.quantity,
        })),
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeStr = `${day}-${month}-${year}_${hour}-${minute}`;
    const safeEmployeeName = employeeName.trim() || 'Khong_ten';
    
    link.download = `${safeEmployeeName} - Danh_sach_san_pham_${dateTimeStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [displayedProducts, employeeName]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const productMap = new Map(allProducts.filter(p => !!(p && p.msp)).map(p => [p.msp, p]));
      const allNewDisplayedProducts: Product[] = [];
      const allNotFoundMsps = new Set<string>();
      const fileProcessingErrors: string[] = [];
      let lastValidEmployeeName: string | null = null;

      for (const file of files) {
          try {
              const text = await file.text();
              const parsedJson = JSON.parse(text);
              let productList: { msp: string; quantity: number }[] = [];
              
              if (typeof parsedJson === 'object' && !Array.isArray(parsedJson) && parsedJson.products) {
                  if (Array.isArray(parsedJson.products)) {
                      productList = parsedJson.products;
                  } else {
                      throw new Error("Trường 'products' trong tệp phải là một mảng.");
                  }
                  
                  if (typeof parsedJson.employeeName === 'string') {
                      lastValidEmployeeName = parsedJson.employeeName;
                  }
              } else if (Array.isArray(parsedJson)) {
                  productList = parsedJson;
              } else {
                  throw new Error("Định dạng tệp không hợp lệ.");
              }

              for (const item of productList) {
                  if (!item || typeof item !== 'object' || !item.msp) continue;

                  if (productMap.has(item.msp)) {
                      const product = productMap.get(item.msp);
                      if (product) {
                          allNewDisplayedProducts.push({
                              ...product,
                              selected: false,
                              quantity: item.quantity > 0 ? item.quantity : 1,
                          });
                      }
                  } else {
                      allNotFoundMsps.add(item.msp);
                  }
              }
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định.';
              fileProcessingErrors.push(`Lỗi xử lý tệp '${file.name}': ${errorMessage}`);
          }
      }

      setDisplayedProducts(allNewDisplayedProducts);

      if (lastValidEmployeeName !== null) {
          const trimmedName = lastValidEmployeeName.trim();
          setEmployeeName(trimmedName);
          saveEmployeeName(trimmedName);
          setIsEditingEmployeeName(!trimmedName);
      }
      
      const errorMessages: string[] = Array.from(fileProcessingErrors);
      if (allNotFoundMsps.size > 0) {
          const notFoundArray = Array.from(allNotFoundMsps);
          errorMessages.push(`Không tìm thấy ${notFoundArray.length} mã sản phẩm: ${notFoundArray.join(', ')}`);
      }

      if (errorMessages.length > 0) {
          setError(errorMessages.join('\n'));
      } else {
          setError(null);
      }

      if (event.target) event.target.value = '';
  }, [allProducts, setDisplayedProducts, setEmployeeName, setIsEditingEmployeeName, setError]);

  return {
    fileName,
    setFileName,
    uploadTimestamp,
    setUploadTimestamp,
    inventoryUploadTimestamp,
    setInventoryUploadTimestamp,
    fileExportDate,
    setFileExportDate,
    handleFileChange,
    handleDownloadSampleInventory,
    handleInventoryFileChange,
    handleExport,
    handleImport,
  };
}
