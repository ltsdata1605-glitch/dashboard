import { useMemo } from 'react';
import { DepartmentInfo, Employee } from '../../../services/parsers/employeeParser';
import { ManualDeptMapping } from '../types/nhanVienTypes';

interface UseDepartmentsProps {
    defaultDepartments: DepartmentInfo[];
    manualMapping: ManualDeptMapping;
    allEmployees: Employee[];
    departmentWeights: Record<string, number>;
}

export const useDepartments = ({
    defaultDepartments,
    manualMapping,
    allEmployees,
    departmentWeights
}: UseDepartmentsProps) => {
    
    const combinedDepts = useMemo(() => {
        const manualNames = Object.keys(manualMapping);
        if (manualNames.length === 0) return defaultDepartments.filter(d => d.employeeCount > 0);
        
        const activeEmpNames = new Set(allEmployees.map(e => e.originalName));
        
        const manualList = manualNames
            .map(name => ({ 
                name, 
                employeeCount: (manualMapping[name] || []).filter(empName => activeEmpNames.has(empName)).length, 
                isManual: true 
            }))
            .filter(d => d.employeeCount > 0);
        
        return manualList.sort((a, b) => {
            if (a.name === 'BP Khác') return 1;
            if (b.name === 'BP Khác') return -1;
            return a.name.localeCompare(b.name);
        });
    }, [defaultDepartments, manualMapping, allEmployees]);

    const effectiveWeights = useMemo(() => {
        const weights: Record<string, number> = { ...departmentWeights };
        const validNames = new Set(combinedDepts.map(d => d.name));
        
        Object.keys(weights).forEach(k => { 
            if (!validNames.has(k)) delete weights[k]; 
        });
        
        if (Object.keys(departmentWeights).length === 0) {
            let hasAllInOne = false;
            combinedDepts.forEach(d => {
                if (d.name.toUpperCase().includes('ALL IN ONE')) {
                    hasAllInOne = true;
                }
            });
            if (hasAllInOne) {
                combinedDepts.forEach(d => {
                    weights[d.name] = d.name.toUpperCase().includes('ALL IN ONE') ? 100 : 0;
                });
            } else {
                const share = 100 / (combinedDepts.length || 1);
                combinedDepts.forEach(d => { weights[d.name] = share; });
            }
        } else {
            let missing = combinedDepts.filter(d => weights[d.name] === undefined);
            if (missing.length > 0) {
                // Default to 0 for new departments to prevent accidental over-allocation
                missing.forEach(d => { weights[d.name] = 0; }); 
            }
        }
        return weights;
    }, [departmentWeights, combinedDepts]);

    const totalAllocatedWeight = useMemo(() => {
        return combinedDepts.reduce((sum, d) => sum + (effectiveWeights[d.name] || 0), 0);
    }, [combinedDepts, effectiveWeights]);

    const totalAllocatedEmployees = useMemo(() => {
        return combinedDepts.reduce((sum, d) => {
            const w = effectiveWeights[d.name] || 0;
            return sum + (w > 0 ? d.employeeCount : 0);
        }, 0);
    }, [combinedDepts, effectiveWeights]);

    return {
        combinedDepts,
        effectiveWeights,
        totalAllocatedWeight,
        totalAllocatedEmployees
    };
};
