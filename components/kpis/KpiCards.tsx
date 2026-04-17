
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { saveKpiTargets, getKpiTargets } from '../../services/dbService';

interface KpiCardsProps {
    onUnshippedClick: () => void;
}

// Premium KPI Card — Modern Executive Dashboard Design
const KpiCard: React.FC<{
    icon: string;
    iconColor: string;
    title: string;
    onClick?: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    trendLabel?: string;
    trendValue?: string | React.ReactNode;
    progressPercent?: number; // 0-100, shows progress bar when provided
    isGood?: boolean;
}> = ({ icon, iconColor, title, onClick, children, trendLabel, trendValue, progressPercent, isGood = true }) => {
    const isClickable = !!onClick;

    const colorMap: Record<string, {
        gradient: string,
        iconBg: string,
        iconText: string,
        progressBg: string,
        progressFill: string,
        glowColor: string,
        borderHover: string
    }> = {
        blue: {
            gradient: 'from-blue-500 via-blue-400 to-sky-400',
            iconBg: 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-500/15 dark:to-sky-500/10',
            iconText: 'text-blue-600 dark:text-blue-400',
            progressBg: 'bg-blue-100 dark:bg-blue-500/10',
            progressFill: 'bg-gradient-to-r from-blue-500 to-sky-400',
            glowColor: 'shadow-blue-200/50 dark:shadow-blue-500/20',
            borderHover: 'hover:border-blue-300 dark:hover:border-blue-600'
        },
        teal: {
            gradient: 'from-emerald-500 via-emerald-400 to-teal-400',
            iconBg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10',
            iconText: 'text-emerald-600 dark:text-emerald-400',
            progressBg: 'bg-emerald-100 dark:bg-emerald-500/10',
            progressFill: 'bg-gradient-to-r from-emerald-500 to-teal-400',
            glowColor: 'shadow-emerald-200/50 dark:shadow-emerald-500/20',
            borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-600'
        },
        emerald: {
            gradient: 'from-emerald-500 via-emerald-400 to-green-400',
            iconBg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/15 dark:to-green-500/10',
            iconText: 'text-emerald-600 dark:text-emerald-400',
            progressBg: 'bg-emerald-100 dark:bg-emerald-500/10',
            progressFill: 'bg-gradient-to-r from-emerald-500 to-green-400',
            glowColor: 'shadow-emerald-200/50 dark:shadow-emerald-500/20',
            borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-600'
        },
        pink: {
            gradient: 'from-pink-500 via-pink-400 to-rose-400',
            iconBg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-500/15 dark:to-rose-500/10',
            iconText: 'text-pink-600 dark:text-pink-400',
            progressBg: 'bg-pink-100 dark:bg-pink-500/10',
            progressFill: 'bg-gradient-to-r from-pink-500 to-rose-400',
            glowColor: 'shadow-pink-200/50 dark:shadow-pink-500/20',
            borderHover: 'hover:border-pink-300 dark:hover:border-pink-600'
        },
        red: {
            gradient: 'from-rose-500 via-rose-400 to-red-400',
            iconBg: 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/10',
            iconText: 'text-rose-600 dark:text-rose-400',
            progressBg: 'bg-rose-100 dark:bg-rose-500/10',
            progressFill: 'bg-gradient-to-r from-rose-500 to-red-400',
            glowColor: 'shadow-rose-200/50 dark:shadow-rose-500/20',
            borderHover: 'hover:border-rose-300 dark:hover:border-rose-600'
        },
        rose: {
            gradient: 'from-rose-500 via-rose-400 to-orange-400',
            iconBg: 'bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/15 dark:to-orange-500/10',
            iconText: 'text-rose-600 dark:text-rose-400',
            progressBg: 'bg-rose-100 dark:bg-rose-500/10',
            progressFill: 'bg-gradient-to-r from-rose-500 to-orange-400',
            glowColor: 'shadow-rose-200/50 dark:shadow-rose-500/20',
            borderHover: 'hover:border-rose-300 dark:hover:border-rose-600'
        },
        purple: {
            gradient: 'from-indigo-500 via-violet-400 to-purple-400',
            iconBg: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/15 dark:to-violet-500/10',
            iconText: 'text-indigo-600 dark:text-indigo-400',
            progressBg: 'bg-indigo-100 dark:bg-indigo-500/10',
            progressFill: 'bg-gradient-to-r from-indigo-500 to-violet-400',
            glowColor: 'shadow-indigo-200/50 dark:shadow-indigo-500/20',
            borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-600'
        },
        orange: {
            gradient: 'from-orange-500 via-orange-400 to-amber-400',
            iconBg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/10',
            iconText: 'text-orange-600 dark:text-orange-400',
            progressBg: 'bg-orange-100 dark:bg-orange-500/10',
            progressFill: 'bg-gradient-to-r from-orange-500 to-amber-400',
            glowColor: 'shadow-orange-200/50 dark:shadow-orange-500/20',
            borderHover: 'hover:border-orange-300 dark:hover:border-orange-600'
        },
        amber: {
            gradient: 'from-amber-500 via-amber-400 to-yellow-400',
            iconBg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/10',
            iconText: 'text-amber-600 dark:text-amber-400',
            progressBg: 'bg-amber-100 dark:bg-amber-500/10',
            progressFill: 'bg-gradient-to-r from-amber-500 to-yellow-400',
            glowColor: 'shadow-amber-200/50 dark:shadow-amber-500/20',
            borderHover: 'hover:border-amber-300 dark:hover:border-amber-600'
        },
    };

    const style = colorMap[iconColor] || colorMap['blue'];
    const clampedProgress = progressPercent !== undefined ? Math.min(Math.max(progressPercent, 0), 100) : undefined;

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col justify-between h-full bg-white dark:bg-[#1c1c1e] rounded-xl lg:rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.06] transition-all duration-300 group touch-feedback ${style.borderHover} ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]' : 'hover:shadow-lg'} premium-card-shadow`}
        >
            {/* Gradient accent strip */}
            <div className={`h-[3px] lg:h-[3px] w-full bg-gradient-to-r rounded-t-xl lg:rounded-t-2xl ${style.gradient}`} />

            <div className="px-2.5 py-2 lg:px-4 lg:py-3.5 flex flex-col flex-1">
                {/* Header: Icon + Title */}
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1.5 lg:mb-3">
                    <div className={`w-7 h-7 lg:w-9 lg:h-9 rounded-lg lg:rounded-lg flex items-center justify-center ${style.iconBg} ${style.iconText} shadow-sm ${style.glowColor} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${isGood && clampedProgress !== undefined && clampedProgress >= 100 ? 'animate-pulse-glow-green' : ''}`}>
                        <Icon name={icon} size={3} className="lg:hidden" />
                        <Icon name={icon} size={4.5} className="hidden lg:block" />
                    </div>
                    <h3 className="text-[9px] lg:text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight line-clamp-2">{title}</h3>
                </div>

                {/* Value */}
                <div className="mt-auto">
                    <div className="flex flex-col">
                        {children}
                    </div>

                    {/* Progress bar — always uses the card's own gradient color */}
                    {clampedProgress !== undefined && (
                        <div className="mt-1.5 lg:mt-2">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] lg:text-[10px] font-semibold text-slate-400 dark:text-slate-500">Tiến độ</span>
                                <span className={`text-[9px] lg:text-[11px] font-bold ${style.iconText}`}>
                                    {Math.round(clampedProgress)}%
                                </span>
                            </div>
                            <div className={`w-full h-1.5 lg:h-2 rounded-full ${style.progressBg} overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full ${style.progressFill} transition-all duration-700 ease-out progress-shimmer`}
                                    style={{ width: `${clampedProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Trend / Target footer */}
                    {(trendLabel || trendValue) && (
                        <div className="flex items-center justify-between gap-1 lg:gap-1.5 mt-1.5 lg:mt-2 pt-1.5 lg:pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                            <span className="text-[8px] lg:text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider truncate">{trendLabel}</span>
                            <div className="text-[9px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400 text-right shrink-0">
                                {trendValue}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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
                className="w-16 px-1.5 py-0.5 text-center text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {suffix && <span className="text-[10px] font-bold text-slate-500">{suffix}</span>}
        </div>
    );
};

type EditableField = 'hieuQua' | 'traGop' | 'gtdh' | 'doanhThuThuc' | null;

const KpiCards: React.FC<KpiCardsProps> = ({ onUnshippedClick }) => {
    const { processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets, kpiCardsConfig, warehouseFilteredData, isLuyKe, handleLuyKeChange, productConfig, warehouseDTThucTargets } = useDashboardContext();
    const kpis = processedData?.kpis;

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

    if (!kpis || !kpiCardsConfig) {
        return null;
    }


    const visibleCards = kpiCardsConfig
        .filter(c => c.isVisible && c.id !== 'kpi-runrate' && c.id !== 'kpi-crosssell')
        .sort((a, b) => a.order - b.order);

    const computedValues = useMemo(() => {
        const values: Record<string, number> = {};

        // Pass 1: Metric & Data
        kpiCardsConfig.forEach(config => {
            if (!config.type || config.type === 'metric') {
                let raw = kpis ? (kpis as any)[config.metric as string] || 0 : 0;
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
                    const hsx = String(row['Hãng'] || row['Hãng SX'] || '').trim().toLowerCase();
                    if (filterHsx.length > 0 && !filterHsx.includes(hsx)) continue;

                    const rawNhom = String(row['Nhóm Hàng'] || row['Nhóm hàng'] || row['Nhom Hang'] || '').trim();
                    
                    const nganhMapValue = String(childToParentMap[rawNhom] || row['Ngành Hàng'] || row['Ngành hàng'] || row['Nganh Hang'] || '').trim().toLowerCase();
                    if (filterNganh.length > 0 && !filterNganh.includes(nganhMapValue)) continue;

                    const nhomMapValue = String(childToSubgroupMap[rawNhom] || rawNhom).trim().toLowerCase();
                    if (filterNhom.length > 0 && !filterNhom.includes(nhomMapValue)) continue;

                    if (filters.metricType === 'quantity') {
                        val += Number(row['Số Lượng'] || row['Số lượng'] || 0);
                    } else if (filters.metricType === 'revenueQD') {
                        val += Number(row['Doanh Thu QĐ'] || row['Doanh Thu QD'] || row['Doanh thu QĐ'] || 0);
                    } else { // revenue
                        val += Number(row['Doanh Thu Thực'] || row['Doanh Thu Thuc'] || row['Doanh thu thực'] || 0);
                    }
                }
                values[config.id] = val;
            }
        });

        // Pass 2: Calculated
        kpiCardsConfig.forEach(config => {
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

    return (
        <div>
            {/* Lũy kế toggle */}
            <div className="flex items-center justify-end mb-3 hide-on-export">
                <label className="flex items-center gap-2 cursor-pointer select-none group bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700/50 transition-all hover:border-indigo-300 dark:hover:border-indigo-600">
                    <Icon name="layers" size={3.5} className="text-slate-400 dark:text-slate-500" />
                    <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${isLuyKe ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        onClick={() => handleLuyKeChange(!isLuyKe)}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isLuyKe ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        Lũy kế
                    </span>
                </label>
            </div>
            <div className={`
                grid grid-cols-2 gap-2 pb-1
                md:grid-cols-3 md:gap-3
                xl:grid-cols-5 md:gap-4 mb-3 lg:mb-8 kpi-grid-for-export
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
                        finalTrendLabel = activeTarget > 0 ? (isLuyKe ? "Lũy kế" : "Mục tiêu ngày") : "Mục tiêu";
                        isGood = pctHT >= 100;
                        progressPercent = pctHT;
                        finalTrendValue = revenueTarget > 0
                            ? <span className="cursor-pointer hover:text-blue-500 transition-colors flex flex-col items-end leading-tight">
                                <span>{formatCurrency(activeTarget)} / {pctHT.toFixed(0)}%</span>
                                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{isLuyKe ? `Ngày: ${formatCurrency(dailyRevTarget)}` : `Tháng: ${formatCurrency(revenueTarget)}`}</span>
                            </span>
                            : <span className="cursor-pointer text-slate-400 hover:text-blue-500 italic text-[10px] transition-colors">Nhấp để cài đặt</span>;
                    } else if (config.targetRef === 'hieuQua') {
                        finalTrendLabel = "Mục tiêu";
                        editableField = 'hieuQua';
                        if (editingState.field === 'hieuQua') {
                            finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />;
                        } else {
                            finalTrendValue = <span className="cursor-pointer hover:text-blue-500 transition-colors">{hieuQuaTarget}%</span>;
                        }
                        isGood = rawValue >= hieuQuaTarget;
                        progressPercent = hieuQuaTarget > 0 ? (rawValue / hieuQuaTarget) * 100 : 0;
                    } else if (config.targetRef === 'traGop') {
                        finalTrendLabel = "Mục tiêu";
                        editableField = 'traGop';
                        if (editingState.field === 'traGop') {
                            finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />;
                        } else {
                            finalTrendValue = <span className="cursor-pointer hover:text-blue-500 transition-colors">{traGopTarget}%</span>;
                        }
                        isGood = rawValue >= traGopTarget;
                        progressPercent = traGopTarget > 0 ? (rawValue / traGopTarget) * 100 : 0;
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
                    finalTrendLabel = activeTarget > 0 ? (isLuyKe ? "Lũy kế" : "Mục tiêu ngày") : "Mục tiêu";
                    
                    finalTrendValue = monthlyTarget > 0
                        ? <span className="cursor-pointer hover:text-blue-500 transition-colors flex flex-col items-end leading-tight">
                            <span>{formatCurrency(activeTarget)}</span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{isLuyKe ? `Ngày: ${formatCurrency(dailyDTThuc)}` : `Tháng: ${formatCurrency(monthlyTarget)}`}</span>
                        </span>
                        : <span className="cursor-pointer text-slate-400 hover:text-blue-500 italic text-[10px] transition-colors">Chưa cài đặt</span>;
                        
                    if (monthlyTarget > 0) {
                        const pct = activeTarget > 0 ? (rawValue / activeTarget) * 100 : 0;
                        isGood = pct >= 100;
                        progressPercent = pct;
                    }
                }

                // "DT Chưa Xuất" — show unshipped order count with progress bar
                if (isSpecialUnshipped) {
                    const unshippedCount = processedData?.unshippedOrders?.length || 0;
                    finalTrendLabel = "⚠ Cảnh báo";
                    isGood = unshippedCount === 0;
                    // Progress bar: visually show urgency (cap at 20 orders = 100%)
                    progressPercent = unshippedCount > 0 ? Math.min((unshippedCount / 20) * 100, 100) : 0;
                    if (unshippedCount > 0) {
                        finalTrendValue = (
                            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <Icon name="alert-triangle" size={3.5} />
                                {unshippedCount} đơn chờ xuất
                            </span>
                        );
                    } else {
                        finalTrendValue = <span className="text-emerald-600 dark:text-emerald-400">Không có đơn chờ</span>;
                    }
                }

                // Color mappings based on 'isGood' and icon color
                let valueColor = 'text-slate-800 dark:text-slate-200';
                if ((config.hasTarget && config.targetType !== 'none') || (isDTThucCard && dtThucTarget > 0)) {
                    valueColor = isGood ? `text-emerald-600 dark:text-emerald-400` : 'text-amber-600 dark:text-amber-400';
                    if (config.metric === 'doanhThuQD') valueColor = 'text-blue-600 dark:text-blue-400';
                } else if (isSpecialUnshipped) {
                    valueColor = rawValue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500';
                } else {
                    if (config.iconColor === 'blue') valueColor = 'text-blue-600 dark:text-blue-400';
                    else if (config.iconColor === 'emerald') valueColor = 'text-emerald-600 dark:text-emerald-400';
                    else if (config.iconColor === 'pink') valueColor = 'text-pink-600 dark:text-pink-400';
                    else if (config.iconColor === 'orange') valueColor = 'text-orange-600 dark:text-orange-400';
                    else if (config.iconColor === 'purple' || config.iconColor === 'violet') valueColor = 'text-indigo-600 dark:text-indigo-400';
                    else if (config.iconColor === 'red' || config.iconColor === 'rose') valueColor = 'text-rose-600 dark:text-rose-400';
                    else if (config.iconColor === 'amber') valueColor = 'text-amber-600 dark:text-amber-400';
                }

                const isDTQDCard = config.metric === 'doanhThuQD';

                const handleClick = (e: React.MouseEvent) => {
                    if (isSpecialUnshipped) {
                        onUnshippedClick();
                    } else if (isDTQDCard || isDTThucCard) {
                        // Scroll to warehouse summary where users can set per-kho targets
                        const warehouseEl = document.getElementById('warehouse-summary-view');
                        if (warehouseEl) {
                            warehouseEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Flash highlight
                            warehouseEl.classList.add('ring-2', 'ring-blue-500/50');
                            setTimeout(() => warehouseEl.classList.remove('ring-2', 'ring-blue-500/50'), 2000);
                        }
                    } else if (editableField) {
                        startEditing(e, editableField);
                    }
                };

                const isClickable = isSpecialUnshipped || isDTQDCard || isDTThucCard || !!editableField;

                return (
                    <KpiCard
                        key={config.id}
                        icon={config.icon}
                        iconColor={config.iconColor}
                        title={config.title}
                        onClick={isClickable ? handleClick : undefined}
                        trendLabel={finalTrendLabel}
                        trendValue={finalTrendValue}
                        progressPercent={progressPercent}
                        isGood={isGood}
                    >
                        <div className={`text-[19px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight ${valueColor}`}>
                            {displayValue}
                        </div>
                    </KpiCard>
                );
            })}
        </div>
        </div>
    );
};

export default KpiCards;

