import { useState, useEffect, useRef, useDeferredValue, useCallback, useTransition } from 'react';
import { saveSummaryTableConfig } from '../../../../services/dbService';

export const useSummaryFilters = (filters: any, onFilterChange: any, isCrossSellingMode: boolean) => {
    const { summaryTable: summaryTableFilters, parent: globalParentFilters } = filters;
    const [isPending, startTransition] = useTransition();

    // Track whether the initial sync from global→local has completed.
    // After initial sync, local state is authoritative and should NOT be overwritten by global changes.
    const isInitializedRef = useRef(false);

    const [localDrilldownOrder, setLocalDrilldownOrder] = useState<string[]>(
        (summaryTableFilters?.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0)
            ? summaryTableFilters.drilldownOrder
            : ['parent', 'child', 'creator', 'manufacturer', 'product', 'warehouse']
    );
    const [crossSellingDrilldownOrder, setCrossSellingDrilldownOrder] = useState<string[]>(['parent', 'child']);
    
    const activeDrilldownOrder = isCrossSellingMode ? crossSellingDrilldownOrder : localDrilldownOrder;
    const deferredDrilldownOrder = useDeferredValue(activeDrilldownOrder);

    const [localParentFilters, setLocalParentFilters] = useState<string[]>(globalParentFilters || []);
    const [localChildFilters, setLocalChildFilters] = useState<string[]>(summaryTableFilters?.child || []);
    const [localManufacturerFilters, setLocalManufacturerFilters] = useState<string[]>(summaryTableFilters?.manufacturer || []);
    const [localCreatorFilters, setLocalCreatorFilters] = useState<string[]>(summaryTableFilters?.creator || []);
    const [localProductFilters, setLocalProductFilters] = useState<string[]>(summaryTableFilters?.product || []);
    const [localWarehouseFilters, setLocalWarehouseFilters] = useState<string[]>(summaryTableFilters?.warehouse || []);

    const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

    // ONE-TIME initial sync from global→local when filters first arrive from IndexedDB.
    // After this, local state is the single source of truth and won't be overwritten.
    useEffect(() => {
        if (isInitializedRef.current) return;
        if (!summaryTableFilters) return;

        // Only sync once: populate local state from the persisted global state
        isInitializedRef.current = true;

        if (globalParentFilters?.length > 0) setLocalParentFilters(globalParentFilters);
        if (summaryTableFilters.child?.length > 0) setLocalChildFilters(summaryTableFilters.child);
        if (summaryTableFilters.manufacturer?.length > 0) setLocalManufacturerFilters(summaryTableFilters.manufacturer);
        if (summaryTableFilters.creator?.length > 0) setLocalCreatorFilters(summaryTableFilters.creator);
        if (summaryTableFilters.product?.length > 0) setLocalProductFilters(summaryTableFilters.product);
        if (summaryTableFilters.warehouse?.length > 0) setLocalWarehouseFilters(summaryTableFilters.warehouse);
        
        if (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0) {
            setLocalDrilldownOrder(summaryTableFilters.drilldownOrder);
        }
    }, [summaryTableFilters, globalParentFilters]);

    // Debounced save: push local state → global (onFilterChange) + IndexedDB.
    // This is the ONLY direction of sync after initialization.
    useEffect(() => {
        // Skip until initialized
        if (!isInitializedRef.current) return;

        const currentConfig = {
            parent: localParentFilters,
            child: localChildFilters,
            manufacturer: localManufacturerFilters,
            creator: localCreatorFilters,
            product: localProductFilters,
            warehouse: localWarehouseFilters,
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
                JSON.stringify(summaryTableFilters?.child || []) !== JSON.stringify(localChildFilters) ||
                JSON.stringify(summaryTableFilters?.manufacturer || []) !== JSON.stringify(localManufacturerFilters) ||
                JSON.stringify(summaryTableFilters?.creator || []) !== JSON.stringify(localCreatorFilters) ||
                JSON.stringify(summaryTableFilters?.product || []) !== JSON.stringify(localProductFilters) ||
                JSON.stringify(summaryTableFilters?.warehouse || []) !== JSON.stringify(localWarehouseFilters) ||
                JSON.stringify(summaryTableFilters?.drilldownOrder || []) !== JSON.stringify(localDrilldownOrder);
                
            if (summaryChanged) {
                updates.summaryTable = {
                    ...summaryTableFilters,
                    child: localChildFilters,
                    manufacturer: localManufacturerFilters,
                    creator: localCreatorFilters,
                    product: localProductFilters,
                    warehouse: localWarehouseFilters,
                    drilldownOrder: localDrilldownOrder
                };
            }

            if (Object.keys(updates).length > 0) {
                onFilterChange(updates);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, localWarehouseFilters, localDrilldownOrder, summaryTableFilters, globalParentFilters, onFilterChange]);

    const handleLocalFilterChange = useCallback((type: string, selected: string[], onClearExpanded: () => void) => {
        startTransition(() => {
            if (type === 'parent') setLocalParentFilters(selected);
            else if (type === 'child') setLocalChildFilters(selected);
            else if (type === 'manufacturer') setLocalManufacturerFilters(selected);
            else if (type === 'creator') setLocalCreatorFilters(selected);
            else if (type === 'product') setLocalProductFilters(selected);
            else if (type === 'warehouse') setLocalWarehouseFilters(selected);
            
            if (type === 'parent') {
                setLocalChildFilters([]);
            }
            onClearExpanded();
        });
    }, []);

    const handleResetAllFilters = useCallback((onClearExpanded: () => void) => {
        startTransition(() => {
            setLocalParentFilters([]);
            setLocalChildFilters([]);
            setLocalManufacturerFilters([]);
            setLocalCreatorFilters([]);
            setLocalProductFilters([]);
            setLocalWarehouseFilters([]);
            onClearExpanded();
        });
    }, []);

    const hasActiveFilters = localParentFilters.length > 0 || 
                             localChildFilters.length > 0 || 
                             localManufacturerFilters.length > 0 || 
                             localCreatorFilters.length > 0 || 
                             localProductFilters.length > 0 ||
                             localWarehouseFilters.length > 0;

    return {
        localDrilldownOrder,
        setLocalDrilldownOrder,
        crossSellingDrilldownOrder,
        setCrossSellingDrilldownOrder,
        activeDrilldownOrder,
        deferredDrilldownOrder,
        localParentFilters,
        localChildFilters,
        localManufacturerFilters,
        localCreatorFilters,
        localProductFilters,
        localWarehouseFilters,
        activeFilterKey,
        setActiveFilterKey,
        isPending,
        startTransition,
        handleLocalFilterChange,
        handleResetAllFilters,
        hasActiveFilters
    };
};
