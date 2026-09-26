import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton, { ExportOptionItem } from '../ExportButton';
import { SpinnerIcon, UsersIcon, XIcon, ViewListIcon, ViewGridIcon, ClockIcon, DownloadAllIcon, CheckCircleIcon, AlertTriangleIcon, ImagesIcon, ChartBarIcon, SparklesIcon } from '../Icons';
import { RevenueRow, BonusMetrics } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseRevenueData } from '../../utils/nhanVienHelpers';


import { DeltaBadge } from '../shared/Badges';
import TimeProgressBar from './shared/TimeProgressBar';

import { shortenSupermarketName } from '../../utils/dashboardHelpers';
import * as db from '../../utils/db';
import { ColorSettings, DEFAULT_COLOR_SETTINGS, CriterionConfig, getDkhtColor, toBoldVividColor, getMetricColorByTarget } from './revenue/ColorSettingsModal';
import { ImportPrevMonthModal } from './revenue/ImportPrevMonthModal';
import { RevenueDesktopRow } from './revenue/RevenueDesktopRow';
import { useRevenueData } from '../../hooks/useRevenueData';
import { Button } from '../../../../components/shared/ui/Button';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const RevenueView: React.FC<{
    rows: RevenueRow[];
    realtimeRows?: RevenueRow[];
    supermarketName: string;
    activeSupermarkets: string[];
    departmentNames: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: (updater: React.SetStateAction<Set<string>>) => void;
    supermarketTarget: number;
    departmentWeights: Record<string, number>;
    deptEmployeeCounts: Record<string, number>;
    employeeInstallmentMap: Map<string, number>;
    isActive?: boolean;
    bonusData?: Record<string, BonusMetrics | null>;
}> = ({
    rows, realtimeRows = [], supermarketName, activeSupermarkets, departmentNames,
    highlightedEmployees, setHighlightedEmployees,
    supermarketTarget, departmentWeights, deptEmployeeCounts, employeeInstallmentMap,
    isActive,
    bonusData
}) => {
    const [isRealtimeMode, setIsRealtimeMode] = useIndexedDBState<boolean>('nhanvien-revenue-realtime-mode', false);
    const activeRows = isRealtimeMode ? realtimeRows : rows;

    const [isLoading, setIsLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dtqd', direction: 'desc' });
    const [isPrevMonthModalOpen, setIsPrevMonthModalOpen] = useState(false);
    
    // Target động từ tab Cập nhật (Target Trả góp & Target Quy đổi)
    const safeName = shortenSupermarketName(supermarketName);
    const [storedTraGopTarget] = useIndexedDBState<number>(`targethero-${safeName}-tragop`, 45);
    const [storedQuyDoiTarget] = useIndexedDBState<number>(`targethero-${safeName}-quydoi`, 40);

    const [multiTraGopTarget, setMultiTraGopTarget] = useState<number | null>(null);
    const [multiQuyDoiTarget, setMultiQuyDoiTarget] = useState<number | null>(null);

    useEffect(() => {
        if (!activeSupermarkets || activeSupermarkets.length <= 1) {
            setMultiTraGopTarget(null);
            setMultiQuyDoiTarget(null);
            return;
        }
        let isMounted = true;
        const loadMultiTargets = async () => {
            const results = await Promise.all(activeSupermarkets.map(async (sm) => {
                const sName = shortenSupermarketName(sm);
                const [tg, qd] = await Promise.all([
                    db.get<number>(`targethero-${sName}-tragop`),
                    db.get<number>(`targethero-${sName}-quydoi`)
                ]);
                return { tg: tg ?? 45, qd: qd ?? 40 };
            }));
            if (isMounted && results.length > 0) {
                const avgTg = results.reduce((sum, r) => sum + r.tg, 0) / results.length;
                const avgQd = results.reduce((sum, r) => sum + r.qd, 0) / results.length;
                setMultiTraGopTarget(avgTg);
                setMultiQuyDoiTarget(avgQd);
            }
        };
        loadMultiTargets();
        return () => { isMounted = false; };
    }, [activeSupermarkets]);

    const targetTraGop = multiTraGopTarget ?? storedTraGopTarget ?? 45;
    const targetQuyDoi = multiQuyDoiTarget ?? storedQuyDoiTarget ?? 40;

    // Lấy config từ DB
    const [storedColorSettings] = useIndexedDBState<ColorSettings>('rev-colors-v4', DEFAULT_COLOR_SETTINGS);
    
    // Merge với mặc định để tránh lỗi khi DB có phiên bản cũ thiếu keys
    const colorSettings = useMemo(() => ({
        ...DEFAULT_COLOR_SETTINGS,
        ...storedColorSettings
    }), [storedColorSettings]);

    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('revenue-view-mode', 'group');
    const [isShowRemaining, setIsShowRemaining] = useIndexedDBState<boolean>('rev-show-remaining', false);
    const [isShowPrevMonth, setIsShowPrevMonth] = useIndexedDBState<boolean>('rev-show-prev-month', true);
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-revenue-${supermarketName}`, '');
    const prevMonthRows = useMemo(() => {
        if (isActive === false) return [];
        return parseRevenueData(prevMonthRaw);
    }, [prevMonthRaw, isActive]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });

    const cardRef = useRef<HTMLDivElement>(null);

    const timeProgressData = useMemo(() => {
        const now = new Date();
        const dayPassed = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const percentage = (dayPassed / daysInMonth) * 100;
        return { dayPassed, daysInMonth, percentage };
    }, []);

    const remainingDays = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDate();
        const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return Math.max(1, totalDays - currentDay + 1);
    }, []);

    // Màu theo TIẾN ĐỘ (so với % ngày đã trôi qua trong tháng) — khác với colorSettings (ngưỡng % cố định),
    // chuẩn hoá với tone màu đậm nét, tương phản cao.
    const getHtColor = React.useCallback((htValue: number, hasTarget: boolean = true) => {
        if (!hasTarget) return '#94a3b8'; // slate-400 — chưa cấu hình target
        const progress = timeProgressData.percentage;
        if (htValue < progress) return '#dc2626'; // Đỏ đậm nổi bật
        if (htValue >= progress + 20) return '#059669'; // Emerald đậm nổi bật
        return '#ea580c'; // Cam đậm nổi bật
    }, [timeProgressData.percentage]);

    const getDynamicColor = React.useCallback((val: number, config: CriterionConfig) => {
        if (!config) return undefined;
        let color: string;
        if (val >= config.good.threshold) color = config.good.color;
        else if (val >= config.average.threshold) color = config.average.color;
        else color = config.bad.color;
        return toBoldVividColor(color);
    }, []);

    const { displayList } = useRevenueData({
        rows: activeRows,
        departmentNames,
        sortConfig,
        prevMonthRows: (isRealtimeMode || !isShowPrevMonth) ? [] : prevMonthRows,
        departmentWeights,
        deptEmployeeCounts,
        supermarketTarget,
        employeeInstallmentMap,
        viewMode,
        exportDeptFilter,
        isActive,
        bonusData,
        isRealtime: isRealtimeMode
    });

    const handleSort = (key: string) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'desc' ? 'asc' : 'desc' }));

    const handleHighlightToggle = React.useCallback((originalName: string) => {
        setHighlightedEmployees((prev: Set<string>) => { 
            const n = new Set(prev); 
            if (n.has(originalName)) n.delete(originalName); 
            else n.add(originalName); 
            return n; 
        });
    }, [setHighlightedEmployees]);

    const { showExportOptions } = useExportOptionsContext();

    type RevenueExportScope = 'all' | 'revenue' | 'performance';

    const handleExportPNG = async (
        scope: RevenueExportScope = 'all',
        customFilename?: string,
        autoAction?: 'download' | 'share' | 'cancel' | null
    ): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        
        try {
            const scopeSuffix = scope === 'revenue' ? ' - Nhóm Doanh Thu' : (scope === 'performance' ? ' - Nhóm Hiệu Suất' : '');
            const defaultName = isRealtimeMode
                ? `Doanh Thu Realtime${scopeSuffix} - ${supermarketName}.png`
                : `Báo Cáo Doanh Thu${scopeSuffix} - ${supermarketName}.png`;
            const safeName = customFilename || defaultName;

            const hideSelectors = ['.no-print', '.export-button-component'];
            if (scope === 'revenue') {
                hideSelectors.push('.export-col-performance');
            } else if (scope === 'performance') {
                hideSelectors.push('.export-col-revenue');
            }

            const blob = await exportElementAsImage(original, safeName, {
                mode: 'blob-only',
                elementsToHide: hideSelectors,
                isCompactTable: true,
                onCloneReady: (clone: HTMLElement) => {
                    if (scope === 'revenue' || scope === 'performance') {
                        const titleEl = clone.querySelector('.js-report-title');
                        if (titleEl) {
                            const badge = document.createElement('span');
                            badge.style.display = 'inline-block';
                            badge.style.marginLeft = '8px';
                            badge.style.padding = '2px 8px';
                            badge.style.borderRadius = '9999px';
                            badge.style.fontSize = '11px';
                            badge.style.fontWeight = 'bold';
                            badge.style.textTransform = 'uppercase';
                            badge.style.letterSpacing = '0.05em';
                            if (scope === 'revenue') {
                                badge.style.backgroundColor = '#e0f2fe';
                                badge.style.color = '#0369a1';
                                badge.style.border = '1px solid #7dd3fc';
                                badge.textContent = 'Nhóm Doanh Thu';
                            } else {
                                badge.style.backgroundColor = '#ecfdf5';
                                badge.style.color = '#047857';
                                badge.style.border = '1px solid #6ee7b7';
                                badge.textContent = 'Nhóm Hiệu Suất';
                            }
                            titleEl.appendChild(badge);
                        }
                    }
                }
            });
            if (blob) {
                if (autoAction === 'download') {
                    downloadBlob(blob, safeName);
                    return 'download';
                } else if (autoAction === 'share') {
                    await shareBlob(blob, safeName);
                    return 'share';
                } else {
                    return await showExportOptions(blob, safeName);
                }
            }
            return null;
        } catch (err) {
            console.error('Export error', err);
            return null;
        }
    };

    const exportOptions = useMemo<ExportOptionItem[]>(() => [
        {
            id: 'all',
            label: 'Xuất all (Tất cả)',
            sublabel: 'Đầy đủ nhóm Doanh thu & Hiệu suất',
            icon: <ImagesIcon className="h-4 w-4 text-sky-500" />,
            onSelect: async () => { await handleExportPNG('all'); }
        },
        {
            id: 'revenue',
            label: 'Xuất nhóm Doanh thu',
            sublabel: 'M.Tiêu, Thực, DTQĐ, D.Kiến, %D.Kiến',
            icon: <ChartBarIcon className="h-4 w-4 text-emerald-500" />,
            onSelect: async () => { await handleExportPNG('revenue'); }
        },
        {
            id: 'performance',
            label: 'Xuất nhóm Hiệu suất',
            sublabel: 'HQQĐ, % Trả chậm & Thưởng',
            icon: <SparklesIcon className="h-4 w-4 text-amber-500" />,
            onSelect: async () => { await handleExportPNG('performance'); }
        }
    ], [handleExportPNG, isRealtimeMode, supermarketName]);

    const handleBatchExportByDept = async () => {
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        if (allDepts.length === 0) return;

        setIsExportingByDept(true);
        setExportDeptProgress({ current: 0, total: allDepts.length });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        for (let i = 0; i < allDepts.length; i++) {
            const dept = allDepts[i] as string;
            setExportDeptFilter(dept);
            setExportDeptProgress({ current: i + 1, total: allDepts.length });
            await new Promise(r => setTimeout(r, 400));
            const safeDeptName = dept.replace(/[\\/:*?"<>|]/g, '');
            const action = await handleExportPNG('all', `Doanh Thu - ${safeDeptName} - ${supermarketName}.png`, autoAction);
            if (action === 'cancel') break;
            autoAction = action;
        }
        setExportDeptFilter(null);
        setIsExportingByDept(false);
    };

    
    // Tiêu đề dùng đúng cỡ chữ nhỏ gọn có sẵn của SectionHeader (text-sm lg:text-xl) thay vì tự
    // dựng span text-2xl font-black riêng — tránh tiêu đề bị to/nặng bất thường so với chuẩn thiết kế.
    // Vẫn giữ class js-report-title (ép font UTM Avo cho tiêu đề báo cáo, xem styles.css) trên cả
    // 2 span vì subtitle không còn là sibling liền kề của title trong SectionHeader.
    const cardTitle = isRealtimeMode ? (
        <span className="js-report-title flex items-center gap-2">
            <span>DOANH THU REALTIME</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-bold uppercase tracking-wider">Hôm nay</span>
        </span>
    ) : (
        <span className="js-report-title">Doanh thu đến ngày {getYesterdayDateString()}</span>
    );
    const cardSubtitle = <span className="js-report-title">Tôi không chạy theo doanh thu — doanh thu phản ánh đẳng cấp mà Tôi tạo ra.</span>;

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!supermarketName) return <Card bordered={false} title="Phân tích Nhân viên"><EmptyState icon={<UsersIcon className="h-6 w-6" />} title="Vui lòng chọn siêu thị" compact /></Card>;
    if (isLoading) return <Card bordered={false} title={cardTitle} subtitle={cardSubtitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-sky-500 animate-spin" /></div></Card>;

    return (
        <div ref={cardRef} className="space-y-0 bg-white dark:bg-slate-900">
            {/* 1. Tiêu đề lên TRÊN CÙNG */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm lg:text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide leading-tight">
                    {cardTitle}
                </h2>
                <div className="text-[11px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mt-1">
                    {cardSubtitle}
                </div>
            </div>

            {/* 2. Thanh nút gôm gọn lại ngay dưới tiêu đề */}
            <div className="flex flex-wrap justify-between items-center px-4 py-1.5 bg-slate-50/70 dark:bg-slate-800/40 no-print border-b border-slate-200 dark:border-slate-700 gap-2">
                <div className="flex gap-1.5 items-center">
                    {!isRealtimeMode && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                if (!prevMonthRaw) {
                                    setIsPrevMonthModalOpen(true);
                                } else {
                                    setIsShowPrevMonth(p => !p);
                                }
                            }}
                            title={!prevMonthRaw ? 'Nhập dữ liệu cùng kỳ' : (isShowPrevMonth ? 'Bấm để tắt so sánh cùng kỳ' : 'Bấm để bật so sánh cùng kỳ')}
                            className={`h-8 gap-1.5 px-2.5 text-xs transition-colors ${
                                prevMonthRaw
                                    ? isShowPrevMonth
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                        : 'bg-slate-100 border-slate-300 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <ClockIcon className={`h-3.5 w-3.5 ${prevMonthRaw && isShowPrevMonth ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">Cùng kỳ</span>
                            {prevMonthRaw && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    title="Xoá dữ liệu cùng kỳ"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPrevMonthRaw('');
                                        setIsShowPrevMonth(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setPrevMonthRaw('');
                                            setIsShowPrevMonth(true);
                                        }
                                    }}
                                    className="ml-0.5 p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors inline-flex items-center justify-center cursor-pointer"
                                >
                                    <XIcon className="h-3.5 w-3.5" />
                                </span>
                            )}
                        </Button>
                    )}
                    {!isRealtimeMode && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsShowRemaining(p => !p)}
                            className={`h-8 gap-1.5 px-2.5 text-xs ${isShowRemaining ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'text-slate-500'}`}
                        >
                            <span
                                aria-hidden="true"
                                className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${isShowRemaining ? 'bg-amber-600 border-amber-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                            >
                                {isShowRemaining && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                            </span>
                            <span>Còn lại</span>
                        </Button>
                    )}
                </div>
                <div className="flex gap-1.5 items-center">
                    {/* Nút chuyển chế độ REALTIME */}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsRealtimeMode(p => !p)}
                        className={`h-8 gap-1.5 px-2.5 text-xs font-bold transition-all ${
                            isRealtimeMode
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                        title={isRealtimeMode ? 'Đang xem Doanh thu Realtime (Bấm để xem Luỹ kế)' : 'Bấm để xem Doanh thu Realtime trong ngày'}
                    >
                        <span className={`w-2 h-2 rounded-full ${isRealtimeMode ? 'bg-white animate-pulse' : 'bg-amber-500'}`} />
                        <span>Realtime</span>
                    </Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'group' ? 'list' : 'group')}
                        title={viewMode === 'group' ? 'Đang xem theo Bộ phận (Bấm để xem Danh sách)' : 'Đang xem Danh sách (Bấm để xem theo Bộ phận)'}
                        className="h-8 w-8 text-sky-700 dark:text-sky-400"
                    >
                        {viewMode === 'group' ? <ViewGridIcon className="h-4 w-4" /> : <ViewListIcon className="h-4 w-4" />}
                    </Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBatchExportByDept}
                        disabled={isExportingByDept}
                        title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'}
                        className="h-8 w-8 text-slate-400"
                    >
                        {isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}
                    </Button>
                    <ExportButton options={exportOptions} />
                </div>
            </div>

            {/* 3. Tiến độ thời gian */}
            <div className="px-4 pt-3 pb-1">
                <TimeProgressBar isRealtime={isRealtimeMode} />
            </div>
                    {isRealtimeMode && activeRows.length === 0 && (
                        <div className="mx-4 my-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs sm:text-sm flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>Chưa có dữ liệu Doanh thu Realtime. Vui lòng vào mục <strong>Cập nhật &gt; Cấu hình siêu thị &amp; Nhân viên &gt; Dữ liệu</strong> (ô <strong>REALTIME</strong> của DOANH THU NHÂN VIÊN) để dán dữ liệu.</span>
                        </div>
                    )}
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <div className="border border-slate-200 dark:border-slate-700">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        {/* Tier 1: Group Headers */}
                                        <tr>
                                            <th rowSpan={2} className="px-2 py-1 text-center align-middle text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-[4px] border-l-slate-200 dark:border-l-slate-700 border-b border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors min-w-[190px]" onClick={() => handleSort('name')}>
                                                Nhân viên
                                            </th>
                                            <th colSpan={isRealtimeMode ? 4 : 5} className="export-col-revenue px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700">
                                                Doanh thu
                                            </th>
                                            {isShowRemaining && (
                                                <th colSpan={2} className="export-col-revenue px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700">
                                                    Còn lại {remainingDays} ngày
                                                </th>
                                            )}
                                            <th colSpan={isRealtimeMode ? 2 : 3} className="export-col-performance px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                                Hiệu suất
                                            </th>
                                        </tr>
                                        {/* Tier 2: Column Headers */}
                                        <tr>
                                            <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('target')}>M.Tiêu</th>
                                            <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('dtlk')}>Thực</th>
                                            {/* NỔI BẬT 1: DTQĐ */}
                                            <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-900 dark:text-sky-100 bg-sky-100 dark:bg-sky-950/70 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-200/80 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('dtqd')}>DTQĐ</th>
                                            {!isRealtimeMode && (
                                                <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('duKien')}>D.Kiến</th>
                                            )}
                                            <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('pctDkht')}>{isRealtimeMode ? '%HT' : '%D.KIẾN'}</th>
                                            {isShowRemaining && (
                                                <>
                                                    <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('remaining_total')}>Tổng</th>
                                                    <th className="export-col-revenue px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('remaining_daily')}>Ngày</th>
                                                </>
                                            )}
                                            {/* NỔI BẬT 2: HQQĐ */}
                                            <th className="export-col-performance px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-950/70 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('hqqd')}>HQQĐ</th>
                                            {/* NỔI BẬT 3: %T.Chậm */}
                                            <th className={`export-col-performance px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-950/70 ${!isRealtimeMode ? 'border-r' : ''} border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-amber-200/80 dark:hover:bg-amber-900/60 transition-colors`} onClick={() => handleSort('installment')}>%T.Chậm</th>
                                            {!isRealtimeMode && (
                                                <th className="export-col-performance px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('bonus_tong')}>Thưởng</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-900 font-black">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department' || row.type === 'total') {
                                            const isGrandTotal = row.type === 'total';
                                            const prev = row.prevCompData;
                                            const hasTarget = (row.calculatedTarget || 0) > 0;
                                            const rowStripeColor = isGrandTotal ? '#059669' : getDkhtColor(row.pctDkht, hasTarget);
                                            return (
                                                <tr
                                                    key={`${row.type}-${idx}`}
                                                    style={rowStripeColor ? { borderLeft: `4px solid ${rowStripeColor}` } : undefined}
                                                    className={`${rowStripeColor ? 'border-l-[4px]' : ''} ${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-slate-200 dark:border-slate-700`}
                                                >
                                                    <td className={`px-2 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center font-black' : 'border-slate-200 dark:border-slate-700 font-extrabold'} whitespace-nowrap min-w-[190px]`}>{row.name}</td>
                                                    <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold`}>
                                                        <div>{f.format(roundUp(row.calculatedTarget))}</div>
                                                        <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
                                                    </td>
                                                    <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                        <div>{f.format(roundUp(row.dtlk))}</div>
                                                        <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
                                                    </td>
                                                    {/* NỔI BẬT 1: DTQĐ */}
                                                    <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[14px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold bg-sky-50/70 dark:bg-sky-950/30`}>
                                                        <div className="font-bold text-[13px]" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion, hasTarget) }}>{f.format(roundUp(row.dtqd))}</div>
                                                        <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                    </td>
                                                    {!isRealtimeMode && (
                                                        <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-extrabold`}>
                                                            <div>{f.format(roundUp(row.duKien || 0))}</div>
                                                            <DeltaBadge current={row.duKien} previous={prev?.duKien} isCurrency />
                                                        </td>
                                                    )}
                                                    <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`} style={{ color: isGrandTotal ? undefined : getDkhtColor(row.pctDkht || 0, hasTarget) }}>
                                                        <div className="font-bold">{hasTarget ? `${roundUp(row.pctDkht || 0)}%` : '—'}</div>
                                                        <DeltaBadge current={row.pctDkht} previous={prev?.dkht} isPercent />
                                                    </td>
                                                    {isShowRemaining && (
                                                        <>
                                                            <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 bg-amber-50/10 dark:bg-amber-950/5 text-slate-500 dark:text-slate-400 font-bold`}>
                                                                <div>{f.format(roundUp(row.remaining_total || 0))}</div>
                                                            </td>
                                                            <td className={`export-col-revenue px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 bg-amber-50/10 dark:bg-amber-950/5 text-amber-700 dark:text-amber-400 font-bold`}>
                                                                <div>{f.format(roundUp(row.remaining_daily || 0))}</div>
                                                            </td>
                                                        </>
                                                    )}
                                                    {/* NỔI BẬT 2: HQQĐ */}
                                                    <td className={`export-col-performance px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold bg-emerald-50/60 dark:bg-emerald-950/20`}>
                                                        <div className="font-bold" style={{ color: getMetricColorByTarget(isNaN(row.hieuQuaQD) ? 0 : row.hieuQuaQD * 100, targetQuyDoi) }}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                                                        <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                    </td>
                                                    {/* NỔI BẬT 3: %T.Chậm */}
                                                    <td className={`export-col-performance px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center ${!isRealtimeMode ? 'border-r' : ''} tabular-nums border-slate-200 dark:border-slate-700 font-bold bg-amber-50/60 dark:bg-amber-950/20`} style={{ color: getMetricColorByTarget(row.calculatedInstallment, targetTraGop) }}>
                                                        <div className="font-bold">{roundUp(row.calculatedInstallment)}%</div>
                                                        <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                    </td>
                                                    {!isRealtimeMode && (
                                                        <td className={`export-col-performance px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                            <div>{row.bonus_tong ? f.format(Math.ceil(row.bonus_tong / 1000)) : '-'}</div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        }
                                         const isHighlighted = highlightedEmployees.has(row.originalName || '');

                                         return (
                                             <RevenueDesktopRow
                                                 key={row.originalName}
                                                 row={row}
                                                 isHighlighted={isHighlighted}
                                                 onHighlightToggle={handleHighlightToggle}
                                                 supermarketName={supermarketName}
                                                 colorSettings={colorSettings}
                                                 getHtColor={getHtColor}
                                                 getDynamicColor={getDynamicColor}
                                                 getDkhtColor={getDkhtColor}
                                                 isShowRemaining={isShowRemaining}
                                                 targetTraGop={targetTraGop}
                                                 targetQuyDoi={targetQuyDoi}
                                                 isRealtimeMode={isRealtimeMode}
                                             />
                                         );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
            <ImportPrevMonthModal
                isOpen={isPrevMonthModalOpen}
                onClose={() => setIsPrevMonthModalOpen(false)}
                onSave={(data) => {
                    setPrevMonthRaw(data);
                    setIsShowPrevMonth(true);
                }}
            />
        </div>
    );
};

export default React.memo(RevenueView);
