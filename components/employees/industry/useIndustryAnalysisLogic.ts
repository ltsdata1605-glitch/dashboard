import { useState, useEffect, useMemo } from 'react';
import type { ExploitationData } from '../../../types';
import { getIndustryVisibleGroups, saveIndustryVisibleGroups } from '../../../services/dbService';
import { SortConfig, detailQuickFilters, groupToSortKeyMap } from './IndustryTableUtils';

export const useIndustryAnalysisLogic = (data: ExploitationData[]) => {
    const [viewMode, setViewMode] = useState<'detail' | 'efficiency' | 'efficiency_dt_sl' | 'efficiency_quantity'>('detail');
    const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set());
    const [initialGroupsLoaded, setInitialGroupsLoaded] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentBaoHiem', direction: 'desc' });
    
    useEffect(() => {
        getIndustryVisibleGroups().then(savedGroups => {
            if (savedGroups && savedGroups.length > 0) {
                setVisibleGroups(new Set(savedGroups));
            } else {
                setVisibleGroups(new Set(['spChinh', 'baoHiem']));
            }
            setInitialGroupsLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (initialGroupsLoaded) {
            saveIndustryVisibleGroups(Array.from(visibleGroups) as string[]);
        }
    }, [visibleGroups, initialGroupsLoaded]);
    
    useEffect(() => {
        if (viewMode === 'efficiency' || viewMode === 'efficiency_dt_sl' || viewMode === 'efficiency_quantity') {
            setSortConfig({ key: 'slSPChinh_Tong', direction: 'desc' });
        } else {
            setSortConfig({ key: 'percentBaoHiem', direction: 'desc' });
        }
    }, [viewMode]);
    
    const handleToggleGroup = (groupKey: string) => {
        const newVisibleGroups = new Set(visibleGroups);
        const wasAdded = !newVisibleGroups.has(groupKey);

        if (wasAdded) {
            newVisibleGroups.add(groupKey);
        } else {
            if (newVisibleGroups.size > 1) { 
                newVisibleGroups.delete(groupKey);
            }
        }
        
        const setsAreEqual = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(value => b.has(value));

        if (!setsAreEqual(visibleGroups as Set<string>, newVisibleGroups as Set<string>)) {
            setVisibleGroups(newVisibleGroups);

            const sortKeyForToggledGroup = groupToSortKeyMap[groupKey];
            if (wasAdded && sortKeyForToggledGroup) {
                setSortConfig({ key: sortKeyForToggledGroup, direction: 'desc' });
            } else if (!wasAdded && sortConfig.key === sortKeyForToggledGroup) {
                const remainingSpecialGroups: string[] = detailQuickFilters.map(f => f.key).filter((key) => newVisibleGroups.has(key) && groupToSortKeyMap[key]);
                if (remainingSpecialGroups.length > 0) {
                    const firstKey = remainingSpecialGroups[0];
                    const newSortKey = groupToSortKeyMap[firstKey];
                    if(newSortKey) setSortConfig({ key: newSortKey, direction: 'desc' });
                } else {
                    if (viewMode !== 'detail') {
                        setSortConfig({ key: 'slSPChinh_Tong', direction: 'desc' });
                    } else {
                        setSortConfig({ key: 'percentBaoHiem', direction: 'desc' });
                    }
                }
            }
        }
    };
    
    const { processedData, groupTotals, grandTotal } = useMemo(() => {
        const thresholds = { percentBaoHiem: 40, percentSimKT: 30, percentDongHoKT: 20, percentPhuKienKT: 10, percentGiaDungKT: 30 };

        const enhancedData = data.map(item => {
            const slSPChinh_Tong = (item.slICT || 0) + (item.slCE_main || 0) + (item.slGiaDung_main || 0);
            const percentBaoHiem = slSPChinh_Tong > 0 ? ((item.slBaoHiem || 0) / slSPChinh_Tong) * 100 : 0;
            const percentSimKT = (item.slICT || 0) > 0 ? ((item.slSim || 0) / (item.slICT || 1)) * 100 : 0;
            const percentDongHoKT = slSPChinh_Tong > 0 ? ((item.slDongHo || 0) / slSPChinh_Tong) * 100 : 0;
            const percentPhuKienKT = (item.doanhThuICT || 0) > 0 ? ((item.doanhThuPhuKien || 0) / (item.doanhThuICT || 1)) * 100 : 0;
            const percentGiaDungKT = (item.doanhThuCE_main || 0) > 0 ? ((item.doanhThuGiaDung || 0) / (item.doanhThuCE_main || 1)) * 100 : 0;

            let belowAverageCount = 0;
            if (percentBaoHiem < thresholds.percentBaoHiem) belowAverageCount++;
            if (percentSimKT < thresholds.percentSimKT) belowAverageCount++;
            if (percentDongHoKT < thresholds.percentDongHoKT) belowAverageCount++;
            if (percentPhuKienKT < thresholds.percentPhuKienKT) belowAverageCount++;
            if (percentGiaDungKT < thresholds.percentGiaDungKT) belowAverageCount++;

            return { ...item, slSPChinh_Tong, percentBaoHiem, percentSimKT, percentDongHoKT, percentPhuKienKT, percentGiaDungKT, belowAverageCount };
        });

        const sorted = [...enhancedData].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }
            
            const key = sortConfig.key as keyof typeof a;
            
            const valA = a[key] ?? 0;
            const valB = b[key] ?? 0;

            if (typeof valA === 'number' && typeof valB === 'number') {
                const result = sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                if (result !== 0) return result;
            }
            return a.name.localeCompare(b.name);
        });

        const grouped = sorted.reduce((acc, employee) => {
            const dept = employee.department || 'Không Phân Ca';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(employee);
            return acc;
        }, {} as { [key: string]: typeof sorted });
        
        const sortedGroupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
        const finalGroupedData: { [key: string]: typeof sorted } = {};
        sortedGroupKeys.forEach(key => { finalGroupedData[key] = grouped[key]; });

        const calculateTotals = (items: typeof enhancedData) => {
             const initialTotals = {
                doanhThuThuc: 0, doanhThuQD: 0,
                slICT: 0, doanhThuICT: 0, slCE_main: 0, doanhThuCE_main: 0, slGiaDung_main: 0,
                slBaoHiem: 0, doanhThuBaoHiem: 0,
                slSim: 0, doanhThuSim: 0, slDongHo: 0, doanhThuDongHo: 0,
                doanhThuPhuKien: 0, slPhuKien: 0, slCamera: 0, slLoa: 0, slPinSDP: 0, slTaiNgheBLT: 0,
                doanhThuGiaDung: 0, slGiaDung: 0, slMayLocNuoc: 0, slNoiCom: 0, slNoiChien: 0, slQuatDien: 0,
                belowAverageCount: 0
            };

            if (items.length === 0) return { ...initialTotals, hieuQuaQD: 0, percentBaoHiem: 0, percentSimKT: 0, percentDongHoKT: 0, percentPhuKienKT: 0, percentGiaDungKT: 0, slSPChinh_Tong: 0 };
            
            const t = items.reduce((acc, item) => {
                const keys = Object.keys(initialTotals) as Array<keyof typeof initialTotals>;
                keys.forEach((key) => {
                    const value = (item as any)[key];
                    if (typeof value === 'number') {
                        (acc as any)[key] += value;
                    }
                });
                return acc;
            }, { ...initialTotals });
            
            const hieuQuaQD = t.doanhThuThuc > 0 ? (t.doanhThuQD - t.doanhThuThuc) / t.doanhThuThuc * 100 : 0;
            const slSPChinh_Tong = t.slICT + t.slCE_main + t.slGiaDung_main;
            const percentBaoHiem = slSPChinh_Tong > 0 ? (t.slBaoHiem / slSPChinh_Tong) * 100 : 0;
            const percentSimKT = t.slICT > 0 ? (t.slSim / t.slICT) * 100 : 0;
            const percentDongHoKT = slSPChinh_Tong > 0 ? (t.slDongHo / slSPChinh_Tong) * 100 : 0;
            const percentPhuKienKT = t.doanhThuICT > 0 ? (t.doanhThuPhuKien / t.doanhThuICT) * 100 : 0;
            const percentGiaDungKT = t.doanhThuCE_main > 0 ? (t.doanhThuGiaDung / t.doanhThuCE_main) * 100 : 0;
            
            return { ...t, slSPChinh_Tong, hieuQuaQD, percentBaoHiem, percentSimKT, percentDongHoKT, percentPhuKienKT, percentGiaDungKT };
        };

        const groupTotals: { [key: string]: any } = {};
        for (const dept in finalGroupedData) { groupTotals[dept] = calculateTotals(finalGroupedData[dept]); }
        const grandTotal = calculateTotals(enhancedData);

        return { processedData: finalGroupedData, groupTotals, grandTotal };
    }, [data, sortConfig]);

    const handleSort = (key: SortConfig['key']) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = 'asc'; }
        setSortConfig({ key, direction });
    };

    return {
        viewMode,
        setViewMode,
        visibleGroups,
        handleToggleGroup,
        sortConfig,
        handleSort,
        processedData,
        groupTotals,
        grandTotal
    };
};
