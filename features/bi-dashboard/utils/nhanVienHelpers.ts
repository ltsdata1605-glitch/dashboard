
import { RevenueRow, CompetitionHeader, Criterion, InstallmentRow, InstallmentProvider, CrossSellingRow } from '../types/nhanVienTypes';
import { roundUp, parseNumber, normalizeText, shortenName } from '../../../utils/dataUtils';
import { calculateHieuQuaQDFraction, calculatePercentage } from '../services/metricService';
export { roundUp, parseNumber, normalizeText, shortenName };

export interface CompetitionEmployeeRow {
    name: string;
    originalName: string;
    department: string;
    values: (number | null)[];
}

export type DataTier = 'top' | 'trung' | 'bot' | 'none';

/**
 * Phân tầng dữ liệu cột thành 3 nhóm: top (dẫn đầu), trung (trung bình), bot (thấp nhất)
 * - Chỉ xét các giá trị > 0 (giá trị 0 hoặc rỗng là 'none' - hiển thị '-')
 * - Tỷ lệ xấp xỉ 1/3 cho mỗi nhóm (Top 33%, Trung 34%, Bot 33%)
 * - Các giá trị bằng nhau luôn có cùng phân tầng
 */
export const computeColumnTiers = (values: (number | undefined | null)[]): DataTier[] => {
    const positiveWithIndex: { val: number; idx: number }[] = [];
    values.forEach((v, idx) => {
        if (v != null && v > 0) {
            positiveWithIndex.push({ val: v, idx });
        }
    });

    const result: DataTier[] = new Array(values.length).fill('none');
    if (positiveWithIndex.length === 0) return result;
    if (positiveWithIndex.length === 1) {
        result[positiveWithIndex[0].idx] = 'top';
        return result;
    }
    if (positiveWithIndex.length === 2) {
        const [a, b] = positiveWithIndex;
        if (a.val > b.val) {
            result[a.idx] = 'top';
            result[b.idx] = 'bot';
        } else if (b.val > a.val) {
            result[b.idx] = 'top';
            result[a.idx] = 'bot';
        } else {
            result[a.idx] = 'top';
            result[b.idx] = 'top';
        }
        return result;
    }

    // Sắp xếp giảm dần theo giá trị
    const sorted = [...positiveWithIndex].sort((a, b) => b.val - a.val);
    const n = sorted.length;
    
    // Top ~33%, Bot ~33%, Trung ~34%
    const topCutoffIndex = Math.max(1, Math.floor(n / 3));
    const botCutoffIndex = Math.min(n - 1, Math.ceil((n * 2) / 3));

    const topThreshold = sorted[topCutoffIndex - 1].val;
    const botThreshold = sorted[botCutoffIndex].val;

    if (topThreshold <= botThreshold) {
        positiveWithIndex.forEach(({ idx }) => {
            result[idx] = 'trung';
        });
        return result;
    }

    positiveWithIndex.forEach(({ val, idx }) => {
        if (val >= topThreshold) {
            result[idx] = 'top';
        } else if (val <= botThreshold) {
            result[idx] = 'bot';
        } else {
            result[idx] = 'trung';
        }
    });

    return result;
};

export const standardizeEmployeeName = (rawName: string): string => {
    if (!rawName || !rawName.includes(' - ')) return rawName;
    const parts = rawName.split(' - ').map(p => p.trim());
    if (parts.length < 2) return rawName;
    
    let id = '';
    let name = '';
    
    if (/^\d+$/.test(parts[0]) || parts[0].toLowerCase() === 'online' || parts[0].toLowerCase() === 'administrator') {
        id = parts[0];
        name = parts.slice(1).join(' - ');
        return `${name} - ${id}`;
    }
    return rawName;
};

/**
 * Trích xuất Mã Số Nhân Viên (chuỗi số) từ bất kỳ định dạng nào:
 * - "195025 - Nguyễn Thị Mỹ Linh" -> "195025"
 * - "Nguyễn Thị Mỹ Linh - 195025" -> "195025"
 * - "U195025 - Nguyễn Thị Mỹ Linh" -> "195025"
 * - "195025" -> "195025"
 */
export const extractEmployeeId = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    if (trimmed.includes(' - ')) {
        const parts = trimmed.split(' - ').map(p => p.trim());
        for (const part of parts) {
            if (/^\d+$/.test(part)) return part;
        }
    }
    const match = trimmed.match(/\b\d+\b/) || trimmed.match(/\d+/);
    if (match) return match[0];
    return '';
};

/**
 * So sánh 2 tên nhân viên xem có cùng là 1 người hay không.
 * Hỗ trợ so sánh qua:
 * - Chuỗi thô bằng nhau (kể cả case-insensitive/trimmed)
 * - Mã số nhân viên (Employee ID) trùng nhau
 * - Tên chuẩn hóa (standardizeEmployeeName) trùng nhau
 * - Tên hiển thị rút gọn (formatEmployeeName) trùng nhau
 */
export const isSameEmployee = (aName?: string, bName?: string): boolean => {
    if (!aName || !bName) return false;
    if (aName === bName) return true;
    const aTrim = aName.trim();
    const bTrim = bName.trim();
    if (aTrim.toLowerCase() === bTrim.toLowerCase()) return true;

    // So sánh qua Mã số nhân viên (chuỗi số duy nhất trong MWG)
    const idA = extractEmployeeId(aTrim);
    const idB = extractEmployeeId(bTrim);
    if (idA && idB) {
        return idA === idB;
    }

    // So sánh qua dạng chuẩn hóa
    const canA = standardizeEmployeeName(aTrim);
    const canB = standardizeEmployeeName(bTrim);
    if (canA && canB && canA.toLowerCase() === canB.toLowerCase()) return true;

    // So sánh qua dạng rút gọn
    const fmtA = formatEmployeeName(aTrim);
    const fmtB = formatEmployeeName(bTrim);
    if (fmtA && fmtB && fmtA.toLowerCase() === fmtB.toLowerCase()) return true;

    // Khi 1 trong 2 bên không có Mã số nhân viên (ví dụ tên dán thô hoặc chỉ có Họ tên):
    // so sánh phần tên họ
    const extractNameOnly = (s: string) => {
        const can = standardizeEmployeeName(s);
        if (can.includes(' - ')) {
            return can.split(' - ')[0].trim().toLowerCase();
        }
        return can.trim().toLowerCase();
    };
    const nameA = extractNameOnly(aTrim);
    const nameB = extractNameOnly(bTrim);
    if (nameA && nameB && nameA === nameB) return true;

    return false;
};

export const formatEmployeeName = (fullName: string): string => {
    const nameParts = fullName.split(' - ');
    if (nameParts.length < 2) return fullName;
    
    let name = nameParts[0].trim();
    let id = nameParts[1].trim();
    
    if (/^\d+$/.test(name) || name.toLowerCase() === 'online' || name.toLowerCase() === 'administrator') {
        id = nameParts[0].trim();
        name = nameParts[1].trim();
    }
    
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0) return fullName;
    if (words.length === 1) return `${id} - ${words[0]}`;
    
    // Lấy từ cuối cùng làm tên chính
    const firstName = words[words.length - 1];
    // Lấy chữ cái đầu của từ ngay trước tên chính làm tên đệm rút gọn
    const lastMiddleInitial = words[words.length - 2].charAt(0).toUpperCase();
    
    // Trả về định dạng: ID - C.Tên
    return `${id} - ${lastMiddleInitial}.${firstName}`;
};

export const getYesterdayDateString = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return `${yesterday.getDate()}/${yesterday.getMonth() + 1}`;
};

export const isIgnoredDept = (name?: string): boolean => {
    if (!name || typeof name !== 'string') return true;
    const clean = name.trim();
    if (!clean) return true;
    const lower = clean.toLowerCase();
    const stripped = normalizeText(clean);
    return (
        lower.includes('chưa xác định') ||
        lower.includes('không xác định') ||
        lower.includes('không phân ca') ||
        lower.includes('chưa phân ca') ||
        lower.includes('chưa có bộ phận') ||
        lower.includes('chưa phân bộ phận') ||
        lower.includes('chưa gán') ||
        lower.includes('chưa cài đặt') ||
        stripped.includes('chua xac dinh') ||
        stripped.includes('khong xac dinh') ||
        stripped.includes('khong phan ca') ||
        stripped.includes('chua phan ca') ||
        stripped.includes('chua co bo phan')
    );
};

export type RevenueTableKind = 'thuc' | 'qd' | 'combined';

interface SingleRevenueParsedMap {
    kind: RevenueTableKind;
    empMap: Map<string, {
        rawName: string;
        canonicalName: string;
        empId: string;
        department: string;
        soLuong: number;
        dtlk: number;
        dtqd: number;
    }>;
    deptMap: Map<string, {
        department: string;
        soLuong: number;
        dtlk: number;
        dtqd: number;
    }>;
    total: {
        soLuong: number;
        dtlk: number;
        dtqd: number;
        hasExplicit: boolean;
    };
}

/**
 * Nhận diện loại bảng từ nội dung thô:
 * - 'qd': Bảng Doanh thu quy đổi mới (có DOANH THU QĐ và không có cột Doanh thu thực riêng biệt)
 * - 'thuc': Bảng Doanh thu thực mới (chỉ có DOANH THU, không có DOANH THU QĐ)
 * - 'combined': Bảng gộp cũ (có cả DOANH THU QĐ và DOANH THU thực trên cùng một bảng)
 */
export const detectRevenueTableKind = (rawText: string, fallbackKind: 'thuc' | 'qd' = 'thuc'): RevenueTableKind => {
    if (!rawText) return fallbackKind;
    const lower = rawText.toLowerCase();

    const hasQd = lower.includes('doanh thu qđ') || 
                  lower.includes('doanh thu qd') || 
                  lower.includes('dtqđ') || 
                  lower.includes('dt quy đổi') || 
                  lower.includes('dt qđ');

    if (!hasQd) {
        return 'thuc';
    }

    const lines = lower.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Kiểm tra dòng tab-separated có cả QĐ và Thực riêng biệt
    for (const line of lines) {
        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim());
            const hasQdPart = parts.some(p => p.includes('doanh thu qđ') || p.includes('doanh thu qd') || p.includes('dtqđ'));
            const hasThucPart = parts.some(p => p === 'doanh thu' || p === 'dt thực' || p === 'dt thuc' || p === 'dtlk');
            if (hasQdPart && hasThucPart) {
                return 'combined';
            }
        }
    }

    // Kiểm tra trong danh sách các dòng đơn lẻ xem có cả 2 header riêng biệt không
    const qdIndex = lines.findIndex(l => l === 'doanh thu qđ' || l === 'doanh thu qd');
    const thucIndex = lines.findIndex(l => l === 'doanh thu' || l === 'dt thực');
    if (qdIndex > -1 && thucIndex > qdIndex) {
        return 'combined';
    }

    return 'qd';
};

/**
 * Phân tích một bảng dữ liệu doanh thu đơn lẻ (Thực, Quy đổi hoặc Gộp) thành Map có cấu trúc
 */
export const parseRevenueToInternalMap = (
    data: string, 
    defaultKind: 'thuc' | 'qd' = 'thuc'
): SingleRevenueParsedMap => {
    const result: SingleRevenueParsedMap = {
        kind: defaultKind,
        empMap: new Map(),
        deptMap: new Map(),
        total: { soLuong: 0, dtlk: 0, dtqd: 0, hasExplicit: false }
    };

    if (!data) return result;
    const rawLines = String(data).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return result;

    const kind = detectRevenueTableKind(data, defaultKind);
    result.kind = kind;

    const isValidEmployeeName = (name: string) => {
        if (!name || typeof name !== 'string') return false;
        if (!name.includes(' - ')) return false;
        const parts = name.split(' - ').map(p => p.trim());
        return (/^\d+$/.test(parts[0]) && parts[1].length > 0) || 
               (/^\d+$/.test(parts[1]) && parts[0].length > 0) || 
               name.toLowerCase().includes('online') || 
               name.toLowerCase().includes('admin');
    };

    const entries: { name: string; numbers: number[] }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        // Skip metadata / navigation / footer text
        if (line.includes('http') || line.includes('Dashboards') || line.includes('Tìm báo cáo') ||
            line.includes('Cập nhật lúc') || line.includes('webview') || line.includes('Xuất Excel') ||
            line.includes('Toàn công ty') || line.includes('triệu đồng') || line.includes('Target trọn kỳ') ||
            line.includes('TB3T cùng') || line.includes('TLPVTC') || line.includes('Tỉ trọng trả góp') ||
            line.includes('Tỷ trọng trả chậm') || line.includes('Doanh thu theo cấp') || line.includes('✓') || 
            line.includes('1-') || line.includes('/ trang') || line.includes('Đơn vị:') || line.includes('Đã copy') ||
            line.includes('HTTP 502') || line.includes('Copy All') || line.includes('Luôn suy từ') ||
            line.includes('nhịp 18 ngày') || line.includes('Chưa có số khoản') || line.includes('Quỹ thời gian:') ||
            line.includes('THỜI GIAN LÀM VIỆC:') || line.includes('Chi phí?') || line.includes('Doanh thuTổng hợp') ||
            line.includes('Lũy kếRealtime') || line.includes('DT thựcDT quy đổi') || line.includes('Toggle theme') ||
            line.includes('ChuỗiChọn') || line.includes('VùngChọn') || line.includes('Khu vựcChọn') ||
            line.includes('Ngành hàngChọn') || line.includes('Nhóm hàngChọn') || line.includes('employee')) {
            continue;
        }

        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
            if (parts.length === 0) continue;
            const firstLower = parts[0].toLowerCase();
            if (firstLower === 'nhân viên' || firstLower === 'số lượng' || firstLower.includes('doanh thu') || firstLower.includes('target')) {
                continue;
            }

            if (/^-?[\d.,]+%?$/.test(parts[0]) || parts[0] === '—' || parts[0] === '-') {
                if (entries.length > 0 && entries[entries.length - 1].numbers.length === 0) {
                    entries[entries.length - 1].numbers = parts.map(parseNumber);
                }
            } else {
                const name = parts[0];
                const numbers = parts.slice(1).map(parseNumber);
                entries.push({ name, numbers });
            }
        } else {
            const lower = line.toLowerCase();
            if (lower === 'nhân viên' || lower === 'số lượng' || lower === 'doanh thu qđ' || lower === 'doanh thu qd' || 
                lower === '% tỉ trọng' || lower === 'doanh thu' || lower === 'dt thực' || lower === 'target' || 
                lower === '% ht target' || lower === 'tb 3 tháng' || lower === '% tt' || lower === 'dt trả thẳng' || 
                lower === 'dt trả góp' || lower === 'dt nhập trả' || lower === 'dt trả thẳng qđ' || 
                lower === 'dt trả góp qđ' || lower === 'dt nhập trả qđ') {
                continue;
            }

            if (/^-?[\d.,]+%?$/.test(line) || line === '—' || line === '-') {
                if (entries.length > 0) {
                    entries[entries.length - 1].numbers.push(parseNumber(line));
                }
            } else {
                entries.push({ name: line, numbers: [] });
            }
        }
    }

    let currentDept = 'BP ALL IN ONE - DMX';

    entries.forEach(entry => {
        const { name: rawName, numbers } = entry;
        if (numbers.length === 0) return;

        const isTotal = rawName.toLowerCase().startsWith('tổng');
        const isDept = rawName.startsWith('BP ');

        let soLuongValue = 0;
        let dtlkValue = 0;
        let dtqdValue = 0;

        if (kind === 'combined') {
            if (numbers.length >= 4) {
                soLuongValue = numbers[0];
                dtqdValue = numbers[1];
                dtlkValue = numbers[3];
            } else if (numbers.length >= 2) {
                soLuongValue = numbers[0];
                dtlkValue = numbers[0];
                dtqdValue = numbers[1];
            }
        } else if (kind === 'qd') {
            // Bảng Doanh thu quy đổi mới: numbers[0] = SỐ LƯỢNG, numbers[1] = DOANH THU QĐ
            if (numbers.length >= 2) {
                soLuongValue = numbers[0];
                dtqdValue = numbers[1];
            } else if (numbers.length === 1) {
                dtqdValue = numbers[0];
            }
        } else {
            // Bảng Doanh thu thực mới: numbers[0] = SỐ LƯỢNG, numbers[1] = DOANH THU THỰC
            if (numbers.length >= 2) {
                soLuongValue = numbers[0];
                dtlkValue = numbers[1];
            } else if (numbers.length === 1) {
                dtlkValue = numbers[0];
            }
        }

        if (isTotal) {
            result.total.hasExplicit = true;
            result.total.dtlk += dtlkValue;
            result.total.dtqd += dtqdValue;
            result.total.soLuong += soLuongValue;
        } else if (isDept) {
            currentDept = rawName;
            if (!isIgnoredDept(currentDept)) {
                if (!result.deptMap.has(rawName)) {
                    result.deptMap.set(rawName, { department: rawName, dtlk: 0, dtqd: 0, soLuong: 0 });
                }
                const dept = result.deptMap.get(rawName)!;
                dept.dtlk += dtlkValue;
                dept.dtqd += dtqdValue;
                dept.soLuong += soLuongValue;
            }
        } else if (isValidEmployeeName(rawName)) {
            if (!isIgnoredDept(currentDept)) {
                const canonicalName = standardizeEmployeeName(rawName);
                const empId = extractEmployeeId(rawName);
                const key = empId || canonicalName;

                if (result.empMap.has(key)) {
                    const existing = result.empMap.get(key)!;
                    existing.dtlk += dtlkValue;
                    existing.dtqd += dtqdValue;
                    existing.soLuong += soLuongValue;
                } else {
                    result.empMap.set(key, {
                        rawName,
                        canonicalName,
                        empId,
                        department: currentDept,
                        dtlk: dtlkValue,
                        dtqd: dtqdValue,
                        soLuong: soLuongValue
                    });
                }
            }
        }
    });

    return result;
};

/**
 * Xây dựng RevenueRow[] từ một bảng đơn lẻ
 */
const buildRevenueRowsFromMap = (dataMap: SingleRevenueParsedMap): RevenueRow[] => {
    const { empMap, deptMap, total } = dataMap;
    const rows: RevenueRow[] = [];

    const totalRow: RevenueRow = {
        type: 'total',
        name: 'Tổng',
        dtlk: total.hasExplicit ? total.dtlk : Array.from(empMap.values()).reduce((sum, e) => sum + e.dtlk, 0),
        dtqd: total.hasExplicit ? total.dtqd : Array.from(empMap.values()).reduce((sum, e) => sum + e.dtqd, 0),
        hieuQuaQD: 0,
        soLuong: total.hasExplicit ? total.soLuong : Array.from(empMap.values()).reduce((sum, e) => sum + (e.soLuong || 0), 0),
        donGia: 0
    };
    totalRow.hieuQuaQD = calculateHieuQuaQDFraction(totalRow.dtqd, totalRow.dtlk);
    if (totalRow.dtlk > 0 || totalRow.dtqd > 0 || (totalRow.soLuong || 0) > 0) {
        rows.push(totalRow);
    }

    if (deptMap.size === 0 && empMap.size > 0) {
        const deptEmployees = Array.from(empMap.values());
        const sumDtlk = deptEmployees.reduce((sum, e) => sum + e.dtlk, 0);
        const sumDtqd = deptEmployees.reduce((sum, e) => sum + e.dtqd, 0);
        const sumSoLuong = deptEmployees.reduce((sum, e) => sum + (e.soLuong || 0), 0);
        deptMap.set('BP ALL IN ONE - DMX', {
            department: 'BP ALL IN ONE - DMX',
            dtlk: sumDtlk,
            dtqd: sumDtqd,
            soLuong: sumSoLuong
        });
    }

    for (const dept of deptMap.values()) {
        rows.push({
            type: 'department',
            name: dept.department,
            dtlk: dept.dtlk,
            dtqd: dept.dtqd,
            hieuQuaQD: calculateHieuQuaQDFraction(dept.dtqd, dept.dtlk),
            soLuong: dept.soLuong
        });
    }

    for (const emp of empMap.values()) {
        rows.push({
            type: 'employee',
            name: formatEmployeeName(emp.canonicalName),
            originalName: emp.canonicalName,
            department: emp.department,
            dtlk: emp.dtlk,
            dtqd: emp.dtqd,
            hieuQuaQD: calculateHieuQuaQDFraction(emp.dtqd, emp.dtlk),
            soLuong: emp.soLuong
        });
    }

    return rows;
};

/**
 * Ghép (merge) dữ liệu từ 2 nguồn Doanh thu Thực và Doanh thu Quy đổi thành danh sách RevenueRow chuẩn
 */
export const mergeRevenueData = (thucRaw?: string, qdRaw?: string): RevenueRow[] => {
    const rawThuc = (thucRaw || '').trim();
    const rawQd = (qdRaw || '').trim();

    if (!rawThuc && !rawQd) return [];

    const thucMap = rawThuc ? parseRevenueToInternalMap(rawThuc, 'thuc') : null;
    const qdMap = rawQd ? parseRevenueToInternalMap(rawQd, 'qd') : null;

    // Nếu chỉ có 1 bảng:
    if (thucMap && !qdMap) {
        return buildRevenueRowsFromMap(thucMap);
    }
    if (!thucMap && qdMap) {
        return buildRevenueRowsFromMap(qdMap);
    }

    // Nếu cả 2 bảng đều tồn tại, tiến hành merge thông minh
    const tMap = thucMap!;
    const qMap = qdMap!;

    type ParsedEmpItem = SingleRevenueParsedMap['empMap'] extends Map<any, infer V> ? V : never;

    // Tạo chỉ mục phụ cho bảng Quy đổi theo empId và canonicalName
    const qdById = new Map<string, ParsedEmpItem>();
    const qdByCanonical = new Map<string, ParsedEmpItem>();
    for (const [key, item] of qMap.empMap.entries()) {
        if (item.empId) qdById.set(item.empId, item);
        qdByCanonical.set(item.canonicalName.toLowerCase(), item);
        qdByCanonical.set(key.toLowerCase(), item);
    }

    const mergedEmployees = new Map<string, RevenueRow>();
    const matchedQdKeys = new Set<string>();

    // 1. Duyệt tất cả nhân viên trong bảng Thực
    for (const [tKey, tItem] of tMap.empMap.entries()) {
        let qItem: ParsedEmpItem | undefined = undefined;

        if (tItem.empId && qdById.has(tItem.empId)) {
            qItem = qdById.get(tItem.empId);
        } else if (qdByCanonical.has(tItem.canonicalName.toLowerCase())) {
            qItem = qdByCanonical.get(tItem.canonicalName.toLowerCase());
        } else if (qMap.empMap.has(tKey)) {
            qItem = qMap.empMap.get(tKey);
        }

        if (qItem) {
            matchedQdKeys.add(qItem.empId || qItem.canonicalName);
        }

        const canonicalName = tItem.canonicalName || qItem?.canonicalName || tKey;
        const dtlk = tItem.dtlk;
        const dtqd = qItem ? qItem.dtqd : (tMap.kind === 'combined' ? tItem.dtqd : 0);
        const soLuong = tItem.soLuong > 0 ? tItem.soLuong : (qItem?.soLuong ?? 0);
        const dept = !isIgnoredDept(tItem.department) ? tItem.department : (qItem?.department || 'BP ALL IN ONE - DMX');

        mergedEmployees.set(canonicalName, {
            type: 'employee',
            name: formatEmployeeName(canonicalName),
            originalName: canonicalName,
            department: dept,
            dtlk,
            dtqd,
            hieuQuaQD: calculateHieuQuaQDFraction(dtqd, dtlk),
            soLuong
        });
    }

    // 2. Bổ sung các nhân viên chỉ có trong bảng Quy đổi (nếu có)
    for (const [qKey, qItem] of qMap.empMap.entries()) {
        const identityKey = qItem.empId || qItem.canonicalName;
        if (matchedQdKeys.has(identityKey) || matchedQdKeys.has(qKey)) {
            continue;
        }

        const canonicalName = qItem.canonicalName || qKey;
        const dtlk = qMap.kind === 'combined' ? qItem.dtlk : 0;
        const dtqd = qItem.dtqd;
        const soLuong = qItem.soLuong;
        const dept = !isIgnoredDept(qItem.department) ? qItem.department : 'BP ALL IN ONE - DMX';

        mergedEmployees.set(canonicalName, {
            type: 'employee',
            name: formatEmployeeName(canonicalName),
            originalName: canonicalName,
            department: dept,
            dtlk,
            dtqd,
            hieuQuaQD: calculateHieuQuaQDFraction(dtqd, dtlk),
            soLuong
        });
    }

    // 3. Xây dựng dòng tổng hợp
    const totalRow: RevenueRow = {
        type: 'total',
        name: 'Tổng',
        dtlk: tMap.total.hasExplicit ? tMap.total.dtlk : Array.from(mergedEmployees.values()).reduce((sum, e) => sum + e.dtlk, 0),
        dtqd: qMap.total.hasExplicit ? qMap.total.dtqd : (tMap.kind === 'combined' && tMap.total.hasExplicit ? tMap.total.dtqd : Array.from(mergedEmployees.values()).reduce((sum, e) => sum + e.dtqd, 0)),
        hieuQuaQD: 0,
        soLuong: tMap.total.hasExplicit ? tMap.total.soLuong : (qMap.total.hasExplicit ? qMap.total.soLuong : Array.from(mergedEmployees.values()).reduce((sum, e) => sum + (e.soLuong || 0), 0)),
        donGia: 0
    };
    totalRow.hieuQuaQD = calculateHieuQuaQDFraction(totalRow.dtqd, totalRow.dtlk);

    // 4. Xây dựng các bộ phận
    const deptMap = new Map<string, RevenueRow>();
    for (const emp of mergedEmployees.values()) {
        const deptName = emp.department || 'BP ALL IN ONE - DMX';
        if (!deptMap.has(deptName)) {
            deptMap.set(deptName, {
                type: 'department',
                name: deptName,
                dtlk: 0,
                dtqd: 0,
                hieuQuaQD: 0,
                soLuong: 0
            });
        }
        const dept = deptMap.get(deptName)!;
        dept.dtlk += emp.dtlk;
        dept.dtqd += emp.dtqd;
        dept.soLuong = Number(dept.soLuong || 0) + (emp.soLuong || 0);
    }
    for (const dept of deptMap.values()) {
        dept.hieuQuaQD = calculateHieuQuaQDFraction(dept.dtqd, dept.dtlk);
    }

    const rows: RevenueRow[] = [];
    if (totalRow.dtlk > 0 || totalRow.dtqd > 0 || (totalRow.soLuong || 0) > 0) {
        rows.push(totalRow);
    }
    for (const dept of deptMap.values()) {
        rows.push(dept);
    }
    for (const emp of mergedEmployees.values()) {
        rows.push(emp);
    }

    return rows;
};

/**
 * Tương thích ngược: Phân tích chuỗi doanh thu và tự động phân loại/gộp
 */
export const parseRevenueData = (danhSachData: string): RevenueRow[] => {
    return mergeRevenueData(danhSachData, '');
};

export const parseCrossSellingData = (data: string, employeeDepartmentMap: Record<string, string>): CrossSellingRow[] => {
    if (!data) return [];
    const lines = String(data).split('\n');

    const normalizedEmployeeMap: Record<string, string> = {};
    // O(1) cache cho fallback "tên rút gọn" (không có hậu tố " - Mã số") — trước đây quét tuyến tính
    // O(số nhân viên) cho MỖI dòng không khớp tên chính xác, nay tra cứu 1 lần đã build sẵn.
    const shortNamePrefixMap = new Map<string, string>();
    for (const fullName of Object.keys(employeeDepartmentMap)) {
        const norm = normalizeText(fullName);
        if (norm) normalizedEmployeeMap[norm] = fullName;
        const dashIdx = norm.indexOf(' - ');
        if (dashIdx > -1) {
            const prefix = norm.slice(0, dashIdx).trim();
            const suffix = norm.slice(dashIdx + 3).trim();
            if (!shortNamePrefixMap.has(prefix)) shortNamePrefixMap.set(prefix, fullName);
            if (!shortNamePrefixMap.has(suffix)) shortNamePrefixMap.set(suffix, fullName);
        }
    }

    const findFullName = (shortName: string) => {
        const canonical = standardizeEmployeeName(shortName);
        const normCanonical = normalizeText(canonical);
        if (normCanonical && normalizedEmployeeMap[normCanonical]) return normalizedEmployeeMap[normCanonical];
        const normalizedShort = normalizeText(shortName);
        if (!normalizedShort) return null;
        if (normalizedEmployeeMap[normalizedShort]) return normalizedEmployeeMap[normalizedShort];
        return shortNamePrefixMap.get(normalizedShort) ?? null;
    };

    const empMap = new Map<string, CrossSellingRow>();
    const deptMap = new Map<string, CrossSellingRow>();
    const totalRow: CrossSellingRow = {
        type: 'total', name: 'Tổng cộng', originalName: 'Tổng',
        dtlk: 0, billBk: 0, pctBillBk: 0, billMngn: 0, pctBillMngn: 0,
        totalBill: 0, slBk: 0, pctSpBk: 0, slMngn: 0, pctSpMngn: 0, totalSl: 0
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Nhân viên') || trimmed.includes('Lượt bill bán kèm')) continue;
        const parts = line.split('\t');
        if (parts.length < 10) continue;

        const rawName = parts[0]?.trim() || '';
        const isTotal = rawName === 'Tổng';
        const isDept = rawName.startsWith('BP ');
        
        let originalName: string | null = null;
        let department: string | undefined = undefined;

        if (isTotal) originalName = 'Tổng';
        else if (isDept) originalName = rawName;
        else {
            originalName = findFullName(rawName);
            if (originalName) department = employeeDepartmentMap[originalName];
        }

        if (!originalName) continue;
        if (department && isIgnoredDept(department)) continue;
        if (isDept && isIgnoredDept(rawName)) continue;

        const dtlk = parseNumber(parts[1]);
        const billBk = parseNumber(parts[4]);
        const billMngn = parseNumber(parts[6]);
        const totalBill = parseNumber(parts[9]);
        const slBk = parseNumber(parts[10]);
        const slMngn = parseNumber(parts[12]);
        const totalSl = parseNumber(parts[15]);

        const updateRow = (target: CrossSellingRow) => {
            target.dtlk! += dtlk;
            target.billBk! += billBk;
            target.billMngn! += billMngn;
            target.totalBill! += totalBill;
            target.slBk! += slBk;
            target.slMngn! += slMngn;
            target.totalSl! += totalSl;
        };

        if (isTotal) {
            updateRow(totalRow);
        } else if (isDept) {
            if (!deptMap.has(rawName)) {
                deptMap.set(rawName, {
                    type: 'department', name: rawName, originalName: rawName,
                    dtlk: 0, billBk: 0, pctBillBk: 0, billMngn: 0, pctBillMngn: 0,
                    totalBill: 0, slBk: 0, pctSpBk: 0, slMngn: 0, pctSpMngn: 0, totalSl: 0
                });
            }
            updateRow(deptMap.get(rawName)!);
        } else {
            if (!empMap.has(originalName)) {
                empMap.set(originalName, {
                    type: 'employee', name: formatEmployeeName(originalName), originalName: originalName, department: department,
                    dtlk: 0, billBk: 0, pctBillBk: 0, billMngn: 0, pctBillMngn: 0,
                    totalBill: 0, slBk: 0, pctSpBk: 0, slMngn: 0, pctSpMngn: 0, totalSl: 0
                });
            }
            updateRow(empMap.get(originalName)!);
        }
    }

    const calcPct = (target: CrossSellingRow) => {
        target.pctBillBk = calculatePercentage(target.billBk!, target.totalBill!);
        target.pctBillMngn = calculatePercentage(target.billMngn!, target.totalBill!);
        target.pctSpBk = calculatePercentage(target.slBk!, target.totalSl!);
        target.pctSpMngn = calculatePercentage(target.slMngn!, target.totalSl!);
    };

    calcPct(totalRow);
    deptMap.forEach(calcPct);
    empMap.forEach(calcPct);

    const rows: CrossSellingRow[] = [];
    if (totalRow.totalBill! > 0 || totalRow.totalSl! > 0) rows.push(totalRow);
    deptMap.forEach(dept => rows.push(dept));
    empMap.forEach(emp => rows.push(emp));

    return rows;
};

export const parseInstallmentData = (traGopData: string, employeeDepartmentMap: Record<string, string>): InstallmentRow[] => {
    if (!traGopData) return [];
    const rawLines = String(traGopData).split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (rawLines.length === 0) return [];

    const providerMapping: Record<string, string> = {
        'HomeCredit': 'HC', 'FECredit': 'FE', 'Shinhan': 'SHF', 'SMARTPOS': 'POS', 'HPL': 'HPL', 
        'KREDIVO': 'KRE', 'Samsung': 'SSF', 'TPBANK': 'TPB', 'PAYLATER': 'MWG', 'EVO': 'EVO', 'Payoo': 'PAY'
    };

    const getShortProvider = (name: string): string => {
        for (const [key, val] of Object.entries(providerMapping)) {
            if (name.toUpperCase().includes(key.toUpperCase())) return val;
        }
        return name.slice(0, 4).toUpperCase();
    };

    const defaultProviders = [
        { name: 'HomeCredit(HC)', short: 'HC' },
        { name: 'Trả góp HPL-Home Credit', short: 'HPL' },
        { name: 'Thẻ tín dụng - SMARTPOS', short: 'POS' },
        { name: 'FECredit(FE)', short: 'FE' },
        { name: 'Trả góp KREDIVO', short: 'KRE' },
        { name: 'MWG PAYLATER', short: 'MWG' },
        { name: 'Samsung Finance +', short: 'SSF' },
        { name: 'Shinhan Finance', short: 'SHF' }
    ];

    // 1. Detect provider names from header
    const headerKeywords = Object.keys(providerMapping);
    const foundProviderNames: string[] = [];
    rawLines.forEach(l => {
        const tokens = l.includes('\t') ? l.split('\t') : [l];
        tokens.forEach(t => {
            const trimmed = t.trim();
            if (headerKeywords.some(k => trimmed.toUpperCase().includes(k.toUpperCase())) && !/^-?[\d.,]+%?$/.test(trimmed)) {
                if (!foundProviderNames.includes(trimmed) && trimmed.length < 50) {
                    foundProviderNames.push(trimmed);
                }
            }
        });
    });

    const detectedProviders = foundProviderNames.length > 0
        ? foundProviderNames.map(name => ({ name, short: getShortProvider(name) }))
        : defaultProviders;

    // 2. Build smart employee name mapper
    const nameToFullMap = new Map<string, string>();
    for (const fullName of Object.keys(employeeDepartmentMap)) {
        const normFull = normalizeText(fullName);
        if (normFull) nameToFullMap.set(normFull, fullName);

        if (fullName.includes(' - ')) {
            const parts = fullName.split(' - ').map(p => p.trim());
            parts.forEach(p => {
                const normP = normalizeText(p);
                if (normP && !/^\d+$/.test(normP)) {
                    nameToFullMap.set(normP, fullName);
                }
            });
        }
    }

    const findFullName = (rawName: string): string => {
        const canonical = standardizeEmployeeName(rawName);
        const normCanonical = normalizeText(canonical);
        if (normCanonical && nameToFullMap.has(normCanonical)) return nameToFullMap.get(normCanonical)!;

        const norm = normalizeText(rawName);
        if (!norm) return rawName;
        if (nameToFullMap.has(norm)) return nameToFullMap.get(norm)!;
        
        for (const [key, val] of nameToFullMap.entries()) {
            if (key.includes(norm) || norm.includes(key)) return val;
        }
        return rawName;
    };

    const isNumeric = (s: string): boolean => /^-?[\d.,]+%?$/.test(String(s).trim());

    // 3. Normalize lines into standard structured entries: { name: string, numbers: number[] }
    const entries: { name: string; numbers: number[] }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        // Skip header lines, navigation links, buttons, metadata
        if (line.includes('http') || line.includes('Dashboards') || line.includes('Tìm báo cáo') ||
            line.includes('Cập nhật lúc') || line.includes('webview') || line.includes('Xuất Excel') ||
            line.includes('Tất cả vùng') || line.includes('1-') || line.includes('/ trang') ||
            line.includes('Đang chọn') || line.includes('Đã copy')) {
            continue;
        }

        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim()).filter(p => p !== '');
            if (parts.length === 0) continue;

            const firstLower = parts[0].toLowerCase();
            if (firstLower === 'nhân viên' || firstLower === 'dt' || firstLower === '%' || firstLower.includes('tỷ trọng') || firstLower.includes('dt siêu thị')) {
                continue;
            }

            if (isNumeric(parts[0])) {
                if (entries.length > 0 && entries[entries.length - 1].numbers.length === 0) {
                    entries[entries.length - 1].numbers = parts.map(parseNumber);
                }
            } else {
                const name = parts[0];
                const numbers = parts.slice(1).map(parseNumber);
                entries.push({ name, numbers });
            }
        } else {
            if (isNumeric(line)) {
                if (entries.length > 0) {
                    entries[entries.length - 1].numbers.push(parseNumber(line));
                }
            } else {
                const lower = line.toLowerCase();
                if (lower === 'nhân viên' || lower === 'dt' || lower === '%' || lower.includes('tỷ trọng') || lower.includes('dt trả góp') || lower.includes('dt siêu thị') || lower === 'xem' || lower === 'lũy kế' || lower === 'realtime') {
                    continue;
                }
                entries.push({ name: line, numbers: [] });
            }
        }
    }

    // 4. Build InstallmentRow objects
    const empMap = new Map<string, InstallmentRow>();
    const deptMap = new Map<string, InstallmentRow>();
    const totalRow: InstallmentRow = {
        type: 'total', name: 'TỔNG CỘNG', originalName: 'Tổng',
        department: undefined, providers: [], totalDtSieuThi: 0, totalPercent: 0
    };

    let hasExplicitTotal = false;

    entries.forEach(entry => {
        const { name: rawName, numbers } = entry;
        if (numbers.length < 2) return;

        const isTotal = rawName.toLowerCase() === 'tổng' || rawName.toLowerCase() === 'tổng cộng';
        const isDept = rawName.startsWith('BP ');

        let dtSieuThi = 0;
        const providers: InstallmentProvider[] = [];

        // Determine format:
        // Format A (New format from BI):
        // numbers[0] = DT Trả góp, numbers[1] = DT Siêu thị, numbers[2] = Tỷ trọng %, numbers[3..] = Pairs of (DT, %)
        if (numbers.length >= 3 + detectedProviders.length * 2) {
            dtSieuThi = numbers[1];
            for (let pIdx = 0; pIdx < detectedProviders.length; pIdx++) {
                const dtVal = numbers[3 + pIdx * 2];
                const pctVal = numbers[3 + pIdx * 2 + 1];
                providers.push({
                    name: detectedProviders[pIdx].name,
                    shortName: detectedProviders[pIdx].short,
                    dt: dtVal,
                    percent: pctVal
                });
            }
        } else if (numbers.length >= detectedProviders.length * 2 + 2) {
            // Format B (Legacy format):
            // numbers[0..2*N-1] = Pairs of (DT, %), numbers[2*N] = DT Siêu thị, numbers[2*N + 1] = Tỷ trọng %
            dtSieuThi = numbers[numbers.length - 2];
            for (let pIdx = 0; pIdx < detectedProviders.length; pIdx++) {
                const dtVal = numbers[pIdx * 2];
                const pctVal = numbers[pIdx * 2 + 1];
                providers.push({
                    name: detectedProviders[pIdx].name,
                    shortName: detectedProviders[pIdx].short,
                    dt: dtVal,
                    percent: pctVal
                });
            }
        } else {
            // Fallback: take as many providers as possible
            dtSieuThi = numbers[1] || numbers[numbers.length - 2] || 0;
            for (let pIdx = 0; pIdx < detectedProviders.length; pIdx++) {
                const dtCol = 3 + pIdx * 2 < numbers.length ? 3 + pIdx * 2 : (pIdx * 2 < numbers.length ? pIdx * 2 : -1);
                const pctCol = dtCol >= 0 && dtCol + 1 < numbers.length ? dtCol + 1 : -1;
                providers.push({
                    name: detectedProviders[pIdx].name,
                    shortName: detectedProviders[pIdx].short,
                    dt: dtCol >= 0 ? numbers[dtCol] : 0,
                    percent: pctCol >= 0 ? numbers[pctCol] : 0
                });
            }
        }

        const matchedFullName = isTotal ? 'Tổng' : (isDept ? rawName : findFullName(rawName));
        const resolvedDept = isDept ? rawName : (employeeDepartmentMap[matchedFullName] || employeeDepartmentMap[rawName] || '');

        if (!isDept && (!resolvedDept || isIgnoredDept(resolvedDept))) return;
        if (isDept && isIgnoredDept(rawName)) return;

        const updateTarget = (target: InstallmentRow) => {
            target.totalDtSieuThi += dtSieuThi;
            providers.forEach(p => {
                const existingP = target.providers.find(ep => ep.name === p.name);
                if (existingP) {
                    existingP.dt += p.dt;
                } else {
                    target.providers.push({ ...p });
                }
            });
        };

        if (isTotal) {
            hasExplicitTotal = true;
            updateTarget(totalRow);
        } else if (isDept) {
            if (!deptMap.has(rawName)) {
                deptMap.set(rawName, {
                    type: 'department', name: rawName, originalName: rawName, department: rawName,
                    providers: [], totalDtSieuThi: 0, totalPercent: 0
                });
            }
            updateTarget(deptMap.get(rawName)!);
        } else {
            if (!empMap.has(matchedFullName)) {
                empMap.set(matchedFullName, {
                    type: 'employee',
                    name: formatEmployeeName(matchedFullName),
                    originalName: matchedFullName,
                    department: resolvedDept,
                    providers: [], totalDtSieuThi: 0, totalPercent: 0
                });
            }
            updateTarget(empMap.get(matchedFullName)!);
        }
    });

    const calcPct = (target: InstallmentRow) => {
        const totalTraCham = target.providers.reduce((sum, p) => sum + p.dt, 0);
        target.providers.forEach(p => {
            p.percent = totalTraCham > 0 ? (p.dt / totalTraCham) * 100 : 0;
        });
        target.totalPercent = target.totalDtSieuThi > 0 ? (totalTraCham / target.totalDtSieuThi) * 100 : 0;
    };

    if (hasExplicitTotal) {
        calcPct(totalRow);
    } else if (empMap.size > 0) {
        totalRow.totalDtSieuThi = Array.from(empMap.values()).reduce((sum, e) => sum + e.totalDtSieuThi, 0);
        detectedProviders.forEach(dp => {
            const sumDt = Array.from(empMap.values()).reduce((sum, e) => {
                const p = e.providers.find(ep => ep.name === dp.name);
                return sum + (p?.dt || 0);
            }, 0);
            totalRow.providers.push({
                name: dp.name,
                shortName: dp.short,
                dt: sumDt,
                percent: 0
            });
        });
        calcPct(totalRow);
    }

    deptMap.forEach(calcPct);
    empMap.forEach(calcPct);

    const rows: InstallmentRow[] = [];
    if (totalRow.totalDtSieuThi > 0 || totalRow.providers.length > 0) rows.push(totalRow);
    deptMap.forEach(dept => rows.push(dept));
    empMap.forEach(emp => rows.push(emp));

    return rows;
};

export const validateThiDuaData = (data: string): boolean => {
    if (!data) return false;
    const lower = data.toLowerCase();
    const upper = data.toUpperCase();
    return lower.includes('phòng ban') ||
           ((upper.includes('DOANH THU') || upper.includes('SỐ LƯỢNG') || lower.includes('thi đua')) &&
            (upper.includes('HẠNG TRONG ST') || upper.includes('TOP/BOTTOM') || lower.includes('chương trình') || upper.includes('BỘ PHẬN') || upper.includes('TỔNG')));
};

export const parseCompetitionData = (thiDuaData: string, employeeDepartmentMap: Record<string, string>): Record<Criterion, { headers: CompetitionHeader[], employees: CompetitionEmployeeRow[] }> => {
    const emptyResult: Record<Criterion, { headers: CompetitionHeader[], employees: CompetitionEmployeeRow[] }> = { DTLK: { headers: [], employees: [] }, DTQĐ: { headers: [], employees: [] }, SLLK: { headers: [], employees: [] } };
    if (!thiDuaData) return emptyResult;
    const rawLines = thiDuaData.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (rawLines.length === 0) return emptyResult;

    // 1. Kiểm tra nếu là định dạng BI Cũ (Bảng ngang có dòng 'phòng ban' và dòng metrics DTLK/DTQĐ/SLLK)
    const phongBanIndex = rawLines.findIndex(l => l.toLowerCase().includes('phòng ban'));
    const legacyMetricsRowIndex = rawLines.findIndex(l => {
        const parts = l.split('\t').map(p => p.trim().toUpperCase());
        return parts.some(p => ['DTLK', 'DTQĐ', 'SLLK', 'SL REALTIME'].includes(p));
    });

    if (phongBanIndex !== -1 && legacyMetricsRowIndex !== -1 && phongBanIndex < legacyMetricsRowIndex) {
        const titles = rawLines.slice(phongBanIndex + 1, legacyMetricsRowIndex).map(t => t.trim());
        const metrics = rawLines[legacyMetricsRowIndex].trim().split('\t');
        const allHeaders: CompetitionHeader[] = [];
        const count = Math.min(titles.length, metrics.length);
        for (let i = 0; i < count; i++) {
            const metricRaw = metrics[i]?.trim().toUpperCase();
            let metric = '';
            // SỐ LƯỢNG (SLLK) gộp vào DTLK vì cả 2 đều là kết quả luỹ kế, chỉ khác cách đo lường
            if (metricRaw === 'DTLK') metric = 'DTLK'; else if (metricRaw === 'DTQĐ') metric = 'DTQĐ'; else if (metricRaw === 'SLLK' || metricRaw === 'SL REALTIME') metric = 'DTLK';
            if (metric) allHeaders.push({ title: shortenName(titles[i] || `Unnamed ${i}`), originalTitle: titles[i], metric });
        }
        const legacyResult: Record<Criterion, { headers: CompetitionHeader[], employees: CompetitionEmployeeRow[] }> = {
            DTLK: { headers: allHeaders.filter(h => h.metric === 'DTLK'), employees: [] },
            DTQĐ: { headers: allHeaders.filter(h => h.metric === 'DTQĐ'), employees: [] },
            SLLK: { headers: allHeaders.filter(h => h.metric === 'SLLK'), employees: [] },
        };
        
        const employeeData = new Map<string, { 
            department: string, 
            originalName: string, 
            values: { [key in Criterion]: (number | null)[] } 
        }>();
        
        let currentDeptFallback = 'BP Khác';

        const fastDeptMap = new Map<string, {orig: string, dept: string}>();
        for (const [fullName, dept] of Object.entries(employeeDepartmentMap)) {
            fastDeptMap.set(normalizeText(fullName), {orig: fullName, dept});
        }

        for (const line of rawLines.slice(legacyMetricsRowIndex + 1)) {
            const parts = line.split('\t');
            const namePart = parts[0]?.trim();
            if (!namePart) continue;

            if (namePart.startsWith('BP ')) {
                currentDeptFallback = namePart;
            }

            const normalizedName = normalizeText(namePart);
            let matchedOriginalName = "";
            let department = "";
            
            const canonicalName = standardizeEmployeeName(namePart);
            const match = fastDeptMap.get(normalizeText(canonicalName)) || fastDeptMap.get(normalizedName);
            if (match) {
                matchedOriginalName = match.orig;
                department = match.dept;
            }

            if (!department && namePart.includes(' - ') && currentDeptFallback !== 'BP Khác') {
                department = currentDeptFallback;
                matchedOriginalName = namePart;
            }

            if (!department) {
                if (namePart === 'Tổng') department = 'Tổng';
                else if (namePart.startsWith('BP ')) department = namePart;
                else continue;
            }
            
            if (isIgnoredDept(department)) continue;
            
            const formattedName = namePart === 'Tổng' ? 'Tổng' : formatEmployeeName(matchedOriginalName || namePart);
            
            if (!employeeData.has(formattedName)) {
                employeeData.set(formattedName, { 
                    department: department,
                    originalName: matchedOriginalName || namePart,
                    values: { DTLK: [], DTQĐ: [], SLLK: [] }
                });
                allHeaders.forEach((header, index) => {
                    const metric = header.metric as Criterion;
                    employeeData.get(formattedName)!.values[metric][index] = null;
                });
            }
            
            const record = employeeData.get(formattedName)!;
            const headerIndexMap: Record<Criterion, number> = { DTLK: 0, DTQĐ: 0, SLLK: 0 };
            
            allHeaders.forEach((header, colIndex) => { 
                const metric = header.metric as Criterion;
                const val = parseNumber(parts[colIndex + 1]); 
                const idx = headerIndexMap[metric]++;
                if (val > 0) {
                    record.values[metric][idx] = (record.values[metric][idx] || 0) + val;
                }
            });
        }
        
        employeeData.forEach((data, name) => {
            Object.keys(legacyResult).forEach(key => { 
                const criterion = key as Criterion; 
                legacyResult[criterion].employees.push({ 
                    name, 
                    originalName: data.originalName, 
                    department: data.department, 
                    values: data.values[criterion] 
                }); 
            });
        });
        return legacyResult;
    }

    // 2. Định dạng BI Mới: Danh sách các khối chương trình xếp dọc hoặc bảng
    // "DOANH THU và SỐ LƯỢNG: Cả 2 đều là kết quả luỹ kế, chỉ khác cách đo lường" -> CẢ HAI đều map vào DTLK
    const isMetadataLine = (str: string) => {
        const s = str.toLowerCase();
        return s.startsWith('http') || s.startsWith('dashboards') || s.startsWith('tìm báo cáo') ||
               s.startsWith('cập nhật lúc') || s.startsWith('tải lại') || s.startsWith('xuất excel') ||
               s.startsWith('chép link') || s.startsWith('chép bảng') || s.startsWith('toàn công ty') ||
               s.startsWith('lũy kế') || s.startsWith('danh sách') || s.startsWith('toggle theme') ||
               s.startsWith('miền') || s.startsWith('vùng') || s.startsWith('khu vực') || s.startsWith('siêu thị') ||
               s.startsWith('ngành hàng') || s.includes('chương trình') || s.includes('đã copy');
    };

    const getCleanTitle = (idx: number): string => {
        for (let k = idx - 1; k >= 0; k--) {
            const line = rawLines[k];
            if (!isMetadataLine(line) && line !== 'TOP' && line !== 'BOTTOM' && line !== '-' && !/^\d+$/.test(line)) {
                return line;
            }
        }
        return `Chương trình ${idx}`;
    };

    interface ProgramBlock {
        title: string;
        metric: Criterion;
        headerLineIndex: number;
        dataStartIndex: number;
        endLineIndex?: number;
    }

    const blocks: ProgramBlock[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const upper = line.toUpperCase();

        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim());
            const upperParts = parts.map(p => p.toUpperCase());
            const dtIdx = upperParts.indexOf('DOANH THU');
            const slIdx = upperParts.indexOf('SỐ LƯỢNG');
            const dtqdIdx = upperParts.findIndex(p => p === 'DOANH THU QĐ' || p === 'DTQĐ');

            if (dtIdx !== -1 || slIdx !== -1 || dtqdIdx !== -1) {
                let metric: Criterion = 'DTLK';
                // Giữ SLLK cho SỐ LƯỢNG để hiển thị đúng đơn vị (Cái), gom cùng nhóm DTLK
                if (dtqdIdx !== -1) metric = 'DTQĐ';
                else if (slIdx !== -1 && dtIdx === -1) metric = 'SLLK';

                let title = parts[0];
                if (!title || upperParts.includes(title.toUpperCase())) {
                    title = getCleanTitle(i);
                }
                blocks.push({ title, metric, headerLineIndex: i, dataStartIndex: i + 1 });
            }
        } else {
            if (upper === 'DOANH THU' || upper === 'SỐ LƯỢNG' || upper === 'DOANH THU QĐ' || upper === 'DTQĐ' || upper === 'DTLK' || upper === 'SLLK') {
                let metric: Criterion = 'DTLK';
                // Giữ SLLK cho SỐ LƯỢNG để hiển thị đúng đơn vị (Cái), gom cùng nhóm DTLK
                if (upper === 'DOANH THU QĐ' || upper === 'DTQĐ') metric = 'DTQĐ';
                else if (upper === 'SỐ LƯỢNG' || upper === 'SLLK') metric = 'SLLK';

                const title = getCleanTitle(i);
                blocks.push({ title, metric, headerLineIndex: i, dataStartIndex: i + 1 });
            }
        }
    }

    if (blocks.length === 0) return emptyResult;

    // Boundaries of each block
    for (let b = 0; b < blocks.length; b++) {
        const nextBlock = blocks[b + 1];
        blocks[b].endLineIndex = nextBlock
            ? nextBlock.headerLineIndex - (nextBlock.headerLineIndex > 0 && !rawLines[nextBlock.headerLineIndex].includes('\t') ? 1 : 0)
            : rawLines.length;
    }

    const headersMap: Record<Criterion, CompetitionHeader[]> = {
        DTLK: [],
        SLLK: [],
        DTQĐ: []
    };

    const isEmployeeName = (str: string) => {
        if (!str || typeof str !== 'string') return false;
        const s = str.trim();
        if (/^\d{3,}\s*-\s*.+/.test(s)) return true;
        if (/^(online|admin|administrator)\s*-\s*.+/i.test(s)) return true;
        return false;
    };

    const fastDeptMap = new Map<string, { orig: string; dept: string }>();
    for (const [fullName, dept] of Object.entries(employeeDepartmentMap)) {
        fastDeptMap.set(normalizeText(fullName), { orig: fullName, dept });
        if (fullName.includes(' - ')) {
            const parts = fullName.split(' - ').map(p => p.trim());
            parts.forEach(p => {
                const normP = normalizeText(p);
                if (normP) fastDeptMap.set(normP, { orig: fullName, dept });
            });
        }
    }

    const employeeData = new Map<string, {
        department: string;
        originalName: string;
        values: Record<Criterion, (number | null)[]>;
    }>();

    const recordEmployeeValue = (rawEmpName: string, metric: Criterion, colIdx: number, val: number) => {
        const canonical = standardizeEmployeeName(rawEmpName);
        const match = fastDeptMap.get(normalizeText(canonical)) || fastDeptMap.get(normalizeText(rawEmpName));
        const matchedOriginalName = match ? match.orig : rawEmpName;
        const department = match ? match.dept : '';

        if (!department || isIgnoredDept(department)) return;

        const formattedName = formatEmployeeName(matchedOriginalName);

        if (!employeeData.has(formattedName)) {
            employeeData.set(formattedName, {
                department,
                originalName: matchedOriginalName,
                values: {
                    DTLK: new Array(headersMap.DTLK.length).fill(null),
                    SLLK: new Array(headersMap.SLLK.length).fill(null),
                    DTQĐ: new Array(headersMap.DTQĐ.length).fill(null)
                }
            });
        }
        const record = employeeData.get(formattedName)!;
        while (record.values[metric].length <= colIdx) {
            record.values[metric].push(null);
        }
        record.values[metric][colIdx] = (record.values[metric][colIdx] || 0) + val;
    };

    // Đăng ký headers
    blocks.forEach(block => {
        const { title, metric } = block;
        headersMap[metric].push({
            title: shortenName(title || `Unnamed ${headersMap[metric].length}`),
            originalTitle: title,
            metric
        });
    });

    const metricIndices: Record<Criterion, number> = { DTLK: 0, SLLK: 0, DTQĐ: 0 };
    blocks.forEach(block => {
        const { metric } = block;
        const colIdx = metricIndices[metric]++;
        const blockLines = rawLines.slice(block.dataStartIndex, block.endLineIndex);

        let i = 0;
        while (i < blockLines.length) {
            const line = blockLines[i];

            if (line.includes('HẠNG TRONG ST') || line.includes('TOP/BOTTOM ST') || line.includes('BỘ PHẬN') ||
                line.includes('HẠNG TRONG MIỀN') || line.includes('HẠNG TRONG VÙNG') ||
                line === 'HẠNG TRONG ST' || line === 'TOP/BOTTOM ST' || line === 'BỘ PHẬN' ||
                isMetadataLine(line)) {
                i++;
                continue;
            }

            if (line.includes('\t')) {
                const parts = line.split('\t').map(p => p.trim());
                const firstCol = parts[0];
                if (firstCol.toLowerCase().startsWith('tổng')) {
                    i++;
                    continue;
                }
                if (isEmployeeName(firstCol)) {
                    const val = parseNumber(parts[1]);
                    recordEmployeeValue(firstCol, metric, colIdx, val);
                }
                i++;
                continue;
            }

            if (line.toLowerCase().startsWith('tổng')) {
                i++;
                if (i < blockLines.length) {
                    const nextLine = blockLines[i];
                    if (/^-?[\d.,]+$/.test(nextLine)) {
                        i++;
                    } else if (nextLine.includes('\t')) {
                        // Tab-separated total line: "508.56\t\t-\t" → skip
                        const firstPart = nextLine.split('\t')[0].trim();
                        if (/^-?[\d.,]+$/.test(firstPart)) i++;
                    }
                }
                if (i < blockLines.length && (blockLines[i] === '-' || /^\d+$/.test(blockLines[i]))) i++;
                continue;
            }

            if (isEmployeeName(line)) {
                const empName = line;
                i++;
                let val = 0;
                if (i < blockLines.length) {
                    const nextLine = blockLines[i];
                    if (/^-?[\d.,]+$/.test(nextLine)) {
                        // Pure number line (no tabs)
                        val = parseNumber(nextLine);
                        i++;
                    } else if (nextLine.includes('\t')) {
                        // Tab-separated: "55.69\t1\tTOP\t" → extract first column as value
                        const nextParts = nextLine.split('\t').map(p => p.trim());
                        if (/^-?[\d.,]+$/.test(nextParts[0])) {
                            val = parseNumber(nextParts[0]);
                            i++; // Skip entire tab-separated line (rank+status already consumed)
                        }
                    }
                }
                // Fallback: skip separate rank/status/BP lines if they exist on individual lines
                if (i < blockLines.length && /^\d+$/.test(blockLines[i])) i++;
                if (i < blockLines.length && (blockLines[i] === 'TOP' || blockLines[i] === 'BOTTOM' || blockLines[i] === '-')) i++;
                if (i < blockLines.length && blockLines[i].startsWith('BP ')) i++;

                recordEmployeeValue(empName, metric, colIdx, val);
                continue;
            }

            i++;
        }
    });

    // Merge SLLK vào DTLK ở output: gom chung nhóm nhưng mỗi header giữ metric gốc
    // để UI biết đơn vị hiển thị (SLLK → Cái, DTLK → Tr)
    const mergedDTLKHeaders = [...headersMap.DTLK, ...headersMap.SLLK];

    const result: Record<Criterion, { headers: CompetitionHeader[], employees: CompetitionEmployeeRow[] }> = {
        DTLK: { headers: mergedDTLKHeaders, employees: [] },
        DTQĐ: { headers: headersMap.DTQĐ, employees: [] },
        SLLK: { headers: [], employees: [] }  // Luôn trống — đã merge vào DTLK
    };

    employeeData.forEach((data, name) => {
        // DTLK: nối values DTLK + SLLK
        const dtlkVals = [...(data.values.DTLK || [])];
        while (dtlkVals.length < headersMap.DTLK.length) dtlkVals.push(null);
        const sllkVals = [...(data.values.SLLK || [])];
        while (sllkVals.length < headersMap.SLLK.length) sllkVals.push(null);
        const mergedVals = [...dtlkVals, ...sllkVals];

        result.DTLK.employees.push({
            name,
            originalName: data.originalName,
            department: data.department,
            values: mergedVals
        });

        // DTQĐ
        const dtqdVals = [...(data.values.DTQĐ || [])];
        while (dtqdVals.length < headersMap.DTQĐ.length) dtqdVals.push(null);
        result.DTQĐ.employees.push({
            name,
            originalName: data.originalName,
            department: data.department,
            values: dtqdVals
        });
    });

    return result;
};
