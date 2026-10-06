import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatCurrency, formatQuantity, calculateRowMetrics, getRowValue, getParentGroup, getSubgroup, cleanAndNormalize, normalizedThuHoSet } from '../../utils/dataUtils';
import { COL } from '../../constants';
import { useDashboardContext, DashboardContextType } from '../../contexts/DashboardContext';
import { saveKpiTargets, getKpiTargets } from '../../services/dbService';
import { KpiCard } from '../shared/ui/KpiCard';

interface KpiCardsProps {
    onUnshippedClick: () => void;
}

/** Map iconColor (kể cả tên màu cũ) sang class text màu tương ứng — dùng cho cả 2 nhánh valueColor bên dưới */
function iconColorToTextClass(iconColor: string): string {
    switch (iconColor) {
        case 'blue': case 'sky': return 'text-sky-700 dark:text-sky-400';
        case 'emerald': case 'teal': return 'text-emerald-700 dark:text-emerald-400';
        case 'pink': case 'red': case 'rose': return 'text-rose-700 dark:text-rose-400';
        case 'orange': case 'amber': return 'text-amber-700 dark:text-amber-400';
        case 'purple': case 'violet': case 'slate': return 'text-slate-600 dark:text-slate-400';
        case 'indigo': return 'text-sky-700 dark:text-sky-400';
        default: return 'text-slate-800 dark:text-slate-200';
    }
}

/** Tách số và đơn vị tiền tệ để hiển thị đơn vị chữ nhỏ, màu xám ở chân số như KpiOverview */
function splitCurrencyValue(formatted: string): { val: string; unit: string } {
    if (!formatted || formatted === '-') return { val: formatted || '-', unit: '' };
    const trimmed = formatted.trim();
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > 0) {
        const valPart = trimmed.slice(0, lastSpace).trim();
        const unitPart = trimmed.slice(lastSpace + 1).trim();
        if (/\d/.test(valPart) && !/^\d+$/.test(unitPart)) {
            return { val: valPart, unit: unitPart };
        }
    }
    return { val: trimmed, unit: '' };
}

/** Định dạng chênh lệch mục tiêu: Nếu > 0 thêm dấu "+", nhỏ hơn 0 thêm dấu "-" */
function formatCurrencyDiff(diff: number): string {
    if (diff > 0) return `+${formatCurrency(diff)}`;
    if (diff < 0) return `-${formatCurrency(Math.abs(diff))}`;
    return '0';
}

function formatPercentDiff(diff: number): string {
    if (diff > 0) return `+${diff.toFixed(0)}%`;
    if (diff < 0) return `-${Math.abs(diff).toFixed(0)}%`;
    return '0%';
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
                type="number" inputMode="decimal"
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
            {suffix && <span className="text-[11px] font-bold text-slate-500">{suffix}</span>}
        </div>
    );
};

type EditableField = 'hieuQua' | 'traGop' | 'gtdh' | 'doanhThuThuc' | null;

// PERF FIX: nhận dữ liệu qua props tường minh (Pick từ DashboardContextType) thay vì tự
// useDashboardContext() bên trong — cùng pattern đã dùng đúng ở TrendChart/IndustryGrid/
// WarehouseSummary (Outer gọi context 1 lần → Inner chỉ nhận props → React.memo có tác dụng
// thật, không re-render khi phần KHÔNG liên quan của context đổi).
type KpiCardsInnerProps = KpiCardsProps & Pick<DashboardContextType,
    | 'processedData' | 'filterState' | 'warehouseTargets' | 'kpiTargets' | 'updateKpiTargets'
    | 'kpiCardsConfig' | 'warehouseFilteredData' | 'isLuyKe' | 'handleLuyKeChange' | 'productConfig'
    | 'warehouseDTThucTargets' | 'setEditingTargetKho' | 'uniqueFilterOptions'
>;

const KpiCardsInner: React.FC<KpiCardsInnerProps> = React.memo(({
    onUnshippedClick, processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets,
    kpiCardsConfig, warehouseFilteredData, isLuyKe, handleLuyKeChange, productConfig,
    warehouseDTThucTargets, setEditingTargetKho, uniqueFilterOptions
}) => {
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
            // Chỉ cộng dồn target của những kho thực sự phát sinh dữ liệu (có mặt trong warehouseSummary)
            const activeKhos = (processedData?.warehouseSummary || []).map(w => w.khoName);
            if (activeKhos.length > 0) {
                return activeKhos.reduce((acc, k) => acc + (warehouseTargets[k] || 0), 0);
            }
            // Fallback nếu chưa có dữ liệu tổng hợp
            return Object.values(warehouseTargets).reduce((acc: number, val: number) => acc + (val || 0), 0);
        }
    }, [filterState.kho, warehouseTargets, processedData?.warehouseSummary]);

    const dtThucTarget = useMemo(() => {
        const targets = warehouseDTThucTargets || {};
        if (filterState.kho && filterState.kho.length > 0 && !filterState.kho.includes('all')) {
            return filterState.kho.reduce((acc, k) => acc + (targets[k] || 0), 0);
        } else {
            // Chỉ cộng dồn target của những kho thực sự phát sinh dữ liệu (có mặt trong warehouseSummary)
            const activeKhos = (processedData?.warehouseSummary || []).map(w => w.khoName);
            if (activeKhos.length > 0) {
                return activeKhos.reduce((acc, k) => acc + (targets[k] || 0), 0);
            }
            // Fallback nếu chưa có dữ liệu tổng hợp
            return Object.values(targets).reduce((acc: number, val: number) => acc + (val || 0), 0);
        }
    }, [filterState.kho, warehouseDTThucTargets, processedData?.warehouseSummary]);

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
                    const rawNhom = String(getRowValue(row, COL.MA_NHOM_HANG) || '').trim();
                    const parentGroup = getParentGroup(rawNhom, productConfig);
                    if (parentGroup === 'Không tính doanh thu') continue;

                    const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
                    const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                        ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
                        : !normalizedThuHoSet.has(cleanAndNormalize(hinhThucXuat));
                    if (!isRevenue) continue;

                    const hsx = String(getRowValue(row, COL.MANUFACTURER) || '').trim().toLowerCase();
                    if (filterHsx.length > 0 && !filterHsx.includes(hsx)) continue;

                    const nganhMapValue = String(getParentGroup(rawNhom, productConfig) || getRowValue(row, COL.MA_NGANH_HANG) || '').trim().toLowerCase();
                    if (filterNganh.length > 0 && !filterNganh.includes(nganhMapValue)) continue;

                    const nhomMapValue = String(getSubgroup(rawNhom, productConfig) || rawNhom).trim().toLowerCase();
                    if (filterNhom.length > 0 && !filterNhom.includes(nhomMapValue)) continue;

                    if (filters.metricType === 'quantity') {
                        val += Number(getRowValue(row, COL.QUANTITY) || 0);
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
                grid grid-cols-4 gap-1.5 pb-1
                sm:grid-cols-4 sm:gap-2.5
                lg:grid-cols-4 lg:gap-4
                xl:grid-cols-5 kpi-grid-for-export
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
                        // DTQD: target from warehouse summary — áp dụng cùng định dạng "Mục tiêu +
                        // chênh lệch màu" như thẻ HQQĐ/TRẢ CHẬM, nhưng hiện SỐ TIỀN còn thiếu/đã
                        // vượt (không phải %, vì đây là thẻ tiền tệ, khác HQQĐ/TRẢ CHẬM vốn là %).
                        const dailyRevTarget = revenueTarget > 0 ? revenueTarget / daysInMonth : 0;
                        const activeTarget = isLuyKe ? revenueTarget : dailyRevTarget;
                        const pctHT = activeTarget > 0 ? (rawValue / activeTarget) * 100 : 0;
                        finalTrendLabel = activeTarget > 0 ? "Mục tiêu" : "Tar";
                        isGood = pctHT >= 100;
                        progressPercent = pctHT;
                        const gapValue = rawValue - activeTarget;
                        finalTrendValue = revenueTarget > 0
                            ? <span className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 leading-none">
                                <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(activeTarget)}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                                    isGood
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                                }`}>
                                    {formatCurrencyDiff(gapValue)}
                                </span>
                            </span>
                            : <span className="cursor-pointer text-slate-400 hover:text-sky-500 italic text-[11px] transition-colors">Nhấp để cài đặt</span>;
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
                                <span className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 leading-none">
                                    <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{hieuQuaTarget}%</span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                                        isGood
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                                    }`}>
                                        {formatPercentDiff(gap)}
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
                                <span className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 leading-none">
                                    <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{traGopTarget}%</span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                                        isGood
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                                    }`}>
                                        {formatPercentDiff(gap)}
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
                        ? <span className="flex items-center gap-1.5 leading-none">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formattedActive}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                                isGood
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                            }`}>
                                {pctHT.toFixed(0)}%
                            </span>
                          </span>
                        : <span className="text-slate-400 italic text-[11px]">Chưa cài đặt</span>;
                }
 
                // "Doanh Thu Thực" — allow entering/editing target (metric can be 'totalRevenue' or 'doanhThuThuc')
                const isDTThucCard = config.metric === 'totalRevenue' || config.metric === 'doanhThuThuc';
                if (isDTThucCard) {
                    const monthlyTarget = dtThucTarget;
                    const dailyDTThuc = monthlyTarget > 0 ? monthlyTarget / daysInMonth : 0;
                    const activeTarget = isLuyKe ? monthlyTarget : dailyDTThuc;
                    const pct = activeTarget > 0 ? (rawValue / activeTarget) * 100 : 0;
                    finalTrendLabel = activeTarget > 0 ? "Mục tiêu" : "Tar";

                    isGood = pct >= 100;
                    progressPercent = pct;
                    const gapValue = rawValue - activeTarget;

                    finalTrendValue = monthlyTarget > 0
                        ? <span className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 leading-none">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(activeTarget)}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                                isGood
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                            }`}>
                                {formatCurrencyDiff(gapValue)}
                            </span>
                        </span>
                        : <span className="cursor-pointer text-slate-400 hover:text-sky-500 italic text-[11px] transition-colors">Chưa cài đặt</span>;
                }
 
                // "DT Chưa Xuất" — show unshipped order count with badge in one row
                if (isSpecialUnshipped) {
                    const unshippedCount = processedData?.unshippedOrders?.length || 0;
                    finalTrendLabel = "Lưu ý";
                    isGood = unshippedCount === 0;
                    progressPercent = unshippedCount > 0 ? Math.min((unshippedCount / 20) * 100, 100) : 0;
                    if (unshippedCount > 0) {
                        finalTrendValue = (
                            <span className="flex items-center gap-1.5 leading-none">
                                <span className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">Còn {unshippedCount} đơn</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40 shrink-0">
                                    Chờ xuất
                                </span>
                            </span>
                        );
                    } else {
                        finalTrendValue = (
                            <span className="flex items-center gap-1.5 leading-none">
                                <span className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">0 đơn</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 shrink-0">
                                    Đã hết
                                </span>
                            </span>
                        );
                    }
                }

                // Color mappings based on 'isGood' and icon color
                let valueColor = 'text-slate-800 dark:text-slate-200';
                if ((config.hasTarget && config.targetType !== 'none') || (isDTThucCard && dtThucTarget > 0)) {
                    // "Chưa đạt mục tiêu" dùng đúng màu định danh riêng của thẻ (thay vì amber chung cho mọi thẻ)
                    // để tránh 2 thẻ khác màu (vd. HQQĐ=slate, TRẢ CHẬM=amber) hiển thị con số trùng màu khi cùng dưới target.
                    valueColor = isGood ? 'text-emerald-700 dark:text-emerald-400' : iconColorToTextClass(config.iconColor);
                    if (config.metric === 'doanhThuQD') valueColor = 'text-sky-700 dark:text-sky-400';
                } else if (isSpecialUnshipped) {
                    valueColor = rawValue > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500';
                } else {
                    valueColor = iconColorToTextClass(config.iconColor);
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
                            isGood={isGood}
                        >
                            {config.format === 'currency' ? (
                                (() => {
                                    const { val, unit } = splitCurrencyValue(displayValue);
                                    return (
                                        <div className="flex items-baseline justify-center gap-1 flex-nowrap overflow-hidden w-full">
                                            <span className={`text-[26px] sm:text-[30px] lg:text-[38px] xl:text-[44px] 2xl:text-[48px] font-black leading-none tracking-tight tabular-nums shrink-0 ${valueColor}`}>
                                                {val}
                                            </span>
                                            {unit && (
                                                <span className="text-[13px] sm:text-[15px] lg:text-[18px] xl:text-[20px] font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
                                                    {unit}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : config.format === 'percentage' ? (
                                (() => {
                                    const pctVal = displayValue.endsWith('%') ? displayValue.slice(0, -1) : displayValue;
                                    return (
                                        <div className="flex items-baseline justify-center gap-0.5 flex-nowrap overflow-hidden w-full">
                                            <span className={`text-[26px] sm:text-[30px] lg:text-[38px] xl:text-[44px] 2xl:text-[48px] font-black leading-none tracking-tight tabular-nums shrink-0 ${valueColor}`}>
                                                {pctVal}
                                            </span>
                                            <span className="text-[13px] sm:text-[15px] lg:text-[18px] xl:text-[20px] font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
                                                %
                                            </span>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className={`w-full text-center text-[26px] sm:text-[30px] lg:text-[38px] xl:text-[44px] 2xl:text-[48px] font-black leading-none tracking-tight tabular-nums ${valueColor}`}>
                                    {displayValue}
                                </div>
                            )}
                        </KpiCard>
                    </div>
                );
            })}
        </div>
        </div>
    );
});
KpiCardsInner.displayName = 'KpiCardsInner';

const KpiCards: React.FC<KpiCardsProps> = React.memo(({ onUnshippedClick }) => {
    const {
        processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets, kpiCardsConfig,
        warehouseFilteredData, isLuyKe, handleLuyKeChange, productConfig, warehouseDTThucTargets,
        setEditingTargetKho, uniqueFilterOptions
    } = useDashboardContext();

    return (
        <KpiCardsInner
            onUnshippedClick={onUnshippedClick}
            processedData={processedData}
            filterState={filterState}
            warehouseTargets={warehouseTargets}
            kpiTargets={kpiTargets}
            updateKpiTargets={updateKpiTargets}
            kpiCardsConfig={kpiCardsConfig}
            warehouseFilteredData={warehouseFilteredData}
            isLuyKe={isLuyKe}
            handleLuyKeChange={handleLuyKeChange}
            productConfig={productConfig}
            warehouseDTThucTargets={warehouseDTThucTargets}
            setEditingTargetKho={setEditingTargetKho}
            uniqueFilterOptions={uniqueFilterOptions}
        />
    );
});
KpiCards.displayName = 'KpiCards';

export default React.memo(KpiCards);

