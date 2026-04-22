
import { useState, useCallback, useEffect, startTransition } from 'react';
import type { FilterState } from '../types';
import * as dbService from '../services/dbService';



export const initialFilterState: FilterState = {
    kho: [],
    xuat: 'all',
    trangThai: ['1 - Mới'],
    nguoiTao: [],
    department: [],
    parent: [],
    startDate: '',
    endDate: '',
    dateRange: 'all',
    selectedMonths: [],
    industryGrid: {
        selectedGroups: [],
        selectedSubgroups: [],
    },
    summaryTable: {
        kho: [],
        child: [],
        manufacturer: [],
        creator: [],
        product: [],
        drilldownOrder: ['kho', 'parent', 'child', 'creator', 'manufacturer', 'product'],
        sort: { column: 'totalRevenue', direction: 'desc' }
    }
};

export const useFilterState = () => {
    const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load initial state from IndexedDB
    useEffect(() => {
        const loadSavedFilters = async () => {
            try {
                const fullSavedFilters = await dbService.getSetting<FilterState>('dashboard_global_filters_v2');
                if (fullSavedFilters) {
                    // Safe merge with initial state to ensure no missing/null arrays
                    setFilterState({
                        ...initialFilterState,
                        ...fullSavedFilters,
                        kho: Array.isArray(fullSavedFilters.kho) ? fullSavedFilters.kho : (fullSavedFilters.kho ? [fullSavedFilters.kho as any] : []),
                        trangThai: fullSavedFilters.trangThai || [],
                        nguoiTao: fullSavedFilters.nguoiTao || [],
                        department: fullSavedFilters.department || [],
                        parent: fullSavedFilters.parent || [],
                        industryGrid: {
                            ...initialFilterState.industryGrid,
                            ...(fullSavedFilters.industryGrid || {})
                        },
                        summaryTable: {
                            ...initialFilterState.summaryTable,
                            ...(fullSavedFilters.summaryTable || {})
                        }
                    });
                } else {
                    const savedIndustry = await dbService.getIndustryGridFilters();
                    const savedSummary = await dbService.getSummaryTableConfig();
                    const savedKho = await dbService.getSetting<string | string[]>('filter_kho');
                    const savedDepartment = await dbService.getSetting<string[]>('filter_department');
                    
                    setFilterState(prev => ({
                        ...prev,
                        industryGrid: savedIndustry || prev.industryGrid,
                        summaryTable: savedSummary || prev.summaryTable,
                        kho: Array.isArray(savedKho) ? savedKho : (savedKho ? [savedKho] : []),
                        department: savedDepartment || prev.department || []
                    }));
                }
            } catch (error) {
                console.error("Failed to load filters from IndexedDB:", error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadSavedFilters();
    }, []);

    // Auto-save any filter state changes to IndexedDB
    useEffect(() => {
        if (isLoaded) {
            dbService.saveSetting('dashboard_global_filters_v2', filterState).catch(console.error);
        }
    }, [filterState, isLoaded]);

    const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
        startTransition(() => {
            setFilterState(prev => ({ ...prev, ...newFilters }));
        });
    }, []);

    return {
        filterState,
        setFilterState,
        handleFilterChange,
        isFilterLoaded: isLoaded
    };
};
