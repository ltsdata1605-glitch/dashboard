import { useState, useMemo, useCallback } from 'react';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import { useMonthlyBonusArchive } from '../../../hooks/useMonthlyBonusArchive';
import { Employee, BonusMetrics, RevenueRow } from '../../../types/nhanVienTypes';
import { BonusDisplayRow } from './BonusDisplayRow';
import { getMondayOfDate, getWeekDates } from './bonusTableHelpers';

interface UseBonusViewDataParams {
    employees: Employee[];
    bonusData: Record<string, BonusMetrics | null>;
    revenueRows: RevenueRow[];
    activeSupermarkets: string[];
    activeDepartments: string[];
    isActive?: boolean;
}

// Toàn bộ state + tính toán phái sinh của BonusView — tách khỏi phần render để
// BonusTab.tsx/BonusDailyTable/BonusGroupListTable chỉ còn lo hiển thị.
export function useBonusViewData({
    employees,
    bonusData,
    revenueRows,
    activeSupermarkets,
    activeDepartments,
    isActive,
}: UseBonusViewDataParams) {
    const [sortField, setSortField] = useState<string>('dKien');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('bonus-view-mode-multi-v2', 'group');
    const [isDaily, setIsDaily] = useIndexedDBState<boolean>('bonus-view-mode-daily-v2', false);
    const [isMonthly, setIsMonthly] = useIndexedDBState<boolean>('bonus-view-mode-monthly-v2', false);
    const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

    const monthlyArchive = useMonthlyBonusArchive(activeSupermarkets, isMonthly);
    const monthlyEmployees = useMemo(
        () => employees.filter(e => activeDepartments.includes(e.department)),
        [employees, activeDepartments],
    );

    const getWeekTotalForEmployee = (employeeName: string, weekDates: string[]) => {
        const bonus = bonusData[employeeName];
        if (!bonus || !bonus.dailyData) return 0;
        return weekDates.reduce((sum, dateStr) => sum + (bonus.dailyData[dateStr] || 0), 0);
    };

    const getWeekAverage = (weekDates: string[]) => {
        if (employees.length === 0) return 0;
        const totalSum = employees.reduce((sum, e) => sum + getWeekTotalForEmployee(e.originalName, weekDates), 0);
        return totalSum / employees.length;
    };

    const getWeekGrandTotal = (weekDates: string[]) => {
        return employees.reduce((sum, e) => sum + getWeekTotalForEmployee(e.originalName, weekDates), 0);
    };

    const getWeekDeptTotal = (deptEmployees: Employee[], weekDates: string[]) => {
        return deptEmployees.reduce((sum, e) => sum + getWeekTotalForEmployee(e.originalName, weekDates), 0);
    };

    const toggleWeek = (weekId: string) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [weekId]: !prev[weekId]
        }));
    };

    const allDates = useMemo(() => {
        if (isActive === false) return [];
        const datesSet = new Set<string>();
        Object.values(bonusData).forEach(metrics => {
            if (metrics && metrics.dailyData) {
                Object.keys(metrics.dailyData).forEach(d => datesSet.add(d));
            }
        });
        return Array.from(datesSet).sort((a, b) => {
            const [da, ma, ya] = a.split('/').map(Number);
            const [db, mb, yb] = b.split('/').map(Number);
            return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });
    }, [bonusData, isActive]);

    const weeks = useMemo(() => {
        if (isActive === false) return [];
        // Group allDates by their week's Monday
        const groups: Record<string, string[]> = {};
        allDates.forEach(dateStr => {
            const mondayStr = getMondayOfDate(dateStr);
            if (!groups[mondayStr]) {
                groups[mondayStr] = [];
            }
            groups[mondayStr].push(dateStr);
        });

        // Sort the mondays chronologically
        const sortedMondays = Object.keys(groups).sort((a, b) => {
            const [da, ma, ya] = a.split('/').map(Number);
            const [db, mb, yb] = b.split('/').map(Number);
            return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });

        // Create week objects: { id: string, name: string, dates: string[] }
        return sortedMondays.map((mondayStr, index) => ({
            id: mondayStr,
            name: `Tuần ${index + 1}`,
            dates: groups[mondayStr]
        }));
    }, [allDates, isActive]);

    const weekAverages = useMemo(() => {
        const avgs: Record<string, number> = {};
        weeks.forEach(week => {
            if (employees.length === 0) {
                avgs[week.id] = 0;
                return;
            }
            const totalSum = employees.reduce((sum, e) => {
                const bonus = bonusData[e.originalName];
                if (!bonus || !bonus.dailyData) return sum;
                const weekSum = week.dates.reduce((s, dateStr) => s + (bonus.dailyData[dateStr] || 0), 0);
                return sum + weekSum;
            }, 0);
            avgs[week.id] = totalSum / employees.length;
        });
        return avgs;
    }, [weeks, employees, bonusData]);

    const weekStats = useMemo(() => {
        const stats: Record<string, { top3Threshold: number }> = {};
        weeks.forEach(week => {
            const values = employees
                .map(e => {
                    const bonus = bonusData[e.originalName];
                    if (!bonus || !bonus.dailyData) return 0;
                    return week.dates.reduce((sum, dateStr) => sum + (bonus.dailyData[dateStr] || 0), 0);
                })
                .filter(v => v > 0);

            const sortedUnique = Array.from(new Set(values)).sort((a, b) => b - a);
            const top3Threshold = sortedUnique.length > 0 ? sortedUnique[Math.min(2, sortedUnique.length - 1)] : 0;
            stats[week.id] = { top3Threshold };
        });
        return stats;
    }, [weeks, employees, bonusData]);

    const getEmployeeWeeksBelowAvgCount = useCallback((employeeName: string) => {
        let count = 0;
        weeks.forEach(week => {
            const bonus = bonusData[employeeName];
            if (!bonus || !bonus.dailyData) return;
            const weekTotal = week.dates.reduce((sum, dateStr) => sum + (bonus.dailyData[dateStr] || 0), 0);
            const weekAvg = weekAverages[week.id] || 0;
            if (weekTotal > 0 && weekTotal < weekAvg) {
                count++;
            }
        });
        return count;
    }, [weeks, bonusData, weekAverages]);

    const colStats = useMemo(() => {
        if (isActive === false || allDates.length === 0) return {};
        const stats: Record<string, { avg: number; top3Threshold: number }> = {};
        allDates.forEach(dateStr => {
            const values = employees
                .map(e => bonusData[e.originalName]?.dailyData?.[dateStr] || 0)
                .filter(v => v > 0);
            const sum = values.reduce((s, v) => s + v, 0);
            const avg = employees.length > 0 ? sum / employees.length : 0;

            const sortedUnique = Array.from(new Set(values)).sort((a, b) => b - a);
            const top3Threshold = sortedUnique.length > 0 ? sortedUnique[Math.min(2, sortedUnique.length - 1)] : 0;

            stats[dateStr] = { avg, top3Threshold };
        });
        return stats;
    }, [employees, bonusData, allDates, isActive]);

    const { avgTong, avgWeeksBelowAvg, avgBelowAvgDays } = useMemo(() => {
        if (isActive === false || employees.length === 0) return { avgTong: 0, avgWeeksBelowAvg: 0, avgBelowAvgDays: 0 };
        const sumTong = employees.reduce((s, e) => s + (bonusData[e.originalName]?.tong || 0), 0);
        const avgTong = sumTong / employees.length;

        const sumWeeksBelowAvg = employees.reduce((sum, e) => {
            return sum + getEmployeeWeeksBelowAvgCount(e.originalName);
        }, 0);
        const avgWeeksBelowAvg = sumWeeksBelowAvg / employees.length;

        const sumBelowAvgDays = employees.reduce((sum, e) => {
            const bonus = bonusData[e.originalName];
            const count = allDates.reduce((c, dateStr) => {
                const val = bonus?.dailyData?.[dateStr] || 0;
                const avg = colStats[dateStr]?.avg || 0;
                return (val > 0 && val < avg) ? c + 1 : c;
            }, 0);
            return sum + count;
        }, 0);
        const avgBelowAvgDays = sumBelowAvgDays / employees.length;

        return { avgTong, avgWeeksBelowAvg, avgBelowAvgDays };
    }, [employees, bonusData, allDates, colStats, getEmployeeWeeksBelowAvgCount, isActive]);

    const revenueMap = useMemo(() => {
        if (isActive === false) return new Map();
        const m = new Map<string, RevenueRow>(); revenueRows.forEach((r) => r.type === 'employee' && r.originalName && m.set(r.originalName, r)); return m;
    }, [revenueRows, isActive]);

    const displayList = useMemo(() => {
        if (isActive === false) return [];
        const isFiltering = !activeDepartments.includes('all');
        const allUniqueDepts = Array.from(new Set(employees.map(e => e.department))).sort();
        const depts = isFiltering ? activeDepartments : allUniqueDepts;

        if (viewMode === 'list') {
            const list = employees.filter(e => isFiltering ? activeDepartments.includes(e.department) : true);
            list.sort((a, b) => {
                const bA = bonusData[a.originalName], bB = bonusData[b.originalName], rA = revenueMap.get(a.originalName), rB = revenueMap.get(b.originalName);
                let vA = 0, vB = 0;
                if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                if (sortField === 'dtqd') { vA = rA?.dtqd || 0; vB = rB?.dtqd || 0; }
                else if (sortField === 'hqqd') { vA = rA?.hieuQuaQD || 0; vB = rB?.hieuQuaQD || 0; }
                else if (sortField === 'weekBelowAvg') {
                    vA = getEmployeeWeeksBelowAvgCount(a.originalName);
                    vB = getEmployeeWeeksBelowAvgCount(b.originalName);
                }
                else if (sortField === 'belowAvgDays') {
                    vA = allDates.reduce((count, dateStr) => {
                        const val = bA?.dailyData?.[dateStr] || 0;
                        const avg = colStats[dateStr]?.avg || 0;
                        return (val > 0 && val < avg) ? count + 1 : count;
                    }, 0);
                    vB = allDates.reduce((count, dateStr) => {
                        const val = bB?.dailyData?.[dateStr] || 0;
                        const avg = colStats[dateStr]?.avg || 0;
                        return (val > 0 && val < avg) ? count + 1 : count;
                    }, 0);
                }
                else if (sortField.startsWith('date:')) {
                    const dStr = sortField.substring(5);
                    vA = bA?.dailyData?.[dStr] || 0;
                    vB = bB?.dailyData?.[dStr] || 0;
                } else if (sortField.startsWith('week:')) {
                    const mStr = sortField.substring(5);
                    const weekDates = getWeekDates(mStr);
                    vA = weekDates.reduce((sum, dStr) => sum + (bA?.dailyData?.[dStr] || 0), 0);
                    vB = weekDates.reduce((sum, dStr) => sum + (bB?.dailyData?.[dStr] || 0), 0);
                } else { vA = (bA as unknown as Record<string, unknown>)?.[sortField] as number || 0; vB = (bB as unknown as Record<string, unknown>)?.[sortField] as number || 0; }
                return sortDir === 'asc' ? vA - vB : vB - vA;
            });
            const result: BonusDisplayRow[] = list.map((e, idx) => ({ ...e, rank: idx + 1 }));
            if (result.length > 0) {
                const sumDtqd = result.reduce((s, e) => s + (revenueMap.get(e.originalName)?.dtqd || 0), 0);
                const sumErp = result.reduce((s, e) => s + (bonusData[e.originalName]?.erp || 0), 0);
                const sumTnong = result.reduce((s, e) => s + (bonusData[e.originalName]?.tNong || 0), 0);
                const sumTong = result.reduce((s, e) => s + (bonusData[e.originalName]?.tong || 0), 0);
                const sumDkien = result.reduce((s, e) => s + (bonusData[e.originalName]?.dKien || 0), 0);

                const dailySums: Record<string, number> = {};
                allDates.forEach(dateStr => {
                    dailySums[dateStr] = result.reduce((s, e) => s + (bonusData[e.originalName]?.dailyData?.[dateStr] || 0), 0);
                });

                result.push({
                    type: 'total',
                    name: 'TỔNG CỘNG',
                    sumDtqd, sumErp, sumTnong, sumTong, sumDkien, dailySums
                });
            }
            return result;
        }

        let deptGroups = depts.map(d => {
            let emps = employees.filter(e => e.department === d);
            emps.sort((a, b) => {
                const bA = bonusData[a.originalName], bB = bonusData[b.originalName], rA = revenueMap.get(a.originalName), rB = revenueMap.get(b.originalName);
                let vA = 0, vB = 0;
                if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                if (sortField === 'dtqd') { vA = rA?.dtqd || 0; vB = rB?.dtqd || 0; }
                else if (sortField === 'hqqd') { vA = rA?.hieuQuaQD || 0; vB = rB?.hieuQuaQD || 0; }
                else if (sortField === 'weekBelowAvg') {
                    vA = getEmployeeWeeksBelowAvgCount(a.originalName);
                    vB = getEmployeeWeeksBelowAvgCount(b.originalName);
                }
                else if (sortField === 'belowAvgDays') {
                    vA = allDates.reduce((count, dateStr) => {
                        const val = bA?.dailyData?.[dateStr] || 0;
                        const avg = colStats[dateStr]?.avg || 0;
                        return (val > 0 && val < avg) ? count + 1 : count;
                    }, 0);
                    vB = allDates.reduce((count, dateStr) => {
                        const val = bB?.dailyData?.[dateStr] || 0;
                        const avg = colStats[dateStr]?.avg || 0;
                        return (val > 0 && val < avg) ? count + 1 : count;
                    }, 0);
                }
                else if (sortField.startsWith('date:')) {
                    const dStr = sortField.substring(5);
                    vA = bA?.dailyData?.[dStr] || 0;
                    vB = bB?.dailyData?.[dStr] || 0;
                } else if (sortField.startsWith('week:')) {
                    const mStr = sortField.substring(5);
                    const weekDates = getWeekDates(mStr);
                    vA = weekDates.reduce((sum, dStr) => sum + (bA?.dailyData?.[dStr] || 0), 0);
                    vB = weekDates.reduce((sum, dStr) => sum + (bB?.dailyData?.[dStr] || 0), 0);
                } else { vA = (bA as unknown as Record<string, unknown>)?.[sortField] as number || 0; vB = (bB as unknown as Record<string, unknown>)?.[sortField] as number || 0; }
                return sortDir === 'asc' ? vA - vB : vB - vA;
            });

            const sumDtqd = emps.reduce((s, e) => s + (revenueMap.get(e.originalName)?.dtqd || 0), 0);
            const sumErp = emps.reduce((s, e) => s + (bonusData[e.originalName]?.erp || 0), 0);
            const sumTnong = emps.reduce((s, e) => s + (bonusData[e.originalName]?.tNong || 0), 0);
            const sumTong = emps.reduce((s, e) => s + (bonusData[e.originalName]?.tong || 0), 0);
            const sumDkien = emps.reduce((s, e) => s + (bonusData[e.originalName]?.dKien || 0), 0);

            const dailySums: Record<string, number> = {};
            allDates.forEach(dateStr => {
                dailySums[dateStr] = emps.reduce((s, e) => s + (bonusData[e.originalName]?.dailyData?.[dateStr] || 0), 0);
            });

            let sortValue = 0;
            if (sortField === 'dtqd') sortValue = sumDtqd;
            else if (sortField === 'erp') sortValue = sumErp;
            else if (sortField === 'tNong') sortValue = sumTnong;
            else if (sortField === 'tong') sortValue = sumTong;
            else if (sortField === 'dKien') sortValue = sumDkien;
            else if (sortField === 'weekBelowAvg') {
                sortValue = emps.reduce((sum, e) => sum + getEmployeeWeeksBelowAvgCount(e.originalName), 0);
            }
            else if (sortField === 'belowAvgDays') {
                sortValue = emps.reduce((sum, e) => {
                    const b = bonusData[e.originalName];
                    return sum + allDates.reduce((count, dateStr) => {
                        const val = b?.dailyData?.[dateStr] || 0;
                        const avg = colStats[dateStr]?.avg || 0;
                        return (val > 0 && val < avg) ? count + 1 : count;
                    }, 0);
                }, 0);
            }
            else if (sortField.startsWith('date:')) {
                const dStr = sortField.substring(5);
                sortValue = dailySums[dStr] || 0;
            } else if (sortField.startsWith('week:')) {
                const mStr = sortField.substring(5);
                const weekDates = getWeekDates(mStr);
                sortValue = weekDates.reduce((sum, dStr) => sum + (dailySums[dStr] || 0), 0);
            } else {
                sortValue = sumDkien;
            }

            return { name: d, employees: emps, sumDtqd, sumErp, sumTnong, sumTong, sumDkien, dailySums, sortValue };
        });

        deptGroups.sort((a, b) => {
            if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            return sortDir === 'asc' ? a.sortValue - b.sortValue : b.sortValue - a.sortValue;
        });

        let out: BonusDisplayRow[] = [];
        let grandSumDtqd = 0, grandSumErp = 0, grandSumTnong = 0, grandSumTong = 0, grandSumDkien = 0;
        const grandDailySums: Record<string, number> = {};
        allDates.forEach(dateStr => {
            grandDailySums[dateStr] = 0;
        });

        deptGroups.forEach(group => {
            if (group.employees.length > 0) {
                out.push({ type: 'department', name: group.name, sumDtqd: group.sumDtqd, sumErp: group.sumErp, sumTnong: group.sumTnong, sumTong: group.sumTong, sumDkien: group.sumDkien, dailySums: group.dailySums });
                out.push(...group.employees.map((e, idx) => ({ ...e, rank: idx + 1 })));

                grandSumDtqd += group.sumDtqd;
                grandSumErp += group.sumErp;
                grandSumTnong += group.sumTnong;
                grandSumTong += group.sumTong;
                grandSumDkien += group.sumDkien;

                allDates.forEach(dateStr => {
                    grandDailySums[dateStr] += group.dailySums[dateStr] || 0;
                });
            }
        });

        if (out.length > 0) {
            out.push({ type: 'total', name: 'TỔNG CỘNG', sumDtqd: grandSumDtqd, sumErp: grandSumErp, sumTnong: grandSumTnong, sumTong: grandSumTong, sumDkien: grandSumDkien, dailySums: grandDailySums });
        }
        return out;
    }, [employees, activeDepartments, bonusData, revenueMap, sortField, sortDir, viewMode, isActive, allDates, getEmployeeWeeksBelowAvgCount, colStats]);

    return {
        sortField, setSortField, sortDir, setSortDir,
        viewMode, setViewMode,
        isDaily, setIsDaily,
        isMonthly, setIsMonthly,
        expandedWeeks, toggleWeek,
        monthlyArchive, monthlyEmployees,
        allDates, weeks, weekAverages, weekStats, colStats,
        avgTong, avgWeeksBelowAvg, avgBelowAvgDays,
        revenueMap, displayList,
        getWeekTotalForEmployee, getWeekAverage, getWeekGrandTotal, getWeekDeptTotal,
        getEmployeeWeeksBelowAvgCount,
    };
}
