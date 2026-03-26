
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
                const savedIndustry = await dbService.getIndustryGridFilters();
                const savedSummary = await dbService.getSummaryTableConfig();
                const savedKho = await dbService.getSetting<string>('filter_kho');
                const savedDepartment = await dbService.getSetting<string[]>('filter_department');
                
                setFilterState(prev => ({
                    ...prev,
                    industryGrid: savedIndustry || prev.industryGrid,
                    summaryTable: savedSummary || prev.summaryTable,
                    kho: savedKho || prev.kho,
                    department: savedDepartment || prev.department
                }));
            } catch (error) {
                console.error("Failed to load filters from IndexedDB:", error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadSavedFilters();
    }, []);

    const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
        setFilterState(prev => {
            const updated = { ...prev, ...newFilters };
            
            // Persist changes to IndexedDB
            if (newFilters.industryGrid) {
                const industryGrid = { ...prev.industryGrid, ...newFilters.industryGrid };
                updated.industryGrid = industryGrid;
                dbService.saveIndustryGridFilters(industryGrid).catch(console.error);
            }
            
            if (newFilters.summaryTable) {
                const summaryTable = { ...prev.summaryTable, ...newFilters.summaryTable };
                updated.summaryTable = summaryTable;
                dbService.saveSummaryTableConfig(summaryTable).catch(console.error);
            }

            if (newFilters.kho !== undefined) {
                dbService.saveSetting('filter_kho', newFilters.kho).catch(console.error);
            }

            if (newFilters.department !== undefined) {
                dbService.saveSetting('filter_department', newFilters.department).catch(console.error);
            }
            
            return updated;
        });
    }, []);

    return {
        filterState,
        setFilterState,
        handleFilterChange,
        isFilterLoaded: isLoaded
    };
};
