import { useMemo } from 'react';
import { RevenueRow } from '../types/nhanVienTypes';

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
    exportDeptFilter
}: UseRevenueDataProps) => {

    const displayList = useMemo(() => {
        const isFiltering = !departmentNames.includes('all');
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        
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

            return { 
                ...emp, 
                calculatedTarget: empTarget, 
                calculatedCompletion: currentCompletion,
                calculatedInstallment: currentInstallment,
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
            
            if (result.length > 0) {
                const sumDtlk = result.reduce((s, e) => s + e.dtlk, 0);
                const sumDtqd = result.reduce((s, e) => s + e.dtqd, 0);
                const sumTarget = result.reduce((s, e) => s + (e.calculatedTarget || 0), 0);
                const avgHqqd = sumDtlk > 0 ? (sumDtqd / sumDtlk) - 1 : 0;
                const avgInstallment = result.reduce((s, e) => s + e.calculatedInstallment, 0) / result.length;
                const avgBk = result.reduce((s, e) => s + (e.pctBillBk || 0), 0) / result.length;
                
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

            return {
                name: deptName,
                employees: deptEmployees,
                sumDtlk,
                sumDtqd,
                sumTarget,
                avgInstallment,
                avgBk,
                avgHqqd,
                sortValue: sortConfig.key === 'dtqd' ? sumDtqd : (sortConfig.key === 'dtlk' ? sumDtlk : (sortConfig.key === 'name' ? deptName : sumDtqd))
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
                    pctBillBk: group.avgBk
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

        if (finalOutput.length > 0 && !exportDeptFilter) {
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
    }, [rows, departmentNames, sortConfig, snapshotId, snapshotRows, prevMonthRows, departmentWeights, deptEmployeeCounts, supermarketTarget, employeeInstallmentMap, viewMode, exportDeptFilter]);

    return { displayList };
};
