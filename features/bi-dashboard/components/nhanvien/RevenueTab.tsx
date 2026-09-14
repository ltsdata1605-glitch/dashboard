
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { SpinnerIcon, UsersIcon, XIcon, ViewListIcon, ViewGridIcon, ClockIcon, DownloadAllIcon, CheckCircleIcon } from '../Icons';
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
    supermarketName: string;
    activeSupermarkets?: string[];
    departmentNames: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    supermarketTarget: number;
    departmentWeights: Record<string, number>;
    deptEmployeeCounts: Record<string, number>;
    employeeInstallmentMap: Map<string, number>;
    isActive?: boolean;
    bonusData?: Record<string, BonusMetrics | null>;
}> = ({
    rows, supermarketName, activeSupermarkets, departmentNames,
    highlightedEmployees, setHighlightedEmployees,
    supermarketTarget, departmentWeights, deptEmployeeCounts, employeeInstallmentMap,
    isActive,
    bonusData
}) => {
    const [isLoading, setIsLoading] = useState(supermarketName && rows.length === 0);
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
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-revenue-${supermarketName}`, '');
    const prevMonthRows = useMemo(() => {
        if (isActive === false) return [];
        return parseRevenueData(prevMonthRaw);
    }, [prevMonthRaw, isActive]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });

    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setIsLoading(!!(supermarketName && rows.length === 0)); }, [rows, supermarketName]);

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
        rows,
        departmentNames,
        sortConfig,
        prevMonthRows,
        departmentWeights,
        deptEmployeeCounts,
        supermarketTarget,
        employeeInstallmentMap,
        viewMode,
        exportDeptFilter,
        isActive,
        bonusData
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

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        
        try {
            const safeName = customFilename || `Báo Cáo Doanh Thu Nhân Viên - ${supermarketName}.png`;
            const blob = await exportElementAsImage(original, safeName, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component'], isCompactTable: true
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
            const action = await handleExportPNG(`Doanh Thu - ${safeDeptName} - ${supermarketName}.png`, autoAction);
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
    const cardTitle = <span className="js-report-title">Doanh thu đến ngày {getYesterdayDateString()}</span>;
    const cardSubtitle = <span className="js-report-title">Tôi không chạy theo doanh thu — doanh thu phản ánh đẳng cấp mà Tôi tạo ra.</span>;

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!supermarketName) return <Card bordered={false} title="Phân tích Nhân viên"><EmptyState icon={<UsersIcon className="h-6 w-6" />} title="Vui lòng chọn siêu thị" compact /></Card>;
    if (isLoading) return <Card bordered={false} title={cardTitle} subtitle={cardSubtitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-sky-500 animate-spin" /></div></Card>;

    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white no-print border-b border-slate-200 gap-3">
                <div className="flex gap-2 items-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsPrevMonthModalOpen(true)}
                        className={`gap-1.5 ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'text-slate-500'}`}
                    >
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cùng kỳ</span>
                        {prevMonthRaw && (
                            <Button variant="ghost" size="none" onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 rounded hover:bg-emerald-200">
                                <XIcon className="h-3 w-3" />
                            </Button>
                        )}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsShowRemaining(p => !p)}
                        className={`gap-1.5 ${isShowRemaining ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'text-slate-500'}`}
                    >
                        {/* Trạng thái bật/tắt do Button cha xử lý onClick — dùng span trang trí thay <input type="checkbox">
                            thật để tránh 1 phần tử form không tương tác trực tiếp được (RULES.md §2.5). */}
                        <span
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${isShowRemaining ? 'bg-amber-600 border-amber-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                        >
                            {isShowRemaining && <CheckCircleIcon className="h-3 w-3 text-white" />}
                        </span>
                        <span>Còn lại</span>
                    </Button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'group' ? 'list' : 'group')}
                        title={viewMode === 'group' ? 'Đang xem theo Bộ phận (Bấm để xem Danh sách)' : 'Đang xem Danh sách (Bấm để xem theo Bộ phận)'}
                        className="text-sky-700 dark:text-sky-400"
                    >
                        {viewMode === 'group' ? <ViewGridIcon className="h-4 w-4" /> : <ViewListIcon className="h-4 w-4" />}
                    </Button>
                    <div className="h-4 w-px bg-slate-200 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBatchExportByDept}
                        disabled={isExportingByDept}
                        title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'}
                        className="text-slate-400"
                    >
                        {isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}
                    </Button>
                    <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding bordered={false} title={cardTitle} subtitle={cardSubtitle} rounded={false}>
                    <div className="px-4 pt-3 pb-1">
                        <TimeProgressBar />
                    </div>
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
                                            <th colSpan={5} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700">
                                                Doanh thu
                                            </th>
                                            {isShowRemaining && (
                                                <th colSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700">
                                                    Còn lại {remainingDays} ngày
                                                </th>
                                            )}
                                            <th colSpan={3} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                                Hiệu suất
                                            </th>
                                        </tr>
                                        {/* Tier 2: Column Headers */}
                                        <tr>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-sky-900/50 transition-colors" onClick={() => handleSort('target')}>M.Tiêu {sortConfig.key === 'target' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-sky-900/50 transition-colors" onClick={() => handleSort('dtlk')}>Thực {sortConfig.key === 'dtlk' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-black uppercase tracking-wider text-sky-800 dark:text-sky-200 bg-sky-100/90 dark:bg-sky-950/60 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-200/80 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('dtqd')}>DTQĐ {sortConfig.key === 'dtqd' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-sky-900/50 transition-colors" onClick={() => handleSort('duKien')}>D.Kiến {sortConfig.key === 'duKien' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-sky-900/50 transition-colors" onClick={() => handleSort('pctDkht')}>%D.KIẾN {sortConfig.key === 'pctDkht' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            {isShowRemaining && (
                                                <>
                                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-amber-900/50 transition-colors" onClick={() => handleSort('remaining_total')}>Tổng {sortConfig.key === 'remaining_total' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-amber-900/50 transition-colors" onClick={() => handleSort('remaining_daily')}>Ngày {sortConfig.key === 'remaining_daily' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                                </>
                                            )}
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-emerald-900/50 transition-colors" onClick={() => handleSort('hqqd')}>HQQĐ {sortConfig.key === 'hqqd' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-emerald-900/50 transition-colors" onClick={() => handleSort('installment')}>%T.Chậm {sortConfig.key === 'installment' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-emerald-900/50 transition-colors" onClick={() => handleSort('bonus_tong')}>Thưởng {sortConfig.key === 'bonus_tong' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
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
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold`}>
                                                        <div>{f.format(roundUp(row.calculatedTarget))}</div>
                                                        <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                        <div>{f.format(roundUp(row.dtlk))}</div>
                                                        <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[14px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-black bg-sky-50/70 dark:bg-sky-950/30`}>
                                                        <div className="font-black text-[13.5px] sm:text-[14px]" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion, hasTarget) }}>{f.format(roundUp(row.dtqd))}</div>
                                                        <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-extrabold`}>
                                                        <div>{f.format(roundUp(row.duKien || 0))}</div>
                                                        <DeltaBadge current={row.duKien} previous={prev?.duKien} isCurrency />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`} style={{ color: isGrandTotal ? undefined : getDkhtColor(row.pctDkht || 0, hasTarget) }}>
                                                         <div>{hasTarget ? `${roundUp(row.pctDkht || 0)}%` : '—'}</div>
                                                         <DeltaBadge current={row.pctDkht} previous={prev?.dkht} isPercent />
                                                     </td>
                                                     {isShowRemaining && (
                                                         <>
                                                             <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 bg-amber-50/10 dark:bg-amber-950/5 text-slate-500 dark:text-slate-400 font-bold`}>
                                                                 <div>{f.format(roundUp(row.remaining_total || 0))}</div>
                                                             </td>
                                                             <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 bg-amber-50/10 dark:bg-amber-950/5 text-amber-700 dark:text-amber-400 font-bold`}>
                                                                 <div>{f.format(roundUp(row.remaining_daily || 0))}</div>
                                                             </td>
                                                         </>
                                                     )}
                                                     <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                         <div style={{ color: getMetricColorByTarget(isNaN(row.hieuQuaQD) ? 0 : row.hieuQuaQD * 100, targetQuyDoi) }}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                                                         <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                     </td>
                                                     <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`} style={{ color: getMetricColorByTarget(row.calculatedInstallment, targetTraGop) }}>
                                                         <div>{roundUp(row.calculatedInstallment)}%</div>
                                                         <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                     </td>
                                                     <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                         <div>{row.bonus_tong ? f.format(Math.ceil(row.bonus_tong / 1000)) : '-'}</div>
                                                     </td>
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
                                             />
                                         );
                                    })}
                                </tbody>
                            </table>
                            </div>
                    </div>
                    </div>
                </Card>
            </div>
            <ImportPrevMonthModal isOpen={isPrevMonthModalOpen} onClose={() => setIsPrevMonthModalOpen(false)} onSave={setPrevMonthRaw} />
        </div>
    );
};

export default React.memo(RevenueView);
