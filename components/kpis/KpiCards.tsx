import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatCurrency, formatQuantity, calculateRowMetrics, getRowValue, getParentGroup, getSubgroup, cleanAndNormalize, normalizedThuHoSet } from '../../utils/dataUtils';
import { COL } from '../../constants';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { saveKpiTargets, getKpiTargets } from '../../services/dbService';
import { KpiCard } from '../shared/ui/KpiCard';

interface KpiCardsProps {
    onUnshippedClick: () => void;
}

const KpiTargetEditor: React.FC<{
    value: string;
    onChange: (val: string) => void;
    onFinish: () => void;
    onCancel: () => void;
    suffix?: string;
}> = ({ value, onChange, onFinish, onCancel, suffix = '%' }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
                ref={inputRef}
                type="number"
                min="0"
                step="any"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onFinish}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onFinish();
                    if (e.key === 'Escape') onCancel();
                    e.stopPropagation();
                }}
                className="w-16 px-1.5 py-0.5 text-center text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
            />
            {suffix && <span className="text-[10px] font-bold text-slate-500">{suffix}</span>}
        </div>
    );
};

type EditableField = 'hieuQua' | 'traGop' | 'gtdh' | 'doanhThuThuc' | null;

const KpiCards: React.FC<KpiCardsProps> = ({ onUnshippedClick }) => {
    const { processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets, kpiCardsConfig, warehouseFilteredData, isLuyKe, handleLuyKeChange, productConfig, warehouseDTThucTargets, setEditingTargetKho, uniqueFilterOptions } = useDashboardContext();
    const kpis = processedData?.kpis;

    const getTargetKhoToEdit = () => {
        if (filterState.kho && filterState.kho.length === 1 && filterState.kho[0] !== 'all') {
            return filterState.kho[0];
        }
        if (processedData?.warehouseSummary && processedData.warehouseSummary.length > 0) {
            return processedData.warehouseSummary[0].khoName;
        }
        if (uniqueFilterOptions?.kho && uniqueFilterOptions.kho.length > 0 && uniqueFilterOptions.kho[0] !== 'all') {
            return uniqueFilterOptions.kho[0];
        }
        return '';
    };

    // targets fallbacks
    const hieuQuaTarget = kpiTargets?.hieuQua ?? 40;
    const traGopTarget = kpiTargets?.traGop ?? 45;
    const gtdhTarget = kpiTargets?.gtdh ?? 1;
    const doanhThuThucTarget = kpiTargets?.doanhThuThuc ?? 0;

    const [editingState, setEditingState] = useState<{ field: EditableField, value: string }>({ field: null, value: '' });

    const startEditing = (e: React.MouseEvent, field: NonNullable<EditableField>) => {
        e.preventDefault();
        e.stopPropagation();
        const fieldMap: Record<string, number> = {
            hieuQua: hieuQuaTarget,
            traGop: traGopTarget,
            gtdh: gtdhTarget,
            doanhThuThuc: doanhThuThucTarget,
        };
        setEditingState({ field, value: (fieldMap[field] ?? 0).toString() });
    };

    const handleEditChange = (val: string) => {
        setEditingState(prev => ({ ...prev, value: val }));
    };

    const submitEditing = () => {
        if (!editingState.field) return;
        const newVal = parseFloat(editingState.value);
        if (!isNaN(newVal) && newVal >= 0) {
            const newTargets = {
                hieuQua: hieuQuaTarget,
                traGop: traGopTarget,
                gtdh: gtdhTarget,
                doanhThuThuc: doanhThuThucTarget,
                [editingState.field]: newVal
            };
            updateKpiTargets(newTargets);
            saveKpiTargets(newTargets).catch(console.error);
        }
        setEditingState({ field: null, value: '' });
    };

    const cancelEditing = () => {
        setEditingState({ field: null, value: '' });
    };

    // Calculate dynamic Revenue Target based on Warehouse Summary
    const revenueTarget = useMemo(() => {
        if (filterState.kho && filterState.kho.length > 0 && !filterState.kho.includes('all')) {
            return filterState.kho.reduce((acc, k) => acc + (warehouseTargets[k] || 0), 0);
        } else {
            // Sum all available warehouse targets
            return Object.values(warehouseTargets).reduce((acc: number, val: number) => acc + (val || 0), 0);
        }
    }, [filterState.kho, warehouseTargets]);

    const dtThucTarget = useMemo(() => {
        const targets = warehouseDTThucTargets || {};
        if (filterState.kho && filterState.kho.length > 0 && !filterState.kho.includes('all')) {
            return filterState.kho.reduce((acc, k) => acc + (targets[k] || 0), 0);
        } else {
            return Object.values(targets).reduce((acc: number, val: number) => acc + (val || 0), 0);
        }
    }, [filterState.kho, warehouseDTThucTargets]);

    // Calculate days in month for daily target
    const daysInMonth = useMemo(() => {
        if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
            const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
            if (match) {
                return new Date(parseInt(match[2]), parseInt(match[1]), 0).getDate();
            }
        }
        // fallback: current month
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }, [filterState.selectedMonths]);

    const computedValues = useMemo(() => {
        const values: Record<string, number> = {};

        // Pass 1: Metric & Data
        (kpiCardsConfig || []).forEach(config => {
            if (!config.type || config.type === 'metric') {
                let raw = kpis ? (kpis as unknown as Record<string, unknown>)[config.metric as string] as number || 0 : 0;
                if (config.metric === 'crossSellRate' || config.metric === 'hieuQuaQD') {
                    raw = raw * 100;
                }
                values[config.id] = raw;
            } else if (config.type === 'data') {
                if (!warehouseFilteredData) {
                    values[config.id] = 0;
                    return;
                }
                const filters = config.dataFilters;
                if (!filters) {
                    values[config.id] = 0;
                    return;
                }
                const filterHsx = (filters.selectedManufacturers || []).map(s => String(s).trim().toLowerCase());
                const filterNganh = (filters.selectedIndustries || []).map(s => String(s).trim().toLowerCase());
                const filterNhom = (filters.selectedSubgroups || []).map(s => String(s).trim().toLowerCase());
                const childToParentMap = productConfig?.childToParentMap || {};
                const childToSubgroupMap = productConfig?.childToSubgroupMap || {};

                let val = 0;
                for (const row of warehouseFilteredData) {
                    const rawNhom = String(row['Nhóm Hàng'] || row['Nhóm hàng'] || row['Nhom Hang'] || '').trim();
                    const parentGroup = getParentGroup(rawNhom, productConfig);
                    if (parentGroup === 'Không tính doanh thu') continue;

                    const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
                    const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                        ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
                        : !normalizedThuHoSet.has(cleanAndNormalize(hinhThucXuat));
                    if (!isRevenue) continue;

                    const hsx = String(row['Hãng'] || row['Hãng SX'] || '').trim().toLowerCase();
                    if (filterHsx.length > 0 && !filterHsx.includes(hsx)) continue;

                    const nganhMapValue = String(getParentGroup(rawNhom, productConfig) || row['Ngành Hàng'] || row['Ngành hàng'] || row['Nganh Hang'] || '').trim().toLowerCase();
                    if (filterNganh.length > 0 && !filterNganh.includes(nganhMapValue)) continue;

                    const nhomMapValue = String(getSubgroup(rawNhom, productConfig) || rawNhom).trim().toLowerCase();
                    if (filterNhom.length > 0 && !filterNhom.includes(nhomMapValue)) continue;

                    if (filters.metricType === 'quantity') {
                        val += Number(row['Số Lượng'] || row['Số lượng'] || 0);
                    } else if (filters.metricType === 'revenueQD') {
                        val += calculateRowMetrics(row, productConfig).revenueQD;
                    } else { // revenue
                        val += calculateRowMetrics(row, productConfig).revenue;
                    }
                }
                values[config.id] = val;
            }
        });

        // Pass 2: Calculated
        (kpiCardsConfig || []).forEach(config => {
            if (config.type === 'calculated') {
                const v1 = values[config.operand1_cardId || ''] || 0;
                const v2 = values[config.operand2_cardId || ''] || 0;
                let res = 0;
                if (config.operation === '+') res = v1 + v2;
                else if (config.operation === '-') res = v1 - v2;
                else if (config.operation === '*') res = v1 * v2;
                else if (config.operation === '/') res = v2 !== 0 ? v1 / v2 : 0;

                if (config.format === 'percentage') res *= 100;
                values[config.id] = res;
            }
        });

        return values;
    }, [kpiCardsConfig, kpis, warehouseFilteredData, productConfig]);

    if (!kpis || !kpiCardsConfig) {
        return null;
    }

    const visibleCards = kpiCardsConfig
        .filter(c => c.isVisible && c.id !== 'kpi-runrate' && c.id !== 'kpi-crosssell')
        .sort((a, b) => a.order - b.order);

    return (
        <div>
            <div className={`
                grid grid-cols-2 gap-2.5 pb-1
                sm:grid-cols-3
                lg:grid-cols-4 lg:gap-4
                xl:grid-cols-5 mb-3 lg:mb-8 kpi-grid-for-export
            `}>
            {visibleCards.map(config => {
                const isSpecialUnshipped = config.metric === 'doanhThuThucChoXuat';

                let rawValue = computedValues[config.id] || 0;

                // Determine formatting — round percentage to 0 decimals
                let displayValue = '';
                if (config.format === 'currency') displayValue = formatCurrency(rawValue);
                else if (config.format === 'percentage') displayValue = `${Math.round(rawValue)}%`;
                else displayValue = rawValue.toLocaleString('vi-VN');

                // Determine trend & target
                let finalTrendLabel = config.trendLabel || '';
                let finalTrendValue: React.ReactNode = '';
                let isGood = true;
                let progressPercent: number | undefined = undefined;
                let editableField: NonNullable<EditableField> | null = null;

                if (config.hasTarget && config.targetType === 'global') {
                    if (config.metric === 'doanhThuQD') {
                        // DTQD: target from warehouse summary
                        const dailyRevTarget = revenueTarget > 0 ? revenueTarget / daysInMonth : 0;
                        const activeTarget = isLuyKe ? revenueTarget : dailyRevTarget;
                        const pctHT = activeTarget > 0 ? (rawValue / activeTarget) * 100 : 0;
                        finalTrendLabel = activeTarget > 0 ? (isLuyKe ? "Lũy kế" : "Tar ngày") : "Tar";
                        isGood = pctHT >= 100;
                        progressPercent = pctHT;
                        finalTrendValue = revenueTarget > 0
                            ? <span className="cursor-pointer hover:text-sky-500 transition-colors flex flex-col items-end leading-tight">
                                <span>{formatCurrency(activeTarget)} / {pctHT.toFixed(0)}%</span>
                                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{isLuyKe ? `Ngày: ${formatCurrency(dailyRevTarget)}` : `Tháng: ${formatCurrency(revenueTarget)}`}</span>
                            </span>
                            : <span className="cursor-pointer text-slate-400 hover:text-sky-500 italic text-[10px] transition-colors">Nhấp để cài đặt</span>;
                    } else if (config.targetRef === 'hieuQua') {
                        finalTrendLabel = "Mục tiêu";
                        editableField = 'hieuQua';
                        isGood = rawValue >= hieuQuaTarget;
                        progressPercent = hieuQuaTarget > 0 ? (rawValue / hieuQuaTarget) * 100 : 0;
                        if (editingState.field === 'hieuQua') {
                            finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />;
                        } else {
                            const gap = rawValue - hieuQuaTarget;
                            finalTrendValue = (
                                <span className="cursor-pointer hover:text-sky-500 transition-colors flex flex-col items-end leading-tight">
                                    <span>{hieuQuaTarget}%</span>
                                    <span className={`text-[9px] font-medium ${isGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                        {isGood ? `Đã vượt +${gap.toFixed(0)}%` : `Còn thiếu ${Math.abs(gap).toFixed(0)}%`}
                                    </span>
                                </span>
                            );
                        }
                    } else if (config.targetRef === 'traGop') {
                        finalTrendLabel = "Mục tiêu";
                        editableField = 'traGop';
                        isGood = rawValue >= traGopTarget;
                        progressPercent = traGopTarget > 0 ? (rawValue / traGopTarget) * 100 : 0;
                        if (editingState.field === 'traGop') {
                            finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />;
                        } else {
                            const gap = rawValue - traGopTarget;
                            finalTrendValue = (
                                <span className="cursor-pointer hover:text-sky-500 transition-colors flex flex-col items-end leading-tight">
                                    <span>{traGopTarget}%</span>
                                    <span className={`text-[9px] font-medium ${isGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                        {isGood ? `Đã vượt +${gap.toFixed(0)}%` : `Còn thiếu ${Math.abs(gap).toFixed(0)}%`}
                                    </span>
                                </span>
                            );
                        }
                    }
                } else if (config.hasTarget && config.targetType === 'custom') {
                    const monthlyTarget = config.customTargetValue || 0;
                    const dailyTarget = monthlyTarget > 0 ? monthlyTarget / daysInMonth : 0;
                    const activeTarget = isLuyKe ? monthlyTarget : dailyTarget;
                    const pctHT = activeTarget > 0 ? (rawValue / activeTarget) * 100 : 0;
                    finalTrendLabel = activeTarget > 0 ? (isLuyKe ? "Mục tiêu luỹ kế" : "Mục tiêu ngày") : "Mục tiêu";
                    isGood = pctHT >= 100;
                    progressPercent = pctHT;
                    
                    let formattedActive = '';
                    let formattedMonthly = '';
                    let formattedDaily = '';

                    if (config.format === 'currency') {
                        formattedActive = formatCurrency(activeTarget);
                        formattedMonthly = formatCurrency(monthlyTarget);
                        formattedDaily = formatCurrency(dailyTarget);
                    } else if (config.format === 'percentage') {
                        formattedActive = `${Math.round(activeTarget)}%`;
                        formattedMonthly = `${Math.round(monthlyTarget)}%`;
                        formattedDaily = `${Math.round(dailyTarget)}%`;
                    } else {
                        formattedActive = Math.round(activeTarget).toLocaleString('vi-VN');
                        formattedMonthly = Math.round(monthlyTarget).toLocaleString('vi-VN');
                        formattedDaily = Math.round(dailyTarget).toLocaleString('vi-VN');
                    }

                    finalTrendValue = monthlyTarget > 0
                        ? <span className="flex flex-col items-end leading-tight">
                            <span>{formattedActive} / {pctHT.toFixed(0)}%</span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{isLuyKe ? `Ngày: ${formattedDaily}` : `Tháng: ${formattedMonthly}`}</span>
                          </span>
                        : <span className="text-slate-400 italic text-[10px]">Chưa cài đặt</span>;
                }

                // "Doanh Thu Thực" — allow entering/editing target (metric can be 'totalRevenue' or 'doanhThuThuc')
                const isDTThucCard = config.metric === 'totalRevenue' || config.metric === 'doanhThuThuc';
                if (isDTThucCard) {
                    const monthlyTarget = dtThucTarget;
                    const dailyDTThuc = monthlyTarget > 0 ? monthlyTarget / daysInMonth : 0;
                    const activeTarget = isLuyKe ? monthlyTarget : dailyDTThuc;
                    const pct = activeTarget > 0 ? (rawValue / activeTarget) * 100 : 0;
                    finalTrendLabel = activeTarget > 0 ? (isLuyKe ? "Lũy kế" : "Tar ngày") : "Tar";
                    
                    isGood = pct >= 100;
                    progressPercent = pct;

                    finalTrendValue = monthlyTarget > 0
                        ? <span className="cursor-pointer hover:text-sky-500 transition-colors flex flex-col items-end leading-tight">
                            <span>{formatCurrency(activeTarget)}</span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{isLuyKe ? `Ngày: ${formatCurrency(dailyDTThuc)}` : `Tháng: ${formatCurrency(monthlyTarget)}`}</span>
                        </span>
                        : <span className="cursor-pointer text-slate-400 hover:text-sky-500 italic text-[10px] transition-colors">Chưa cài đặt</span>;
                }

                // "DT Chưa Xuất" — show unshipped order count with progress bar
                if (isSpecialUnshipped) {
                    const unshippedCount = processedData?.unshippedOrders?.length || 0;
                    finalTrendLabel = "Cảnh báo";
                    isGood = unshippedCount === 0;
                    // Progress bar: visually show urgency (cap at 20 orders = 100%)
                    progressPercent = unshippedCount > 0 ? Math.min((unshippedCount / 20) * 100, 100) : 0;
                    if (unshippedCount > 0) {
                        // Dòng phụ bên dưới để đồng bộ bố cục footer 2 dòng với các thẻ khác (HQQĐ/TRẢ CHẬM...)
                        finalTrendValue = (
                            <span className="flex flex-col items-end leading-tight">
                                <span className="text-rose-600 dark:text-rose-400 font-bold">Còn {unshippedCount} đơn</span>
                                <span className="text-[9px] font-medium text-rose-400 dark:text-rose-500">Cần xử lý ngay</span>
                            </span>
                        );
                    } else {
                        finalTrendValue = (
                            <span className="flex flex-col items-end leading-tight">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Không có đơn chờ</span>
                                <span className="text-[9px] font-medium text-emerald-400 dark:text-emerald-500">Đã xử lý hết</span>
                            </span>
                        );
                    }
                }

                // Color mappings based on 'isGood' and icon color
                let valueColor = 'text-slate-800 dark:text-slate-200';
                if ((config.hasTarget && config.targetType !== 'none') || (isDTThucCard && dtThucTarget > 0)) {
                    valueColor = isGood ? `text-emerald-600 dark:text-emerald-400` : 'text-amber-600 dark:text-amber-400';
                    if (config.metric === 'doanhThuQD') valueColor = 'text-sky-600 dark:text-sky-400';
                } else if (isSpecialUnshipped) {
                    valueColor = rawValue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500';
                } else {
                    if (config.iconColor === 'blue') valueColor = 'text-sky-600 dark:text-sky-400';
                    else if (config.iconColor === 'emerald') valueColor = 'text-emerald-600 dark:text-emerald-400';
                    else if (config.iconColor === 'pink') valueColor = 'text-rose-600 dark:text-rose-400';
                    else if (config.iconColor === 'orange') valueColor = 'text-amber-600 dark:text-amber-400';
                    else if (config.iconColor === 'purple' || config.iconColor === 'violet') valueColor = 'text-slate-600 dark:text-slate-400';
                    else if (config.iconColor === 'red' || config.iconColor === 'rose') valueColor = 'text-rose-600 dark:text-rose-400';
                    else if (config.iconColor === 'amber') valueColor = 'text-amber-600 dark:text-amber-400';
                }

                const isDTQDCard = config.metric === 'doanhThuQD';

                const handleClick = (e: React.MouseEvent) => {
                    if (isSpecialUnshipped) {
                        onUnshippedClick();
                    } else if (isDTThucCard) {
                        const targetKho = getTargetKhoToEdit();
                        if (targetKho) {
                            const currentDTQD = warehouseTargets[targetKho] || 0;
                            const currentDTThuc = warehouseDTThucTargets[targetKho] || 0;
                            const dtqdDivided = currentDTQD > 0 ? (currentDTQD / 1000000) : 0;
                            const dtThucDivided = currentDTThuc > 0 ? (currentDTThuc / 1000000) : 0;

                            const formatWithCommasLocal = (value: string): string => {
                                const cleaned = value.replace(/[^0-9.]/g, '');
                                const parts = cleaned.split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
                            };

                            setEditingTargetKho({
                                id: targetKho,
                                name: targetKho,
                                valueDTQD: dtqdDivided > 0 ? formatWithCommasLocal(dtqdDivided.toString()) : '',
                                valueDTThuc: dtThucDivided > 0 ? formatWithCommasLocal(dtThucDivided.toString()) : '',
                            });
                        }
                    } else if (isDTQDCard) {
                        // Scroll to warehouse summary where users can set per-kho targets
                        const warehouseEl = document.getElementById('warehouse-summary-view');
                        if (warehouseEl) {
                            warehouseEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Flash highlight
                            warehouseEl.classList.add('ring-2', 'ring-sky-500/50');
                            setTimeout(() => warehouseEl.classList.remove('ring-2', 'ring-sky-500/50'), 2000);
                        }
                    } else if (editableField) {
                        startEditing(e, editableField);
                    }
                };

                const isClickable = isSpecialUnshipped || isDTQDCard || isDTThucCard || !!editableField;

                return (
                    <div key={config.id} className={isSpecialUnshipped ? 'hidden md:block' : undefined}>
                        <KpiCard
                            icon={config.icon}
                            iconColor={config.iconColor}
                            title={config.title}
                            onClick={isClickable ? handleClick : undefined}
                            trendLabel={finalTrendLabel}
                            trendValue={finalTrendValue}
                            progressPercent={progressPercent}
                            isGood={isGood}
                        >
                            <div className={`text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums ${valueColor}`}>
                                {displayValue}
                            </div>
                        </KpiCard>
                    </div>
                );
            })}
        </div>
        </div>
    );
};

export default React.memo(KpiCards);

