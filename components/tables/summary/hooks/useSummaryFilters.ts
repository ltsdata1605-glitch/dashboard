import { useState, useEffect, useDeferredValue, useCallback, useTransition } from 'react';
import { saveSummaryTableConfig } from '../../../../services/dbService';

export const useSummaryFilters = (filters: any, onFilterChange: any, isCrossSellingMode: boolean) => {
    const { summaryTable: summaryTableFilters, parent: globalParentFilters } = filters;
    const [isPending, startTransition] = useTransition();

    const [localDrilldownOrder, setLocalDrilldownOrder] = useState<string[]>(
        (summaryTableFilters?.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0)
            ? summaryTableFilters.drilldownOrder
            : ['parent', 'child', 'creator', 'manufacturer', 'product']
    );
    const [crossSellingDrilldownOrder, setCrossSellingDrilldownOrder] = useState<string[]>(['parent', 'child']);
    
    const activeDrilldownOrder = isCrossSellingMode ? crossSellingDrilldownOrder : localDrilldownOrder;
    const deferredDrilldownOrder = useDeferredValue(activeDrilldownOrder);

    const [localParentFilters, setLocalParentFilters] = useState<string[]>(globalParentFilters || []);
    const [localChildFilters, setLocalChildFilters] = useState<string[]>(summaryTableFilters?.child || []);
    const [localManufacturerFilters, setLocalManufacturerFilters] = useState<string[]>(summaryTableFilters?.manufacturer || []);
    const [localCreatorFilters, setLocalCreatorFilters] = useState<string[]>(summaryTableFilters?.creator || []);
    const [localProductFilters, setLocalProductFilters] = useState<string[]>(summaryTableFilters?.product || []);

    const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

    useEffect(() => {
        if (!summaryTableFilters) return;
        if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) setLocalParentFilters(globalParentFilters);
        if (JSON.stringify(summaryTableFilters.child) !== JSON.stringify(localChildFilters)) setLocalChildFilters(summaryTableFilters.child);
        if (JSON.stringify(summaryTableFilters.manufacturer) !== JSON.stringify(localManufacturerFilters)) setLocalManufacturerFilters(summaryTableFilters.manufacturer);
        if (JSON.stringify(summaryTableFilters.creator) !== JSON.stringify(localCreatorFilters)) setLocalCreatorFilters(summaryTableFilters.creator);
        if (JSON.stringify(summaryTableFilters.product) !== JSON.stringify(localProductFilters)) setLocalProductFilters(summaryTableFilters.product);
        
        if (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0 && 
            JSON.stringify(summaryTableFilters.drilldownOrder) !== JSON.stringify(localDrilldownOrder)) {
            setLocalDrilldownOrder(summaryTableFilters.drilldownOrder);
        }
    }, [summaryTableFilters, globalParentFilters]);

    useEffect(() => {
        const currentConfig = {
            parent: localParentFilters,
            child: localChildFilters,
            manufacturer: localManufacturerFilters,
            creator: localCreatorFilters,
            product: localProductFilters,
            drilldownOrder: localDrilldownOrder,
            sort: filters?.summaryTable?.sort
        };
        const timer = setTimeout(() => {
            saveSummaryTableConfig(currentConfig).catch(err => console.error("Failed to save config:", err));
            if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) {
                onFilterChange({ parent: localParentFilters });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, localDrilldownOrder, filters?.summaryTable?.sort, globalParentFilters, onFilterChange]);

    const handleLocalFilterChange = useCallback((type: string, selected: string[], onClearExpanded: () => void) => {
        startTransition(() => {
            if (type === 'parent') setLocalParentFilters(selected);
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
            setLocalParentFilters([]);
            setLocalChildFilters([]);
            setLocalManufacturerFilters([]);
            setLocalCreatorFilters([]);
            setLocalProductFilters([]);
            onClearExpanded();
        });
    }, []);

    const hasActiveFilters = localParentFilters.length > 0 || 
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
        deferredDrilldownOrder,
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
