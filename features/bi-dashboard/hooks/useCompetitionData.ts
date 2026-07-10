import { useMemo, useCallback } from 'react';
import { Criterion, CompetitionHeader, Employee } from '../types/nhanVienTypes';
import type { CompetitionEmployeeRow } from '../utils/nhanVienHelpers';

interface UseCompetitionDataProps {
    groupedData: Record<Criterion, { headers: CompetitionHeader[]; employees: CompetitionEmployeeRow[] }>;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    selectedCompetitions: Set<string>;
    activeCompetitionTab: Criterion | 'nhom' | 'canhan' | 'tong' | 'sosanh';
    activeDepartments: string[];
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    allEmployees: Employee[];
    highlightedEmployees: Set<string>;
    isolatedHighlightEmployee: string | null;
    isActive?: boolean;
}

const HIGHLIGHT_COLORS = [
    { dot: 'bg-emerald-500', row: 'bg-emerald-200 dark:bg-emerald-900/60' },
    { dot: 'bg-rose-500', row: 'bg-rose-200 dark:bg-rose-900/60' },
    { dot: 'bg-sky-500', row: 'bg-sky-200 dark:bg-sky-900/60' },
    { dot: 'bg-amber-500', row: 'bg-amber-200 dark:bg-amber-900/60' },
    { dot: 'bg-indigo-500', row: 'bg-indigo-200 dark:bg-indigo-900/60' },
    { dot: 'bg-emerald-500', row: 'bg-emerald-200 dark:bg-emerald-900/60' }, 
    { dot: 'bg-rose-500', row: 'bg-rose-200 dark:bg-rose-900/60' },
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
    isolatedHighlightEmployee,
    isActive
}: UseCompetitionDataProps) => {
    const criteriaOrder: Criterion[] = ['SLLK', 'DTLK', 'DTQĐ'];

    const hasAnyData = criteriaOrder.some(c => groupedData[c] && groupedData[c].headers.length > 0);

    const relevantCompetitions = useMemo(() => {
        if (isActive === false) return {} as Record<string, { headers: CompetitionHeader[] }>;
        if (activeCompetitionTab === 'nhom' || activeCompetitionTab === 'canhan' || activeCompetitionTab === 'tong') {
             return allCompetitionsByCriterion;
        }
        return { [activeCompetitionTab]: allCompetitionsByCriterion[activeCompetitionTab] } as Record<string, { headers: CompetitionHeader[] }>;
    }, [activeCompetitionTab, allCompetitionsByCriterion]);

    const filteredEmployees = useMemo(() => {
        if (isActive === false) return [];
        const allCriterionEmployees = criteriaOrder.flatMap(criterion => groupedData[criterion]?.employees || []);
        const uniqueEmployeesMap = new Map();
        allCriterionEmployees.forEach(e => {
            if (e && e.name) uniqueEmployeesMap.set(e.name, e);
        });
        const uniqueEmployees = Array.from(uniqueEmployeesMap.values());
        
        const isStoreRow = (name: string) => {
            const cleanName = name.trim();
            return (
                /^ĐMX\s*-/i.test(cleanName) || 
                /^DMX\s*-/i.test(cleanName) || 
                /^BP\s+/i.test(cleanName) || 
                cleanName.toLowerCase().includes('all in one')
            );
        };

        return uniqueEmployees
            .filter((emp) => emp && (activeDepartments.includes('all') || activeDepartments.includes(emp.department)))
            .filter((emp) => !isStoreRow(emp.name))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [groupedData, activeDepartments, isActive]);

    const employeeDataMap = useMemo(() => {
        if (isActive === false) return new Map();
        const map = new Map<string, {name: string; department: string; values: Record<string, number | null>}>();
        criteriaOrder.forEach(criterion => {
            const data = groupedData[criterion];
            if (!data) return;
            data.employees.forEach((employee) => {
                if (!map.has(employee.name)) map.set(employee.name, { name: employee.name, department: employee.department, values: {} });
                const employeeRecord = map.get(employee.name)!;
                data.headers.forEach((header, index: number) => {
                    employeeRecord.values[header.title] = employee.values[index];
                });
            });
        });
        return map;
    }, [groupedData, isActive]);

    const selectedHeadersForNhom = useMemo(() => {
        if (isActive === false) return [];
        return criteriaOrder.flatMap(criterion =>
            (allCompetitionsByCriterion[criterion]?.headers || [])
                .filter((h: CompetitionHeader) => selectedCompetitions.has(h.title))
                .map((header, index: number) => ({ ...header, criterion, originalIndex: index }))
        );
    }, [allCompetitionsByCriterion, selectedCompetitions, isActive]);

    const sortedSelectedHeaders = useMemo(() => {
        if (isActive === false) return [];
        if (selectedHeadersForNhom.length === 0) return [];
        return [...selectedHeadersForNhom].sort((a, b) => {
            const targetsA = employeeCompetitionTargets.get(a.originalTitle);
            let totalTargetA = 0, totalActualA = 0;
            filteredEmployees.forEach((emp) => {
                totalTargetA += targetsA?.get(emp.originalName) ?? 0;
                totalActualA += employeeDataMap.get(emp.name)?.values[a.title] ?? 0;
            });
            const completionA = totalTargetA > 0 ? (totalActualA / totalTargetA) : 0;
    
            const targetsB = employeeCompetitionTargets.get(b.originalTitle);
            let totalTargetB = 0, totalActualB = 0;
            filteredEmployees.forEach((emp) => {
                totalTargetB += targetsB?.get(emp.originalName) ?? 0;
                totalActualB += employeeDataMap.get(emp.name)?.values[b.title] ?? 0;
            });
            const completionB = totalTargetB > 0 ? (totalActualB / totalTargetB) : 0;
            return completionB - completionA;
        });
    }, [selectedHeadersForNhom, filteredEmployees, employeeDataMap, employeeCompetitionTargets, isActive]);

    const effectiveHighlightColorMap = useMemo(() => {
        if (isActive === false) return {};
        const map: Record<string, string> = {};
        if (isolatedHighlightEmployee) {
             const employeeIndex = allEmployees.findIndex((e) => e.originalName === isolatedHighlightEmployee);
             if (employeeIndex !== -1) map[isolatedHighlightEmployee] = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
             return map;
        }
        const highlightedArray = Array.from(highlightedEmployees) as string[];
        highlightedArray.forEach((name) => {
            const employeeIndex = allEmployees.findIndex((e) => e.originalName === name);
            if (employeeIndex !== -1) map[name] = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
        });
        return map;
    }, [highlightedEmployees, isolatedHighlightEmployee, allEmployees, isActive]);

    const getEmployeeDotColor = useCallback((originalName: string) => {
        const index = allEmployees.findIndex((e) => e.originalName === originalName);
        if (index === -1) return 'bg-slate-300';
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
