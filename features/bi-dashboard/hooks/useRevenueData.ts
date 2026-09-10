import { useMemo } from 'react';
import { RevenueRow, BonusMetrics } from '../types/nhanVienTypes';
import { standardizeEmployeeName } from '../utils/nhanVienHelpers';
import { getBonusForEmployee } from '../utils/bonusParser';

interface UseRevenueDataProps {
    rows: RevenueRow[];
    departmentNames: string[];
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    prevMonthRows: RevenueRow[];
    departmentWeights: Record<string, number>;
    deptEmployeeCounts: Record<string, number>;
    supermarketTarget: number;
    employeeInstallmentMap: Map<string, number>;
    viewMode: 'group' | 'list';
    exportDeptFilter: string | null;
    isActive?: boolean;
    bonusData?: Record<string, BonusMetrics | null>;
}

export const useRevenueData = ({
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
}: UseRevenueDataProps) => {

    const displayList = useMemo(() => {
        if (isActive === false) return [];
        const isFiltering = !departmentNames.includes('all');

        const assignBonusTiers = (emps: RevenueRow[]) => {
            if (emps.length === 0) return;
            const sorted = [...emps].sort((a, b) => (b.bonus_tong || 0) - (a.bonus_tong || 0));
            
            const top3Ids = new Set<string>();
            sorted.slice(0, 3).forEach(e => {
                if ((e.bonus_tong || 0) > 0) {
                    top3Ids.add(e.originalName || '');
                }
            });

            // Calculate bottom 30% of employees
            const botCount = Math.ceil(emps.length * 0.3);
            const botIds = new Set<string>();
            if (botCount > 0) {
                const sortedAsc = [...emps].sort((a, b) => (a.bonus_tong || 0) - (b.bonus_tong || 0));
                sortedAsc.slice(0, botCount).forEach(e => {
                    botIds.add(e.originalName || '');
                });
            }

            emps.forEach(e => {
                if (top3Ids.has(e.originalName || '')) {
                    e.bonus_tier = 'top';
                } else if (botIds.has(e.originalName || '')) {
                    e.bonus_tier = 'bot';
                } else {
                    e.bonus_tier = 'normal';
                }
            });
        };
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        
        const now = new Date();
        const currentDay = now.getDate();
        const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const remainingDays = Math.max(1, totalDays - currentDay + 1);
        const daysPassed = Math.max(1, currentDay - 1);

        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? departmentNames : allDepts);

        // Map tra cứu O(1) thay vì .find() O(n) lồng trong .map() ở calculateWithComparison bên dưới
        const prevMonthRowsMap = new Map(prevMonthRows.map(pr => [pr.originalName, pr]));

        const calculateWithComparison = (emp: RevenueRow): RevenueRow => {
            const weight = (departmentWeights[emp.department!] || 0) / 100;
            const empCount = deptEmployeeCounts[emp.department!] || 1;
            const empTarget = supermarketTarget > 0 ? (supermarketTarget * weight) / empCount : 0;
            const currentInstallment = employeeInstallmentMap.get(emp.originalName || '') || 0;
            const currentCompletion = empTarget > 0 ? (emp.dtqd / empTarget) * 100 : 0;

            const prevData = prevMonthRows.length > 0 ? (prevMonthRowsMap.get(emp.originalName) ?? null) : null;

            const empDuKien = daysPassed > 0 ? (emp.dtqd / daysPassed) * totalDays : 0;
            const empPctDkht = empTarget > 0 ? (empDuKien / empTarget) * 100 : 0;

            let prevCompData = null;
            if (prevData) {
                const prevTarget = empTarget; 
                const prevDk = daysPassed > 0 ? (prevData.dtqd / daysPassed) * totalDays : 0;
                prevCompData = {
                    dtlk: prevData.dtlk,
                    dtqd: prevData.dtqd,
                    target: prevTarget,
                    completion: prevTarget > 0 ? (prevData.dtqd / prevTarget) * 100 : 0,
                    hqqd: prevData.dtlk > 0 ? (prevData.dtqd / prevData.dtlk) - 1 : 0,
                    installment: 0,
                    pctBillBk: prevData.pctBillBk || 0,
                    duKien: prevDk,
                    dkht: prevTarget > 0 ? (prevDk / prevTarget) * 100 : 0
                };
            }

            const remaining_total = Math.max(0, empTarget - emp.dtqd);
            const remaining_daily = remaining_total / remainingDays;
            
            const avgDaily = emp.dtqd / daysPassed;
            const remaining_daily_status: 'warning' | 'success' | undefined = empTarget > 0 ? (avgDaily < remaining_daily ? 'warning' : 'success') : undefined;
            
            const bonus_tong = getBonusForEmployee(bonusData, emp.originalName, emp.name)?.tong || 0;

            return { 
                ...emp, 
                calculatedTarget: empTarget, 
                calculatedCompletion: currentCompletion,
                calculatedInstallment: currentInstallment,
                remaining_total,
                remaining_daily,
                remaining_daily_status,
                bonus_tong,
                duKien: empDuKien,
                pctDkht: empPctDkht,
                prevCompData
            };
        };

        if (viewMode === 'list' && !exportDeptFilter) {
            const list = rows.filter(r => r.type === 'employee' && (isFiltering ? departmentNames.includes(r.department!) : true))
                             .map(calculateWithComparison);

            list.sort((a, b) => {
                let valA: unknown, valB: unknown;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'target') { valA = a.calculatedTarget; valB = b.calculatedTarget; }
                else if (sortConfig.key === 'completion') { valA = a.calculatedCompletion; valB = b.calculatedCompletion; }
                else if (sortConfig.key === 'duKien') { valA = a.duKien; valB = b.duKien; }
                else if (sortConfig.key === 'pctDkht') { valA = a.pctDkht; valB = b.pctDkht; }
                else if (sortConfig.key === 'installment') { valA = a.calculatedInstallment; valB = b.calculatedInstallment; }
                else if (sortConfig.key === 'hqqd') { valA = a.hieuQuaQD; valB = b.hieuQuaQD; }
                else if (sortConfig.key === 'bankem') { valA = a.pctBillBk; valB = b.pctBillBk; }
                else { valA = (a as unknown as Record<string, unknown>)[sortConfig.key]; valB = (b as unknown as Record<string, unknown>)[sortConfig.key]; }
                const compare = typeof valA === 'string' && typeof valB === 'string' ? valA.localeCompare(valB) : ((valA as number) || 0) - ((valB as number) || 0);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const result: RevenueRow[] = list.map((emp, index) => ({ ...emp, rank: index + 1 }));
            assignBonusTiers(result);
            
            if (result.length > 0) {
                const sumDtlk = result.reduce((s, e) => s + e.dtlk, 0);
                const sumDtqd = result.reduce((s, e) => s + e.dtqd, 0);
                const sumTarget = result.reduce((s, e) => s + (e.calculatedTarget || 0), 0);
                const sumDuKien = daysPassed > 0 ? (sumDtqd / daysPassed) * totalDays : 0;
                const sumPctDkht = sumTarget > 0 ? (sumDuKien / sumTarget) * 100 : 0;
                const avgHqqd = sumDtlk > 0 ? (sumDtqd / sumDtlk) - 1 : 0;
                const avgInstallment = result.reduce((s, e) => s + e.calculatedInstallment, 0) / result.length;
                const avgBk = result.reduce((s, e) => s + (e.pctBillBk || 0), 0) / result.length;
                const sumBonusTong = result.reduce((s, e) => s + (e.bonus_tong || 0), 0);
                
                const prevDtlk = result.reduce((s, e) => s + (e.prevCompData?.dtlk || 0), 0);
                const prevDtqd = result.reduce((s, e) => s + (e.prevCompData?.dtqd || 0), 0);
                const prevTarget = result.reduce((s, e) => s + (e.prevCompData?.target || 0), 0);
                const prevDk = daysPassed > 0 ? (prevDtqd / daysPassed) * totalDays : 0;

                result.push({
                    type: 'total',
                    name: 'TỔNG CỘNG',
                    dtlk: sumDtlk,
                    dtqd: sumDtqd,
                    calculatedTarget: sumTarget,
                    calculatedCompletion: sumTarget > 0 ? (sumDtqd / sumTarget) * 100 : 0,
                    duKien: sumDuKien,
                    pctDkht: sumPctDkht,
                    hieuQuaQD: avgHqqd,
                    calculatedInstallment: avgInstallment,
                    pctBillBk: avgBk,
                    remaining_total: Math.max(0, sumTarget - sumDtqd),
                    remaining_daily: Math.max(0, sumTarget - sumDtqd) / remainingDays,
                    bonus_tong: sumBonusTong,
                    prevCompData: (prevDtlk || prevDtqd) ? {
                        dtlk: prevDtlk,
                        dtqd: prevDtqd,
                        target: prevTarget,
                        completion: prevTarget > 0 ? (prevDtqd / prevTarget) * 100 : 0,
                        hqqd: prevDtlk > 0 ? (prevDtqd / prevDtlk) - 1 : 0,
                        installment: 0,
                        pctBillBk: 0,
                        duKien: prevDk,
                        dkht: prevTarget > 0 ? (prevDk / prevTarget) * 100 : 0
                    } : null
                });
            }
            return result;
        }

        let deptGroups = deptsToProcess.map(deptName => {
            let deptEmployees = rows.filter(r => r.type === 'employee' && r.department === deptName)
                                    .map(calculateWithComparison);

            deptEmployees.sort((a, b) => {
                let valA: unknown, valB: unknown;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'target') { valA = a.calculatedTarget; valB = b.calculatedTarget; }
                else if (sortConfig.key === 'completion') { valA = a.calculatedCompletion; valB = b.calculatedCompletion; }
                else if (sortConfig.key === 'duKien') { valA = a.duKien; valB = b.duKien; }
                else if (sortConfig.key === 'pctDkht') { valA = a.pctDkht; valB = b.pctDkht; }
                else if (sortConfig.key === 'installment') { valA = a.calculatedInstallment; valB = b.calculatedInstallment; }
                else if (sortConfig.key === 'hqqd') { valA = a.hieuQuaQD; valB = b.hieuQuaQD; }
                else if (sortConfig.key === 'bankem') { valA = a.pctBillBk; valB = b.pctBillBk; }
                else { valA = (a as unknown as Record<string, unknown>)[sortConfig.key]; valB = (b as unknown as Record<string, unknown>)[sortConfig.key]; }
                const compare = typeof valA === 'string' && typeof valB === 'string' ? valA.localeCompare(valB) : ((valA as number) || 0) - ((valB as number) || 0);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const sumDtlk = deptEmployees.reduce((s, e) => s + e.dtlk, 0);
            const sumDtqd = deptEmployees.reduce((s, e) => s + e.dtqd, 0);
            const sumTarget = deptEmployees.reduce((s, e) => s + (e.calculatedTarget || 0), 0);
            const sumDuKien = daysPassed > 0 ? (sumDtqd / daysPassed) * totalDays : 0;
            const deptPctDkht = sumTarget > 0 ? (sumDuKien / sumTarget) * 100 : 0;
            const avgInstallment = deptEmployees.length > 0 ? deptEmployees.reduce((s, e) => s + e.calculatedInstallment, 0) / deptEmployees.length : 0;
            const avgBk = deptEmployees.length > 0 ? deptEmployees.reduce((s, e) => s + (e.pctBillBk || 0), 0) / deptEmployees.length : 0;
            const avgHqqd = sumDtlk > 0 ? (sumDtqd / sumDtlk) - 1 : 0;
            const sumBonusTong = deptEmployees.reduce((s, e) => s + (e.bonus_tong || 0), 0);

            return {
                name: deptName,
                employees: deptEmployees,
                sumDtlk,
                sumDtqd,
                sumTarget,
                sumDuKien,
                deptPctDkht,
                avgInstallment,
                avgBk,
                avgHqqd,
                sumBonusTong,
                sortValue: sortConfig.key === 'dtqd' ? sumDtqd : (sortConfig.key === 'dtlk' ? sumDtlk : (sortConfig.key === 'target' ? sumTarget : (sortConfig.key === 'duKien' ? sumDuKien : (sortConfig.key === 'name' ? deptName : (sortConfig.key === 'bonus_tong' ? sumBonusTong : sumDtqd)))))
            };
        });

        deptGroups.sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? String(a.sortValue).localeCompare(String(b.sortValue)) : String(b.sortValue).localeCompare(String(a.sortValue));
            }
            return sortConfig.direction === 'asc' ? (a.sortValue as number) - (b.sortValue as number) : (b.sortValue as number) - (a.sortValue as number);
        });

        let finalOutput: RevenueRow[] = [];
        let grandSumDtlk = 0, grandSumDtqd = 0, grandSumTarget = 0, grandTotalEmps = 0, grandSumInstallment = 0, grandSumBk = 0;
        let grandPrevDtlk = 0, grandPrevDtqd = 0, grandPrevTarget = 0;

        deptGroups.forEach(group => {
            if (group.employees.length > 0) {
                const prevDeptDtlk = group.employees.reduce((s, e) => s + (e.prevCompData?.dtlk || 0), 0);
                const prevDeptDtqd = group.employees.reduce((s, e) => s + (e.prevCompData?.dtqd || 0), 0);
                const prevDeptTarget = group.employees.reduce((s, e) => s + (e.prevCompData?.target || 0), 0);
                const prevDeptDk = daysPassed > 0 ? (prevDeptDtqd / daysPassed) * totalDays : 0;

                finalOutput.push({ 
                    type: 'department', 
                    name: group.name, 
                    dtlk: group.sumDtlk, 
                    dtqd: group.sumDtqd, 
                    calculatedTarget: group.sumTarget, 
                    calculatedCompletion: group.sumTarget > 0 ? (group.sumDtqd / group.sumTarget) * 100 : 0,
                    duKien: group.sumDuKien,
                    pctDkht: group.deptPctDkht,
                    hieuQuaQD: group.avgHqqd,
                    calculatedInstallment: group.avgInstallment,
                    pctBillBk: group.avgBk,
                    remaining_total: Math.max(0, group.sumTarget - group.sumDtqd),
                    remaining_daily: Math.max(0, group.sumTarget - group.sumDtqd) / remainingDays,
                    bonus_tong: group.sumBonusTong,
                    prevCompData: (prevDeptDtlk || prevDeptDtqd) ? {
                        dtlk: prevDeptDtlk,
                        dtqd: prevDeptDtqd,
                        target: prevDeptTarget,
                        completion: prevDeptTarget > 0 ? (prevDeptDtqd / prevDeptTarget) * 100 : 0,
                        hqqd: prevDeptDtlk > 0 ? (prevDeptDtqd / prevDeptDtlk) - 1 : 0,
                        installment: 0,
                        pctBillBk: 0,
                        duKien: prevDeptDk,
                        dkht: prevDeptTarget > 0 ? (prevDeptDk / prevDeptTarget) * 100 : 0
                    } : null
                });
                finalOutput.push(...group.employees.map((emp, index) => ({ ...emp, rank: index + 1 })));
                
                grandSumDtlk += group.sumDtlk;
                grandSumDtqd += group.sumDtqd;
                grandSumTarget += group.sumTarget;
                grandTotalEmps += group.employees.length;
                grandSumInstallment += group.employees.reduce((s, e) => s + e.calculatedInstallment, 0);
                grandSumBk += group.employees.reduce((s, e) => s + (e.pctBillBk || 0), 0);

                grandPrevDtlk += prevDeptDtlk;
                grandPrevDtqd += prevDeptDtqd;
                grandPrevTarget += prevDeptTarget;
            }
        });

        const employeeRows = finalOutput.filter(r => r.type === 'employee');
        assignBonusTiers(employeeRows);

        if (finalOutput.length > 0 && !exportDeptFilter) {
            const grandSumBonusTong = finalOutput.filter(r => r.type === 'department').reduce((s, d) => s + (d.bonus_tong || 0), 0);
            const grandSumDuKien = daysPassed > 0 ? (grandSumDtqd / daysPassed) * totalDays : 0;
            const grandPctDkht = grandSumTarget > 0 ? (grandSumDuKien / grandSumTarget) * 100 : 0;
            const grandPrevDk = daysPassed > 0 ? (grandPrevDtqd / daysPassed) * totalDays : 0;

            finalOutput.push({
                type: 'total',
                name: 'TỔNG CỘNG',
                dtlk: grandSumDtlk,
                dtqd: grandSumDtqd,
                calculatedTarget: grandSumTarget,
                calculatedCompletion: grandSumTarget > 0 ? (grandSumDtqd / grandSumTarget) * 100 : 0,
                duKien: grandSumDuKien,
                pctDkht: grandPctDkht,
                hieuQuaQD: grandSumDtlk > 0 ? (grandSumDtqd / grandSumDtlk) - 1 : 0,
                calculatedInstallment: grandTotalEmps > 0 ? grandSumInstallment / grandTotalEmps : 0,
                pctBillBk: grandTotalEmps > 0 ? grandSumBk / grandTotalEmps : 0,
                remaining_total: Math.max(0, grandSumTarget - grandSumDtqd),
                remaining_daily: Math.max(0, grandSumTarget - grandSumDtqd) / remainingDays,
                bonus_tong: grandSumBonusTong,
                prevCompData: (grandPrevDtlk || grandPrevDtqd) ? {
                    dtlk: grandPrevDtlk,
                    dtqd: grandPrevDtqd,
                    target: grandPrevTarget,
                    completion: grandPrevTarget > 0 ? (grandPrevDtqd / grandPrevTarget) * 100 : 0,
                    hqqd: grandPrevDtlk > 0 ? (grandPrevDtqd / grandPrevDtlk) - 1 : 0,
                    installment: 0,
                    pctBillBk: 0,
                    duKien: grandPrevDk,
                    dkht: grandPrevTarget > 0 ? (grandPrevDk / grandPrevTarget) * 100 : 0
                } : null
            });
        }

        return finalOutput;
    }, [rows, departmentNames, sortConfig, prevMonthRows, departmentWeights, deptEmployeeCounts, supermarketTarget, employeeInstallmentMap, viewMode, exportDeptFilter, isActive, bonusData]);

    return { displayList };
};
