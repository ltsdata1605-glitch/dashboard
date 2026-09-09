
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
    if (idA && idB && idA === idB) return true;

    // So sánh qua dạng chuẩn hóa
    const canA = standardizeEmployeeName(aTrim);
    const canB = standardizeEmployeeName(bTrim);
    if (canA && canB && canA.toLowerCase() === canB.toLowerCase()) return true;

    // So sánh qua dạng rút gọn
    const fmtA = formatEmployeeName(aTrim);
    const fmtB = formatEmployeeName(bTrim);
    if (fmtA && fmtB && fmtA.toLowerCase() === fmtB.toLowerCase()) return true;

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

export const isIgnoredDept = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes('quản lý siêu thị') || lower.includes('trưởng ca');
};

export const parseRevenueData = (danhSachData: string): RevenueRow[] => {
    if (!danhSachData) return [];
    const rawLines = String(danhSachData).split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (rawLines.length === 0) return [];

    const empMap = new Map<string, RevenueRow>();
    const deptMap = new Map<string, RevenueRow>();
    const totalRow: RevenueRow = { type: 'total', name: 'Tổng', dtlk: 0, dtqd: 0, hieuQuaQD: 0, soLuong: 0, donGia: 0 };
    let currentDeptDS = 'BP ALL IN ONE - DMX';

    const isValidEmployeeName = (name: string) => {
        if (!name || typeof name !== 'string') return false;
        if (!name.includes(' - ')) return false;
        const parts = name.split(' - ').map(p => p.trim());
        return (/^\d+$/.test(parts[0]) && parts[1].length > 0) || (/^\d+$/.test(parts[1]) && parts[0].length > 0) || name.toLowerCase().includes('online') || name.toLowerCase().includes('admin');
    };

    const entries: { name: string; numbers: number[] }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        // Skip metadata / navigation
        if (line.includes('http') || line.includes('Dashboards') || line.includes('Tìm báo cáo') ||
            line.includes('Cập nhật lúc') || line.includes('webview') || line.includes('Xuất Excel') ||
            line.includes('Toàn công ty') || line.includes('triệu đồng') || line.includes('Target trọn kỳ') ||
            line.includes('TB3T cùng') || line.includes('TLPVTC') || line.includes('Tỉ trọng trả góp') ||
            line.includes('Doanh thu theo cấp') || line.includes('✓') || line.includes('1-') || line.includes('/ trang') ||
            line.includes('Đơn vị:') || line.includes('Đã copy')) {
            continue;
        }

        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim()).filter(p => p !== '');
            if (parts.length === 0) continue;
            const firstLower = parts[0].toLowerCase();
            if (firstLower === 'nhân viên' || firstLower === 'số lượng' || firstLower.includes('doanh thu qđ') || firstLower.includes('target')) {
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
            if (lower === 'nhân viên' || lower === 'số lượng' || lower === 'doanh thu qđ' || lower === '% tỉ trọng' || lower === 'doanh thu' || lower === 'target' || lower === '% ht target' || lower === 'tb 3 tháng' || lower === '% tt') {
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

    let hasExplicitTotal = false;

    entries.forEach(entry => {
        const { name: rawName, numbers } = entry;
        if (numbers.length < 2) return;

        const isTotal = rawName.toLowerCase().startsWith('tổng');
        const isDept = rawName.startsWith('BP ');

        let dtlkValue = 0;
        let dtqdValue = 0;
        let soLuongValue = 0;

        // Check if new format (DOANH THU QĐ at idx 1, DOANH THU THỰC at idx 3) vs legacy (DTLK at idx 0, DTQD at idx 1)
        if (numbers.length >= 4) {
            soLuongValue = numbers[0];
            dtqdValue = numbers[1];
            dtlkValue = numbers[3];
        } else if (numbers.length >= 2) {
            dtlkValue = numbers[0];
            dtqdValue = numbers[1];
        }

        if (isTotal) {
            hasExplicitTotal = true;
            totalRow.dtlk += dtlkValue;
            totalRow.dtqd += dtqdValue;
            totalRow.soLuong += soLuongValue;
        } else if (isDept) {
            currentDeptDS = rawName;
            if (!isIgnoredDept(currentDeptDS)) {
                if (!deptMap.has(rawName)) {
                    deptMap.set(rawName, { type: 'department', name: rawName, dtlk: 0, dtqd: 0, hieuQuaQD: 0, soLuong: 0 });
                }
                const dept = deptMap.get(rawName)!;
                dept.dtlk += dtlkValue;
                dept.dtqd += dtqdValue;
                dept.soLuong += soLuongValue;
            }
        } else if (isValidEmployeeName(rawName)) {
            if (!isIgnoredDept(currentDeptDS)) {
                const canonicalName = standardizeEmployeeName(rawName);
                if (empMap.has(canonicalName)) {
                    const existing = empMap.get(canonicalName)!;
                    existing.dtlk += dtlkValue;
                    existing.dtqd += dtqdValue;
                    existing.soLuong += soLuongValue;
                } else {
                    empMap.set(canonicalName, {
                        type: 'employee',
                        name: formatEmployeeName(canonicalName),
                        originalName: canonicalName,
                        department: currentDeptDS,
                        dtlk: dtlkValue,
                        dtqd: dtqdValue,
                        hieuQuaQD: 0,
                        soLuong: soLuongValue
                    });
                }
            }
        }
    });

    if (!hasExplicitTotal && empMap.size > 0) {
        totalRow.dtlk = Array.from(empMap.values()).reduce((sum, e) => sum + e.dtlk, 0);
        totalRow.dtqd = Array.from(empMap.values()).reduce((sum, e) => sum + e.dtqd, 0);
        totalRow.soLuong = Array.from(empMap.values()).reduce((sum, e) => sum + (e.soLuong || 0), 0);
    }

    if (deptMap.size === 0 && empMap.size > 0) {
        const deptEmployees = Array.from(empMap.values());
        const sumDtlk = deptEmployees.reduce((sum, e) => sum + e.dtlk, 0);
        const sumDtqd = deptEmployees.reduce((sum, e) => sum + e.dtqd, 0);
        const sumSoLuong = deptEmployees.reduce((sum, e) => sum + (e.soLuong || 0), 0);
        deptMap.set(currentDeptDS, {
            type: 'department',
            name: currentDeptDS,
            dtlk: sumDtlk,
            dtqd: sumDtqd,
            hieuQuaQD: 0,
            soLuong: sumSoLuong
        });
    }

    totalRow.hieuQuaQD = calculateHieuQuaQDFraction(totalRow.dtqd, totalRow.dtlk);
    for (const dept of deptMap.values()) {
        dept.hieuQuaQD = calculateHieuQuaQDFraction(dept.dtqd, dept.dtlk);
    }
    for (const emp of empMap.values()) {
        emp.hieuQuaQD = calculateHieuQuaQDFraction(emp.dtqd, emp.dtlk);
    }

    const rows: RevenueRow[] = [];
    if (totalRow.dtlk > 0 || totalRow.dtqd > 0) rows.push(totalRow);
    for (const dept of deptMap.values()) rows.push(dept);
    for (const emp of empMap.values()) rows.push(emp);

    return rows;
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
        const resolvedDept = isDept ? rawName : (employeeDepartmentMap[matchedFullName] || employeeDepartmentMap[rawName] || 'BP Tiếp đón');

        if (resolvedDept && isIgnoredDept(resolvedDept)) return;
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

            if (!department && namePart.includes(' - ')) {
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
        const department = match ? match.dept : 'BP ALL IN ONE - DMX';

        if (department && isIgnoredDept(department)) return;

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
