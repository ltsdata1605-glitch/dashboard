
import React, { useRef } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { UploadIcon, ViewListIcon, ViewGridIcon, CalendarIcon } from '../Icons';
import { CalendarRange } from 'lucide-react';
import { MonthlyBonusTable } from './bonus/MonthlyBonusTable';
import { Employee, BonusMetrics, RevenueRow } from '../../types/nhanVienTypes';
import { getYesterdayDateString } from '../../utils/nhanVienHelpers';

import { Button } from '../../../../components/shared/ui/Button';
import { exportElementAsImage } from '../../services/uiService';
import { BonusMobileCard } from './bonus/BonusMobileCard';
import TimeProgressBar from './shared/TimeProgressBar';
import { AutoBonusPanel } from './bonus/AutoBonusPanel';
import { UseBonusAutoBridgeResult } from '../../hooks/useBonusAutoBridge';
import { UseMultiMonthBonusRunResult } from '../../hooks/useMultiMonthBonusRun';
import { getCellColor, isUpdatedToday } from './bonus/bonusTableHelpers';
import { setHrmWindowRef } from './bonus/hrmWindow';
import { useBonusViewData } from './bonus/useBonusViewData';
import { BonusDailyTable } from './bonus/BonusDailyTable';
import { BonusGroupListTable } from './bonus/BonusGroupListTable';

export { BonusDataModal } from './bonus/BonusDataModal';
export type { BonusDisplayRow } from './bonus/BonusDisplayRow';

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
        isDaily, setIsDaily,
        isMonthly, setIsMonthly,
        expandedWeeks, toggleWeek,
        monthlyArchive, monthlyEmployees,
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
            const safeName = customFilename || `Bonus_Report_${supermarketName}.png`;
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
    const reportTitleSuffix = bonusPeriodLabel || `ĐẾN NGÀY ${getYesterdayDateString()}`;
    const cardTitle = <span className="js-report-title">Hiệu suất làm việc {reportTitleSuffix}</span>;
    const cardSubtitle = <span className="js-report-title">Quản lý tốt thưởng là quản lý tốt động lực của nhân viên.</span>;

    const isMobile = false; // Always show table view, even on mobile

    if (isActive === false) {
        return <div className="hidden" />;
    }

    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-3 items-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setHrmWindowRef(window.open('https://newinsite.thegioididong.com/office/thuong-nhan-vien', '_blank')); onBatchUpdate(); }}
                        className="gap-1.5 bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 active:scale-95"
                    >
                        <UploadIcon className="h-3.5 w-3.5" />
                        <span>Thủ công</span>
                    </Button>
                    <AutoBonusPanel autoBridge={autoBridge} multiMonthRun={multiMonthRun} employeeCount={employees.length} onUseManual={onBatchUpdate} onPeriodLabelChange={onSetBonusPeriodLabel} />
                </div>
                <div className="flex gap-1.5 items-center">
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('group')} title="Bộ phận" className={viewMode === 'group' ? 'text-sky-600' : 'text-slate-400'}><ViewGridIcon className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} title="Danh sách" className={viewMode === 'list' ? 'text-sky-600' : 'text-slate-400'}><ViewListIcon className="h-4 w-4"/></Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="ghost" size="icon" onClick={() => { setIsDaily(prev => !prev); setIsMonthly(false); }} title="Xem theo ngày" className={isDaily ? 'text-sky-600' : 'text-slate-400'}><CalendarIcon className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setIsMonthly(prev => !prev); setIsDaily(false); }} title="Luỹ kế tháng" className={isMonthly ? 'text-sky-700' : 'text-slate-400'}><CalendarRange className="h-4 w-4"/></Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding bordered={false} rounded={false} title={cardTitle} subtitle={cardSubtitle} icon="award">
                    <div className="px-4 pt-3 pb-1">
                        <TimeProgressBar />
                    </div>
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch border border-slate-200 dark:border-slate-700">
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {displayList.map((item, idx) => {
                                    if (item.type === 'department' || item.type === 'total') {
                                        const isGrandTotal = item.type === 'total';
                                        return (
                                            <div key={`${item.type}-${idx}`} className={`px-4 py-3 ${isGrandTotal ? 'bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-xs font-black uppercase tracking-wider ${isGrandTotal ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{item.name}</span>
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Dự Kiến</span>
                                                        <span className={`text-sm font-black tabular-nums leading-none ${isGrandTotal ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-500'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-1.5 mt-2">
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">DTQĐ</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(item.sumDtqd)}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">ERP</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(Math.ceil(item.sumErp / 1000))}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">T.Nóng</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(Math.ceil(item.sumTnong / 1000))}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tổng</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(Math.ceil(item.sumTong / 1000))}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const isHighlighted = highlightedEmployees.has(item.originalName);
                                    const bonus = bonusData[item.originalName], rev = revenueMap.get(item.originalName);
                                    const dtqdVal = rev?.dtqd || 0, hqqdVal = rev ? (rev.hieuQuaQD * 100) : 0, erpVal = bonus?.erp || 0, tnongVal = bonus?.tNong || 0, pnongVal = bonus?.pNong || 0, tongVal = bonus?.tong || 0, dkienVal = bonus?.dKien || 0;
                                    const isStale = !isUpdatedToday(bonus?.updatedAt);

                                    return (
                                        <BonusMobileCard
                                            key={item.originalName}
                                            item={item}
                                            isHighlighted={isHighlighted}
                                            isStale={isStale}
                                            dtqdVal={dtqdVal}
                                            hqqdVal={hqqdVal}
                                            erpVal={erpVal}
                                            tnongVal={tnongVal}
                                            pnongVal={pnongVal}
                                            tongVal={tongVal}
                                            dkienVal={dkienVal}
                                            onEmployeeClick={onEmployeeClick}
                                            getCellColor={getCellColor}
                                            f={f}
                                            supermarketName={supermarketName}
                                        />
                                    );
                                })}
                            </div>
                        ) : isMonthly ? (
                            <MonthlyBonusTable
                                employees={monthlyEmployees}
                                months={monthlyArchive.months}
                                dataByMonth={monthlyArchive.dataByMonth}
                                loading={monthlyArchive.loading}
                                supermarketName={supermarketName}
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
                </Card>
            </div>
        </div>
    );
});
