import { parseNumber, shortenSupermarketName } from '../../../utils/dataUtils';
// Employee ở types/nhanVienTypes.ts có thêm department (nhân viên đã gắn phòng ban) — khác với
// Employee cục bộ bên dưới (chỉ có tên, dùng khi phòng ban chưa xác định, vd. màn hình gán phòng ban)
import type { Employee as NhanVienEmployee } from '../types/nhanVienTypes';
import { parseRevenueData, standardizeEmployeeName, formatEmployeeName } from '../utils/nhanVienHelpers';
import { parseCompetitionDataBySupermarket } from '../utils/dashboardHelpers';
import type { AnalysisEmployeeItem } from './analysisEmployeeSyncService';

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
    const smData = parseCompetitionDataBySupermarket(competitionLuyKeData);
    const competitionList: Competition[] = [];
    const seen = new Set<string>();
    for (const sm in smData) {
        smData[sm].programs.forEach(p => {
            if (!seen.has(p.name)) {
                seen.add(p.name);
                competitionList.push({ name: p.name, criteria: p.metric || 'DTLK' });
            }
        });
    }
    return competitionList;
};

export const parseBaseTargetsMap = (competitionLuyKeData: string, supermarketName: string | null): Record<string, number> => {
    if (!competitionLuyKeData || !supermarketName) return {};
    const smData = parseCompetitionDataBySupermarket(competitionLuyKeData);
    const map: Record<string, number> = {};
    const targetSm = Object.keys(smData).find(k => k.includes(supermarketName) || supermarketName.includes(k) || k === supermarketName);
    if (targetSm && smData[targetSm]) {
        const headers = smData[targetSm].headers;
        const targetIdx = headers.findIndex(h => h.toUpperCase().includes('TARGET'));
        smData[targetSm].programs.forEach(p => {
            if (targetIdx !== -1 && p.data[targetIdx] !== undefined) {
                map[p.name] = parseNumber(p.data[targetIdx]);
            }
        });
    }
    return map;
};

export const parseAllEmployees = (allEmployeesRaw: string, hiddenEmployees: string[] = []): Employee[] => {
    if (!allEmployeesRaw) return [];
    
    const hiddenSet = new Set(hiddenEmployees.flatMap(h => [h, standardizeEmployeeName(h)]));
    
    // First try using parseRevenueData (handles both new BI multi-line/stream and legacy formats)
    const revenueRows = parseRevenueData(allEmployeesRaw);
    const fromRevenue = revenueRows
        .filter(r => r.type === 'employee' && r.originalName)
        .map(r => ({
            originalName: r.originalName!,
            name: r.originalName!
        }));
    
    if (fromRevenue.length > 0) {
        return fromRevenue.filter(emp => !hiddenSet.has(emp.originalName));
    }
    
    // Fallback: parse lines directly
    const result: Employee[] = [];
    const seen = new Set<string>();
    const lines = String(allEmployeesRaw).split(/\r?\n/).map(l => l.trim()).filter(l => l);

    for (const line of lines) {
        const firstPart = line.split('\t')[0].trim();
        if (firstPart.includes(' - ') && !firstPart.startsWith('BP ') && !firstPart.includes('http') && !firstPart.includes('Báo cáo') && !firstPart.includes('Dashboards')) {
            const canonicalName = standardizeEmployeeName(firstPart);
            if (!seen.has(canonicalName) && !hiddenSet.has(canonicalName) && !hiddenSet.has(firstPart)) {
                seen.add(canonicalName);
                result.push({
                    originalName: canonicalName,
                    name: canonicalName
                });
            }
        }
    }
    return result;
};

export const parseDepartments = (allEmployeesRaw: string, hiddenEmployees: string[] = []): DepartmentInfo[] => {
    if (!allEmployeesRaw) return [];
    
    const hiddenSet = new Set(hiddenEmployees.flatMap(h => [h, standardizeEmployeeName(h)]));
    const lines = allEmployeesRaw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const departmentList: DepartmentInfo[] = [];
    let currentDept: { name: string; employees: Set<string> } | null = null;
    
    for (const line of lines) {
        const parts = line.split('\t');
        const namePart = parts[0].trim();
        
        if (namePart.startsWith('BP ') && (parts.length > 1 || !line.includes('\t'))) {
            if (currentDept) {
                departmentList.push({ name: currentDept.name, employeeCount: currentDept.employees.size, isManual: false });
            }
            currentDept = { name: namePart, employees: new Set() };
        } else if (currentDept && (parts.length > 1 || namePart.includes(' - '))) {
            if (namePart.includes(' - ') && !namePart.includes('http') && !namePart.includes('Báo cáo') && !namePart.includes('Dashboards')) {
                const canonical = standardizeEmployeeName(namePart);
                if (!hiddenSet.has(namePart) && !hiddenSet.has(canonical)) {
                    currentDept.employees.add(canonical);
                }
            }
        }
    }
    
    if (currentDept) {
        departmentList.push({ name: currentDept.name, employeeCount: currentDept.employees.size, isManual: false });
    }
    
    if (departmentList.length === 0) {
        const validEmployees = parseAllEmployees(allEmployeesRaw, hiddenEmployees);
        if (validEmployees.length > 0) {
            departmentList.push({ name: 'BP ALL IN ONE - DMX', employeeCount: validEmployees.length, isManual: false });
        }
    }
    return departmentList;
};

export const parseSimpleDepartments = (danhSachData: string): DepartmentInfo[] => {
    return parseDepartments(danhSachData, []);
};

/**
 * Lấy danh sách nhân viên Employee[] chuẩn hoá từ danh sách Phân Tích (ưu tiên cao nhất).
 */
export const getEmployeesFromAnalysis = (
    analysisEmployees: AnalysisEmployeeItem[],
    hiddenEmployees: string[] = []
): Employee[] => {
    if (!analysisEmployees || analysisEmployees.length === 0) return [];
    const hiddenSet = new Set(hiddenEmployees.flatMap(h => [h, standardizeEmployeeName(h)]));
    return analysisEmployees
        .filter(e => !hiddenSet.has(e.originalName) && !hiddenSet.has(standardizeEmployeeName(e.originalName)))
        .map(e => ({
            originalName: e.originalName,
            name: e.name || formatEmployeeName(e.originalName)
        }));
};

/**
 * Trích xuất danh sách phòng ban dựa trên danh sách nhân viên Phân Tích (ưu tiên cao nhất).
 * Tự động phân bổ nhân viên vào các phòng ban (BP ...) tìm thấy trong báo cáo dán thô.
 */
export const getDepartmentsFromAnalysis = (
    analysisEmployees: AnalysisEmployeeItem[],
    rawEmployeesText: string = '',
    hiddenEmployees: string[] = []
): DepartmentInfo[] => {
    if (!analysisEmployees || analysisEmployees.length === 0) return [];
    const hiddenSet = new Set(hiddenEmployees.flatMap(h => [h, standardizeEmployeeName(h)]));
    const activeAnalysisEmployees = analysisEmployees.filter(
        e => !hiddenSet.has(e.originalName) && !hiddenSet.has(standardizeEmployeeName(e.originalName))
    );
    if (activeAnalysisEmployees.length === 0) return [];

    const analysisLookup = new Map<string, AnalysisEmployeeItem>();
    activeAnalysisEmployees.forEach(e => {
        analysisLookup.set(e.originalName.toLowerCase().trim(), e);
        analysisLookup.set(standardizeEmployeeName(e.originalName).toLowerCase().trim(), e);
        if (e.id) analysisLookup.set(e.id.toLowerCase().trim(), e);
    });

    const isMatch = (name: string): boolean => {
        const clean = name.toLowerCase().trim();
        if (analysisLookup.has(clean)) return true;
        const canonical = standardizeEmployeeName(name).toLowerCase().trim();
        if (analysisLookup.has(canonical)) return true;
        if (name.includes(' - ')) {
            const parts = name.split(' - ').map(p => p.trim().toLowerCase());
            if (analysisLookup.has(parts[0]) || analysisLookup.has(parts[1])) return true;
        }
        return false;
    };

    // Nếu có dữ liệu dán thô, quét các dòng phòng ban (BP ...) và chỉ đếm nhân viên thuộc Phân tích
    if (rawEmployeesText) {
        const lines = rawEmployeesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const deptMap = new Map<string, Set<string>>();
        let currentDeptName = '';
        const matchedEmpKeys = new Set<string>();

        for (const line of lines) {
            const parts = line.split('\t');
            const namePart = parts[0]?.trim() || '';
            if (namePart.startsWith('BP ') && (parts.length > 1 || !line.includes('\t'))) {
                currentDeptName = namePart;
                if (!deptMap.has(currentDeptName)) deptMap.set(currentDeptName, new Set());
            } else if (currentDeptName && (parts.length > 1 || namePart.includes(' - '))) {
                if (namePart.includes(' - ') && !namePart.includes('http') && !namePart.includes('Báo cáo') && !namePart.includes('Dashboards')) {
                    if (isMatch(namePart)) {
                        const canonical = standardizeEmployeeName(namePart);
                        deptMap.get(currentDeptName)!.add(canonical);
                        matchedEmpKeys.add(canonical);
                    }
                }
            }
        }

        if (deptMap.size > 0 && matchedEmpKeys.size > 0) {
            // Các nhân viên Phân tích chưa xuất hiện trong báo cáo dán thô: gom vào phòng ban chính đầu tiên
            const firstDeptName = Array.from(deptMap.keys())[0];
            activeAnalysisEmployees.forEach(e => {
                const canonical = standardizeEmployeeName(e.originalName);
                if (!matchedEmpKeys.has(canonical)) {
                    deptMap.get(firstDeptName)!.add(canonical);
                }
            });

            return Array.from(deptMap.entries())
                .filter(([_, set]) => set.size > 0)
                .map(([name, set]) => ({
                    name,
                    employeeCount: set.size,
                    isManual: false
                }));
        }
    }

    // Fallback nếu không có dữ liệu dán thô hoặc dữ liệu không có phòng ban
    const fallbackMap = new Map<string, number>();
    activeAnalysisEmployees.forEach(e => {
        const d = (e.department && e.department !== 'Kinh Doanh') ? e.department : 'BP ALL IN ONE - DMX';
        fallbackMap.set(d, (fallbackMap.get(d) || 0) + 1);
    });

    return Array.from(fallbackMap.entries()).map(([name, count]) => ({
        name,
        employeeCount: count,
        isManual: false
    }));
};

export const parseEmployeeCompetitionTargets = (
    lines: string[],
    activeSupermarkets: string[],
    smDataMap: Map<string, { competitionTargets: Record<string, number>; departmentWeights: Record<string, number> }>,
    allEmployees: NhanVienEmployee[]
): Map<string, Map<string, number>> => {
    const targets = new Map<string, Map<string, number>>();
    const fullText = lines.join('\n');

    // Dùng parseCompetitionDataBySupermarket — đã xử lý đúng cả format cũ (tab ngang)
    // lẫn format mới (BI dọc với DOANH THU/SỐ LƯỢNG/TARGET/% HT THÁNG)
    const parsedBySm = parseCompetitionDataBySupermarket(fullText);

    for (const sm of activeSupermarkets) {
        const smData = smDataMap.get(sm);
        const competitionTargetsData = smData?.competitionTargets;
        const departmentWeightsData = smData?.departmentWeights;
        const shortSm = shortenSupermarketName(sm);

        // Tìm siêu thị trong parsed data (fuzzy match)
        const matchedSmKey = Object.keys(parsedBySm).find(k =>
            shortenSupermarketName(k) === shortSm ||
            k.includes(sm) || sm.includes(k)
        );

        if (!matchedSmKey || !parsedBySm[matchedSmKey]) continue;

        const smParsedData = parsedBySm[matchedSmKey];

        // empWeights: trọng số phòng ban chia đều cho NV trong BP đó
        const deptCounts = new Map<string, number>();
        allEmployees.forEach(emp => {
            deptCounts.set(emp.department, (deptCounts.get(emp.department) || 0) + 1);
        });

        let totalW = 0;
        const empWeights = new Map<string, number>();
        allEmployees.forEach(emp => {
            const deptWeight = departmentWeightsData?.[emp.department];
            const w = deptWeight !== undefined
                ? deptWeight / (deptCounts.get(emp.department) || 1)
                : (100 / allEmployees.length);
            empWeights.set(emp.originalName, w);
            totalW += w;
        });

        if (totalW <= 0) continue;

        // Tìm cột TARGET trong headers
        const headers = smParsedData.headers;
        const targetIdx = headers.findIndex(h => {
            const up = h.toUpperCase();
            return up.includes('TARGET') || up.includes('MỤC TIÊU');
        });

        if (targetIdx === -1) continue;

        // Duyệt từng chương trình thi đua, lấy target value, phân bổ cho NV
        for (const program of smParsedData.programs) {
            const compName = program.name;
            const targetValRaw = program.data[targetIdx];
            if (targetValRaw === undefined || targetValRaw === null) continue;

            const baseTarget = parseNumber(targetValRaw);
            if (baseTarget <= 0) continue;

            const slider = competitionTargetsData?.[compName] ?? 100;
            const adjTarget = baseTarget * (slider / 100);

            if (!targets.has(compName)) targets.set(compName, new Map());
            const compT = targets.get(compName)!;
            allEmployees.forEach(emp => {
                const existing = compT.get(emp.originalName) || 0;
                compT.set(emp.originalName, existing + (adjTarget * (empWeights.get(emp.originalName)! / totalW)));
            });
        }
    }
    return targets;
};
