import { parseNumber, shortenSupermarketName } from '../../../utils/dataUtils';
// Employee ở types/nhanVienTypes.ts có thêm department (nhân viên đã gắn phòng ban) — khác với
// Employee cục bộ bên dưới (chỉ có tên, dùng khi phòng ban chưa xác định, vd. màn hình gán phòng ban)
import type { Employee as NhanVienEmployee } from '../types/nhanVienTypes';
import { parseRevenueData, standardizeEmployeeName, formatEmployeeName, extractEmployeeId } from '../utils/nhanVienHelpers';
import { parseCompetitionDataBySupermarket, parseSummaryData, findMatchingSupermarketKey } from '../utils/dashboardHelpers';
import { isSystemOrIgnoredEmployee, type AnalysisEmployeeItem } from './analysisEmployeeSyncService';
import { isIgnoredDept } from '../utils/nhanVienHelpers';

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

    // Sử dụng parseSummaryData chuẩn hoá của hệ thống để phân tích cấu trúc bảng & header
    const { table, kpis } = parseSummaryData(summaryLuyKeData);

    // 1. Tìm vị trí cột Target trong danh sách headers
    let targetIdx = table.headers.findIndex(h => {
        const u = h.trim().toUpperCase();
        return u === 'TARGET' || u === 'TARGET (QĐ)' || u === 'TARGET(QĐ)' || u === 'TAR' || u === 'TARGET TRỌN KỲ';
    });
    if (targetIdx === -1) {
        targetIdx = table.headers.findIndex(h => h.trim().toUpperCase().includes('TARGET'));
    }
    // Trong định dạng portal mới: standardHeaders có 'Target (QĐ)' ở cột index 5
    if (targetIdx === -1 && table.headers.length > 5) {
        targetIdx = 5;
    }

    // 2. Tìm hàng tương ứng với siêu thị
    let matchedRow: string[] | undefined;
    if (supermarketName === 'Tổng') {
        matchedRow = table.rows.find(r => r[0]?.trim().startsWith('Tổng'));
    } else {
        const safeTarget = shortenSupermarketName(supermarketName).toLowerCase();
        matchedRow = table.rows.find(r => {
            const rName = r[0]?.trim() || '';
            if (rName.startsWith('Tổng')) return false;
            const rSafe = shortenSupermarketName(rName).toLowerCase();
            return rName === supermarketName ||
                   rSafe === safeTarget ||
                   rName.toLowerCase().includes(safeTarget) ||
                   safeTarget.includes(rSafe);
        });

        // Nếu bảng chỉ có duy nhất 1 siêu thị (không tính dòng Tổng), tự động chọn dòng đó
        if (!matchedRow) {
            const storeRows = table.rows.filter(r => !r[0]?.trim().startsWith('Tổng'));
            if (storeRows.length === 1) {
                matchedRow = storeRows[0];
            }
        }
    }

    // 3. Trích xuất giá trị Target từ dòng siêu thị
    if (matchedRow) {
        if (targetIdx !== -1 && matchedRow[targetIdx] !== undefined) {
            const val = parseNumber(matchedRow[targetIdx]);
            if (val > 0) return val;
        }
        if (matchedRow[5] !== undefined) {
            const val = parseNumber(matchedRow[5]);
            if (val > 0) return val;
        }
    }

    // 4. Dự phòng: lấy từ kpis.targetQD (nếu xem Tổng hoặc báo cáo 1 siêu thị)
    if (kpis.targetQD) {
        const val = parseNumber(kpis.targetQD);
        if (val > 0) return val;
    }

    // 5. Dự phòng quét dòng tab-separated thô
    const lines = String(summaryLuyKeData).split('\n');
    const safeTarget = shortenSupermarketName(supermarketName).toLowerCase();
    for (const line of lines) {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length >= 6) {
            const first = parts[0];
            const firstSafe = shortenSupermarketName(first).toLowerCase();
            if (first === supermarketName || firstSafe === safeTarget || first.toLowerCase().includes(safeTarget) || (supermarketName === 'Tổng' && first.startsWith('Tổng'))) {
                const val = parseNumber(parts[5]);
                if (val > 0) return val;
            }
        }
    }

    return 0;
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
    const targetSm = findMatchingSupermarketKey(supermarketName, Object.keys(smData));
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
            if (currentDept && !isIgnoredDept(currentDept.name)) {
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
    
    if (currentDept && !isIgnoredDept(currentDept.name)) {
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
 * Bộ so khớp "nhân viên này có trong danh sách Phân Tích không" — dùng chung cho cả việc lấy
 * danh sách lẫn đếm theo bộ phận. Chấp nhận mọi biến thể tên: "Mã - Tên", "Tên - Mã", chỉ mã.
 */
const buildAnalysisMatcher = (employees: AnalysisEmployeeItem[]) => {
    const lookup = new Map<string, AnalysisEmployeeItem>();
    employees.forEach(e => {
        lookup.set(e.originalName.toLowerCase().trim(), e);
        lookup.set(standardizeEmployeeName(e.originalName).toLowerCase().trim(), e);
        if (e.id) lookup.set(e.id.toLowerCase().trim(), e);
    });

    return (name: string): boolean => {
        const clean = name.toLowerCase().trim();
        if (lookup.has(clean)) return true;
        const canonical = standardizeEmployeeName(name).toLowerCase().trim();
        if (lookup.has(canonical)) return true;
        if (name.includes(' - ')) {
            const parts = name.split(' - ').map(p => p.trim().toLowerCase());
            if (lookup.has(parts[0]) || lookup.has(parts[1])) return true;
        }
        return false;
    };
};

/**
 * Tập tên nhân viên xuất hiện trong dữ liệu "Luỹ kế doanh thu nhân viên" dán cho MỘT siêu thị.
 * Dữ liệu này dư (có người không thuộc siêu thị), nên luôn phải giao với danh sách Phân Tích.
 */
const namesInStoreReport = (rawEmployeesText: string): Set<string> => {
    const names = new Set<string>();
    if (!rawEmployeesText) return names;

    rawEmployeesText.split(/\r?\n/).forEach(line => {
        const namePart = (line.split('\t')[0] || '').trim();
        if (!namePart || !namePart.includes(' - ')) return;
        if (namePart.startsWith('BP ') || namePart.includes('http') || namePart.includes('Báo cáo') || namePart.includes('Dashboards')) return;
        names.add(standardizeEmployeeName(namePart).toLowerCase().trim());
        names.add(namePart.toLowerCase().trim());
    });
    return names;
};

/**
 * Lấy danh sách nhân viên Employee[] chuẩn hoá từ danh sách Phân Tích (ưu tiên cao nhất).
 *
 * `storeEmployeesRaw` = dữ liệu "Luỹ kế doanh thu nhân viên" dán cho CHÍNH siêu thị đang xem:
 * MỖI SIÊU THỊ CÓ DANH SÁCH RIÊNG (chủ dự án chốt 2026-09-23). Siêu thị nào cũng lấy trọn danh
 * sách Phân Tích là sai — mọi siêu thị hiện cùng một số NV. Quy tắc: nhân viên thuộc siêu thị khi
 * CÓ trong báo cáo luỹ kế của siêu thị đó VÀ có trong danh sách Phân Tích (danh sách Phân Tích
 * mới là nguồn đúng và đủ; báo cáo luỹ kế dư một số người không thuộc siêu thị).
 * Chưa dán báo cáo cho siêu thị (hoặc dán mà không khớp ai) thì giữ nguyên toàn bộ danh sách —
 * thà thừa còn hơn làm trắng màn hình của siêu thị chưa kịp dán dữ liệu.
 */
export const getEmployeesFromAnalysis = (
    analysisEmployees: AnalysisEmployeeItem[],
    hiddenEmployees: string[] = [],
    storeEmployeesRaw: string = ''
): Employee[] => {
    if (!analysisEmployees || analysisEmployees.length === 0) return [];
    const hiddenSet = new Set(hiddenEmployees.flatMap(h => [h, standardizeEmployeeName(h)]));
    const active = analysisEmployees.filter(e => {
        if (hiddenSet.has(e.originalName) || hiddenSet.has(standardizeEmployeeName(e.originalName))) return false;
        const dept = (e.department || '').trim();
        if (!dept || isSystemOrIgnoredEmployee(e.originalName, dept)) return false;
        return true;
    });

    const storeNames = namesInStoreReport(storeEmployeesRaw);
    const inThisStore = storeNames.size > 0
        ? active.filter(e =>
            storeNames.has(standardizeEmployeeName(e.originalName).toLowerCase().trim()) ||
            storeNames.has(e.originalName.toLowerCase().trim()))
        : [];

    const chosen = inThisStore.length > 0 ? inThisStore : active;

    return chosen.map(e => ({
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
        e => !hiddenSet.has(e.originalName) && !hiddenSet.has(standardizeEmployeeName(e.originalName)) &&
             Boolean(e.department && !isSystemOrIgnoredEmployee(e.originalName, e.department))
    );
    if (activeAnalysisEmployees.length === 0) return [];

    const isMatch = buildAnalysisMatcher(activeAnalysisEmployees);

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
            // 🔴 KHÔNG gom những người Phân Tích vắng mặt trong báo cáo vào bộ phận đầu tiên nữa:
            // báo cáo luỹ kế này là CỦA MỘT SIÊU THỊ, ai không có trong đó là người của siêu thị
            // khác. Bước gom cũ khiến siêu thị nào cũng hiện đủ danh sách Phân Tích (cùng "19 NV"
            // ở mọi tab — chủ dự án báo 2026-09-23).
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

/**
 * Các biến thể tên của cùng 1 nhân viên để làm KHOÁ tra target: tên gốc, dạng chuẩn hoá
 * "Tên - Mã" (standardizeEmployeeName) và dạng "Mã - Tên". Lý do: danh sách nhân viên từ Phân
 * Tích lưu originalName dạng "106637 - Nguyễn Vũ Minh", nhưng parseCompetitionData gán cho dòng
 * thi đua originalName = KHOÁ khớp được trong employeeDepartmentMap — thường là dạng chuẩn hoá
 * "Nguyễn Vũ Minh - 106637" — nên `targets.get(row.originalName)` trượt → M.TIÊU = 0 cho mọi
 * người (chủ dự án gặp thật 2026-09-22; danh sách dán tay dạng "Tên - Mã" thì 2 bên trùng nên
 * không lộ). Ghi cùng 1 giá trị dưới mọi biến thể; không nơi nào cộng `.values()` của map này
 * (đã rà 8 chỗ dùng), nên không đếm trùng.
 */
export const employeeTargetKeys = (originalName: string): string[] => {
    const keys = new Set<string>([originalName]);
    const canonical = standardizeEmployeeName(originalName);
    if (canonical) keys.add(canonical);
    const id = extractEmployeeId(originalName);
    if (id && canonical.includes(' - ')) {
        const parts = canonical.split(' - ').map(p => p.trim());
        if (parts[parts.length - 1] === id) keys.add(`${id} - ${parts.slice(0, -1).join(' - ')}`);
    }
    return Array.from(keys);
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
        // Tìm siêu thị trong parsed data (sử dụng findMatchingSupermarketKey chuẩn hoá mã kho và tên)
        const matchedSmKey = findMatchingSupermarketKey(sm, Object.keys(parsedBySm));

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

        // Duyệt từng chương trình thi đua, lấy target value, phân bổ cho NV.
        // `lines` = Luỹ kế + Realtime nối nhau (NhanVien.tsx) nên MỖI chương trình xuất hiện 2 lần:
        // bản Luỹ kế (TARGET tháng) rồi bản Realtime (TARGET ngày ≈ tháng/30). Trước đây cộng dồn
        // cả 2 → M.TIÊU bị đội ~3% (đo trên dữ liệu thật 2026-09-22: 4.267 + 142 = 4.409).
        // Chỉ lấy lần xuất hiện ĐẦU TIÊN của mỗi tên (Luỹ kế đứng trước; thiếu Luỹ kế thì mới tới Realtime).
        const seenPrograms = new Set<string>();
        for (const program of smParsedData.programs) {
            const compName = program.name;
            if (seenPrograms.has(compName)) continue;
            seenPrograms.add(compName);
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
                const next = existing + (adjTarget * (empWeights.get(emp.originalName)! / totalW));
                employeeTargetKeys(emp.originalName).forEach(k => compT.set(k, next));
            });
        }
    }
    return targets;
};
