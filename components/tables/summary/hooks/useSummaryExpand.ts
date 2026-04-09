import { useState, useCallback, useEffect, useRef } from 'react';
import type { SummaryTableNode } from '../../../../types';

const STORAGE_KEY = 'summaryTableExpandedIds';

// Lazy initializer: read from localStorage synchronously during first render
// to avoid the flash of collapsed state → expanded state.
function loadInitialExpandedIds(): Set<string> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return new Set<string>(parsed);
            }
        }
    } catch (e) {
        // Ignore parse errors
    }
    return new Set<string>();
}

export const useSummaryExpand = (startTransition: any) => {
    // Initialize directly from localStorage (synchronous, no race condition)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(loadInitialExpandedIds);
    const [expandLevel, setExpandLevel] = useState<number>(0);
    const [isExpanding, setIsExpanding] = useState(false);

    // Track whether the state has been hydrated to avoid saving empty state on mount
    const isHydratedRef = useRef(false);

    useEffect(() => {
        // Skip the very first render's save — the state was just loaded from localStorage.
        if (!isHydratedRef.current) {
            isHydratedRef.current = true;
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedIds)));
        } catch (e) {
            // Ignore storage errors (e.g., quota exceeded)
        }
    }, [expandedIds]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
                const idPrefix = `${id}-`;
                prev.forEach(expandedId => { if (expandedId.startsWith(idPrefix)) newSet.delete(expandedId); });
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const setLevelAndExpand = useCallback((
        level: number, 
        isComparisonMode: boolean, 
        compMode: string, 
        trendData: any, 
        compTree: any, 
        standardSummaryData: any
    ) => {
        setIsExpanding(true);
        // Force React to render the loading spinner before crunching the tree map
        setTimeout(() => {
            startTransition(() => {
                setExpandLevel(level);
                if (level === 0) {
                    setExpandedIds(new Set());
                } else {
                    const newExpanded = new Set<string>();
                    let activeData: any = null;
                    if (isComparisonMode) {
                        if (compMode === 'monthly_trend' && trendData && trendData.months.length > 0) {
                            activeData = trendData.trees[trendData.months[trendData.months.length - 1].id]?.data;
                        } else if (compTree) {
                            activeData = compTree.current.data;
                        }
                    } else {
                        activeData = standardSummaryData?.data;
                    }

                    if (activeData) {
                        const targetDepth = level === 3 ? 5 : level;
                        const expandNode = (node: { [key: string]: SummaryTableNode }, parentId: string, currentDepth: number) => {
                            if (currentDepth > targetDepth) return;
                            Object.keys(node).forEach(key => {
                                const currentId = `${parentId}-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
                                newExpanded.add(currentId);
                                expandNode(node[key].children, currentId, currentDepth + 1);
                            });
                        };
                        expandNode(activeData, 'root', 1);
                    }
                    setExpandedIds(newExpanded);
                }
            });
            setIsExpanding(false);
        }, 10);
    }, [startTransition]);

    const handleExpandAll = useCallback((isComparisonMode: boolean, compMode: string, trendData: any, compTree: any, standardSummaryData: any) => {
        setLevelAndExpand(Math.min(expandLevel + 1, 3), isComparisonMode, compMode, trendData, compTree, standardSummaryData);
    }, [expandLevel, setLevelAndExpand]);

    const handleCollapseAll = useCallback((isComparisonMode: boolean, compMode: string, trendData: any, compTree: any, standardSummaryData: any) => {
        setLevelAndExpand(Math.max(expandLevel - 1, 0), isComparisonMode, compMode, trendData, compTree, standardSummaryData);
    }, [expandLevel, setLevelAndExpand]);

    const clearExpanded = useCallback(() => setExpandedIds(new Set()), []);

    return {
        expandedIds,
        setExpandedIds,
        expandLevel,
        isExpanding,
        toggleExpand,
        handleExpandAll,
        handleCollapseAll,
        clearExpanded
    };
};
