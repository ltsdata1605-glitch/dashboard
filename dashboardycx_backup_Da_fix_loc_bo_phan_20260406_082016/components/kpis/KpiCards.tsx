
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
    const colorMap: Record<string, { icon: string, border: string }> = {
        blue: { 
            icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', 
            border: 'border-blue-200 dark:border-blue-500/30' 
        },
        teal: { 
            icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', 
            border: 'border-emerald-200 dark:border-emerald-500/30' 
        },
        pink: { 
            icon: 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400', 
            border: 'border-pink-200 dark:border-pink-500/30' 
        },
        red: { 
            icon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', 
            border: 'border-rose-200 dark:border-rose-500/30' 
        },
    };

    const style = colorMap[iconColor] || colorMap['blue'];

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col justify-between h-full bg-white dark:bg-[#1c1c1e] p-4 rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border-2 ${style.border} transition-all duration-300 group ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 pr-2 mt-1">{title}</h3>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.icon} shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                    <Icon name={icon} size={4} />
                </div>
            </div>

            <div className="flex flex-col mt-auto">
                <div className="flex flex-col">
                    {children}
                </div>

                {(trendLabel || trendValue) && (
                    <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{trendLabel}</span>
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 text-right shrink-0">
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
    const { processedData, filterState, warehouseTargets, kpiTargets, updateKpiTargets } = useDashboardContext();
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

    if (!kpis) {
        return null;
    }

    const hieuQuaValue = kpis.hieuQuaQD * 100;
    const isHieuQuaGood = hieuQuaValue >= hieuQuaTarget;
    const isTraGopGood = kpis.traGopPercent >= traGopTarget;
    const isGtdhGood = gtdhTarget >= 1;
    
    // Revenue Target Logic
    const revenuePercentHT = revenueTarget > 0 ? (kpis.doanhThuQD / revenueTarget) * 100 : 0;
    const isRevenueGood = revenuePercentHT >= 100;

    return (
        <div className="grid grid-cols-4 gap-4 mb-6 kpi-grid-for-export">
            
            <KpiCard 
                icon="wallet-cards" 
                iconColor="blue" 
                title="Doanh Thu QĐ"
                // No click handler for editing here, handled in Warehouse Summary
                trendLabel={revenueTarget > 0 ? "%HT" : "Target"}
                trendValue={
                    revenueTarget > 0 
                    ? <span className={isRevenueGood ? 'text-blue-600' : 'text-slate-500'}>
                        {formatCurrency(revenueTarget)} / {revenuePercentHT.toFixed(0)}%
                      </span> 
                    : <span className="text-slate-400 italic text-[10px]">Chưa có Target</span>
                }
            >
                <div className="text-[22px] font-extrabold text-blue-700 dark:text-blue-400 leading-none tracking-tight">
                    {formatCurrency(kpis.doanhThuQD)}
                </div>
            </KpiCard>
            
            {/* CARD 2: HIỆU QUẢ QUY ĐỔI */}
            <KpiCard 
                icon="trending-up" 
                iconColor="teal" 
                title="Hiệu Quả QĐ"
                onClick={(e) => startEditing(e, 'hieuQua')}
                trendLabel="Mục tiêu"
                trendValue={editingState.field === 'hieuQua' ? (
                    <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />
                ) : `${hieuQuaTarget}%`}
            >
                <div className={`text-[22px] font-extrabold leading-none tracking-tight ${isHieuQuaGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                    {hieuQuaValue.toFixed(1)}%
                </div>
            </KpiCard>

            <KpiCard 
                icon="receipt" 
                iconColor="pink" 
                title="Tỷ Lệ Trả Góp"
                onClick={(e) => startEditing(e, 'traGop')}
                trendLabel="Mục tiêu"
                trendValue={editingState.field === 'traGop' ? (
                    <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />
                ) : `${traGopTarget}%`}
            >
                <div className={`text-[22px] font-extrabold leading-none tracking-tight ${isTraGopGood ? 'text-pink-700 dark:text-pink-400' : 'text-amber-600'}`}>
                    {kpis.traGopPercent.toFixed(1)}%
                </div>
            </KpiCard>
            
            
            {/* CARD 5: DOANH THU CHỜ XUẤT */}
            <KpiCard 
                icon="archive-restore" 
                iconColor="red" 
                title="DT Chờ Xuất" 
                onClick={onUnshippedClick}
                trendLabel="Thực tế"
                trendValue={formatCurrency(kpis.doanhThuThucChoXuat)}
            >
                <div className="text-[22px] font-extrabold text-rose-700 dark:text-rose-400 leading-none tracking-tight">
                    {formatCurrency(kpis.doanhThuQDChoXuat)}
                </div>
            </KpiCard>
        </div>
    );
};

export default KpiCards;
