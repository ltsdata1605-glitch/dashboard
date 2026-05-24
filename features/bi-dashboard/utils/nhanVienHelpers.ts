
import { RevenueRow, CompetitionHeader, Criterion, InstallmentRow, InstallmentProvider, CrossSellingRow } from '../types/nhanVienTypes';
import { roundUp, parseNumber, normalizeText, shortenName } from '../../../utils/dataUtils';
import { calculateHieuQuaQDFraction, calculatePercentage } from '../../../services/metricService';
export { roundUp, parseNumber, normalizeText, shortenName };

export const formatEmployeeName = (fullName: string): string => {
    const nameParts = fullName.split(' - ');
    if (nameParts.length < 2) return fullName;
    
    const name = nameParts[0].trim();
    const id = nameParts[1].trim();
    
    const words = name.split(/\s+/).filter(Boolean);
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
    
    const empMap = new Map<string, RevenueRow>();
    const deptMap = new Map<string, RevenueRow>();
    const totalRow: RevenueRow = { type: 'total', name: 'Tổng', dtlk: 0, dtqd: 0, hieuQuaQD: 0, soLuong: 0, donGia: 0 };
    let currentDeptDS = '';
    
    const isValidEmployeeName = (name: string) => {
        if (!name.includes(' - ')) return false;
        const parts = name.split(' - ');
        return /^\d+$/.test(parts[0].trim()) || /^\d+$/.test(parts[1].trim());
    };

    for (const line of String(danhSachData).split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split('\t');
        const name = parts[0]?.trim() || '';
        const dtlkValue = parseNumber(parts[1]);
        const dtqdValue = parseNumber(parts[2]);
        
        if (name === 'Tổng') {
            totalRow.dtlk! += dtlkValue;
            totalRow.dtqd! += dtqdValue;
            totalRow.soLuong! += parseNumber(parts[4]);
            totalRow.donGia! += parseNumber(parts[5]);
        } else if (trimmed.startsWith('BP ') && parts.length > 1 && !isNaN(parseNumber(parts[1]))) {
            currentDeptDS = name;
            if (!isIgnoredDept(currentDeptDS)) {
                if (deptMap.has(name)) {
                    const existing = deptMap.get(name)!;
                    existing.dtlk! += dtlkValue;
                    existing.dtqd! += dtqdValue;
                } else {
                    deptMap.set(name, { type: 'department', name, dtlk: dtlkValue, dtqd: dtqdValue, hieuQuaQD: 0 });
                }
            }
        } else if (currentDeptDS && !isIgnoredDept(currentDeptDS) && isValidEmployeeName(name) && parts.length > 3) {
            if (empMap.has(name)) {
                const existing = empMap.get(name)!;
                existing.dtlk! += dtlkValue;
                existing.dtqd! += dtqdValue;
            } else {
                empMap.set(name, { type: 'employee', name: formatEmployeeName(name), originalName: name, department: currentDeptDS, dtlk: dtlkValue, dtqd: dtqdValue, hieuQuaQD: 0 });
            }
        }
    }
    
    totalRow.hieuQuaQD = calculateHieuQuaQDFraction(totalRow.dtqd!, totalRow.dtlk!);
    for (const dept of deptMap.values()) {
        dept.hieuQuaQD = calculateHieuQuaQDFraction(dept.dtqd!, dept.dtlk!);
    }
    for (const emp of empMap.values()) {
        emp.hieuQuaQD = calculateHieuQuaQDFraction(emp.dtqd!, emp.dtlk!);
    }
    
    const rows: RevenueRow[] = [];
    if (totalRow.dtlk! > 0 || totalRow.dtqd! > 0) rows.push(totalRow);
    for (const dept of deptMap.values()) rows.push(dept);
    for (const emp of empMap.values()) rows.push(emp);
    
    return rows;
};

export const parseCrossSellingData = (data: string, employeeDepartmentMap: Map<string, string>): CrossSellingRow[] => {
    if (!data) return [];
    const lines = String(data).split('\n');

    const normalizedEmployeeMap = new Map<string, string>();
    for (const fullName of employeeDepartmentMap.keys()) {
        const norm = normalizeText(fullName);
        normalizedEmployeeMap.set(norm, fullName);
    }

    const findFullName = (shortName: string) => {
        const normalizedShort = normalizeText(shortName);
        if (!normalizedShort) return null;
        const exactMatch = normalizedEmployeeMap.get(normalizedShort);
        if (exactMatch) return exactMatch;
        for (const [normFull, fullName] of normalizedEmployeeMap.entries()) {
            if (normFull.startsWith(normalizedShort + " - ")) return fullName;
        }
        return null;
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
            if (originalName) department = employeeDepartmentMap.get(originalName);
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

export const parseInstallmentData = (traGopData: string, employeeDepartmentMap: Map<string, string>): InstallmentRow[] => {
    if (!traGopData) return [];
    const lines = String(traGopData).split('\n').map(l => l.trim()).filter(l => l);

    const totalLine = lines.find(l => l.startsWith('Tổng\t') || l === 'Tổng' || l.startsWith('Tổng cộng\t'));
    if (!totalLine) return [];
    
    const totalParts = totalLine.split('\t');
    const numProviders = Math.floor((totalParts.length - 3) / 2);

    const providerMapping: Record<string, string> = {
        'HomeCredit': 'HC', 'FECredit': 'FE', 'Shinhan': 'SHF', 'SMARTPOS': 'POS', 'HPL': 'HPL', 
        'KREDIVO': 'KRE', 'Samsung': 'SSF', 'TPBANK': 'TPB', 'PAYLATER': 'MWG', 'EVO': 'EVO'
    };

    let collectedNames: string[] = [];
    const keywords = Object.keys(providerMapping);
    
    lines.forEach(l => {
        if (collectedNames.length >= numProviders) return;
        if (keywords.some(k => l.toUpperCase().includes(k.toUpperCase())) && !/\t\d+/.test(l)) {
            const parts = l.split('\t');
            parts.forEach(p => {
                const name = p.trim();
                if (name && keywords.some(k => name.toUpperCase().includes(k.toUpperCase())) && !collectedNames.includes(name)) {
                    if (collectedNames.length < numProviders) collectedNames.push(name);
                }
            });
        }
    });

    const detectedProviders = Array.from({ length: numProviders }).map((_, i) => {
        const fullName = collectedNames[i] || 'Khác';
        let short = fullName;
        for (const [key, val] of Object.entries(providerMapping)) {
            if (fullName.toUpperCase().includes(key.toUpperCase())) { short = val; break; }
        }
        return { name: fullName, short };
    });

    const normalizedEmployeeMap = new Map<string, string>();
    for (const fullName of employeeDepartmentMap.keys()) {
        const norm = normalizeText(fullName);
        normalizedEmployeeMap.set(norm, fullName);
    }

    const findFullName = (shortName: string) => {
        const normalizedShort = normalizeText(shortName);
        if (!normalizedShort) return null;
        const exactMatch = normalizedEmployeeMap.get(normalizedShort);
        if (exactMatch) return exactMatch;
        for (const [normFull, fullName] of normalizedEmployeeMap.entries()) {
            if (normFull.startsWith(normalizedShort + " - ")) return fullName;
        }
        return null;
    };

    const empMap = new Map<string, InstallmentRow>();
    const deptMap = new Map<string, InstallmentRow>();
    const totalRow: InstallmentRow = {
        type: 'total', name: 'TỔNG CỘNG', originalName: 'Tổng',
        department: undefined, providers: [], totalDtSieuThi: 0, totalPercent: 0
    };

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 3) continue;

        const rawName = parts[0]?.trim() || '';
        const isTotal = rawName === 'Tổng' || rawName === 'Tổng cộng';
        const isDept = rawName.startsWith('BP ');
        
        let originalName = isTotal ? 'Tổng' : (isDept ? rawName : findFullName(rawName));
        if (!originalName) continue;

        const resolvedDept = isDept ? rawName : employeeDepartmentMap.get(originalName);
        if (resolvedDept && isIgnoredDept(resolvedDept)) continue;
        if (isDept && isIgnoredDept(rawName)) continue;

        const totalDtSieuThi = parseNumber(parts[parts.length - 2]);

        const providers: InstallmentProvider[] = [];
        for (let i = 0; i < detectedProviders.length; i++) {
            const dtCol = 1 + i * 2;
            providers.push({
                name: detectedProviders[i].name,
                shortName: detectedProviders[i].short,
                dt: parseNumber(parts[dtCol]),
                percent: 0 // Will be recalculated
            });
        }

        const updateRow = (target: InstallmentRow) => {
            target.totalDtSieuThi! += totalDtSieuThi;
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
            updateRow(totalRow);
        } else if (isDept) {
            if (!deptMap.has(rawName)) {
                deptMap.set(rawName, {
                    type: 'department', name: rawName, originalName: rawName, department: rawName,
                    providers: [], totalDtSieuThi: 0, totalPercent: 0
                });
            }
            updateRow(deptMap.get(rawName)!);
        } else {
            if (!empMap.has(originalName)) {
                empMap.set(originalName, {
                    type: 'employee', name: formatEmployeeName(originalName), originalName: originalName, department: resolvedDept,
                    providers: [], totalDtSieuThi: 0, totalPercent: 0
                });
            }
            updateRow(empMap.get(originalName)!);
        }
    }

    const calcPct = (target: InstallmentRow) => {
        let sumPct = 0;
        target.providers.forEach(p => {
            p.percent = calculatePercentage(p.dt, target.totalDtSieuThi!);
            sumPct += p.percent;
        });
        target.totalPercent = sumPct;
    };

    calcPct(totalRow);
    deptMap.forEach(calcPct);
    empMap.forEach(calcPct);

    const rows: InstallmentRow[] = [];
    if (totalRow.totalDtSieuThi! > 0) rows.push(totalRow);
    deptMap.forEach(dept => rows.push(dept));
    empMap.forEach(emp => rows.push(emp));

    return rows;
};

export const parseCompetitionData = (thiDuaData: string, employeeDepartmentMap: Map<string, string>): Record<Criterion, { headers: CompetitionHeader[], employees: any[] }> => {
    const emptyResult: Record<Criterion, { headers: CompetitionHeader[], employees: any[] }> = { DTLK: { headers: [], employees: [] }, DTQĐ: { headers: [], employees: [] }, SLLK: { headers: [], employees: [] } };
    if (!thiDuaData) return emptyResult;
    const lines = thiDuaData.split('\n').filter(line => line.trim() !== '');
    const metricsRowIndex = lines.findIndex(l => { const parts = l.split('\t').map(p => p.trim().toUpperCase()); return parts.some(p => ['DTLK', 'DTQĐ', 'SLLK', 'SL REALTIME'].includes(p)); });
    if (metricsRowIndex === -1) return emptyResult;
    const phongBanIndex = lines.findIndex(l => l.toLowerCase().includes('phòng ban'));
    if (phongBanIndex === -1 || phongBanIndex >= metricsRowIndex) return emptyResult;
    const titles = lines.slice(phongBanIndex + 1, metricsRowIndex).map(t => t.trim());
    const metrics = lines[metricsRowIndex].trim().split('\t');
    const allHeaders: CompetitionHeader[] = [];
    const count = Math.min(titles.length, metrics.length);
    for (let i = 0; i < count; i++) {
        const metricRaw = metrics[i]?.trim().toUpperCase();
        let metric = '';
        if (metricRaw === 'DTLK') metric = 'DTLK'; else if (metricRaw === 'DTQĐ') metric = 'DTQĐ'; else if (metricRaw === 'SLLK' || metricRaw === 'SL REALTIME') metric = 'SLLK';
        if (metric) allHeaders.push({ title: shortenName(titles[i] || `Unnamed ${i}`), originalTitle: titles[i], metric });
    }
    const result: Record<Criterion, { headers: CompetitionHeader[], employees: any[] }> = {
        DTLK: { headers: allHeaders.filter(h => h.metric === 'DTLK'), employees: [] },
        DTQĐ: { headers: allHeaders.filter(h => h.metric === 'DTQĐ'), employees: [] },
        SLLK: { headers: allHeaders.filter(h => h.metric === 'SLLK'), employees: [] },
    };
    
    // Cấu trúc mới để lưu thông tin nhân viên kèm bộ phận
    const employeeData = new Map<string, { 
        department: string, 
        originalName: string, 
        values: { [key in Criterion]: (number | null)[] } 
    }>();
    
    let currentDeptFallback = 'BP Khác';

        // O(1) Cache cho bảng thi đua
    const fastDeptMap = new Map<string, {orig: string, dept: string}>();
    for (const [fullName, dept] of employeeDepartmentMap.entries()) {
        fastDeptMap.set(normalizeText(fullName), {orig: fullName, dept});
    }

    for (const line of lines.slice(metricsRowIndex + 1)) {
        const parts = line.split('\t');
        const namePart = parts[0]?.trim();
        if (!namePart) continue;

        // Cập nhật bộ phận hiện tại nếu gặp dòng BP
        if (namePart.startsWith('BP ')) {
            currentDeptFallback = namePart;
        }

        const normalizedName = normalizeText(namePart);
        let matchedOriginalName = "";
        let department = "";
        
        // 1. Tìm O(1) trong map doanh thu
        const match = fastDeptMap.get(normalizedName);
        if (match) {
            matchedOriginalName = match.orig;
            department = match.dept;
        }

        // 2. Nếu không có trong map nhưng là dòng nhân viên (có dấu -), dùng bộ phận fallback vừa quét được
        if (!department && namePart.includes(' - ')) {
            department = currentDeptFallback;
            matchedOriginalName = namePart;
        }

        // 3. Xử lý dòng Tổng hoặc dòng BP
        if (!department) {
            if (namePart === 'Tổng') department = 'Tổng';
            else if (namePart.startsWith('BP ')) department = namePart;
            else continue; // Bỏ qua nếu không xác định được gì
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
    
    // Đổ dữ liệu từ Map vào kết quả cuối cùng
    employeeData.forEach((data, name) => {
        Object.keys(result).forEach(key => { 
            const criterion = key as Criterion; 
            result[criterion].employees.push({ 
                name, 
                originalName: data.originalName, 
                department: data.department, 
                values: data.values[criterion] 
            }); 
        });
    });
    return result;
};
