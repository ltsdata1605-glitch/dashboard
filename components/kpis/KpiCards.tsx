
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { saveKpiTargets, getKpiTargets } from '../../services/dbService';

interface KpiCardsProps {
    onUnshippedClick: () => void;
}

// Compact Horizontal Card with Apple Bento Style
// Updates: Added min-w-0, shrink-0, whitespace-nowrap to prevent layout shifts during export
const KpiCard: React.FC<{
    icon: string;
    iconColor: string;
    title: string;
    onClick?: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    trendLabel?: string;
    trendValue?: string | React.ReactNode;
}> = ({ icon, iconColor, title, onClick, children, trendLabel, trendValue }) => {
    const isClickable = !!onClick;
    
    // Apple-style vivid and deep pastel colors
    const colorMap: Record<string, { icon: string, bg: string, ring: string, textAccent: string }> = {
        blue: { 
            icon: 'bg-blue-500 text-white shadow-md shadow-blue-500/30 dark:shadow-none', 
            bg: 'bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-900/10',
            ring: 'ring-1 ring-blue-100/50 dark:ring-blue-500/20',
            textAccent: 'text-blue-600 dark:text-blue-400'
        },
        teal: { 
            icon: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 dark:shadow-none', 
            bg: 'bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-900/10',
            ring: 'ring-1 ring-emerald-100/50 dark:ring-emerald-500/20',
            textAccent: 'text-emerald-600 dark:text-emerald-400'
        },
        pink: { 
            icon: 'bg-pink-500 text-white shadow-md shadow-pink-500/30 dark:shadow-none', 
            bg: 'bg-gradient-to-br from-white to-pink-50/50 dark:from-slate-900 dark:to-pink-900/10',
            ring: 'ring-1 ring-pink-100/50 dark:ring-pink-500/20',
            textAccent: 'text-pink-600 dark:text-pink-400'
        },
        red: { 
            icon: 'bg-rose-500 text-white shadow-md shadow-rose-500/30 dark:shadow-none', 
            bg: 'bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-900 dark:to-rose-900/10',
            ring: 'ring-1 ring-rose-100/50 dark:ring-rose-500/20',
            textAccent: 'text-rose-600 dark:text-rose-400'
        },
        purple: { 
            icon: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 dark:shadow-none', 
            bg: 'bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-900/10',
            ring: 'ring-1 ring-indigo-100/50 dark:ring-indigo-500/20',
            textAccent: 'text-indigo-600 dark:text-indigo-400'
        },
        orange: { 
            icon: 'bg-orange-500 text-white shadow-md shadow-orange-500/30 dark:shadow-none', 
            bg: 'bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-900 dark:to-orange-900/10',
            ring: 'ring-1 ring-orange-100/50 dark:ring-orange-500/20',
            textAccent: 'text-orange-600 dark:text-orange-400'
        },
    };

    const style = colorMap[iconColor] || colorMap['blue'];

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col justify-between h-full ${style.bg} p-3.5 rounded-xl shadow-sm ${style.ring} transition-all duration-300 group ${isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:ring-2' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 pr-1.5 mt-0.5 leading-snug">{title}</h3>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.icon} shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                    <Icon name={icon} size={4} />
                </div>
            </div>

            <div className="flex flex-col mt-auto relative z-10">
                <div className="flex flex-col">
                    {children}
                </div>

                {(trendLabel || trendValue) && (
                    <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{trendLabel}</span>
                        <div className={`text-[10px] font-extrabold ${style.textAccent} bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md shrink-0 border border-white/20 dark:border-white/5`}>
                            {trendValue}
                        </div>
                    </div>
                )}
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
                className="w-12 px-1 py-0.5 text-center text-xs font-bold text-slate-900 bg-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {suffix && <span className="text-[10px] font-bold text-slate-500">{suffix}</span>}
        </div>
    );
};

const KpiCards: React.FC<KpiCardsProps> = ({ onUnshippedClick }) => {
    const { processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets, kpiCardsConfig, warehouseFilteredData } = useDashboardContext();
    const kpis = processedData?.kpis;
    
    // targets fallbacks
    const hieuQuaTarget = kpiTargets?.hieuQua ?? 40;
    const traGopTarget = kpiTargets?.traGop ?? 45;
    const gtdhTarget = kpiTargets?.gtdh ?? 1;

    const [editingState, setEditingState] = useState<{ field: 'hieuQua' | 'traGop' | 'gtdh' | null, value: string }>({ field: null, value: '' });

    const startEditing = (e: React.MouseEvent, field: 'hieuQua' | 'traGop' | 'gtdh') => {
        e.preventDefault();
        e.stopPropagation();
        const initialVal = field === 'hieuQua' ? hieuQuaTarget : (field === 'traGop' ? traGopTarget : gtdhTarget);
        setEditingState({ field, value: initialVal.toString() });
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
        .sort((a,b) => a.order - b.order);

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
    
    // Auto-adjust cols depending on length
    const gridCols = visibleCards.length > 6 ? 6 : (visibleCards.length === 5 ? 5 : visibleCards.length);

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-${gridCols} gap-4 mb-6 kpi-grid-for-export`}>
            {visibleCards.map(config => {
                const isSpecialUnshipped = config.metric === 'doanhThuThucChoXuat';
                
                let rawValue = computedValues[config.id] || 0;

                // Determine formatting
                let displayValue = '';
                if (config.format === 'currency') displayValue = formatCurrency(rawValue);
                else if (config.format === 'percentage') displayValue = `${rawValue.toFixed(1)}%`;
                else displayValue = rawValue.toLocaleString('vi-VN');

                // Determine trend & target
                let finalTrendLabel = config.trendLabel || '';
                let finalTrendValue: React.ReactNode = '';
                let isGood = true;

                if (config.hasTarget && config.targetType === 'global') {
                    if (config.targetRef === 'hieuQua') {
                        finalTrendLabel = "Mục tiêu";
                        if (editingState.field === 'hieuQua') {
                            finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />;
                        } else {
                            finalTrendValue = `${hieuQuaTarget}%`;
                        }
                        isGood = rawValue >= hieuQuaTarget;
                    } else if (config.targetRef === 'traGop') {
                        finalTrendLabel = "Mục tiêu";
                        if (editingState.field === 'traGop') {
                            finalTrendValue = <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />;
                        } else {
                            finalTrendValue = `${traGopTarget}%`;
                        }
                        isGood = rawValue >= traGopTarget;
                    } else if (config.metric === 'doanhThuQD') {
                        // Custom logic for DTQD revenue global target
                        finalTrendLabel = revenueTarget > 0 ? "%HT" : "Target";
                        isGood = revenuePercentHT >= 100;
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
                }

                // Color mappings based on 'isGood' and icon color
                let valueColor = 'text-slate-700 dark:text-slate-300';
                if (config.hasTarget && config.targetType !== 'none') {
                    valueColor = isGood ? `text-emerald-700 dark:text-emerald-400` : 'text-amber-600';
                    if (config.metric === 'doanhThuQD') valueColor = 'text-blue-700 dark:text-blue-400';
                } else {
                    if (config.iconColor === 'blue') valueColor = 'text-blue-700 dark:text-blue-400';
                    else if (config.iconColor === 'emerald') valueColor = 'text-emerald-700 dark:text-emerald-400';
                    else if (config.iconColor === 'pink') valueColor = 'text-pink-700 dark:text-pink-400';
                    else if (config.iconColor === 'orange') valueColor = 'text-orange-700 dark:text-orange-400';
                    else if (config.iconColor === 'purple' || config.iconColor === 'violet') valueColor = 'text-indigo-700 dark:text-indigo-400';
                    else if (config.iconColor === 'red' || config.iconColor === 'rose') valueColor = 'text-rose-700 dark:text-rose-400';
                    else if (config.iconColor === 'amber') valueColor = 'text-amber-700 dark:text-amber-400';
                }

                const handleClick = (e: React.MouseEvent) => {
                    if (isSpecialUnshipped) {
                        onUnshippedClick();
                    } else if (config.targetRef === 'hieuQua' || config.targetRef === 'traGop') {
                        startEditing(e, config.targetRef);
                    }
                };
                
                const isClickable = isSpecialUnshipped || config.targetRef === 'hieuQua' || config.targetRef === 'traGop';

                return (
                    <KpiCard 
                        key={config.id}
                        icon={config.icon} 
                        iconColor={config.iconColor} 
                        title={config.title}
                        onClick={isClickable ? handleClick : undefined}
                        trendLabel={finalTrendLabel}
                        trendValue={finalTrendValue}
                    >
                        <div className={`text-2xl sm:text-3xl font-black leading-none tracking-tight ${valueColor} drop-shadow-sm`}>
                            {displayValue}
                        </div>
                    </KpiCard>
                );
            })}
        </div>
    );
};

export default KpiCards;
