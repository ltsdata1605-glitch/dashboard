import { useMemo } from 'react';
import { RevenueRow, BonusMetrics } from '../types/nhanVienTypes';

interface UseRevenueDataProps {
    rows: RevenueRow[];
    departmentNames: string[];
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    snapshotId?: string | null;
    snapshotRows: RevenueRow[];
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
    snapshotId,
    snapshotRows,
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

        const assignBonusTiers = (emps: any[]) => {
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
        
        const calculateWithComparison = (emp: any) => {
            const weight = (departmentWeights[emp.department!] || 0) / 100;
            const empCount = deptEmployeeCounts[emp.department!] || 1;
            const empTarget = supermarketTarget > 0 ? (supermarketTarget * weight) / empCount : 0;
            const currentInstallment = employeeInstallmentMap.get(emp.originalName || '') || 0;
            const currentCompletion = empTarget > 0 ? (emp.dtqd / empTarget) * 100 : 0;

            let prevData = null;
            if (snapshotId) {
                prevData = snapshotRows.find(sr => sr.originalName === emp.originalName);
            } else if (prevMonthRows.length > 0) {
                prevData = prevMonthRows.find(pr => pr.originalName === emp.originalName);
            }

            let prevCompData = null;
            if (prevData) {
                const prevTarget = empTarget; 
                prevCompData = {
                    dtlk: prevData.dtlk,
                    dtqd: prevData.dtqd,
                    target: prevTarget,
                    completion: prevTarget > 0 ? (prevData.dtqd / prevTarget) * 100 : 0,
                    hqqd: prevData.dtlk > 0 ? (prevData.dtqd / prevData.dtlk) - 1 : 0,
                    installment: 0,
                    pctBillBk: prevData.pctBillBk || 0
                };
            }

            const remaining_total = Math.max(0, empTarget - emp.dtqd);
            const remaining_daily = remaining_total / remainingDays;
            
            const avgDaily = emp.dtqd / daysPassed;
            const remaining_daily_status = empTarget > 0 ? (avgDaily < remaining_daily ? 'warning' : 'success') : undefined;
            
            const bonus_tong = (bonusData && emp.originalName) ? (bonusData[emp.originalName]?.tong || 0) : 0;

            return { 
                ...emp, 
                calculatedTarget: empTarget, 
                calculatedCompletion: currentCompletion,
                calculatedInstallment: currentInstallment,
                remaining_total,
                remaining_daily,
                remaining_daily_status,
                bonus_tong,
                prevCompData
            };
        };

        if (viewMode === 'list' && !exportDeptFilter) {
            const list = rows.filter(r => r.type === 'employee' && (isFiltering ? departmentNames.includes(r.department!) : true))
                             .map(calculateWithComparison);

            list.sort((a, b) => {
                let valA: any, valB: any;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'target') { valA = a.calculatedTarget; valB = b.calculatedTarget; }
                else if (sortConfig.key === 'completion') { valA = a.calculatedCompletion; valB = b.calculatedCompletion; }
                else if (sortConfig.key === 'installment') { valA = a.calculatedInstallment; valB = b.calculatedInstallment; }
                else if (sortConfig.key === 'hqqd') { valA = a.hieuQuaQD; valB = b.hieuQuaQD; }
                else if (sortConfig.key === 'bankem') { valA = a.pctBillBk; valB = b.pctBillBk; }
                else { valA = (a as any)[sortConfig.key]; valB = (b as any)[sortConfig.key]; }
                const compare = typeof valA === 'string' && typeof valB === 'string' ? valA.localeCompare(valB) : (valA || 0) - (valB || 0);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const result = list.map((emp, index) => ({ ...emp, rank: index + 1 }));
            assignBonusTiers(result);
            
            if (result.length > 0) {
                const sumDtlk = result.reduce((s, e) => s + e.dtlk, 0);
                const sumDtqd = result.reduce((s, e) => s + e.dtqd, 0);
                const sumTarget = result.reduce((s, e) => s + (e.calculatedTarget || 0), 0);
                const avgHqqd = sumDtlk > 0 ? (sumDtqd / sumDtlk) - 1 : 0;
                const avgInstallment = result.reduce((s, e) => s + e.calculatedInstallment, 0) / result.length;
                const avgBk = result.reduce((s, e) => s + (e.pctBillBk || 0), 0) / result.length;
                const sumBonusTong = result.reduce((s, e) => s + (e.bonus_tong || 0), 0);
                
                const prevDtlk = result.reduce((s, e) => s + (e.prevCompData?.dtlk || 0), 0);
                const prevDtqd = result.reduce((s, e) => s + (e.prevCompData?.dtqd || 0), 0);
                const prevTarget = result.reduce((s, e) => s + (e.prevCompData?.target || 0), 0);

                result.push({
                    type: 'total',
                    name: 'TỔNG CỘNG',
                    dtlk: sumDtlk,
                    dtqd: sumDtqd,
                    calculatedTarget: sumTarget,
                    calculatedCompletion: sumTarget > 0 ? (sumDtqd / sumTarget) * 100 : 0,
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
                        pctBillBk: 0
                    } : null
                });
            }
            return result;
        }

        let deptGroups = deptsToProcess.map(deptName => {
            let deptEmployees = rows.filter(r => r.type === 'employee' && r.department === deptName)
                                    .map(calculateWithComparison);

            deptEmployees.sort((a, b) => {
                let valA: any, valB: any;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'target') { valA = a.calculatedTarget; valB = b.calculatedTarget; }
                else if (sortConfig.key === 'completion') { valA = a.calculatedCompletion; valB = b.calculatedCompletion; }
                else if (sortConfig.key === 'installment') { valA = a.calculatedInstallment; valB = b.calculatedInstallment; }
                else if (sortConfig.key === 'hqqd') { valA = a.hieuQuaQD; valB = b.hieuQuaQD; }
                else if (sortConfig.key === 'bankem') { valA = a.pctBillBk; valB = b.pctBillBk; }
                else { valA = (a as any)[sortConfig.key]; valB = (b as any)[sortConfig.key]; }
                const compare = typeof valA === 'string' && typeof valB === 'string' ? valA.localeCompare(valB) : (valA || 0) - (valB || 0);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const sumDtlk = deptEmployees.reduce((s, e) => s + e.dtlk, 0);
            const sumDtqd = deptEmployees.reduce((s, e) => s + e.dtqd, 0);
            const sumTarget = deptEmployees.reduce((s, e) => s + (e.calculatedTarget || 0), 0);
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
                avgInstallment,
                avgBk,
                avgHqqd,
                sumBonusTong,
                sortValue: sortConfig.key === 'dtqd' ? sumDtqd : (sortConfig.key === 'dtlk' ? sumDtlk : (sortConfig.key === 'name' ? deptName : (sortConfig.key === 'bonus_tong' ? sumBonusTong : sumDtqd)))
            };
        });

        deptGroups.sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? String(a.sortValue).localeCompare(String(b.sortValue)) : String(b.sortValue).localeCompare(String(a.sortValue));
            }
            return sortConfig.direction === 'asc' ? (a.sortValue as number) - (b.sortValue as number) : (b.sortValue as number) - (a.sortValue as number);
        });

        let finalOutput: any[] = [];
        let grandSumDtlk = 0, grandSumDtqd = 0, grandSumTarget = 0, grandTotalEmps = 0, grandSumInstallment = 0, grandSumBk = 0;
        let grandPrevDtlk = 0, grandPrevDtqd = 0, grandPrevTarget = 0;

        deptGroups.forEach(group => {
            if (group.employees.length > 0) {
                finalOutput.push({ 
                    type: 'department', 
                    name: group.name, 
                    dtlk: group.sumDtlk, 
                    dtqd: group.sumDtqd, 
                    calculatedTarget: group.sumTarget, 
                    calculatedCompletion: group.sumTarget > 0 ? (group.sumDtqd / group.sumTarget) * 100 : 0,
                    hieuQuaQD: group.avgHqqd,
                    calculatedInstallment: group.avgInstallment,
                    pctBillBk: group.avgBk,
                    remaining_total: Math.max(0, group.sumTarget - group.sumDtqd),
                    remaining_daily: Math.max(0, group.sumTarget - group.sumDtqd) / remainingDays,
                    bonus_tong: group.sumBonusTong
                });
                finalOutput.push(...group.employees.map((emp, index) => ({ ...emp, rank: index + 1 })));
                
                grandSumDtlk += group.sumDtlk;
                grandSumDtqd += group.sumDtqd;
                grandSumTarget += group.sumTarget;
                grandTotalEmps += group.employees.length;
                grandSumInstallment += group.employees.reduce((s, e) => s + e.calculatedInstallment, 0);
                grandSumBk += group.employees.reduce((s, e) => s + (e.pctBillBk || 0), 0);

                grandPrevDtlk += group.employees.reduce((s, e) => s + (e.prevCompData?.dtlk || 0), 0);
                grandPrevDtqd += group.employees.reduce((s, e) => s + (e.prevCompData?.dtqd || 0), 0);
                grandPrevTarget += group.employees.reduce((s, e) => s + (e.prevCompData?.target || 0), 0);
            }
        });

        const employeeRows = finalOutput.filter(r => r.type === 'employee');
        assignBonusTiers(employeeRows);

        if (finalOutput.length > 0 && !exportDeptFilter) {
            const grandSumBonusTong = finalOutput.filter(r => r.type === 'department').reduce((s, d) => s + (d.bonus_tong || 0), 0);
            finalOutput.push({
                type: 'total',
                name: 'TỔNG CỘNG',
                dtlk: grandSumDtlk,
                dtqd: grandSumDtqd,
                calculatedTarget: grandSumTarget,
                calculatedCompletion: grandSumTarget > 0 ? (grandSumDtqd / grandSumTarget) * 100 : 0,
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
                    pctBillBk: 0
                } : null
            });
        }

        return finalOutput;
    }, [rows, departmentNames, sortConfig, snapshotId, snapshotRows, prevMonthRows, departmentWeights, deptEmployeeCounts, supermarketTarget, employeeInstallmentMap, viewMode, exportDeptFilter, isActive, bonusData]);

    return { displayList };
};
