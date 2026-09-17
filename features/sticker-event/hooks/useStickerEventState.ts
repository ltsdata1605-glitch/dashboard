import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Product, InventoryItem } from '../types';
import { ManualProductWithId } from '../ManualInputModal';
import { saveEmployeeName, parseCurrency, saveDisplayedProducts } from '../services/fileParser';
import { saveUserState } from '../services/firebaseService';
import { SortField, SortDirection } from '../InventoryToolbar';
// Nhịp lưu trạng thái phiên + 2 hàm quyết định, tách ra module thuần để test được bằng vitest
// (xem services/sessionSyncPolicy.ts và tests/unit/sticker-session-sync-policy.test.ts).
import { LOCAL_SAVE_DEBOUNCE_MS, cloudSaveDelayMs, shouldSyncToCloud } from '../services/sessionSyncPolicy';

interface UseStickerEventStateProps {
  user: User | null;
  isInitializing: boolean;
  allProducts: Product[];
  inventory: InventoryItem[];
  manualProducts: ManualProductWithId[];
}

export function useStickerEventState({
  user,
  isInitializing,
  allProducts,
  inventory,
  manualProducts,
}: UseStickerEventStateProps) {
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [inventoryFilters, setInventoryFilters] = useState<{
    maSieuThi: string[];
    nganhHang: string[];
    nhomHang: string[];
    keyword: string;
  }>({
    maSieuThi: [],
    nganhHang: [],
    nhomHang: [],
    keyword: ''
  });
  const [useInventoryQuantity, setUseInventoryQuantity] = useState(false);
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showNoResults, setShowNoResults] = useState(false);
  const [duplicateError, setDuplicateError] = useState<boolean>(false);
  const [highlightedMsp, setHighlightedMsp] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [isEditingEmployeeName, setIsEditingEmployeeName] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tools'>('home');
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; title?: string }>({
    isOpen: false,
    message: '',
    title: 'Thông báo'
  });

  const debounceTimeout = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const saveDisplayedProductsTimeoutRef = useRef<number | null>(null);
  // Đồng hồ riêng cho lượt ghi LÊN CLOUD — xem giải thích ở hằng số CLOUD_SAVE_* bên dưới.
  const saveUserStateTimeoutRef = useRef<number | null>(null);
  // Đếm "bản sửa": tăng 1 mỗi lần displayedProducts/inventoryFilters đổi. So với
  // cloudSavedRevisionRef để biết CÓ GÌ MỚI cần ghi lên Firestore hay không.
  const stateRevisionRef = useRef(0);
  const cloudSavedRevisionRef = useRef(-1);
  // Mốc thời gian của thay đổi ĐẦU TIÊN chưa được ghi lên cloud — dùng để chặn trần chờ
  // (CLOUD_SAVE_MAX_WAIT_MS), tránh trường hợp người dùng thao tác liên tục khiến debounce
  // bị đẩy lùi mãi và KHÔNG BAO GIỜ đồng bộ được.
  const cloudPendingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (saveDisplayedProductsTimeoutRef.current) clearTimeout(saveDisplayedProductsTimeoutRef.current);
      if (saveUserStateTimeoutRef.current) clearTimeout(saveUserStateTimeoutRef.current);
    };
  }, []);

  const showAlert = useCallback((message: string, title: string = "Thông báo") => {
    setAlertConfig({ isOpen: true, message, title });
  }, []);

  const handleEmployeeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeName(e.target.value);
  };
  
  const handleSaveEmployeeName = useCallback(() => {
    const trimmedName = employeeName.trim();
    setEmployeeName(trimmedName);
    saveEmployeeName(trimmedName);
    if (trimmedName) {
      setIsEditingEmployeeName(false);
    }
  }, [employeeName]);
  
  const handleEmployeeNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Autocomplete Suggestions
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    const queryStr = searchQuery.trim().toLowerCase();
    if (!queryStr) {
      setSuggestions([]);
      setShowNoResults(false);
      return;
    }

    debounceTimeout.current = window.setTimeout(() => {
      const filteredSuggestions = allProducts.filter(p =>
        p.msp?.trim().toLowerCase().includes(queryStr) ||
        p.sanPham?.trim().toLowerCase().includes(queryStr)
      ).slice(0, 10);
      
      setSuggestions(filteredSuggestions);
      setShowNoResults(queryStr.length > 0 && filteredSuggestions.length === 0);
    }, 200);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery, allProducts]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDuplicateError(false);
    setShowNoResults(false);
  };
  
  const handleSuggestionClick = (product: Product) => {
    setDuplicateError(false);
    const existingMspSet = new Set(displayedProducts.map(p => p.msp));
    
    if (existingMspSet.has(product.msp)) {
        setDuplicateError(true);
        const mspToHighlight = product.msp;
        setHighlightedMsp(mspToHighlight);
        
        const element = document.querySelector(`[data-msp="${mspToHighlight}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightedMsp(null);
        }, 2000);
    } else {
        const inventoryItem = inventory.find(item => item.maSanPham === product.msp);
        const qty = useInventoryQuantity && inventoryItem ? inventoryItem.tongSoLuong : 1;
        setDisplayedProducts(prevProducts => [{...product, selected: false, quantity: qty}, ...prevProducts]);
    }
    setSearchQuery('');
    setSuggestions([]);
    setShowNoResults(false);
  };

  const handleScanSuccess = useCallback((scannedCode: string): boolean => {
    const product = allProducts.find(p => p.msp === scannedCode);

    if (!product) {
      return false;
    }

    setDisplayedProducts(prevProducts => {
      const existingProductIndex = prevProducts.findIndex(p => p.msp === scannedCode);

      if (existingProductIndex > -1) {
        const newProducts = [...prevProducts];
        const existingProduct = newProducts[existingProductIndex];
        newProducts[existingProductIndex] = { ...existingProduct, quantity: existingProduct.quantity + 1 };
        return newProducts;
      } else {
        const inventoryItem = inventory.find(item => item.maSanPham === product.msp);
        const qty = useInventoryQuantity && inventoryItem ? inventoryItem.tongSoLuong : 1;
        return [{ ...product, selected: false, quantity: qty }, ...prevProducts];
      }
    });
    
    return true;
  }, [allProducts, inventory, useInventoryQuantity]);

  const handleToggleSelect = useCallback((msp: string) => {
    setDisplayedProducts(prev =>
      prev.map(p => (p.msp === msp ? { ...p, selected: !p.selected } : p))
    );
  }, []);

  const handleQuantityChange = useCallback((msp: string, delta: number) => {
    setDisplayedProducts(prev =>
      prev.map(p =>
        p.msp === msp
          ? { ...p, quantity: Math.max(1, p.quantity + delta) }
          : p
      )
    );
  }, []);

  const handleSetQuantity = useCallback((msp: string, newQuantity: number) => {
    const qty = Math.max(1, Math.floor(newQuantity));
    setDisplayedProducts(prev =>
      prev.map(p => (p.msp === msp ? { ...p, quantity: qty } : p))
    );
  }, []);

  const handleDeleteProduct = useCallback((msp: string) => {
    setDisplayedProducts(prev => prev.filter(p => p.msp !== msp));
  }, []);

  const handleShowTopBonus = useCallback(() => {
    const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));
    const sortedProductsList = allProducts.slice()
        .filter((p): p is Product => !!(p && p.msp))
        .sort((a, b) => b.tongThuong - a.tongThuong)
        .map((p): Product => ({...p, selected: false, quantity: useInventoryQuantity ? (inventoryMap.get(p.msp) || 1) : 1}));
    setDisplayedProducts(sortedProductsList);
  }, [allProducts, inventory, useInventoryQuantity]);

  const handleShowTopDiscount = useCallback(() => {
      const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));
      const sortedProductsList = allProducts.slice()
        .filter((p): p is Product => !!(p && p.msp))
        .sort((a, b) => {
            const discountA = parseCurrency(a.giaGoc) - parseCurrency(a.giaGiam);
            const discountB = parseCurrency(b.giaGoc) - parseCurrency(b.giaGiam);
            return discountB - discountA;
        })
        .map((p): Product => ({...p, selected: false, quantity: useInventoryQuantity ? (inventoryMap.get(p.msp) || 1) : 1}));
      setDisplayedProducts(sortedProductsList);
  }, [allProducts, inventory, useInventoryQuantity]);

  const executeReset = useCallback(async () => {
    setDisplayedProducts([]);
    saveDisplayedProducts([]);
    setSearchQuery('');
    setSuggestions([]);
    setShowNoResults(false);
    setDuplicateError(false);
    setError(null);
  }, []);

  const handleUseInventoryQuantityChange = useCallback((checked: boolean) => {
    setUseInventoryQuantity(checked);
    setDisplayedProducts(prev => {
      const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));
      return prev.map(p => ({
        ...p,
        quantity: checked ? (inventoryMap.get(p.msp) || 1) : 1
      }));
    });
  }, [inventory]);

  const handleInventoryFilterChange = useCallback((key: string, value: string | string[]) => {
    setInventoryFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearInventoryFilters = useCallback(() => {
    setInventoryFilters({
      maSieuThi: [],
      nganhHang: [],
      nhomHang: [],
      keyword: ''
    });
  }, []);

  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  // Sync displayedProducts with local DB & Cloud
  //
  // PERF/QUOTA FIX (2026-09-17, audit hạn mức Firestore gói Spark — xem implementation_plan.md
  // mục "Audit hạn mức đọc/ghi Firestore"): trước đây MỘT đồng hồ debounce 1s làm CẢ HAI việc
  // (ghi IndexedDB cục bộ + ghi document Firestore users/{uid}/state/current), nên MỖI thao tác
  // của người dùng — tick chọn 1 sản phẩm, bấm +/- số lượng, GÕ TỪNG KÝ TỰ vào ô số lượng, đổi
  // bộ lọc — đều tốn 1 lượt ghi Firestore. Thêm nữa, 2 handler flush (beforeunload +
  // visibilitychange) ghi cloud KHÔNG qua debounce nào, nên chỉ cần chuyển qua lại giữa các tab
  // là ghi lặp đúng payload cũ. Một phiên chọn sticker 1 giờ dễ dàng tiêu 200-500 lượt ghi/người,
  // trong khi hạn mức miễn phí CHUNG cho cả project chỉ 20.000 lượt/ngày.
  //
  // Nay tách làm 2 nhịp khác nhau theo đúng giá của chúng:
  //  - IndexedDB cục bộ: MIỄN PHÍ + cần phản hồi nhanh → giữ debounce 1s như cũ.
  //  - Firestore: TỐN HẠN MỨC + chỉ dùng để khôi phục phiên giữa các thiết bị (không cần realtime
  //    từng thao tác) → debounce 20s, có trần chờ 60s, và BỎ QUA hẳn nếu không có gì mới so với
  //    lượt ghi cloud trước (so sánh stateRevisionRef vs cloudSavedRevisionRef).
  //
  // CỐ Ý GIỮ handler visibilitychange (khác với kế hoạch ban đầu định bỏ): trên iOS/Android,
  // `beforeunload` thường KHÔNG bắn khi người dùng chuyển app hoặc đóng tab, `visibilitychange`
  // mới là cách đáng tin cậy để kịp lưu. Nguồn lãng phí thật không phải bản thân handler này mà
  // là việc nó ghi LẠI payload y hệt — đã chặn bằng bộ đếm bản sửa, nên giữ được độ an toàn dữ
  // liệu trên mobile mà không tốn thêm lượt ghi nào.
  useEffect(() => {
    if (!isInitializing) {
      // Đánh dấu có thay đổi mới cần đồng bộ lên cloud. Chốt `revision` vào biến cục bộ để
      // closure flushCloudState() của LƯỢT NÀY luôn so sánh đúng bản sửa của lượt này.
      stateRevisionRef.current += 1;
      const revision = stateRevisionRef.current;
      if (cloudPendingSinceRef.current === null) cloudPendingSinceRef.current = Date.now();

      if (saveDisplayedProductsTimeoutRef.current) clearTimeout(saveDisplayedProductsTimeoutRef.current);
      saveDisplayedProductsTimeoutRef.current = window.setTimeout(() => {
        saveDisplayedProducts(displayedProducts).catch(console.error);
      }, LOCAL_SAVE_DEBOUNCE_MS);

      const flushCloudState = () => {
        if (!user) return;
        // Không có gì mới kể từ lượt ghi cloud trước → không ghi. Đây là lớp chặn chính cho
        // các lượt flush bị gọi lặp (chuyển tab qua lại, đóng tab ngay sau khi debounce vừa ghi).
        if (!shouldSyncToCloud(revision, cloudSavedRevisionRef.current)) return;
        cloudSavedRevisionRef.current = revision;
        cloudPendingSinceRef.current = null;
        saveUserState(user.uid, {
          displayedProducts,
          inventoryFilters
        }).catch((e) => {
          // Ghi thất bại → trả bộ đếm về để lượt flush sau được thử lại, không "mất im lặng".
          cloudSavedRevisionRef.current = -1;
          console.error("[Cloud Sync Sticker] Error auto-saving to cloud:", e);
        });
      };

      // Debounce 20s NHƯNG không bao giờ để thay đổi cũ nhất chờ quá 60s (xem cloudSaveDelayMs).
      const cloudDelay = cloudSaveDelayMs(cloudPendingSinceRef.current, Date.now());
      if (saveUserStateTimeoutRef.current) clearTimeout(saveUserStateTimeoutRef.current);
      saveUserStateTimeoutRef.current = window.setTimeout(flushCloudState, cloudDelay);

      const handleFlushSave = () => {
        saveDisplayedProducts(displayedProducts).catch(console.error);
        flushCloudState();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          handleFlushSave();
        }
      };

      window.addEventListener('beforeunload', handleFlushSave);
      window.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (saveDisplayedProductsTimeoutRef.current) clearTimeout(saveDisplayedProductsTimeoutRef.current);
        window.removeEventListener('beforeunload', handleFlushSave);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [displayedProducts, inventoryFilters, isInitializing, user]);

  // Apply inventory filters
  useEffect(() => {
    const { maSieuThi, nganhHang, nhomHang, keyword } = inventoryFilters;
    
    if (maSieuThi.length === 0 && nganhHang.length === 0 && nhomHang.length === 0 && !keyword) {
      return;
    }

    const includeManual = nganhHang.includes('Nhóm thủ công');
    const otherNganhHang = nganhHang.filter(n => n !== 'Nhóm thủ công');

    const filteredInventory = inventory.filter(item => {
      const keywordLower = keyword.toLowerCase();
      return (
        (maSieuThi.length === 0 || maSieuThi.includes(item.maSieuThi)) &&
        (otherNganhHang.length === 0 || otherNganhHang.includes(item.nganhHang)) &&
        (nhomHang.length === 0 || nhomHang.includes(item.nhomHang)) &&
        (!keyword || 
          item.maSanPham.toLowerCase().includes(keywordLower) || 
          item.tenSanPham.toLowerCase().includes(keywordLower)
        )
      );
    });

    const inventoryMap = new Map(filteredInventory.map(item => [item.maSanPham, item.tongSoLuong]));
    const matchingMsps = new Set(filteredInventory.map(item => item.maSanPham));
    
    let matchingProducts = allProducts
      .filter(p => matchingMsps.has(p.msp) && !(p as ManualProductWithId).firebaseId)
      .map(p => ({ 
          ...p, 
          selected: false, 
          quantity: useInventoryQuantity ? (inventoryMap.get(p.msp) || 1) : 1 
      }));

    if (includeManual) {
      const manualProds = manualProducts
        .filter(p => {
          if (!keyword) return true;
          const kw = keyword.toLowerCase();
          return p.msp.toLowerCase().includes(kw) || p.sanPham.toLowerCase().includes(kw);
        })
        .map(p => ({ ...p, selected: false, quantity: p.quantity || 1 }));
      
      if (otherNganhHang.length === 0 && maSieuThi.length === 0 && nhomHang.length === 0) {
        matchingProducts = manualProds;
      } else {
        matchingProducts = [...matchingProducts, ...manualProds];
      }
    }

    setDisplayedProducts(matchingProducts);
  }, [inventoryFilters, inventory, allProducts, manualProducts, useInventoryQuantity]);

  // Sorted Products Memo
  const sortedProducts = useMemo(() => {
    if (sortField === 'none') return displayedProducts;

    const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));

    return [...displayedProducts].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'giaGoc':
          valA = parseCurrency(a.giaGoc);
          valB = parseCurrency(b.giaGoc);
          break;
        case 'giaGiam':
          valA = parseCurrency(a.giaGiam);
          valB = parseCurrency(b.giaGiam);
          break;
        case 'tongThuong':
          valA = a.tongThuong;
          valB = b.tongThuong;
          break;
        case 'discount': {
          const gocA = parseCurrency(a.giaGoc);
          const giamA = parseCurrency(a.giaGiam);
          valA = gocA > 0 ? ((gocA - giamA) / gocA) * 100 : 0;
          const gocB = parseCurrency(b.giaGoc);
          const giamB = parseCurrency(b.giaGiam);
          valB = gocB > 0 ? ((gocB - giamB) / gocB) * 100 : 0;
          break;
        }
        case 'tonKho':
          valA = inventoryMap.get(a.msp) ?? 0;
          valB = inventoryMap.get(b.msp) ?? 0;
          break;
        case 'sanPham':
          valA = a.sanPham.toLowerCase();
          valB = b.sanPham.toLowerCase();
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [displayedProducts, sortField, sortDirection, inventory]);

  return {
    displayedProducts,
    setDisplayedProducts,
    inventoryFilters,
    setInventoryFilters,
    useInventoryQuantity,
    setUseInventoryQuantity,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    isLoading,
    setIsLoading,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    suggestions,
    setSuggestions,
    showNoResults,
    setShowNoResults,
    duplicateError,
    setDuplicateError,
    highlightedMsp,
    setHighlightedMsp,
    employeeName,
    setEmployeeName,
    isEditingEmployeeName,
    setIsEditingEmployeeName,
    activeTab,
    setActiveTab,
    alertConfig,
    setAlertConfig,
    showAlert,
    handleEmployeeNameChange,
    handleSaveEmployeeName,
    handleEmployeeNameKeyDown,
    handleSearchInputChange,
    handleSuggestionClick,
    handleScanSuccess,
    handleToggleSelect,
    handleQuantityChange,
    handleSetQuantity,
    handleDeleteProduct,
    handleShowTopBonus,
    handleShowTopDiscount,
    executeReset,
    handleUseInventoryQuantityChange,
    handleSortChange,
    handleInventoryFilterChange,
    handleClearInventoryFilters,
    sortedProducts,
  };
}
