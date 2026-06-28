
import type { DataRow, SummaryTableNode, ProductConfig } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP, DEFAULT_QUANTITY_MULTIPLIER_MAP, PRODUCT_NAME_COEFFICIENTS } from '../constants';


const columnCache = new Map<string, string>();

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


export function getHeSoQuyDoi(maNganhHang: string, maNhomHang: string, productConfig: ProductConfig | null, productName?: string, productCode?: string): number {
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
        const key = String(hinhThucXuat).trim().toLowerCase().normalize('NFC');
        if (productConfig.htxClassification[key] !== undefined) {
            return productConfig.htxClassification[key];
        }
    }
    
    // Fallback to static config
    if (HINH_THUC_XUAT_TRA_GOP.has(hinhThucXuat)) return 'tra_gop';
    if (HINH_THUC_XUAT_TIEN_MAT.has(hinhThucXuat)) return 'tien_mat';
    if (HINH_THUC_XUAT_THU_HO.has(hinhThucXuat)) return 'thu_ho';
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

export const parseNumber = (str: any): number => {
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
        'PHỤ KIỆN - ĐỒNG HỒ': 'PK - Đồng hồ',
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
    };

    if (rules[name]) return rules[name];
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
    return data
        .map(row => {
            let dateObj: Date | null = null;

            const rawDate = row.parsedDate;
            if (rawDate) {
                if (rawDate instanceof Date) {
                    dateObj = isNaN(rawDate.getTime()) ? null : rawDate;
                } else if (typeof rawDate === 'object' && ('seconds' in rawDate || '_seconds' in rawDate)) {
                    const seconds = (rawDate as any).seconds ?? (rawDate as any)._seconds;
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
                return { ...row, parsedDate: dateObj };
            }
            return null;
        })
        .filter((row): row is (DataRow & { parsedDate: Date }) => row !== null);
}

export function wrapProductConfigWithProxies(config: ProductConfig): ProductConfig {
    if (!config) return config;

    // Check if already proxied to avoid double nesting
    if ((config.childToParentMap as any)?.__isProxy) return config;

    const wrapMap = (targetMap: Record<string, string>, isParentMap: boolean) => {
        if (!targetMap) return targetMap;
        return new Proxy(targetMap, {
            get(target, prop) {
                if (prop === '__isProxy') return true;
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


