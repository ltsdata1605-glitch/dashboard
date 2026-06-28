import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { saveSummaryTableConfig } from '../../../../services/dbService';

export const useSummaryFilters = (filters: any, onFilterChange: any, isCrossSellingMode: boolean) => {
    const { summaryTable: summaryTableFilters, parent: globalParentFilters } = filters;
    const [isPending, startTransition] = useTransition();

    // Track whether the initial sync from global→local has completed.
    // After initial sync, local state is authoritative and should NOT be overwritten by global changes.
    const isInitializedRef = useRef(false);

    const [localDrilldownOrder, setLocalDrilldownOrder] = useState<string[]>(() => {
        let order = ['kho', 'parent', 'child', 'manufacturer', 'creator', 'product'];
        if (summaryTableFilters?.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0) {
            order = [...summaryTableFilters.drilldownOrder];
            if (!order.includes('kho')) {
                order = ['kho', ...order];
            }
        }
        // Migration: Ensure 'manufacturer' comes before 'creator' (e.g. parent > child > manufacturer)
        const creatorIdx = order.indexOf('creator');
        const manufacturerIdx = order.indexOf('manufacturer');
        if (creatorIdx !== -1 && manufacturerIdx !== -1 && creatorIdx < manufacturerIdx) {
            const childIdx = order.indexOf('child');
            if (childIdx !== -1) {
                const prefix = order.slice(0, childIdx + 1);
                const suffix = order.slice(childIdx + 1).filter(x => x !== 'creator' && x !== 'manufacturer');
                order = [...prefix, 'manufacturer', 'creator', ...suffix];
            }
        }
        return order;
    });
    const [crossSellingDrilldownOrder, setCrossSellingDrilldownOrder] = useState<string[]>(['parent', 'child']);
    
    const activeDrilldownOrder = isCrossSellingMode ? crossSellingDrilldownOrder : localDrilldownOrder;

    const [localParentFilters, setLocalParentFilters] = useState<string[]>(globalParentFilters || []);
    const [localKhoFilters, setLocalKhoFilters] = useState<string[]>(summaryTableFilters?.kho || []);
    const [localChildFilters, setLocalChildFilters] = useState<string[]>(summaryTableFilters?.child || []);
    const [localManufacturerFilters, setLocalManufacturerFilters] = useState<string[]>(summaryTableFilters?.manufacturer || []);
    const [localCreatorFilters, setLocalCreatorFilters] = useState<string[]>(summaryTableFilters?.creator || []);
    const [localProductFilters, setLocalProductFilters] = useState<string[]>(summaryTableFilters?.product || []);

    const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

    // ONE-TIME initial sync from global→local when filters first arrive from IndexedDB.
    // After this, local state is the single source of truth and won't be overwritten.
    useEffect(() => {
        if (isInitializedRef.current) return;
        if (!summaryTableFilters) return;

        // Only sync once: populate local state from the persisted global state
        isInitializedRef.current = true;

        if (globalParentFilters?.length > 0) setLocalParentFilters(globalParentFilters);
        if (summaryTableFilters.kho?.length > 0) setLocalKhoFilters(summaryTableFilters.kho);
        if (summaryTableFilters.child?.length > 0) setLocalChildFilters(summaryTableFilters.child);
        if (summaryTableFilters.manufacturer?.length > 0) setLocalManufacturerFilters(summaryTableFilters.manufacturer);
        if (summaryTableFilters.creator?.length > 0) setLocalCreatorFilters(summaryTableFilters.creator);
        if (summaryTableFilters.product?.length > 0) setLocalProductFilters(summaryTableFilters.product);
        
        if (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0) {
            let savedOrder = [...summaryTableFilters.drilldownOrder];
            if (!savedOrder.includes('kho')) {
                savedOrder = ['kho', ...savedOrder];
            }
            // Migration: Ensure 'manufacturer' comes before 'creator'
            const creatorIdx = savedOrder.indexOf('creator');
            const manufacturerIdx = savedOrder.indexOf('manufacturer');
            if (creatorIdx !== -1 && manufacturerIdx !== -1 && creatorIdx < manufacturerIdx) {
                const childIdx = savedOrder.indexOf('child');
                if (childIdx !== -1) {
                    const prefix = savedOrder.slice(0, childIdx + 1);
                    const suffix = savedOrder.slice(childIdx + 1).filter(x => x !== 'creator' && x !== 'manufacturer');
                    savedOrder = [...prefix, 'manufacturer', 'creator', ...suffix];
                }
            }
            setLocalDrilldownOrder(savedOrder);
        }
    }, [summaryTableFilters, globalParentFilters]);

    // Allow external updates (e.g., from IndustryGrid drilldown) to update localParentFilters
    useEffect(() => {
        if (!isInitializedRef.current) return;
        setLocalParentFilters(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(globalParentFilters || [])) {
                return globalParentFilters || [];
            }
            return prev;
        });
    }, [globalParentFilters]);

    // Debounced save: push local state → global (onFilterChange) + IndexedDB.
    // This is the ONLY direction of sync after initialization.
    useEffect(() => {
        // Skip until initialized
        if (!isInitializedRef.current) return;

        const currentConfig = {
            parent: localParentFilters,
            kho: localKhoFilters,
            child: localChildFilters,
            manufacturer: localManufacturerFilters,
            creator: localCreatorFilters,
            product: localProductFilters,
            drilldownOrder: localDrilldownOrder,
            sort: summaryTableFilters?.sort
        };
        const timer = setTimeout(() => {
            saveSummaryTableConfig(currentConfig).catch(err => console.error("Failed to save config:", err));
            
            const updates: any = {};
            if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) {
                updates.parent = localParentFilters;
            }
            
            const summaryChanged = 
                JSON.stringify(summaryTableFilters?.kho || []) !== JSON.stringify(localKhoFilters) ||
                JSON.stringify(summaryTableFilters?.child || []) !== JSON.stringify(localChildFilters) ||
                JSON.stringify(summaryTableFilters?.manufacturer || []) !== JSON.stringify(localManufacturerFilters) ||
                JSON.stringify(summaryTableFilters?.creator || []) !== JSON.stringify(localCreatorFilters) ||
                JSON.stringify(summaryTableFilters?.product || []) !== JSON.stringify(localProductFilters) ||
                JSON.stringify(summaryTableFilters?.drilldownOrder || []) !== JSON.stringify(localDrilldownOrder);
                
            if (summaryChanged) {
                updates.summaryTable = {
                    ...summaryTableFilters,
                    kho: localKhoFilters,
                    child: localChildFilters,
                    manufacturer: localManufacturerFilters,
                    creator: localCreatorFilters,
                    product: localProductFilters,
                    drilldownOrder: localDrilldownOrder
                };
            }

            if (Object.keys(updates).length > 0) {
                onFilterChange(updates);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localParentFilters, localKhoFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, localDrilldownOrder, summaryTableFilters, globalParentFilters, onFilterChange]);

    const handleLocalFilterChange = useCallback((type: string, selected: string[], onClearExpanded: () => void) => {
        startTransition(() => {
            if (type === 'kho') setLocalKhoFilters(selected);
            else if (type === 'parent') setLocalParentFilters(selected);
            else if (type === 'child') setLocalChildFilters(selected);
            else if (type === 'manufacturer') setLocalManufacturerFilters(selected);
            else if (type === 'creator') setLocalCreatorFilters(selected);
            else if (type === 'product') setLocalProductFilters(selected);
            
            if (type === 'parent') {
                setLocalChildFilters([]);
            }
            onClearExpanded();
        });
    }, []);

    const handleResetAllFilters = useCallback((onClearExpanded: () => void) => {
        startTransition(() => {
            setLocalKhoFilters([]);
            setLocalParentFilters([]);
            setLocalChildFilters([]);
            setLocalManufacturerFilters([]);
            setLocalCreatorFilters([]);
            setLocalProductFilters([]);
            onClearExpanded();
        });
    }, []);

    const hasActiveFilters = localKhoFilters.length > 0 ||
                             localParentFilters.length > 0 || 
                             localChildFilters.length > 0 || 
                             localManufacturerFilters.length > 0 || 
                             localCreatorFilters.length > 0 || 
                             localProductFilters.length > 0;

    return {
        localDrilldownOrder,
        setLocalDrilldownOrder,
        crossSellingDrilldownOrder,
        setCrossSellingDrilldownOrder,
        activeDrilldownOrder,
        localKhoFilters,
        localParentFilters,
        localChildFilters,
        localManufacturerFilters,
        localCreatorFilters,
        localProductFilters,
        activeFilterKey,
        setActiveFilterKey,
        isPending,
        startTransition,
        handleLocalFilterChange,
        handleResetAllFilters,
        hasActiveFilters
    };
};
