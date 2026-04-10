
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
            className={`relative flex flex-col justify-between h-full bg-white dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.06] transition-all duration-300 group ${style.borderHover} ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : 'hover:shadow-lg'}`}
        >
            {/* Gradient accent strip */}
            <div className={`h-[3px] w-full bg-gradient-to-r ${style.gradient}`} />

            <div className="px-4 py-3.5 flex flex-col flex-1">
                {/* Header: Icon + Title */}
                <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${style.iconBg} ${style.iconText} shadow-sm ${style.glowColor} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                        <Icon name={icon} size={4.5} />
                    </div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight">{title}</h3>
                </div>

                {/* Value */}
                <div className="mt-auto">
                    <div className="flex flex-col">
                        {children}
                    </div>

                    {/* Progress bar — always uses the card's own gradient color */}
                    {clampedProgress !== undefined && (
                        <div className="mt-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Tiến độ</span>
                                <span className={`text-[11px] font-bold ${style.iconText}`}>
                                    {Math.round(clampedProgress)}%
                                </span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${style.progressBg} overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full ${style.progressFill} transition-all duration-700 ease-out`}
                                    style={{ width: `${clampedProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Trend / Target footer */}
                    {(trendLabel || trendValue) && (
                        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.04]">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">{trendLabel}</span>
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 text-right shrink-0">
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
    const { processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets, kpiCardsConfig, warehouseFilteredData } = useDashboardContext();
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

    if (!kpis || !kpiCardsConfig) {
        return null;
    }

    const revenuePercentHT = revenueTarget > 0 ? (kpis.doanhThuQD / revenueTarget) * 100 : 0;
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
                let val = 0;
                for (const row of warehouseFilteredData) {
                    const hsx = String(row['Hãng'] || row['Hãng SX'] || '');
                    if (filters.selectedManufacturers && filters.selectedManufacturers.length > 0 && !filters.selectedManufacturers.includes(hsx)) continue;

                    const nganh = String(row['Ngành Hàng'] || row['Ngành hàng'] || row['Nganh Hang'] || '');
                    if (filters.selectedIndustries && filters.selectedIndustries.length > 0 && !filters.selectedIndustries.includes(nganh)) continue;

                    const nhom = String(row['Nhóm Hàng'] || row['Nhóm hàng'] || row['Nhom Hang'] || '');
                    if (filters.selectedSubgroups && filters.selectedSubgroups.length > 0 && !filters.selectedSubgroups.includes(nhom)) continue;

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
    }, [kpiCardsConfig, kpis, warehouseFilteredData]);

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 kpi-grid-for-export`}>
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
                    if (config.targetRef === 'hieuQua') {
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
                    } else if (config.metric === 'doanhThuQD') {
                        // Custom logic for DTQD revenue global target
                        finalTrendLabel = revenueTarget > 0 ? "%HT" : "Target";
                        isGood = revenuePercentHT >= 100;
                        progressPercent = revenuePercentHT;
                        finalTrendValue = revenueTarget > 0
                            ? <span className={isGood ? 'text-blue-600' : 'text-slate-500'}>
                                {formatCurrency(revenueTarget)} / {revenuePercentHT.toFixed(0)}%
                            </span>
                            : <span className="text-slate-400 italic text-[10px]">Chưa có</span>;
                    }
                } else if (config.hasTarget && config.targetType === 'custom') {
                    finalTrendLabel = "Target";
                    finalTrendValue = config.customTargetValue?.toString() || '0';
                    isGood = rawValue >= (config.customTargetValue || 0);
                    progressPercent = (config.customTargetValue || 0) > 0 ? (rawValue / (config.customTargetValue || 1)) * 100 : 0;
                }

                // "Doanh Thu Thực" — allow entering/editing target (metric can be 'totalRevenue' or 'doanhThuThuc')
                const isDTThucCard = config.metric === 'totalRevenue' || config.metric === 'doanhThuThuc';
                if (isDTThucCard) {
                    editableField = 'doanhThuThuc';
                    finalTrendLabel = "Mục tiêu";
                    if (editingState.field === 'doanhThuThuc') {
                        finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} suffix="Tr" />;
                    } else {
                        finalTrendValue = doanhThuThucTarget > 0
                            ? <span className="cursor-pointer hover:text-blue-500 transition-colors">{formatCurrency(doanhThuThucTarget * 1000000)}</span>
                            : <span className="cursor-pointer text-slate-400 hover:text-blue-500 italic text-[10px] transition-colors">Nhấp để nhập</span>;
                    }
                    if (doanhThuThucTarget > 0) {
                        const doanhThuThucPercent = (rawValue / (doanhThuThucTarget * 1000000)) * 100;
                        isGood = doanhThuThucPercent >= 100;
                        progressPercent = doanhThuThucPercent;
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
                if ((config.hasTarget && config.targetType !== 'none') || (isDTThucCard && doanhThuThucTarget > 0)) {
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

                const handleClick = (e: React.MouseEvent) => {
                    if (isSpecialUnshipped) {
                        onUnshippedClick();
                    } else if (editableField) {
                        startEditing(e, editableField);
                    }
                };

                const isClickable = isSpecialUnshipped || !!editableField;

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
                        <div className={`text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight ${valueColor}`}>
                            {displayValue}
                        </div>
                    </KpiCard>
                );
            })}
        </div>
    );
};

export default KpiCards;

