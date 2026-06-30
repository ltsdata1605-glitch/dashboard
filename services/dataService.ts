
import type { DataRow, ProductConfig, Status } from '../types';
import { getRowValue, parseExcelDate } from '../utils/dataUtils';
import { COL, DEFAULT_QUANTITY_MULTIPLIER_MAP } from '../constants';

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

        const config: ProductConfig = {
            groups: {},
            subgroups: {},
            childToParentMap: {},
            childToSubgroupMap: {},
            quantityMultiplierMap: { ...DEFAULT_QUANTITY_MULTIPLIER_MAP },
            vasNameMultiplierMap: {},
            revenueEligibleHTX: new Set<string>(),
            nonRevenueEligibleHTX: new Set<string>(),
            htxClassification: {}
        };

        if (workbook) {
            // 1. Parse the main config sheet ("Ngành hàng" or sheet 0)
            const mainSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('ngành hàng')) || workbook.SheetNames[0];
            const mainSheet = workbook.Sheets[mainSheetName];
            const parsedRows: any[][] = XLSX.utils.sheet_to_json(mainSheet, { header: 1, defval: '' });
            
            if (parsedRows.length < 2) {
                throw new Error(`Sheet cấu hình '${mainSheetName}' không hợp lệ hoặc không có dữ liệu.`);
            }
            
            const headers = parsedRows[0].map(h => String(h || '').trim());
            const groupIndex = headers.indexOf('NhomCha');
            const subgroupIndex = headers.indexOf('NhomCon');
            const productCodeIndex = headers.indexOf('NhomHang');
            
            if (groupIndex === -1 || subgroupIndex === -1 || productCodeIndex === -1) {
                console.error('Headers found:', headers);
                throw new Error(`Sheet cấu hình '${mainSheetName}' thiếu các cột bắt buộc: NhomCha, NhomCon, NhomHang`);
            }
            
            const dataRows = parsedRows.slice(1);
            dataRows.forEach(row => {
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
                    }
                }
            });

            // 2. Parse multiplier sheets (e.g. VIEON, Bảo hiểm ĐMX, Hệ số QĐ, Vas)
            const multiplierSheetNames = workbook.SheetNames.filter(name => {
                const lowerName = name.toLowerCase();
                return lowerName.includes('vieon') || 
                       lowerName.includes('bảo hiểm đmx') || 
                       lowerName.includes('hệ số qđ') ||
                       lowerName.includes('bảo hiểm') ||
                       lowerName.includes('vas');
            });

            multiplierSheetNames.forEach(sheetName => {
                try {
                    const sheet = workbook.Sheets[sheetName];
                    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    if (rows.length >= 2) {
                        const sheetHeaders = rows[0].map(h => String(h || '').trim());
                        const codeIdx = sheetHeaders.findIndex(h => h.toLowerCase().includes('mã sản phẩm') || h.toLowerCase() === 'mã');
                        const nameIdx = sheetHeaders.findIndex(h => h.toLowerCase().includes('tên sản phẩm') || h.toLowerCase() === 'tên');
                        const multiplierIdx = sheetHeaders.findIndex(h => h.toLowerCase().includes('hệ số') || h.toLowerCase().includes('sl quy đổi'));
                        
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
                                    
                                    // Handle Vietnamese comma decimal format (e.g. "1,5" -> "1.5")
                                    const rawVal = String(row[multiplierIdx] || '').replace(',', '.');
                                    const multiplier = parseFloat(rawVal);
                                    
                                    if (!isNaN(multiplier)) {
                                        if (code) {
                                            config.quantityMultiplierMap[code] = multiplier;
                                        }
                                        if (nameVal) {
                                            config.vasNameMultiplierMap[nameVal] = multiplier;
                                        }
                                        count++;
                                    }
                                }
                            }
                            console.log(`[Config] Đã tải ${count} hệ số từ sheet '${sheetName}'.`);
                        }
                    }
                } catch (sheetError) {
                    console.warn(`[Config] Lỗi khi xử lý sheet '${sheetName}':`, sheetError);
                }
            });

            // 3. Parse "Hình thức xuất" sheet
            const htxSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('hình thức xuất') || name.toLowerCase().includes('htx'));
            if (htxSheetName) {
                try {
                    const sheet = workbook.Sheets[htxSheetName];
                    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    if (rows.length >= 2) {
                        const sheetHeaders = rows[0].map(h => String(h || '').trim());
                        const htxIndex = sheetHeaders.indexOf('Hình thức xuất');
                        const tinhDTIndex = sheetHeaders.indexOf('Tính doanh thu');
                        const hinhThucIndex = sheetHeaders.indexOf('Hình thức');
                        
                        if (htxIndex !== -1 && tinhDTIndex !== -1 && hinhThucIndex !== -1) {
                            let count = 0;
                            for (let i = 1; i < rows.length; i++) {
                                const row = rows[i];
                                if (row.length > Math.max(htxIndex, tinhDTIndex, hinhThucIndex)) {
                                    const htx = String(row[htxIndex] || '').trim();
                                    const tinhDT = String(row[tinhDTIndex] || '').trim();
                                    const hinhThuc = String(row[hinhThucIndex] || '').trim();
                                    
                                    if (htx) {
                                        const htxKey = htx.toLowerCase().normalize('NFC');
                                        if (tinhDT.toLowerCase().normalize('NFC') === 'có') {
                                            config.revenueEligibleHTX!.add(htxKey);
                                        } else {
                                            config.nonRevenueEligibleHTX!.add(htxKey);
                                        }
                                        
                                        const hinhThucLower = hinhThuc.toLowerCase().normalize('NFC');
                                        if (hinhThucLower.includes('trả góp') || hinhThuc === 'Trả góp') {
                                            config.htxClassification![htxKey] = 'tra_gop';
                                        } else if (hinhThucLower.includes('tiền mặt') || hinhThuc === 'Tiền mặt') {
                                            config.htxClassification![htxKey] = 'tien_mat';
                                        } else if (hinhThucLower.includes('thu hộ') || hinhThuc === 'Thu hộ') {
                                            config.htxClassification![htxKey] = 'thu_ho';
                                        } else {
                                            config.htxClassification![htxKey] = 'khac';
                                        }
                                        count++;
                                    }
                                }
                            }
                            console.log(`[Config] Đã tải ${count} hình thức xuất từ sheet '${htxSheetName}'.`);
                        }
                    }
                } catch (sheetError) {
                    console.warn(`[Config] Lỗi khi xử lý sheet '${htxSheetName}':`, sheetError);
                }
            }

            // 4. Parse "Ngành hàng BI" sheet
            const biSheetName = workbook.SheetNames.find(name => {
                const ln = name.toLowerCase().normalize('NFC');
                return ln.includes('ngành hàng bi') || ln.includes('nganh hang bi');
            });
            if (biSheetName) {
                try {
                    const sheet = workbook.Sheets[biSheetName];
                    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    if (rows.length >= 2) {
                        const sheetHeaders = rows[0].map(h => String(h || '').trim());
                        const nganhHangIdx = sheetHeaders.findIndex(h => h.toLowerCase().normalize('NFC') === 'ngành hàng' || h.toLowerCase() === 'nganhhang' || h.toLowerCase() === 'ngành hàng');
                        const nhomHangIdx = sheetHeaders.findIndex(h => h.toLowerCase().normalize('NFC') === 'nhóm hàng' || h.toLowerCase() === 'nhomhang' || h.toLowerCase() === 'nhóm hàng');
                        const nhomChaIdx = sheetHeaders.findIndex(h => h.toLowerCase().normalize('NFC') === 'nhomcha' || h.toLowerCase() === 'nhomcha');
                        const nhomConIdx = sheetHeaders.findIndex(h => h.toLowerCase().normalize('NFC') === 'nhomcon' || h.toLowerCase() === 'nhomcon');
                        
                        if (nhomHangIdx !== -1 && nhomChaIdx !== -1 && nhomConIdx !== -1) {
                            config.industryBiMap = {};
                            let count = 0;
                            for (let i = 1; i < rows.length; i++) {
                                const row = rows[i];
                                if (row.length > Math.max(nhomHangIdx, nhomChaIdx, nhomConIdx)) {
                                    const nganhHang = nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '';
                                    const nhomHang = String(row[nhomHangIdx] || '').trim();
                                    const nhomCha = String(row[nhomChaIdx] || '').trim();
                                    const nhomCon = String(row[nhomConIdx] || '').trim();
                                    if (nhomHang && nhomCha && nhomCon) {
                                        config.industryBiMap[nhomHang.toLowerCase()] = {
                                            parent: nhomCha,
                                            child: nhomCon
                                        };
                                        if (nganhHang) {
                                            const compoundKey = `${nganhHang.toLowerCase()}|||${nhomHang.toLowerCase()}`;
                                            config.industryBiMap[compoundKey] = {
                                                parent: nhomCha,
                                                child: nhomCon
                                            };
                                        }
                                        count++;
                                    }
                                }
                            }
                            console.log(`[Config] Đã tải ${count} phân cấp Ngành hàng BI từ sheet '${biSheetName}'.`);
                        }
                    }
                } catch (sheetError) {
                    console.warn(`[Config] Lỗi khi xử lý sheet '${biSheetName}':`, sheetError);
                }
            }
        } else {
            // Fallback to original CSV parsing for backward compatibility (if file is pure CSV)
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

export async function processShiftFile(file: File): Promise<{ map: DepartmentMap, uniqueDepartments: string[] }> {
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

                resolve({ map, uniqueDepartments: Array.from(departments).sort() });

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

/**
 * Xử lý file YCX trực tiếp trên Main Thread (Tốc độ cao cho file < 50MB)
 * Thay thế Worker để tránh overhead load thư viện.
 */
export async function processSalesFile(file: File, enableDeduplication: boolean, setStatus: StatusUpdater): Promise<DataRow[]> {
    setStatus({ message: 'Đang đọc file...', type: 'info', progress: 10 });
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        setStatus({ message: 'Đang phân tích Excel...', type: 'info', progress: 30 });
        const data = new Uint8Array(arrayBuffer);
        const XLSX = await import('xlsx');
        
        let workbook;
        try {
            // Use dense mode for memory efficiency
            workbook = XLSX.read(data, { type: 'array', cellDates: true, dense: true });
        } catch (err: any) {
            if (err?.message?.includes('Invalid HTML') || err?.message?.includes('find <table>')) {
                throw new Error("File bị lỗi cấu trúc (File HTML bị đổi đuôi xanh .xlsx). Vui lòng đảm bảo bạn đang tải lên file Excel (.xlsx) chuẩn từ hệ thống.");
            }
            throw err;
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        setStatus({ message: 'Đang chuyển đổi dữ liệu...', type: 'info', progress: 50 });
        const json: DataRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        let processedList: DataRow[] = json;

        if (enableDeduplication) {
            setStatus({ message: 'Đang xóa dữ liệu trùng...', type: 'info', progress: 70 });
            const uniqueSet = new Set<string>();
            const deduplicated: DataRow[] = [];
            
            const len = json.length;
            for (let i = 0; i < len; i++) {
                const row = json[i];
                let signature = '';
                // Fast signature generation
                for (const key in row) {
                    if (key !== 'STT_1') {
                        signature += row[key] + '§'; 
                    }
                }

                if (!uniqueSet.has(signature)) {
                    uniqueSet.add(signature);
                    deduplicated.push(row);
                }
            }
            processedList = deduplicated;
            uniqueSet.clear(); 
        }

        setStatus({ message: 'Đang chuẩn hóa dữ liệu...', type: 'info', progress: 90 });
        
        const validResults: DataRow[] = [];
        const len = processedList.length;

        const cleanAndNormalize = (val: any): string => {
            if (val === undefined || val === null) return '';
            return val.toString().trim().toLowerCase().normalize('NFC');
        };

        for (let i = 0; i < len; i++) {
            const row = processedList[i];
            
            // Inline validation logic
            const trangThaiHuy = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_HUY));
            const nhapTra = cleanAndNormalize(getRowValue(row, COL.TINH_TRANG_NHAP_TRA));
            const thuTien = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));
            const trangThaiXuat = cleanAndNormalize(getRowValue(row, COL.XUAT));
            const trangThaiGiao = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_GIAO_HANG));

            // Standard valid sales row
            const isStandardValid = (
                (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ') && 
                nhapTra === 'chưa trả' && 
                thuTien === 'đã thu'
            );

            // Uncollected/uncancelled row
            const isUncollected = (
                thuTien === 'chưa thu' && 
                trangThaiXuat === 'chưa xuất' && 
                trangThaiGiao === 'chưa giao' && 
                (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ')
            );

            if (!isStandardValid && !isUncollected) continue;

            // Normalize Date
            const parsedDate = parseExcelDate(getRowValue(row, COL.DATE_CREATED));
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                row.parsedDate = parsedDate;
                validResults.push(row);
            }
        }

        if (validResults.length === 0) {
            throw new Error("Không tìm thấy dữ liệu hợp lệ (Chưa hủy, Chưa trả, Đã thu) hoặc lỗi ngày tháng.");
        }

        setStatus({ message: 'Hoàn tất xử lý.', type: 'success', progress: 100 });
        return validResults;

    } catch (error) {
        console.error("Lỗi xử lý file:", error);
        throw error;
    }
}
