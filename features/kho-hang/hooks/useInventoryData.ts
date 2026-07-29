import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  InventoryItem,
  InventorySession,
  CheckingItem,
  FilterState,
  InventoryStats,
} from '../types/inventory';

interface UseInventoryDataState {
  items: InventoryItem[];
  checkingData: Record<string, CheckingItem>;
  session: InventorySession | null;
  filters: FilterState;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  itemsPerPage: number;
}

const DEFAULT_FILTERS: FilterState = {
  searchText: '',
  selectedKho: [],
  selectedNganh: [],
  selectedNhom: [],
  selectedNhaCungCap: [],
  selectedTrangThaiSP: [],
  selectedTrangThaiKiem: [],
  priceRange: [0, 100000000],
  dateRange: [null, null],
};

const STORAGE_KEY_ITEMS = 'kho_hang_items';
const STORAGE_KEY_CHECKING = 'kho_hang_checking';
const STORAGE_KEY_SESSION = 'kho_hang_session';

export const useInventoryData = () => {
  const [state, setState] = useState<UseInventoryDataState>({
    items: [],
    checkingData: {},
    session: null,
    filters: DEFAULT_FILTERS,
    isLoading: false,
    error: null,
    currentPage: 1,
    itemsPerPage: 50,
  });

  // Load data từ localStorage khi mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const storedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
        const storedChecking = localStorage.getItem(STORAGE_KEY_CHECKING);
        const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);

        if (storedItems && storedChecking && storedSession) {
          setState((prev) => ({
            ...prev,
            items: JSON.parse(storedItems),
            checkingData: JSON.parse(storedChecking),
            session: JSON.parse(storedSession),
          }));
        }
      } catch (error) {
        console.warn('Lỗi load từ localStorage:', error);
      }
    };

    loadFromStorage();
  }, []);

  // Save items to localStorage
  const saveToStorage = useCallback((
    items: InventoryItem[],
    checking: Record<string, CheckingItem>,
    session: InventorySession | null
  ) => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
      localStorage.setItem(STORAGE_KEY_CHECKING, JSON.stringify(checking));
      if (session) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      }
    } catch (error) {
      console.warn('Lỗi save vào localStorage:', error);
    }
  }, []);

  // Upload items
  const uploadItems = useCallback((items: InventoryItem[], maKho: number) => {
    const tenKho = items[0]?.tenKho || `Kho ${maKho}`;

    const newSession: InventorySession = {
      id: `session_${Date.now()}_${maKho}`,
      userId: '', // Will be set later with auth
      storeName: tenKho,
      maKho,
      startDate: new Date(),
      status: 'in_progress',
      items: {},
    };

    const initCheckingData: Record<string, CheckingItem> = {};
    items.forEach((item) => {
      initCheckingData[item.id] = {
        itemId: item.id,
        soLuongKiemKe: 0,
        chieuThayCo: 0 - item.soLuongTonKho,
        ghiChu: '',
      };
    });

    setState((prev) => ({
      ...prev,
      items,
      checkingData: initCheckingData,
      session: newSession,
      filters: DEFAULT_FILTERS,
      currentPage: 1,
      error: null,
    }));

    saveToStorage(items, initCheckingData, newSession);
  }, [saveToStorage]);

  // Clear data
  const clearData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [],
      checkingData: {},
      session: null,
      filters: DEFAULT_FILTERS,
      currentPage: 1,
      error: null,
    }));

    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_CHECKING);
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1, // Reset to first page when filters change
    }));
  }, []);

  // Scan IMEI
  const scanIMEI = useCallback((imei: string) => {
    setState((prev) => {
      const matchedItem = prev.items.find(
        (item) => item.imei.toUpperCase() === imei.toUpperCase()
      );

      if (!matchedItem) {
        return {
          ...prev,
          error: `IMEI ${imei} không tìm thấy`,
        };
      }

      const itemId = matchedItem.id;
      const currentChecking = prev.checkingData[itemId] || {
        itemId,
        soLuongKiemKe: 0,
        chieuThayCo: 0,
        ghiChu: '',
      };

      const newSoLuongKiemKe = currentChecking.soLuongKiemKe + 1;
      const newChieuThayCo = newSoLuongKiemKe - matchedItem.soLuongTonKho;

      const updatedChecking = {
        ...prev.checkingData,
        [itemId]: {
          ...currentChecking,
          soLuongKiemKe: newSoLuongKiemKe,
          chieuThayCo: newChieuThayCo,
          lastScannedAt: new Date(),
        },
      };

      saveToStorage(prev.items, updatedChecking, prev.session);

      return {
        ...prev,
        checkingData: updatedChecking,
        error: null,
      };
    });
  }, [saveToStorage]);

  // Update checking note
  const updateCheckingNote = useCallback((itemId: string, ghiChu: string) => {
    setState((prev) => {
      const updatedChecking = {
        ...prev.checkingData,
        [itemId]: {
          ...prev.checkingData[itemId],
          ghiChu,
        },
      };

      saveToStorage(prev.items, updatedChecking, prev.session);

      return {
        ...prev,
        checkingData: updatedChecking,
      };
    });
  }, [saveToStorage]);

  // Update quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setState((prev) => {
      const item = prev.items.find((i) => i.id === itemId);
      if (!item) return prev;

      const newChieuThayCo = quantity - item.soLuongTonKho;

      const updatedChecking = {
        ...prev.checkingData,
        [itemId]: {
          ...prev.checkingData[itemId],
          soLuongKiemKe: quantity,
          chieuThayCo: newChieuThayCo,
        },
      };

      saveToStorage(prev.items, updatedChecking, prev.session);

      return {
        ...prev,
        checkingData: updatedChecking,
      };
    });
  }, [saveToStorage]);

  // Filter items
  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const { filters } = state;

      // Search filter
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        const matchesTenSP = item.tenSanPham.toLowerCase().includes(search);
        const matchesMaSP = item.maSanPham.toLowerCase().includes(search);
        const matchesIMEI = item.imei.toLowerCase().includes(search);

        if (!matchesTenSP && !matchesMaSP && !matchesIMEI) return false;
      }

      // Kho filter
      if (
        filters.selectedKho.length > 0 &&
        !filters.selectedKho.includes(item.maKho)
      ) {
        return false;
      }

      // Ngành hàng filter
      if (
        filters.selectedNganh.length > 0 &&
        !filters.selectedNganh.includes(item.nganhHang)
      ) {
        return false;
      }

      // Nhóm hàng filter
      if (
        filters.selectedNhom.length > 0 &&
        !filters.selectedNhom.includes(item.nhomHang)
      ) {
        return false;
      }

      // Nhà cung cấp filter
      if (
        filters.selectedNhaCungCap.length > 0 &&
        !filters.selectedNhaCungCap.includes(item.nhaCungCap || '')
      ) {
        return false;
      }

      // Trạng thái SP filter
      if (
        filters.selectedTrangThaiSP.length > 0 &&
        !filters.selectedTrangThaiSP.includes(item.trangThaiSanPham || '')
      ) {
        return false;
      }

      // Price range filter
      if (item.giaTien !== undefined) {
        if (
          item.giaTien < filters.priceRange[0] ||
          item.giaTien > filters.priceRange[1]
        ) {
          return false;
        }
      }

      // Date range filter
      if (item.ngayNhap) {
        const itemDate = new Date(item.ngayNhap);
        if (
          filters.dateRange[0] &&
          itemDate < filters.dateRange[0]
        ) {
          return false;
        }
        if (
          filters.dateRange[1] &&
          itemDate > filters.dateRange[1]
        ) {
          return false;
        }
      }

      // Trạng thái kiểm filter
      if (filters.selectedTrangThaiKiem.length > 0) {
        const checking = state.checkingData[item.id];
        let status: 'chua_kiem' | 'da_kiem' | 'hoan_thanh' = 'chua_kiem';

        if (checking && checking.soLuongKiemKe > 0) {
          status = checking.chieuThayCo === 0 ? 'hoan_thanh' : 'da_kiem';
        }

        if (!filters.selectedTrangThaiKiem.includes(status)) {
          return false;
        }
      }

      return true;
    });
  }, [state.items, state.filters, state.checkingData]);

  // Get unique filter values
  const filterOptions = useMemo(() => {
    return {
      khoList: Array.from(
        new Set(state.items.map((item) => item.maKho))
      ).sort(),
      nganhList: Array.from(
        new Set(state.items.map((item) => item.nganhHang))
      ).sort(),
      nhomList: Array.from(
        new Set(
          state.items
            .filter(
              (item) =>
                state.filters.selectedNganh.length === 0 ||
                state.filters.selectedNganh.includes(item.nganhHang)
            )
            .map((item) => item.nhomHang)
        )
      ).sort(),
      nhaCungCapList: Array.from(
        new Set(state.items.map((item) => item.nhaCungCap || 'N/A'))
      ).sort(),
      trangThaiSPList: Array.from(
        new Set(state.items.map((item) => item.trangThaiSanPham || 'N/A'))
      ).sort(),
    };
  }, [state.items, state.filters.selectedNganh]);

  // Calculate stats
  const stats = useMemo<InventoryStats>(() => {
    const totalSKU = filteredItems.length;
    const totalQuantity = filteredItems.reduce(
      (sum, item) => sum + item.soLuongTonKho,
      0
    );

    let alreadyChecked = 0;
    let totalDiff = 0;

    filteredItems.forEach((item) => {
      const checking = state.checkingData[item.id];
      if (checking && checking.soLuongKiemKe > 0) {
        alreadyChecked++;
        totalDiff += checking.chieuThayCo;
      }
    });

    return {
      totalSKU,
      totalQuantity,
      alreadyChecked,
      checkedPercent: totalSKU > 0 ? Math.round((alreadyChecked / totalSKU) * 100) : 0,
      totalDiff,
      diffPercent: totalQuantity > 0 ? Math.round((totalDiff / totalQuantity) * 100) : 0,
    };
  }, [filteredItems, state.checkingData]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    return filteredItems.slice(start, end);
  }, [filteredItems, state.currentPage, state.itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / state.itemsPerPage);

  return {
    ...state,
    filteredItems,
    paginatedItems,
    totalPages,
    stats,
    filterOptions,
    uploadItems,
    clearData,
    updateFilters,
    scanIMEI,
    updateCheckingNote,
    updateQuantity,
    setCurrentPage: (page: number) =>
      setState((prev) => ({ ...prev, currentPage: page })),
  };
};
