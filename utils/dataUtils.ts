
import type { DataRow, SummaryTableNode, ProductConfig } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP, DEFAULT_QUANTITY_MULTIPLIER_MAP, PRODUCT_NAME_COEFFICIENTS } from '../constants';

// Tailwind safelist (implementation_plan.md mục 61) — viền dưới 3px đổi màu theo nhóm cột ở
// nhiều bảng biểu khắp dự án được ghép ĐỘNG qua template literal (vd `border-b-${colorName}-400`)
// thay vì viết literal đầy đủ ở từng nơi. Tailwind v4 quét TEXT TĨNH trong source để sinh CSS —
// không chạy JS nên không tự suy luận được giá trị biến runtime. File này (utils/dataUtils.ts)
// là 1 trong số ít file dùng chung CẢ 4 khu vực nên chắc chắn luôn nằm trong phạm vi quét, đảm
// bảo các class dưới đây LUÔN được sinh CSS dù nơi dùng ghép chuỗi động không có literal đầy đủ:
// border-b-sky-400 border-b-emerald-400 border-b-amber-400 border-b-rose-400 border-b-indigo-400 border-b-slate-400
// !border-b-sky-400 !border-b-emerald-400 !border-b-amber-400 !border-b-rose-400 !border-b-indigo-400 !border-b-slate-400


const BORDER_ACCENT_FAMILIES = ['sky', 'emerald', 'amber', 'rose', 'indigo', 'slate'] as const;

/**
 * Suy ra viền dưới 3px đổi màu theo nhóm cột (implementation_plan.md mục 61) từ 1 class Tailwind
 * bg-{màu}-... hoặc text-{màu}-... đã có sẵn ở component — dùng khi nơi gọi chưa lưu riêng field
 * `border` song song với bg/text. Chỉ nhận diện đúng 6 họ màu semantic đã duyệt (CLAUDE.md), mặc
 * định `slate` (trung tính) nếu không khớp — không tự suy ra màu ngoài bảng màu chuẩn.
 */
export function getBorderAccentFromColorClass(colorClass: string): string {
    for (const family of BORDER_ACCENT_FAMILIES) {
        if (colorClass.includes(`-${family}-`)) return `border-b-${family}-400`;
    }
    return 'border-b-slate-400';
}

const columnCache = new Map<string, string>();
const normalizeCache = new Map<string, string>();

// any: val là giá trị ô Excel/DataRow thô (string/number/Date/boolean...), dùng ở hàng nghìn call site — không đổi kiểu tham số/trả về
export const cleanAndNormalize = (val: any): string => {
    if (val === undefined || val === null) return '';
    const raw = val.toString().trim();
    let cached = normalizeCache.get(raw);
    if (!cached) {
        cached = raw.toLowerCase().normalize('NFC');
        normalizeCache.set(raw, cached);
    }
    return cached;
};

// Bản chuẩn hoá (cleanAndNormalize) của 3 Set hình thức xuất tĩnh trong constants.ts — dùng làm
// fallback phân loại tra_gop/tien_mat/thu_ho khi CHƯA có productConfig.htxClassification (chưa
// upload Config Excel). Trước đây fallback so khớp chuỗi tuyệt đối (case/khoảng trắng nhạy cảm),
// khiến đơn trả góp có thể âm thầm không được cộng +30% nếu dữ liệu thật lệch hoa/thường so với
// danh sách hardcode. Tính 1 lần khi module load vì 3 Set nguồn là hằng số không đổi lúc runtime.
const normalizedTraGopSet = new Set(Array.from(HINH_THUC_XUAT_TRA_GOP).map(v => cleanAndNormalize(v)));
const normalizedTienMatSet = new Set(Array.from(HINH_THUC_XUAT_TIEN_MAT).map(v => cleanAndNormalize(v)));
// Export để mọi nơi tính "doanh thu hợp lệ" (loại trừ thu hộ) dùng chung 1 bản đã chuẩn hoá,
// thay vì so khớp trực tiếp với HINH_THUC_XUAT_THU_HO (nhạy hoa/thường, khoảng trắng).
export const normalizedThuHoSet = new Set(Array.from(HINH_THUC_XUAT_THU_HO).map(v => cleanAndNormalize(v)));

// any: trả về giá trị ô thô của DataRow (string/number/Date/...) — hàm lõi được gọi ở hàng trăm nơi khắp 4 khu vực, đổi kiểu trả về sẽ vỡ diện rộng ngoài phạm vi utils/
export function getRowValue(row: DataRow, keys: string[]): any {
    if (!row) return undefined;

    // Check cache
    const cacheKey = keys[0];
    const cachedField = columnCache.get(cacheKey);
    if (cachedField !== undefined && cachedField in row) {
        return row[cachedField];
    }

    // 1. Direct match (fastest)
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) {
            columnCache.set(cacheKey, key);
            return row[key];
        }
    }
    // 2. NFC/NFD normalized case-insensitive match
    const normalizedKeys = keys.map(k => k.toLowerCase().normalize('NFC'));
    for (const rowKey of Object.keys(row)) {
        const normRowKey = rowKey.toLowerCase().normalize('NFC');
        if (normalizedKeys.includes(normRowKey)) {
            if (row[rowKey] !== undefined && row[rowKey] !== null) {
                columnCache.set(cacheKey, rowKey);
                return row[rowKey];
            }
        }
    }
    return undefined;
}

export function toLocalISOString(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// any: dữ liệu ngày tháng thô từ Excel (Date | number serial | string định dạng khác nhau)
export function parseExcelDate(excelDate: any): Date | null {
    if (excelDate instanceof Date && !isNaN(excelDate.getTime())) return excelDate;
    if (typeof excelDate === 'number') {
        return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    }
    if (typeof excelDate === 'string') {
        // Match dd/MM/yyyy or dd-MM-yyyy with optional time (e.g., dd/MM/yyyy HH:mm:ss)
        const match = excelDate.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // 0-indexed
            let year = parseInt(match[3], 10);
            if (year < 100) year += 2000;
            const hour = match[4] ? parseInt(match[4], 10) : 0;
            const minute = match[5] ? parseInt(match[5], 10) : 0;
            const second = match[6] ? parseInt(match[6], 10) : 0;

            const date = new Date(year, month, day, hour, minute, second);
            if (!isNaN(date.getTime())) return date;
        }

        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

export function abbreviateName(fullName: string | number | null | undefined): string {
    if (!fullName) return '';
    const strName = String(fullName);

    // Regex updated to handle:
    // 1. Digits at start (ID)
    // 2. Separator: dash, en-dash, dot, OR just whitespace
    // 3. Name part
    const match = strName.match(/^(\d+)(?:\s*[-–.]\s*|\s+)(.+)$/);

    if (!match) return strName;

    const id = match[1].trim();
    const name = match[2].trim();

    if (!name) return id;

    const words = name.split(/\s+/);
    const lastName = words[words.length - 1];

    // Logic lấy chữ cái đệm:
    // Tên 3 chữ trở lên (Chế Thị Út) -> Lấy chữ kế cuối (Thị -> T)
    // Tên 2 chữ (Nguyễn Văn) -> Lấy chữ đầu (Nguyễn -> N)
    // Tên 1 chữ -> Giữ nguyên

    let initial = '';
    if (words.length > 2) {
        // Lấy chữ cái đầu của từ kế cuối
        initial = words[words.length - 2].charAt(0).toUpperCase();
    } else if (words.length === 2) {
        // Lấy chữ cái đầu của từ đầu tiên
        initial = words[0].charAt(0).toUpperCase();
    }

    if (initial) {
        return `${id} - ${initial}.${lastName}`;
    }

    return `${id} - ${name}`;
}

export function formatCurrency(number: number | null | undefined, precision = 0): string {
    if (number === null || number === undefined || isNaN(number) || number === 0) return '-';
    // Ensure it's a number
    const val = Number(number);
    if (isNaN(val)) return '-';

    if (Math.abs(val) >= 1000000000) return `${(val / 1000000000).toFixed(1).replace(/\.0$/, '')} Tỷ`;
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(precision).replace(/\.0$/, '')} Tr`;
    if (Math.abs(val) >= 1000) return `${Math.round(val / 1000)} K`;
    return val.toLocaleString('vi-VN');
}

export function formatRevenueForHeadToHead(value: number | undefined): string {
    if (value === undefined || isNaN(value) || value === 0) return '-';
    const roundedValue = Math.round(value / 1000000);
    return roundedValue.toLocaleString('vi-VN');
}

export function formatQuantity(value: number | null | undefined): string {
    if (value == null || isNaN(value) || value === 0) return '-';
    return value.toLocaleString('vi-VN');
}

export function formatQuantityWithFraction(value: number | null | undefined): string {
    if (value == null || isNaN(value) || value === 0) return '-';
    return value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}


// Cache kết quả getHeSoQuyDoi theo đúng object productConfig đang dùng (WeakMap tự giải
// phóng khi config đổi, ví dụ sau Background Sheet Check nạp bản mới — không cần tự tay
// invalidate). Dữ liệu doanh số điện máy thực tế có rất nhiều dòng trùng
// tên/mã/ngành/nhóm sản phẩm (cùng 1 SKU bán lặp lại hàng nghìn lần), nên cache theo tổ
// hợp 4 input tránh phải lặp lại 2 vòng lặp .includes() (109 pattern) cho mỗi dòng trùng.
// KHÔNG đổi bất kỳ logic/kết quả nào so với bản gốc — xem test đối chiếu
// `_perf_test_getHeSoQuyDoi.ts` (35 kịch bản, chạy trước/sau khi thêm cache đều pass).
const heSoQuyDoiCache = new WeakMap<NonNullable<ProductConfig>, Map<string, number>>();

export function getHeSoQuyDoi(maNganhHang: string, maNhomHang: string, productConfig: ProductConfig | null, productName?: string, productCode?: string): number {
    if (!productConfig) {
        return computeHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
    }
    let cache = heSoQuyDoiCache.get(productConfig);
    if (!cache) {
        cache = new Map();
        heSoQuyDoiCache.set(productConfig, cache);
    }
    const cacheKey = `${productCode ?? ''}|${maNganhHang ?? ''}|${maNhomHang ?? ''}|${productName ?? ''}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const result = computeHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
    cache.set(cacheKey, result);
    return result;
}

function computeHeSoQuyDoi(maNganhHang: string, maNhomHang: string, productConfig: ProductConfig | null, productName?: string, productCode?: string): number {
    // 0. Logic đặc thù cho Vieon dựa trên mã sản phẩm hoặc tên sản phẩm (Ưu tiên cao nhất)
    if (productCode) {
        const trimmedCode = String(productCode).trim();
        if (productConfig?.quantityMultiplierMap?.[trimmedCode] !== undefined) {
            return productConfig.quantityMultiplierMap[trimmedCode];
        }
        if (DEFAULT_QUANTITY_MULTIPLIER_MAP[trimmedCode] !== undefined) {
            return DEFAULT_QUANTITY_MULTIPLIER_MAP[trimmedCode];
        }
    }

    const name = (productName || '').toString().trim();

    // Dò tìm hệ số theo Tên sản phẩm từ cấu hình Vas tải từ Google Sheet
    if (productConfig?.vasNameMultiplierMap) {
        if (productConfig.vasNameMultiplierMap[name] !== undefined) {
            return productConfig.vasNameMultiplierMap[name];
        }
        for (const [pattern, val] of Object.entries(productConfig.vasNameMultiplierMap)) {
            if (name.includes(pattern)) {
                return val;
            }
        }
    }

    // Dò tìm hệ số theo Tên sản phẩm từ cấu hình cứng cũ (Fallback nếu chưa tải được cấu hình từ sheet)
    for (const item of PRODUCT_NAME_COEFFICIENTS) {
        if (name.includes(item.pattern)) {
            return item.value;
        }
    }

    if (name.includes('VieON VIP')) {
        if (name.includes('01 tháng')) return 1;
        if (name.includes('03 tháng')) return 2;
        if (name.includes('06 tháng')) return 4;
        return 1;
    }

    const parentGroup = getParentGroup(maNhomHang, productConfig);

    // Priority 1: Use parent group from config file for primary categories
    if (parentGroup) {
        switch (parentGroup) {
            case 'Phụ kiện': return 3.37;
            case 'Wearable':
            case 'Đồng hồ': return 3.0;
            case 'Laptop': return 1.2;
            case 'Tablet': return 1.2;
            case 'Gia dụng': return 1.85;
            case 'Sim': return 5.45;
            case 'Bảo hiểm':
            case 'Bảo Dưỡng':
            case 'Bảo hiểm ĐMX': return 4.18;
            case 'IT': return 2.0;
            case 'Thẻ cào':
            case 'ICT': // Smartphones are in here
            case 'CE': // Tivi, etc.
                return 1.0;
            default:
                break;
        }
    }

    // Priority 2: Fallback to old logic for compatibility or items not in config
    if (maNganhHang && maNganhHang.includes('Thẻ cào')) return 1.0;
    if (maNganhHang === '164 - VAS' && (maNhomHang === '4479 - Dịch Vụ Bảo Hiểm' || maNhomHang === '4499 - Thu Hộ Phí Bảo Hiểm')) return 4.18;
    if (maNganhHang === '304 - Điện tử' && maNhomHang === '880 - Loa Karaoke') return 1.29;

    switch (maNganhHang) {
        case '664 - Sim Online': return 5.45;
        case '16 - Phụ kiện tiện ích':
        case '184 - Phụ kiện trang trí':
        case '764 - Loa vi tính': return 3.37;
        case '23 - Wearable':
        case '1274 - Đồng Hồ Thời Trang': return 3.0;
        case '364 - IT': return 2.0;
        case '1034 - Dụng cụ nhà bếp': return 1.92;
        case '1116 - Máy lọc nước':
        case '484 - Điện gia dụng':
        case '1214 - Gia dụng lắp đặt': return 1.85;
        case '22 - Laptop':
        case '244 - Tablet': return 1.2;
        default: return 1.0;
    }
}

export function sortSummaryData(data: { [key: string]: SummaryTableNode }, sortKey: string, sortDir: 'asc' | 'desc'): { [key: string]: SummaryTableNode } {
    const sortFn = (a: [string, SummaryTableNode], b: [string, SummaryTableNode]) => {
        const nodeA = a[1];
        const nodeB = b[1];
        let valA, valB;

        switch (sortKey) {
            case 'aov':
                valA = nodeA.totalQuantity > 0 ? nodeA.totalRevenue / nodeA.totalQuantity : 0;
                valB = nodeB.totalQuantity > 0 ? nodeB.totalRevenue / nodeB.totalQuantity : 0;
                break;
            case 'traGopPercent':
                valA = nodeA.totalRevenue > 0 ? (nodeA.totalTraGop / nodeA.totalRevenue) * 100 : 0;
                valB = nodeB.totalRevenue > 0 ? (nodeB.totalTraGop / nodeB.totalRevenue) * 100 : 0;
                break;
            default:
                valA = nodeA[sortKey as keyof SummaryTableNode] || 0;
                valB = nodeB[sortKey as keyof SummaryTableNode] || 0;
        }

        if (valA === valB) return 0;
        const result = (valA < valB) ? -1 : 1;
        return sortDir === 'asc' ? result : -result;
    };

    const sortedEntries = Object.entries(data).sort(sortFn);
    const sortedData = Object.fromEntries(sortedEntries);

    return sortedData;
}

export function getHinhThucThanhToan(row: DataRow, productConfig?: ProductConfig | null): 'tra_gop' | 'tien_mat' | 'thu_ho' | 'khac' {
    const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT);
    if (!hinhThucXuat) return 'khac';
    
    if (productConfig && productConfig.htxClassification) {
        const key = cleanAndNormalize(hinhThucXuat);
        if (productConfig.htxClassification[key] !== undefined) {
            return productConfig.htxClassification[key];
        }
    }
    
    // Fallback to static config — so khớp đã chuẩn hoá (không nhạy hoa/thường/khoảng trắng)
    const normalizedHtx = cleanAndNormalize(hinhThucXuat);
    if (normalizedTraGopSet.has(normalizedHtx)) return 'tra_gop';
    if (normalizedTienMatSet.has(normalizedHtx)) return 'tien_mat';
    if (normalizedThuHoSet.has(normalizedHtx)) return 'thu_ho';
    return 'khac';
}

export const getDisplayParentGroup = (maNhomHang: string, productConfig: ProductConfig): string => {
    const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
    const childGroup = productConfig.childToSubgroupMap[maNhomHang];

    if (parentGroup === 'ICT' && ['Smartphone', 'Laptop', 'Tablet'].includes(childGroup)) {
        return childGroup;
    }
    if (parentGroup === 'Gia dụng' && childGroup === 'Máy lọc nước') {
        return 'Máy lọc nước';
    }
    return parentGroup;
};

export function getExportFilenamePrefix(khoFilter: string | string[]): string {
    const khoArray = Array.isArray(khoFilter) ? khoFilter : (khoFilter ? [khoFilter] : []);
    const khosStr = (khoArray.length > 0 && !khoArray.includes('all')) ? khoArray.join('_') : 'Tat-ca-khu-vuc';
    return `[${khosStr.toUpperCase()}]`;
}

export const roundUp = (num: number): number => {
    if (num > -1e-9 && num < 0) {
        return 0;
    }
    return Math.ceil(num);
};

export const parseNumber = (str: unknown): number => {
    if (str === null || str === undefined || str === '') return 0;
    if (typeof str === 'number') return str;

    let cleaned = String(str).replace(/[\s%,\+]/g, '');

    // Xử lý dấu phẩy ngàn (chuẩn VN): nếu có chấm phân cách phần ngàn
    if (cleaned.indexOf('.') !== cleaned.lastIndexOf('.') || /\.\d{3}($|\.)/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '');
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

export const normalizeText = (text: string): string => {
    return text ? text.normalize("NFC").trim() : "";
};

export const shortenName = (name: string, overrides: Record<string, string> = {}): string => {
    if (!name) return '';
    if (overrides && overrides[name]) return overrides[name];

    const rules: { [key: string]: string } = {
        'Thi đua Iphone 17 series': 'IPHONE 17',
        'BÁN HÀNG PANASONIC': 'Panasonic',
        'Tủ lạnh, tủ đông, tủ mát': 'Tủ lạnh/đông/mát',
        'BÁN HÀNG ĐIỆN TỬ & ĐIỆN LẠNH HÃNG SAMSUNG': 'Samsung ĐT/ĐL',
        'NH MÁY GIẶT, SẤY': 'Máy giặt/sấy',
        'TRẢ CHẬM FECREDIT, TPBANK EVO': 'FE/TPB',
        'PHỤ KIỆN - SIM - ĐỒNG HỒ': 'PK/Sim/ĐH',
        'ĐIỆN THOẠI & TABLET ANDROID TRÊN 7 TRIỆU': 'Android > 7Tr',
        'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG': 'Nạp/Rút NH',
        'Thi đua Vivo': 'Vivo',
        'Thi đua Realme': 'Realme',
        'Đồng hồ thời trang': 'ĐH thời trang',
        'VÍ TRẢ SAU': 'Ví',
        'HOMECREDIT': 'HC',
        'TIỀN MẶT CAKE': 'Cake',
        'Bảo hiểm': 'Bảo hiểm',
        'Gia dụng': 'Gia dụng',
        'Smartphone & Tablet Android': 'Android',
        'Doanh thu đồng hồ': 'DT Đồng hồ',
        'Máy giặt & Máy giặt đặc quyền': 'Máy giặt',
        'Điện thoại Vivo': 'Vivo',
        'Điện thoại Realme': 'Realme',
        'Máy Lạnh': 'Máy Lạnh',
        'Ví trả sau': 'Ví trả sau',
        'Bếp các loại': 'Bếp',
        'Nồi cơm': 'Nồi cơm',
        'Máy lọc nước': 'Máy lọc nước',
        'Camera': 'Camera',
        'MOBIFONE&VINAPHONE&SIM DMX': 'Mobi/Vina/Sim',
        'MOBIFONE&VINAPHONE&SIMDMX': 'Mobi/Vina/Sim',
        'MANGO PLUS + ICALLME': 'Mango/iCallme',
        'MANGO PLUS & ICALLME': 'Mango/iCallme',
        'THI ĐUA ĐIỆN GIA DỤNG': 'TĐ Gia Dụng',
        'THI ĐUA DỊCH VỤ': 'TĐ Dịch Vụ',
        'CE - THI ĐUA HÃNG': 'TĐ Hãng',
    };

    if (rules[name]) return rules[name];

    // Dynamic replacement for common long strings and separators
    let processed = name;
    const wordReplacements: Record<string, string> = {
        'MOBIFONE': 'Mobi',
        'VINAPHONE': 'Vina',
        'VIETTEL': 'Viettel',
        'SIM DMX': 'Sim',
        'SIMDMX': 'Sim',
        'MANGO PLUS': 'Mango',
        'ICALLME': 'iCallme',
        'PHỤ KIỆN': 'PK',
        'ĐỒNG HỒ': 'ĐH',
        'THI ĐUA': 'TĐ',
        'DOANH THU': 'DT',
        'TRẢ CHẬM': 'TC'
    };

    Object.keys(wordReplacements).forEach(word => {
        const regex = new RegExp(word, 'gi');
        processed = processed.replace(regex, wordReplacements[word]);
    });

    // Replace separators with slash
    processed = processed
        .replace(/\s*&\s*/g, '/')
        .replace(/\s*\+\s*/g, '/')
        .replace(/\s*-\s*/g, '/');

    processed = processed.replace(/\/+/g, '/').trim();

    if (processed !== name) {
        return processed;
    }

    if (name.toUpperCase().startsWith('BÁN HÀNG ')) {
        return name.replace(/BÁN HÀNG /i, '').split(' ')[0];
    }
    if (name.toUpperCase().includes('TRẢ CHẬM')) {
        return name.toUpperCase().replace('TRẢ CHẬM', '').trim();
    }
    return name;
};

export const shortenSupermarketName = (name: string): string => {
    if (!name || !name.includes(' - ')) return name;
    let shortName = name.split(' - ').pop()?.trim() || '';
    shortName = shortName.replace(/^(Thửa\s*)?\d+\s*/, '').replace(/Thử/g, '').trim();
    return shortName;
};

export function getParentGroup(maNhomHang: string | null | undefined, productConfig: ProductConfig | null): string {
    if (!maNhomHang || !productConfig || !productConfig.childToParentMap) return '';
    const key = String(maNhomHang).trim();

    // 1. Exact match
    if (productConfig.childToParentMap[key]) return productConfig.childToParentMap[key];

    // 2. Lowercase match
    const lowerKey = key.toLowerCase();
    if (productConfig.childToParentMap[lowerKey]) return productConfig.childToParentMap[lowerKey];

    // 3. ID match (e.g. "7161" from "7161 - Dịch vụ...")
    const idMatch = key.match(/^(\d+)/);
    if (idMatch && productConfig.childToParentMap[idMatch[1]]) {
        return productConfig.childToParentMap[idMatch[1]];
    }

    return '';
}

export function getSubgroup(maNhomHang: string | null | undefined, productConfig: ProductConfig | null): string {
    if (!maNhomHang || !productConfig || !productConfig.childToSubgroupMap) return '';
    const key = String(maNhomHang).trim();

    // 1. Exact match
    if (productConfig.childToSubgroupMap[key]) return productConfig.childToSubgroupMap[key];

    // 2. Lowercase match
    const lowerKey = key.toLowerCase();
    if (productConfig.childToSubgroupMap[lowerKey]) return productConfig.childToSubgroupMap[lowerKey];

    // 3. ID match (e.g. "7161" from "7161 - Dịch vụ...")
    const idMatch = key.match(/^(\d+)/);
    if (idMatch && productConfig.childToSubgroupMap[idMatch[1]]) {
        return productConfig.childToSubgroupMap[idMatch[1]];
    }

    return '';
}

export function normalizeSalesData(data: DataRow[]): DataRow[] {
    if (!data) return [];

    const result: (DataRow & { parsedDate: Date })[] = [];

    for (let i = 0, len = data.length; i < len; i++) {
        const row = data[i];
        const rawDate = row.parsedDate;

        // Fast path — dữ liệu đọc lại từ IndexedDB (đã tải file trước đó) hoặc từ cloud sync
        // GẦN NHƯ LUÔN đã có parsedDate hợp lệ (được gán trực tiếp lúc xử lý file gốc trong
        // services/worker.ts). Trả thẳng row cũ, KHÔNG spread {...row} tạo object mới — tránh
        // cấp phát lại toàn bộ ~30 cột cho từng dòng, rất tốn kém khi dữ liệu lũy kế lên tới
        // hàng chục/trăm nghìn dòng mỗi lần khởi động app.
        if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
            result.push(row as DataRow & { parsedDate: Date });
            continue;
        }

        let dateObj: Date | null = null;
        if (rawDate) {
            if (typeof rawDate === 'object' && ('seconds' in rawDate || '_seconds' in rawDate)) {
                // rawDate ở đây là any (kế thừa từ DataRow — ngoại lệ Excel raw data đã duyệt)
                const seconds = rawDate.seconds ?? rawDate._seconds;
                if (typeof seconds === 'number') {
                    dateObj = new Date(seconds * 1000);
                }
            } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
                dateObj = parseExcelDate(rawDate);
            }
        }

        // Fallback to Ngày tạo/Ngày Tạo
        if (!dateObj || isNaN(dateObj.getTime())) {
            dateObj = parseExcelDate(getRowValue(row, COL.DATE_CREATED));
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            // Chỉ những dòng thực sự cần chuẩn hoá mới bị mutate — khớp quy ước đã dùng ở
            // services/worker.ts (mutate trực tiếp, không spread).
            row.parsedDate = dateObj;
            result.push(row as DataRow & { parsedDate: Date });
        }
    }

    return result;
}

// Marker interface cho Proxy trả về từ wrapMap() bên dưới — dùng để narrow thay vì `any`
// khi đọc 2 "magic prop" __isProxy/__target không thuộc kiểu Record<string, string> thật.
interface ProductConfigMapProxyMarker {
    __isProxy?: true;
    __target?: Record<string, string>;
}

export function wrapProductConfigWithProxies(config: ProductConfig): ProductConfig {
    if (!config) return config;

    // Check if already proxied to avoid double nesting
    if ((config.childToParentMap as ProductConfigMapProxyMarker)?.__isProxy) return config;

    const wrapMap = (targetMap: Record<string, string>, isParentMap: boolean) => {
        if (!targetMap) return targetMap;
        return new Proxy(targetMap, {
            get(target, prop) {
                if (prop === '__isProxy') return true;
                if (prop === '__target') return target;
                if (typeof prop !== 'string') {
                    return Reflect.get(target, prop);
                }

                // 0. Check industryBiMap first if available
                if (config.industryBiMap) {
                    const cleanProp = prop.trim();
                    const mapInfo = config.industryBiMap[cleanProp.toLowerCase()] || config.industryBiMap[cleanProp];
                    if (mapInfo) {
                        return isParentMap ? mapInfo.parent : mapInfo.child;
                    }
                }

                // 1. Exact match
                if (prop in target) {
                    return target[prop];
                }

                // 2. Lowercase match
                const lowerProp = prop.toLowerCase();
                if (lowerProp in target) {
                    return target[lowerProp];
                }

                // 3. ID match (extracting e.g. "4383" from "4383 - Camera IT")
                const idMatch = prop.match(/^(\d+)/);
                if (idMatch && idMatch[1] in target) {
                    return target[idMatch[1]];
                }

                return undefined;
            },
            ownKeys(target) {
                const targetKeys = Reflect.ownKeys(target);
                if (config.industryBiMap) {
                    const biKeys = Object.keys(config.industryBiMap);
                    const uniqueKeys = new Set([...targetKeys, ...biKeys]);
                    return Array.from(uniqueKeys);
                }
                return targetKeys;
            },
            getOwnPropertyDescriptor(target, prop) {
                return {
                    enumerable: true,
                    configurable: true,
                    writable: true
                };
            }
        });
    };

    return {
        ...config,
        childToParentMap: wrapMap(config.childToParentMap || {}, true),
        childToSubgroupMap: wrapMap(config.childToSubgroupMap || {}, false)
    };
}



export function unwrapProductConfigProxies(config: ProductConfig): ProductConfig {
    if (!config) return config;
    if (!(config.childToParentMap as ProductConfigMapProxyMarker)?.__isProxy) return config;

    return {
        ...config,
        childToParentMap: (config.childToParentMap as ProductConfigMapProxyMarker).__target || config.childToParentMap,
        childToSubgroupMap: (config.childToSubgroupMap as ProductConfigMapProxyMarker).__target || config.childToSubgroupMap
    };
}

// PERF FIX (Mục 65b): 3 hàm dưới đây trước là useMemo chạy đồng bộ trên main thread trong
// hooks/useDataManagement.ts, duyệt lại toàn bộ originalData (hàng chục/trăm nghìn dòng) mỗi
// khi dữ liệu thay đổi — startTransition không ngắt quãng được vòng lặp for đồng bộ đang chạy
// dở chừng bên trong 1 useMemo, chỉ né được tranh chấp độ ưu tiên giữa các state update, nên
// dù đã dùng startTransition vẫn đo được 1-3s đứng hình main thread thật (Playwright, throttle
// mobile). Port nguyên văn sang đây để Worker (services/analytics.worker.ts) gọi được — dataUtils.ts
// không import React/DOM nên an toàn dùng trong Worker (đã được Worker import gián tiếp qua
// filterService.ts từ trước). KHÔNG đổi cách đọc cột/logic so khớp — rbacData liên quan bảo mật.

export const EMPTY_UNIQUE_FILTER_OPTIONS = { kho: [] as string[], trangThai: [] as string[], nguoiTao: [] as string[], department: [] as string[], hangSX: [] as string[] };

export interface RbacParams {
    isDemoMode: boolean;
    userRole: string | null | undefined;
    departmentId: string | null | undefined;
    employeeName: string | null | undefined;
    userEmail: string | null | undefined;
}

// Port nguyên văn từ `rbacData` useMemo cũ (hooks/useDataManagement.ts).
export function computeRbacFilteredData(originalData: DataRow[], params: RbacParams): DataRow[] {
    let data = originalData;
    const { isDemoMode, userRole, departmentId, employeeName, userEmail } = params;
    if (!isDemoMode && (userRole === 'employee' || userRole === 'manager') && userEmail !== 'nguyendangkhoafit2@gmail.com') {
        const allowedKhos = (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
        data = originalData.filter(row => {
            const kho = String(row['Mã kho tạo'] || '').trim();
            if (!allowedKhos.includes(kho)) return false;

            if (userRole === 'employee') {
                // "Người tạo" trong Excel có dạng "Mã số - Tên" (vd "107617 - Nguyễn Văn A"),
                // trong khi employeeName (nhập lúc đăng ký, PendingApprovalView.tsx) CHỈ là mã
                // số thuần (validate /^\d+$/). So khớp toàn bộ chuỗi trước đây sẽ KHÔNG BAO GIỜ
                // khớp — nhân viên đăng nhập xong thấy Dashboard trống dù đã được duyệt quyền
                // đúng. Trích mã số đứng đầu "Người tạo" rồi so với employeeName thay vì so cả chuỗi.
                const nguoiTaoRaw = String(row['Người tạo'] || '').trim();
                const empIdMatch = nguoiTaoRaw.match(/^(\d+)/);
                const empId = empIdMatch ? empIdMatch[1] : nguoiTaoRaw;
                if (empId !== employeeName?.trim()) return false;
            }

            return true;
        });
    }
    return data;
}

// Port nguyên văn từ `uniqueFilterOptions` useMemo cũ. `departmentMap` gõ kiểu cấu trúc thay vì
// import type DepartmentMap từ services/dataService.ts — tránh thêm cạnh import utils→services
// (dataUtils.ts vốn không phụ thuộc services/*), 2 kiểu vẫn khớp cấu trúc { [id]: string }.
export function computeUniqueFilterOptions(rbacData: DataRow[], departmentMap: Record<string, string> | null) {
    if (rbacData.length === 0) return EMPTY_UNIQUE_FILTER_OPTIONS;

    const khos = new Set<string>();
    const trangThais = new Set<string>();
    const nguoiTaos = new Set<string>();
    const hangSxs = new Set<string>();

    const len = rbacData.length;
    for (let i = 0; i < len; i++) {
        const r = rbacData[i];

        const kho = r['Mã kho tạo'];
        if (kho) khos.add(String(kho));

        const tt = r['Trạng thái hồ sơ'];
        if (tt) trangThais.add(String(tt));

        const tao = r['Người tạo'];
        if (tao) nguoiTaos.add(String(tao));

        const hsx = r['Hãng'] || r['Hãng SX'];
        if (hsx) hangSxs.add(String(hsx));
    }

    const khoOptions = Array.from(khos).sort();
    const trangThaiOptions = Array.from(trangThais).sort();
    const nguoiTaoOptions = Array.from(nguoiTaos).sort();
    const hangSXOptions = Array.from(hangSxs).sort();

    let deptOptions: string[] = [];
    if (departmentMap) {
        // Chỉ xét phòng ban của các nhân viên THỰC SỰ xuất hiện trong nguoiTaoOptions (đã
        // scope theo rbacData ở trên) — tránh lộ tên phòng ban của nhân viên Kho khác qua
        // toàn bộ departmentMap (vốn là bản đồ toàn công ty, không theo Kho).
        const deptsSet = new Set<string>();
        const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
        for (let i = 0, len = nguoiTaoOptions.length; i < len; i++) {
            const empStr = nguoiTaoOptions[i];
            const dashIdx = empStr.indexOf(' - ');
            const id = dashIdx !== -1 ? empStr.substring(0, dashIdx).trim() : empStr.trim();
            const val = departmentMap[id] as string;
            if (!val) continue;
            const sepIdx = val.indexOf(';;');
            const deptName = sepIdx !== -1 ? val.substring(0, sepIdx) : val;
            if (deptName) {
                const deptLower = deptName.toLowerCase();
                let isExcluded = false;
                for (let j = 0; j < excludedKeywords.length; j++) {
                    if (deptLower.includes(excludedKeywords[j])) {
                        isExcluded = true;
                        break;
                    }
                }
                if (!isExcluded) {
                    deptsSet.add(deptName);
                }
            }
        }
        deptOptions = Array.from(deptsSet).sort();

        // Check for unassigned employees
        let hasUnassigned = false;
        for (let i = 0, len = nguoiTaoOptions.length; i < len; i++) {
            const empStr = nguoiTaoOptions[i];
            const dashIdx = empStr.indexOf(' - ');
            const id = dashIdx !== -1 ? empStr.substring(0, dashIdx).trim() : empStr.trim();
            if (!departmentMap[id]) {
                hasUnassigned = true;
                break;
            }
        }
        if (hasUnassigned && !deptOptions.includes('Chưa xác định')) {
            deptOptions.push('Chưa xác định');
        }
    }

    return { kho: khoOptions, trangThai: trangThaiOptions, nguoiTao: nguoiTaoOptions, department: deptOptions, hangSX: hangSXOptions };
}

// Port nguyên văn từ `allUnconfiguredGroups` useMemo cũ.
export function computeUnconfiguredGroups(originalData: DataRow[], productConfig: ProductConfig | null): { nhomHang: string; nganhHang: string }[] {
    if (!originalData || originalData.length === 0 || !productConfig) return [];

    const missing = new Map<string, string>(); // map: nhomHang -> nganhHang

    for (let i = 0; i < originalData.length; i++) {
        const row = originalData[i];

        // Bỏ qua các dòng không tính doanh thu theo hình thức xuất
        const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
        const isRevenue = productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
            ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
            : (!normalizedThuHoSet.has(cleanAndNormalize(hinhThucXuat)) &&
               !hinhThucXuat.toLowerCase().normalize('NFC').includes('thu hộ') &&
               !hinhThucXuat.toLowerCase().normalize('NFC').includes('khuyến mãi'));

        if (!isRevenue) continue;

        // Bỏ qua các dòng không tính doanh thu (giá bán <= 0)
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        if (price <= 0) continue;

        // Bỏ qua các ngành hàng/nhóm hàng khuyến mãi hoặc thu hộ (không tính doanh thu)
        const nganhHangRaw = String(getRowValue(row, COL.MA_NGANH_HANG) || '').toLowerCase().normalize('NFC');
        const nhomHangRaw = String(getRowValue(row, COL.MA_NHOM_HANG) || '').toLowerCase().normalize('NFC');
        if (
            nganhHangRaw.includes('khuyến mãi') ||
            nganhHangRaw.includes('khuyen mai') ||
            nhomHangRaw.includes('khuyến mãi') ||
            nhomHangRaw.includes('khuyen mai') ||
            nganhHangRaw.includes('thu hộ') ||
            nhomHangRaw.includes('thu hộ')
        ) {
            continue;
        }

        const nhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        if (!nhomHang) continue;

        const parent = getParentGroup(nhomHang, productConfig);
        if (!parent) {
            const nganhHang = getRowValue(row, COL.MA_NGANH_HANG) || 'Không xác định';
            missing.set(String(nhomHang).trim(), String(nganhHang).trim());
        }
    }

    return Array.from(missing.entries()).map(([nhomHang, nganhHang]) => ({
        nhomHang,
        nganhHang
    })).sort((a, b) => a.nganhHang.localeCompare(b.nganhHang) || a.nhomHang.localeCompare(b.nhomHang));
}

export function calculateRowMetrics(row: DataRow, productConfig: ProductConfig | null): { revenue: number, revenueQD: number, quantity: number, weightedQuantity: number, isTraCham: boolean } {
    const price = Number(getRowValue(row, COL.PRICE)) || 0;
    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
    const revenue = price;
    
    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
    const productName = getRowValue(row, COL.PRODUCT);
    const productCode = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
    
    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
    
    const htx = getRowValue(row, COL.HINH_THUC_XUAT) || '';
    let isTraCham = false;
    if (productConfig && productConfig.htxClassification && Object.keys(productConfig.htxClassification).length > 0) {
        isTraCham = productConfig.htxClassification[cleanAndNormalize(htx)] === 'tra_gop';
    } else {
        // So khớp đã chuẩn hoá — tránh bỏ sót đơn trả góp chỉ vì lệch hoa/thường/khoảng trắng
        // so với danh sách hardcode khi chưa có Config Excel (xem HINH_THUC_XUAT_TRA_GOP).
        isTraCham = normalizedTraGopSet.has(cleanAndNormalize(htx));
    }
    
    // DTQĐ = Doanh thu thực * Hệ số + (30% Doanh thu thực nếu là đơn hàng Trả góp/Trả chậm)
    const revenueQD = revenue * heso + (isTraCham ? revenue * 0.3 : 0);
    
    // weightedQuantity (Số lượng quy đổi)
    const industry = getParentGroup(maNhomHang, productConfig) || 'Khác';
    const group = getSubgroup(maNhomHang, productConfig) || 'Khác';
    const isInsurance = industry === 'Bảo hiểm' || industry === 'Bảo hiểm ĐMX' || group === 'Bảo hiểm' || group === 'Bảo hiểm ĐMX';
    
    let qtyMultiplier = undefined;
    if (!isInsurance) {
        qtyMultiplier = (productConfig?.vasMultiplierMap?.[productCode]) ?? (productConfig?.quantityMultiplierMap?.[productCode]);
    }
    
    const subgroup = productConfig?.childToSubgroupMap?.[maNhomHang] || '';
    const isVieon = subgroup === 'Vieon' || (productName || '').toString().includes('VieON');
    
    const weightedQuantity = isVieon 
        ? (quantity * heso) 
        : (qtyMultiplier !== undefined ? (quantity * qtyMultiplier) : quantity);
    
    return { revenue, revenueQD, quantity, weightedQuantity, isTraCham };
}

/**
 * Tính Doanh Thu Quy Đổi (DTQĐ) với công thức chuẩn:
 * DTQĐ = (Doanh thu × Hệ số) + (30% Doanh thu nếu là trả góp/trả chậm)
 * @param revenue - Doanh thu thực (Giá bán)
 * @param heso - Hệ số quy đổi theo ngành/nhóm hàng
 * @param isTraCham - Có phải đơn trả góp/trả chậm không
 */
export function calculateRevenueQD(revenue: number, heso: number, isTraCham: boolean): number {
    return revenue * heso + (isTraCham ? revenue * 0.3 : 0);
}

/**
 * Tính Số Lượng Quy Đổi dựa trên loại sản phẩm và cấu hình:
 * - Vieon: qty × hệ số
 * - VAS/Phụ kiện (không phải Bảo hiểm): qty × vasMultiplierMap hoặc quantityMultiplierMap
 * - Sản phẩm khác: qty thô
 * @param quantity - Số lượng gốc
 * @param productCode - Mã sản phẩm (để tra multiplier)
 * @param productConfig - Cấu hình sản phẩm (chứa multiplier maps)
 * @param isVieon - Có phải Vieon không
 * @param maNhomHang - Mã nhóm hàng (để kiểm tra Bảo hiểm)
 * @param heso - Hệ số quy đổi (dùng cho Vieon)
 */
export function calculateWeightedQuantity(
    quantity: number,
    productCode: string,
    productConfig: ProductConfig | null,
    isVieon: boolean,
    maNhomHang: string,
    heso: number
): number {
    if (isVieon) {
        return quantity * heso;
    }

    const industry = getParentGroup(maNhomHang, productConfig) || 'Khác';
    const group = getSubgroup(maNhomHang, productConfig) || 'Khác';
    const isInsurance = industry === 'Bảo hiểm' || industry === 'Bảo hiểm ĐMX' || group === 'Bảo hiểm' || group === 'Bảo hiểm ĐMX';

    let qtyMultiplier = undefined;
    if (!isInsurance) {
        qtyMultiplier = (productConfig?.vasMultiplierMap?.[productCode]) ?? (productConfig?.quantityMultiplierMap?.[productCode]);
    }

    return qtyMultiplier !== undefined ? quantity * qtyMultiplier : quantity;
}

/** Lấy message an toàn từ 1 giá trị catch (error: unknown), không giả định error là Error. */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return String(error);
    } catch {
        return 'Unknown error';
    }
}

/**
 * Lấy field `code` an toàn từ 1 giá trị catch (error: unknown) — dùng cho lỗi kiểu
 * FirebaseError (`error.code`, VD 'auth/popup-blocked', 'permission-denied') mà không cần
 * `any`. Trả về undefined nếu error không có field `code` dạng string.
 */
export function getErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === 'string' ? code : undefined;
    }
    return undefined;
}

/**
 * Kiểm tra 1 giá trị catch (error: unknown) có phải AbortError không (VD: user huỷ
 * navigator.share()). Không dùng `instanceof Error` vì DOMException (loại lỗi thật của
 * navigator.share()/AbortController) không kế thừa từ Error trong TS lib.dom.
 */
export function isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}
