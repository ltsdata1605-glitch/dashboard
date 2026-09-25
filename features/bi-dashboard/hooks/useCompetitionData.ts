import { useMemo, useCallback } from 'react';
import { Criterion, CompetitionHeader, Employee } from '../types/nhanVienTypes';
import { extractEmployeeId, standardizeEmployeeName, type CompetitionEmployeeRow } from '../utils/nhanVienHelpers';

interface UseCompetitionDataProps {
    groupedData: Record<Criterion, { headers: CompetitionHeader[]; employees: CompetitionEmployeeRow[] }>;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    selectedCompetitions: Set<string>;
    activeCompetitionTab: Criterion | 'nhom' | 'canhan' | 'tong' | 'tatca' | 'sosanh';
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
    { dot: 'bg-sky-500', row: 'bg-sky-200 dark:bg-sky-900/60' },
    { dot: 'bg-emerald-500', row: 'bg-emerald-200 dark:bg-emerald-900/60' }, 
    { dot: 'bg-rose-500', row: 'bg-rose-200 dark:bg-rose-900/60' },
    { dot: 'bg-sky-500', row: 'bg-sky-200 dark:bg-sky-900/60' },
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
        if (
            activeCompetitionTab === 'nhom' || 
            activeCompetitionTab === 'canhan' || 
            activeCompetitionTab === 'tong' || 
            activeCompetitionTab === 'tatca' ||
            activeCompetitionTab === 'sosanh' ||
            !allCompetitionsByCriterion[activeCompetitionTab as Criterion]
        ) {
             return allCompetitionsByCriterion;
        }
        return { [activeCompetitionTab]: allCompetitionsByCriterion[activeCompetitionTab as Criterion] } as Record<string, { headers: CompetitionHeader[] }>;
    }, [activeCompetitionTab, allCompetitionsByCriterion, isActive]);

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
                .filter((h: CompetitionHeader) => selectedCompetitions.has(h.originalTitle))
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

    // Map tra cứu O(1) vị trí trong allEmployees hỗ trợ đầy đủ: originalName, name, chuẩn hoá và Mã NV
    const employeeIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        allEmployees.forEach((e, idx) => {
            if (e.originalName && !map.has(e.originalName)) map.set(e.originalName, idx);
            if (e.name && !map.has(e.name)) map.set(e.name, idx);
            const stdOrig = standardizeEmployeeName(e.originalName);
            if (stdOrig && !map.has(stdOrig)) map.set(stdOrig, idx);
            const stdName = standardizeEmployeeName(e.name);
            if (stdName && !map.has(stdName)) map.set(stdName, idx);
            const id = extractEmployeeId(e.originalName) || extractEmployeeId(e.name);
            if (id && !map.has(id)) map.set(id, idx);
        });
        return map;
    }, [allEmployees]);

    const effectiveHighlightColorMap = useMemo(() => {
        if (isActive === false) return {};
        const map: Record<string, string> = {};

        const addHighlightForEmployee = (emp: Employee, color: string) => {
            if (emp.originalName) map[emp.originalName] = color;
            if (emp.name) map[emp.name] = color;
            const stdOrig = standardizeEmployeeName(emp.originalName);
            if (stdOrig) map[stdOrig] = color;
            const stdName = standardizeEmployeeName(emp.name);
            if (stdName) map[stdName] = color;
            const id = extractEmployeeId(emp.originalName) || extractEmployeeId(emp.name);
            if (id) {
                map[id] = color;
                map[`id_${id}`] = color;
            }
        };

        if (isolatedHighlightEmployee) {
            const empId = extractEmployeeId(isolatedHighlightEmployee);
            const employeeIndex = employeeIndexMap.get(isolatedHighlightEmployee) ?? (empId ? employeeIndexMap.get(empId) : undefined);
            if (employeeIndex !== undefined && allEmployees[employeeIndex]) {
                const color = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
                addHighlightForEmployee(allEmployees[employeeIndex], color);
            }
            return map;
        }

        const highlightedArray = Array.from(highlightedEmployees) as string[];
        highlightedArray.forEach((name) => {
            const empId = extractEmployeeId(name);
            const employeeIndex = employeeIndexMap.get(name) ?? (empId ? employeeIndexMap.get(empId) : undefined);
            if (employeeIndex !== undefined && allEmployees[employeeIndex]) {
                const color = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
                addHighlightForEmployee(allEmployees[employeeIndex], color);
            } else {
                map[name] = HIGHLIGHT_COLORS[0].row;
                if (empId) {
                    map[empId] = HIGHLIGHT_COLORS[0].row;
                    map[`id_${empId}`] = HIGHLIGHT_COLORS[0].row;
                }
            }
        });
        return map;
    }, [highlightedEmployees, isolatedHighlightEmployee, employeeIndexMap, allEmployees, isActive]);

    const getEmployeeDotColor = useCallback((originalName: string) => {
        const empId = extractEmployeeId(originalName);
        const index = employeeIndexMap.get(originalName) ?? (empId ? employeeIndexMap.get(empId) : undefined);
        if (index === undefined) return 'bg-slate-300';
        return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].dot;
    }, [employeeIndexMap]);

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
