
import { useState, useCallback, useEffect } from 'react';
import type { FilterState } from '../types';
import * as dbService from '../services/dbService';

export const initialFilterState: FilterState = {
    kho: 'all',
    xuat: 'all',
    trangThai: [],
    nguoiTao: [],
    department: [],
    parent: [],
    startDate: '',
    endDate: '',
    dateRange: 'all',
    industryGrid: {
        selectedGroups: [],
        selectedSubgroups: [],
    },
    summaryTable: {
        child: [],
        manufacturer: [],
        creator: [],
        product: [],
        drilldownOrder: ['parent', 'child', 'creator', 'manufacturer', 'product'],
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
                    const savedKho = await dbService.getSetting<string>('filter_kho');
                    const savedDepartment = await dbService.getSetting<string[]>('filter_department');
                    
                    setFilterState(prev => ({
                        ...prev,
                        industryGrid: savedIndustry || prev.industryGrid,
                        summaryTable: savedSummary || prev.summaryTable,
                        kho: savedKho || prev.kho,
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
        setFilterState(prev => ({ ...prev, ...newFilters }));
    }, []);

    return {
        filterState,
        setFilterState,
        handleFilterChange,
        isFilterLoaded: isLoaded
    };
};
