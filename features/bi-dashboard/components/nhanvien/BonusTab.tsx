
import React, { useRef, useCallback } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { UploadIcon, ViewListIcon, ViewGridIcon } from '../Icons';
import { CalendarDays, CalendarRange, Table2, ArrowLeftRight } from 'lucide-react';
import { Dropdown, DropdownItem } from '../../../../components/shared/ui/Dropdown';
import { MonthlyBonusTable } from './bonus/MonthlyBonusTable';
import { Employee, BonusMetrics, RevenueRow } from '../../types/nhanVienTypes';
import { getYesterdayDateString } from '../../utils/nhanVienHelpers';

import { Button } from '../../../../components/shared/ui/Button';
import { exportElementAsImage } from '../../services/uiService';
import TimeProgressBar from './shared/TimeProgressBar';
import { AutoBonusPanel } from './bonus/AutoBonusPanel';
import { UseBonusAutoBridgeResult } from '../../hooks/useBonusAutoBridge';
import { UseMultiMonthBonusRunResult } from '../../hooks/useMultiMonthBonusRun';
import { setHrmWindowRef } from './bonus/hrmWindow';
import { useBonusViewData, BonusPeriodMode } from './bonus/useBonusViewData';
import { BonusDailyTable } from './bonus/BonusDailyTable';
import { BonusGroupListTable } from './bonus/BonusGroupListTable';
import { BonusCompareTable } from './bonus/BonusCompareTable';
import { formatShortRange } from '../../utils/bonusDateRange';

export { BonusDataModal } from './bonus/BonusDataModal';
export type { BonusDisplayRow } from './bonus/BonusDisplayRow';

// Menu chế độ xem theo thời gian — thay cho nút xoay vòng cũ (phải bấm 3 lần mới về chế độ
// muốn xem, tooltip lại mô tả chế độ KẾ TIẾP nên dễ nhầm). Thứ tự = từ chi tiết đến tổng quát.
const PERIOD_MODES: { id: BonusPeriodMode; label: string; description: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'summary', label: 'Tổng hợp kỳ', description: 'ERP · T.Nóng · Tổng · Dự kiến', Icon: Table2 },
    { id: 'daily', label: 'Xem theo ngày', description: 'Từng ngày, gom theo tuần', Icon: CalendarDays },
    { id: 'monthly', label: 'Luỹ kế tháng', description: '6 tháng gần nhất, cột mỗi tháng', Icon: CalendarRange },
    { id: 'compare', label: 'So sánh cùng kỳ', description: 'Kỳ này vs cùng kỳ tháng trước', Icon: ArrowLeftRight },
];

export const BonusView: React.FC<{
    employees: Employee[];
    bonusData: Record<string, BonusMetrics | null>;
    revenueRows: RevenueRow[];
    supermarketName: string;
    activeSupermarkets: string[];
    onEmployeeClick: (emp: Employee) => void;
    onBatchUpdate: () => void;
    autoBridge: UseBonusAutoBridgeResult;
    multiMonthRun: UseMultiMonthBonusRunResult;
    bonusPeriodLabel: string | null;
    onSetBonusPeriodLabel: (label: string) => void;
    highlightedEmployees: Set<string>;
    activeDepartments: string[];
    isActive?: boolean;
}> = React.memo(({
    employees, bonusData, revenueRows, supermarketName, activeSupermarkets, onEmployeeClick, onBatchUpdate, autoBridge, multiMonthRun,
    bonusPeriodLabel, onSetBonusPeriodLabel, highlightedEmployees, activeDepartments, isActive
}) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const {
        sortField, setSortField, sortDir, setSortDir,
        viewMode, setViewMode,
        periodMode, setPeriodMode,
        isDaily, isMonthly, isCompare,
        expandedWeeks, toggleWeek,
        monthlyArchive, monthlyEmployees, compareData,
        allDates, weeks, weekAverages, weekStats, colStats,
        avgTong, avgWeeksBelowAvg, avgBelowAvgDays,
        revenueMap, displayList,
        getWeekTotalForEmployee, getWeekGrandTotal, getWeekDeptTotal,
        getEmployeeWeeksBelowAvgCount,
    } = useBonusViewData({ employees, bonusData, revenueRows, activeSupermarkets, activeDepartments, isActive });

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string) => {
        if (!cardRef.current) return;
        const original = cardRef.current;

        try {
            const safeName = customFilename || `Báo Cáo Thưởng - ${supermarketName}.png`;
            const blob = await exportElementAsImage(original, safeName, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
            });
            if (blob) showExportOptions(blob, safeName);
        } catch (err) {
            console.error('Export error', err);
        }
    };

    // Nhãn kỳ hiện tại — thay đổi theo lựa chọn Hiện tại/Tháng/Năm/Khoảng thời gian của
    // chế độ Tự động; chưa từng chạy Tự động (hoặc chỉ dùng Thủ công) -> fallback mặc định.
    // Chế độ So sánh: tiêu đề lấy thẳng từ 2 kỳ trong kho compare (VD "SO SÁNH 01→21/8 VS 01→21/9").
    const compareTitle = isCompare && compareData.current && compareData.previous
        ? `SO SÁNH ${formatShortRange(compareData.previous)} VS ${formatShortRange(compareData.current)}`
        : null;
    const reportTitleSuffix = compareTitle || bonusPeriodLabel || `ĐẾN NGÀY ${getYesterdayDateString()}`;

    const activePeriodMode = PERIOD_MODES.find(m => m.id === periodMode) || PERIOD_MODES[0];
    const periodModeItems: DropdownItem[] = PERIOD_MODES.map(m => ({
        id: m.id,
        label: m.label,
        description: m.description,
        icon: <m.Icon className="h-4 w-4" />,
        active: m.id === periodMode,
    }));
    const handleSelectPeriodMode = useCallback((id: string) => setPeriodMode(id as BonusPeriodMode), [setPeriodMode]);
    // Lượt "So sánh cùng kỳ" chạy xong đủ 2 kỳ -> tự chuyển sang bảng so sánh để người dùng thấy ngay.
    const handleCompareDone = useCallback(() => setPeriodMode('compare'), [setPeriodMode]);
    const cardTitle = <span className="js-report-title">Hiệu suất làm việc {reportTitleSuffix}</span>;
    const cardSubtitle = <span className="js-report-title">Quản lý tốt thưởng là quản lý tốt động lực của nhân viên.</span>;

    if (isActive === false) {
        return <div className="hidden" />;
    }

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
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setHrmWindowRef(window.open('https://newinsite.thegioididong.com/office/thuong-nhan-vien', '_blank')); onBatchUpdate(); }}
                        className="h-8 gap-1.5 px-2.5 text-xs bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 active:scale-95"
                    >
                        <UploadIcon className="h-3.5 w-3.5" />
                        <span>Thủ công</span>
                    </Button>
                    <AutoBonusPanel autoBridge={autoBridge} multiMonthRun={multiMonthRun} employeeCount={employees.length} onUseManual={onBatchUpdate} onPeriodLabelChange={onSetBonusPeriodLabel} onCompareDone={handleCompareDone} />
                </div>
                <div className="flex gap-1.5 items-center">
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
                    <Dropdown
                        align="right"
                        width="240px"
                        items={periodModeItems}
                        onSelect={handleSelectPeriodMode}
                        trigger={
                            // Dropdown đã bọc trigger trong div[role=button] — không lồng <Button> thật bên
                            // trong (2 phần tử tương tác lồng nhau); span này chỉ mượn style ghost/icon.
                            <span
                                title={`Chế độ xem: ${activePeriodMode.label} (bấm để chọn chế độ khác)`}
                                aria-label="Chọn chế độ xem"
                                data-testid="bonus-period-mode-trigger"
                                className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${periodMode === 'summary' ? 'text-slate-400' : 'text-sky-700'}`}
                            >
                                <activePeriodMode.Icon className="h-4 w-4" />
                            </span>
                        }
                    />
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>

            {/* 3. Tiến độ thời gian */}
            <div className="px-4 pt-3 pb-1">
                <TimeProgressBar />
            </div>

            {/* 4. Bảng thưởng */}
            <div className="w-full overflow-hidden px-4 pb-4">
                <div className="overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch border border-slate-200 dark:border-slate-700">
                        {isCompare ? (
                            <BonusCompareTable
                                employees={monthlyEmployees}
                                current={compareData.current}
                                previous={compareData.previous}
                                loading={compareData.loading}
                                supermarketName={supermarketName}
                                highlightedEmployees={highlightedEmployees}
                                onEmployeeClick={onEmployeeClick}
                                f={f}
                                viewMode={viewMode}
                            />
                        ) : isMonthly ? (
                            <MonthlyBonusTable
                                employees={monthlyEmployees}
                                months={monthlyArchive.months}
                                dataByMonth={monthlyArchive.dataByMonth}
                                loading={monthlyArchive.loading}
                                supermarketName={supermarketName}
                                selectedYear={monthlyArchive.selectedYear}
                                onSelectYear={monthlyArchive.setSelectedYear}
                                availableYears={monthlyArchive.availableYears}
                                viewMode={viewMode}
                            />
                        ) : isDaily ? (
                            <BonusDailyTable
                                allDates={allDates}
                                weeks={weeks}
                                expandedWeeks={expandedWeeks}
                                toggleWeek={toggleWeek}
                                sortField={sortField}
                                sortDir={sortDir}
                                setSortField={setSortField}
                                setSortDir={setSortDir}
                                displayList={displayList}
                                employees={employees}
                                bonusData={bonusData}
                                colStats={colStats}
                                weekAverages={weekAverages}
                                weekStats={weekStats}
                                avgTong={avgTong}
                                avgWeeksBelowAvg={avgWeeksBelowAvg}
                                avgBelowAvgDays={avgBelowAvgDays}
                                getWeekGrandTotal={getWeekGrandTotal}
                                getWeekDeptTotal={getWeekDeptTotal}
                                getWeekTotalForEmployee={getWeekTotalForEmployee}
                                getEmployeeWeeksBelowAvgCount={getEmployeeWeeksBelowAvgCount}
                                highlightedEmployees={highlightedEmployees}
                                onEmployeeClick={onEmployeeClick}
                                supermarketName={supermarketName}
                                f={f}
                            />
                        ) : (
                            <BonusGroupListTable
                                displayList={displayList}
                                sortField={sortField}
                                sortDir={sortDir}
                                setSortField={setSortField}
                                setSortDir={setSortDir}
                                highlightedEmployees={highlightedEmployees}
                                bonusData={bonusData}
                                revenueMap={revenueMap}
                                onEmployeeClick={onEmployeeClick}
                                f={f}
                                supermarketName={supermarketName}
                            />
                        )}
                        </div>
                    </div>
        </div>
    );
});
