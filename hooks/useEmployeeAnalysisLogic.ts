import { useState, useEffect, useCallback, useRef } from 'react';
import type { CustomContestTab, ContestTableConfig, ColumnConfig, CustomExploitationTabConfig } from '../types';
import { getCustomTabs, saveCustomTabs, getIndustryAnalysisCustomTabs, saveIndustryAnalysisCustomTabs, getSetting, saveSetting } from '../services/dbService';
import { presetExploitationTabs } from './presetExploitationTabs';

export const useEmployeeAnalysisLogic = (activeTab: string, setActiveTab: (id: string) => void, defaultTabs: any[]) => {
    const [customTabs, setCustomTabs] = useState<CustomContestTab[]>([]);
    const [industryAnalysisTabs, setIndustryAnalysisTabs] = useState<CustomContestTab[]>([]);
    const [customExploitationTabs, setCustomExploitationTabs] = useState<CustomExploitationTabConfig[]>([]);
    const [efficiencyExploitationTabs, setEfficiencyExploitationTabs] = useState<CustomExploitationTabConfig[]>([]);
    const [isInitialTabsLoaded, setIsInitialTabsLoaded] = useState(false);
    const isHydratedRef = useRef(false);
    
    // Modal state management
    const [modalState, setModalState] = useState<{
        type: 'CREATE_TAB' | 'EDIT_TAB' | 'CREATE_TABLE' | 'EDIT_TABLE' | 'CREATE_COLUMN' | 'EDIT_COLUMN' | 'CONFIRM_DELETE_TAB' | 'CONFIRM_DELETE_TABLE' | 'CONFIRM_DELETE_COLUMN' | null, 
        data?: any
    }>({type: null});
    
    const [isClosingModal, setIsClosingModal] = useState(false);

    // Load tabs from DB on mount
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            const savedTabs = await getCustomTabs();
            if (!isMounted) return;
            if (savedTabs) {
                const migratedTabs = savedTabs.map(tab => ({ ...tab, icon: tab.icon || 'bar-chart-3' }));
                setCustomTabs(migratedTabs);
            }
            const savedIndustryTabs = await getIndustryAnalysisCustomTabs();
            if (!isMounted) return;
            if (savedIndustryTabs) {
                setIndustryAnalysisTabs(savedIndustryTabs);
            }
            const savedExploitationTabs = await getSetting<CustomExploitationTabConfig[]>('customExploitationTabs');
            const savedEfficiencyTabs = await getSetting<CustomExploitationTabConfig[]>('efficiencyExploitationTabs');
            if (!isMounted) return;
            
            let finalExploitationTabs: CustomExploitationTabConfig[] = [];
            
            if (savedExploitationTabs) {
                // Filter out old presets per user request to delete BẢO HIỂM, SIM, ĐỒNG HỒ, PHỤ KIỆN, GIA DỤNG
                const filteredExploitationTabs = savedExploitationTabs.filter(tab => !tab.id.startsWith('preset_'));
                
                finalExploitationTabs = filteredExploitationTabs.map(tab => {
                    if (tab.columns && Array.isArray(tab.columns)) return tab;
                    
                    const columns: any[] = [];
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
                                numeratorFilters: tab.filters,
                                denominatorFilters: tab.percentageConfig?.filters || { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }
                            }
                        });
                    }
                    return { ...tab, columns };
                });
            }

            // Migration logic for V10 preset tabs (Clean up duplicate DONG HO filters)
            const hasMigratedPresetsV10 = await getSetting('presetTabsMigratedV10') === true;
            if (!isMounted) return;
            if (!hasMigratedPresetsV10) {
                // Filter out previous default tabs to prevent duplication
                finalExploitationTabs = finalExploitationTabs.filter(tab => !tab.id.startsWith('default_tab_'));
                // Thêm preset mới vào mảng
                finalExploitationTabs = [...presetExploitationTabs, ...finalExploitationTabs] as CustomExploitationTabConfig[];
                await saveSetting('presetTabsMigratedV10', true);
            }

            if (finalExploitationTabs.length > 0) {
                setCustomExploitationTabs(finalExploitationTabs);
            }
            
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

    const isUpdatingFromCloudRef = useRef(false);

    // Lắng nghe sự thay đổi của IndexedDB (từ đồng bộ đám mây) để cập nhật nóng vào UI, tránh cache cũ
    useEffect(() => {
        const handleSettingChanged = async (e: any) => {
            const changedKey = e.detail?.key;
            const source = e.detail?.source;
            if (!changedKey) return;
            if (source === 'local-employee-analysis') return; // Bỏ qua sự kiện tự phát để tránh desync chặn lưu

            if (changedKey === 'customTabs') {
                const savedTabs = await getCustomTabs();
                if (savedTabs) {
                    const migratedTabs = savedTabs.map(tab => ({ ...tab, icon: tab.icon || 'bar-chart-3' }));
                    setCustomTabs(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(migratedTabs)) {
                            isUpdatingFromCloudRef.current = true;
                            return migratedTabs;
                        }
                        return prev;
                    });
                }
            } else if (changedKey === 'industryAnalysisCustomTabs') {
                const savedIndustryTabs = await getIndustryAnalysisCustomTabs();
                if (savedIndustryTabs) {
                    setIndustryAnalysisTabs(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(savedIndustryTabs)) {
                            isUpdatingFromCloudRef.current = true;
                            return savedIndustryTabs;
                        }
                        return prev;
                    });
                }
            } else if (changedKey === 'customExploitationTabs') {
                const savedExploitationTabs = await getSetting<CustomExploitationTabConfig[]>('customExploitationTabs');
                if (savedExploitationTabs) {
                    const filteredExploitationTabs = savedExploitationTabs.filter(tab => !tab.id.startsWith('preset_'));
                    const normalizedTabs = filteredExploitationTabs.map(tab => {
                        if (tab.columns && Array.isArray(tab.columns)) return tab;
                        const columns: any[] = [];
                        const displayOpts = tab.displayOptions || { showQuantity: true, showRevenue: true, showPercentage: true };
                        if (displayOpts.showQuantity) columns.push({ id: `sl`, name: 'SL', type: 'quantity', filters: tab.filters });
                        if (displayOpts.showRevenue) columns.push({ id: `dt`, name: 'D.THU', type: 'revenue', filters: tab.filters });
                        if (displayOpts.showPercentage) {
                            columns.push({ 
                                id: `pct`, 
                                name: '%', 
                                type: 'percentage', 
                                percentageConfig: {
                                    numeratorMetric: tab.percentageConfig?.numeratorMetric || 'quantity',
                                    baseMetric: tab.percentageConfig?.baseMetric || 'quantity',
                                    numeratorFilters: tab.filters,
                                    denominatorFilters: tab.percentageConfig?.filters || { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }
                                }
                            });
                        }
                        return { ...tab, columns };
                    });
                    setCustomExploitationTabs(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(normalizedTabs)) {
                            isUpdatingFromCloudRef.current = true;
                            return normalizedTabs;
                        }
                        return prev;
                    });
                }
            } else if (changedKey === 'efficiencyExploitationTabs') {
                const savedEfficiencyTabs = await getSetting<CustomExploitationTabConfig[]>('efficiencyExploitationTabs');
                if (savedEfficiencyTabs) {
                    setEfficiencyExploitationTabs(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(savedEfficiencyTabs)) {
                            isUpdatingFromCloudRef.current = true;
                            return savedEfficiencyTabs;
                        }
                        return prev;
                    });
                }
            }
        };

        window.addEventListener('ycx-setting-changed', handleSettingChanged);
        window.addEventListener('indexeddb-change', handleSettingChanged);
        return () => {
            window.removeEventListener('ycx-setting-changed', handleSettingChanged);
            window.removeEventListener('indexeddb-change', handleSettingChanged);
        };
    }, []);

    // Save tabs to DB on change
    useEffect(() => {
        if (isInitialTabsLoaded && isHydratedRef.current) {
            if (isUpdatingFromCloudRef.current) {
                // Reset cờ hiệu và bỏ qua việc ghi đè lên IndexedDB để tránh lặp vô tận
                isUpdatingFromCloudRef.current = false;
                return;
            }
            saveCustomTabs(customTabs, 'local-employee-analysis');
            saveIndustryAnalysisCustomTabs(industryAnalysisTabs, 'local-employee-analysis');
            saveSetting('customExploitationTabs', customExploitationTabs, 'local-employee-analysis');
            saveSetting('efficiencyExploitationTabs', efficiencyExploitationTabs, 'local-employee-analysis');
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

    const handleSaveCustomExploitationTab = useCallback((tabConfig: any) => {
        const targetMode = modalState.data?.targetMode || 'detail';
        const setTabs = targetMode === 'detail' ? setCustomExploitationTabs : setEfficiencyExploitationTabs;
        setTabs(prev => {
            if (tabConfig.id) {
                const existing = prev.find(t => t.id === tabConfig.id);
                if (existing) {
                    return prev.map(t => t.id === tabConfig.id ? tabConfig : t);
                } else {
                    return [...prev, { ...tabConfig, order: prev.length }];
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
            setTabs(prev => prev.filter(t => t.id !== modalState.data.tabId));
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
