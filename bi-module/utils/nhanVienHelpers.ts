
import { RevenueRow, CompetitionHeader, Criterion, InstallmentRow, InstallmentProvider, CrossSellingRow } from '../types/nhanVienTypes';

export const roundUp = (num: number): number => Math.ceil(num);

export const parseNumber = (str: string | undefined): number => {
    if (!str) return 0;
    // Xử lý dấu phẩy hàng ngàn và phần trăm
    const cleaned = String(str).replace(/,/g, '').replace('%', '').trim();
    return parseFloat(cleaned) || 0;
};

export const normalizeText = (text: string): string => {
    return text ? text.normalize("NFC").trim() : "";
};

export const shortenName = (name: string, overrides: Record<string, string> = {}): string => {
    if (overrides && overrides[name]) return overrides[name];
    const rules: { [key: string]: string } = {
        'Thi đua Iphone 17 series': 'IPHONE 17',
        'BÁN HÀNG PANASONIC': 'Panasonic',
        'Tủ lạnh, tủ đông, tủ mát': 'Tủ lạnh/đông/mát',
        'BÁN HÀNG ĐIỆN TỬ & ĐIỆN LẠNH HÃNG SAMSUNG': 'Samsung ĐT/ĐL',
        'NH MÁY GIẶT, SẤY': 'Máy giặt/sấy',
        'TRẢ CHẬM FECREDIT, TPBANK EVO': 'FE/TPB',
        'PHỤ KIỆN - ĐỒNG HỒ': 'PK - Đồng hồ',
        'ĐIỆN THOẠI & TABLET ANDROID TRÊN 7 TRIỆU': 'Android > 7Tr',
        'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG': 'Nạp/Rút NH',
        'Thi đua Vivo': 'Vivo',
        'Thi đua Realme': 'Realme',
        'Đồng hồ thời trang': 'ĐH thời trang',
        'VÍ TRẢ SAU': 'Ví',
        'HOMECREDIT': 'HC',
        'TIỀN MẶT CAKE': 'Cake',
    };
    if (rules[name]) return rules[name];
    if (name.startsWith('BÁN HÀNG ')) return name.replace('BÁN HÀNG ', '').split(' ')[0];
    return name;
};

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

export const parseRevenueData = (danhSachData: string): RevenueRow[] => {
    if (!danhSachData) return [];
    const rows: RevenueRow[] = [];
    let currentDeptDS = '';
    for (const line of String(danhSachData).split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split('\t');
        const name = parts[0]?.trim() || '';
        const dtlkValue = parseNumber(parts[1]);
        const dtqdValue = parseNumber(parts[2]);
        const hqqdCalculated = dtlkValue > 0 ? (dtqdValue / dtlkValue) - 1 : 0;
        if (name === 'Tổng') {
            rows.push({ type: 'total', name, dtlk: dtlkValue, dtqd: dtqdValue, hieuQuaQD: hqqdCalculated, soLuong: parseNumber(parts[4]), donGia: parseNumber(parts[5]) });
        } else if (trimmed.startsWith('BP ') && parts.length > 1 && !isNaN(parseNumber(parts[1]))) {
            currentDeptDS = name;
            rows.push({ type: 'department', name, dtlk: dtlkValue, dtqd: dtqdValue, hieuQuaQD: hqqdCalculated });
        } else if (currentDeptDS && name.includes(' - ') && parts.length > 3) {
            rows.push({ type: 'employee', name: formatEmployeeName(name), originalName: name, department: currentDeptDS, dtlk: dtlkValue, dtqd: dtqdValue, hieuQuaQD: hqqdCalculated });
        }
    }
    return rows;
};

export const parseCrossSellingData = (data: string, employeeDepartmentMap: Map<string, string>): CrossSellingRow[] => {
    if (!data) return [];
    const rows: CrossSellingRow[] = [];
    const lines = String(data).split('\n');

    const findFullName = (shortName: string) => {
        const normalizedShort = normalizeText(shortName);
        if (!normalizedShort) return null;
        for (const fullName of employeeDepartmentMap.keys()) {
            const normalizedFull = normalizeText(fullName);
            if (normalizedFull === normalizedShort || normalizedFull.startsWith(normalizedShort + " - ")) return fullName;
        }
        return null;
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

        rows.push({
            type: isTotal ? 'total' : (isDept ? 'department' : 'employee'),
            name: isTotal ? 'Tổng cộng' : (isDept ? rawName : formatEmployeeName(originalName)),
            originalName: isTotal ? 'Tổng' : originalName,
            department: department,
            dtlk: parseNumber(parts[1]),
            billBk: parseNumber(parts[4]),
            pctBillBk: parseNumber(parts[5]),
            billMngn: parseNumber(parts[6]),
            pctBillMngn: parseNumber(parts[7]),
            totalBill: parseNumber(parts[8]),
            slBk: parseNumber(parts[10]),
            pctSpBk: parseNumber(parts[11]),
            slMngn: parseNumber(parts[12]),
            pctSpMngn: parseNumber(parts[13]),
            totalSl: parseNumber(parts[14])
        });
    }
    return rows;
};

export const parseInstallmentData = (traGopData: string, employeeDepartmentMap: Map<string, string>): InstallmentRow[] => {
    if (!traGopData) return [];
    const rows: InstallmentRow[] = [];
    const lines = String(traGopData).split('\n').map(l => l.trim()).filter(l => l);

    // Xác định cấu trúc dựa trên hàng Tổng (luôn có đầy đủ dữ liệu nhất)
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
        const fullName = collectedNames[i] || `Đối tác ${i + 1}`;
        let short = fullName;
        for (const [key, val] of Object.entries(providerMapping)) {
            if (fullName.toUpperCase().includes(key.toUpperCase())) { short = val; break; }
        }
        return { name: fullName, short };
    });

    const findFullName = (shortName: string) => {
        const normalizedShort = normalizeText(shortName);
        if (!normalizedShort) return null;
        for (const fullName of employeeDepartmentMap.keys()) {
            const normalizedFull = normalizeText(fullName);
            if (normalizedFull === normalizedShort || normalizedFull.startsWith(normalizedShort + " - ")) return fullName;
        }
        return null;
    };

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 3) continue;

        const rawName = parts[0]?.trim() || '';
        const isTotal = rawName === 'Tổng' || rawName === 'Tổng cộng';
        const isDept = rawName.startsWith('BP ');
        
        let originalName = isTotal ? 'Tổng' : (isDept ? rawName : findFullName(rawName));
        if (!originalName) continue;

        const totalPercent = parseNumber(parts[parts.length - 1]);
        const totalDtSieuThi = parseNumber(parts[parts.length - 2]);

        const providers: InstallmentProvider[] = [];
        for (let i = 0; i < detectedProviders.length; i++) {
            const dtCol = 1 + i * 2;
            const pctCol = 2 + i * 2;
            providers.push({
                name: detectedProviders[i].name,
                shortName: detectedProviders[i].short,
                dt: parseNumber(parts[dtCol]),
                percent: parseNumber(parts[pctCol])
            });
        }

        rows.push({
            type: isTotal ? 'total' : (isDept ? 'department' : 'employee'),
            name: isTotal ? 'TỔNG CỘNG' : (isDept ? rawName : formatEmployeeName(originalName)),
            originalName: originalName,
            department: isDept ? rawName : employeeDepartmentMap.get(originalName),
            providers,
            totalDtSieuThi,
            totalPercent
        });
    }
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
        
        // 1. Tìm trong map doanh thu (độ chính xác cao nhất)
        for (const [fullName, dept] of employeeDepartmentMap.entries()) { 
            if (normalizeText(fullName) === normalizedName) { 
                matchedOriginalName = fullName; 
                department = dept; 
                break; 
            } 
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
        
        const formattedName = namePart === 'Tổng' ? 'Tổng' : formatEmployeeName(matchedOriginalName || namePart);
        
        if (!employeeData.has(formattedName)) {
            employeeData.set(formattedName, { 
                department: department,
                originalName: matchedOriginalName || namePart,
                values: { DTLK: [], DTQĐ: [], SLLK: [] }
            });
        }
        
        const record = employeeData.get(formattedName)!;
        allHeaders.forEach((header, index) => { 
            const val = parseNumber(parts[index + 1]); 
            record.values[header.metric as Criterion].push(val > 0 ? val : null); 
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
