import { parseNumber } from '../../utils/dataUtils';

export interface Employee {
    originalName: string;
    name: string;
}

export interface DepartmentInfo {
    name: string;
    employeeCount: number;
    isManual?: boolean;
}

export interface Competition {
    name: string;
    criteria: string;
}

export const parseBaseTargetQuyDoi = (summaryLuyKeData: string, supermarketName: string): number => {
    if (!summaryLuyKeData) return 0;
    const lines = String(summaryLuyKeData).split('\n');
    const supermarketLine = lines.find(line => line.trim().startsWith(supermarketName));
    if (!supermarketLine) return 0;
    const columns = supermarketLine.split('\t');
    const dtDuKienQd = parseNumber(columns[5]);
    const htTargetPercent = parseNumber(columns[6]);
    if (isNaN(dtDuKienQd) || isNaN(htTargetPercent) || htTargetPercent === 0) return 0;
    return dtDuKienQd / (htTargetPercent / 100);
};

export const parseCompetitions = (competitionLuyKeData: string): Competition[] => {
    if (!competitionLuyKeData) return [];
    const competitionList: Competition[] = [];
    const seen = new Set<string>();
    const valid = ['DTLK', 'DTQĐ', 'SLLK'];
    for (const line of competitionLuyKeData.split('\n')) {
        const parts = line.split('\t');
        if (parts.length > 2 && valid.includes(parts[1]?.trim()) && parts[2]?.trim() === 'Target') {
            const name = parts[0].trim();
            if (name && !seen.has(name)) {
                competitionList.push({ name, criteria: parts[1].trim() });
                seen.add(name);
            }
        }
    }
    return competitionList;
};

export const parseBaseTargetsMap = (competitionLuyKeData: string, supermarketName: string | null): Record<string, number> => {
    if (!competitionLuyKeData || !supermarketName) return {};
    const lines = String(competitionLuyKeData).split('\n');
    const map: Record<string, number> = {};
    let currentComp: string | null = null;
    for (const line of lines) {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length > 2 && (parts[1] === 'DTLK' || parts[1] === 'DTQĐ' || parts[1] === 'SLLK') && parts[2] === 'Target') { 
            currentComp = parts[0]; 
            continue; 
        }
        if (currentComp && parts[0] === supermarketName) { 
            map[currentComp] = parseNumber(parts[2]); 
        }
    }
    return map;
};

export const parseAllEmployees = (allEmployeesRaw: string, hiddenEmployees: string[] = []): Employee[] => {
    if (!allEmployeesRaw) return [];
    
    return allEmployeesRaw.split('\n')
        .map(l => l.trim())
        .filter(l => {
            const namePart = l.split('\t')[0];
            if (!namePart.includes(' - ')) return false;
            
            // Hardcoded exclusion rules from previous implementation
            if (namePart.startsWith('BP ') || 
                namePart.startsWith('Hỗ trợ BI') || 
                namePart.startsWith('NNH ') || 
                namePart.startsWith('ĐML_STR_STR') || 
                /^\d/.test(namePart)) {
                return false;
            }
            
            const parts = namePart.split(' - ');
            const possibleId = parts[parts.length - 1].trim();
            return /^\d+$/.test(possibleId);
        })
        .map(l => {
            const originalName = l.split('\t')[0];
            return { originalName, name: originalName };
        })
        .filter(emp => !hiddenEmployees.includes(emp.originalName));
};

export const parseDepartments = (allEmployeesRaw: string, hiddenEmployees: string[] = []): DepartmentInfo[] => {
    if (!allEmployeesRaw) return [];
    
    const lines = allEmployeesRaw.split('\n').map(l => l.trim()).filter(l => l);
    const departmentList: DepartmentInfo[] = [];
    let currentDept: DepartmentInfo | null = null;
    
    for (const line of lines) {
        const parts = line.split('\t');
        const namePart = parts[0];
        
        if (namePart.startsWith('BP ') && parts.length > 1) {
            if (currentDept) departmentList.push(currentDept);
            currentDept = { name: namePart.trim(), employeeCount: 0, isManual: false };
        } else if (currentDept && parts.length > 1) {
            if (namePart.includes(' - ') && 
                !namePart.startsWith('Hỗ trợ BI') && 
                !namePart.startsWith('NNH ') && 
                !namePart.startsWith('ĐML_STR_STR') && 
                !/^\d/.test(namePart)) {
                
                const npParts = namePart.split(' - ');
                const possibleId = npParts[npParts.length - 1].trim();
                
                if (/^\d+$/.test(possibleId) && !hiddenEmployees.includes(namePart)) {
                    currentDept.employeeCount++;
                }
            }
        }
    }
    
    if (currentDept) departmentList.push(currentDept);
    return departmentList;
};

export const parseSimpleDepartments = (danhSachData: string): DepartmentInfo[] => {
    if (!danhSachData || !danhSachData.includes('Nhân viên\tDTLK\tDTQĐ\tHiệu quả QĐ\tSố lượng\tĐơn giá')) return [];
    
    const lines = danhSachData.split('\n').map(l => l.trim()).filter(l => l);
    const departmentList: DepartmentInfo[] = [];
    let currentDept: DepartmentInfo | null = null;
    
    for (const line of lines) {
        const parts = line.split('\t');
        if (line.startsWith('BP ') && parts.length > 1) {
            if (currentDept) departmentList.push(currentDept);
            currentDept = { name: parts[0].trim(), employeeCount: 0 };
        } else if (currentDept && parts.length > 1) {
            currentDept.employeeCount++;
        }
    }
    
    if (currentDept) departmentList.push(currentDept);
    return departmentList;
};

export const parseEmployeeCompetitionTargets = (
    lines: string[],
    activeSupermarkets: string[],
    smDataMap: Map<string, { competitionTargets: any; departmentWeights: any }>,
    allEmployees: any[]
): Map<string, Map<string, number>> => {
    const targets = new Map<string, Map<string, number>>();
    for (const sm of activeSupermarkets) {
        const smData = smDataMap.get(sm);
        const competitionTargetsData = smData?.competitionTargets;
        const departmentWeightsData = smData?.departmentWeights;
        let currentComp: { name: string, targetIdx: number } | null = null;
        
        for (const line of lines) {
            const parts = line.split('\t').map(p => p.trim());
            
            if (parts.length > 2) {
                const p1 = parts[1].toUpperCase();
                const isMetric = ['DTLK', 'DTQĐ', 'SLLK', 'DT REALTIME', 'SL REALTIME', 'DT REALTIME (QĐ)'].some(m => p1.includes(m));
                if (isMetric) {
                    const targetIdx = parts.findIndex(p => {
                        const up = p.toUpperCase();
                        return up.includes('TARGET') || up.includes('MỤC TIÊU');
                    });
                    if (targetIdx > -1) {
                        currentComp = { name: parts[0], targetIdx };
                        continue;
                    }
                }
            }
            
            if (currentComp && parts[0] === sm) {
                const targetValRaw = parts[currentComp.targetIdx];
                if (targetValRaw) {
                    const baseTarget = parseNumber(targetValRaw);
                    const slider = competitionTargetsData?.[currentComp.name] ?? 100;
                    const adjTarget = baseTarget * (slider / 100);
                    
                    let totalW = 0;
                    const empWeights = new Map<string, number>();
                    allEmployees.forEach(emp => { 
                        const w = departmentWeightsData?.[emp.department] ?? (100 / allEmployees.length); 
                        empWeights.set(emp.originalName, w); 
                        totalW += w; 
                    });
                    
                    if (totalW > 0) {
                        if (!targets.has(currentComp.name)) targets.set(currentComp.name, new Map());
                        const compT = targets.get(currentComp.name)!;
                        allEmployees.forEach(emp => { 
                            const existing = compT.get(emp.originalName) || 0;
                            compT.set(emp.originalName, existing + (adjTarget * (empWeights.get(emp.originalName)! / totalW))); 
                        });
                    }
                }
            }
        }
    }
    return targets;
};
