import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { parseNumber, roundUp, shortenSupermarketName } from '../../utils/dashboardHelpers';
import {
    resolveDailyTarget,
    resolveRateTarget,
    computeHqqd,
    computeMonthlyTarget,
    computeMonthlyQdPercent,
    percentOf,
    DEFAULT_HQQD_TARGET,
    DEFAULT_TRA_CHAM_TARGET,
    ALL_STORES_KEY,
} from '../../services/kpiOverviewCalc';
import { KpiCard } from '../../../../components/shared/ui/KpiCard';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { parseBaseTargetQuyDoi } from '../../services/employeeParser';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets?: Record<string, number>;
    activeSupermarket: string;
    summaryLuyKeData?: string;
}

type TargetType = 'dtQd' | 'hqqd' | 'traCham';

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket, summaryLuyKeData }) => {

    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const dtDuKien = parseNumber(kpiData.dtDuKien);
    const dtDuKienQD = parseNumber(kpiData.dtDuKienQD);
    const hqqd = computeHqqd(dtlk, dtqd);
    const tyTrongTraGop = parseNumber(kpiData.tyTrongTraGop);

    const safeName = shortenSupermarketName(activeSupermarket);

    // Đồng bộ trực tiếp 2 chiều với TargetHero (Cập nhật > Cấu hình siêu thị chi tiết > Target Doanh thu)
    const [storedTraGop, setStoredTraGop] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-tragop` as db.BIKey) : null, 45);
    const [storedQuyDoi, setStoredQuyDoi] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-quydoi` as db.BIKey) : null, 40);
    const [storedTotalTarget, setStoredTotalTarget] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-total` as db.BIKey) : null, 100);

    // Custom Targets lưu IndexedDB (fallback / manual override)
    const [customDTQDTargets, setCustomDTQDTargets] = useIndexedDBState<Record<string, number>>('custom-dtqd-targets', {});
    const [customHQQDTargets, setCustomHQQDTargets] = useIndexedDBState<Record<string, number>>('custom-hqqd-targets', {});
    const [customTraChamTargets, setCustomTraChamTargets] = useIndexedDBState<Record<string, number>>('custom-tracham-targets', {});

    // Inline Editing State — Chỉnh sửa trực tiếp không cần popup
    const [editingTargetType, setEditingTargetType] = useState<TargetType | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingTargetType && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingTargetType]);

    // --- 1. Target DTQĐ ---
    const totalVuotTroi = resolveDailyTarget(
        activeSupermarket, customDTQDTargets, supermarketDailyTargets,
        () => Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0)
    );

    const htTargetVuotTroi = percentOf(dtqd, totalVuotTroi);

    const renderGrowth = (val: string | undefined) => {
        if (!val || val === 'N/A' || val === '0%') return null;
        const num = parseNumber(val);
        const isPositive = num >= 0;
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold leading-none ${
                isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
            }`}>
                {isPositive ? <ChevronUpIcon className="h-2 w-2" /> : <ChevronDownIcon className="h-2 w-2" />}
                {Math.abs(Math.ceil(num))}%
            </span>
        );
    };

    const totalVuotTroiMonthly = computeMonthlyTarget(isRealtime, activeSupermarket, supermarketMonthlyTargets);

    const htTargetVuotTroiMonthly = computeMonthlyQdPercent(dtDuKienQD, totalVuotTroiMonthly, kpiData.htTargetDuKienQD, dtqd);
    const secondaryPct = isRealtime ? htTargetVuotTroi : htTargetVuotTroiMonthly;
    const secondaryLabel = isRealtime ? 'Target' : 'Mục tiêu tháng';
    const secondaryTargetStr = isRealtime
        ? (totalVuotTroi > 0 ? `${roundUp(totalVuotTroi).toLocaleString('vi-VN')} Tr` : 'Nhấp đặt MT')
        : (totalVuotTroiMonthly > 0 ? `${roundUp(totalVuotTroiMonthly).toLocaleString('vi-VN')} Tr` : undefined);

    // --- 3. Target HQQĐ & TRẢ CHẬM (Đồng bộ tuyệt đối với TargetHero) ---
    const currentQuyDoiTarget = (safeName && storedQuyDoi !== undefined && storedQuyDoi !== null)
        ? storedQuyDoi
        : resolveRateTarget(activeSupermarket, customHQQDTargets, targets.quyDoi, DEFAULT_HQQD_TARGET);

    const currentTraGopTarget = (safeName && storedTraGop !== undefined && storedTraGop !== null)
        ? storedTraGop
        : resolveRateTarget(activeSupermarket, customTraChamTargets, targets.traGop, DEFAULT_TRA_CHAM_TARGET);

    // --- 2. DT THỰC (Không cần target, hiển thị Doanh thu Dự kiến) ---
    const now = new Date();
    const passedDays = Math.max(1, now.getDate() - 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const estimatedDtThucDuKien = dtDuKien > 0
        ? dtDuKien
        : (passedDays > 0 ? Math.round((dtlk / passedDays) * daysInMonth) : dtlk);

    const dtThucDuKienStr = estimatedDtThucDuKien > 0
        ? `${roundUp(estimatedDtThucDuKien).toLocaleString('vi-VN')} Tr`
        : '—';
    const dtqdIsGood = secondaryPct >= 100;
    const hqqdIsGood = hqqd >= currentQuyDoiTarget;
    const traGopIsGood = tyTrongTraGop >= currentTraGopTarget;

    // --- Bắt đầu chỉnh sửa trực tiếp không popup ---
    const startInlineEditing = (type: TargetType) => {
        setEditingTargetType(type);
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let val = '';
        if (type === 'dtQd') {
            const currentVal = isRealtime
                ? (totalVuotTroi > 0 ? totalVuotTroi : (totalVuotTroiMonthly > 0 ? totalVuotTroiMonthly / daysInMonth : 0))
                : (totalVuotTroiMonthly > 0 ? totalVuotTroiMonthly : (totalVuotTroi > 0 ? totalVuotTroi * daysInMonth : 0));
            val = currentVal > 0 ? Math.round(currentVal).toString() : '';
        } else if (type === 'hqqd') {
            val = currentQuyDoiTarget.toString();
        } else if (type === 'traCham') {
            val = currentTraGopTarget.toString();
        }
        setEditingValue(val);
    };

    // --- Lưu mục tiêu khi Enter hoặc Blur ---
    const handleSaveInlineTarget = async () => {
        if (!editingTargetType) return;
        const currentType = editingTargetType;
        const valToSave = editingValue;
        setEditingTargetType(null);

        const parsed = parseFloat(valToSave.replace(/,/g, ''));
        if (isNaN(parsed) || parsed < 0) return;

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        if (currentType === 'dtQd') {
            const monthlyVal = isRealtime ? parsed * daysInMonth : parsed;
            const dailyVal = isRealtime ? parsed : (parsed > 0 ? parsed / daysInMonth : 0);

            // Đồng bộ vào targethero-${safeName}-total (Cấu hình Target DTQĐ)
            const baseMonthTarget = parseBaseTargetQuyDoi(summaryLuyKeData || '', activeSupermarket);
            if (baseMonthTarget > 0 && safeName) {
                const ratio = Math.round((monthlyVal / baseMonthTarget) * 100);
                const clampedRatio = Math.max(0, Math.min(300, ratio));
                setStoredTotalTarget(clampedRatio);
                await db.set(`targethero-${safeName}-total`, clampedRatio);
                window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: `targethero-${safeName}-total` } }));
            } else {
                setCustomDTQDTargets(prev => ({ ...(prev || {}), [activeSupermarket]: dailyVal }));
            }
            // Xoá override riêng để KpiOverview và TargetHero dùng chung 1 nguồn đồng bộ
            setCustomDTQDTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
            toast.success(`Đã đồng bộ Target DTQĐ: ${parsed} Tr`, { icon: '🎯', duration: 2500 });
        } else if (currentType === 'hqqd') {
            // Target Quy đổi: Đồng bộ vào targethero-${safeName}-quydoi
            if (safeName) {
                setStoredQuyDoi(parsed);
                await db.set(`targethero-${safeName}-quydoi`, parsed);
                window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: `targethero-${safeName}-quydoi` } }));
            }
            setCustomHQQDTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
            toast.success(`Đã đồng bộ Target Quy đổi (HQQĐ): ${parsed}%`, { icon: '🎯', duration: 2500 });
        } else if (currentType === 'traCham') {
            // Target Trả chậm: Đồng bộ vào targethero-${safeName}-tragop
            if (safeName) {
                setStoredTraGop(parsed);
                await db.set(`targethero-${safeName}-tragop`, parsed);
                window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: `targethero-${safeName}-tragop` } }));
            }
            setCustomTraChamTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
            toast.success(`Đã đồng bộ Target Trả chậm: ${parsed}%`, { icon: '🎯', duration: 2500 });
        }
    };

    // Component hiển thị ô nhập liệu trực tiếp (inline input)
    const renderInlineInput = (type: TargetType, unit: string, themeColor: 'emerald' | 'sky' | 'indigo' | 'amber') => {
        const borderCls = themeColor === 'emerald' ? 'border-emerald-500 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            : themeColor === 'sky' ? 'border-sky-500 ring-sky-500/20 text-sky-700 dark:text-sky-300'
            : themeColor === 'indigo' ? 'border-indigo-500 ring-indigo-500/20 text-indigo-700 dark:text-indigo-300'
            : 'border-amber-500 ring-amber-500/20 text-amber-700 dark:text-amber-300';
        return (
            <div
                className={`inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-1 py-0.5 rounded-md border ring-2 shadow-xs ${borderCls}`}
                onClick={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveInlineTarget();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingTargetType(null);
                        }
                    }}
                    onBlur={handleSaveInlineTarget}
                    className="w-14 sm:w-16 px-1 py-0.2 text-right font-black text-xs bg-transparent outline-none tabular-nums"
                    placeholder="0"
                />
                <span className="text-[10px] font-bold opacity-60 pr-0.5">{unit}</span>
            </div>
        );
    };

    // Component hiển thị giá trị có thể bấm chỉnh trực tiếp
    const renderTargetDisplay = (type: TargetType, displayVal: string | undefined, themeColor: 'emerald' | 'sky' | 'indigo' | 'amber' | 'rose') => {
        const hoverCls = themeColor === 'emerald' ? 'hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700/60'
            : themeColor === 'sky' ? 'hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:border-sky-300 dark:hover:border-sky-700/60'
            : themeColor === 'indigo' ? 'hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700/60'
            : themeColor === 'rose' ? 'hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700/60'
            : 'hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700/60';
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    startInlineEditing(type);
                }}
                title="Bấm để chỉnh sửa mục tiêu trực tiếp"
                className={`group/val inline-flex items-center gap-1 px-1.5 py-0.5 -mr-1 rounded cursor-pointer border border-transparent transition-all ${hoverCls}`}
            >
                <span>{displayVal || 'Đặt MT'}</span>
                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/val:opacity-100 transition-opacity shrink-0 text-slate-400 group-hover/val:text-current" />
            </button>
        );
    };

    return (
        <div className="js-kpi-overview-container space-y-1.5 sm:space-y-2 lg:space-y-2.5">
            {/* ROW 1: DOANH THU & CHỈ SỐ LỚN */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
                <KpiCard
                    icon="dollar-sign"
                    iconColor="emerald"
                    title="DT Thực"
                    trendLabel="Dự kiến"
                    trendValue={dtThucDuKienStr}
                    isGood={true}
                >
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                        {roundUp(dtlk).toLocaleString('vi-VN')} Tr
                    </div>
                </KpiCard>

                <KpiCard
                    icon="trending-up"
                    iconColor="sky"
                    title="DTQĐ"
                    progressPercent={Math.ceil(secondaryPct)}
                    isGood={dtqdIsGood}
                    trendLabel={editingTargetType === 'dtQd' ? undefined : secondaryLabel}
                    trendValue={editingTargetType === 'dtQd' ? renderInlineInput('dtQd', 'Tr', 'sky') : renderTargetDisplay('dtQd', secondaryTargetStr || '-', 'sky')}
                    onClick={() => startInlineEditing('dtQd')}
                >
                    <div className={`text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums ${dtqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>
                        {roundUp(dtqd).toLocaleString('vi-VN')} Tr
                    </div>
                </KpiCard>

                <KpiCard
                    icon="activity"
                    iconColor={hqqdIsGood ? "indigo" : "rose"}
                    title="HQQĐ"
                    progressPercent={hqqd > 0 ? Math.ceil((hqqd / currentQuyDoiTarget) * 100) : 0}
                    isGood={hqqdIsGood}
                    trendLabel={editingTargetType === 'hqqd' ? undefined : 'Mục tiêu'}
                    trendValue={editingTargetType === 'hqqd' ? renderInlineInput('hqqd', '%', 'indigo') : renderTargetDisplay('hqqd', `${currentQuyDoiTarget}%`, hqqdIsGood ? 'indigo' : 'rose')}
                    onClick={() => startInlineEditing('hqqd')}
                >
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums ${hqqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Math.ceil(hqqd)}%
                        </span>
                        {!hqqdIsGood && currentQuyDoiTarget > 0 && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                (-{Math.max(0, currentQuyDoiTarget - Math.ceil(hqqd))}%)
                            </span>
                        )}
                    </div>
                </KpiCard>

                <KpiCard
                    icon="credit-card"
                    iconColor={traGopIsGood ? "amber" : "rose"}
                    title="Trả Chậm"
                    progressPercent={tyTrongTraGop > 0 ? Math.ceil((tyTrongTraGop / currentTraGopTarget) * 100) : 0}
                    isGood={traGopIsGood}
                    trendLabel={editingTargetType === 'traCham' ? undefined : 'Mục tiêu'}
                    trendValue={editingTargetType === 'traCham' ? renderInlineInput('traCham', '%', 'amber') : renderTargetDisplay('traCham', `${currentTraGopTarget}%`, traGopIsGood ? 'amber' : 'rose')}
                    onClick={() => startInlineEditing('traCham')}
                >
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums ${traGopIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Math.round(tyTrongTraGop)}%
                        </span>
                        {!traGopIsGood && currentTraGopTarget > 0 && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                (-{Math.max(0, currentTraGopTarget - Math.round(tyTrongTraGop))}%)
                            </span>
                        )}
                    </div>
                </KpiCard>
            </div>

            {/* ROW 2: CHỈ SỐ PHỤ */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
                <KpiCard icon="users" iconColor="sky" title="L.Khách" trendValue={renderGrowth(kpiData.luotKhachChange)}>
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-sky-700 dark:text-sky-400">
                        {roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}
                    </div>
                </KpiCard>

                <KpiCard icon="shield-check" iconColor="amber" title="TLPVTC" trendValue={renderGrowth(kpiData.tlpvChange)}>
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-amber-700 dark:text-amber-400">
                        {(() => {
                            const val = parseNumber(kpiData.tlpv);
                            if (!val) return '0%';
                            return `${Math.round(val)}%`;
                        })()}
                    </div>
                </KpiCard>

                <KpiCard icon="receipt" iconColor="emerald" title="Bill Bán">
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                        {kpiData.lbillBH && kpiData.lbillBH !== 'N/A'
                            ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN')
                            : (kpiData.lbill && kpiData.lbill !== 'N/A'
                                ? roundUp(parseNumber(kpiData.lbill)).toLocaleString('vi-VN')
                                : '0')}
                    </div>
                </KpiCard>

                <KpiCard icon="wallet" iconColor="rose" title="Bill T.Hộ">
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-rose-700 dark:text-rose-400">
                        {kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'}
                    </div>
                </KpiCard>
            </div>
        </div>
    );
};

export default KpiOverview;
