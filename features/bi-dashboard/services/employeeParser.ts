import { parseNumber, shortenSupermarketName } from '../../../utils/dataUtils';
// Employee ở types/nhanVienTypes.ts có thêm department (nhân viên đã gắn phòng ban) — khác với
// Employee cục bộ bên dưới (chỉ có tên, dùng khi phòng ban chưa xác định, vd. màn hình gán phòng ban)
import type { Employee as NhanVienEmployee } from '../types/nhanVienTypes';
import { parseRevenueData, standardizeEmployeeName, formatEmployeeName, extractEmployeeId, isSameEmployee } from '../utils/nhanVienHelpers';
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
 * Lọc danh sách nhân viên từ Phân Tích (AnalysisEmployeesPayload) cho một siêu thị cụ thể.
 * Quy tắc nhận diện theo yêu cầu:
 * 1. Nhận diện theo danh sách "Nhân viên Luỹ kế" / "Nhân viên Realtime" của siêu thị (storeEmployeesRaw / danhSachData):
 *    - Lấy danh sách nhân viên của siêu thị đó (ví dụ 5 người).
 *    - So khớp với danh sách nhân viên Phân tích (ví dụ 30 người).
 *    - Nhân viên nào thuộc danh sách của siêu thị thì GIỮ LẠI, nhân viên thuộc siêu thị khác LOẠI BỎ.
 * 2. Nhận diện theo Mã Kho (maKho):
 *    - Nếu nhân viên có maKho khớp với mã kho của siêu thị (qua bảng map biSupermarketMap hoặc tên siêu thị),
 *      nhân viên đó được giữ lại cho siêu thị đó.
 * 3. Nếu không truyền siêu thị hoặc xem "Tổng", giữ lại tất cả nhân viên hợp lệ.
 */
export function filterAnalysisEmployeesForSupermarket(
    analysisEmployees: AnalysisEmployeeItem[],
    storeEmployeesRaw: string = '',
    hiddenEmployees: string[] = [],
    supermarketName?: string | null,
    supermarketKhoMap?: Record<string, string>
): AnalysisEmployeeItem[] {
    if (!analysisEmployees || analysisEmployees.length === 0) return [];

    const hiddenSet = new Set(hiddenEmployees.flatMap(h => [h, standardizeEmployeeName(h)]));
    const valid = analysisEmployees.filter(e => {
        if (hiddenSet.has(e.originalName) || hiddenSet.has(standardizeEmployeeName(e.originalName))) return false;
        const dept = (e.department || '').trim();
        if (!dept || isSystemOrIgnoredEmployee(e.originalName, dept)) return false;
        return true;
    });

    if (valid.length === 0) return [];
    if (!supermarketName || supermarketName === 'Tổng' || supermarketName === 'Tổng hợp') {
        return valid;
    }

    const cleanSm = supermarketName.trim();
    const safeSm = shortenSupermarketName(cleanSm);

    // Xác định Mã kho mục tiêu của siêu thị này (nếu có)
    let targetKho = (supermarketKhoMap ? (supermarketKhoMap[cleanSm] || supermarketKhoMap[safeSm]) : '') || '';
    if (!targetKho && supermarketKhoMap) {
        for (const [k, v] of Object.entries(supermarketKhoMap)) {
            if (v === cleanSm || shortenSupermarketName(v) === safeSm || k === cleanSm || shortenSupermarketName(k) === safeSm) {
                const kDigits = (k.match(/\d+/) || [])[0];
                const vDigits = (typeof v === 'string' ? (v.match(/\d+/) || [])[0] : '');
                targetKho = kDigits || vDigits || '';
                if (targetKho) break;
            }
        }
    }
    if (!targetKho) {
        targetKho = extractEmployeeId(cleanSm) || (cleanSm.match(/\d+/) || [])[0] || (safeSm.match(/\d+/) || [])[0] || '';
    }
    targetKho = targetKho.replace(/\D/g, '');

    // 1. ƯU TIÊN CAO NHẤT: Lấy danh sách nhân viên từ chức năng Phân tích theo Mã kho để cấu hình target
    if (targetKho) {
        const matchedKho = valid.filter(e => e.maKho && e.maKho === targetKho);
        if (matchedKho.length > 0) {
            return matchedKho;
        }
    }

    // 2. Phân tích danh sách nhân viên của chính siêu thị này từ dữ liệu "Nhân viên Luỹ kế"
    const storeEmployees = parseAllEmployees(storeEmployeesRaw, hiddenEmployees);

    if (storeEmployees.length > 0) {
        const storeEmpIds = new Set<string>();
        const storeEmpNames = new Set<string>();
        for (const se of storeEmployees) {
            const id = extractEmployeeId(se.originalName);
            if (id) storeEmpIds.add(id);
            const canon = standardizeEmployeeName(se.originalName);
            if (canon) storeEmpNames.add(canon.toLowerCase());
            storeEmpNames.add(se.originalName.trim().toLowerCase());
        }

        const isMatchStore = (e: AnalysisEmployeeItem) => {
            if (e.id && storeEmpIds.has(e.id)) return true;
            const eid = extractEmployeeId(e.originalName);
            if (eid && storeEmpIds.has(eid)) return true;
            const can = standardizeEmployeeName(e.originalName).toLowerCase();
            if (storeEmpNames.has(can)) return true;
            if (storeEmpNames.has(e.originalName.trim().toLowerCase())) return true;
            return storeEmployees.some(se => isSameEmployee(se.originalName, e.originalName));
        };

        const matchesKho = (e: AnalysisEmployeeItem) => {
            if (targetKho && e.maKho && e.maKho === targetKho) return true;
            if (e.supermarket && (e.supermarket === cleanSm || shortenSupermarketName(e.supermarket) === safeSm)) return true;
            return false;
        };

        return valid.filter(e => {
            // Tuyệt đối không nhận nhân viên đã được định danh thuộc mã kho khác
            if (targetKho && e.maKho && e.maKho !== targetKho) return false;
            return isMatchStore(e) || matchesKho(e);
        });
    }

    // 3. Nếu siêu thị chưa có dữ liệu "Nhân viên Luỹ kế": kiểm tra theo Tên Siêu Thị
    const matchedSm = valid.filter(e => e.supermarket && (e.supermarket === cleanSm || shortenSupermarketName(e.supermarket) === safeSm));
    if (matchedSm.length > 0) return matchedSm;

    // Siêu thị không có nhân viên nào khớp trong danh sách luỹ kế và không khớp mã kho -> trả về rỗng
    return [];
}

/**
 * Lấy danh sách nhân viên Employee[] chuẩn hoá từ danh sách Phân Tích (ưu tiên cao nhất).
 * Kết hợp với dữ liệu "Nhân viên Luỹ kế" / "Mã kho" của siêu thị để chỉ lấy đúng nhân viên của siêu thị đó.
 */
export const getEmployeesFromAnalysis = (
    analysisEmployees: AnalysisEmployeeItem[],
    hiddenEmployees: string[] = [],
    storeEmployeesRaw: string = '',
    supermarketName?: string | null,
    supermarketKhoMap?: Record<string, string>
): Employee[] => {
    if (!analysisEmployees || analysisEmployees.length === 0) return [];
    const active = filterAnalysisEmployeesForSupermarket(
        analysisEmployees,
        storeEmployeesRaw,
        hiddenEmployees,
        supermarketName,
        supermarketKhoMap
    );

    return active.map(e => ({
        originalName: e.originalName,
        name: e.name || formatEmployeeName(e.originalName)
    }));
};

/**
 * Trích xuất danh sách phòng ban dựa trên danh sách nhân viên Phân Tích (ưu tiên cao nhất).
 * Chỉ đếm trên các nhân viên thuộc chính siêu thị được cấu hình (qua Nhân viên Luỹ kế hoặc Mã kho).
 */
export const getDepartmentsFromAnalysis = (
    analysisEmployees: AnalysisEmployeeItem[],
    rawEmployeesText: string = '',
    hiddenEmployees: string[] = [],
    supermarketName?: string | null,
    supermarketKhoMap?: Record<string, string>
): DepartmentInfo[] => {
    if (!analysisEmployees || analysisEmployees.length === 0) return [];
    const activeAnalysisEmployees = filterAnalysisEmployeesForSupermarket(
        analysisEmployees,
        rawEmployeesText,
        hiddenEmployees,
        supermarketName,
        supermarketKhoMap
    );
    if (activeAnalysisEmployees.length === 0) return [];

    const deptMap = new Map<string, number>();
    activeAnalysisEmployees.forEach(e => {
        const d = (e.department && e.department !== 'Kinh Doanh') ? e.department : 'BP ALL IN ONE - ĐMX';
        deptMap.set(d, (deptMap.get(d) || 0) + 1);
    });

    return Array.from(deptMap.entries()).map(([name, count]) => ({
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

export function findCompetitionSlider(
    competitionTargetsData: Record<string, number> | undefined,
    compName: string
): number {
    if (!competitionTargetsData) return 100;
    
    // 1. Khớp chính xác
    if (competitionTargetsData[compName] !== undefined) {
        return competitionTargetsData[compName];
    }
    
    const cleanComp = compName.trim().toLowerCase();
    
    // 2. Khớp sau khi trim & lowercase
    for (const [key, val] of Object.entries(competitionTargetsData)) {
        if (key.trim().toLowerCase() === cleanComp) {
            return val;
        }
    }
    
    // 3. Khớp bỏ tiền tố tháng (T10/, T09/, Tháng 10/, ...)
    const stripMonth = (s: string) => s.replace(/^(?:T\d+|Tháng\s*\d+)\s*[\/\-_]\s*/i, '').trim().toLowerCase();
    const noMonthComp = stripMonth(cleanComp);
    for (const [key, val] of Object.entries(competitionTargetsData)) {
        if (stripMonth(key) === noMonthComp) {
            return val;
        }
    }
    
    // 4. Khớp chứa nhau / hậu tố (vd: BẢO HIỂM THỢ ĐMX vs T10/BẢO HIỂM THỢ ĐMX_ICT)
    for (const [key, val] of Object.entries(competitionTargetsData)) {
        const cleanKey = key.trim().toLowerCase();
        const noMonthKey = stripMonth(key);
        if (
            cleanComp.includes(cleanKey) || cleanKey.includes(cleanComp) ||
            noMonthComp.includes(noMonthKey) || noMonthKey.includes(noMonthComp)
        ) {
            return val;
        }
    }
    
    return 100;
}

export const parseEmployeeCompetitionTargets = (
    lines: string[] | string,
    activeSupermarkets: string[],
    smDataMap: Map<string, { competitionTargets: Record<string, number>; departmentWeights?: Record<string, number> }>,
    allEmployees: NhanVienEmployee[],
    fallbackLines?: string[] | string
): Map<string, Map<string, number>> => {
    const targets = new Map<string, Map<string, number>>();
    const primaryText = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
    const fallbackText = fallbackLines ? (Array.isArray(fallbackLines) ? fallbackLines.join('\n') : String(fallbackLines)) : '';

    // Dùng parseCompetitionDataBySupermarket — đã xử lý đúng cả format cũ (tab ngang)
    // lẫn format mới (BI dọc với DOANH THU/SỐ LƯỢNG/TARGET/% HT THÁNG).
    // Báo cáo Luỹ kế (primaryText) chứa TARGET THÁNG chuẩn; Realtime chỉ dùng dự phòng.
    const parsedPrimary = parseCompetitionDataBySupermarket(primaryText);
    const parsedFallback = fallbackText ? parseCompetitionDataBySupermarket(fallbackText) : {};

    for (const sm of activeSupermarkets) {
        const smData = smDataMap.get(sm);
        const competitionTargetsData = smData?.competitionTargets;
        // Tìm siêu thị trong parsed data (sử dụng findMatchingSupermarketKey chuẩn hoá mã kho và tên)
        const matchedSmKey = findMatchingSupermarketKey(sm, Object.keys(parsedPrimary))
            || (fallbackText ? findMatchingSupermarketKey(sm, Object.keys(parsedFallback)) : null);

        if (!matchedSmKey) continue;

        const primarySmData = parsedPrimary[matchedSmKey];
        const fallbackSmData = parsedFallback[matchedSmKey];

        // Ưu tiên 100% chương trình từ Luỹ kế (chứa Target tháng chuẩn);
        // Chỉ bổ sung thêm các chương trình chỉ xuất hiện ở Realtime (nếu có).
        const primaryPrograms = primarySmData?.programs || [];
        const fallbackPrograms = (fallbackSmData?.programs || []).filter(
            fp => !primaryPrograms.some(pp => pp.name.trim().toLowerCase() === fp.name.trim().toLowerCase())
        );
        const allPrograms = [...primaryPrograms, ...fallbackPrograms];

        const headers = primarySmData?.headers || fallbackSmData?.headers || [];
        const targetIdx = headers.findIndex(h => {
            const up = h.toUpperCase();
            return up.includes('TARGET') || up.includes('MỤC TIÊU');
        });

        if (targetIdx === -1 || allPrograms.length === 0) continue;

        // Mục tiêu thi đua mỗi nhân viên = Target sau điều chỉnh / Tổng số nhân viên tham gia
        // Khớp 100% với cột /NGƯỜI trong Cấu hình Target Thi đua (SupermarketConfig.tsx)
        const totalEmployees = allEmployees.length;
        if (totalEmployees <= 0) continue;

        const seenPrograms = new Set<string>();
        for (const program of allPrograms) {
            const compName = program.name;
            const normCompName = compName.trim().toLowerCase();
            if (seenPrograms.has(normCompName)) continue;
            seenPrograms.add(normCompName);

            const targetValRaw = program.data[targetIdx];
            if (targetValRaw === undefined || targetValRaw === null) continue;

            const baseTarget = parseNumber(targetValRaw);
            if (baseTarget <= 0) continue;

            const slider = findCompetitionSlider(competitionTargetsData, compName);
            const adjTarget = baseTarget * (slider / 100);
            const perPersonTarget = adjTarget / totalEmployees;
            if (perPersonTarget <= 0) continue;

            const registerTargetForComp = (alias: string) => {
                if (!targets.has(alias)) targets.set(alias, new Map());
                const compT = targets.get(alias)!;
                allEmployees.forEach(emp => {
                    const existing = compT.get(emp.originalName) || 0;
                    const next = existing + perPersonTarget;
                    employeeTargetKeys(emp.originalName).forEach(k => compT.set(k, next));
                });
            };

            registerTargetForComp(compName);
            const clean = compName.trim();
            if (clean !== compName) registerTargetForComp(clean);
            const noMonth = compName.replace(/^(?:T\d+|Tháng\s*\d+)\s*[\/\-_]\s*/i, '').trim();
            if (noMonth && noMonth !== compName) registerTargetForComp(noMonth);

            // Các biến thể dấu phân cách gạch nối và gạch chéo để khớp tuyệt đối giữa bảng cấu hình và báo cáo
            if (compName.includes('-')) registerTargetForComp(compName.replace(/\s*-\s*/g, '/'));
            if (compName.includes('/')) registerTargetForComp(compName.replace(/\s*\/\s*/g, ' - '));
            if (noMonth && noMonth.includes('-')) registerTargetForComp(noMonth.replace(/\s*-\s*/g, '/'));
            if (noMonth && noMonth.includes('/')) registerTargetForComp(noMonth.replace(/\s*\/\s*/g, ' - '));
        }
    }
    return targets;
};
