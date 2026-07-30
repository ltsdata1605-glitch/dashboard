import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InventoryItem,
  InventorySession,
  CheckingItem,
  FilterState,
  InventoryStats,
  SyncStatus,
} from '../types/inventory';
import { useAuth } from '../../../contexts/AuthContext';
import {
  findOrCreateSession,
  subscribeSessionItems,
  upsertCheckingItem,
  completeSession as completeCloudSession,
  type RemoteCheckingItem,
} from '../services/firestoreInventoryService';
import type { Unsubscribe } from 'firebase/firestore';

interface UseInventoryDataState {
  items: InventoryItem[];
  checkingData: Record<string, CheckingItem>;
  session: InventorySession | null;
  filters: FilterState;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  itemsPerPage: number;
  syncStatus: SyncStatus;
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
  const { user, departmentId } = useAuth();
  const [state, setState] = useState<UseInventoryDataState>({
    items: [],
    checkingData: {},
    session: null,
    filters: DEFAULT_FILTERS,
    isLoading: false,
    error: null,
    currentPage: 1,
    itemsPerPage: 50,
    syncStatus: 'offline',
  });

  const cloudUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const pushDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  // Gộp tiến độ kiểm kê từ Cloud (của chính mình hoặc đồng đội) vào state cục bộ.
  // Last-write-wins đơn giản theo lastScannedAt — đủ dùng cho quy mô 1 phiên kiểm kê.
  const mergeRemoteItems = useCallback((remoteItems: Record<string, RemoteCheckingItem>) => {
    setState((prev) => {
      const merged = { ...prev.checkingData };
      let changed = false;

      for (const [itemId, remote] of Object.entries(remoteItems)) {
        const localItem = prev.items.find((i) => i.id === itemId);
        if (!localItem) continue;

        const existing = merged[itemId];
        const existingTime = existing?.lastScannedAt ? new Date(existing.lastScannedAt).getTime() : 0;
        if (existingTime > remote.lastScannedAt) continue;

        merged[itemId] = {
          itemId,
          soLuongKiemKe: remote.soLuongKiemKe,
          ghiChu: remote.ghiChu,
          chieuThayCo: remote.soLuongKiemKe - localItem.soLuongTonKho,
          lastScannedAt: new Date(remote.lastScannedAt),
        };
        changed = true;
      }

      if (!changed) return prev;
      saveToStorage(prev.items, merged, prev.session);
      return { ...prev, checkingData: merged };
    });
  }, [saveToStorage]);

  const stopCloudSync = useCallback(() => {
    cloudUnsubscribeRef.current?.();
    cloudUnsubscribeRef.current = null;
  }, []);

  const attachCloudSync = useCallback((maKho: string, sessionId: string) => {
    stopCloudSync();
    cloudUnsubscribeRef.current = subscribeSessionItems(
      maKho,
      sessionId,
      mergeRemoteItems,
      () => setState((prev) => ({ ...prev, syncStatus: 'error' }))
    );
  }, [mergeRemoteItems, stopCloudSync]);

  // Load data từ localStorage khi mount — nếu phiên cũ có kèm thông tin Cloud, tự nối lại
  // realtime listener luôn (không cần đăng nhập lại luồng tìm phiên từ đầu).
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
      const storedChecking = localStorage.getItem(STORAGE_KEY_CHECKING);
      const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);

      if (storedItems && storedChecking && storedSession) {
        const parsedSession: InventorySession = JSON.parse(storedSession);
        setState((prev) => ({
          ...prev,
          items: JSON.parse(storedItems),
          checkingData: JSON.parse(storedChecking),
          session: parsedSession,
        }));

        if (parsedSession.cloudMaKho && parsedSession.cloudSessionId) {
          setState((prev) => ({ ...prev, syncStatus: 'connecting' }));
          attachCloudSync(parsedSession.cloudMaKho, parsedSession.cloudSessionId);
          setState((prev) => ({ ...prev, syncStatus: 'synced' }));
        }
      }
    } catch (error) {
      console.warn('Lỗi load từ localStorage:', error);
    }

    return () => stopCloudSync();
  }, [attachCloudSync, stopCloudSync]);

  // Best-effort đồng bộ Cloud khi tải file mới — không chặn UI cục bộ nếu lỗi/offline.
  // Kho đồng bộ = giao giữa Kho của người dùng (departmentId) và các Kho có trong file vừa
  // tải (KHÔNG dùng maKho dòng đầu tiên — file thật chứa nhiều Kho, xem implementation_plan.md mục 20).
  const trySyncToCloud = useCallback(async (items: InventoryItem[], storeNameHint: string) => {
    if (!user || !departmentId) {
      setState((prev) => ({ ...prev, syncStatus: 'offline' }));
      return;
    }

    const allowedKhos = departmentId.split(',').map((k) => k.trim()).filter(Boolean);
    const khoInFile = new Set(items.map((i) => String(i.maKho)));
    const targetMaKho = allowedKhos.find((k) => khoInFile.has(k));

    if (!targetMaKho) {
      setState((prev) => ({ ...prev, syncStatus: 'offline' }));
      return;
    }

    setState((prev) => ({ ...prev, syncStatus: 'connecting' }));
    try {
      const cloudSession = await findOrCreateSession(targetMaKho, storeNameHint, user, items.length);

      setState((prev) => {
        const updatedSession = prev.session
          ? { ...prev.session, cloudMaKho: targetMaKho, cloudSessionId: cloudSession.id }
          : prev.session;
        saveToStorage(prev.items, prev.checkingData, updatedSession);
        return { ...prev, syncStatus: 'synced', session: updatedSession };
      });

      attachCloudSync(targetMaKho, cloudSession.id);
    } catch (error) {
      console.warn('[Inventory] Không đồng bộ được lên Cloud:', error);
      setState((prev) => ({ ...prev, syncStatus: 'error' }));
    }
  }, [user, departmentId, attachCloudSync, saveToStorage]);

  // Ghi tiến độ 1 item lên Cloud, debounce theo itemId — gọi sau mỗi lần quét/sửa số
  // lượng/ghi chú, không chặn thao tác cục bộ nếu mạng chậm/lỗi.
  const pushToCloud = useCallback((session: InventorySession | null, itemId: string, soLuongKiemKe: number, ghiChu: string) => {
    if (!user || !session?.cloudMaKho || !session?.cloudSessionId) return;
    const { cloudMaKho, cloudSessionId } = session;

    if (pushDebounceRef.current[itemId]) clearTimeout(pushDebounceRef.current[itemId]);
    pushDebounceRef.current[itemId] = setTimeout(() => {
      upsertCheckingItem(cloudMaKho, cloudSessionId, itemId, {
        soLuongKiemKe,
        ghiChu,
        scannedByUid: user.uid,
      }).catch((err) => console.warn('[Inventory] Ghi Cloud thất bại:', err));
    }, 500);
  }, [user]);

  // Upload items
  const uploadItems = useCallback((items: InventoryItem[], maKho: number) => {
    const tenKho = items[0]?.tenKho || `Kho ${maKho}`;

    const newSession: InventorySession = {
      id: `session_${Date.now()}_${maKho}`,
      userId: user?.uid || '',
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
      syncStatus: 'offline',
    }));

    saveToStorage(items, initCheckingData, newSession);
    trySyncToCloud(items, tenKho);
  }, [saveToStorage, trySyncToCloud, user]);

  // Clear data — CHỈ xoá state/localStorage của máy đang dùng, không đụng phiên Cloud
  // (dữ liệu đồng đội đang dùng chung). Muốn kết thúc hẳn phiên Cloud, dùng completeCurrentSession().
  const clearData = useCallback(() => {
    stopCloudSync();
    setState((prev) => ({
      ...prev,
      items: [],
      checkingData: {},
      session: null,
      filters: DEFAULT_FILTERS,
      currentPage: 1,
      error: null,
      syncStatus: 'offline',
    }));

    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_CHECKING);
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }, [stopCloudSync]);

  // Đánh dấu phiên Cloud hiện tại đã hoàn thành (chỉ nên gọi bởi quản lý/admin — ràng buộc ở
  // UI gọi hàm này, Firestore Rules cũng đã chặn xoá/hoàn thành phiên cho nhân viên thường).
  const completeCurrentSession = useCallback(async () => {
    const { cloudMaKho, cloudSessionId } = state.session || {};
    if (!cloudMaKho || !cloudSessionId) return;

    await completeCloudSession(cloudMaKho, cloudSessionId);
    stopCloudSync();
    setState((prev) => ({ ...prev, syncStatus: 'offline' }));
  }, [state.session, stopCloudSync]);

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
      pushToCloud(prev.session, itemId, newSoLuongKiemKe, currentChecking.ghiChu || '');

      return {
        ...prev,
        checkingData: updatedChecking,
        error: null,
      };
    });
  }, [saveToStorage, pushToCloud]);

  // Update checking note
  const updateCheckingNote = useCallback((itemId: string, ghiChu: string) => {
    setState((prev) => {
      const currentChecking = prev.checkingData[itemId];
      const updatedChecking = {
        ...prev.checkingData,
        [itemId]: {
          ...currentChecking,
          ghiChu,
        },
      };

      saveToStorage(prev.items, updatedChecking, prev.session);
      pushToCloud(prev.session, itemId, currentChecking?.soLuongKiemKe || 0, ghiChu);

      return {
        ...prev,
        checkingData: updatedChecking,
      };
    });
  }, [saveToStorage, pushToCloud]);

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
      pushToCloud(prev.session, itemId, quantity, prev.checkingData[itemId]?.ghiChu || '');

      return {
        ...prev,
        checkingData: updatedChecking,
      };
    });
  }, [saveToStorage, pushToCloud]);

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
    completeCurrentSession,
    setCurrentPage: (page: number) =>
      setState((prev) => ({ ...prev, currentPage: page })),
  };
};
