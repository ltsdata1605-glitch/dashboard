import type { DataRow, ProductConfig, Status } from '../types';
import { getRowValue, parseExcelDate, toLocalISOString, cleanAndNormalize, getErrorMessage } from '../utils/dataUtils';
import { COL, DEFAULT_QUANTITY_MULTIPLIER_MAP } from '../constants';
import { isAllInOneDepartment, keepOnlyAllInOne } from '../utils/departmentFilter';

type StatusUpdater = (status: Status) => void;

export type DepartmentMap = { [employeeId: string]: string };

function robustCsvParse(text: string): string[][] {
    const lines = text.split(/\r?\n/);
    const result: string[][] = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        const row: string[] = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    // Handle escaped quote ""
                    cell += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        row.push(cell.trim());
        result.push(row);
    }
    return result;
}


export function parseProductConfigFromWorkbook(workbook: any, XLSX: any): ProductConfig {
    const config: ProductConfig = {
        groups: {},
        subgroups: {},
        childToParentMap: {},
        childToSubgroupMap: {},
        quantityMultiplierMap: { ...DEFAULT_QUANTITY_MULTIPLIER_MAP },
        vasMultiplierMap: {},
        vasNameMultiplierMap: {},
        revenueEligibleHTX: new Set<string>(),
        nonRevenueEligibleHTX: new Set<string>(),
        htxClassification: {}
    };

    // 1. Parse the main config sheet ("Ngành hàng" or sheet 0)
    const mainSheetName = workbook.SheetNames.find((name: string) => {
        const ln = cleanAndNormalize(name).toLowerCase();
        return ln.includes('ngành hàng') || ln.includes('nganh hang');
    }) || workbook.SheetNames[0];
    const mainSheet = workbook.Sheets[mainSheetName];
    const parsedRows: any[][] = XLSX.utils.sheet_to_json(mainSheet, { header: 1, defval: '' });
    
    if (parsedRows.length < 2) {
        throw new Error(`Sheet cấu hình '${mainSheetName}' không hợp lệ hoặc không có dữ liệu.`);
    }
    
    const headers = parsedRows[0].map((h: any) => String(h || '').trim());
    const headersNormalized = headers.map((h: string) => cleanAndNormalize(h).toLowerCase().replace(/\s+/g, ''));
    let groupIndex = headers.indexOf('NhomCha');
    let subgroupIndex = headers.indexOf('NhomCon');
    let productCodeIndex = headers.indexOf('NhomHang');
    const multiplierIndex = headers.findIndex((h: string) => {
        const lower = cleanAndNormalize(h).toLowerCase();
        return lower.includes('hệ số') || lower.includes('he so') || lower.includes('multiplier') || lower.includes('hsqd');
    });

    if (groupIndex === -1) {
        groupIndex = headersNormalized.findIndex((h: string) => h.includes('nhomcha') || h.includes('cha') || h.includes('parent'));
    }
    if (subgroupIndex === -1) {
        subgroupIndex = headersNormalized.findIndex((h: string) => h.includes('nhomcon') || h.includes('con') || h.includes('sub'));
    }
    if (productCodeIndex === -1) {
        productCodeIndex = headersNormalized.findIndex((h: string) => h.includes('nhomhang') || h.includes('manhomhang') || h.includes('ma') || h.includes('code'));
    }
    
    if (groupIndex === -1 || subgroupIndex === -1 || productCodeIndex === -1) {
        console.error('Headers found:', headers);
        throw new Error(`Sheet cấu hình '${mainSheetName}' thiếu các cột bắt buộc: NhomCha, NhomCon, NhomHang`);
    }
    
    const dataRows = parsedRows.slice(1);
    dataRows.forEach((row: any[]) => {
        if (row.length > Math.max(groupIndex, subgroupIndex, productCodeIndex)) {
            const parentGroup = String(row[groupIndex] || '').trim();
            const childGroup = String(row[subgroupIndex] || '').trim();
            const productCode = String(row[productCodeIndex] || '').trim();

            if (parentGroup && childGroup && productCode) {
                if (!config.groups[parentGroup]) {
                    config.groups[parentGroup] = new Set();
                }
                config.groups[parentGroup].add(productCode);

                if (!config.subgroups[parentGroup]) {
                    config.subgroups[parentGroup] = {};
                }
                if (!config.subgroups[parentGroup][childGroup]) {
                    config.subgroups[parentGroup][childGroup] = [];
                }
                config.subgroups[parentGroup][childGroup].push(productCode);
                
                config.childToParentMap[productCode] = parentGroup;
                config.childToSubgroupMap[productCode] = childGroup;

                const trimmedLower = productCode.toLowerCase();
                config.childToParentMap[trimmedLower] = parentGroup;
                config.childToSubgroupMap[trimmedLower] = childGroup;

                const idMatch = productCode.match(/^(\d+)/);
                if (idMatch) {
                    const codeId = idMatch[1];
                    config.childToParentMap[codeId] = parentGroup;
                    config.childToSubgroupMap[codeId] = childGroup;
                }

                if (multiplierIndex !== -1 && row[multiplierIndex] !== undefined) {
                    const multVal = parseFloat(String(row[multiplierIndex]).replace(',', '.'));
                    if (!isNaN(multVal) && multVal > 0) {
                        config.quantityMultiplierMap[productCode] = multVal;
                        config.quantityMultiplierMap[trimmedLower] = multVal;
                        if (idMatch) {
                            config.quantityMultiplierMap[idMatch[1]] = multVal;
                        }
                    }
                }
            }
        }
    });

    // 2. Parse multiplier sheets (e.g. VIEON, Bảo hiểm ĐMX, Hệ số QĐ, Vas)
    const multiplierSheetNames = workbook.SheetNames.filter((name: string) => {
        const lowerName = cleanAndNormalize(name).toLowerCase();
        return lowerName.includes('vieon') || 
               lowerName.includes('bảo hiểm đmx') || 
               lowerName.includes('bao hiem dmx') ||
               lowerName.includes('hệ số qđ') ||
               lowerName.includes('he so qd') ||
               lowerName.includes('bảo hiểm') ||
               lowerName.includes('bao hiem') ||
               lowerName.includes('vas');
    });

    multiplierSheetNames.forEach((sheetName: string) => {
        try {
            const sheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rows.length >= 2) {
                const sheetHeaders = rows[0].map((h: any) => String(h || '').trim().toLowerCase().normalize('NFC'));
                const codeIdx = sheetHeaders.findIndex((h: string) => h.includes('mã sản phẩm') || h === 'mã' || h.includes('mã sp') || h.includes('code'));
                const nameIdx = sheetHeaders.findIndex((h: string) => h.includes('tên sản phẩm') || h === 'tên' || h.includes('name'));
                const multiplierIdx = sheetHeaders.findIndex((h: string) => h.includes('hệ số') || h.includes('sl quy đổi') || h.includes('hệ số quy đổi') || h.includes('multiplier'));
                
                if (codeIdx !== -1 && multiplierIdx !== -1) {
                    if (!config.vasNameMultiplierMap) {
                        config.vasNameMultiplierMap = {};
                    }
                    let count = 0;
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (row.length > Math.max(codeIdx, multiplierIdx)) {
                            const code = String(row[codeIdx] || '').trim();
                            const nameVal = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
                            
                            const rawVal = String(row[multiplierIdx] || '').replace(',', '.');
                            const multiplier = parseFloat(rawVal);
                            
                            if (!isNaN(multiplier)) {
                                if (code) {
                                    if (sheetName.toLowerCase().includes('vas')) {
                                        if (!config.vasMultiplierMap) config.vasMultiplierMap = {};
                                        config.vasMultiplierMap[code] = multiplier;
                                    } else {
                                        config.quantityMultiplierMap[code] = multiplier;
                                    }
                                }
                                if (nameVal) {
                                    config.vasNameMultiplierMap[nameVal] = multiplier;
                                }
                                count++;
                            }
                        }
                    }
                    console.warn(`[Config] Đã tải ${count} hệ số từ sheet '${sheetName}'.`);
                }
            }
        } catch (sheetError) {
            console.warn(`[Config] Lỗi khi xử lý sheet '${sheetName}':`, sheetError);
        }
    });

    // 3. Parse "Hình thức xuất" sheet
    const htxSheetName = workbook.SheetNames.find((name: string) => {
        const lower = cleanAndNormalize(name).toLowerCase();
        return lower.includes('hình thức xuất') || lower.includes('hinh thuc xuat') || lower.includes('htx');
    });
    if (htxSheetName) {
        try {
            const sheet = workbook.Sheets[htxSheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rows.length >= 2) {
                const sheetHeaders = rows[0].map((h: any) => String(h || '').trim());
                const sheetHeadersLower = sheetHeaders.map((h: string) => cleanAndNormalize(h).toLowerCase());
                const htxIndex = sheetHeadersLower.findIndex((h: string) => h.includes('hình thức xuất') || h.includes('hinh thuc xuat') || h.includes('tên'));
                const tinhDTIndex = sheetHeadersLower.findIndex((h: string) => h.includes('tính doanh thu') || h.includes('tinh doanh thu') || h.includes('doanh thu') || h.includes('dt'));
                const hinhThucIndex = sheetHeadersLower.findIndex((h: string) => h === 'hình thức' || h === 'hinh thuc' || h.includes('loại') || h.includes('loai'));
                
                if (htxIndex !== -1 && (tinhDTIndex !== -1 || hinhThucIndex !== -1)) {
                    let count = 0;
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        const htx = String(row[htxIndex] || '').trim();
                        const tinhDT = tinhDTIndex !== -1 ? String(row[tinhDTIndex] || '').trim() : '';
                        const hinhThuc = hinhThucIndex !== -1 ? String(row[hinhThucIndex] || '').trim() : '';
                        
                        if (htx) {
                            const htxKey = cleanAndNormalize(htx);
                            const normTinhDT = cleanAndNormalize(tinhDT).toLowerCase();
                            if (normTinhDT === 'có' || normTinhDT === 'co' || normTinhDT === 'yes' || normTinhDT === '1' || normTinhDT.includes('doanh thu')) {
                                config.revenueEligibleHTX!.add(htxKey);
                            } else {
                                config.nonRevenueEligibleHTX!.add(htxKey);
                            }
                            
                            const hinhThucLower = cleanAndNormalize(hinhThuc).toLowerCase();
                            if (hinhThucLower.includes('trả góp') || hinhThucLower.includes('tra gop')) {
                                config.htxClassification![htxKey] = 'tra_gop';
                            } else if (hinhThucLower.includes('tiền mặt') || hinhThucLower.includes('tien mat')) {
                                config.htxClassification![htxKey] = 'tien_mat';
                            } else if (hinhThucLower.includes('thu hộ') || hinhThucLower.includes('thu ho')) {
                                config.htxClassification![htxKey] = 'thu_ho';
                            } else {
                                config.htxClassification![htxKey] = 'khac';
                            }
                            count++;
                        }
                    }
                    console.warn(`[Config] Đã tải ${count} hình thức xuất từ sheet '${htxSheetName}'.`);
                }
            }
        } catch (sheetError) {
            console.warn(`[Config] Lỗi khi xử lý sheet '${htxSheetName}':`, sheetError);
        }
    }

    return config;
}

export async function loadConfigFromSheet(url: string, setStatus: StatusUpdater): Promise<ProductConfig> {
    setStatus({ message: 'Đang tải file cấu hình...', type: 'info', progress: 0 });
    
    // Rewrite URL to request output=xlsx or export?format=xlsx to pull all sheets at once
    let xlsxUrl = url;
    if (url.includes('/pub?')) {
        xlsxUrl = url.replace(/output=[a-zA-Z0-9]+/, 'output=xlsx');
        if (!xlsxUrl.includes('output=xlsx')) {
            xlsxUrl += (xlsxUrl.includes('?') ? '&' : '?') + 'output=xlsx';
        }
    } else if (url.includes('/d/') && url.includes('/edit')) {
        xlsxUrl = url.replace(/\/edit.*$/, '/export?format=xlsx');
    }

    try {
        const response = await fetch(xlsxUrl);
        if (!response.ok) {
            throw new Error(`Không thể tải file cấu hình Excel. Status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        setStatus({ message: 'Đang xử lý file cấu hình...', type: 'info', progress: 30 });
        const XLSX = await import('xlsx');
        
        let workbook;
        try {
            workbook = XLSX.read(data, { type: 'array' });
        } catch (xlsxError) {
            console.warn('[Config] Không thể đọc dưới dạng XLSX, thử fallback sang parse CSV gốc...', xlsxError);
        }

        let config: ProductConfig;
        if (workbook) {
            config = parseProductConfigFromWorkbook(workbook, XLSX);
        } else {
            // Fallback to original CSV parsing for backward compatibility (if file is pure CSV)
            config = {
                groups: {},
                subgroups: {},
                childToParentMap: {},
                childToSubgroupMap: {},
                quantityMultiplierMap: { ...DEFAULT_QUANTITY_MULTIPLIER_MAP },
                vasMultiplierMap: {},
                vasNameMultiplierMap: {},
                revenueEligibleHTX: new Set<string>(),
                nonRevenueEligibleHTX: new Set<string>(),
                htxClassification: {}
            };
            const csvResponse = await fetch(url);
            const csvText = await csvResponse.text();
            const parsedRows = robustCsvParse(csvText);

            if (parsedRows.length < 2) {
                 throw new Error('File cấu hình CSV không hợp lệ hoặc không có dữ liệu.');
             }
            
            const headers = parsedRows[0].map(h => h.trim());
            const dataRows = parsedRows.slice(1);

            const groupIndex = headers.indexOf('NhomCha');
            const subgroupIndex = headers.indexOf('NhomCon');
            const productCodeIndex = headers.indexOf('NhomHang');
            
            if (groupIndex === -1 || subgroupIndex === -1 || productCodeIndex === -1) {
                console.error('Headers found:', headers);
                throw new Error('File cấu hình CSV thiếu các cột bắt buộc: NhomCha, NhomCon, NhomHang');
            }

            dataRows.forEach(row => {
                if (row.length > Math.max(groupIndex, subgroupIndex, productCodeIndex)) {
                    const parentGroup = row[groupIndex];
                    const childGroup = row[subgroupIndex];
                    const productCode = row[productCodeIndex];

                    if (parentGroup && childGroup && productCode) {
                        if (!config.groups[parentGroup]) {
                            config.groups[parentGroup] = new Set();
                        }
                        config.groups[parentGroup].add(productCode);

                        if (!config.subgroups[parentGroup]) {
                            config.subgroups[parentGroup] = {};
                        }
                        if (!config.subgroups[parentGroup][childGroup]) {
                            config.subgroups[parentGroup][childGroup] = [];
                        }
                        config.subgroups[parentGroup][childGroup].push(productCode);
                        
                        config.childToParentMap[productCode] = parentGroup;
                        config.childToSubgroupMap[productCode] = childGroup;

                        const trimmedLower = productCode.trim().toLowerCase();
                        config.childToParentMap[trimmedLower] = parentGroup;
                        config.childToSubgroupMap[trimmedLower] = childGroup;

                        const idMatch = productCode.match(/^(\d+)/);
                        if (idMatch) {
                            const codeId = idMatch[1];
                            config.childToParentMap[codeId] = parentGroup;
                            config.childToSubgroupMap[codeId] = childGroup;
                        }
                    }
                }
            });
            
            // Try to load VIEON sheet separately as CSV
            try {
                const vieonUrl = url.replace(/pub\?.*$/, 'pub?gid=681719985&single=true&output=csv');
                const vieonResponse = await fetch(vieonUrl);
                if (vieonResponse.ok) {
                    const vieonCsvText = await vieonResponse.text();
                    const vieonRows = robustCsvParse(vieonCsvText);
                    if (vieonRows.length >= 2) {
                        const vieonHeaders = vieonRows[0].map(h => h.trim());
                        const codeIdx = vieonHeaders.indexOf('Mã sản phẩm');
                        const multiplierIdx = vieonHeaders.indexOf('Hệ Số');
                        
                        if (codeIdx !== -1 && multiplierIdx !== -1) {
                            for (let i = 1; i < vieonRows.length; i++) {
                                const row = vieonRows[i];
                                const code = (row[codeIdx] || '').trim();
                                const multiplier = parseFloat(row[multiplierIdx] || '');
                                if (code && !isNaN(multiplier)) {
                                    config.quantityMultiplierMap[code] = multiplier;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[Config] Không thể tải bảng hệ số VIEON qua CSV:', e);
            }
        }

        setStatus({ message: 'Tải cấu hình thành công.', type: 'success', progress: 100 });
        return config;
    } catch (error) {
        console.error("Lỗi khi tải cấu hình:", error);
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi tải cấu hình";
        setStatus({ message: errorMessage, type: 'error', progress: 0 });
        throw error;
    }
}

export async function processShiftFile(
    file: File
): Promise<{ map: DepartmentMap; uniqueDepartments: string[]; skippedCount: number; skippedDepartments: string[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) throw new Error("Không thể đọc file phân ca.");
                
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // any: dữ liệu Excel thô, mỗi ô có thể là string/number/Date/null tùy nội dung file
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                const map: DepartmentMap = {};
                let currentDepartment: string | null = null;
                const departments = new Set<string>();

                for (let i = 2; i < rows.length; i++) {
                    const row = rows[i];
                    if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
                        currentDepartment = row[0].trim();
                    }
                    
                    const userId = row[1];
                    const userName = row[2]; // Potential separate name column

                    if (userId && currentDepartment) {
                        const userIdStr = String(userId).trim();
                        const userNameStr = userName ? String(userName).trim() : '';
                        const lowerUserId = userIdStr.toLowerCase();
                        const lowerUserName = userNameStr.toLowerCase();
                        
                        // Exclude system accounts/lines
                        if (
                            lowerUserId.startsWith('yêu cầu xuất') ||
                            lowerUserId.startsWith('mwg') ||
                            lowerUserId.startsWith('bp ') ||
                            lowerUserId.startsWith('hỗ trợ bi') ||
                            lowerUserId.startsWith('nnh ') ||
                            lowerUserId.startsWith('đml_str_str') ||
                            lowerUserId.includes('online') ||
                            lowerUserName.startsWith('yêu cầu xuất') ||
                            lowerUserName.startsWith('mwg') ||
                            lowerUserName.startsWith('bp ') ||
                            lowerUserName.startsWith('hỗ trợ bi') ||
                            lowerUserName.startsWith('nnh ') ||
                            lowerUserName.startsWith('đml_str_str') ||
                            lowerUserName.includes('online')
                        ) {
                            continue;
                        }

                        // Handle generic ID extraction to be robust against various separators
                        const idMatch = userIdStr.match(/^(\d+)/);
                        const cleanId = idMatch ? idMatch[1] : userIdStr.split(' - ')[0].trim();
                        
                        if (cleanId) {
                             // If userIdStr is just the ID and we have row[2] as a string, combine them
                             let storedName = userIdStr;
                             if (userIdStr === cleanId && userName && typeof userName === 'string' && userName.trim() !== '') {
                                 storedName = `${cleanId} - ${userName.trim()}`;
                             }

                             // Always store the full string to preserve name information
                             const storedValue = `${currentDepartment};;${storedName}`;
                             map[cleanId] = storedValue;
                             departments.add(currentDepartment);
                        }
                    }
                }
                
                if (Object.keys(map).length === 0) {
                    throw new Error("File phân ca không hợp lệ hoặc không chứa dữ liệu nhân viên và bộ phận.");
                }

                // Phân Tích & Report BI chỉ dùng nhân viên BP All In One (chủ dự án chốt
                // 2026-09-23). Phân Ca có đường nhập Excel riêng nên vẫn nạp đủ mọi bộ phận.
                const filtered = keepOnlyAllInOne(map);
                if (filtered.keptCount === 0) {
                    throw new Error(
                        `File không có nhân viên nào thuộc BP All In One (chỉ thấy: ${filtered.skippedDepartments.join(', ') || 'không rõ bộ phận'}).`
                    );
                }

                resolve({
                    map: filtered.map,
                    uniqueDepartments: Array.from(departments).filter(isAllInOneDepartment).sort(),
                    skippedCount: filtered.skippedCount,
                    skippedDepartments: filtered.skippedDepartments,
                });

            } catch (error) {
                console.error("Lỗi khi xử lý file phân ca:", error);
                const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi xử lý file phân ca";
                reject(new Error(errorMessage));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// ĐÃ XOÁ `processSalesFile()` (82 dòng) — dọn code, 2026-09-09.
// Đây là đường parse Excel CŨ chạy trên main thread, đã bị thay bằng Worker
// (services/worker.ts, gọi từ hooks/useFileUploadLogic.ts) và KHÔNG còn nơi nào gọi tới
// (xác nhận bằng grep toàn repo: chỉ khớp đúng dòng khai báo của chính nó).
// Xoá hẳn chứ không để lại, vì nó là CÁI BẪY: nó sinh DataRow với khoá tiếng Việt dài,
// đi vòng qua bước chuẩn hoá khoá ngắn của Đợt 4 — ai lỡ gọi sẽ nhận dữ liệu sai hình dạng
// mà không có lỗi nào báo ra. Cần lại thì lấy từ lịch sử git.
