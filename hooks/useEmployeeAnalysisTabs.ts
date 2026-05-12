
import { useState, useEffect, useCallback, useRef } from 'react';

export const useEmployeeAnalysisTabs = (allAvailableTabs: any[], isInitialTabsLoaded: boolean, activeTab: string, setActiveTab: (id: string) => void) => {
    const prevAllIdsRef = useRef<Set<string>>(new Set());
    
    const [visibleTabs, setVisibleTabs] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
        import('../services/dbService').then(({ getSetting }) => {
            getSetting<string[]>('employeeAnalysis_visibleTabs').then(saved => {
                if (saved && Array.isArray(saved) && saved.length > 0) {
                    setVisibleTabs(new Set(saved));
                }
                setIsLoaded(true);
            }).catch(e => {
                console.error("Failed to load visible tabs from IndexedDB", e);
                setIsLoaded(true);
            });
        });
    }, []);
    
    useEffect(() => {
        if (isInitialTabsLoaded && isLoaded) {
            const savedStateExists = visibleTabs.size > 0;
            const allIds = new Set(allAvailableTabs.map(t => t.id));

            if (!savedStateExists && visibleTabs.size === 0) {
                setVisibleTabs(allIds);
                prevAllIdsRef.current = allIds;
            } else {
                const currentPrevIds = new Set(prevAllIdsRef.current);
                
                setVisibleTabs(prev => {
                    const newSet = new Set(prev);
                    let hasChanged = false;
                    
                    // Only automatically add tabs if they are completely new (never seen before)
                    if (currentPrevIds.size > 0) {
                        allIds.forEach(id => {
                            if (!currentPrevIds.has(id) && !prev.has(id)) {
                                newSet.add(id);
                                hasChanged = true;
                            }
                        });
                    }

                    prev.forEach(id => {
                        if (!allIds.has(id)) {
                            newSet.delete(id);
                            hasChanged = true;
                        }
                    });
                    
                    return hasChanged ? newSet : prev;
                });
                prevAllIdsRef.current = allIds;
            }
        }
    }, [isInitialTabsLoaded, allAvailableTabs, isLoaded]);

    useEffect(() => {
        if (isInitialTabsLoaded && isLoaded && visibleTabs.size > 0) {
            import('../services/dbService').then(({ saveSetting }) => {
                saveSetting('employeeAnalysis_visibleTabs', Array.from(visibleTabs)).catch(e => {
                    console.error("Failed to save visible tabs to IndexedDB", e);
                });
            });
        }
    }, [visibleTabs, isInitialTabsLoaded, isLoaded]);

    const handleToggleTabVisibility = useCallback((tabId: string) => {
        setVisibleTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tabId)) {
                if (newSet.size === 1) return prev;
                newSet.delete(tabId);
            } else {
                newSet.add(tabId);
            }
            if (activeTab === tabId && !newSet.has(tabId)) {
                const firstVisibleId = allAvailableTabs.find(t => newSet.has(t.id))?.id;
                if (firstVisibleId) setActiveTab(firstVisibleId);
            }
            return newSet;
        });
    }, [activeTab, allAvailableTabs, setActiveTab]);

    return {
        visibleTabs,
        handleToggleTabVisibility
    };
};
