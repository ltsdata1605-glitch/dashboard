import { parseNumber, shortenSupermarketName } from '../../../utils/dataUtils';
// Employee ở types/nhanVienTypes.ts có thêm department (nhân viên đã gắn phòng ban) — khác với
// Employee cục bộ bên dưới (chỉ có tên, dùng khi phòng ban chưa xác định, vd. màn hình gán phòng ban)
import type { Employee as NhanVienEmployee } from '../types/nhanVienTypes';
import { parseRevenueData, standardizeEmployeeName } from '../utils/nhanVienHelpers';
import { parseCompetitionDataBySupermarket } from '../utils/dashboardHelpers';

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

export const parseEmployeeCompetitionTargets = (
    lines: string[],
    activeSupermarkets: string[],
    smDataMap: Map<string, { competitionTargets: Record<string, number>; departmentWeights: Record<string, number> }>,
    allEmployees: NhanVienEmployee[]
): Map<string, Map<string, number>> => {
    const targets = new Map<string, Map<string, number>>();
    for (const sm of activeSupermarkets) {
        const smData = smDataMap.get(sm);
        const competitionTargetsData = smData?.competitionTargets;
        const departmentWeightsData = smData?.departmentWeights;
        let currentComp: { name: string, targetIdx: number } | null = null;
        const shortSm = shortenSupermarketName(sm);

        // empWeights/totalW chỉ phụ thuộc departmentWeightsData (cố định theo sm), không đổi giữa
        // các dòng target khác nhau của cùng siêu thị — tính 1 lần/sm thay vì mỗi dòng khớp.
        //
        // departmentWeightsData[dept] là % target CỦA CẢ PHÒNG BAN (khớp định nghĩa ở
        // TargetHero.tsx/useDepartments.ts và cách useRevenueData.ts tính đúng:
        // empTarget = supermarketTarget*weight/empCount) — PHẢI chia đều cho số nhân viên
        // trong phòng ban đó mới ra phần của từng người. Trước đây gán thẳng % phòng ban cho
        // từng nhân viên rồi mới chuẩn hoá theo tổng, khiến phòng ban đông người bị thổi phồng
        // target ảo (%HT bị dìm thấp), phòng ban ít người bị hụt target ảo (%HT bị đẩy cao ảo).
        const deptCounts = new Map<string, number>();
        allEmployees.forEach(emp => {
            deptCounts.set(emp.department, (deptCounts.get(emp.department) || 0) + 1);
        });

        let totalW = 0;
        const empWeights = new Map<string, number>();
        allEmployees.forEach(emp => {
            const deptWeight = departmentWeightsData?.[emp.department];
            // Không có cấu hình weight riêng cho phòng ban này: fallback chia đều thẳng theo
            // tổng số nhân viên (bản thân giá trị này đã là phần/người, không chia thêm).
            const w = deptWeight !== undefined
                ? deptWeight / (deptCounts.get(emp.department) || 1)
                : (100 / allEmployees.length);
            empWeights.set(emp.originalName, w);
            totalW += w;
        });

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

            if (currentComp && shortenSupermarketName(parts[0]) === shortSm) {
                const targetValRaw = parts[currentComp.targetIdx];
                if (targetValRaw && totalW > 0) {
                    const baseTarget = parseNumber(targetValRaw);
                    const slider = competitionTargetsData?.[currentComp.name] ?? 100;
                    const adjTarget = baseTarget * (slider / 100);

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
    return targets;
};
