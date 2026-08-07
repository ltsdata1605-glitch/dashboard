import React, { useState, useRef, useEffect, useMemo, startTransition } from 'react';
import type { WarehouseColumnConfig } from '../../types';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getWarehouseColumnConfig, saveWarehouseColumnConfig, getSetting, saveSetting } from '../../services/dbService';
import { COL, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';
import { getRowValue, formatCurrency, formatQuantity, getExportFilenamePrefix, getBorderAccentFromColorClass } from '../../utils/dataUtils';
import LoadingOverlay from '../common/LoadingOverlay';
import WarehouseSettingsModal from './WarehouseSettingsModal';
import { useWarehouseLogic } from '../../hooks/useWarehouseLogic';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
const migrateColumns = (savedConfig: WarehouseColumnConfig[]): WarehouseColumnConfig[] => {
    const savedIds = new Set(savedConfig.map(c => c.id));
    const missingDefaults = DEFAULT_WAREHOUSE_COLUMNS.filter(c => !savedIds.has(c.id));

    let updatedConfig = savedConfig
        .filter(col => {
            if (col.isCustom) return true;
            return DEFAULT_WAREHOUSE_COLUMNS.some(d => d.id === col.id);
        })
        .map(col => {
            const defaultCol = DEFAULT_WAREHOUSE_COLUMNS.find(d => d.id === col.id);
            if (defaultCol) {
                return {
                    ...col,
                    mainHeader: defaultCol.mainHeader,
                    subHeader: defaultCol.subHeader,
                    categoryName: defaultCol.categoryName,
                    categoryType: defaultCol.categoryType,
                    metricType: defaultCol.metricType,
                    metric: defaultCol.metric,
                    productCodes: defaultCol.productCodes,
                };
            }
            return col;
        });

    if (missingDefaults.length > 0) {
        updatedConfig = [...updatedConfig, ...missingDefaults];
    }

    const defaultOrderMap = new Map(DEFAULT_WAREHOUSE_COLUMNS.map((d, index) => [d.id, index]));
    
    updatedConfig.sort((a, b) => {
        const orderA = defaultOrderMap.has(a.id) ? defaultOrderMap.get(a.id)! : 1000 + (a.order || 0);
        const orderB = defaultOrderMap.has(b.id) ? defaultOrderMap.get(b.id)! : 1000 + (b.order || 0);
        return orderA - orderB;
    });

    return updatedConfig.map((col, index) => ({
        ...col,
        order: index + 1
    }));
};

interface WarehouseSummaryProps {
    onBatchExport: () => Promise<void>;
}

const WarehouseSummary: React.FC<WarehouseSummaryProps> = ({ onBatchExport }) => {
    const { userRole } = useAuth();
    const { 
        processedData, productConfig, originalData, warehouseFilteredData, 
        handleExport, isExporting, isProcessing, uniqueFilterOptions, 
        warehouseTargets, updateWarehouseTarget, warehouseDTThucTargets, 
        updateWarehouseDTThucTarget, filterState, handleFilterChange, 
        isLuyKe, handleLuyKeChange, kpiTargets
    } = useDashboardContext();

    const rawData = processedData?.warehouseSummary ?? [];

    // Mục 63: bộ lọc Mã Kho + ẩn/hiện cột Tổng riêng cho bảng Chi Tiết Theo Kho (không ảnh hưởng
    // filter "KHO" toàn trang ở FilterBar — filter đó reset lại cả KPI/biểu đồ/bảng khác, quá rộng
    // cho nhu cầu "tạm xem 1-2 kho, giấu bớt cột" của riêng bảng này).
    const khoOptions = useMemo(() => rawData.map(d => d.khoName), [rawData]);
    const [localKhoFilter, setLocalKhoFilter] = useState<string[]>([]);
    useEffect(() => {
        getSetting<string[]>('warehouseSummaryKhoFilter').then(saved => {
            if (saved) setLocalKhoFilter(saved);
        }).catch(console.error);
    }, []);
    const updateLocalKhoFilter = (selected: string[]) => {
        setLocalKhoFilter(selected);
        saveSetting('warehouseSummaryKhoFilter', selected).catch(console.error);
    };

    // Bộ lọc Siêu thị và Tổng dành riêng cho Chế độ xem Dọc (Lưu vào Firebase / IndexedDB)
    const [verticalKhoFilter, setVerticalKhoFilter] = useState<string[]>([]);
    useEffect(() => {
        getSetting<string[]>('warehouseVerticalKhoFilter').then(saved => {
            if (saved) setVerticalKhoFilter(saved);
        }).catch(console.error);
    }, []);

    const handleVerticalKhoFilterChange = (selected: string[]) => {
        setVerticalKhoFilter(selected);
        saveSetting('warehouseVerticalKhoFilter', selected).catch(console.error);
    };

    const verticalOptions = useMemo(() => ['TỔNG', ...khoOptions], [khoOptions]);

    const [showTotalColumn, setShowTotalColumn] = useState(true);
    useEffect(() => {
        getSetting<boolean>('warehouseSummaryShowTotal').then(saved => {
            if (saved === false) setShowTotalColumn(false);
        }).catch(console.error);
    }, []);
    const toggleShowTotal = () => {
        setShowTotalColumn(prev => {
            const next = !prev;
            saveSetting('warehouseSummaryShowTotal', next).catch(console.error);
            return next;
        });
    };

    const data = useMemo(() => {
        if (localKhoFilter.length === 0) return rawData;
        const set = new Set(localKhoFilter);
        return rawData.filter(d => set.has(d.khoName));
    }, [rawData, localKhoFilter]);

    const summaryRef = useRef<HTMLDivElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'doanhThuQD', direction: 'desc' });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    const toggleFullScreen = () => setIsFullScreen(!isFullScreen);
    const rowsPerPage = 50;
    
    const [columns, setColumns] = useState<WarehouseColumnConfig[]>([]);
    const [columnsLoaded, setColumnsLoaded] = useState(false);

    // Chế độ xem: ngang (mặc định) hoặc dọc (transpose)
    const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');
    useEffect(() => {
        getSetting<'horizontal' | 'vertical'>('warehouseViewMode').then(mode => {
            if (mode) setViewMode(mode);
        }).catch(console.error);
    }, []);
    const toggleViewMode = () => {
        const next = viewMode === 'horizontal' ? 'vertical' : 'horizontal';
        setViewMode(next);
        saveSetting('warehouseViewMode', next).catch(console.error);
    };

    // Target riêng cho từng chỉ số con (Mục 62) — columnId -> khoName -> target. Chỉ DTQĐ/DT Thực dùng
    // warehouseTargets/warehouseDTThucTargets sẵn có, các chỉ số khác dùng store generic này.
    const [warehouseColumnTargets, setWarehouseColumnTargets] = useState<Record<string, Record<string, number>>>({});
    useEffect(() => {
        getSetting<Record<string, Record<string, number>>>('warehouseColumnTargets').then(saved => {
            if (saved) setWarehouseColumnTargets(saved);
        }).catch(console.error);
    }, []);
    const updateWarehouseColumnTarget = (columnId: string, khoName: string, value: number) => {
        setWarehouseColumnTargets(prev => {
            const next = { ...prev, [columnId]: { ...(prev[columnId] || {}), [khoName]: value } };
            saveSetting('warehouseColumnTargets', next).catch(console.error);
            return next;
        });
    };

    const { editingTargetKho, setEditingTargetKho } = useDashboardContext();
    const targetInputRef = useRef<HTMLInputElement>(null);

    // Auto-format number with commas while preserving cursor position
    const formatWithCommas = (value: string): string => {
        // Strip non-numeric except dots
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        // Add commas to integer part
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
    };

    const parseFormattedNumber = (value: string): number => {
        return parseFloat(value.replace(/,/g, '')) || 0;
    };

    const { sortedData, totals, customTotals, customProductColumnValues, getColumnValue } = useWarehouseLogic({
        data,
        columns,
        originalData: warehouseFilteredData,
        productConfig,
        sortConfig
    });

    // Cấu hình Giờ Mở/Đóng Cửa Siêu thị (Mặc định 07:30 -> 21:30)
    const [storeHours, setStoreHours] = useState<{ open: string; close: string }>({ open: '07:30', close: '21:30' });
    const [isStoreHoursModalOpen, setIsStoreHoursModalOpen] = useState(false);
    const [tempOpenHour, setTempOpenHour] = useState('07:30');
    const [tempCloseHour, setTempCloseHour] = useState('21:30');

    useEffect(() => {
        getSetting<{ open: string; close: string }>('storeOpenCloseHours').then(saved => {
            if (saved && saved.open && saved.close) {
                setStoreHours(saved);
                setTempOpenHour(saved.open);
                setTempCloseHour(saved.close);
            }
        }).catch(console.error);
    }, []);

    const handleSaveStoreHours = () => {
        const newHours = { open: tempOpenHour, close: tempCloseHour };
        setStoreHours(newHours);
        saveSetting('storeOpenCloseHours', newHours).catch(console.error);
        setIsStoreHoursModalOpen(false);
    };

    const daysInMonth = useMemo(() => {
        if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
            const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
            if (match) return new Date(parseInt(match[2]), parseInt(match[1]), 0).getDate();
        }
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }, [filterState.selectedMonths]);

    const daysPassed = useMemo(() => {
        const now = new Date();
        if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
            const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
            if (match) {
                const m = parseInt(match[1], 10) - 1;
                const y = parseInt(match[2], 10);
                if (m === now.getMonth() && y === now.getFullYear()) {
                    return now.getDate() || 1;
                }
                return new Date(y, m + 1, 0).getDate();
            }
        }
        return now.getDate() || 1;
    }, [filterState.selectedMonths]);

    // Tính % Quỹ thời gian đã trôi qua (trong ngày hoặc lũy kế tháng)
    const timeUsedPct = useMemo(() => {
        const now = new Date();
        const [openH, openM] = storeHours.open.split(':').map(Number);
        const [closeH, closeM] = storeHours.close.split(':').map(Number);
        const openMinutes = (openH || 7) * 60 + (openM || 30);
        const closeMinutes = (closeH || 21) * 60 + (closeM || 30);
        const totalMinutes = Math.max(1, closeMinutes - openMinutes);
        
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        let todayPct = 0;
        if (nowMinutes <= openMinutes) todayPct = 0;
        else if (nowMinutes >= closeMinutes) todayPct = 100;
        else todayPct = ((nowMinutes - openMinutes) / totalMinutes) * 100;

        if (isLuyKe) {
            const currentDayPct = Math.min(100, Math.max(0, todayPct));
            const totalPassedDays = (daysPassed - 1) + (currentDayPct / 100);
            return (totalPassedDays / daysInMonth) * 100;
        }
        return Math.min(100, Math.max(0, todayPct));
    }, [storeHours, isLuyKe, daysPassed, daysInMonth]);

    const getHqqdClassWithTime = (pct: number | undefined, timePct: number = timeUsedPct): string => {
        if (pct === undefined || isNaN(pct) || pct === 0) return 'text-slate-300 dark:text-slate-600 font-normal';
        
        // 1. Đã hết quỹ thời gian (timePct >= 100)
        if (timePct >= 100) {
            if (pct < 100) {
                // Hết giờ mà < 100% -> TÔ ĐỎ NỔI BẬT (phẳng không bo viền)
                return 'text-rose-600 dark:text-rose-400 font-extrabold';
            }
            // Hết giờ mà >= 100% -> TÔ XANH LÁ CÂY NỔI BẬT (phẳng không bo viền)
            return 'text-emerald-600 dark:text-emerald-400 font-black';
        }
        
        // 2. Chưa hết quỹ thời gian (timePct < 100)
        if (pct < timePct) {
            // Tỉ lệ hoàn thành < % quỹ thời gian đã sử dụng -> TÔ ĐỎ NỔI BẬT (phẳng không bo viền)
            return 'text-rose-600 dark:text-rose-400 font-extrabold';
        }

        if (pct >= 100) {
            // Đã đạt >= 100% -> XANH LÁ CÂY NỔI BẬT (phẳng không bo viền)
            return 'text-emerald-600 dark:text-emerald-400 font-black';
        }

        // Đạt tiến độ thời gian (%HT >= timePct)
        return 'text-emerald-600 dark:text-emerald-400 font-bold';
    };

    const getHqqdClass = (hqqdValue: number | undefined): string => {
        return getHqqdClassWithTime(hqqdValue, timeUsedPct);
    };

    const formatRevenueForKho = (value: number | undefined): string => {
        if (value === undefined || isNaN(value) || value === 0) return '—';
        return Math.round(value / 1000000).toLocaleString('vi-VN');
    };
    
    const formatQuantityForKho = (value: number | undefined): string => {
        if (value === undefined || isNaN(value) || value === 0) return '—';
        return Math.round(value).toLocaleString('vi-VN');
    };

    // Mục 62: phân loại dòng nào được nâng cấp lên 3 cột M.Tiêu|Real|%HT ở bảng dọc.
    const isUpgradableRow = (col: WarehouseColumnConfig): boolean => {
        if (col.type === 'calculated' || col.type === 'target') return false; // cột custom admin, đã có cơ chế target riêng
        if (col.metric === 'target' || col.metric === 'percentHT') return false; // gộp vào dòng dt_qd
        return true;
    };
    const isRevenueMetricCol = (col: WarehouseColumnConfig): boolean => {
        return col.metric === 'doanhThuQD' || col.metric === 'doanhThuThuc' || col.metricType === 'revenue' || col.metricType === 'revenueQD';
    };
    const getTargetMap = (col: WarehouseColumnConfig): Record<string, number> => {
        if (col.metric === 'doanhThuQD') return warehouseTargets;
        if (col.metric === 'doanhThuThuc') return warehouseDTThucTargets;
        return warehouseColumnTargets[col.id] || {};
    };
    const setRowTarget = (col: WarehouseColumnConfig, khoName: string, value: number) => {
        if (col.metric === 'doanhThuQD') { updateWarehouseTarget(khoName, value); return; }
        if (col.metric === 'doanhThuThuc') { updateWarehouseDTThucTarget(khoName, value); return; }
        updateWarehouseColumnTarget(col.id, khoName, value);
    };

    const handleSingleExport = async () => {
        if (summaryRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            await handleExport(summaryRef.current, `${prefix}-Chi-tiet-theo-kho.png`, {
                elementsToHide: ['.hide-on-export'],
                scale: 2
            });
        }
    };

    const { allIndustries, allGroups } = useMemo(() => {
        if (!productConfig) return { allIndustries: [] as string[], allGroups: [] as string[] };
        const industries = new Set<string>();
        const groups = new Set<string>();
        Object.keys(productConfig.childToParentMap).forEach(childKey => {
            const parent = productConfig.childToParentMap[childKey];
            if (parent && parent !== 'Không tính doanh thu') {
                industries.add(parent);
            }
        });
        Object.entries(productConfig.subgroups).forEach(([parentKey, parent]) => {
            if (parentKey !== 'Không tính doanh thu') {
                Object.keys(parent).forEach(subgroup => {
                    if (subgroup !== 'Không tính doanh thu') {
                        groups.add(subgroup);
                    }
                });
            }
        });
        return { 
            allIndustries: Array.from(industries).sort(), 
            allGroups: Array.from(groups).sort(),
        };
    }, [productConfig]);

    const allManufacturers = useMemo(() => {
        if (!originalData || originalData.length === 0) return [] as string[];
        const manufacturers = new Set<string>(originalData.map(row => getRowValue(row, COL.MANUFACTURER)).filter(Boolean));
        return Array.from(manufacturers).sort();
    }, [originalData]);

    useEffect(() => {
        let cancelled = false;
        const loadConfig = async () => {
            const CURRENT_VERSION = 'v3'; // Increment version to force clear old columns cache
            const savedVersion = await getSetting<string>('warehouseColumnConfigVersion');
            
            let config = await getWarehouseColumnConfig();
            let needsSave = false;
            
            if (!config || config.length === 0 || savedVersion !== CURRENT_VERSION) {
                config = [...DEFAULT_WAREHOUSE_COLUMNS];
                needsSave = true;
                await saveSetting('warehouseColumnConfigVersion', CURRENT_VERSION);
            } else {
                const migrated = migrateColumns(config);
                const isDiff = JSON.stringify(migrated) !== JSON.stringify(config);
                if (isDiff) {
                    config = migrated;
                    needsSave = true;
                }
            }
            if (needsSave) {
                try {
                    await saveWarehouseColumnConfig(config);
                } catch (err) {
                    console.error("Failed to save migrated column config:", err);
                }
            }
            if (!cancelled) {
                startTransition(() => {
                    setColumns(config);
                    setColumnsLoaded(true);
                });
            }
        };
        loadConfig();
        return () => { cancelled = true; };
    }, []); // Column config is a user preference — load once on mount

    const handleSaveColumns = (newColumns: WarehouseColumnConfig[]) => {
        setColumns(newColumns);
        saveWarehouseColumnConfig(newColumns).catch(err => console.error("Failed to save column config:", err));
    };
    
    const handleTargetClick = (kho: string) => {
        if (userRole === 'employee') return;
        const currentDTQD = warehouseTargets[kho] || 0;
        const currentDTThuc = warehouseDTThucTargets[kho] || 0;
        const dtqdDivided = currentDTQD > 0 ? (currentDTQD / 1000000) : 0;
        const dtThucDivided = currentDTThuc > 0 ? (currentDTThuc / 1000000) : 0;
        setEditingTargetKho({ 
            id: kho, 
            name: kho, 
            valueDTQD: dtqdDivided > 0 ? formatWithCommas(dtqdDivided.toString()) : '',
            valueDTThuc: dtThucDivided > 0 ? formatWithCommas(dtThucDivided.toString()) : '',
        });
    };

    const handleTargetInputChange = (field: 'valueDTQD' | 'valueDTThuc', rawValue: string) => {
        const formatted = formatWithCommas(rawValue);
        setEditingTargetKho(prev => prev ? { ...prev, [field]: formatted } : null);
    };

    const handleTargetSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingTargetKho) {
            const valDTQD = parseFormattedNumber(editingTargetKho.valueDTQD);
            const valDTThuc = parseFormattedNumber(editingTargetKho.valueDTThuc);
            if (valDTQD > 0) updateWarehouseTarget(editingTargetKho.id, valDTQD * 1000000);
            if (valDTThuc > 0) updateWarehouseDTThucTarget(editingTargetKho.id, valDTThuc * 1000000);
            setEditingTargetKho(null);
        }
    };

    useEffect(() => {
        if (editingTargetKho && targetInputRef.current) {
            targetInputRef.current.focus();
        }
    }, [editingTargetKho?.id]);

    // Mục 62: nhập Target bấm trực tiếp vào ô (spreadsheet-style) cho từng chỉ số con ở bảng dọc.
    const [editingTargetCell, setEditingTargetCell] = useState<{ colId: string; khoName: string } | null>(null);
    const [editingTargetCellValue, setEditingTargetCellValue] = useState('');
    const targetCellInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingTargetCell && targetCellInputRef.current) {
            targetCellInputRef.current.focus();
            targetCellInputRef.current.select();
        }
    }, [editingTargetCell?.colId, editingTargetCell?.khoName]);

    // Mục 62 fix: ô M.Tiêu đóng đang hiển thị giá trị đã prorate theo ngày (khi không Lũy kế) để
    // %HT tính đúng, nên ô sửa cũng phải quy đổi cùng chiều — nếu không, gõ "50" xong hiển thị lại
    // ra "2" (50 bị chia cho daysInMonth) vì ô đóng và ô sửa lệch đơn vị (tháng vs ngày).
    const startEditTargetCell = (col: WarehouseColumnConfig, khoName: string) => {
        if (userRole === 'employee') return;
        const monthly = getTargetMap(col)[khoName] || 0;
        const scaled = isLuyKe ? monthly : (monthly > 0 ? monthly / daysInMonth : 0);
        const displayValue = isRevenueMetricCol(col) ? (scaled > 0 ? scaled / 1000000 : 0) : scaled;
        setEditingTargetCell({ colId: col.id, khoName });
        setEditingTargetCellValue(displayValue > 0 ? formatWithCommas(displayValue.toString()) : '');
    };

    const commitEditTargetCell = (col: WarehouseColumnConfig, khoName: string) => {
        const parsed = parseFormattedNumber(editingTargetCellValue);
        const rawScaled = isRevenueMetricCol(col) ? parsed * 1000000 : parsed;
        const monthly = isLuyKe ? rawScaled : rawScaled * daysInMonth;
        setRowTarget(col, khoName, monthly);
        setEditingTargetCell(null);
    };

    const handleSort = (columnId: string) => {
        setSortConfig(prev => ({ key: columnId, direction: (prev?.key === columnId && prev.direction === 'desc') ? 'asc' : 'desc' }));
    };
    
    const visibleColumns = useMemo(() => {
        return columns
            .filter(c => c.isVisible)
            .sort((a, b) => a.order - b.order);
    }, [columns]);

    // Pagination Logic
    useEffect(() => {
        setCurrentPage(1); // Reset page when filter or root data changes
    }, [data, filterState, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const currentData = useMemo(() => {
        return sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    }, [sortedData, currentPage]);

    const displayedVerticalData = useMemo(() => {
        if (!verticalKhoFilter || verticalKhoFilter.length === 0) return currentData;
        const selectedKhos = new Set(verticalKhoFilter.filter(k => k !== 'TỔNG'));
        if (selectedKhos.size === 0) return currentData;
        return currentData.filter(d => selectedKhos.has(d.khoName));
    }, [currentData, verticalKhoFilter]);

    const showVerticalTotal = useMemo(() => {
        if (!verticalKhoFilter || verticalKhoFilter.length === 0) return true;
        return verticalKhoFilter.includes('TỔNG');
    }, [verticalKhoFilter]);

    const groupedHeaders = useMemo(() => {
        const groups: { name: string; colSpan: number; startIndex: number }[] = [];
        if (visibleColumns.length === 0) return groups;
        
        let currentGroup = { name: visibleColumns[0].mainHeader, colSpan: 1, startIndex: 0 };
        for (let i = 1; i < visibleColumns.length; i++) {
            if (visibleColumns[i].mainHeader === currentGroup.name) {
                currentGroup.colSpan++;
            } else {
                groups.push(currentGroup);
                currentGroup = { name: visibleColumns[i].mainHeader, colSpan: 1, startIndex: i };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [visibleColumns]);

    const PASTEL_THEMES = [
        { sub: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
        { sub: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' },
        { sub: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
        { sub: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
        { sub: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400' },
        { sub: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
        { sub: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
        { sub: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400' },
        { sub: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
        { sub: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' },
        { sub: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400' },
        { sub: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
        { sub: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
        { sub: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' }
    ];

    // Helper map to consistently assign the same color to the same group name based on order of appearance
    const groupColorMap = useMemo(() => {
        const map: Record<string, typeof PASTEL_THEMES[0]> = {};
        let colorIndex = 0;
        groupedHeaders.forEach(group => {
            if (group.name && group.name !== '-' && group.name !== '') {
                if (!map[group.name]) {
                    map[group.name] = PASTEL_THEMES[colorIndex % PASTEL_THEMES.length];
                    colorIndex++;
                }
            }
        });
        return map;
    }, [groupedHeaders]);

    // Helper to check if a column is the start of a new group to apply the vertical separator
    const isGroupStart = (index: number) => {
        if (index === 0) return true;
        return visibleColumns[index].mainHeader !== visibleColumns[index - 1].mainHeader;
    };
    
    // Calculate total target for footer based on currently displayed data
    const totalTarget = useMemo(() => {
        const monthlyTotal = data.reduce((sum, row) => sum + (warehouseTargets[row.khoName] || 0), 0);
        return isLuyKe ? monthlyTotal : (monthlyTotal > 0 ? monthlyTotal / daysInMonth : 0);
    }, [data, warehouseTargets, isLuyKe, daysInMonth]);

    // Early returns AFTER all hooks
    if (!data || data.length === 0) return null;

    return (
        <>
            <div id="warehouse-summary-view" className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden mb-2 lg:mb-8 transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-[100] m-0 w-full h-full overflow-y-auto rounded-none shadow-2xl' : 'rounded-none lg:rounded-2xl border-y lg:border shadow-sm lg:hover:shadow-md'}`} ref={summaryRef}>
                {(isProcessing || isExporting) && (
                    <div className="hide-on-export">
                        <LoadingOverlay />
                    </div>
                )}

                {/* BEGIN: Header Section */}
                <SectionHeader 
                    title="Chi Tiết Theo Kho" 
                    icon="layout-grid" 
                    subtitle="Phân tích hiệu suất từng siêu thị"
                >
                    <div className="flex items-center space-x-0.5 lg:space-x-2 hide-on-export">
                        {/* Lũy kế button */}
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => handleLuyKeChange(!isLuyKe)}
                            className={`flex items-center gap-1 p-1.5 lg:p-2 rounded-md transition-colors whitespace-nowrap shrink-0 ${isLuyKe ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title={isLuyKe ? "Tắt chế độ Lũy kế" : "Bật chế độ Lũy kế"}
                        >
                            <Icon name="layers" size={4} className="lg:hidden" />
                            <Icon name="layers" size={5} className="hidden lg:block" />
                            <span className="hidden lg:inline text-[11px] font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap">Lũy kế</span>
                        </Button>

                        {/* Toggle Ngang/Dọc */}
                        <Button
                            variant="unstyled" size="none"
                            onClick={toggleViewMode}
                            className={`flex items-center gap-1 p-1.5 lg:p-2 rounded-md transition-colors whitespace-nowrap shrink-0 ${viewMode === 'vertical' ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title={viewMode === 'horizontal' ? 'Chuyển sang bảng dọc' : 'Chuyển sang bảng ngang'}
                        >
                            <Icon name={viewMode === 'horizontal' ? 'layout-list' : 'table-2'} size={4} className="lg:hidden" />
                            <Icon name={viewMode === 'horizontal' ? 'layout-list' : 'table-2'} size={5} className="hidden lg:block" />
                            <span className="hidden lg:inline text-[11px] font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap">{viewMode === 'horizontal' ? 'Dọc' : 'Ngang'}</span>
                        </Button>

                        {/* Nút lọc Siêu thị & Tổng dạng Icon Phễu dành cho Chế độ xem Dọc (Lưu trạng thái vào Firebase) */}
                        {viewMode === 'vertical' && (
                            <MultiSelectDropdown
                                options={verticalOptions}
                                selected={verticalKhoFilter.length === 0 ? verticalOptions : verticalKhoFilter}
                                onChange={handleVerticalKhoFilterChange}
                                label="Lọc Siêu thị & Tổng"
                                iconOnly={true}
                                iconName="filter"
                                className="z-30 shrink-0"
                            />
                        )}

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        {userRole !== 'employee' && (
                            <Button variant="unstyled" size="none" onClick={() => setIsSettingsModalOpen(true)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 lg:p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Cài đặt">
                                <Icon name="settings-2" size={4} className="lg:hidden" />
                                <Icon name="settings-2" size={5} className="hidden lg:block" />
                            </Button>
                        )}

                        {uniqueFilterOptions.kho.length > 1 && (
                            <Button variant="unstyled" size="none" onClick={onBatchExport} disabled={isExporting} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 lg:p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Xuất hàng loạt">
                                <Icon name="images" size={4} className="lg:hidden" />
                                <Icon name="images" size={5} className="hidden lg:block" />
                            </Button>
                        )}
                        <Button variant="unstyled" size="none" onClick={handleSingleExport} disabled={isExporting} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 lg:p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Chụp ảnh">
                            {isExporting ? <Icon name="loader-2" className="animate-spin" size={4} /> : <><Icon name="camera" size={4} className="lg:hidden" /><Icon name="camera" size={5} className="hidden lg:block" /></>}
                        </Button>
                    </div>
                </SectionHeader>

                {/* Thanh Bar Quỹ Thời Gian (Nhấp đôi 2 cái để đổi giờ mở/đóng cửa) */}
                <div 
                    onDoubleClick={() => setIsStoreHoursModalOpen(true)}
                    className="mx-1 sm:mx-2 lg:mx-6 my-2 p-2 bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 border border-sky-200/80 dark:border-slate-700 rounded-xl cursor-pointer hover:border-sky-400 transition-all select-none group hide-on-export"
                    title="Nhấp đôi (2 cái) để thay đổi giờ Mở / Đóng cửa siêu thị"
                >
                    <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <Icon name="clock" size={3.5} className="text-sky-600 dark:text-sky-400 animate-pulse" />
                            <span className="uppercase tracking-wider">Quỹ thời gian ({storeHours.open} - {storeHours.close})</span>
                            <span className="text-[9px] font-normal text-slate-400 hidden sm:inline">(Nhấp đúp 2 cái vào đây để đổi giờ mở/đóng cửa)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sky-700 dark:text-sky-300 font-extrabold">{Math.round(timeUsedPct)}% đã dùng</span>
                        </div>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="w-full bg-slate-200/70 dark:bg-slate-700 h-2 rounded-full overflow-hidden p-0.5">
                        <div 
                            className="bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-sm" 
                            style={{ width: `${Math.min(100, Math.max(0, timeUsedPct))}%` }}
                        />
                    </div>
                </div>

                {/* END: Header Section */}


                {/* === TABLE VIEW (all screen sizes) === */}
                <div className="overflow-hidden">

                {/* Skeleton while columns load from IndexedDB */}
                {!columnsLoaded && (
                    <div className="p-1.5 sm:p-2 lg:p-6">
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            {/* Skeleton header */}
                            <div className="flex">
                                <div className="w-16 sm:w-20 shrink-0 h-10 bg-rose-50 dark:bg-rose-900/30 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    <div className="h-2.5 w-10 bg-rose-200/60 dark:bg-rose-700/40 rounded animate-pulse" />
                                </div>
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="flex-1 min-w-[52px] h-10 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center" style={{ background: `hsl(${(i * 30) % 360}, 70%, 97%)` }}>
                                        <div className="h-2 w-8 rounded animate-pulse" style={{ background: `hsl(${(i * 30) % 360}, 50%, 85%)`, animationDelay: `${i * 60}ms` }} />
                                    </div>
                                ))}
                            </div>
                            {/* Skeleton rows */}
                            {[...Array(data.length || 2)].map((_, rowIdx) => (
                                <div key={rowIdx} className={`flex border-t border-slate-100 dark:border-slate-800 ${rowIdx === (data.length || 2) - 1 ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                                    <div className="w-16 sm:w-20 shrink-0 h-9 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                        <div className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ animationDelay: `${rowIdx * 100}ms` }} />
                                    </div>
                                    {[...Array(12)].map((_, colIdx) => (
                                        <div key={colIdx} className="flex-1 min-w-[52px] h-9 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                            <div
                                                className="h-2.5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse"
                                                style={{
                                                    width: `${20 + ((rowIdx * 13 + colIdx * 7) % 25)}px`,
                                                    animationDelay: `${(rowIdx * 12 + colIdx) * 40}ms`
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <svg className="w-3.5 h-3.5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                            Đang tải cấu hình cột...
                        </div>
                    </div>
                )}

                {columnsLoaded && viewMode === 'horizontal' && (
                <section className="overflow-x-auto custom-scrollbar p-1.5 sm:p-2 lg:p-6 touch-auto -webkit-overflow-scrolling-touch relative">
                    <table className="w-full min-w-max text-[11px] sm:text-sm text-center border-collapse border border-slate-200 dark:border-slate-700 whitespace-nowrap tabular-nums">
                        <thead>
                            {/* Top Level Group Headers */}
                            <tr className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">
                                <th rowSpan={2} onClick={() => handleSort('khoName')} className="px-1.5 sm:px-4 py-1.5 sm:py-3 text-center text-[10px] sm:text-[12px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border-b-[3px] !border-b-rose-400 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none align-middle sticky left-0 z-20 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors uppercase tracking-wider shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                                    <div className="flex items-center justify-center gap-1">
                                        MÃ KHO
                                        {sortConfig.key === 'khoName' && (
                                            <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                        )}
                                    </div>
                                </th>
                                {groupedHeaders.map((group, i) => {
                                    if (!group.name || group.name.trim() === '' || group.name === '-') {
                                        const colsInGroup = visibleColumns.slice(group.startIndex, group.startIndex + group.colSpan);
                                        return colsInGroup.map((col, idx) => {
                                            const styles = groupColorMap[col.mainHeader] || { sub: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' };
                                            return (
                                                <th key={`${i}-${idx}`} rowSpan={2} onClick={() => handleSort(col.id)} className={`px-1 sm:px-2 py-1.5 sm:py-3 border-b-[3px] !${getBorderAccentFromColorClass(styles.sub)} dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[9px] sm:text-[11px] font-bold text-center align-middle ${styles.sub} ${styles.text}`}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {col.metric === 'percentHT' && isLuyKe ? '%DKHT' : col.subHeader}
                                                        {sortConfig.key === col.id && (
                                                            <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5} />
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        });
                                    }

                                    const styles = groupColorMap[group.name] || { sub: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' };
                                    return (
                                        <th key={i} colSpan={group.colSpan} className={`px-1 sm:px-2 py-1.5 sm:py-3 ${styles.text} ${styles.sub} border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[9px] sm:text-[11px] font-bold border-r text-center align-middle`}>
                                            {group.name}
                                        </th>
                                    );
                                })}
                            </tr>
                            {/* Sub-Headers */}
                            <tr>
                                {visibleColumns.map((col, index) => {
                                    if (!col.mainHeader || col.mainHeader.trim() === '' || col.mainHeader === '-') {
                                        return null;
                                    }
                                    const styles = groupColorMap[col.mainHeader] || { sub: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' };
                                    return (
                                        <th key={col.id} onClick={() => handleSort(col.id)} className={`px-1 sm:px-2 py-1.5 sm:py-3 border-b-[3px] !${getBorderAccentFromColorClass(styles.sub)} dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[9px] sm:text-[11px] font-bold text-center align-middle ${styles.sub} ${styles.text}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {col.metric === 'percentHT' && isLuyKe ? '%DKHT' : col.subHeader}
                                                {sortConfig.key === col.id && (
                                                    <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5} />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {currentData.map((row) => (
                                <tr key={row.khoName} className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td 
                                        className={`px-1 sm:px-2 py-1.5 sm:py-3 font-extrabold text-[11px] sm:text-[13px] text-slate-900 dark:text-slate-100 underline decoration-dotted decoration-slate-400 dark:decoration-slate-500 underline-offset-4 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 leading-tight border-r border-slate-200 dark:border-slate-700 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)] ${userRole !== 'employee' ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleTargetClick(row.khoName)}
                                    >
                                        {row.khoName}
                                    </td>
                                    {visibleColumns.map((col, index) => {
                                        const isHqqd = col.metric === 'hieuQuaQD';
                                        const isDTQD = col.metric === 'doanhThuQD';
                                        const isPercentHT = col.metric === 'percentHT';
                                        const isStart = isGroupStart(index);

                                        let value = getColumnValue(row, col);
                                        
                                        if (col.metric === 'target') {
                                            const monthly = warehouseTargets[row.khoName] || 0;
                                            value = isLuyKe ? monthly : (monthly > 0 ? monthly / daysInMonth : 0);
                                        } else if (col.metric === 'percentHT') {
                                            const monthly = warehouseTargets[row.khoName] || 0;
                                            const dtqd = row.doanhThuQD || 0;
                                            if (isLuyKe) {
                                                const target = monthly;
                                                const projected = (dtqd / daysPassed) * daysInMonth;
                                                value = target > 0 ? (projected / target) * 100 : 0;
                                            } else {
                                                const target = monthly > 0 ? monthly / daysInMonth : 0;
                                                value = target > 0 ? (dtqd / target) * 100 : 0;
                                            }
                                        }

                                        let avg: number | undefined;
                                        if (col.conditionalFormatting?.some(r => r.condition === '>avg' || r.condition === '<avg')) {
                                            const totalRows = currentData.length || 1;
                                            if (col.metric && totals[col.metric as keyof typeof totals] !== undefined) {
                                                avg = (totals[col.metric as keyof typeof totals] as number) / totalRows;
                                            } else if (col.metricType === 'revenueQD' && totals.doanhThuQD !== undefined) {
                                                avg = totals.doanhThuQD / totalRows;
                                            } else if (customTotals[col.id] !== undefined) {
                                                avg = customTotals[col.id] / totalRows;
                                            }
                                        }

                                        let customColor: string | null = null;
                                        if (col.conditionalFormatting && value !== undefined) {
                                            for (const rule of col.conditionalFormatting) {
                                                let isMatch = false;
                                                switch (rule.condition) {
                                                    case '>': isMatch = value > rule.value1; break;
                                                    case '<': isMatch = value < rule.value1; break;
                                                    case '=': isMatch = value === rule.value1; break;
                                                    case 'between': isMatch = rule.value2 !== undefined && value >= rule.value1 && value <= rule.value2; break;
                                                    case '>avg': isMatch = avg !== undefined && value > avg; break;
                                                    case '<avg': isMatch = avg !== undefined && value < avg; break;
                                                }
                                                if (isMatch) {
                                                    customColor = rule.color;
                                                    break;
                                                }
                                            }
                                        }

                                        let content;
                                        const textColorStyle = customColor ? { color: customColor } : {};
                                        
                                        if (isHqqd) {
                                            content = <span className={customColor ? "font-bold" : getHqqdClass(value)} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '—'}</span>;
                                        } else if (isDTQD) {
                                            content = <span className={customColor ? "font-semibold" : "font-semibold text-indigo-700"} style={textColorStyle}>{formatRevenueForKho(value)}</span>;
                                        } else if (isPercentHT) {
                                            let extraIcon = null;
                                            let classNameStr = customColor ? "font-bold" : "font-bold text-amber-500";
                                            if (value !== undefined && value >= 120) {
                                                extraIcon = <span title="Tuyệt đỉnh" className="ml-1 text-[13px]">🔥</span>;
                                                if (!customColor) classNameStr = "font-black text-rose-600 drop-shadow-sm";
                                            } else if (value !== undefined && value >= 100) {
                                                extraIcon = <span title="Đạt Mục Tiêu" className="ml-1 text-[13px]">🏆</span>;
                                                if (!customColor) classNameStr = "font-extrabold text-emerald-600";
                                            }
                                            content = (
                                                <div className="flex items-center justify-center">
                                                    <span className={classNameStr} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>
                                                    {extraIcon}
                                                </div>
                                            );
                                        } else if (col.metric === 'traChamPercent') {
                                            content = <span className={customColor ? "font-medium" : "font-medium text-slate-500"} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                        } else if (col.type === 'calculated') {
                                            const decimals = col.decimalPlaces ?? 0;
                                            if (col.displayAs === 'percentage') {
                                                const pctVal = (value || 0) * 100;
                                                const formatted = value !== undefined && value !== 0 ? pctVal.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '0';
                                                content = <span className={customColor ? "font-bold" : "font-bold text-slate-700 dark:text-slate-300"} style={textColorStyle}>{`${formatted}%`}</span>;
                                            } else {
                                                const formatted = (value || 0).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                                                content = <span className={customColor ? "font-bold text-indigo-600" : "font-semibold text-indigo-700 dark:text-indigo-400"} style={textColorStyle}>{formatted}</span>;
                                            }
                                        } else if (col.metric === 'doanhThuThuc' || col.metric === 'doanhThuQD' || col.metric === 'target') {
                                            content = <span style={textColorStyle}>{formatRevenueForKho(value)}</span>;
                                        } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.type === 'target') {
                                            content = <span style={textColorStyle}>{Math.round(value || 0).toLocaleString('vi-VN')}</span>;
                                        } else {
                                            content = <span style={textColorStyle}>{formatQuantityForKho(value)}</span>;
                                        }

                                        return (
                                            <td key={`${row.khoName}-${col.id}`} className={`px-1 sm:px-2 py-1.5 sm:py-3 ${isStart ? 'border-l border-slate-200 dark:border-slate-700' : ''} leading-tight h-px`}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        {/* Table Footer / Total Row */}
                        <tfoot className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                            <tr className="font-bold text-slate-900 dark:text-slate-100">
                                <td className="px-1 sm:px-2 py-1.5 sm:py-3 uppercase tracking-tight text-[9px] sm:text-[11px] sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]">Tổng</td>
                                {visibleColumns.map((col, index) => {
                                    let value;
                                    if (col.isCustom) {
                                        value = customTotals.get(col.id) || 0;
                                    } else if (col.metric && totals[col.metric as keyof typeof totals] !== undefined) {
                                        value = totals[col.metric as keyof typeof totals];
                                    } else if (col.metric === 'target') {
                                        value = totalTarget;
                                    } else if (col.metric === 'percentHT') {
                                        const totalDTQD = totals.doanhThuQD || 0;
                                        if (isLuyKe) {
                                            const projected = (totalDTQD / daysPassed) * daysInMonth;
                                            value = totalTarget > 0 ? (projected / totalTarget) * 100 : 0;
                                        } else {
                                            value = totalTarget > 0 ? (totalDTQD / totalTarget) * 100 : 0;
                                        }
                                    } else {
                                        value = customTotals.get(col.id) || 0;
                                    }

                                    const isHqqd = col.metric === 'hieuQuaQD';
                                    const isDTQD = col.metric === 'doanhThuQD';
                                    const isPercentHT = col.metric === 'percentHT';
                                    const isStart = isGroupStart(index);

                                    let content;
                                    if (isHqqd) {
                                        content = <span className={getHqqdClass(value)}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '—'}</span>;
                                    } else if (isDTQD) {
                                        content = <span className="text-amber-700">{formatRevenueForKho(value)}</span>;
                                    } else if (isPercentHT) {
                                        content = <span className="text-amber-500">{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                    } else if (col.metric === 'traChamPercent') {
                                        content = <span>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                    } else if (col.type === 'calculated') {
                                        const decimals = col.decimalPlaces ?? 0;
                                        if (col.displayAs === 'percentage') {
                                            const pctVal = (value || 0) * 100;
                                            const formatted = value !== undefined && value !== 0 ? pctVal.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '0';
                                            content = <span className="font-bold text-slate-700 dark:text-slate-300">{`${formatted}%`}</span>;
                                        } else {
                                            const formatted = (value || 0).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                                            content = <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatted}</span>;
                                        }
                                    } else if (col.metric === 'doanhThuThuc' || col.metric === 'doanhThuQD' || col.metric === 'target') {
                                        content = <span>{formatRevenueForKho(value)}</span>;
                                    } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.type === 'target') {
                                        content = <span>{Math.round(value || 0).toLocaleString('vi-VN')}</span>;
                                    } else {
                                        content = <span>{formatQuantityForKho(value)}</span>;
                                    }

                                    return (
                                        <td key={`total-${col.id}`} className={`px-1 sm:px-2 py-1.5 sm:py-3 ${isStart ? 'border-l border-slate-200 dark:border-slate-700' : ''} leading-tight h-px bg-slate-100 dark:bg-slate-800`}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </section>
                )}

                {/* === VERTICAL TABLE VIEW (transpose) === */}
                {columnsLoaded && viewMode === 'vertical' && (
                <section className="overflow-x-auto custom-scrollbar p-1.5 sm:p-2 lg:p-6 touch-auto -webkit-overflow-scrolling-touch relative">
                    <table className="w-full text-[11px] sm:text-sm border-collapse border border-slate-200 dark:border-slate-700 tabular-nums">
                        <thead>
                            <tr className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">
                                <th rowSpan={2} className="px-2 sm:px-4 py-1.5 sm:py-3 text-left text-[10px] sm:text-[12px] font-bold text-slate-600 bg-slate-50 border-b border-slate-200 border-r border-slate-200 sticky left-0 z-20 min-w-[100px] sm:min-w-[140px] shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)] align-middle">
                                    Nhóm / Chỉ Số
                                </th>
                                {displayedVerticalData.map(row => (
                                    <th key={row.khoName} colSpan={3} className="px-2 sm:px-3 py-1.5 sm:py-3 text-center font-extrabold text-[11px] sm:text-[13px] text-slate-900 bg-slate-50 border-b border-slate-200 border-r border-slate-200 min-w-[70px] sm:min-w-[90px]">
                                        {row.khoName}
                                    </th>
                                ))}
                                {showVerticalTotal && (
                                    <th colSpan={3} className="px-2 sm:px-3 py-1.5 sm:py-3 text-center font-extrabold text-[11px] sm:text-[13px] text-slate-500 bg-slate-100 border-b border-slate-200 min-w-[70px] sm:min-w-[90px] uppercase tracking-wider">
                                        Tổng
                                    </th>
                                )}
                            </tr>
                            <tr className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">
                                {displayedVerticalData.map(row => (
                                    <React.Fragment key={`sub-${row.khoName}`}>
                                        <th className="px-1 py-1 text-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 font-bold border-b-[3px] !border-b-slate-400 border-r border-slate-200">M.Tiêu</th>
                                        <th className="px-1 py-1 text-center text-sky-700 dark:text-sky-300 font-black bg-sky-100 dark:bg-sky-950/70 border-b-[3px] !border-b-sky-500 border-r border-slate-100">REAL</th>
                                        <th className="px-1 py-1 text-center text-amber-700 dark:text-amber-300 font-extrabold bg-amber-50 dark:bg-amber-950/40 border-b-[3px] !border-b-amber-400 border-r border-slate-200">%HT</th>
                                    </React.Fragment>
                                ))}
                                {showVerticalTotal && (
                                    <>
                                        <th className="px-1 py-1 text-center text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 font-bold border-b-[3px] !border-b-slate-500 border-r border-slate-200">M.Tiêu</th>
                                        <th className="px-1 py-1 text-center text-sky-700 dark:text-sky-300 font-black bg-sky-200/70 dark:bg-sky-950/80 border-b-[3px] !border-b-sky-500 border-r border-slate-200">REAL</th>
                                        <th className="px-1 py-1 text-center text-amber-700 dark:text-amber-300 font-extrabold bg-amber-100/70 dark:bg-amber-950/50 border-b-[3px] !border-b-amber-400">%HT</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(() => {
                                const GROUP_ICONS: Record<string, string> = {
                                    'MÃ KHO': '🏪', 'DOANH THU': '📊', 'SP CHÍNH': '⭐', 'MÙA VỤ': '☀️',
                                    'SL PHỤ KIỆN': '🔌', 'SL DỊCH VỤ': '🔔', 'SL GIA DỤNG': '🏠',
                                    'HIỆU QUẢ': '🎯', 'THU HỘ': '💰', 'TRẢ CHẬM': '⏰'
                                };
                                const rows: React.ReactNode[] = [];
                                let lastGroupName = '';
                                const groupDividerColSpan = displayedVerticalData.length * 3 + 1 + (showVerticalTotal ? 3 : 0);

                                visibleColumns.forEach((col, colIdx) => {
                                    // Mục 62: TAR/%HT của Doanh Thu đã gộp vào dòng DTQĐ (3 cột M.Tiêu|Real|%HT), không render riêng nữa
                                    if (col.metric === 'target' || col.metric === 'percentHT') return;

                                    // Group separator row
                                    if (col.mainHeader && col.mainHeader !== lastGroupName) {
                                        lastGroupName = col.mainHeader;
                                        const styles = groupColorMap[col.mainHeader] || { sub: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' };
                                        const icon = GROUP_ICONS[col.mainHeader.toUpperCase()] || '📋';
                                        rows.push(
                                            <tr key={`group-${col.mainHeader}-${colIdx}`} className={styles.sub}>
                                                <td colSpan={groupDividerColSpan} className={`px-2 sm:px-4 py-1.5 sm:py-2.5 font-black text-[10px] sm:text-[12px] uppercase tracking-wider ${styles.text} sticky left-0 z-10 ${styles.sub}`}>
                                                    <span className="mr-1.5">{icon}</span>
                                                    {col.mainHeader}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const upgradable = isUpgradableRow(col);

                                    if (upgradable) {
                                        // Mục 62: dòng 3 cột M.Tiêu | Real | %HT theo từng chỉ số con
                                        const isPercentMetric = col.metric === 'hieuQuaQD' || col.metric === 'traChamPercent';
                                        const targetMap = getTargetMap(col);
                                        const formatter = isPercentMetric 
                                            ? (v: number | undefined) => (v !== undefined && !isNaN(v) ? `${Math.round(v)}%` : '—')
                                            : (isRevenueMetricCol(col) ? formatRevenueForKho : formatQuantityForKho);
                                        const canEdit = userRole !== 'employee' && !isPercentMetric;

                                        rows.push(
                                            <tr key={`vrow-${col.id}`} className="group hover:bg-slate-50 transition-colors">
                                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-bold text-[10px] sm:text-[12px] text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 uppercase tracking-wide shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                                                    {col.subHeader}
                                                </td>
                                                {displayedVerticalData.map(row => {
                                                    const real = getColumnValue(row, col) || 0;
                                                    let targetDisplay = 0;
                                                    let pct = 0;

                                                    if (isPercentMetric) {
                                                        targetDisplay = col.metric === 'hieuQuaQD' ? (kpiTargets?.hieuQua ?? 55) : (kpiTargets?.traGop ?? 55);
                                                        pct = targetDisplay > 0 ? (real / targetDisplay) * 100 : 0;
                                                    } else {
                                                        const monthly = targetMap[row.khoName] || 0;
                                                        targetDisplay = isLuyKe ? monthly : (monthly > 0 ? monthly / daysInMonth : 0);
                                                        if (monthly > 0) {
                                                            if (isLuyKe) {
                                                                const projected = (real / daysPassed) * daysInMonth;
                                                                pct = (projected / monthly) * 100;
                                                            } else {
                                                                pct = targetDisplay > 0 ? (real / targetDisplay) * 100 : 0;
                                                            }
                                                        }
                                                    }

                                                    const hasTarget = isPercentMetric ? targetDisplay > 0 : (targetMap[row.khoName] || 0) > 0;
                                                    const pctClass = getHqqdClassWithTime(pct, timeUsedPct);
                                                    const isEditingThis = editingTargetCell?.colId === col.id && editingTargetCell?.khoName === row.khoName;

                                                    return (
                                                        <React.Fragment key={`${row.khoName}-${col.id}`}>
                                                            <td
                                                                className={`px-1 py-1.5 sm:py-2 text-center border-r border-slate-100 leading-tight bg-slate-50/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-semibold ${canEdit ? 'cursor-pointer' : ''}`}
                                                                onClick={() => canEdit && !isEditingThis && startEditTargetCell(col, row.khoName)}
                                                            >
                                                                {isEditingThis ? (
                                                                    <input
                                                                        ref={targetCellInputRef}
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        value={editingTargetCellValue}
                                                                        onChange={(e) => setEditingTargetCellValue(formatWithCommas(e.target.value))}
                                                                        onBlur={() => commitEditTargetCell(col, row.khoName)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') { e.preventDefault(); commitEditTargetCell(col, row.khoName); }
                                                                            if (e.key === 'Escape') { e.preventDefault(); setEditingTargetCell(null); }
                                                                        }}
                                                                        className="w-14 sm:w-16 px-1 py-0.5 text-center border border-sky-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-[10px] sm:text-[11px] font-semibold text-slate-700"
                                                                    />
                                                                ) : (
                                                                    <span className={hasTarget ? 'font-semibold text-slate-700 dark:text-slate-200' : `text-slate-300 ${canEdit ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                                                                        {hasTarget ? formatter(targetDisplay) : '—'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-1 py-1.5 sm:py-2 text-center border-r border-slate-100 leading-tight bg-sky-50/60 dark:bg-sky-950/30">
                                                                <span className="font-black text-sky-700 dark:text-sky-300 text-[11px] sm:text-[13px]">{formatter(real)}</span>
                                                            </td>
                                                            <td className="px-1 py-1.5 sm:py-2 text-center border-r border-slate-100 leading-tight">
                                                                <span className={hasTarget ? pctClass : 'text-slate-300 font-normal'}>{hasTarget ? `${Math.round(pct)}%` : '—'}</span>
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                {/* Total column (3 cột) */}
                                                {showVerticalTotal && (() => {
                                                    const totalReal = isPercentMetric 
                                                        ? (col.metric === 'hieuQuaQD' ? (totals.hieuQuaQD || 0) : (totals.traChamPercent || 0))
                                                        : (customTotals.get(col.id) || 0);
                                                    let totalTargetDisplay = 0;
                                                    let totalPct = 0;

                                                    if (isPercentMetric) {
                                                        totalTargetDisplay = col.metric === 'hieuQuaQD' ? (kpiTargets?.hieuQua ?? 55) : (kpiTargets?.traGop ?? 55);
                                                        totalPct = totalTargetDisplay > 0 ? (totalReal / totalTargetDisplay) * 100 : 0;
                                                    } else {
                                                        const totalMonthly = data.reduce((s, r) => s + (targetMap[r.khoName] || 0), 0);
                                                        totalTargetDisplay = isLuyKe ? totalMonthly : (totalMonthly > 0 ? totalMonthly / daysInMonth : 0);
                                                        if (totalMonthly > 0) {
                                                            if (isLuyKe) {
                                                                const projected = (totalReal / daysPassed) * daysInMonth;
                                                                totalPct = (projected / totalMonthly) * 100;
                                                            } else {
                                                                totalPct = totalTargetDisplay > 0 ? (totalReal / totalTargetDisplay) * 100 : 0;
                                                            }
                                                        }
                                                    }

                                                    const hasTotalTarget = totalTargetDisplay > 0;
                                                    const totalPctClass = getHqqdClassWithTime(totalPct, timeUsedPct);
                                                    return (
                                                        <>
                                                            <td className="px-1 py-1.5 sm:py-2 text-center bg-slate-100/60 dark:bg-slate-800/60 leading-tight font-semibold text-slate-700 dark:text-slate-200">{hasTotalTarget ? formatter(totalTargetDisplay) : '—'}</td>
                                                            <td className="px-1 py-1.5 sm:py-2 text-center bg-sky-100/70 dark:bg-sky-950/50 leading-tight font-black text-sky-800 dark:text-sky-200">{formatter(totalReal)}</td>
                                                            <td className={`px-1 py-1.5 sm:py-2 text-center bg-slate-50 leading-tight font-bold ${hasTotalTarget ? totalPctClass : ''}`}>{hasTotalTarget ? `${Math.round(totalPct)}%` : '—'}</td>
                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                        );
                                        return;
                                    }

                                    // Dòng không nâng cấp (đã là tỷ lệ %, hoặc cột custom calculated/target) — giữ nguyên logic cũ, chỉ đổi colSpan=3 để thẳng hàng
                                    rows.push(
                                        <tr key={`vrow-${col.id}`} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            {/* Metric name (sticky left) */}
                                            <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-bold text-[10px] sm:text-[12px] text-slate-700 dark:text-slate-300 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 uppercase tracking-wide shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                                                {col.subHeader}
                                            </td>
                                            {/* Values for each kho */}
                                            {displayedVerticalData.map(row => {
                                                const value = getColumnValue(row, col);

                                                // Conditional formatting
                                                let avg: number | undefined;
                                                if (col.conditionalFormatting?.some(r => r.condition === '>avg' || r.condition === '<avg')) {
                                                    const totalRows = displayedVerticalData.length || 1;
                                                    if (col.metric && totals[col.metric as keyof typeof totals] !== undefined) {
                                                        avg = (totals[col.metric as keyof typeof totals] as number) / totalRows;
                                                    } else if (customTotals.get(col.id) !== undefined) {
                                                        avg = (customTotals.get(col.id) || 0) / totalRows;
                                                    }
                                                }
                                                let customColor: string | null = null;
                                                if (col.conditionalFormatting && value !== undefined) {
                                                    for (const rule of col.conditionalFormatting) {
                                                        let isMatch = false;
                                                        switch (rule.condition) {
                                                            case '>': isMatch = value > rule.value1; break;
                                                            case '<': isMatch = value < rule.value1; break;
                                                            case '=': isMatch = value === rule.value1; break;
                                                            case 'between': isMatch = rule.value2 !== undefined && value >= rule.value1 && value <= rule.value2; break;
                                                            case '>avg': isMatch = avg !== undefined && value > avg; break;
                                                            case '<avg': isMatch = avg !== undefined && value < avg; break;
                                                        }
                                                        if (isMatch) { customColor = rule.color; break; }
                                                    }
                                                }

                                                const textColorStyle = customColor ? { color: customColor } : {};
                                                const isHqqd = col.metric === 'hieuQuaQD';

                                                let content;
                                                if (isHqqd) {
                                                    content = <span className={customColor ? 'font-bold' : getHqqdClass(value)} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '—'}</span>;
                                                } else if (col.metric === 'traChamPercent') {
                                                    content = <span className={customColor ? 'font-medium' : 'font-medium text-slate-500'} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                                } else if (col.type === 'calculated') {
                                                    const decimals = col.decimalPlaces ?? 0;
                                                    if (col.displayAs === 'percentage') {
                                                        const pctVal = (value || 0) * 100;
                                                        content = <span className={customColor ? 'font-bold' : 'font-bold text-slate-700 dark:text-slate-300'} style={textColorStyle}>{value !== undefined && value !== 0 ? `${pctVal.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%` : '0%'}</span>;
                                                    } else {
                                                        content = <span className={customColor ? 'font-bold text-indigo-600' : 'font-semibold text-indigo-700 dark:text-indigo-400'} style={textColorStyle}>{(value || 0).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
                                                    }
                                                } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.type === 'target') {
                                                    content = <span style={textColorStyle}>{Math.round(value || 0).toLocaleString('vi-VN')}</span>;
                                                } else {
                                                    content = <span style={textColorStyle}>{formatQuantityForKho(value)}</span>;
                                                }

                                                return (
                                                    <td key={`${row.khoName}-${col.id}`} colSpan={3} className="px-2 sm:px-3 py-1.5 sm:py-2 text-center border-r border-slate-100 leading-tight">
                                                        {content}
                                                    </td>
                                                );
                                            })}
                                            {/* Total column */}
                                            {showVerticalTotal && (() => {
                                                let totalVal: number;
                                                if (col.isCustom) {
                                                    totalVal = customTotals.get(col.id) || 0;
                                                } else if (col.metric && totals[col.metric as keyof typeof totals] !== undefined) {
                                                    totalVal = totals[col.metric as keyof typeof totals] as number;
                                                } else {
                                                    totalVal = customTotals.get(col.id) || 0;
                                                }

                                                const isHqqd = col.metric === 'hieuQuaQD';
                                                let content;
                                                if (isHqqd) {
                                                    content = <span className={getHqqdClass(totalVal)}>{totalVal !== undefined && totalVal !== 0 ? `${Math.round(totalVal)}%` : '—'}</span>;
                                                } else if (col.metric === 'traChamPercent') {
                                                    content = <span className="font-medium">{totalVal !== undefined && totalVal !== 0 ? `${Math.round(totalVal)}%` : '0%'}</span>;
                                                } else if (col.type === 'calculated') {
                                                    const decimals = col.decimalPlaces ?? 0;
                                                    if (col.displayAs === 'percentage') {
                                                        const pctVal = (totalVal || 0) * 100;
                                                        content = <span className="font-bold text-slate-700 dark:text-slate-300">{`${pctVal.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`}</span>;
                                                    } else {
                                                        content = <span className="font-bold text-indigo-700 dark:text-indigo-400">{(totalVal || 0).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
                                                    }
                                                } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.type === 'target') {
                                                    content = <span className="font-bold">{Math.round(totalVal || 0).toLocaleString('vi-VN')}</span>;
                                                } else {
                                                    content = <span className="font-bold">{formatQuantityForKho(totalVal)}</span>;
                                                }
                                                return (
                                                    <td colSpan={3} className="px-2 sm:px-3 py-1.5 sm:py-2 text-center bg-slate-50 leading-tight font-bold">
                                                        {content}
                                                    </td>
                                                );
                                            })()}
                                        </tr>
                                    );
                                });
                                return rows;
                            })()}
                        </tbody>
                    </table>
                </section>
                )}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hide-on-export">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Hiển thị {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, sortedData.length)} trên <span className="font-bold">{sortedData.length}</span> kết quả
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-200"
                            >
                                Trước
                            </Button>
                            <div className="px-3 py-1 text-sm font-semibold bg-slate-200/50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center min-w-[3rem]">
                                {currentPage} / {totalPages}
                            </div>
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-200"
                            >
                                Sau
                            </Button>
                        </div>
                    </div>
                )}
                {/* END: Data Table Section */}
            </div>

             <WarehouseSettingsModal 
                isOpen={isSettingsModalOpen} 
                onClose={() => setIsSettingsModalOpen(false)}
                onSave={handleSaveColumns}
                columns={columns}
                allIndustries={allIndustries}
                allGroups={allGroups}
                allManufacturers={allManufacturers}
            />

            {/* Target Edit Modal */}
            <Modal
                isOpen={!!editingTargetKho}
                onClose={() => setEditingTargetKho(null)}
                title="Nhập Target Tháng"
                subTitle={`Đặt chỉ tiêu doanh thu tháng cho kho ${editingTargetKho?.name}`}
                titleColorClass="text-indigo-600 dark:text-indigo-400"
                maxWidth="lg"
            >
                <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* DT Thực */}
                        <div>
                            <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wider">
                                Doanh Thu Thực (Tr)
                            </label>
                            <input
                                ref={targetInputRef}
                                type="text"
                                inputMode="decimal"
                                value={editingTargetKho?.valueDTThuc || ''}
                                onChange={(e) => handleTargetInputChange('valueDTThuc', e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTargetSave(); } }}
                                className="w-full p-2.5 sm:p-3 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 transition-all"
                                placeholder="VD: 1,500"
                            />
                        </div>
                        {/* DT QĐ */}
                        <div>
                            <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-wider">
                                Doanh Thu Q.Đổi (Tr)
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={editingTargetKho?.valueDTQD || ''}
                                onChange={(e) => handleTargetInputChange('valueDTQD', e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTargetSave(); } }}
                                className="w-full p-2.5 sm:p-3 border-2 border-amber-200 dark:border-amber-800 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300 transition-all"
                                placeholder="VD: 2,000"
                            />
                        </div>
                    </div>

                    {/* Daily target preview */}
                    {(() => {
                        const valDTThuc = parseFormattedNumber(editingTargetKho?.valueDTThuc || '0');
                        const valDTQD = parseFormattedNumber(editingTargetKho?.valueDTQD || '0');
                        if (valDTThuc > 0 || valDTQD > 0) {
                            let days = 30;
                            if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
                                const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
                                if (match) days = new Date(parseInt(match[2]), parseInt(match[1]), 0).getDate();
                            } else {
                                const now = new Date();
                                days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                            }
                            return (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quy đổi Target ngày ({days} ngày)</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {valDTThuc > 0 && (
                                            <div className="flex items-center justify-between text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">DT Thực/ngày</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{(valDTThuc / days).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tr</span>
                                            </div>
                                        )}
                                        {valDTQD > 0 && (
                                            <div className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">DT QĐ/ngày</span>
                                                <span className="font-bold text-amber-600 dark:text-amber-400">{(valDTQD / days).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tr</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return <div className="mb-4" />;
                    })()}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="unstyled" size="none" onClick={() => setEditingTargetKho(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</Button>
                        <Button type="button" variant="unstyled" size="none" onClick={() => handleTargetSave()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">Lưu</Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Cập Nhật Quỹ Thời Gian Siêu Thị */}
            <Modal
                isOpen={isStoreHoursModalOpen}
                onClose={() => setIsStoreHoursModalOpen(false)}
                title="Cập Nhật Quỹ Thời Gian Siêu Thị"
                subTitle="Nhập giờ mở và đóng cửa hàng ngày (Định dạng HH:mm)"
                titleColorClass="text-sky-600 dark:text-sky-400"
                maxWidth="sm"
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                            Giờ Mở Cửa (HH:mm)
                        </label>
                        <input
                            type="time"
                            value={tempOpenHour}
                            onChange={(e) => setTempOpenHour(e.target.value)}
                            className="w-full p-2.5 sm:p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-sky-500 text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                            Giờ Đóng Cửa (HH:mm)
                        </label>
                        <input
                            type="time"
                            value={tempCloseHour}
                            onChange={(e) => setTempCloseHour(e.target.value)}
                            className="w-full p-2.5 sm:p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-sky-500 text-base"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <Button type="button" variant="secondary" onClick={() => setIsStoreHoursModalOpen(false)}>Hủy</Button>
                        <Button type="button" variant="primary" onClick={handleSaveStoreHours}>Lưu Cấu Hình</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default React.memo(WarehouseSummary);
