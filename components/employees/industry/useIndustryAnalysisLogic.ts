import { useState, useEffect, useMemo } from 'react';
import type { ExploitationData, CustomExploitationTabConfig, DataRow, ProductConfig, ColumnFilterCriteria } from '../../../types';
import { getIndustryVisibleGroups, saveIndustryVisibleGroups } from '../../../services/dbService';
import { SortConfig, detailQuickFilters, groupToSortKeyMap, detailHeaderGroups } from './IndustryTableUtils';
import { COL } from '../../../constants';
import { getRowValue, calculateRowMetrics, cleanAndNormalize, normalizedThuHoSet, getParentGroup, getSubgroup } from '../../../utils/dataUtils';

interface DynamicSubHeader {
    label: string;
    key: string;
    originalColId?: string;
    originalType?: string;
}
interface DynamicHeaderGroup {
    label: string;
    colSpan: number;
    bg: string;
    text: string;
    border?: string;
    subHeaders: DynamicSubHeader[];
}

export const useIndustryAnalysisLogic = (data: ExploitationData[], baseFilteredData?: DataRow[], productConfig?: ProductConfig, customExploitationTabs?: CustomExploitationTabConfig[], efficiencyExploitationTabs?: CustomExploitationTabConfig[]) => {
    const [viewMode, setViewMode] = useState<'detail' | 'efficiency'>('detail');
    const activeTabs = viewMode === 'detail' ? customExploitationTabs : efficiencyExploitationTabs;
    const [visibleGroupsDetail, setVisibleGroupsDetail] = useState<Set<string>>(new Set());
    const [visibleGroupsEfficiency, setVisibleGroupsEfficiency] = useState<Set<string>>(new Set());
    const [initialGroupsLoaded, setInitialGroupsLoaded] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentBaoHiem', direction: 'desc' });
    
    useEffect(() => {
        let isMounted = true;
        Promise.all([
            getIndustryVisibleGroups(),
            getIndustryVisibleGroups() // Temporary fallback for efficiency if missing
        ]).then(([savedDetail]) => {
            if (!isMounted) return;
            let initialGroups = ['spChinh'];
            if (savedDetail && savedDetail.length > 0) {
                initialGroups = savedDetail;
                setVisibleGroupsDetail(new Set(savedDetail));
                setVisibleGroupsEfficiency(new Set(savedDetail));
            } else {
                setVisibleGroupsDetail(new Set(['spChinh']));
                setVisibleGroupsEfficiency(new Set(['spChinh']));
            }
            
            const firstGroup = initialGroups[0];
            const defaultSortKey = firstGroup && groupToSortKeyMap[firstGroup] 
                ? groupToSortKeyMap[firstGroup] 
                : 'percentBaoHiem';
            
            setSortConfig({ key: defaultSortKey, direction: 'desc' });
            
            setInitialGroupsLoaded(true);
        });
        return () => {
            isMounted = false;
        };
    }, []);

    const visibleGroups = viewMode === 'detail' ? visibleGroupsDetail : visibleGroupsEfficiency;

    useEffect(() => {
        if (initialGroupsLoaded) {
            saveIndustryVisibleGroups(Array.from(visibleGroupsDetail));
        }
    }, [visibleGroupsDetail, initialGroupsLoaded]);
    useEffect(() => {
        const currentGroups = viewMode === 'detail' ? visibleGroupsDetail : visibleGroupsEfficiency;
        const firstVisibleGroup = Array.from(currentGroups)[0];
        const defaultSortKey = firstVisibleGroup && groupToSortKeyMap[firstVisibleGroup] 
            ? groupToSortKeyMap[firstVisibleGroup] 
            : 'percentBaoHiem';
            
        setSortConfig({ key: defaultSortKey, direction: 'desc' });
    }, [viewMode]);

    const dynamicQuickFilters = useMemo(() => {
        const baseFilters: { key: string; label: string; isCustom?: boolean }[] = [...detailQuickFilters].map(f => {
            const override = activeTabs?.find(t => t.id === f.key);
            if (override) {
                let name = override.name;
                if (f.key === 'doanhThu' && name === 'DOANH THU') name = 'D.Thu';
                if (f.key === 'spChinh' && name === 'SẢN PHẨM CHÍNH') name = 'SP Chính';
                return { ...f, label: name };
            }
            return f;
        });
        (activeTabs || []).forEach(tab => {
            if (tab.id === 'doanhThu' || tab.id === 'spChinh') return;
            baseFilters.push({ key: tab.id, label: tab.name, isCustom: true });
        });
        return baseFilters;
    }, [activeTabs]);

        const dynamicHeaderGroups = useMemo(() => {
        const baseGroups: Record<string, DynamicHeaderGroup> = { ...detailHeaderGroups };
        
        // Apply overrides for doanhThu and spChinh if they were edited
        ['doanhThu', 'spChinh'].forEach(key => {
            const tabOverride = activeTabs?.find(t => t.id === key);
            if (tabOverride && baseGroups[key]) {
                baseGroups[key].label = tabOverride.name;
                // Use tabOverride columns to define subHeaders exactly as configured by user
                if (tabOverride.columns) {
                    baseGroups[key].subHeaders = tabOverride.columns
                        .filter(c => !c.hidden)
                        .map(c => {
                            const originalSubHeaders = detailHeaderGroups[key].subHeaders;
                            const isStandard = originalSubHeaders.some(sh => sh.key === c.id || (key === 'doanhThu' && sh.key === 'doanhThuThuc' && c.id === 'dtThuc'));
                            let finalKey = c.id;
                            if (key === 'doanhThu' && c.id === 'dtThuc') finalKey = 'doanhThuThuc';
                            if (!isStandard) {
                                finalKey = `val_${key}_${c.id}`;
                            }
                            return { label: c.name.toUpperCase(), key: finalKey, originalColId: c.id, originalType: c.type };
                        });
                } else {
                    baseGroups[key].subHeaders = detailHeaderGroups[key].subHeaders;
                }
                if (key === 'spChinh' && !baseGroups[key].subHeaders.some(sh => sh.key === 'slGiaDung_main')) {
                    baseGroups[key].subHeaders = detailHeaderGroups['spChinh'].subHeaders;
                }
                baseGroups[key].colSpan = baseGroups[key].subHeaders.length;
            }
        });

        // Ramp phân biệt 14 nhóm chỉ bằng palette semantic: 6 họ (sky/emerald/amber/rose/indigo/slate)
        // × 2 tầng sắc độ (nhạt-50/đậm-100) để mỗi nhóm 1 tông riêng, không bị trùng.
        // `border` (viền dưới 3px, implementation_plan.md mục 61) đi theo đúng họ màu của bg/text.
        const pastelColors = [
            { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-b-sky-400' },
            { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-b-emerald-400' },
            { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-b-amber-400' },
            { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-b-rose-400' },
            { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-b-indigo-400' },
            { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-600 dark:text-slate-300', border: 'border-b-slate-400' },
            { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-800 dark:text-sky-300', border: 'border-b-sky-400' },
            { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-b-emerald-400' },
            { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-800 dark:text-amber-300', border: 'border-b-amber-400' },
            { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-800 dark:text-rose-300', border: 'border-b-rose-400' },
            { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-b-indigo-400' },
            { bg: 'bg-slate-200 dark:bg-slate-600/40', text: 'text-slate-700 dark:text-slate-200', border: 'border-b-slate-400' },
            { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-b-sky-400' },
            { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-b-emerald-400' }
        ];

        let colorIndex = 0;
        (activeTabs || []).forEach((tab) => {
            if (tab.id === 'doanhThu' || tab.id === 'spChinh') return; // Handled above
            
            const color = pastelColors[colorIndex % pastelColors.length];
            colorIndex++;
            const subHeaders = (tab.columns || []).filter(c => !c.hidden).map(col => ({
                label: col.name.toUpperCase(),
                key: `val_${tab.id}_${col.id}`
            }));

            baseGroups[tab.id] = {
                label: (tab.headerLabel || tab.name).toUpperCase(),
                colSpan: subHeaders.length || 1,
                bg: color.bg,
                text: color.text,
                border: color.border,
                subHeaders: subHeaders.length > 0 ? subHeaders : [{ label: '-', key: `empty_${tab.id}` }]
            };
        });
        return baseGroups;
    }, [activeTabs]);

    const handleToggleGroup = (groupKey: string) => {
        const currentGroups = viewMode === 'detail' ? visibleGroupsDetail : visibleGroupsEfficiency;
        const setGroups = viewMode === 'detail' ? setVisibleGroupsDetail : setVisibleGroupsEfficiency;

        const newVisibleGroups = new Set(currentGroups);
        const wasAdded = !newVisibleGroups.has(groupKey);

        if (wasAdded) {
            newVisibleGroups.add(groupKey);
        } else {
            if (newVisibleGroups.size > 1) { 
                newVisibleGroups.delete(groupKey);
            }
        }
        
        const setsAreEqual = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(value => b.has(value));

        if (!setsAreEqual(currentGroups, newVisibleGroups)) {
            setGroups(newVisibleGroups);

            const sortKeyForToggledGroup = groupToSortKeyMap[groupKey];
            if (wasAdded && sortKeyForToggledGroup) {
                setSortConfig({ key: sortKeyForToggledGroup, direction: 'desc' });
            } else if (!wasAdded && sortConfig.key === sortKeyForToggledGroup) {
                const remainingSpecialGroups: string[] = dynamicQuickFilters.map((f) => f.key).filter((key) => newVisibleGroups.has(key) && groupToSortKeyMap[key]);
                if (remainingSpecialGroups.length > 0) {
                    const firstKey = remainingSpecialGroups[0];
                    const newSortKey = groupToSortKeyMap[firstKey];
                    if(newSortKey) setSortConfig({ key: newSortKey, direction: 'desc' });
                } else {
                    setSortConfig({ key: 'percentBaoHiem', direction: 'desc' });
                }
            }
        }
    };
    
    const customTabData = useMemo(() => {
        const customData = new Map<string, { [tabId: string]: { [colId: string]: { mainSl: number, mainDt: number, baseSl: number, baseDt: number } } }>();
        const allTabs = [...(customExploitationTabs || []), ...(efficiencyExploitationTabs || [])];

        if (!baseFilteredData || !productConfig || allTabs.length === 0) return customData;

        try {
            const validData = baseFilteredData.filter(row => {
                // Chỉ tính đơn ĐÃ THU TIỀN và Trạng thái hồ sơ "1 - Mới" cho tab Khai Thác
                const thuTien = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));
                if (thuTien !== 'đã thu') return false;
                const trangThaiHoSo = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI));
                if (!trangThaiHoSo.includes('mới') && !trangThaiHoSo.startsWith('1')) return false;
                const htx = getRowValue(row, COL.HINH_THUC_XUAT);
                return productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                    ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(htx))
                    : !normalizedThuHoSet.has(cleanAndNormalize(htx));
            });

            const checkMatch = (filters: ColumnFilterCriteria | undefined, industry: string, subgroup: string, manufacturer: string, productCodeStr: string, row?: DataRow) => {
                if (!filters) return false;

                // 1. Nếu có bộ lọc Mã SP cụ thể
                if (filters.productCodes && filters.productCodes.length > 0) {
                    let productCodeMatch = false;
                    for (const code of filters.productCodes) {
                        if (code && productCodeStr.includes(code.trim())) {
                            productCodeMatch = true;
                            break;
                        }
                    }
                    // Nếu danh sách mã SP có giá trị mà không mã nào khớp -> Trả về false
                    if (!productCodeMatch) return false;
                } else {
                    // Nếu không có bộ lọc Mã SP cụ thể -> Check Ngành hàng & Nhóm hàng
                    if (filters.selectedIndustries && filters.selectedIndustries.length > 0) {
                        const normInd = cleanAndNormalize(industry);
                        const hasMatch = filters.selectedIndustries.some(i => {
                            const normI = cleanAndNormalize(i);
                            return normInd === normI || normInd.includes(normI);
                        });
                        if (!hasMatch) return false;
                    }
                    if (filters.selectedSubgroups && filters.selectedSubgroups.length > 0) {
                        const normSub = cleanAndNormalize(subgroup);
                        const hasMatch = filters.selectedSubgroups.some(s => {
                            const normS = cleanAndNormalize(s);
                            if (!normSub || !normS) return false;
                            if (normSub === normS) return true;
                            if (normSub.startsWith(normS + ' ') || normSub.endsWith(' ' + normS)) return true;
                            if (normS === 'quạt điều hòa' && normSub.includes('điều hòa')) return true;
                            if (normS === 'máy lọc nước' && normSub.includes('lọc nước')) return true;
                            if (normS === 'máy nước nóng lạnh' && (normSub.includes('nước nóng') || normSub.includes('nóng lạnh'))) return true;
                            return false;
                        });
                        if (!hasMatch) return false;
                    }
                }

                // 2. Kiểm tra nhóm con bị loại trừ (nếu có)
                if (filters.excludedSubgroups && filters.excludedSubgroups.length > 0) {
                    const normSubgroup = cleanAndNormalize(subgroup);
                    const isExcluded = filters.excludedSubgroups.some(ex => {
                        const normEx = cleanAndNormalize(ex);
                        return normSubgroup === normEx || normSubgroup.includes(normEx);
                    });
                    if (isExcluded) return false;
                }

                // 3. Kiểm tra Trạng thái hồ sơ bắt buộc (nếu có)
                if (filters.requiredDocumentStatus && row) {
                    const docStatus = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI));
                    const requiredStatus = cleanAndNormalize(filters.requiredDocumentStatus);
                    if (!docStatus.includes(requiredStatus) && !docStatus.includes('mới') && !docStatus.startsWith('1')) return false;
                }

                // 4. Kiểm tra Nhà sản xuất (nếu có)
                if (filters.selectedManufacturers && filters.selectedManufacturers.length > 0 && !filters.selectedManufacturers.includes(manufacturer)) {
                    return false;
                }

                return true;
            };

            validData.forEach(row => {
                const rawCreator = getRowValue(row, COL.NGUOI_TAO);
                if (!rawCreator) return;

                const employeeId = rawCreator.split(' - ')[0].trim();
                const price = Number(getRowValue(row, COL.PRICE)) || 0;

                const rawGroup = getRowValue(row, COL.MA_NHOM_HANG);
                const industry = getParentGroup(rawGroup, productConfig) || productConfig?.childToParentMap?.[rawGroup] || '';
                const subgroup = getSubgroup(rawGroup, productConfig) || productConfig?.childToSubgroupMap?.[rawGroup] || rawGroup || '';
                const manufacturer = getRowValue(row, COL.MANUFACTURER) || '';
                
                // Lấy trực tiếp từ cột Mã sản phẩm (Cột AF trong file YCX)
                const productCodeStr = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();

                // Bỏ qua sản phẩm không tính doanh thu (đồng nhất với WarehouseSummary)
                if (industry === 'Không tính doanh thu') return;

                const metrics = calculateRowMetrics(row, productConfig);
                const weightedQuantity = metrics.weightedQuantity;
                const revenueQD = metrics.revenueQD;

                allTabs.forEach(tab => {
                    const cols = tab.columns || [];
                    if (cols.length === 0) return;

                    cols.forEach(col => {
                        let isMainMatch = false;
                        let isBaseMatch = false;

                        if (col.type === 'quantity' || col.type === 'revenue') {
                            isMainMatch = checkMatch(col.filters, industry, subgroup, manufacturer, productCodeStr, row);
                        } else if (col.type === 'percentage' && col.percentageConfig) {
                            isMainMatch = checkMatch(col.percentageConfig.numeratorFilters, industry, subgroup, manufacturer, productCodeStr, row);
                            isBaseMatch = checkMatch(col.percentageConfig.denominatorFilters, industry, subgroup, manufacturer, productCodeStr, row);
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
                            
                            const mainFilters = (col.type === 'percentage' ? col.percentageConfig?.numeratorFilters : col.filters) as any;
                            const colAny = col as any;
                            const isMainQD = mainFilters?.metricType === 'revenueQD' || 
                                             col.id?.toLowerCase().includes('qd') || 
                                             col.id?.toLowerCase().includes('quy_doi') || 
                                             col.name?.toLowerCase().includes('quy đổi') || 
                                             colAny.subHeader?.toLowerCase().includes('qd') || 
                                             colAny.subHeader?.toLowerCase().includes('quy đổi');
                            const mainDtVal = isMainQD ? revenueQD : price;

                            const baseFilters = (col.type === 'percentage' ? col.percentageConfig?.denominatorFilters : col.filters) as any;
                            const isBaseQD = baseFilters?.metricType === 'revenueQD' || 
                                             col.id?.toLowerCase().includes('qd') || 
                                             col.id?.toLowerCase().includes('quy_doi') || 
                                             col.name?.toLowerCase().includes('quy đổi') || 
                                             colAny.subHeader?.toLowerCase().includes('qd') || 
                                             colAny.subHeader?.toLowerCase().includes('quy đổi');
                            const baseDtVal = isBaseQD ? revenueQD : price;

                            if (isMainMatch) {
                                colData.mainSl += weightedQuantity;
                                colData.mainDt += mainDtVal;
                            }
                            if (isBaseMatch) {
                                colData.baseSl += weightedQuantity;
                                colData.baseDt += baseDtVal;
                            }
                        }
                    });
                });
            });
        } catch(e) {
            console.error("Lỗi custom tabs", e);
        }
        return customData;
    }, [baseFilteredData, customExploitationTabs, efficiencyExploitationTabs, productConfig]);

    const { processedData, groupTotals, grandTotal } = useMemo(() => {
        const thresholds = { percentBaoHiem: 40, percentSimKT: 30, percentDongHoKT: 20, percentPhuKienKT: 10, percentGiaDungKT: 30 };

        const enhancedData = data.map(item => {
            const slSPChinh_Tong = (item.slICT || 0) + (item.slCE_main || 0) + (item.slGiaDung_main || 0);
            
            const empId = item.name.split(' - ')[0].trim();
            const customFields: Record<string, number> = {};
            const allTabs = [...(customExploitationTabs || []), ...(efficiencyExploitationTabs || [])];
            if (allTabs.length > 0) {
                allTabs.forEach(tab => {
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
                            const op = col.percentageConfig?.operator || '/';
                            let rawVal = 0;
                            if (op === '+') {
                                rawVal = numVal + baseVal;
                            } else if (op === '-') {
                                rawVal = numVal - baseVal;
                            } else if (op === '*') {
                                rawVal = numVal * baseVal;
                            } else {
                                rawVal = baseVal > 0 ? numVal / baseVal : 0;
                            }
                            const formatAs = col.percentageConfig?.formatAs || 'percentage';
                            val = formatAs === 'percentage' ? rawVal * 100 : rawVal;
                        }
                        if (col.type === 'sum') {
                            const excluded = col.excludedColIds || [];
                            val = cols.filter(c => !c.hidden && !excluded.includes(c.id) && (c.type === 'quantity' || c.type === 'revenue')).reduce((acc, c) => {
                                const relatedData = tData[c.id] || { mainSl: 0, mainDt: 0, baseSl: 0, baseDt: 0 };
                                return acc + (c.type === 'quantity' ? relatedData.mainSl : relatedData.mainDt);
                            }, 0);
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

            // Tính toán đặc thù cho tab BH ĐMX ĐGD (default_tab_bao_hiem_dgd):
            // SLBH(ĐGD) = ALL SLBH - SLBH(CE) - SLBH(ICT) - SLBH(MLN)
            const allSlbh = customFields['val_default_tab_all_bhiem_col_all_bh_1'] || 0;
            const ceSlbh = customFields['val_default_tab_bao_duong_ce_col_bd_ce_1'] || 0;
            const ictSlbh = customFields['val_default_tab_bao_hiem_ict_col_bh_ict_1'] || 0;
            const mlnSlbh = customFields['val_default_tab_bao_hiem_mln_col_bh_mln_1'] || 0;
            const dgdSlbh = Math.max(0, allSlbh - ceSlbh - ictSlbh - mlnSlbh);

            // DTBH(ĐGD) = ALL DTBH - DTBH(CE) - DTBH(ICT) - DTBH(MLN)
            const allDtbh = customFields['val_default_tab_all_bhiem_col_all_bh_2'] || 0;
            const ceDtbh = customFields['val_default_tab_bao_duong_ce_col_bd_ce_2'] || 0;
            const ictDtbh = customFields['val_default_tab_bao_hiem_ict_col_bh_ict_2'] || 0;
            const mlnDtbh = customFields['val_default_tab_bao_hiem_mln_col_bh_mln_2'] || 0;
            const dgdDtbh = Math.max(0, allDtbh - ceDtbh - ictDtbh - mlnDtbh);

            // ĐGD (Cột 0): Số lượng SP ĐGD (loại trừ MLN, QĐH, MNN, Bếp gas)
            const dgdBaseQty = customFields['val_default_tab_bao_hiem_dgd_col_bh_dgd_0'] || 0;
            const dgdPct = dgdBaseQty > 0 ? (dgdSlbh / dgdBaseQty) * 100 : 0;

            customFields['val_default_tab_bao_hiem_dgd_col_bh_dgd_1'] = dgdSlbh;
            customFields['val_default_tab_bao_hiem_dgd_col_bh_dgd_2'] = dgdDtbh;
            customFields['val_default_tab_bao_hiem_dgd_col_bh_dgd_3'] = dgdPct;

            customFields['raw_mainSl_default_tab_bao_hiem_dgd_col_bh_dgd_1'] = dgdSlbh;
            customFields['raw_mainDt_default_tab_bao_hiem_dgd_col_bh_dgd_2'] = dgdDtbh;
            customFields['raw_mainSl_default_tab_bao_hiem_dgd_col_bh_dgd_3'] = dgdSlbh;
            customFields['raw_baseSl_default_tab_bao_hiem_dgd_col_bh_dgd_3'] = dgdBaseQty;

            const getCustomTabVal = (tabId: string, colType: string) => {
                const allTabs = [...(customExploitationTabs || []), ...(efficiencyExploitationTabs || [])];
                const tab = allTabs.find(t => t.id === tabId);
                if (!tab) return 0;
                const col = tab.columns?.find(c => c.type === colType) || tab.columns?.[0];
                if (!col) return 0;
                return customFields[`val_${tab.id}_${col.id}`] || 0;
            };

            const getCustomTabSumQuantity = (tabId: string) => {
                const allTabs = [...(customExploitationTabs || []), ...(efficiencyExploitationTabs || [])];
                const tab = allTabs.find(t => t.id === tabId);
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
            const initialTotals: Record<string, number> = {
                doanhThuThuc: 0, doanhThuQD: 0,
                slICT: 0, doanhThuICT: 0, slCE_main: 0, doanhThuCE_main: 0, slGiaDung_main: 0,
                slBaoHiem: 0, doanhThuBaoHiem: 0,
                slSim: 0, doanhThuSim: 0, slDongHo: 0, doanhThuDongHo: 0,
                doanhThuPhuKien: 0, slPhuKien: 0, slCamera: 0, slLoa: 0, slPinSDP: 0, slTaiNgheBLT: 0,
                doanhThuGiaDung: 0, slGiaDung: 0, slMayLocNuoc: 0, slNoiCom: 0, slNoiChien: 0, slQuatDien: 0,
                belowAverageCount: 0
            };
            
            const allTabs = [...(customExploitationTabs || []), ...(efficiencyExploitationTabs || [])];
            if (allTabs.length > 0) {
                 allTabs.forEach(tab => {
                      const cols = tab.columns || [];
                      cols.forEach(col => {
                          initialTotals[`raw_mainSl_${tab.id}_${col.id}`] = 0;
                          initialTotals[`raw_mainDt_${tab.id}_${col.id}`] = 0;
                          initialTotals[`raw_baseSl_${tab.id}_${col.id}`] = 0;
                          initialTotals[`raw_baseDt_${tab.id}_${col.id}`] = 0;
                          initialTotals[`val_${tab.id}_${col.id}`] = 0;
                      });
                  });
            }

            if (items.length === 0) return { ...initialTotals, hieuQuaQD: 0, percentBaoHiem: 0, percentSimKT: 0, percentDongHoKT: 0, percentPhuKienKT: 0, percentGiaDungKT: 0, slSPChinh_Tong: 0 };
            
            const t = items.reduce((acc, item) => {
                Object.keys(initialTotals).forEach((key) => {
                    const value = (item as Record<string, unknown>)[key];
                    if (typeof value === 'number') {
                        acc[key] += value;
                    }
                });
                return acc;
            }, { ...initialTotals } as Record<string, number>);
            
            const hieuQuaQD = t.doanhThuThuc > 0 ? (t.doanhThuQD - t.doanhThuThuc) / t.doanhThuThuc * 100 : 0;
            const slSPChinh_Tong = t.slICT + t.slCE_main + t.slGiaDung_main;
            if (allTabs.length > 0) {
                 allTabs.forEach(tab => {
                     const cols = tab.columns || [];
                     cols.forEach(col => {
                         let val = 0;
                         if (col.type === 'quantity') val = t[`raw_mainSl_${tab.id}_${col.id}`] || 0;
                         if (col.type === 'revenue') val = t[`raw_mainDt_${tab.id}_${col.id}`] || 0;
                         if (col.type === 'percentage') {
                              const baseVal = col.percentageConfig?.baseMetric === 'revenue' ? t[`raw_baseDt_${tab.id}_${col.id}`] || 0 : t[`raw_baseSl_${tab.id}_${col.id}`] || 0;
                              const numVal = col.percentageConfig?.numeratorMetric === 'revenue' ? t[`raw_mainDt_${tab.id}_${col.id}`] || 0 : t[`raw_mainSl_${tab.id}_${col.id}`] || 0;
                              const op = col.percentageConfig?.operator || '/';
                              let rawVal = 0;
                              if (op === '+') {
                                  rawVal = numVal + baseVal;
                              } else if (op === '-') {
                                  rawVal = numVal - baseVal;
                              } else if (op === '*') {
                                  rawVal = numVal * baseVal;
                              } else {
                                  rawVal = baseVal > 0 ? numVal / baseVal : 0;
                              }
                              const formatAs = col.percentageConfig?.formatAs || 'percentage';
                              val = formatAs === 'percentage' ? rawVal * 100 : rawVal;
                          }
                          if (col.type === 'sum') {
                              const excluded = col.excludedColIds || [];
                              val = cols.filter(c => !c.hidden && !excluded.includes(c.id) && (c.type === 'quantity' || c.type === 'revenue')).reduce((acc, c) => {
                                  return acc + (t[c.type === 'quantity' ? `raw_mainSl_${tab.id}_${c.id}` : `raw_mainDt_${tab.id}_${c.id}`] || 0);
                              }, 0);
                          }
                         t[`val_${tab.id}_${col.id}`] = val;
                     });
                 });
            }
            
            const getCustomTabValTotal = (tabId: string, colType: string) => {
                const allTabs = [...(customExploitationTabs || []), ...(efficiencyExploitationTabs || [])];
                const tab = allTabs.find(tb => tb.id === tabId);
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

        const groupTotals: Record<string, ReturnType<typeof calculateTotals>> = {};
        for (const dept in finalGroupedData) { groupTotals[dept] = calculateTotals(finalGroupedData[dept]); }
        const grandTotal = calculateTotals(enhancedData);

        return { processedData: finalGroupedData, groupTotals, grandTotal };
    }, [data, sortConfig, customTabData, customExploitationTabs, efficiencyExploitationTabs]);

    const handleSort = (key: string) => {
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
        grandTotal,
        dynamicQuickFilters,
        dynamicHeaderGroups
    };
};
