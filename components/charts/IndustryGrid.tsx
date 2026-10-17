import React, { useRef, useState, useEffect, useMemo } from 'react';
import { resolveIconName } from '../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { CHART_ANIMATION_ENABLED } from '../../utils/chartConfig';
import { formatCurrency, formatQuantity, getExportFilenamePrefix } from '../../utils/dataUtils';
import type { DataRow, IndustryData, ProductConfig, FilterState } from '../../types';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { moTaBoLoc } from '../../utils/moTaBoLoc';
import { SectionCard } from '../shared/ui/SectionCard';
import { EmptyState } from '../shared/ui/EmptyState';
import { exportElementAsImage } from '../../services/uiService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useIndustryGridLogic } from '../../hooks/useIndustryGridLogic';
import { Button } from '../shared/ui/Button';
import { industryToneByKey } from '../../utils/industryColors';
import AreaAutoExportButton from '../shared/export/AreaAutoExportButton';
import { registerYcxAutoExportRunner } from '../../services/autoReportExportService';

// Ramp phân loại nhóm — chỉ dùng sắc độ của 5 màu semantic (sky/emerald/amber/rose/slate)
// + indigo (alias primary hợp lệ), đủ tương phản để phân biệt tới 12 nhóm mà vẫn trong palette.
const CHART_COLORS = ['#0284c7', '#059669', '#f59e0b', '#f43f5e', '#6366f1', '#0ea5e9', '#d97706', '#fb7185', '#10b981', '#7dd3fc', '#94a3b8', '#a5b4fc'];

// Màu thẻ ngành: utils/industryColors.ts — bảng DÙNG CHUNG với ô ngành của 2 modal chưa xuất/chưa thu (cùng ngành, cùng màu).

// Level badge labels
const levelLabels: Record<number, string> = {
    0: 'Ngành hàng',
    1: 'Nhóm hàng',
    2: 'Hãng / Người tạo',
};

interface IndustryGridInnerProps {
    industryData: IndustryData[];
    productConfig: ProductConfig | null;
    filters: FilterState;
    onFilterChange: (update: Partial<FilterState>) => void;
    // Dữ liệu ĐÃ qua đủ bộ lọc doanh thu hợp lệ (ngày/kho/trạng thái thu tiền/thu hộ/"Không tính
    // doanh thu") — CÙNG nguồn tạo ra `industryData` cấp cha (processedData.filteredValidSalesData),
    // để card cấp cha và card khi drill-down luôn khớp số. Chưa lọc theo Ngành hàng (filters.parent)
    // để drilldown hoạt động đúng.
    validSalesData: DataRow[];
}

const IndustryGridInner: React.FC<IndustryGridInnerProps> = React.memo(({
    industryData,
    productConfig,
    filters,
    onFilterChange,
    validSalesData
}) => {
    const allSales = validSalesData ?? [];
    const globalParentFilters = filters.parent;

    const cardRef              = useRef<HTMLDivElement>(null);
    const gridRef              = useRef<HTMLDivElement>(null);
    const pieRef               = useRef<HTMLDivElement>(null);
    const isInitialFilterSet   = useRef(false);
    const isSyncing            = useRef(false);

    const [isExporting, setIsExporting] = useState(false);
    const [metricToDisplay, setMetricToDisplay] = useState<'revenue' | 'quantity'>('quantity');

    // Dark Mode đã tắt toàn dự án → luôn dùng bảng màu Sáng.
    const COLORS = CHART_COLORS;

    const {
        drilldownPath,
        setDrilldownPath,
        currentView: rawCurrentView,
        allSubgroups,
        selectedChartSubgroups,
        setSelectedChartSubgroups,
        getTitle,
    } = useIndustryGridLogic({ industryData, allSalesData: allSales, productConfig });

    const currentView = useMemo(() => {
        // Hiển thị TẤT CẢ ngành hàng (không giới hạn top 8 như trước) — tổng doanh
        // thu/số lượng dùng để tính %DT của từng thẻ vẫn phải tính trên TOÀN BỘ danh
        // sách đã sort, không phải chỉ trên phần cắt, để không sai lệch tỷ trọng.
        const sorted = [...rawCurrentView.data].sort((a, b) => {
            const valA = metricToDisplay === 'revenue' ? a.revenue : a.quantity;
            const valB = metricToDisplay === 'revenue' ? b.revenue : b.quantity;
            return valB - valA;
        });
        const totalRevenue = sorted.reduce((sum, item) => sum + item.revenue, 0);
        const totalQuantity = sorted.reduce((sum, item) => sum + item.quantity, 0);
        return {
            ...rawCurrentView,
            data: sorted,
            totalRevenue,
            totalQuantity
        };
    }, [rawCurrentView, metricToDisplay]);

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
        const prefix = getExportFilenamePrefix(filters.kho);
        await exportElementAsImage(cardRef.current, `${prefix} - Tỷ Trọng Ngành Hàng.png`, { elementsToHide: ['.hide-on-export'], forcedWidth: 1024 });
        setIsExporting(false);
    };

    useEffect(() => {
        return registerYcxAutoExportRunner('Phân Tích Ngành Hàng', async () => {
            if (!cardRef.current) return null;
            const prefix = getExportFilenamePrefix(filters.kho);
            return exportElementAsImage(cardRef.current, `${prefix} - Tỷ Trọng Ngành Hàng.png`, {
                elementsToHide: ['.hide-on-export'],
                forcedWidth: 1024,
                mode: 'blob-only',
            });
        });
    }, [filters.kho]);

    // Cards are drillable only at levels 0 and 1 (industry & group)
    const isDrillable = drilldownPath.length < 2;

    // ── Pie label renderer ───────────────────────────────────────────────────
    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
        if ((percent ?? 0) < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const r = Number(innerRadius ?? 0) + (Number(outerRadius ?? 0) - Number(innerRadius ?? 0)) * 0.54;
        const x = Number(cx ?? 0) + r * Math.cos(-(midAngle ?? 0) * RADIAN);
        const y = Number(cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800}>
                {`${((percent ?? 0) * 100).toFixed(0)}%`}
            </text>
        );
    };

    // ── Tooltip ──────────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: IndustryData }[] }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        const total = metricToDisplay === 'revenue' ? currentView.totalRevenue : currentView.totalQuantity;
        const val = metricToDisplay === 'revenue' ? d.revenue : d.quantity;
        const pct = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
        return (
            <div className="p-3 shadow-xl rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-sm font-sans min-w-[170px]">
                <div className="font-extrabold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5 truncate text-xs">{d.name}</div>
                <div className="text-slate-600 dark:text-slate-300 mb-1 flex justify-between gap-3 text-xs"><span>{metricToDisplay === 'revenue' ? 'Doanh thu:' : 'Số lượng:'}</span><span className={`font-bold ${metricToDisplay === 'revenue' ? 'text-sky-700 dark:text-sky-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{metricToDisplay === 'revenue' ? formatCurrency(d.revenue) : formatQuantity(d.quantity)}</span></div>
                <div className="text-slate-500 dark:text-slate-400 flex justify-between gap-3 text-[11px]"><span>Tỷ trọng:</span><span className="font-bold">{pct}%</span></div>
            </div>
        );
    };

    // ── Current level label ──────────────────────────────────────────────────
    const currentLevelLabel = levelLabels[drilldownPath.length] ?? '';

    return (
        <SectionCard
            ref={cardRef}
            className="mb-3 lg:mb-8 lg:rounded-none"
        >
            {/* ──── SECTION HEADER ──── */}
            <SectionHeader
                titleClassName="type-headline font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate leading-tight"
                title={(
                    <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate">{getTitle('card')}</span>
                            {drilldownPath.length > 0 && <div className="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700"></div>}
                            <nav className="flex min-w-0 items-center text-[12px] font-medium text-slate-400 dark:text-slate-500 gap-0.5 normal-case tracking-normal">
                                {drilldownPath.length > 0 && (
                                    <Button
                                        variant="unstyled" size="none"
                                        onClick={() => handleBreadcrumbClick(0)}
                                        className="px-1 hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
                                    >
                                        Tất cả
                                    </Button>
                                )}
                                {drilldownPath.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <AppIcon name="chevronRight" size="xs" className="opacity-40 mx-0.5" />
                                        <Button
                                            variant="unstyled" size="none"
                                            onClick={() => handleBreadcrumbClick(idx + 1)}
                                            className="px-1 max-w-[110px] truncate hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
                                            title={item}
                                        >
                                            {item}
                                        </Button>
                                    </React.Fragment>
                                ))}
                            </nav>
                    </div>
                )}
                subtitle={moTaBoLoc(filters)}
            >
                <div className="flex items-center gap-2 lg:gap-1.5 hide-on-export">
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => setMetricToDisplay('quantity')}
                        className={`ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-control transition-colors ${metricToDisplay === 'quantity' ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Số lượng"
                    >
                        <AppIcon name="product" size="md" />
                    </Button>
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => setMetricToDisplay('revenue')}
                        className={`ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-control transition-colors ${metricToDisplay === 'revenue' ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Doanh thu"
                    >
                        <AppIcon name="money" size="md" />
                    </Button>
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-control text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Xuất ảnh tỷ trọng ngành hàng"
                    >
                        {isExporting ? <AppIcon name="loading" size="md" spin /> : <AppIcon name="exportImage" size="md" className="lg:hidden" />}
                        {!isExporting && <AppIcon name="exportImage" size="md" className="hidden lg:block" />}
                    </Button>
                    <AreaAutoExportButton
                        areaId="Phân Tích Ngành Hàng"
                        areaName="Phân Tích Ngành Hàng"
                        onTestExport={async () => {
                            if (!cardRef.current) return null;
                            const prefix = getExportFilenamePrefix(filters.kho);
                            return exportElementAsImage(cardRef.current, `${prefix} - Tỷ Trọng Ngành Hàng.png`, {
                                elementsToHide: ['.hide-on-export'],
                                forcedWidth: 1024,
                                mode: 'blob-only',
                            });
                        }}
                    />
                    {drilldownPath.length > 0 && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => handleBreadcrumbClick(drilldownPath.length - 1)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                            <AppIcon name="chevronLeft" size="md" />
                            Quay lại
                        </Button>
                    )}
                </div>
            </SectionHeader>

            {/* ──── BODY: 5:5 LAYOUT ──── */}
            <div className="p-2.5 lg:p-4 md:p-5">

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

                    {/* ══════ LEFT 50%: CARD GRID ══════ */}
                    <div className="w-full lg:w-1/2 lg:shrink-0 flex flex-col gap-3 bg-white dark:bg-slate-900 rounded-none" ref={gridRef}>
                        {/* Left Side Header (Level indicator) - always rendered for export, hidden on mobile screen only */}
                        <div className="hidden lg:flex export-always-show items-center justify-between pr-2 pb-1 border-b border-transparent dark:border-white/5">
                            {currentLevelLabel && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 text-xs font-extrabold uppercase tracking-widest border border-sky-100 dark:border-sky-800/40">
                                    <AppIcon name="layers" size="sm" />
                                    {currentLevelLabel}
                                    {isDrillable && drilldownPath.length < 2 && (
                                        <span className="ml-1 opacity-60">(Click để xem chi tiết)</span>
                                    )}
                                </span>
                            )}
                        </div>

                        {currentView.data.length === 0 ? (
                            <div className="bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                <EmptyState icon={<AppIcon name="searchEmpty" size="xl" />} title="Không có dữ liệu" compact />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 lg:gap-2 industry-cards-grid">
                                {currentView.data.map(({ name, revenue, quantity, icon, color }) => {
                                    const totalVal = metricToDisplay === 'revenue' ? currentView.totalRevenue : currentView.totalQuantity;
                                    const val = metricToDisplay === 'revenue' ? revenue : quantity;
                                    const pct = totalVal > 0 ? (val / totalVal * 100) : 0;
                                    const iClass = industryToneByKey(color);

                                    return (
                                        <div
                                            key={name}
                                            role={isDrillable ? 'button' : undefined}
                                            tabIndex={isDrillable ? 0 : undefined}
                                            onClick={isDrillable ? () => handleCardClick(name) : undefined}
                                            onKeyDown={isDrillable ? (e) => { if (e.key === 'Enter') handleCardClick(name); } : undefined}
                                            className={[
                                                'group relative',
                                                'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5',
                                                'shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]',
                                                'transition-all duration-200 hover:-translate-y-0.5 rounded-xl select-none premium-card-shadow',
                                                isDrillable ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default',
                                                // Mobile: single row, Desktop: block card
                                                'flex items-center gap-1.5 p-1.5 lg:flex-col lg:justify-between lg:items-stretch lg:p-2.5',
                                            ].join(' ')}
                                        >
                                            {/* Mobile: compact inline row */}
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${iClass.bg} ${iClass.text} lg:hidden`}>
                                                <AppIcon name={resolveIconName(icon) ?? 'help'} size="xs" />
                                            </div>
                                            {/* 2 dòng (tên / doanh thu · SL) thay vì 1 hàng: ô rộng ~170px trên iPhone mà
                                                nhồi 6 thứ vào một hàng thì tên ra "PH…", doanh thu ra "2.." (dữ liệu thật 2026-09-28). */}
                                            <div className="flex flex-col min-w-0 flex-1 leading-tight lg:hidden">
                                                <span className={`text-[11px] font-extrabold uppercase tracking-wide ${iClass.text} line-clamp-2 break-words`} title={name}>{name}</span>
                                                <span className="flex items-baseline gap-1 min-w-0 text-[11px]">
                                                    <span className="font-black text-slate-800 dark:text-white whitespace-nowrap">{formatCurrency(revenue)}</span>
                                                    <span className="text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap truncate">{formatQuantity(quantity)} SP</span>
                                                </span>
                                            </div>
                                            <span className={`text-[11px] font-black px-1 py-0.5 rounded ${iClass.bg} ${iClass.text} tracking-tighter shrink-0 lg:hidden`}>
                                                {pct.toFixed(1)}%
                                            </span>
                                            {isDrillable && (
                                                <AppIcon name="chevronRight" size="xs" className="text-sky-400 opacity-60 lg:hidden" />
                                            )}

                                            {/* Desktop: original block layout */}
                                            <div className="hidden lg:flex justify-between items-start mb-1.5">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${iClass.bg} ${iClass.text} transition-transform group-hover:scale-110`}>
                                                    <AppIcon name={resolveIconName(icon) ?? 'help'} size="sm" />
                                                </div>
                                                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${iClass.bg} ${iClass.text} tracking-widerer`}>
                                                    {pct.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="hidden lg:block min-w-0">
                                                {/* Tối đa 2 dòng thay vì cắt 1 dòng: ô chỉ ~90px ở laptop 1366px nên "SMARTPHONE",
                                                    "MÁY LỌC NƯỚC" bị cắt thành "SMARTPHO…" (đo trên dữ liệu thật 2026-09-28). */}
                                                <div className={`text-[11px] font-extrabold uppercase tracking-wide leading-tight ${iClass.text} line-clamp-2 break-words mb-0.5 w-full`} title={name}>{name}</div>
                                                <div className="text-[11px] font-black tracking-wider leading-none truncate">
                                                    {metricToDisplay === 'revenue' 
                                                        ? <span className="text-slate-900 dark:text-white">{formatCurrency(revenue)}</span> 
                                                        : <span className={iClass.text}>{`${formatQuantity(quantity)} SP`}</span>
                                                    }
                                                </div>
                                                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                                                    <AppIcon name={resolveIconName(metricToDisplay === 'revenue' ? 'package' : 'dollar-sign') ?? 'help'} size="xs" className="text-slate-400" />
                                                    {metricToDisplay === 'revenue' 
                                                        ? <span className={iClass.text}>{`${formatQuantity(quantity)} SP`}</span> 
                                                        : <span className="text-slate-400 dark:text-slate-500">{formatCurrency(revenue)}</span>
                                                    }
                                                </div>
                                            </div>
                                            {isDrillable && (
                                                <div className="hidden lg:block absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-70 transition-opacity">
                                                    <AppIcon name="chevronRight" size="xs" className="text-sky-400" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ══════ RIGHT 50%: PIE CHART ══════ */}
                    <div className="w-full lg:w-1/2 flex flex-col gap-1.5 lg:gap-3 bg-white dark:bg-slate-900 rounded-none" ref={pieRef}>
                        {/* Right Side Header (Pie Chart Title) - always rendered for export */}
                        <div className="hidden lg:flex export-always-show items-center justify-between pr-1 pb-1 border-b border-transparent dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/40">
                                    <AppIcon name="chartPie" size="sm" />
                                    {drilldownPath.length === 0
                                        ? (metricToDisplay === 'revenue' ? 'Tỷ trọng doanh thu' : 'Tỷ trọng số lượng')
                                        : `Top — ${drilldownPath[drilldownPath.length - 1]}`}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                    {pieChartData.length} mục
                                </span>
                            </div>
                        </div>

                        <div className="flex-grow bg-transparent lg:bg-slate-50/70 dark:lg:bg-slate-800/40 rounded-none border-0 lg:border border-slate-100 dark:border-white/5 p-0 lg:p-3 flex flex-col justify-center">
                            {pieChartData.length > 0 ? (
                                <div className="flex flex-row items-center justify-between w-full gap-2 sm:gap-4 py-1.5 lg:py-3 flex-grow min-h-[150px]">
                                    {/* Cột trái: Biểu đồ */}
                                    <div className="w-[45%] sm:w-[48%] h-[150px] sm:h-[180px] lg:h-[200px] shrink-0">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                                <Pie
                                                    data={pieChartData}
                                                    dataKey={metricToDisplay}
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="35%"
                                                    outerRadius="80%"
                                                    paddingAngle={2}
                                                    stroke="none"
                                                    cornerRadius={3}
                                                    labelLine={false}
                                                    label={renderPieLabel}
                                                    isAnimationActive={CHART_ANIMATION_ENABLED && !isExporting}
                                                >
                                                    {pieChartData.map((_, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Cột phải: Chú thích (Legend) */}
                                    {/* Chú thích: 2 cột chỉ khi đủ rộng (≥340px) — hẹp hơn thì mỗi cột ~60px, tên ngành bị
                                        cắt "Smar…", "Đồng…", "Máy l…" (laptop 1366px và iPhone, 2026-09-28). */}
                                    <div className="w-[55%] sm:w-[52%] @container">
                                    <div className="grid grid-cols-1 @min-[340px]:grid-cols-2 gap-x-2.5 gap-y-1 overflow-y-auto no-scrollbar max-h-[240px] lg:max-h-[260px] pr-1">
                                        {pieChartData.map((item, idx) => {
                                            const totalVal = metricToDisplay === 'revenue' ? currentView.totalRevenue : currentView.totalQuantity;
                                            const val = metricToDisplay === 'revenue' ? item.revenue : item.quantity;
                                            const pct = totalVal > 0 ? (val / totalVal * 100).toFixed(1) : '0.0';
                                            return (
                                                <div 
                                                    key={item.name} 
                                                    className="flex items-center justify-between min-w-0 py-0.5" 
                                                    title={`${item.name}: ${metricToDisplay === 'revenue' ? formatCurrency(item.revenue) : formatQuantity(item.quantity)} (${pct}%)`}
                                                >
                                                    <div className="flex items-center min-w-0 mr-1">
                                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ background: COLORS[idx % COLORS.length] }} />
                                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 flex-shrink-0 ml-1">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-grow flex items-center justify-center">
                                    <EmptyState compact icon="chartPie" title="Không có dữ liệu biểu đồ" />
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </SectionCard>
    );
});
IndustryGridInner.displayName = 'IndustryGridInner';

const IndustryGrid: React.FC = React.memo(() => {
    const { processedData, productConfig, filterState: filters, handleFilterChange: onFilterChange } = useDashboardContext();
    return (
        <IndustryGridInner
            industryData={processedData?.industryData ?? []}
            productConfig={productConfig}
            filters={filters}
            onFilterChange={onFilterChange}
            validSalesData={processedData?.filteredValidSalesData ?? []}
        />
    );
});

IndustryGrid.displayName = 'IndustryGrid';
export default React.memo(IndustryGrid);
