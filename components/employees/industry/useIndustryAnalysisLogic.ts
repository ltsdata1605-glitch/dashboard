import { useState, useEffect, useMemo } from 'react';
import type { ExploitationData, CustomExploitationTabConfig } from '../../../types';
import { getIndustryVisibleGroups, saveIndustryVisibleGroups } from '../../../services/dbService';
import { SortConfig, detailQuickFilters, groupToSortKeyMap, detailHeaderGroups } from './IndustryTableUtils';
import { COL, HINH_THUC_XUAT_THU_HO } from '../../../constants';
import { getRowValue } from '../../../utils/dataUtils';

export const useIndustryAnalysisLogic = (data: ExploitationData[], baseFilteredData?: any[], productConfig?: any, customExploitationTabs?: CustomExploitationTabConfig[]) => {
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

    const dynamicQuickFilters = useMemo(() => {
        const baseFilters: any[] = [...detailQuickFilters];
        (customExploitationTabs || []).forEach(tab => {
            baseFilters.push({ key: tab.id, label: tab.name, isCustom: true });
        });
        return baseFilters;
    }, [customExploitationTabs]);

    const dynamicHeaderGroups = useMemo(() => {
        const baseGroups: any = { ...detailHeaderGroups };
        const pastelColors = [
            { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
            { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300' },
            { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
            { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300' },
            { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300' },
            { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-300' }
        ];

        (customExploitationTabs || []).forEach((tab, index) => {
            const color = pastelColors[index % pastelColors.length];
            const subHeaders = (tab.columns || []).map(col => ({
                label: col.name.toUpperCase(),
                key: `val_${tab.id}_${col.id}`
            }));

            baseGroups[tab.id] = {
                label: tab.name.toUpperCase(),
                colSpan: subHeaders.length || 1,
                bg: color.bg,
                text: color.text,
                subHeaders: subHeaders.length > 0 ? subHeaders : [{ label: '-', key: `empty_${tab.id}` }]
            };
        });
        return baseGroups;
    }, [customExploitationTabs]);

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
                const remainingSpecialGroups: string[] = dynamicQuickFilters.map((f: any) => f.key).filter((key) => newVisibleGroups.has(key) && groupToSortKeyMap[key]);
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
    
    const customTabData = useMemo(() => {
        const customData = new Map<string, { [tabId: string]: { [colId: string]: { mainSl: number, mainDt: number, baseSl: number, baseDt: number } } }>();

        if (!baseFilteredData || !customExploitationTabs || !productConfig) return customData;

        try {
            const validData = baseFilteredData.filter(row => !HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)));

            const checkMatch = (filters: any, industry: string, subgroup: string, manufacturer: string, productCodeStr: string) => {
                if (!filters) return false;
                const industryMatch = !filters.selectedIndustries || filters.selectedIndustries.length === 0 || filters.selectedIndustries.includes(industry);
                const subgroupMatch = !filters.selectedSubgroups || filters.selectedSubgroups.length === 0 || filters.selectedSubgroups.includes(subgroup);
                const manufacturerMatch = !filters.selectedManufacturers || filters.selectedManufacturers.length === 0 || filters.selectedManufacturers.includes(manufacturer);
                
                let productCodeMatch = !filters.productCodes || filters.productCodes.length === 0;
                if (!productCodeMatch && filters.productCodes) {
                    for (const code of filters.productCodes) {
                        if (productCodeStr.includes(code)) {
                            productCodeMatch = true;
                            break;
                        }
                    }
                }
                return industryMatch && subgroupMatch && manufacturerMatch && productCodeMatch;
            };

            customExploitationTabs.forEach(tab => {
                const cols = tab.columns || [];
                if (cols.length === 0) return;

                validData.forEach(row => {
                    const rawCreator = getRowValue(row, COL.NGUOI_TAO);
                    if (!rawCreator) return;
                    
                    const employeeId = rawCreator.split(' - ')[0].trim();
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    
                    const industry = productConfig.childToParentMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                    const subgroup = productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                    const manufacturer = getRowValue(row, COL.MANUFACTURER) || '';
                    const productCodeStr = String(getRowValue(row, COL.PRODUCT) || '');

                    cols.forEach(col => {
                        let isMainMatch = false;
                        let isBaseMatch = false;

                        if (col.type === 'quantity' || col.type === 'revenue') {
                            isMainMatch = checkMatch(col.filters, industry, subgroup, manufacturer, productCodeStr);
                        } else if (col.type === 'percentage' && col.percentageConfig) {
                            isMainMatch = checkMatch(col.percentageConfig.numeratorFilters, industry, subgroup, manufacturer, productCodeStr);
                            isBaseMatch = checkMatch(col.percentageConfig.denominatorFilters, industry, subgroup, manufacturer, productCodeStr);
                        }

                        if (isMainMatch || isBaseMatch) {
                            if (!customData.has(employeeId)) {
                                customData.set(employeeId, {});
                            }
                            const empData = customData.get(employeeId)!;
                            if (!empData[tab.id]) {
                                empData[tab.id] = {};
                            }
                            if (!empData[tab.id][col.id]) {
                                empData[tab.id][col.id] = { mainSl: 0, mainDt: 0, baseSl: 0, baseDt: 0 };
                            }
                            
                            const colData = empData[tab.id][col.id];
                            if (isMainMatch) {
                                colData.mainSl += quantity;
                                colData.mainDt += price;
                            }
                            if (isBaseMatch) {
                                colData.baseSl += quantity;
                                colData.baseDt += price;
                            }
                        }
                    });
                });
            });
        } catch(e) {
            console.error("Lỗi custom tabs", e);
        }
        return customData;
    }, [baseFilteredData, customExploitationTabs, productConfig]);

    const { processedData, groupTotals, grandTotal } = useMemo(() => {
        const thresholds = { percentBaoHiem: 40, percentSimKT: 30, percentDongHoKT: 20, percentPhuKienKT: 10, percentGiaDungKT: 30 };

        const enhancedData = data.map(item => {
            const slSPChinh_Tong = (item.slICT || 0) + (item.slCE_main || 0) + (item.slGiaDung_main || 0);
            
            const empId = item.name.split(' - ')[0].trim();
            const customFields: Record<string, number> = {};
            if (customExploitationTabs) {
                customExploitationTabs.forEach(tab => {
                    const empData1 = customTabData.get(empId);
                    const empData2 = customTabData.get(item.name);
                    const tData = (empData1 && empData1[tab.id]) || (empData2 && empData2[tab.id]) || {};
                    
                    const cols = tab.columns || [];
                    cols.forEach(col => {
                        const cData = tData[col.id] || { mainSl: 0, mainDt: 0, baseSl: 0, baseDt: 0 };
                        
                        let val = 0;
                        if (col.type === 'quantity') val = cData.mainSl;
                        if (col.type === 'revenue') val = cData.mainDt;
                        if (col.type === 'percentage') {
                            const baseVal = col.percentageConfig?.baseMetric === 'revenue' ? cData.baseDt : cData.baseSl;
                            const numVal = col.percentageConfig?.numeratorMetric === 'revenue' ? cData.mainDt : cData.mainSl;
                            val = baseVal > 0 ? (numVal / baseVal) * 100 : 0;
                        }
                        
                        customFields[`val_${tab.id}_${col.id}`] = val;
                        // Keep raw values for calculateTotals sum later
                        customFields[`raw_mainSl_${tab.id}_${col.id}`] = cData.mainSl;
                        customFields[`raw_mainDt_${tab.id}_${col.id}`] = cData.mainDt;
                        customFields[`raw_baseSl_${tab.id}_${col.id}`] = cData.baseSl;
                        customFields[`raw_baseDt_${tab.id}_${col.id}`] = cData.baseDt;
                    });
                });
            }

            const getCustomTabVal = (tabId: string, colType: string) => {
                const tab = customExploitationTabs?.find(t => t.id === tabId);
                if (!tab) return 0;
                const col = tab.columns?.find(c => c.type === colType) || tab.columns?.[0];
                if (!col) return 0;
                return customFields[`val_${tab.id}_${col.id}`] || 0;
            };

            const getCustomTabSumQuantity = (tabId: string) => {
                const tab = customExploitationTabs?.find(t => t.id === tabId);
                if (!tab) return 0;
                return tab.columns?.filter(c => c.type === 'quantity').reduce((sum, col) => sum + (customFields[`val_${tab.id}_${col.id}`] || 0), 0) || 0;
            };

            const percentBaoHiem = getCustomTabVal('preset_bao_hiem', 'percentage');
            const percentSimKT = getCustomTabVal('preset_sim', 'percentage');
            const percentDongHoKT = getCustomTabVal('preset_dong_ho', 'percentage');
            const percentPhuKienKT = getCustomTabVal('preset_phu_kien', 'percentage');
            const percentGiaDungKT = getCustomTabVal('preset_gia_dung', 'percentage');

            let belowAverageCount = 0;
            if (percentBaoHiem < thresholds.percentBaoHiem) belowAverageCount++;
            if (percentSimKT < thresholds.percentSimKT) belowAverageCount++;
            if (percentDongHoKT < thresholds.percentDongHoKT) belowAverageCount++;
            if (percentPhuKienKT < thresholds.percentPhuKienKT) belowAverageCount++;
            if (percentGiaDungKT < thresholds.percentGiaDungKT) belowAverageCount++;

            const doanhThuBaoHiem = getCustomTabVal('preset_bao_hiem', 'revenue');
            const doanhThuSim = getCustomTabVal('preset_sim', 'revenue');
            const doanhThuDongHo = getCustomTabVal('preset_dong_ho', 'revenue');
            const doanhThuPhuKien = getCustomTabVal('preset_phu_kien', 'revenue');
            const doanhThuGiaDung = getCustomTabVal('preset_gia_dung', 'revenue');

            const slBaoHiem = getCustomTabSumQuantity('preset_bao_hiem');
            const slSim = getCustomTabSumQuantity('preset_sim');
            const slDongHo = getCustomTabSumQuantity('preset_dong_ho');
            const slPhuKien = getCustomTabSumQuantity('preset_phu_kien');
            const slGiaDung = getCustomTabSumQuantity('preset_gia_dung');

            return { 
                ...item, 
                slSPChinh_Tong, 
                percentBaoHiem, percentSimKT, percentDongHoKT, percentPhuKienKT, percentGiaDungKT, 
                belowAverageCount, 
                doanhThuBaoHiem, doanhThuSim, doanhThuDongHo, doanhThuPhuKien, doanhThuGiaDung,
                slBaoHiem, slSim, slDongHo, slPhuKien, slGiaDung,
                ...customFields 
            };
        });

        const sorted = [...enhancedData].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }
            
            const key = sortConfig.key as keyof typeof a;
            const valA = (a as any)[key] ?? 0;
            const valB = (b as any)[key] ?? 0;

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
            const initialTotals: Record<string, number> = {
                doanhThuThuc: 0, doanhThuQD: 0,
                slICT: 0, doanhThuICT: 0, slCE_main: 0, doanhThuCE_main: 0, slGiaDung_main: 0,
                slBaoHiem: 0, doanhThuBaoHiem: 0,
                slSim: 0, doanhThuSim: 0, slDongHo: 0, doanhThuDongHo: 0,
                doanhThuPhuKien: 0, slPhuKien: 0, slCamera: 0, slLoa: 0, slPinSDP: 0, slTaiNgheBLT: 0,
                doanhThuGiaDung: 0, slGiaDung: 0, slMayLocNuoc: 0, slNoiCom: 0, slNoiChien: 0, slQuatDien: 0,
                belowAverageCount: 0
            };
            
            if (customExploitationTabs) {
                 customExploitationTabs.forEach(tab => {
                     const cols = tab.columns || [];
                     cols.forEach(col => {
                         initialTotals[`raw_mainSl_${tab.id}_${col.id}`] = 0;
                         initialTotals[`raw_mainDt_${tab.id}_${col.id}`] = 0;
                         initialTotals[`raw_baseSl_${tab.id}_${col.id}`] = 0;
                         initialTotals[`raw_baseDt_${tab.id}_${col.id}`] = 0;
                     });
                 });
            }

            if (items.length === 0) return { ...initialTotals, hieuQuaQD: 0, percentBaoHiem: 0, percentSimKT: 0, percentDongHoKT: 0, percentPhuKienKT: 0, percentGiaDungKT: 0, slSPChinh_Tong: 0 };
            
            const t = items.reduce((acc, item) => {
                Object.keys(initialTotals).forEach((key) => {
                    const value = (item as any)[key];
                    if (typeof value === 'number') {
                        (acc as any)[key] += value;
                    }
                });
                return acc;
            }, { ...initialTotals });
            
            const hieuQuaQD = t.doanhThuThuc > 0 ? (t.doanhThuQD - t.doanhThuThuc) / t.doanhThuThuc * 100 : 0;
            const slSPChinh_Tong = t.slICT + t.slCE_main + t.slGiaDung_main;
            if (customExploitationTabs) {
                 customExploitationTabs.forEach(tab => {
                     const cols = tab.columns || [];
                     cols.forEach(col => {
                         let val = 0;
                         if (col.type === 'quantity') val = t[`raw_mainSl_${tab.id}_${col.id}`] || 0;
                         if (col.type === 'revenue') val = t[`raw_mainDt_${tab.id}_${col.id}`] || 0;
                         if (col.type === 'percentage') {
                             const baseVal = col.percentageConfig?.baseMetric === 'revenue' ? t[`raw_baseDt_${tab.id}_${col.id}`] || 0 : t[`raw_baseSl_${tab.id}_${col.id}`] || 0;
                             const numVal = col.percentageConfig?.numeratorMetric === 'revenue' ? t[`raw_mainDt_${tab.id}_${col.id}`] || 0 : t[`raw_mainSl_${tab.id}_${col.id}`] || 0;
                             val = baseVal > 0 ? (numVal / baseVal) * 100 : 0;
                         }
                         t[`val_${tab.id}_${col.id}`] = val;
                     });
                 });
            }
            
            const getCustomTabValTotal = (tabId: string, colType: string) => {
                const tab = customExploitationTabs?.find(tb => tb.id === tabId);
                if (!tab) return 0;
                const col = tab.columns?.find(c => c.type === colType) || tab.columns?.[0];
                if (!col) return 0;
                return t[`val_${tab.id}_${col.id}`] || 0;
            };

            const percentBaoHiem = getCustomTabValTotal('preset_bao_hiem', 'percentage');
            const percentSimKT = getCustomTabValTotal('preset_sim', 'percentage');
            const percentDongHoKT = getCustomTabValTotal('preset_dong_ho', 'percentage');
            const percentPhuKienKT = getCustomTabValTotal('preset_phu_kien', 'percentage');
            const percentGiaDungKT = getCustomTabValTotal('preset_gia_dung', 'percentage');
            
            return { ...t, slSPChinh_Tong, hieuQuaQD, percentBaoHiem, percentSimKT, percentDongHoKT, percentPhuKienKT, percentGiaDungKT };
        };

        const groupTotals: { [key: string]: any } = {};
        for (const dept in finalGroupedData) { groupTotals[dept] = calculateTotals(finalGroupedData[dept]); }
        const grandTotal = calculateTotals(enhancedData);

        return { processedData: finalGroupedData, groupTotals, grandTotal };
    }, [data, sortConfig, customTabData, customExploitationTabs]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = 'asc'; }
        setSortConfig({ key: key as any, direction });
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
        grandTotal,
        dynamicQuickFilters,
        dynamicHeaderGroups
    };
};
