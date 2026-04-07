import { useState, useEffect, useCallback } from 'react';
import type { CustomContestTab, ContestTableConfig, ColumnConfig } from '../types';
import { getCustomTabs, saveCustomTabs, getIndustryAnalysisCustomTabs, saveIndustryAnalysisCustomTabs } from '../services/dbService';

export const useEmployeeAnalysisLogic = (activeTab: string, setActiveTab: (id: string) => void, defaultTabs: any[]) => {
    const [customTabs, setCustomTabs] = useState<CustomContestTab[]>([]);
    const [industryAnalysisTabs, setIndustryAnalysisTabs] = useState<CustomContestTab[]>([]);
    const [isInitialTabsLoaded, setIsInitialTabsLoaded] = useState(false);
    
    // Modal state management
    const [modalState, setModalState] = useState<{
        type: 'CREATE_TAB' | 'EDIT_TAB' | 'CREATE_TABLE' | 'EDIT_TABLE' | 'CREATE_COLUMN' | 'EDIT_COLUMN' | 'CONFIRM_DELETE_TAB' | 'CONFIRM_DELETE_TABLE' | 'CONFIRM_DELETE_COLUMN' | null, 
        data?: any
    }>({type: null});
    
    const [isClosingModal, setIsClosingModal] = useState(false);

    // Load tabs from DB on mount
    useEffect(() => {
        const loadData = async () => {
            const savedTabs = await getCustomTabs();
            if (savedTabs) {
                const migratedTabs = savedTabs.map(tab => ({ ...tab, icon: tab.icon || 'bar-chart-3' }));
                setCustomTabs(migratedTabs);
            }
            const savedIndustryTabs = await getIndustryAnalysisCustomTabs();
            if (savedIndustryTabs) {
                setIndustryAnalysisTabs(savedIndustryTabs);
            }
            setIsInitialTabsLoaded(true);
        };
        loadData();
    }, []);

    // Save tabs to DB on change
    useEffect(() => {
        if (isInitialTabsLoaded) {
            saveCustomTabs(customTabs);
            saveIndustryAnalysisCustomTabs(industryAnalysisTabs);
        }
    }, [customTabs, industryAnalysisTabs, isInitialTabsLoaded]);

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
                const newTable: ContestTableConfig = { id: `table-${Date.now()}`, tableName, columns: [], defaultSortColumnId: defaultSortColumnId || undefined };
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
        handleDeleteColumnDirect
    };
};
