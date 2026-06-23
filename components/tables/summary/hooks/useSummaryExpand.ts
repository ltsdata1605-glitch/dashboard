import { useState, useCallback, useEffect, useRef } from 'react';
import type { SummaryTableNode } from '../../../../types';
import { getSetting, saveSetting } from '../../../../services/dbService';

const STORAGE_KEY = 'summaryTableExpandedIds';

export const useSummaryExpand = (startTransition: any) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [expandLevel, setExpandLevel] = useState<number>(0);
    const [isExpanding, setIsExpanding] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        getSetting<string[]>(STORAGE_KEY).then(saved => {
            if (saved && Array.isArray(saved) && saved.length > 0) {
                setExpandedIds(new Set(saved));
            }
            setIsLoaded(true);
        }).catch(() => setIsLoaded(true));
    }, []);

    const isHydratedRef = useRef(false);

    useEffect(() => {
        if (!isLoaded) return;
        // Skip the very first render's save — the state was just loaded from IndexedDB.
        if (!isHydratedRef.current) {
            isHydratedRef.current = true;
            return;
        }
        saveSetting(STORAGE_KEY, Array.from(expandedIds)).catch(() => {});
    }, [expandedIds, isLoaded]);

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
