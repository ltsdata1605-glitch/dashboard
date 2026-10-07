import { useState, useEffect, useCallback, useRef } from 'react';
import type { CustomContestTab, ContestTableConfig, ColumnConfig, CustomExploitationTabConfig, CustomColumnConfig, ModalState, CustomExploitationTabSaveInput } from '../types';
import { getCustomTabs, saveCustomTabs, getIndustryAnalysisCustomTabs, saveIndustryAnalysisCustomTabs, getSetting, saveSetting } from '../services/dbService';
import { presetExploitationTabs } from './presetExploitationTabs';
import type { Tab } from '../components/employees/EmployeeAnalysisTabs';

// Chuẩn hoá tab cũ (dạng displayOptions) sang dạng columns mới — dùng chung khi load từ DB (mount)
// và khi nhận sự kiện đồng bộ cloud, trước đây 2 nơi copy-paste giống hệt logic này.
const normalizeExploitationTabColumns = (tab: CustomExploitationTabConfig): CustomExploitationTabConfig => {
    if (tab.columns && Array.isArray(tab.columns)) return tab;

    const columns: CustomColumnConfig[] = [];
    const displayOpts = tab.displayOptions || { showQuantity: true, showRevenue: true, showPercentage: true };

    if (displayOpts.showQuantity) {
        columns.push({ id: `sl`, name: 'SL', type: 'quantity', filters: tab.filters });
    }
    if (displayOpts.showRevenue) {
        columns.push({ id: `dt`, name: 'D.THU', type: 'revenue', filters: tab.filters });
    }
    if (displayOpts.showPercentage) {
        columns.push({
            id: `pct`,
            name: '%',
            type: 'percentage',
            percentageConfig: {
                numeratorMetric: tab.percentageConfig?.numeratorMetric || 'quantity',
                baseMetric: tab.percentageConfig?.baseMetric || 'quantity',
                numeratorFilters: tab.filters!, // strict: giữ nguyên hành vi cũ (tab dựng từ builder luôn có filters)
                denominatorFilters: tab.percentageConfig?.filters || { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }
            }
        });
    }
    return { ...tab, columns };
};

export const useEmployeeAnalysisLogic = (activeTab: string, setActiveTab: (id: string) => void, defaultTabs: Tab[]) => {
    const [customTabs, setCustomTabs] = useState<CustomContestTab[]>([]);
    const [industryAnalysisTabs, setIndustryAnalysisTabs] = useState<CustomContestTab[]>([]);
    const [customExploitationTabs, setCustomExploitationTabs] = useState<CustomExploitationTabConfig[]>([]);
    const [efficiencyExploitationTabs, setEfficiencyExploitationTabs] = useState<CustomExploitationTabConfig[]>([]);
    const [isInitialTabsLoaded, setIsInitialTabsLoaded] = useState(false);
    const isHydratedRef = useRef(false);
    // JSON của giá trị ĐANG CÓ trên đĩa cho từng khoá (ghi lúc nạp, lúc nhận từ Cloud, lúc tự lưu).
    // Effect lưu chỉ ghi khoá KHÁC bản này. Trước đây effect ghi cả 4 khoá mỗi khi state đổi — kể cả
    // lúc vừa nạp — nên mỗi lần mở app đẩy 4 khoá nặng lên Cloud; trên máy mới còn lưu preset/mảng
    // rỗng mang dấu "bây giờ" rồi đẩy ĐÈ tab tuỳ chỉnh trên Cloud (đo trên dữ liệu thật 2026-09-28).
    const trenDiaRef = useRef<Record<string, string>>({});
    const ghiNhanTrenDia = (key: string, value: unknown) => { trenDiaRef.current[key] = JSON.stringify(value); };
    
    // Modal state management
    const [modalState, setModalState] = useState<ModalState>({type: null});
    
    const [isClosingModal, setIsClosingModal] = useState(false);

    // Load tabs from DB on mount
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            // PERF (2026-10-07): đọc SONG SONG mọi khoá cần cho lần nạp — bản cũ await tuần tự ~20 lượt
            // (4 khoá tab + 16 cờ migrate), mỗi lượt xếp hàng sau các giao dịch IndexedDB khác lúc mở app,
            // nên "Đang tải dữ liệu phân tích..." quay rất lâu trên điện thoại. Logic xử lý giữ nguyên.
            const MIGRATE_VERSIONS = Array.from({ length: 15 }, (_, i) => 10 + i); // V10..V24
            const [savedTabs, savedIndustryTabsRead, savedExploitationTabs, savedEfficiencyTabs, migratedFlags, hasMigratedPresetsV25] = await Promise.all([
                getCustomTabs(),
                getIndustryAnalysisCustomTabs(),
                getSetting<CustomExploitationTabConfig[]>('customExploitationTabs'),
                getSetting<CustomExploitationTabConfig[]>('efficiencyExploitationTabs'),
                Promise.all(MIGRATE_VERSIONS.map(v => getSetting(`presetTabsMigratedV${v}`).then(f => f === true))),
                getSetting('presetTabsMigratedV25').then(f => f === true),
            ]);
            if (!isMounted) return;
            ghiNhanTrenDia('customTabs', savedTabs ?? []);
            if (savedTabs) {
                const migratedTabs = savedTabs.map(tab => ({ ...tab, icon: tab.icon || 'bar-chart-3' }));
                setCustomTabs(migratedTabs);
            }
            const savedIndustryTabs = savedIndustryTabsRead;
            ghiNhanTrenDia('industryAnalysisCustomTabs', savedIndustryTabs ?? []);
            if (savedIndustryTabs) {
                setIndustryAnalysisTabs(savedIndustryTabs);
            }

            let finalExploitationTabs: CustomExploitationTabConfig[] = [];
            
            if (savedExploitationTabs) {
                // Filter out old presets per user request to delete BẢO HIỂM, SIM, ĐỒNG HỒ, PHỤ KIỆN, GIA DỤNG
                const filteredExploitationTabs = savedExploitationTabs.filter(tab => !tab.id.startsWith('preset_'));
                
                finalExploitationTabs = filteredExploitationTabs.map(normalizeExploitationTabColumns);
            }

            // Migration logic V10-V24: mỗi version lịch sử chỉ đơn thuần áp lại preset mới nhất
            // (presetExploitationTabs luôn phản ánh bản mới nhất tại thời điểm build) và tự đánh dấu
            // đã migrate — 15 khối trước đây bị copy-paste giống hệt nhau, chỉ khác số version.
            // Cờ đã đọc song song ở đầu hàm; phần áp preset + ghi cờ vẫn tuần tự theo đúng thứ tự version.
            for (let i = 0; i < MIGRATE_VERSIONS.length; i++) {
                const flagKey = `presetTabsMigratedV${MIGRATE_VERSIONS[i]}`;
                if (!migratedFlags[i]) {
                    // Filter out previous default tabs to prevent duplication
                    finalExploitationTabs = finalExploitationTabs.filter(tab => !tab.id.startsWith('default_tab_'));
                    // Thêm preset mới vào mảng
                    finalExploitationTabs = [...presetExploitationTabs, ...finalExploitationTabs] as CustomExploitationTabConfig[];
                    await saveSetting(flagKey, true);
                    if (!isMounted) return;
                }
            }

            // Migration logic for V25 preset tabs (Ensure spChinh tab contains DGD column)
            if (!hasMigratedPresetsV25) {
                const spChinhIndex = finalExploitationTabs.findIndex(tab => tab.id === 'spChinh');
                const spChinhCols: CustomColumnConfig[] = [
                    { id: 'slICT', name: 'ICT', type: 'quantity', filters: { selectedIndustries: ['ICT'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } },
                    { id: 'slCE_main', name: 'CE', type: 'quantity', filters: { selectedIndustries: ['CE'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } },
                    { id: 'slGiaDung_main', name: 'ĐGD', type: 'quantity', filters: { selectedIndustries: ['Gia dụng'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } },
                    { id: 'slSPChinh_Tong', name: 'Tổng', type: 'quantity', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } }
                ];
                if (spChinhIndex >= 0) {
                    finalExploitationTabs[spChinhIndex] = {
                        ...finalExploitationTabs[spChinhIndex],
                        columns: spChinhCols
                    };
                }
                // Máy chưa từng có khoá này (máy mới) thì KHÔNG lưu preset: để trống cho bản trên Cloud
                // về (preset lưu với dấu "bây giờ" sẽ được coi là mới hơn và đẩy đè tab của người dùng).
                if (savedExploitationTabs) {
                    await saveSetting('customExploitationTabs', finalExploitationTabs, 'local-employee-analysis');
                    ghiNhanTrenDia('customExploitationTabs', finalExploitationTabs);
                }
                await saveSetting('presetTabsMigratedV25', true);
            }

            if (finalExploitationTabs.length === 0) {
                // Tài khoản mới hoặc máy mới chưa có tab: nạp toàn bộ preset mặc định và lưu để hiển thị ổn định
                finalExploitationTabs = [...presetExploitationTabs] as CustomExploitationTabConfig[];
                await saveSetting('customExploitationTabs', finalExploitationTabs, 'local-employee-analysis');
                ghiNhanTrenDia('customExploitationTabs', finalExploitationTabs);
            } else if (savedExploitationTabs) {
                ghiNhanTrenDia('customExploitationTabs', finalExploitationTabs);
            }

            setCustomExploitationTabs(finalExploitationTabs);
            if (!('customExploitationTabs' in trenDiaRef.current)) {
                ghiNhanTrenDia('customExploitationTabs', finalExploitationTabs);
            }
            ghiNhanTrenDia('efficiencyExploitationTabs', savedEfficiencyTabs ?? []);
            
            if (savedEfficiencyTabs) {
                setEfficiencyExploitationTabs(savedEfficiencyTabs);
            } else {
                setEfficiencyExploitationTabs([]);
            }
            
            // Wait for React to apply state updates before marking as loaded and enabling saves
            setTimeout(() => {
                if (isMounted) {
                    isHydratedRef.current = true;
                    setIsInitialTabsLoaded(true);
                }
            }, 0);
        };
        loadData();
        return () => {
            isMounted = false;
        };
    }, []);

    // Lắng nghe sự thay đổi của IndexedDB (từ đồng bộ đám mây) để cập nhật nóng vào UI, tránh cache cũ
    useEffect(() => {
        const handleSettingChanged = async (e: CustomEvent<{ key: string; source?: string }>) => {
            const changedKey = e.detail?.key;
            const source = e.detail?.source;
            if (!changedKey) return;
            if (source === 'local-employee-analysis') return; // Bỏ qua sự kiện tự phát để tránh desync chặn lưu

            if (changedKey === 'customTabs') {
                const savedTabs = await getCustomTabs();
                if (savedTabs) {
                    const migratedTabs = savedTabs.map(tab => ({ ...tab, icon: tab.icon || 'bar-chart-3' }));
                    ghiNhanTrenDia('customTabs', migratedTabs);
                    setCustomTabs(prev => JSON.stringify(prev) !== JSON.stringify(migratedTabs) ? migratedTabs : prev);
                }
            } else if (changedKey === 'industryAnalysisCustomTabs') {
                const savedIndustryTabs = await getIndustryAnalysisCustomTabs();
                if (savedIndustryTabs) {
                    ghiNhanTrenDia('industryAnalysisCustomTabs', savedIndustryTabs);
                    setIndustryAnalysisTabs(prev => JSON.stringify(prev) !== JSON.stringify(savedIndustryTabs) ? savedIndustryTabs : prev);
                }
            } else if (changedKey === 'customExploitationTabs') {
                const savedExploitationTabs = await getSetting<CustomExploitationTabConfig[]>('customExploitationTabs');
                if (savedExploitationTabs) {
                    const filteredExploitationTabs = savedExploitationTabs.filter(tab => !tab.id.startsWith('preset_'));
                    const normalizedTabs = filteredExploitationTabs.map(normalizeExploitationTabColumns);
                    ghiNhanTrenDia('customExploitationTabs', normalizedTabs);
                    setCustomExploitationTabs(prev => JSON.stringify(prev) !== JSON.stringify(normalizedTabs) ? normalizedTabs : prev);
                }
            } else if (changedKey === 'efficiencyExploitationTabs') {
                const savedEfficiencyTabs = await getSetting<CustomExploitationTabConfig[]>('efficiencyExploitationTabs');
                if (savedEfficiencyTabs) {
                    ghiNhanTrenDia('efficiencyExploitationTabs', savedEfficiencyTabs);
                    setEfficiencyExploitationTabs(prev => JSON.stringify(prev) !== JSON.stringify(savedEfficiencyTabs) ? savedEfficiencyTabs : prev);
                }
            }
        };

        window.addEventListener('ycx-setting-changed', handleSettingChanged as unknown as EventListener);
        window.addEventListener('indexeddb-change', handleSettingChanged as unknown as EventListener);
        return () => {
            window.removeEventListener('ycx-setting-changed', handleSettingChanged as unknown as EventListener);
            window.removeEventListener('indexeddb-change', handleSettingChanged as unknown as EventListener);
        };
    }, []);

    // Save tabs to DB on change
    useEffect(() => {
        if (isInitialTabsLoaded && isHydratedRef.current) {
            // Chỉ lưu khoá thật sự KHÁC bản trên đĩa (xem trenDiaRef) — không vọng lại giá trị vừa nạp
            // hay vừa nhận từ Cloud.
            const luuNeuDoi = (key: string, value: unknown, luu: () => unknown) => {
                const json = JSON.stringify(value);
                if (trenDiaRef.current[key] === json) return;
                trenDiaRef.current[key] = json;
                luu();
            };
            luuNeuDoi('customTabs', customTabs, () => saveCustomTabs(customTabs, 'local-employee-analysis'));
            luuNeuDoi('industryAnalysisCustomTabs', industryAnalysisTabs, () => saveIndustryAnalysisCustomTabs(industryAnalysisTabs, 'local-employee-analysis'));
            luuNeuDoi('customExploitationTabs', customExploitationTabs, () => saveSetting('customExploitationTabs', customExploitationTabs, 'local-employee-analysis'));
            luuNeuDoi('efficiencyExploitationTabs', efficiencyExploitationTabs, () => saveSetting('efficiencyExploitationTabs', efficiencyExploitationTabs, 'local-employee-analysis'));
        }
    }, [customTabs, industryAnalysisTabs, customExploitationTabs, efficiencyExploitationTabs, isInitialTabsLoaded]);

    const getIconForTabName = (name: string): string => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('sim')) return 'smartphone-nfc';
        if (lowerName.includes('bảo hiểm')) return 'shield-check';
        if (lowerName.includes('đồng hồ')) return 'watch';
        if (lowerName.includes('camera')) return 'camera';
        if (lowerName.includes('gia dụng') || lowerName.includes('nước') || lowerName.includes('quạt') || lowerName.includes('nồi')) return 'blender';
        if (lowerName.includes('doanh thu')) return 'dollar-sign';
        if (lowerName.includes('top')) return 'award';
        if (lowerName.includes('phụ kiện')) return 'headphones';
        if (lowerName.includes('laptop')) return 'laptop';
        return 'bar-chart-3';
    };

    // --- MODAL SAVE HANDLERS ---
    const handleSaveTab = useCallback((tabName: string, icon: string, tabId?: string) => {
        const module = modalState.data?.module;
        const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;

        if (tabId) {
            setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: tabName, icon: icon || t.icon } : t));
        } else {
            const newTab: CustomContestTab = {
                id: `tab-${Date.now()}`,
                name: tabName,
                icon: icon || getIconForTabName(tabName),
                tables: []
            };
            setTabs(prev => [...prev, newTab]);
            if (module !== 'industryAnalysis') {
                setActiveTab(newTab.id);
            } else {
                if (modalState.data?.setActiveIndustrySubTab) {
                    modalState.data.setActiveIndustrySubTab(newTab.id);
                }
            }
        }
        setIsClosingModal(true);
    }, [setActiveTab, modalState.data]);

    const handleSaveTable = useCallback((tableName: string, defaultSortColumnId?: string) => {
        const { tabId, tableId, module } = modalState.data || {};
        if (!tabId) return;

        const tableUpdater = (prevTables: ContestTableConfig[]) => {
            if (tableId) { // Editing existing table
                return prevTables.map(t => t.id === tableId ? { ...t, tableName, defaultSortColumnId: defaultSortColumnId || t.defaultSortColumnId } : t);
            } else { // Creating new table
                const iconOptions = ['target', 'trophy', 'star', 'award', 'zap', 'flame', 'trending-up', 'check-circle', 'crown', 'medal', 'rocket', 'shield'];
                const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)];
                const newTable: ContestTableConfig = { id: `table-${Date.now()}`, tableName, icon: randomIcon, columns: [], defaultSortColumnId: defaultSortColumnId || undefined };
                return [...prevTables, newTable];
            }
        };

        const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;
        setTabs(prevTabs => {
            const newTabs = [...prevTabs];
            const tabIndex = newTabs.findIndex(t => t.id === tabId);
            if (tabIndex === -1) return prevTabs;

            const updatedTab = { ...newTabs[tabIndex], tables: tableUpdater(newTabs[tabIndex].tables) };
            newTabs[tabIndex] = updatedTab;
            return newTabs;
        });
        setIsClosingModal(true);
    }, [modalState.data]);

    const handleSaveColumn = useCallback((columnConfig: ColumnConfig) => {
        const { tabId, tableId, module } = modalState.data || {};
        if (!tabId || !tableId) return;

        const columnUpdater = (prevTables: ContestTableConfig[]) => {
            const newTables = [...prevTables];
            const tableIndex = newTables.findIndex(t => t.id === tableId);
            if (tableIndex === -1) return prevTables;

            const updatedTable = { ...newTables[tableIndex] };
            const columnIndex = updatedTable.columns.findIndex(c => c.id === columnConfig.id);

            if (columnIndex > -1) { // Editing
                updatedTable.columns[columnIndex] = columnConfig;
            } else { // Creating
                updatedTable.columns.push(columnConfig);
            }
            newTables[tableIndex] = updatedTable;
            return newTables;
        };
        
        const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;
        setTabs(prev => {
            const newTabs = [...prev];
            const tabIndex = newTabs.findIndex(t => t.id === tabId);
            if (tabIndex === -1) return prev;
            
            const updatedTab = { ...newTabs[tabIndex], tables: columnUpdater(newTabs[tabIndex].tables) };
            newTabs[tabIndex] = updatedTab;
            return newTabs;
        });
        
        if (modalState.data?.editingColumn) {
            setIsClosingModal(true);
        }
    }, [modalState.data]);

    const handleDeleteColumnDirect = useCallback((tabId: string, tableId: string, columnId: string, module?: string) => {
        const columnDeleter = (prevTables: ContestTableConfig[]) => {
            const newTables = [...prevTables];
            const tableIndex = newTables.findIndex(t => t.id === tableId);
            if (tableIndex > -1) {
                const updatedTable = { ...newTables[tableIndex] };
                updatedTable.columns = updatedTable.columns.filter(c => c.id !== columnId);
                newTables[tableIndex] = updatedTable;
            }
            return newTables;
        };

        const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;
        setTabs(prev => {
            const newTabs = [...prev];
            const tabIndex = newTabs.findIndex(t => t.id === tabId);
            if (tabIndex > -1) {
                const updatedTab = { ...newTabs[tabIndex], tables: columnDeleter(newTabs[tabIndex].tables) };
                newTabs[tabIndex] = updatedTab;
            }
            return newTabs;
        });
    }, []);

    // --- MODAL DELETE HANDLERS ---
    const handleDeleteTab = useCallback(() => {
        if (modalState.data?.tabId) {
            const { tabIdToDelete = modalState.data.tabId, module } = modalState.data;
            const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;
            
            setTabs(prev => prev.filter(t => t.id !== tabIdToDelete));
            
            if (module !== 'industryAnalysis') {
                if (activeTab === tabIdToDelete) {
                    const allTabIds = defaultTabs.map(t => t.id);
                    const remainingCustomIds = customTabs.filter(t => t.id !== tabIdToDelete).map(t => t.id);
                    setActiveTab(remainingCustomIds[0] || allTabIds[0]);
                }
            } else {
                if (modalState.data?.activeIndustrySubTab === tabIdToDelete && modalState.data?.setActiveIndustrySubTab) {
                    modalState.data.setActiveIndustrySubTab('chiTiet');
                }
            }
            setIsClosingModal(true);
        }
    }, [modalState.data, activeTab, defaultTabs, customTabs, setActiveTab]);
    
    const handleDeleteTable = useCallback(() => {
        if (modalState.data?.tabId && modalState.data?.tableId) {
            const { tabId, tableId, module } = modalState.data;

            const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;
            setTabs(prev => {
                const newTabs = [...prev];
                const tabIndex = newTabs.findIndex(t => t.id === tabId);
                if (tabIndex > -1) {
                    const updatedTab = { ...newTabs[tabIndex] };
                    updatedTab.tables = updatedTab.tables.filter(t => t.id !== tableId);
                    newTabs[tabIndex] = updatedTab;
                }
                return newTabs;
            });
            setIsClosingModal(true);
        }
    }, [modalState.data]);
    
    const handleConfirmDeleteColumn = useCallback(() => {
        if (modalState.data?.tabId && modalState.data?.tableId && modalState.data?.columnId) {
            const { tabId, tableId, columnId, module } = modalState.data;

            const columnDeleter = (prevTables: ContestTableConfig[]) => {
                const newTables = [...prevTables];
                const tableIndex = newTables.findIndex(t => t.id === tableId);
                if (tableIndex > -1) {
                    const updatedTable = { ...newTables[tableIndex] };
                    updatedTable.columns = updatedTable.columns.filter(c => c.id !== columnId);
                    newTables[tableIndex] = updatedTable;
                }
                return newTables;
            };

            const setTabs = module === 'industryAnalysis' ? setIndustryAnalysisTabs : setCustomTabs;
            setTabs(prev => {
                const newTabs = [...prev];
                const tabIndex = newTabs.findIndex(t => t.id === tabId);
                if (tabIndex > -1) {
                    const updatedTab = { ...newTabs[tabIndex], tables: columnDeleter(newTabs[tabIndex].tables) };
                    newTabs[tabIndex] = updatedTab;
                }
                return newTabs;
            });
            setIsClosingModal(true);
        }
    }, [modalState.data]);

    const handleSaveCustomExploitationTab = useCallback((tabConfig: CustomExploitationTabSaveInput) => {
        const targetMode = modalState.data?.targetMode || 'detail';
        const setTabs = targetMode === 'detail' ? setCustomExploitationTabs : setEfficiencyExploitationTabs;
        setTabs(prev => {
            if (tabConfig.id) {
                const existing = prev.find(t => t.id === tabConfig.id);
                if (existing) {
                    return prev.map(t => t.id === tabConfig.id ? (tabConfig as CustomExploitationTabConfig) : t);
                } else {
                    return [...prev, { ...tabConfig, id: tabConfig.id, order: prev.length }];
                }
            } else {
                const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                return [...prev, { ...tabConfig, id: `custom-${safeId}`, order: prev.length }];
            }
        });
        setIsClosingModal(true);
    }, [modalState.data]);

    const handleDeleteCustomExploitationTab = useCallback(() => {
        if (modalState.data?.tabId) {
            const targetMode = modalState.data?.targetMode || 'detail';
            const setTabs = targetMode === 'detail' ? setCustomExploitationTabs : setEfficiencyExploitationTabs;
            setTabs(prev => prev.filter(t => t.id !== modalState.data?.tabId));
            setIsClosingModal(true);
        }
    }, [modalState.data]);

    return {
        customTabs,
        industryAnalysisTabs,
        isInitialTabsLoaded,
        modalState,
        setModalState,
        isClosingModal,
        setIsClosingModal,
        handleSaveTab,
        handleSaveTable,
        handleSaveColumn,
        handleDeleteTab,
        handleDeleteTable,
        handleConfirmDeleteColumn,
        handleDeleteColumnDirect,
        handleSaveCustomExploitationTab,
        handleDeleteCustomExploitationTab,
        customExploitationTabs,
        setCustomExploitationTabs,
        efficiencyExploitationTabs,
        setEfficiencyExploitationTabs
    };
};
