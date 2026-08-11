import React, { useMemo } from 'react';
import { Employee, BonusMetrics } from '../../../types/nhanVienTypes';
import { onActivateKey } from '../../../../../components/shared/ui';
import { EmptyState } from '../../../../../components/shared/ui/EmptyState';
import AvatarDisplay from '../shared/AvatarDisplay';
import { MedalBadge, getWeekdayAbbr, isUpdatedToday } from './bonusTableHelpers';
import { BonusDisplayRow } from './BonusDisplayRow';

interface Week { id: string; name: string; dates: string[] }

interface BonusDailyTableProps {
    allDates: string[];
    weeks: Week[];
    expandedWeeks: Record<string, boolean>;
    toggleWeek: (weekId: string) => void;
    sortField: string;
    sortDir: 'asc' | 'desc';
    setSortField: (field: string) => void;
    setSortDir: (updater: (d: 'asc' | 'desc') => 'asc' | 'desc') => void;
    displayList: BonusDisplayRow[];
    employees: Employee[];
    bonusData: Record<string, BonusMetrics | null>;
    colStats: Record<string, { avg: number; top3Threshold: number }>;
    weekAverages: Record<string, number>;
    weekStats: Record<string, { top3Threshold: number }>;
    avgTong: number;
    avgWeeksBelowAvg: number;
    avgBelowAvgDays: number;
    getWeekGrandTotal: (weekDates: string[]) => number;
    getWeekDeptTotal: (deptEmployees: Employee[], weekDates: string[]) => number;
    getWeekTotalForEmployee: (employeeName: string, weekDates: string[]) => number;
    getEmployeeWeeksBelowAvgCount: (employeeName: string) => number;
    highlightedEmployees: Set<string>;
    onEmployeeClick: (emp: Employee) => void;
    supermarketName: string;
    f: Intl.NumberFormat;
}

export const BonusDailyTable: React.FC<BonusDailyTableProps> = ({
    allDates, weeks, expandedWeeks, toggleWeek, sortField, sortDir, setSortField, setSortDir,
    displayList, employees, bonusData, colStats, weekAverages, weekStats,
    avgTong, avgWeeksBelowAvg, avgBelowAvgDays,
    getWeekGrandTotal, getWeekDeptTotal, getWeekTotalForEmployee, getEmployeeWeeksBelowAvgCount,
    highlightedEmployees, onEmployeeClick, supermarketName, f,
}) => {
    // Tính trước "cuối tuần" (Thứ 6/7/CN theo quy ước hoa hồng của module này) cho mỗi ngày 1 lần,
    // thay vì tạo lại Date + gọi getDay() cho từng ô (N nhân viên × M ngày) mỗi lần render.
    const isWeekendMap = useMemo(() => {
        const map = new Map<string, boolean>();
        allDates.forEach(dateStr => {
            const [d, m, y] = dateStr.split('/').map(Number);
            const day = new Date(y, m - 1, d).getDay();
            map.set(dateStr, day === 5 || day === 6 || day === 0);
        });
        return map;
    }, [allDates]);

    if (allDates.length === 0) {
        return (
            <EmptyState
                title="Không có dữ liệu theo ngày"
                description='Hãy nhấn "Thủ công" để tải lên bảng HRM chứa dữ liệu theo ngày.'
            />
        );
    }

    return (
        <table className="w-full border-collapse compact-export-table">
            <thead className="sticky top-0 z-10">
                <tr>
                    <th rowSpan={2} className="px-2 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 align-middle">Nhân viên</th>
                    <th
                        rowSpan={2}
                        onClick={() => {
                            setSortField('tong');
                            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        }}
                        className="px-2 py-2 text-center text-[11px] font-black uppercase tracking-wider text-sky-600 dark:bg-slate-800 dark:text-sky-400 bg-slate-50 border-r border-b border-slate-200 dark:border-slate-700 align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Tổng {sortField === 'tong' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                        rowSpan={2}
                        onClick={() => {
                            setSortField('weekBelowAvg');
                            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        }}
                        className="px-2 py-2 text-center text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Số tuần có thưởng < Trung bình tuần"
                    >
                        Tuần &lt;TB {sortField === 'weekBelowAvg' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                        rowSpan={2}
                        onClick={() => {
                            setSortField('belowAvgDays');
                            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        }}
                        className="px-2 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Số ngày có thu nhập dưới trung bình"
                    >
                        Ngày &lt;TB {sortField === 'belowAvgDays' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    {weeks.map(week => {
                        const isExpanded = expandedWeeks[week.id];
                        if (!isExpanded) {
                            return (
                                <th
                                    key={week.id}
                                    rowSpan={2}
                                    onClick={() => {
                                        setSortField(`week:${week.id}`);
                                        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    }}
                                    className="px-2 py-2 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50/5 dark:bg-sky-950/20 border-r border-b border-slate-200 dark:border-slate-700 align-middle cursor-pointer hover:bg-sky-100/50 dark:hover:bg-sky-900/30 select-none"
                                >
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleWeek(week.id);
                                        }}
                                        className="cursor-pointer hover:underline border-b border-dashed border-sky-400"
                                        title={`Click chữ để mở rộng ${week.name}, click bên ngoài để sắp xếp`}
                                    >
                                        {week.name}
                                    </span>
                                </th>
                            );
                        } else {
                            return (
                                <th
                                    key={week.id}
                                    colSpan={week.dates.length}
                                    className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b border-slate-200 dark:border-slate-700 align-middle select-none"
                                >
                                    <span
                                        onClick={() => toggleWeek(week.id)}
                                        className="cursor-pointer hover:underline border-b border-dashed border-sky-400"
                                        title="Click chữ để thu gọn tuần"
                                    >
                                        {week.name}
                                    </span>
                                </th>
                            );
                        }
                    })}
                </tr>
                <tr>
                    {weeks.map(week => {
                        const isExpanded = expandedWeeks[week.id];
                        if (!isExpanded) return null;
                        const weekDates = week.dates;
                        return weekDates.map(dateStr => {
                            const [d, m] = dateStr.split('/');
                            const isWeekend = isWeekendMap.get(dateStr) ?? false;
                            const headerBgClass = isWeekend
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300';
                            const isSortingThisDate = sortField === `date:${dateStr}`;
                            return (
                                <th
                                    key={dateStr}
                                    onClick={() => {
                                        setSortField(`date:${dateStr}`);
                                        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    }}
                                    className={`px-1 py-1 text-center text-[10px] font-bold uppercase border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity ${headerBgClass}`}
                                >
                                    <div className="flex flex-col items-center leading-none">
                                        <span className="text-[9px] opacity-70 font-semibold">{getWeekdayAbbr(dateStr)}</span>
                                        <span className="font-extrabold text-[11px] mt-0.5">{d}/{m} {isSortingThisDate ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
                                    </div>
                                </th>
                            );
                        });
                    })}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700/60">
                {displayList.map((item, idx) => {
                    if (item.type === 'department' || item.type === 'total') {
                        const isGrandTotal = item.type === 'total';
                        if (isGrandTotal) {
                            return (
                                <React.Fragment key={`${item.type}-${idx}`}>
                                    {/* TRUNG BÌNH row */}
                                    <tr key="average-row" className="bg-sky-50 dark:bg-sky-950/40 font-bold text-sky-800 dark:text-sky-200 border-t-2 border-slate-200 dark:border-slate-700">
                                        <td className="px-2 py-1 text-[13px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">TRUNG BÌNH</td>
                                        <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400">
                                            {f.format(Math.ceil(avgTong / 1000))}
                                        </td>
                                        <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                                            {avgWeeksBelowAvg.toFixed(1)}
                                        </td>
                                        <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                                            {avgBelowAvgDays.toFixed(1)}
                                        </td>
                                        {weeks.map(week => {
                                            const isExpanded = expandedWeeks[week.id];
                                            const weekDates = week.dates;
                                            if (!isExpanded) {
                                                const weekAvg = weekAverages[week.id] || 0;
                                                return (
                                                    <td key={week.id} className="px-2 py-1 text-center border-r tabular-nums text-[13px] font-extrabold border-slate-200 dark:border-slate-700 bg-sky-50/10 dark:bg-sky-950/5 text-sky-700 dark:text-sky-300">
                                                        {weekAvg > 0 ? f.format(Math.ceil(weekAvg / 1000)) : '-'}
                                                    </td>
                                                );
                                            } else {
                                                return weekDates.map(dateStr => {
                                                    const isWeekend = isWeekendMap.get(dateStr) ?? false;
                                                    const bgClass = isWeekend ? "bg-rose-100/30 dark:bg-rose-950/10" : "bg-emerald-50/20 dark:bg-emerald-950/5";
                                                    return (
                                                        <td key={dateStr} className={`px-1.5 py-1 text-center border-r tabular-nums text-[13px] font-extrabold border-slate-200 dark:border-slate-700 ${bgClass}`}>
                                                            {colStats[dateStr]?.avg ? f.format(Math.ceil(colStats[dateStr].avg / 1000)) : '-'}
                                                        </td>
                                                    );
                                                });
                                            }
                                        })}
                                    </tr>
                                    {/* TỔNG CỘNG row */}
                                    <tr key="total-row" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800 border-b border-slate-200 dark:border-slate-700">
                                        <td className="px-2 py-1 text-[13px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-left">{item.name}</td>
                                        <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-300">
                                            {f.format(Math.ceil(item.sumTong / 1000))}
                                        </td>
                                        <td className="px-2 py-1 text-center text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700">-</td>
                                        <td className="px-2 py-1 text-center text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700">-</td>
                                        {weeks.map(week => {
                                            const isExpanded = expandedWeeks[week.id];
                                            const weekDates = week.dates;
                                            if (!isExpanded) {
                                                const weekTotal = getWeekGrandTotal(weekDates);
                                                return (
                                                    <td key={week.id} className="px-2 py-1 text-center border-r tabular-nums text-[13px] font-extrabold border-slate-200 dark:border-slate-700 bg-sky-50/10 dark:bg-sky-950/5 text-sky-700 dark:text-sky-300">
                                                        {weekTotal > 0 ? f.format(Math.ceil(weekTotal / 1000)) : '-'}
                                                    </td>
                                                );
                                            } else {
                                                return weekDates.map(dateStr => {
                                                    const isWeekend = isWeekendMap.get(dateStr) ?? false;
                                                    const bgClass = isWeekend ? "bg-rose-100/30 dark:bg-rose-950/10" : "bg-emerald-50/20 dark:bg-emerald-950/5";
                                                    return (
                                                        <td key={dateStr} className={`px-1.5 py-1 text-center border-r tabular-nums text-[13px] font-extrabold border-slate-200 dark:border-slate-700 ${bgClass}`}>
                                                            {item.dailySums?.[dateStr] ? f.format(Math.ceil(item.dailySums[dateStr] / 1000)) : '-'}
                                                        </td>
                                                    );
                                                });
                                            }
                                        })}
                                    </tr>
                                </React.Fragment>
                            );
                        }
                        return (
                            <tr key={`${item.type}-${idx}`} className="bg-slate-50 dark:bg-slate-900/60 font-extrabold text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700">
                                <td className="px-2 py-1 text-[13px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">{item.name}</td>
                                <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400">
                                    {f.format(Math.ceil(item.sumTong / 1000))}
                                </td>
                                <td className="px-2 py-1 text-center text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700">-</td>
                                <td className="px-2 py-1 text-center text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700">-</td>
                                {weeks.map(week => {
                                    const isExpanded = expandedWeeks[week.id];
                                    const weekDates = week.dates;
                                    if (!isExpanded) {
                                        const weekTotal = getWeekDeptTotal(employees.filter(e => e.department === item.name), weekDates);
                                        return (
                                            <td key={week.id} className="px-2 py-1 text-center border-r tabular-nums text-[13px] font-extrabold border-slate-200 dark:border-slate-700 bg-sky-50/10 dark:bg-sky-950/5 text-sky-700 dark:text-sky-300">
                                                {weekTotal > 0 ? f.format(Math.ceil(weekTotal / 1000)) : '-'}
                                            </td>
                                        );
                                    } else {
                                        return weekDates.map(dateStr => {
                                            const isWeekend = isWeekendMap.get(dateStr) ?? false;
                                            const bgClass = isWeekend ? "bg-rose-100/30 dark:bg-rose-950/10" : "bg-emerald-50/20 dark:bg-emerald-950/5";
                                            return (
                                                <td key={dateStr} className={`px-1.5 py-1 text-center border-r tabular-nums text-[13px] font-extrabold border-slate-200 dark:border-slate-700 ${bgClass}`}>
                                                    {item.dailySums?.[dateStr] ? f.format(Math.ceil(item.dailySums[dateStr] / 1000)) : '-'}
                                                </td>
                                            );
                                        });
                                    }
                                })}
                            </tr>
                        );
                    }

                    const isHighlighted = highlightedEmployees.has(item.originalName);
                    const bonus = bonusData[item.originalName];
                    const isStale = !isUpdatedToday(bonus?.updatedAt);
                    const weeksBelowAvgCount = getEmployeeWeeksBelowAvgCount(item.originalName);
                    const belowAvgCount = allDates.reduce((count, dateStr) => {
                        const val = bonus?.dailyData?.[dateStr] || 0;
                        const avg = colStats[dateStr]?.avg || 0;
                        return (val > 0 && val < avg) ? count + 1 : count;
                    }, 0);

                    return (
                        <tr key={item.originalName} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all ${isHighlighted ? 'bg-amber-50/70 dark:bg-amber-900/10' : ''}`}>
                            <td className="px-2 py-1 border-r border-slate-200 dark:border-slate-700">
                                <div role="button" tabIndex={0} className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => onEmployeeClick(item as Employee)} onKeyDown={onActivateKey(() => onEmployeeClick(item as Employee))}>
                                    {item.rank && <MedalBadge rank={item.rank} />}
                                    <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} />
                                    <span className={`text-[13px] font-bold truncate ${isStale ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{item.name}</span>
                                </div>
                            </td>
                            <td className="px-2 py-1 text-center tabular-nums text-[13px] font-bold border-r border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400">
                                {bonus?.tong ? f.format(Math.ceil(bonus.tong / 1000)) : '-'}
                            </td>
                            <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                                {weeksBelowAvgCount > 0 ? weeksBelowAvgCount : '-'}
                            </td>
                            <td className="px-2 py-1 text-center tabular-nums text-[13px] font-extrabold border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                                {belowAvgCount > 0 ? belowAvgCount : '-'}
                            </td>
                            {weeks.map(week => {
                                const isExpanded = expandedWeeks[week.id];
                                const weekDates = week.dates;
                                if (!isExpanded) {
                                    const weekTotal = getWeekTotalForEmployee(item.originalName, weekDates);
                                    const weekAvg = weekAverages[week.id] || 0;
                                    const weekTop3 = weekStats[week.id]?.top3Threshold || 0;

                                    let cellClass = "px-2 py-1 text-center border-r tabular-nums text-[13px] border-slate-200 dark:border-slate-700 ";
                                    if (weekTotal > 0) {
                                        if (weekTotal >= weekTop3) {
                                            cellClass += "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-black";
                                        } else if (weekTotal < weekAvg) {
                                            cellClass += "bg-sky-50/5 dark:bg-sky-950/5 text-rose-600 dark:text-rose-400 font-extrabold";
                                        } else {
                                            cellClass += "bg-sky-50/5 dark:bg-sky-950/5 text-sky-600 dark:text-sky-400 font-bold";
                                        }
                                    } else {
                                        cellClass += "bg-sky-50/5 dark:bg-sky-950/5 text-slate-400 dark:text-slate-600";
                                    }

                                    return (
                                        <td key={week.id} className={cellClass}>
                                            {weekTotal > 0 ? f.format(Math.ceil(weekTotal / 1000)) : '-'}
                                        </td>
                                    );
                                } else {
                                    return weekDates.map(dateStr => {
                                        const val = bonus?.dailyData?.[dateStr] || 0;
                                        const avg = colStats[dateStr]?.avg || 0;
                                        const top3Threshold = colStats[dateStr]?.top3Threshold || 0;
                                        const isWeekend = isWeekendMap.get(dateStr) ?? false;

                                        let cellClass = "px-1.5 py-1 text-center border-r tabular-nums text-[13px] border-slate-200 dark:border-slate-700 ";
                                        if (val > 0) {
                                            if (val >= top3Threshold) cellClass += "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-black";
                                            else if (val < avg) cellClass += "bg-rose-100/70 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold";
                                            else cellClass += (isWeekend ? "bg-rose-50/40 dark:bg-rose-950/10 " : "bg-emerald-50/20 dark:bg-emerald-950/5 ") + "text-slate-800 dark:text-slate-200 font-medium";
                                        } else {
                                            cellClass += (isWeekend ? "bg-rose-50/40 dark:bg-rose-950/10 " : "bg-emerald-50/20 dark:bg-emerald-950/5 ") + "text-slate-400 dark:text-slate-600";
                                        }
                                        return (
                                            <td key={dateStr} className={cellClass}>
                                                {val > 0 ? f.format(Math.ceil(val / 1000)) : '-'}
                                            </td>
                                        );
                                    });
                                }
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
