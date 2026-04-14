import { useMemo, useCallback } from 'react';
import { Criterion, CompetitionHeader } from '../types/nhanVienTypes';

const HIGHLIGHT_COLORS = [
    { dot: 'bg-teal-500', row: 'bg-teal-200 dark:bg-teal-900/60' },
    { dot: 'bg-rose-500', row: 'bg-rose-200 dark:bg-rose-900/60' },
    { dot: 'bg-sky-500', row: 'bg-sky-200 dark:bg-sky-900/60' },
    { dot: 'bg-amber-500', row: 'bg-amber-200 dark:bg-amber-900/60' },
    { dot: 'bg-violet-500', row: 'bg-violet-200 dark:bg-violet-900/60' },
    { dot: 'bg-lime-500', row: 'bg-lime-200 dark:bg-teal-900/60' }, 
    { dot: 'bg-pink-500', row: 'bg-pink-200 dark:bg-pink-900/60' },
    { dot: 'bg-indigo-500', row: 'bg-indigo-200 dark:bg-indigo-900/60' },
];

export const useCompetitionData = ({
    groupedData,
    allCompetitionsByCriterion,
    selectedCompetitions,
    activeCompetitionTab,
    activeDepartments,
    employeeCompetitionTargets,
    allEmployees,
    highlightedEmployees,
    isolatedHighlightEmployee
}: any) => {
    const criteriaOrder: Criterion[] = ['DTLK', 'DTQĐ', 'SLLK'];

    const hasAnyData = criteriaOrder.some(c => groupedData[c] && groupedData[c].headers.length > 0);

    const relevantCompetitions = useMemo(() => {
        if (activeCompetitionTab === 'nhom' || activeCompetitionTab === 'canhan' || activeCompetitionTab === 'tong') {
             return allCompetitionsByCriterion;
        }
        return { [activeCompetitionTab]: allCompetitionsByCriterion[activeCompetitionTab] } as Record<string, { headers: CompetitionHeader[] }>;
    }, [activeCompetitionTab, allCompetitionsByCriterion]);

    const filteredEmployees = useMemo(() => {
        const allCriterionEmployees = criteriaOrder.flatMap(criterion => groupedData[criterion]?.employees || []);
        const uniqueEmployeesMap = new Map();
        allCriterionEmployees.forEach(e => {
            if (e && e.name) uniqueEmployeesMap.set(e.name, e);
        });
        const uniqueEmployees = Array.from(uniqueEmployeesMap.values());
        return uniqueEmployees
            .filter((emp: any) => emp && (activeDepartments.includes('all') || activeDepartments.includes(emp.department)))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [groupedData, activeDepartments]);

    const employeeDataMap = useMemo(() => {
        const map = new Map<string, {name: string; department: string; values: Record<string, number | null>}>();
        criteriaOrder.forEach(criterion => {
            const data = groupedData[criterion];
            if (!data) return;
            data.employees.forEach((employee: any) => {
                if (!map.has(employee.name)) map.set(employee.name, { name: employee.name, department: employee.department, values: {} });
                const employeeRecord = map.get(employee.name)!;
                data.headers.forEach((header: any, index: number) => {
                    employeeRecord.values[header.title] = employee.values[index];
                });
            });
        });
        return map;
    }, [groupedData]);

    const selectedHeadersForNhom = useMemo(() => {
        return criteriaOrder.flatMap(criterion =>
            (allCompetitionsByCriterion[criterion]?.headers || [])
                .filter((h: CompetitionHeader) => selectedCompetitions.has(h.title))
                .map((header: any, index: number) => ({ ...header, criterion, originalIndex: index }))
        );
    }, [allCompetitionsByCriterion, selectedCompetitions]);

    const sortedSelectedHeaders = useMemo(() => {
        if (selectedHeadersForNhom.length === 0) return [];
        return [...selectedHeadersForNhom].sort((a, b) => {
            const targetsA = employeeCompetitionTargets.get(a.originalTitle);
            let totalTargetA = 0, totalActualA = 0;
            filteredEmployees.forEach((emp: any) => {
                totalTargetA += targetsA?.get(emp.originalName) ?? 0;
                totalActualA += employeeDataMap.get(emp.name)?.values[a.title] ?? 0;
            });
            const completionA = totalTargetA > 0 ? (totalActualA / totalTargetA) : 0;
    
            const targetsB = employeeCompetitionTargets.get(b.originalTitle);
            let totalTargetB = 0, totalActualB = 0;
            filteredEmployees.forEach((emp: any) => {
                totalTargetB += targetsB?.get(emp.originalName) ?? 0;
                totalActualB += employeeDataMap.get(emp.name)?.values[b.title] ?? 0;
            });
            const completionB = totalTargetB > 0 ? (totalActualB / totalTargetB) : 0;
            return completionB - completionA;
        });
    }, [selectedHeadersForNhom, filteredEmployees, employeeDataMap, employeeCompetitionTargets]);

    const effectiveHighlightColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (isolatedHighlightEmployee) {
             const employeeIndex = allEmployees.findIndex((e: any) => e.originalName === isolatedHighlightEmployee);
             if (employeeIndex !== -1) map[isolatedHighlightEmployee] = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
             return map;
        }
        const highlightedArray = Array.from(highlightedEmployees) as string[];
        highlightedArray.forEach((name) => {
            const employeeIndex = allEmployees.findIndex((e: any) => e.originalName === name);
            if (employeeIndex !== -1) map[name] = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
        });
        return map;
    }, [highlightedEmployees, isolatedHighlightEmployee, allEmployees]);

    const getEmployeeDotColor = useCallback((originalName: string) => {
        const index = allEmployees.findIndex((e: any) => e.originalName === originalName);
        if (index === -1) return 'bg-gray-300';
        return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].dot;
    }, [allEmployees]);

    return {
        hasAnyData,
        relevantCompetitions,
        filteredEmployees,
        employeeDataMap,
        selectedHeadersForNhom,
        sortedSelectedHeaders,
        effectiveHighlightColorMap,
        getEmployeeDotColor,
        criteriaOrder
    };
};
