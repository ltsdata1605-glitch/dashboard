import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { CHART_ANIMATION_ENABLED } from '../../utils/chartConfig';
import { formatCurrency, formatQuantity, getExportFilenamePrefix } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import { exportElementAsImage } from '../../services/uiService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useIndustryGridLogic } from '../../hooks/useIndustryGridLogic';

const LIGHT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#10b981', '#60a5fa', '#94a3b8', '#a78bfa'];
const DARK_COLORS  = ['#818cf8', '#4ade80', '#facc15', '#f87171', '#a78bfa', '#22d3ee', '#fb923c', '#f472b6', '#34d399', '#93c5fd', '#cbd5e1', '#c4b5fd'];

const colorClasses: Record<string, { bg: string, text: string }> = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    rose:   { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
    cyan:   { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
    pink:   { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
    teal:   { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
    sky:    { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
    slate:  { bg: 'bg-slate-100 dark:bg-slate-700/60', text: 'text-slate-500 dark:text-slate-400' },
    lime:   { bg: 'bg-lime-50 dark:bg-lime-500/10', text: 'text-lime-600 dark:text-lime-400' },
    fuchsia:{ bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-600 dark:text-fuchsia-400' },
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
    const gridRef              = useRef<HTMLDivElement>(null);
    const pieRef               = useRef<HTMLDivElement>(null);
    const isInitialFilterSet   = useRef(false);
    const isSyncing            = useRef(false);

    const [isExporting, setIsExporting] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [metricToDisplay, setMetricToDisplay] = useState<'revenue' | 'quantity'>('quantity');

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

    const handleExportGrid = async () => {
        if (!gridRef.current) return;
        setIsExporting(true);
        const prefix = getExportFilenamePrefix(filters.kho);
        await exportElementAsImage(gridRef.current, `${prefix}-The-nganh-hang.png`, { elementsToHide: ['.hide-on-export'], scale: 3 });
        setIsExporting(false);
    };

    const handleExportPie = async () => {
        if (!pieRef.current) return;
        setIsExporting(true);
        const prefix = getExportFilenamePrefix(filters.kho);
        await exportElementAsImage(pieRef.current, `${prefix}-Bieu-do-ty-trong.png`, { elementsToHide: ['.hide-on-export'], scale: 3 });
        setIsExporting(false);
    };

    const handleExport = async () => {
        if (!cardRef.current) return;
        setIsExporting(true);
        const prefix = getExportFilenamePrefix(filters.kho);
        await exportElementAsImage(cardRef.current, `${prefix}-Ty-trong-nganh-hang.png`, { elementsToHide: ['.hide-on-export'], forcedWidth: 1024, scale: 3 });
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
        const total = metricToDisplay === 'revenue' ? currentView.totalRevenue : currentView.totalQuantity;
        const val = metricToDisplay === 'revenue' ? d.revenue : d.quantity;
        const pct = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
        return (
            <div className="p-3 shadow-xl rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-sm font-sans min-w-[170px]">
                <div className="font-extrabold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5 truncate text-xs">{d.name}</div>
                <div className="text-slate-600 dark:text-slate-300 mb-1 flex justify-between gap-3 text-xs"><span>{metricToDisplay === 'revenue' ? 'Doanh thu:' : 'Số lượng:'}</span><span className={`font-bold ${metricToDisplay === 'revenue' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{metricToDisplay === 'revenue' ? formatCurrency(d.revenue) : formatQuantity(d.quantity)}</span></div>
                <div className="text-slate-500 dark:text-slate-400 flex justify-between gap-3 text-[11px]"><span>Tỷ trọng:</span><span className="font-bold">{pct}%</span></div>
            </div>
        );
    };

    // ── Current level label ──────────────────────────────────────────────────
    const currentLevelLabel = levelLabels[drilldownPath.length] ?? '';

    return (
        <div
            ref={cardRef}
            className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-y sm:border border-slate-100 dark:border-slate-800 overflow-hidden rounded-none sm:rounded-xl lg:rounded-none mb-3 lg:mb-8"
        >
            {/* ──── SECTION HEADER ──── */}
            <SectionHeader
                title={(
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <span>{getTitle('card')}</span>
                            {drilldownPath.length > 0 && <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>}
                            <nav className="flex items-center text-[10px] sm:text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider gap-0.5">
                                {drilldownPath.length > 0 && (
                                    <button
                                        onClick={() => handleBreadcrumbClick(0)}
                                        className="px-1 hover:text-[#0584c7] transition-colors"
                                    >
                                        Tất cả
                                    </button>
                                )}
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
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                            {(filters.kho.length > 0 && !filters.kho.includes('all')) ? `KHO: ${filters.kho.join(', ')} | ` : ''} 
                            {(filters.xuat !== 'all') ? `TRẠNG THÁI XUẤT: ${filters.xuat} | ` : ''}
                            {filters.dateRange !== 'all' ? `TỪ ${filters.startDate.split('T')[0].split('-').reverse().join('/')} ĐẾN ${filters.endDate.split('T')[0].split('-').reverse().join('/')}` : 'TẤT CẢ THỜI GIAN'}
                        </span>
                    </div>
                ) as any}
                icon="pie-chart"
            >
                <div className="flex flex-wrap items-center gap-2 hide-on-export">
                    <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mr-2">
                        <button 
                            onClick={() => setMetricToDisplay('quantity')}
                            className={`py-1.5 px-3 sm:px-4 text-[10px] md:text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${metricToDisplay === 'quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        >
                            Số lượng
                        </button>
                        <button 
                            onClick={() => setMetricToDisplay('revenue')}
                            className={`py-1.5 px-3 sm:px-4 text-[10px] md:text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${metricToDisplay === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        >
                            Doanh thu
                        </button>
                    </div>
                    {drilldownPath.length > 0 && (
                        <button
                            onClick={() => handleBreadcrumbClick(drilldownPath.length - 1)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                            <Icon name="chevron-left" size={3.5} />
                            Quay lại
                        </button>
                    )}
                </div>
            </SectionHeader>

            {/* ──── BODY: 5:5 LAYOUT ──── */}
            <div className="p-2.5 lg:p-4 md:p-5">

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

                    {/* ══════ LEFT 50%: CARD GRID ══════ */}
                    <div className="w-full lg:w-1/2 lg:shrink-0 flex flex-col gap-3 bg-white dark:bg-slate-900 rounded-xl" ref={gridRef}>
                        {/* Left Side Header (Level indicator) - always rendered for export, hidden on mobile screen only */}
                        <div className="hidden lg:flex export-always-show items-center justify-between pr-2 pb-1 border-b border-transparent dark:border-white/5">
                            {currentLevelLabel && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/40">
                                    <Icon name="layers" size={3.5} />
                                    {currentLevelLabel}
                                    {isDrillable && drilldownPath.length < 2 && (
                                        <span className="ml-1 opacity-60">(Click để xem chi tiết)</span>
                                    )}
                                </span>
                            )}
                            <button
                                onClick={handleExportGrid}
                                disabled={isExporting}
                                className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors hide-on-export shrink-0 flex items-center gap-1"
                                title="Tải ảnh Thẻ Ngành Hàng"
                            >
                                <Icon name="download" size={3.5} />
                            </button>
                        </div>

                        {currentView.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                <Icon name="search-x" size={8} className="text-slate-300 dark:text-slate-700 mb-3" />
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Không có dữ liệu</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1 lg:gap-2 industry-cards-grid">
                                {currentView.data.map(({ name, revenue, quantity, icon, color }) => {
                                    const totalVal = metricToDisplay === 'revenue' ? currentView.totalRevenue : currentView.totalQuantity;
                                    const val = metricToDisplay === 'revenue' ? revenue : quantity;
                                    const pct = totalVal > 0 ? (val / totalVal * 100) : 0;
                                    const iClass = colorClasses[color] ?? colorClasses['slate'];

                                    return (
                                        <div
                                            key={name}
                                            role={isDrillable ? 'button' : undefined}
                                            tabIndex={isDrillable ? 0 : undefined}
                                            onClick={isDrillable ? () => handleCardClick(name) : undefined}
                                            onKeyDown={isDrillable ? (e) => { if (e.key === 'Enter') handleCardClick(name); } : undefined}
                                            className={[
                                                'group relative flex flex-col justify-between p-2 lg:p-2.5',
                                                'bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-white/5',
                                                'shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]',
                                                'transition-all duration-200 hover:-translate-y-0.5 rounded-xl select-none premium-card-shadow',
                                                isDrillable ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default',
                                            ].join(' ')}
                                        >
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className={`w-6 h-6 lg:w-6 lg:h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${iClass.bg} ${iClass.text} transition-transform group-hover:scale-110`}>
                                                    <Icon name={icon} size={3.5} className="lg:hidden" />
                                                    <Icon name={icon} size={3.5} className="hidden lg:block" />
                                                </div>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${iClass.bg} ${iClass.text} tracking-tighter`}>
                                                    {pct.toFixed(1)}%
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <div className={`text-[9px] lg:text-[9px] font-extrabold uppercase tracking-widest ${iClass.text} truncate mb-0.5 font-bold w-full`} title={name}>{name}</div>
                                                <div className="text-[10px] lg:text-[11px] font-black tracking-tight leading-none truncate">
                                                    {metricToDisplay === 'revenue' 
                                                        ? <span className="text-slate-900 dark:text-white">{formatCurrency(revenue)}</span> 
                                                        : <span className={iClass.text}>{`${formatQuantity(quantity)} SP`}</span>
                                                    }
                                                </div>
                                                <div className="mt-1 flex items-center gap-1 text-[8px] font-bold">
                                                    <Icon name={metricToDisplay === 'revenue' ? 'package' : 'dollar-sign'} size={2.5} className="text-slate-400 dark:text-slate-500" />
                                                    {metricToDisplay === 'revenue' 
                                                        ? <span className={iClass.text}>{`${formatQuantity(quantity)} SP`}</span> 
                                                        : <span className="text-slate-400 dark:text-slate-500">{formatCurrency(revenue)}</span>
                                                    }
                                                </div>
                                            </div>

                                            {isDrillable && (
                                                <div className="absolute bottom-1.5 right-1.5 opacity-60 lg:opacity-0 group-hover:opacity-70 transition-opacity">
                                                    <Icon name="chevron-right" size={3} className="text-indigo-400" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ══════ RIGHT 50%: PIE CHART ══════ */}
                    <div className="w-full lg:w-1/2 flex flex-col gap-3 bg-white dark:bg-slate-900 rounded-xl" ref={pieRef}>
                        {/* Right Side Header (Pie Chart Title) - always rendered for export */}
                        <div className="hidden lg:flex export-always-show items-center justify-between pr-1 pb-1 border-b border-transparent dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/40">
                                    <Icon name="pie-chart" size={3.5} />
                                    {drilldownPath.length === 0
                                        ? 'Tỷ trọng doanh thu'
                                        : `Top — ${drilldownPath[drilldownPath.length - 1]}`}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                    {pieChartData.length} mục
                                </span>
                            </div>
                            <button
                                onClick={handleExportPie}
                                disabled={isExporting}
                                className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors hide-on-export shrink-0 flex items-center gap-1"
                                title="Tải ảnh Biểu Đồ Tròn"
                            >
                                <Icon name="download" size={3.5} />
                            </button>
                        </div>

                        <div className="flex-grow bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-white/5 p-3 flex flex-col" style={{ minHeight: 280 }}>
                            {pieChartData.length > 0 ? (
                                <>
                                    <div style={{ height: 320 }} className="lg:hidden">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    dataKey={metricToDisplay}
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="40%"
                                                    outerRadius="74%"
                                                    paddingAngle={2}
                                                    stroke="none"
                                                    cornerRadius={3}
                                                    labelLine={false}
                                                    label={renderPieLabel}
                                                    isAnimationActive={CHART_ANIMATION_ENABLED}
                                                >
                                                    {pieChartData.map((_, idx) => (
                                                        <Cell key={`cell-m-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ height: 230 }} className="hidden lg:block">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    dataKey={metricToDisplay}
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="40%"
                                                    outerRadius="74%"
                                                    paddingAngle={2}
                                                    stroke="none"
                                                    cornerRadius={3}
                                                    labelLine={false}
                                                    label={renderPieLabel}
                                                    isAnimationActive={CHART_ANIMATION_ENABLED}
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
                                    <div className="mt-1.5 lg:mt-3 grid grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1 lg:gap-y-2 pr-1">
                                        {pieChartData.map((item, idx) => {
                                            const totalVal = metricToDisplay === 'revenue' ? currentView.totalRevenue : currentView.totalQuantity;
                                            const val = metricToDisplay === 'revenue' ? item.revenue : item.quantity;
                                            const pct = totalVal > 0 ? (val / totalVal * 100).toFixed(1) : '0.0';
                                            return (
                                                <div key={item.name} className="flex items-center min-w-0" title={`${item.name}: ${metricToDisplay === 'revenue' ? formatCurrency(item.revenue) : formatQuantity(item.quantity)} (${pct}%)`}>
                                                    <span className="w-2 h-2 rounded-full flex-shrink-0 mr-1.5" style={{ background: COLORS[idx % COLORS.length] }} />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex-shrink-0 ml-1.5">{pct}%</span>
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
