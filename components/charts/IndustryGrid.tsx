
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import { exportElementAsImage } from '../../services/uiService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useIndustryGridLogic } from '../../hooks/useIndustryGridLogic';

const LIGHT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#10b981', '#60a5fa', '#94a3b8', '#a78bfa'];
const DARK_COLORS  = ['#818cf8', '#4ade80', '#facc15', '#f87171', '#a78bfa', '#22d3ee', '#fb923c', '#f472b6', '#34d399', '#93c5fd', '#cbd5e1', '#c4b5fd'];

const colorClasses: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    emerald:'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber:  'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    rose:   'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    cyan:   'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
    pink:   'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
    teal:   'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    sky:    'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    slate:  'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
    lime:   'bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400',
    fuchsia:'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
};

// Level badge labels
const levelLabels: Record<number, string> = {
    0: 'Ngành hàng',
    1: 'Nhóm hàng',
    2: 'Hãng / Người tạo',
};

const IndustryGrid: React.FC = React.memo(() => {
    const { processedData, productConfig, filterState: filters, handleFilterChange: onFilterChange, baseFilteredData } = useDashboardContext();
    const industryData = processedData?.industryData ?? [];
    // ✅ Dùng baseFilteredData (chưa filter parent) để drilldown hoạt động đúng
    const allSales = baseFilteredData ?? [];
    const globalParentFilters = filters.parent;

    const cardRef              = useRef<HTMLDivElement>(null);
    const isInitialFilterSet   = useRef(false);
    const isSyncing            = useRef(false);

    const [isExporting, setIsExporting] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    // Track dark mode changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const COLORS = isDark ? DARK_COLORS : LIGHT_COLORS;

    const {
        drilldownPath,
        setDrilldownPath,
        currentView,
        allSubgroups,
        selectedChartSubgroups,
        setSelectedChartSubgroups,
        getTitle,
    } = useIndustryGridLogic({ industryData, allSalesData: allSales, productConfig });

    // ── Sync: globalParentFilters → drilldownPath ────────────────────────────
    // Khi user chọn filter từ FilterSection bên ngoài, cập nhật drilldown path
    useEffect(() => {
        if (isSyncing.current) return;
        if (globalParentFilters.length === 1) {
            const sel = globalParentFilters[0];
            if (drilldownPath[0] !== sel) {
                isSyncing.current = true;
                setDrilldownPath([sel]);
                setTimeout(() => { isSyncing.current = false; }, 80);
            }
        } else if (globalParentFilters.length === 0 && drilldownPath.length > 0) {
            isSyncing.current = true;
            setDrilldownPath([]);
            setTimeout(() => { isSyncing.current = false; }, 80);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalParentFilters]);

    // ── Sync: drilldownPath[0] → globalParentFilters ─────────────────────────
    // Khi user click drill vào Ngành hàng, cập nhật filter pill
    useEffect(() => {
        if (isSyncing.current) return;
        const rootParent = drilldownPath[0];
        if (rootParent) {
            if (globalParentFilters.length !== 1 || globalParentFilters[0] !== rootParent) {
                isSyncing.current = true;
                onFilterChange({ parent: [rootParent] });
                setTimeout(() => { isSyncing.current = false; }, 80);
            }
        } else {
            if (globalParentFilters.length > 0) {
                isSyncing.current = true;
                onFilterChange({ parent: [] });
                setTimeout(() => { isSyncing.current = false; }, 80);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drilldownPath[0]]);

    useEffect(() => {
        if (!isInitialFilterSet.current && allSubgroups.includes('Smartphone')) {
            setSelectedChartSubgroups(['Smartphone']);
            isInitialFilterSet.current = true;
        }
    }, [allSubgroups, setSelectedChartSubgroups]);

    // ── Pie Chart data: always mirrors currentView.data ─────────────────────
    const pieChartData = useMemo(() => {
        const data = currentView.data;
        if (!data?.length) return [];
        if (data.length <= 10) return data;
        const top10 = data.slice(0, 10);
        const otherRev = data.slice(10).reduce((s, d) => s + d.revenue, 0);
        const otherQty = data.slice(10).reduce((s, d) => s + d.quantity, 0);
        return [...top10, { name: 'Khác', revenue: otherRev, quantity: otherQty, icon: 'package', color: 'slate' }];
    }, [currentView.data]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleCardClick = (itemName: string) => {
        // Allow drill down up to level 2 (industry → group → manufacturer)
        if (drilldownPath.length < 2) {
            setDrilldownPath(prev => [...prev, itemName]);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        setDrilldownPath(prev => prev.slice(0, index));
    };

    const handleExport = async () => {
        if (!cardRef.current) return;
        setIsExporting(true);
        await exportElementAsImage(cardRef.current, 'ty-trong-nganh-hang.png', { elementsToHide: ['.hide-on-export'] });
        setIsExporting(false);
    };

    // Cards are drillable only at levels 0 and 1 (industry & group)
    const isDrillable = drilldownPath.length < 2;

    // ── Pie label renderer ───────────────────────────────────────────────────
    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const r = innerRadius + (outerRadius - innerRadius) * 0.54;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // ── Tooltip ──────────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        const total = currentView.totalRevenue;
        const pct = total > 0 ? (d.revenue / total * 100).toFixed(1) : '0.0';
        return (
            <div className="p-3 shadow-xl rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-sm font-sans min-w-[170px]">
                <div className="font-extrabold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5 truncate text-xs">{d.name}</div>
                <div className="text-slate-600 dark:text-slate-300 mb-1 flex justify-between gap-3 text-xs"><span>Doanh thu:</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(d.revenue)}</span></div>
                <div className="text-slate-600 dark:text-slate-300 mb-1 flex justify-between gap-3 text-xs"><span>Số lượng:</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatQuantity(d.quantity)}</span></div>
                <div className="text-slate-500 dark:text-slate-400 flex justify-between gap-3 text-[11px]"><span>Tỷ trọng:</span><span className="font-bold">{pct}%</span></div>
            </div>
        );
    };

    // ── Current level label ──────────────────────────────────────────────────
    const currentLevelLabel = levelLabels[drilldownPath.length] ?? '';

    return (
        <div
            ref={cardRef}
            className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden rounded-none mb-8"
        >
            {/* ──── SECTION HEADER ──── */}
            <SectionHeader
                title={getTitle('card')}
                icon="pie-chart"
                subtitle={
                    <nav className="flex items-center text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider gap-0.5">
                        <button
                            onClick={() => handleBreadcrumbClick(0)}
                            className="px-1 hover:text-[#0584c7] transition-colors"
                        >
                            Tất cả
                        </button>
                        {drilldownPath.map((item, idx) => (
                            <React.Fragment key={idx}>
                                <Icon name="chevron-right" size={3} className="opacity-40 mx-0.5" />
                                <button
                                    onClick={() => handleBreadcrumbClick(idx + 1)}
                                    className="px-1 max-w-[110px] truncate hover:text-[#0584c7] transition-colors"
                                    title={item}
                                >
                                    {item}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                }
            >
                <div className="flex items-center gap-2 hide-on-export">
                    {drilldownPath.length > 0 && (
                        <button
                            onClick={() => handleBreadcrumbClick(drilldownPath.length - 1)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                            <Icon name="chevron-left" size={3.5} />
                            Quay lại
                        </button>
                    )}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                        title="Xuất ảnh"
                    >
                        {isExporting
                            ? <Icon name="loader-2" size={4} className="animate-spin" />
                            : <Icon name="camera" size={4} />
                        }
                    </button>
                </div>
            </SectionHeader>

            {/* ──── BODY: 5:5 LAYOUT ──── */}
            <div className="p-4 md:p-5">
                {/* Level indicator */}
                {currentLevelLabel && (
                    <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/40">
                            <Icon name="layers" size={3} />
                            {currentLevelLabel}
                            {isDrillable && drilldownPath.length < 2 && (
                                <span className="ml-1 opacity-60">(Click để xem chi tiết)</span>
                            )}
                        </span>
                    </div>
                )}

                <div className="flex flex-row gap-5 items-start">

                    {/* ══════ LEFT 50%: CARD GRID ══════ */}
                    <div className="w-1/2 shrink-0">
                        {currentView.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                <Icon name="search-x" size={8} className="text-slate-300 dark:text-slate-700 mb-3" />
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Không có dữ liệu</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {currentView.data.map(({ name, revenue, quantity, icon, color }) => {
                                    const pct = currentView.totalRevenue > 0
                                        ? (revenue / currentView.totalRevenue * 100)
                                        : 0;
                                    const iClass = colorClasses[color] ?? colorClasses['slate'];

                                    return (
                                        <div
                                            key={name}
                                            role={isDrillable ? 'button' : undefined}
                                            tabIndex={isDrillable ? 0 : undefined}
                                            onClick={isDrillable ? () => handleCardClick(name) : undefined}
                                            onKeyDown={isDrillable ? (e) => { if (e.key === 'Enter') handleCardClick(name); } : undefined}
                                            className={[
                                                'group relative flex flex-col justify-between p-2.5',
                                                'bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-white/5',
                                                'shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]',
                                                'transition-all duration-200 hover:-translate-y-0.5 rounded-xl select-none',
                                                isDrillable ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default',
                                            ].join(' ')}
                                        >
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${iClass} transition-transform group-hover:scale-110`}>
                                                    <Icon name={icon} size={3.5} />
                                                </div>
                                                <span className="text-[8px] font-black px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 tracking-tighter">
                                                    {pct.toFixed(1)}%
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate mb-0.5" title={name}>{name}</div>
                                                <div className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">{formatCurrency(revenue)}</div>
                                                <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-slate-400 dark:text-slate-600">
                                                    <Icon name="package" size={2.5} /> {formatQuantity(quantity)} SP
                                                </div>
                                            </div>

                                            {isDrillable && (
                                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-70 transition-opacity">
                                                    <Icon name="chevron-right" size={2.5} className="text-indigo-400" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ══════ RIGHT 50%: PIE CHART ══════ */}
                    <div className="w-1/2 flex flex-col" style={{ minHeight: 340 }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                {drilldownPath.length === 0
                                    ? 'Tỷ trọng doanh thu'
                                    : `Top — ${drilldownPath[drilldownPath.length - 1]}`}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                {pieChartData.length} mục
                            </span>
                        </div>

                        <div className="flex-grow bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-white/5 p-3 flex flex-col">
                            {pieChartData.length > 0 ? (
                                <>
                                    {/* Pie area */}
                                    <div style={{ height: 230 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    dataKey="revenue"
                                                    nameKey="name"
                                                    innerRadius="40%"
                                                    outerRadius="74%"
                                                    paddingAngle={2}
                                                    stroke="none"
                                                    cornerRadius={3}
                                                    labelLine={false}
                                                    label={renderPieLabel}
                                                >
                                                    {pieChartData.map((_, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Legend grid */}
                                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar pr-1">
                                        {pieChartData.map((item, idx) => {
                                            const pct = currentView.totalRevenue > 0
                                                ? (item.revenue / currentView.totalRevenue * 100).toFixed(1)
                                                : '0.0';
                                            return (
                                                <div key={item.name} className="flex items-center gap-1.5 min-w-0" title={`${item.name}: ${formatCurrency(item.revenue)} (${pct}%)`}>
                                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-auto flex-shrink-0">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-grow flex items-center justify-center text-xs text-slate-400 dark:text-slate-600">
                                    Không có dữ liệu biểu đồ
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
});

IndustryGrid.displayName = 'IndustryGrid';
export default IndustryGrid;
