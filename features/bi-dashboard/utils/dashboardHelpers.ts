
// --- TYPES ---
export interface SupermarketCompetitionData {
    headers: string[];
    programs: { name: string; data: (string | number)[]; metric: string }[];
}

export type MainTab = 'realtime' | 'cumulative';
export type SubTab = 'revenue' | 'competition';
export type Criterion = 'DTLK' | 'DTQĐ' | 'SLLK';

/** Nhãn hiển thị của cột bảng Thi đua khi khác với tên cột trong dữ liệu — dùng chung cho bảng và
 *  popup "Bộ lọc bảng Thi đua" để 2 nơi không gọi cột bằng 2 tên khác nhau. */
const COMPETITION_COLUMN_LABELS: Record<string, string> = {
    'Realtime': 'THỰC HIỆN',
    'Realtime (QĐ)': 'THỰC HIỆN (QĐ)',
    'Target': 'TAR',
    'Target V.Trội': 'TAR V.TRỘI',
    'L.Kế': 'LUỸ KẾ',
    'L.Kế (QĐ)': 'LUỸ KẾ (QĐ)',
    '%HT': '%HT',
    '%HT V.Trội': '%HT V.TRỘI',
    '%DKHT V.Trội': '%DKHT V.TRỘI',
    '%HTDK V.Trội': '%DKHT V.TRỘI',
    '%HTDK': '%DKHT',
    '%DKHT': '%DKHT',
    'Còn Lại': 'C.LẠI',
    'CÒN LẠI': 'C.LẠI',
};

export const getCompetitionColumnLabel = (header: string): string => COMPETITION_COLUMN_LABELS[header] || header;

/** Nhãn nhóm mặc định theo tiêu chí thi đua (dùng cho cấu hình target và bảng tổng hợp thi đua). */
export const getDefaultGroupLabel = (metric: string): string =>
    metric === 'SLLK' ? 'Doanh thu' : metric === 'DTLK' ? 'Doanh thu' : metric === 'DTQĐ' ? 'Doanh thu quy đổi' : metric;

import { roundUp, parseNumber, shortenName, shortenSupermarketName } from '../../../utils/dataUtils';
export { roundUp, parseNumber, shortenName, shortenSupermarketName };

// --- TLPVTC & BILL/KHÁCH EXTRACTORS ---

/**
 * Trích xuất TLPVTC (tỷ lệ phục vụ thành công) từ văn bản dán
 * Hỗ trợ đa dạng format: có/không dấu %, có/không 'hôm nay'/'lũy kế'/'lk'/'ngày', có icon ?, khoảng trắng, v.v.
 */
export function extractTlpvFromText(text: string): string | null {
    if (!text) return null;
    const directMatch = text.match(/(?:TLPVTC|TLPV\s*Thành\s*công)(?:\s*(?:lũy kế|hôm nay|lk|ngày))?\s*(?:\?\s*)?[:\n\r\t ]*([\d,.]+)\s*(%?)/i);
    if (directMatch) {
        return directMatch[1].includes('%') ? directMatch[1] : `${directMatch[1]}%`;
    }
    const blockMatch = text.match(/(?:TLPVTC|TLPV\s*Thành\s*công)[\s\S]{1,150}?([\d,.]+)\s*%/i);
    if (blockMatch) {
        return `${blockMatch[1]}%`;
    }
    return null;
}

/**
 * Trích xuất Lượt Bill và Lượt Khách từ thẻ TLPVTC hoặc văn bản dán
 * Hỗ trợ các định dạng:
 * - '334 bill / 1,497 khách'
 * - '334 bill   1,497 khách' (hai thẻ riêng biệt như trên portal MWG mới)
 * - '334 bill\n1,497 khách'
 * - '334 bill | 1,497 khách'
 * - '334 bill · 1,497 khách'
 */
export function extractBillAndKhachFromText(text: string): { bill: string | null; khach: string | null } {
    if (!text) return { bill: null, khach: null };
    let bill: string | null = null;
    let khach: string | null = null;

    const combined1 = text.match(/([\d,.]+)\s*bill\s*(?:[\/|·\n\r\t, -]+)\s*([\d,.]+)\s*khách/i);
    const combined2 = text.match(/([\d,.]+)\s*khách\s*(?:[\/|·\n\r\t, -]+)\s*([\d,.]+)\s*bill/i);

    if (combined1) {
        bill = combined1[1];
        khach = combined1[2];
    } else if (combined2) {
        khach = combined2[1];
        bill = combined2[2];
    } else {
        const tlpvIdx = text.search(/TLPVTC|TLPV\s*Thành\s*công/i);
        const searchScope = tlpvIdx !== -1 ? text.slice(tlpvIdx, tlpvIdx + 300) : text;

        const bMatch = searchScope.match(/([\d,.]+)\s*(?:bill|lượt bill|hóa đơn)/i);
        const kMatch = searchScope.match(/([\d,.]+)\s*(?:khách|lượt khách)/i);
        if (bMatch) bill = bMatch[1];
        if (kMatch) khach = kMatch[1];
    }

    return { bill, khach };
}

// --- DATA PARSERS ---

export const parseSummaryData = (text: string, fallbackStoreName?: string) => {
    if (!text) return { kpis: {}, table: { headers: [], rows: [] } };
    const lines = text.split('\n');
    const kpis: Record<string, string> = {};
    
    // 1. KPI Regexes (Legacy)
    const legacyKpiRegexes: Record<string, RegExp> = {
        dtlk: /DTLK\s+DTLK\s+([\d,.]+)/,
        dtqd: /Doanh thu quy đổi\s+DTQĐ\s+([\d,.]+)/,
        targetQD: /Target \(QĐ\)\s+([\d,.]+)/,
        htTargetQD: /% HT Target \(QĐ\)\s+([\d,.]+%)/,
        tyTrongTraGop: /(?:Tỷ Trọng Trả (?:Góp|Chậm)|%TC|% Trả (?:Góp|Chậm))\s+([\d,.]+%)/,
        dtDuKien: /DT Dự Kiến\s+([\d,.]+)/,
        dtDuKienQD: /DT Dự Kiến \(QĐ\)\s+([\d,.]+)/,
        htTargetDuKienQD: /% HT Target Dự Kiến \(QĐ\)\s+([\d,.]+%)/,
        lkhach: /Lượt Khách LK\s+([\d,.]+)/,
        lbill: /Lượt bill\s+([\d,.]+)/,
        lbillBH: /Lượt Bill Bán Hàng\s+([\d,.]+)/,
        lbillTH: /Lượt Bill Thu Hộ\s+([\d,.]+)/,
        tlpv: /TLPV Thành công\s+([\d,.]+%)/,
        luotKhachChange: /\+\/- Lượt Khách\s+(?:\+\/- Lượt Khách\s+)?([-+\d,.]+%)/,
        tlpvChange: /\+\/- TLPVTC\s+(?:\+\/- TLPVTC\s+)?([-+\d,.]+%)/,
        traGopChange: /\+\/- (?:Tỷ Trọng Trả (?:Góp|Chậm)|%TC|% Trả (?:Góp|Chậm))\s+(?:\+\/- (?:Tỷ Trọng Trả (?:Góp|Chậm)|%TC|% Trả (?:Góp|Chậm))\s+)?([-+\d,.]+%)/,
        dtckThangQD: /\+\/- DTCK Tháng \(QĐ\)\s+(?:\+\/- DTCK Tháng \(QĐ\)\s+)?([-+\d,.]+%)/,
    };

    for (const key in legacyKpiRegexes) {
        const match = text.match(legacyKpiRegexes[key]);
        if (match && match[1]) kpis[key] = match[1];
    }

    // 2. New Portal KPI Regexes (Revenue-consolidated)
    if (!kpis.dtqd) {
        const m = text.match(/DT quy đổi\s+([\d,.]+)/i);
        if (m) kpis.dtqd = m[1];
    }
    if (!kpis.htTargetQD) {
        const m = text.match(/% HT target(?:\s*\([A-Z]+\))?\s*(?:\?\s*)?([\d,.]+%?)/i);
        if (m) kpis.htTargetQD = m[1].includes('%') ? m[1] : `${m[1]}%`;
    }
    if (!kpis.targetQD) {
        const m = text.match(/Target trọn kỳ\s+([\d,.]+)/i);
        if (m) kpis.targetQD = m[1];
    }
    if (!kpis.dtDuKienQD) {
        const m = text.match(/DT dự kiến\s*(?:\?\s*)?([\d,.]+)/i);
        if (m) {
            kpis.dtDuKienQD = m[1];
            if (!kpis.dtDuKien) kpis.dtDuKien = m[1];
        }
    }
    if (!kpis.tlpv) {
        const tlpvVal = extractTlpvFromText(text);
        if (tlpvVal) kpis.tlpv = tlpvVal;
    }
    if (!kpis.lbill || !kpis.lkhach || !kpis.lbillBH) {
        const { bill, khach } = extractBillAndKhachFromText(text);
        if (bill) {
            kpis.lbill = bill;
            kpis.lbillBH = bill;
        }
        if (khach) {
            kpis.lkhach = khach;
        }
    }
    if (!kpis.lbillBH && kpis.lbill) {
        kpis.lbillBH = kpis.lbill;
    }
    if (!kpis.tyTrongTraGop) {
        const m = text.match(/Tỉ trọng trả góp\s+([\d,.]+%?)/i);
        if (m) kpis.tyTrongTraGop = m[1].includes('%') ? m[1] : `${m[1]}%`;
    }
    if (!kpis.dtlk) {
        const m = text.match(/DT trả góp\s+([\d,.]+)\s*\/\s*([\d,.]+)/i);
        if (m) {
            kpis.dtTraGop = m[1];
            kpis.dtlk = m[2];
        }
    }
    if (!kpis.dtckThangQD) {
        const m = text.match(/TT vs TB 3 tháng\s*(?:\?\s*)?([-+\d,.]+%?)/i);
        if (m) kpis.dtckThangQD = m[1].includes('%') ? m[1] : `${m[1]}%`;
    }
    if (!kpis.tb3t) {
        const m = text.match(/TB3T cùng cửa sổ:\s*([\d,.]+)/i);
        if (m) kpis.tb3t = m[1];
    }
    
    // 3. Legacy Table Parsing
    let headerIndex = lines.findIndex(line => line.trim().startsWith('Tên miền\t'));
    if (headerIndex !== -1) {
        const headers = lines[headerIndex].trim().split('\t');
        const rows: string[][] = [];
        const secondHeaderIndex = lines.findIndex((line, index) => index > headerIndex && line.trim().startsWith('Tên miền\t'));
        const endIndex = secondHeaderIndex !== -1 ? secondHeaderIndex : lines.length;

        for (let i = headerIndex + 1; i < endIndex; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split('\t');
            const firstCol = parts[0]?.trim() || '';

            // LOẠI BỎ CÁC DÒNG RÁC:
            if (firstCol.includes('(097.') || firstCol === '0%' || firstCol.includes('Hỗ trợ BI')) {
                continue;
            }

            if (firstCol === 'Tổng' || firstCol.startsWith('ĐM') || firstCol.startsWith('TGD') || (firstCol.includes(' - ') && !firstCol.includes(' liên hệ '))) {
                rows.push(parts);
            } else if(line.startsWith('Hỗ trợ BI')) {
                break;
            }
        }
        return { kpis, table: { headers, rows } };
    }

    // 4. New Portal Table Parsing (Revenue-consolidated)
    const standardHeaders = [
        'Tên miền',
        'Số lượng',
        'DTQĐ',
        '% Tỉ trọng',
        'DTLK',
        'Target (QĐ)',
        '% HT Target (QĐ)',
        'TB 3 Tháng',
        '+/- DTCK Tháng (QĐ)',
        'DT TRẢ GÓP',
        'Tỷ Trọng Trả Góp',
    ];

    // Find table start: line with 'Siêu thị' or 'SIÊU THỊ' followed by 'SỐ LƯỢNG' and 'DOANH THU QĐ'
    let smHeaderLineIndex = -1;
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx].trim();
        if (line === 'Siêu thị' || line === 'SIÊU THỊ') {
            const nextNonEmpty = lines.slice(idx + 1).map(l => l.trim()).filter(Boolean);
            if (nextNonEmpty[0]?.toUpperCase().includes('SỐ LƯỢNG') && 
                nextNonEmpty[1]?.toUpperCase().includes('DOANH THU QĐ')) {
                smHeaderLineIndex = idx;
                break;
            }
        } else if (line.startsWith('Siêu thị\t') || line.startsWith('SIÊU THỊ\t')) {
            if (line.toUpperCase().includes('DOANH THU QĐ') || line.toUpperCase().includes('DOANH THU')) {
                smHeaderLineIndex = idx;
                break;
            }
        }
    }

    if (smHeaderLineIndex === -1) {
        // Fallback: Nếu không có bảng "Siêu thị" nhưng có bảng "NGÀNH HÀNG BI / NHÓM HÀNG BI"
        const hasIndustryTable = lines.some(l => {
            const u = l.toUpperCase();
            return (u.includes('NGÀNH HÀNG') && u.includes('NHÓM HÀNG')) || u.includes('NGÀNH HÀNG BI');
        });

        if (hasIndustryTable) {
            let totSL = '0', totDTQD = kpis.dtqd || '0', totTiTrong = '100.0%';
            let totDTLK = kpis.dtlk || '0', totTarget = kpis.targetQD || '—', totHTTarget = kpis.htTargetQD || '—';
            let totTB3T = kpis.tb3t || '0', totDTCK = kpis.dtckThangQD || '0%', totDTTG = kpis.dtTraGop || '0', totTLTG = kpis.tyTrongTraGop || '0%';

            for (let idx = 0; idx < lines.length; idx++) {
                const line = lines[idx].trim();
                if (line.startsWith('Tổng')) {
                    if (line.includes('\t')) {
                        const parts = line.split('\t').map(p => p.trim());
                        if (parts.length >= 8) {
                            totSL = parts[1] || totSL;
                            totDTQD = parts[2] || totDTQD;
                            totTiTrong = parts[3] || totTiTrong;
                            totDTLK = parts[4] || totDTLK;
                            totTB3T = parts[5] || totTB3T;
                            totDTCK = parts[6] || totDTCK;
                            totDTTG = parts[7] || totDTTG;
                            totTLTG = parts[8] || totTLTG;
                        }
                    } else {
                        const nextLines = lines.slice(idx + 1, idx + 10).map(l => l.trim()).filter(Boolean);
                        if (nextLines.length >= 8) {
                            totSL = nextLines[0] || totSL;
                            totDTQD = nextLines[1] || totDTQD;
                            totTiTrong = nextLines[2] || totTiTrong;
                            totDTLK = nextLines[3] || totDTLK;
                            totTB3T = nextLines[4] || totTB3T;
                            totDTCK = nextLines[5] || totDTCK;
                            totDTTG = nextLines[6] || totDTTG;
                            totTLTG = nextLines[7] || totTLTG;
                        }
                    }
                    break;
                }
            }

            // Tự động nhận diện tên siêu thị thực tế từ toàn bộ các dòng trong báo cáo (thay vì gán cứng HÙNG VƯƠNG)
            const detectedStoreName = detectSupermarketNameFromReport(text) || '';
            const finalStoreName = detectedStoreName || (fallbackStoreName ? fallbackStoreName.trim() : 'Siêu thị');

            const storeRow = [
                finalStoreName,
                totSL,
                totDTQD,
                totTiTrong,
                totDTLK,
                totTarget,
                totHTTarget,
                totTB3T,
                totDTCK,
                totDTTG,
                totTLTG,
            ];
            const summaryRow = [
                'Tổng',
                totSL,
                totDTQD,
                totTiTrong,
                totDTLK,
                totTarget,
                totHTTarget,
                totTB3T,
                totDTCK,
                totDTTG,
                totTLTG,
            ];
            return { kpis, table: { headers: standardHeaders, rows: [storeRow, summaryRow] } };
        }

        return { kpis, table: { headers: [], rows: [] } };
    }

    const rows: string[][] = [];
    const cleanedLines = lines.slice(smHeaderLineIndex).map(l => l.trim()).filter(Boolean);
    
    let dataStartIndex = 1;
    if (cleanedLines[0].includes('\t')) {
        dataStartIndex = 1;
    } else {
        let idx = 0;
        while (idx < cleanedLines.length && idx < 15) {
            const upper = cleanedLines[idx].toUpperCase();
            if (upper === '% TRẢ GÓP' || upper === '% TRẢ CHẬM' || upper.includes('TRẢ GÓP')) {
                idx++;
                break;
            }
            idx++;
        }
        dataStartIndex = idx;
    }

    const isStoreEntity = (str: string) => {
        if (!str) return false;
        const s = str.trim();
        if (s.startsWith('Tổng')) return true;
        if (s.includes(':') || s.includes('http') || s.includes('bill') || s.includes('triệu đồng') || s.includes('nhịp')) return false;
        return /^\d+\s*-\s*/.test(s) || s.startsWith('ĐM') || s.startsWith('TGD') || (s.includes(' - ') && !s.includes('liên hệ'));
    };

    let i = dataStartIndex;
    while (i < cleanedLines.length) {
        const line = cleanedLines[i];
        if (line.startsWith('Đơn vị:') || line.startsWith('Tỉ trọng tính') || line.includes('Đã copy xong') || line.includes('Đang chọn')) {
            break;
        }

        // Case 1: Tab-separated line with >= 10 parts
        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length >= 10 && isStoreEntity(parts[0])) {
                let name = parts[0];
                if (name.startsWith('Tổng')) name = 'Tổng';
                rows.push([name, ...parts.slice(1)]);
                i++;
                continue;
            }
        }

        // Case 2: Store name on this line, and next line has tab-separated metrics
        const nextLine = cleanedLines[i + 1] || '';
        if (isStoreEntity(line) && nextLine.includes('\t')) {
            const nextParts = nextLine.split('\t').map(p => p.trim());
            if (nextParts.length >= 10) {
                let name = line;
                if (name.startsWith('Tổng')) name = 'Tổng';
                rows.push([name, ...nextParts]);
                i += 2;
                continue;
            }
        }

        // Case 3: Cell-by-cell (store name + next 10 lines of metrics)
        if (isStoreEntity(line) && i + 10 < cleanedLines.length) {
            let name = line;
            if (name.startsWith('Tổng')) name = 'Tổng';
            const metrics: string[] = [];
            let valid = true;
            for (let j = 1; j <= 10; j++) {
                const val = cleanedLines[i + j];
                if (isStoreEntity(val) || val.startsWith('Đơn vị:') || val.includes('\t')) {
                    valid = false;
                    break;
                }
                metrics.push(val);
            }
            if (valid) {
                rows.push([name, ...metrics]);
                i += 11;
                continue;
            }
        }

        i++;
    }

    return { kpis, table: { headers: standardHeaders, rows } };
};

/**
 * Kiểm tra chuỗi có phải là dòng định dạng nhân viên MWG (Mã NV - Họ Tên, VD: "276650 - Quách Trần Phương Thảo").
 * Mã NV thường là dãy số 3-8 chữ số theo sau bởi dấu '-' và họ tên nhân viên (không có từ khoá siêu thị/kho).
 */
export const isEmployeeName = (text: string): boolean => {
    if (!text) return false;
    const trimmed = text.trim();
    // Trường hợp tài khoản hệ thống đặc biệt
    if (/^online\s*-\s*/i.test(trimmed)) {
        return true;
    }
    // Mã NV MWG là dãy 4-8 chữ số (VD: 276650, 17952, 7587...).
    // Mã 3-4 chữ số cũng có thể là mã kho/siêu thị (VD: 910, 1032, 3717...).
    const empMatch = trimmed.match(/^(\d{4,8})\s*-\s*(.+)$/);
    if (empMatch) {
        const afterDash = empMatch[2].trim();
        // Nếu sau dấu '-' còn có dấu '-' nữa (VD: "910 - ĐML_STR_STR - 99 Hùng Vương") thì chắc chắn là siêu thị
        if (afterDash.includes(' - ')) {
            return false;
        }
        // Nếu sau dấu '-' là tên siêu thị/kho (bắt đầu bằng từ khoá + ranh giới/phân cách rõ ràng) thì là siêu thị
        // Lưu ý: Dùng [\\s_\\-:\\d]|$ thay vì \\b vì ký tự tiếng Việt có dấu (như 'ế' trong 'Chế') bị regex coi là \\W, gây nhầm 'Ch' thành từ riêng
        if (/^(?:ĐMX|DMX|ĐML_|DML_|ĐML|DML|ĐM|DM|TGDĐ|TGDD|TGD|KHO|CH|STR|SIÊU\s*THỊ|CHI\s*NHÁNH|BHX)(?:[\s_\-:\d]|$)/i.test(afterDash)) {
            return false;
        }
        if (afterDash.includes('STR_') || afterDash.toLowerCase().includes('siêu thị') || afterDash.toLowerCase().includes('chi nhánh')) {
            return false;
        }
        return true;
    }
    return false;
};

export const parseCompetitionDataBySupermarket = (text: string) => {
    if (!text) return {};
    const supermarketData: Record<string, SupermarketCompetitionData> = {};
    const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(l => l);
    
    let currentCompetition: string | null = null;
    let currentHeaders: string[] = [];
    let currentMetric: string = '';
    let lastEntityName: string | null = null;

    const isMetricHeader = (name: string) => {
        const clean = name.trim().toUpperCase();
        return clean === 'DOANH THU' || clean === 'DOANH THU (RT)' || 
               clean === 'SỐ LƯỢNG' || clean === 'SỐ LƯỢNG (RT)' || 
               clean === 'DTLK' || clean === 'DTQĐ' || clean === 'SLLK' || 
               clean === 'DT REALTIME' || clean === 'SL REALTIME';
    };

    const isHeaderLine = (line: string) => {
        const lower = line.toLowerCase();
        return (lower.includes('target') || lower.includes('% ht')) && 
               (lower.includes('doanh thu') || lower.includes('số lượng') || lower.includes('dt') || lower.includes('sl') || lower.includes('hạng') || lower.includes('dự báo'));
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip metadata
        if (line.includes('http') || line.includes('Dashboards') || line.includes('Tìm báo cáo') ||
            line.includes('Cập nhật lúc') || line.includes('webview') || line.includes('Xuất Excel') ||
            line.includes('chương trình') || line.includes('Toàn công ty') || line.includes('Đang chọn') ||
            (line.includes('Lũy kế') && line.length < 15) || (line.includes('Realtime') && line.length < 15) ||
            line.includes('Danh sách') || line.includes('Ma trận') || line.includes('Tải lại') ||
            line.includes('Xuất theo mẫu') || line.includes('Chép link') || line.includes('Chi phí chăm sóc') ||
            line.includes('Lượt bill TGDĐ') || line.includes('Báo cáo') || line.includes('Employee') || line.includes('employee')) {
            continue;
        }

        // Bỏ qua dòng nhân viên (VD: "276650 - Quách Trần Phương Thảo") — tuyệt đối không nhận diện nhân viên là siêu thị!
        if (isEmployeeName(line)) {
            lastEntityName = null;
            continue;
        }

        // Check if legacy format: Program Name and Headers on the SAME tab-separated line
        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length > 2 && isHeaderLine(line) && !isMetricHeader(parts[0])) {
                currentCompetition = parts[0];
                currentHeaders = parts.slice(1);
                const firstHeader = parts[1].toUpperCase();
                // Giữ SLLK cho SỐ LƯỢNG để hiển thị đúng đơn vị (Cái), nhưng gom cùng nhóm DTLK
                if (firstHeader.includes('QĐ') || firstHeader.includes('QD')) currentMetric = 'DTQĐ';
                else if (firstHeader.includes('SỐ LƯỢNG') || firstHeader === 'SLLK' || firstHeader === 'SL REALTIME') currentMetric = 'SLLK';
                else currentMetric = 'DTLK';
                continue;
            }
        }

        // Check if header in new format (e.g. "DOANH THU \t TARGET \t % HT THÁNG ...")
        if (isHeaderLine(line)) {
            const parts = line.split('\t').map(p => p.trim());
            currentHeaders = parts;
            const firstH = parts[0]?.toUpperCase() || '';
            // Giữ SLLK cho SỐ LƯỢNG để hiển thị đúng đơn vị (Cái), nhưng gom cùng nhóm DTLK
            if (firstH.includes('QĐ') || firstH.includes('QD')) currentMetric = 'DTQĐ';
            else if (firstH.includes('SỐ LƯỢNG') || firstH === 'SLLK' || firstH === 'SL REALTIME') currentMetric = 'SLLK';
            else currentMetric = 'DTLK';
            continue;
        }

        // Check if this line is a Program Name (e.g. "Nồi cơm", "Sim Tổng", "Tivi")
        if (i + 1 < lines.length && isHeaderLine(lines[i + 1])) {
            currentCompetition = line;
            continue;
        }

        // If line is an entity name (e.g. "TỔNG", "ĐML_STR_STR - 99 Hùng Vương", "DMX Cần Thơ", "1234 - ĐM...")
        const isEntity = line.toUpperCase() === 'TỔNG' || 
                         /^(?:ĐMX|DMX|ĐML_|DML_|ĐML|DML|ĐM|DM|TGDĐ|TGDD|TGD|KHO|CH|STR|SIÊU\s*THỊ|CHI\s*NHÁNH|BHX)(?:[\s_\-:\d]|$)/i.test(line) ||
                         /^\d+\s*-\s*(?:ĐMX|DMX|ĐML_|DML_|ĐML|DML|ĐM|DM|TGDĐ|TGDD|TGD|KHO|CH|STR|SIÊU\s*THỊ|CHI\s*NHÁNH|BHX)(?:[\s_\-:\d]|$)/i.test(line) ||
                         (!isEmployeeName(line) && line.includes(' - ') && !line.includes(':') && !line.includes('/') && !line.includes('%') && !/^\d{3,8}\s*-/.test(line));

        if (isEntity) {
            // Check if tab-separated on same line with numbers
            if (line.includes('\t')) {
                const parts = line.split('\t').map(p => p.trim());
                if (parts.length > 1 && (/^-?[\d.,]+%?$/.test(parts[1]) || parts[1] === '-')) {
                    const smName = parts[0];
                    if (currentCompetition) {
                        if (!supermarketData[smName]) {
                            supermarketData[smName] = { headers: currentHeaders, programs: [] };
                        }
                        supermarketData[smName].headers = currentHeaders;
                        supermarketData[smName].programs.push({
                            name: currentCompetition,
                            data: parts.slice(1),
                            metric: currentMetric
                        });
                    }
                    continue;
                }
            }
            lastEntityName = line;
            continue;
        }

        // If line contains numbers/data (tab-separated or values)
        if (currentCompetition && lastEntityName) {
            const parts = line.split('\t').map(p => p.trim());
            if (/^-?[\d.,]+%?$/.test(parts[0]) || parts[0] === '-' || parts[0] === '—') {
                const smName = lastEntityName;
                if (!supermarketData[smName]) {
                    supermarketData[smName] = { headers: currentHeaders, programs: [] };
                }
                supermarketData[smName].headers = currentHeaders;
                supermarketData[smName].programs.push({
                    name: currentCompetition,
                    data: parts,
                    metric: currentMetric
                });
                lastEntityName = null;
            }
        }
    }

    for (const sm in supermarketData) {
        supermarketData[sm].programs.sort((a, b) => a.name.localeCompare(b.name));
    }
    return supermarketData;
};

export const isLevel0 = (name: string): boolean => {
    const clean = name.trim().toUpperCase();
    if (clean.startsWith('NNH ')) return true;
    const level0Names = new Set([
        'VAS',
        'PHỤ KIỆN',
        'TABLET',
        'ĐIỆN THOẠI',
        'LAPTOP',
        'ĐỒNG HỒ',
        'ỐP LƯNG',
        'GIA DỤNG',
        'ĐIỆN LẠNH',
        'ĐIỆN TỬ',
        'XE ĐẠP',
        'MÁY CŨ',
        'MẸ VÀ BÉ',
        'ICT',
        'BẢO HÀNH',
        'ĐIỆN THOẠI CŨ',
        'LAPTOP CŨ',
        'PHÂN KHU KHÁC',
        'THIẾT BỊ VĂN PHÒNG',
        'ĐIỆN THOẠI - TABLET',
        'ĐIỆN THOẠI & TABLET',
        'PHỤ KIỆN LAPTOP',
        'PHỤ KIỆN ĐIỆN THOẠI',
        'PHỤ KIỆN KHÁC',
        'MÁY LẠNH',
        'TỦ LẠNH',
        'MÁY GIẶT',
        'TIVI',
        'GIA DỤNG NHÀ BẾP'
    ]);
    return level0Names.has(clean);
};

// --- INDUSTRY TREE TYPES ---
export interface IndustryTreeNode {
    name: string;
    values: string[];
    children: IndustryTreeNode[];
    level: number; // 0=Ngành hàng (NNH), 1=Nhóm hàng, 2=Hãng
}

export function aggregateTreeNodes(nodes: IndustryTreeNode[], headers: string[]) {
    // Column indices
    const slIdx = headers.findIndex(h => h === 'SL Realtime' || h === 'Số lượng');
    const dtqdIdx = headers.findIndex(h => h === 'DT Realtime (QĐ)' || h === 'DTQĐ');
    const targetIdx = headers.findIndex(h => h === 'Target Ngày (QĐ)' || h === 'Target (QĐ)');
    const htIdx = headers.findIndex(h => h === '% HT Target Ngày (QĐ)' || h === '% HT Target (QĐ)');
    const dtgIdx = headers.findIndex(h => h === 'DT Trả Gộp' || h === 'DT TRẢ GÓP' || h === 'DT Trả Góp' || h === 'DTTRẢGÓP' || h === 'DT TRẢ CHẬM' || h === 'DT Trả Chậm');
    const ttgIdx = headers.findIndex(h => h === 'Tỷ Trọng Trả Góp' || h === 'Tỷ Trọng Trả Chậm');
    const dgIdx = headers.findIndex(h => h === 'Đơn giá' || h === 'ĐƠN GIÁ');
    const dtckIdx = headers.findIndex(h => h === '+/- DTCK Tháng (QĐ)');
    const lgIdx = headers.findIndex(h => h === 'Lãi gộp QĐ');

    const computeDerived = (values: string[]) => {
        if (htIdx >= 0 && dtqdIdx >= 0 && targetIdx >= 0) {
            const dtqd = parseNumber(values[dtqdIdx]);
            const target = parseNumber(values[targetIdx]);
            const pct = target > 0 ? Math.round((dtqd / target) * 100) : 0;
            values[htIdx] = pct !== 0 ? `${pct}%` : '0%';
        }
        if (ttgIdx >= 0 && dtgIdx >= 0 && dtqdIdx >= 0) {
            const dtg = parseNumber(values[dtgIdx]);
            const dtqd = parseNumber(values[dtqdIdx]);
            const pct = dtqd > 0 ? Math.round((dtg / dtqd) * 100) : 0;
            values[ttgIdx] = pct !== 0 ? `${pct}%` : '0%';
        }
        if (dgIdx >= 0 && dtqdIdx >= 0 && slIdx >= 0) {
            const dtqd = parseNumber(values[dtqdIdx]);
            const sl = parseNumber(values[slIdx]);
            values[dgIdx] = sl > 0 ? String(Math.round(dtqd / sl)) : '0';
        }
    };

    const aggregateNode = (node: IndustryTreeNode) => {
        // Recursively aggregate children first
        node.children.forEach(aggregateNode);

        if (node.level === 0) {
            // Level 0: sum from children (Level 1)
            const values = [...node.values];
            for (let i = 1; i < headers.length; i++) {
                if (i === slIdx || i === dtqdIdx || i === targetIdx || i === dtgIdx || i === lgIdx) {
                    const total = node.children.reduce((sum, child) => sum + parseNumber(child.values[i]), 0);
                    values[i] = String(total);
                }
            }

            // Compute growth rate +/- DTCK for Level 0
            if (dtckIdx >= 0 && dtqdIdx >= 0) {
                let sumDTCK = 0;
                let totalDtqd = 0;
                node.children.forEach(child => {
                    const childDtqd = parseNumber(child.values[dtqdIdx]);
                    const childGrowth = parseNumber(child.values[dtckIdx]);
                    const childDTCK = childDtqd / (1 + childGrowth / 100);
                    sumDTCK += childDTCK;
                    totalDtqd += childDtqd;
                });
                const pct = sumDTCK > 0 ? Math.round(((totalDtqd - sumDTCK) / sumDTCK) * 100) : 0;
                values[dtckIdx] = pct !== 0 ? `${pct}%` : '0%';
            }

            computeDerived(values);
            node.values = values;
        } else if (node.level === 1) {
            const values = [...node.values];

            // For Level 1, we also want to compute +/- DTCK from its children (Level 2 brands)
            if (dtckIdx >= 0 && dtqdIdx >= 0 && node.children.length > 0) {
                let sumDTCK = 0;
                let totalDtqd = 0;
                node.children.forEach(child => {
                    const childDtqd = parseNumber(child.values[dtqdIdx]);
                    const childGrowth = parseNumber(child.values[dtckIdx]);
                    const childDTCK = childDtqd / (1 + childGrowth / 100);
                    sumDTCK += childDTCK;
                    totalDtqd += childDtqd;
                });
                const pct = sumDTCK > 0 ? Math.round(((totalDtqd - sumDTCK) / sumDTCK) * 100) : 0;
                values[dtckIdx] = pct !== 0 ? `${pct}%` : '0%';
            }

            computeDerived(values);
            node.values = values;
        } else if (node.level === 2) {
            const values = [...node.values];
            computeDerived(values);
            node.values = values;
        }
    };

    nodes.forEach(aggregateNode);
}

export function buildIndustryTree(
    allDataRows: string[][],
    headers: string[],
    industryBiMap: Record<string, { parent: string; child: string }> | null | undefined
): { tree: IndustryTreeNode[]; tableRows: string[][]; totalRow: string[] | null } {
    let totalRow: string[] | null = null;
    
    // Find the total row
    const foundTotal = allDataRows.find(r => (r[0] || '').trim() === 'Tổng');
    if (foundTotal) {
        totalRow = foundTotal;
    }

    const dataRowsWithoutTotal = allDataRows.filter(r => (r[0] || '').trim() !== 'Tổng');

    if (!industryBiMap || Object.keys(industryBiMap).length === 0) {
        // Fallback to original parsing if industryBiMap is not loaded/available yet
        const originalTree: IndustryTreeNode[] = [];
        const targetIndex = headers.indexOf(headers.includes('Target Ngày (QĐ)') ? 'Target Ngày (QĐ)' : 'Target (QĐ)');
        const laiGopIndex = headers.indexOf('Lãi gộp QĐ');
        
        let currentNNH: IndustryTreeNode | null = null;
        let currentNhomHang: IndustryTreeNode | null = null;

        const flushNhomHang = () => {
            if (currentNhomHang && currentNNH) {
                currentNNH.children.push(currentNhomHang);
                currentNhomHang = null;
            }
        };

        const flushNNH = () => {
            flushNhomHang();
            if (currentNNH) {
                originalTree.push(currentNNH);
                currentNNH = null;
            }
        };

        for (const row of dataRowsWithoutTotal) {
            const name = (row[0] || '').trim();
            if (isLevel0(name)) {
                flushNNH();
                currentNNH = { name, values: row, children: [], level: 0 };
                continue;
            }
            if (!currentNNH) continue;

            const targetVal = targetIndex >= 0 && row[targetIndex] ? parseNumber(row[targetIndex]) : 0;
            const laiGopVal = laiGopIndex >= 0 && row[laiGopIndex] ? parseNumber(row[laiGopIndex]) : 0;

            if (targetVal > 0.001 || laiGopVal > 0.001) {
                flushNhomHang();
                currentNhomHang = { name, values: row, children: [], level: 1 };
            } else {
                if (currentNhomHang) {
                    currentNhomHang.children.push({ name, values: row, children: [], level: 2 });
                } else {
                    currentNNH.children.push({ name, values: row, children: [], level: 1 });
                }
            }
        }
        flushNNH();

        const tableRows = dataRowsWithoutTotal.filter(r => isLevel0(r[0] || ''));

        return { tree: originalTree, tableRows, totalRow };
    }

    const nnhMap = new Map<string, IndustryTreeNode>(); // Key: NhomCha (lowercase)
    const nhomConMaps = new Map<string, Map<string, IndustryTreeNode>>(); // Key: NhomCha (lowercase), Value: Map of NhomCon (lowercase) -> Nhóm hàng Node
    const brandMaps = new Map<string, Map<string, IndustryTreeNode>>(); // Key: childKey, Value: Map of brandName (lowercase) -> Brand Node
    const nnhOrder: string[] = [];

    // Column indices for summation
    const slIdx = headers.findIndex(h => h === 'SL Realtime' || h === 'Số lượng');
    const dtqdIdx = headers.findIndex(h => h === 'DT Realtime (QĐ)' || h === 'DTQĐ');
    const targetIdx = headers.findIndex(h => h === 'Target Ngày (QĐ)' || h === 'Target (QĐ)');
    const dtgIdx = headers.findIndex(h => h === 'DT Trả Gộp' || h === 'DT TRẢ GÓP' || h === 'DT Trả Góp' || h === 'DTTRẢGÓP' || h === 'DT TRẢ CHẬM' || h === 'DT Trả Chậm');
    const lgIdx = headers.findIndex(h => h === 'Lãi gộp QĐ');

    let activeNhomConNode: IndustryTreeNode | null = null;
    let activeChildKey: string | null = null;
    let currentNnhHeader = '';

    for (const row of dataRowsWithoutTotal) {
        const name = (row[0] || '').trim();
        const lowerName = name.toLowerCase();
        
        const isParentRow = name.startsWith('NNH ') || isLevel0(name);
        if (isParentRow) {
            currentNnhHeader = name;
            continue;
        }

        const compoundKey = `${currentNnhHeader.toLowerCase()}|||${lowerName}`;
        const mapInfo = industryBiMap[compoundKey] || industryBiMap[lowerName];
        
        if (mapInfo) {
            const parentName = mapInfo.parent.trim(); // Ngành hàng
            const childName = mapInfo.child.trim();   // Nhóm hàng
            const parentKey = parentName.toLowerCase();
            const childKey = childName.toLowerCase();

            let nnhNode = nnhMap.get(parentKey);
            if (!nnhNode) {
                nnhNode = {
                    name: parentName,
                    values: headers.map((_h, i) => i === 0 ? parentName : '0'),
                    children: [],
                    level: 0
                };
                nnhMap.set(parentKey, nnhNode);
                nnhOrder.push(parentKey);
                nhomConMaps.set(parentKey, new Map());
            }

            const nhomConMap = nhomConMaps.get(parentKey)!;
            let nhomConNode = nhomConMap.get(childKey);
            if (!nhomConNode) {
                nhomConNode = {
                    name: childName,
                    values: headers.map((_h, i) => i === 0 ? childName : '0'),
                    children: [],
                    level: 1
                };
                nhomConMap.set(childKey, nhomConNode);
                nnhNode.children.push(nhomConNode);
            }

            // Sum the group row's values into nhomConNode
            for (let i = 1; i < headers.length; i++) {
                if (i === slIdx || i === dtqdIdx || i === targetIdx || i === dtgIdx || i === lgIdx) {
                    nhomConNode.values[i] = String(parseNumber(nhomConNode.values[i]) + parseNumber(row[i]));
                }
            }

            activeNhomConNode = nhomConNode;
            activeChildKey = childKey;
        } else {
            // This is a brand row!
            if (activeNhomConNode && activeChildKey) {
                let brandMap = brandMaps.get(activeChildKey);
                if (!brandMap) {
                    brandMap = new Map();
                    brandMaps.set(activeChildKey, brandMap);
                }

                let brandNode = brandMap.get(lowerName);
                if (brandNode) {
                    // Sum/merge brand values if it appears multiple times under the same NhomCon
                    for (let i = 1; i < headers.length; i++) {
                        if (i === slIdx || i === dtqdIdx || i === targetIdx || i === dtgIdx || i === lgIdx) {
                            brandNode.values[i] = String(parseNumber(brandNode.values[i]) + parseNumber(row[i]));
                        }
                    }
                } else {
                    brandNode = {
                        name: name,
                        values: [...row],
                        children: [],
                        level: 2
                    };
                    brandMap.set(lowerName, brandNode);
                    activeNhomConNode.children.push(brandNode);
                }
            } else {
                // Fallback for orphan rows
                const fallbackParent = 'KHÁC';
                const fallbackChild = 'KHÁC';
                const parentKey = fallbackParent.toLowerCase();
                const childKey = fallbackChild.toLowerCase();

                let nnhNode = nnhMap.get(parentKey);
                if (!nnhNode) {
                    nnhNode = {
                        name: fallbackParent,
                        values: headers.map((_h, i) => i === 0 ? fallbackParent : '0'),
                        children: [],
                        level: 0
                    };
                    nnhMap.set(parentKey, nnhNode);
                    nnhOrder.push(parentKey);
                    nhomConMaps.set(parentKey, new Map());
                }

                const nhomConMap = nhomConMaps.get(parentKey)!;
                let nhomConNode = nhomConMap.get(childKey);
                if (!nhomConNode) {
                    nhomConNode = {
                        name: fallbackChild,
                        values: headers.map((_h, i) => i === 0 ? fallbackChild : '0'),
                        children: [],
                        level: 1
                    };
                    nhomConMap.set(childKey, nhomConNode);
                    nnhNode.children.push(nhomConNode);
                }

                let brandMap = brandMaps.get(childKey);
                if (!brandMap) {
                    brandMap = new Map();
                    brandMaps.set(childKey, brandMap);
                }

                let brandNode = brandMap.get(lowerName);
                if (brandNode) {
                    for (let i = 1; i < headers.length; i++) {
                        if (i === slIdx || i === dtqdIdx || i === targetIdx || i === dtgIdx || i === lgIdx) {
                            brandNode.values[i] = String(parseNumber(brandNode.values[i]) + parseNumber(row[i]));
                        }
                    }
                } else {
                    brandNode = {
                        name: name,
                        values: [...row],
                        children: [],
                        level: 2
                    };
                    brandMap.set(lowerName, brandNode);
                    nhomConNode.children.push(brandNode);
                }
            }
        }
    }

    const finalTree: IndustryTreeNode[] = [];
    for (const key of nnhOrder) {
        const node = nnhMap.get(key);
        if (node) {
            finalTree.push(node);
        }
    }

    aggregateTreeNodes(finalTree, headers);

    const tableRows = finalTree.map(node => {
        const displayName = node.name.startsWith('NNH ') ? node.name : `NNH ${node.name.toUpperCase()}`;
        const rowValues = [...node.values];
        rowValues[0] = displayName;
        return rowValues;
    });

    return { tree: finalTree, tableRows, totalRow };
}

export const DMX_PARENT_INDUSTRIES = new Set([
    '22 - laptop',
    '13 - điện thoại',
    '1756 - máy giặt, sấy',
    '484 - điện gia dụng',
    '304 - điện tử',
    '16 - phụ kiện tiện ích',
    '1214 - gia dụng lắp đặt',
    '1755 - tủ lạnh, đông, mát',
    '24 - software',
    '244 - tablet',
    '1994 - dịch vụ bảo hành, bảo dưỡng điện máy xanh',
    '1274 - đồng hồ thời trang',
    '1314 - xe đạp, dụng cụ thể thao',
    '364 - it',
    '184 - phụ kiện trang trí',
    '664 - sim online',
    '23 - wearable',
    '1034 - dụng cụ nhà bếp',
    '164 - vas',
    '764 - loa vi tính',
    '344 - thẻ cào điện tử',
    '1116 - máy lọc nước',
    '1394 - phụ kiện lắp đặt',
    '944 - dịch vụ',
    '18 - sim trắng',
    '464 - giao dịch airtime',
    '1754 - máy lạnh, nước nóng'
]);

export const NEW_BI_PARENT_INDUSTRIES = new Set([
    '1 - viễn thông di động',
    '9 - gia dụng',
    '2 - laptop',
    '6 - tủ lạnh, đông, mát',
    '5 - điện tử',
    '3 - apple',
    '7 - máy giặt, sấy',
    '8 - máy lạnh & máy nước nóng',
    '8 - máy lạnh, nước nóng',
    '4 - phụ kiện - đồng hồ',
    '-1 - chưa phân loại',
    '10 - avapos',
    '11 - nh tận tâm'
]);

export function isParentIndustry(name: string): boolean {
    const clean = name.trim().toLowerCase();
    if (NEW_BI_PARENT_INDUSTRIES.has(clean)) return true;
    if (DMX_PARENT_INDUSTRIES.has(clean)) return true;

    // Nếu có mã số ở đầu mà không thuộc NEW_BI_PARENT_INDUSTRIES hay DMX_PARENT_INDUSTRIES thì chắc chắn là nhóm con
    if (/^-?\d+\s*-\s*/.test(clean)) {
        return false;
    }

    // Không có mã: kiểm tra theo tên chuẩn
    const portalParents = [
        'viễn thông di động', 'gia dụng', 'laptop', 'điện tử', 'điện lạnh',
        'phụ kiện - đồng hồ', 'phụ kiện', 'đồng hồ', 'dịch vụ', 'xe đạp',
        'chưa phân loại', 'máy lạnh & máy nước nóng', 'máy lạnh, nước nóng',
        'máy giặt, sấy', 'tủ lạnh, đông, mát', 'điện gia dụng', 'máy lọc nước',
        'apple', 'avapos', 'nh tận tâm'
    ];
    for (const p of portalParents) {
        if (clean === p || clean.endsWith(p)) {
            return true;
        }
    }
    return false;
}

/**
 * Danh sách tên chuỗi / thương hiệu cấp công ty (KHÔNG PHẢI tên siêu thị)
 */
const STANDALONE_CHAIN_BRANDS = new Set([
    'TGDD', 'TGDĐ', 'DMX', 'ĐMX', 'BHX', 'TOPZONE', 
    'THEGIOIDIDONG', 'DIENMAYXANH', 'BACHHOAXANH', 'ANKHANG', 'AVAKIDS'
]);

/**
 * Tự động nhận diện tên siêu thị thực tế từ nội dung báo cáo copy (hỗ trợ mọi định dạng siêu thị MWG)
 */
export const detectSupermarketNameFromReport = (text: string): string | null => {
    if (!text) return null;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let j = 0; j < lines.length; j++) {
        const l = lines[j];
        if (!l || l === 'Tổng' || l === 'TỔNG' || l.startsWith('BP ') || isEmployeeName(l) || isParentIndustry(l)) continue;
        if (l.includes(' liên hệ ') || l.includes('Đơn vị:') || l.includes('http') || l.includes('Dashboards')) continue;

        // Loại trừ các từ khoá chỉ chuỗi độc lập hoặc tiêu đề thanh điều hướng / lọc / báo cáo
        const upper = l.toUpperCase();
        if (STANDALONE_CHAIN_BRANDS.has(upper)) continue;

        const lower = l.toLowerCase();
        if (
            lower.includes('doanh thu hợp nhất') || 
            lower.includes('quỹ thời gian') || 
            lower.includes('tiến độ') ||
            lower.includes('lượt bill') ||
            lower.includes('thời gian làm việc') ||
            lower.includes('tlpvtc') ||
            lower.includes('triệu đồng') ||
            lower.includes('tỉ trọng') ||
            lower.includes('danh mục báo cáo') ||
            lower.includes('xuất excel') ||
            lower.includes('tải lại') ||
            lower.startsWith('chuỗi') ||
            lower.startsWith('miền') ||
            lower.startsWith('vùng') ||
            lower.startsWith('khu vực')
        ) continue;

        // 1. Khớp mẫu có mã kho và tên chi tiết: "910 - ĐML_STR_STR - 99 Hùng Vương", "3717 - ĐML_STR_STR...", "1234 - ĐM Cần Thơ"
        if (/^\d{3,5}\s*-\s*/.test(l)) {
            const afterCode = l.replace(/^\d{3,5}\s*-\s*/, '').trim();
            if (
                l.includes(' - ') || 
                /^(?:ĐMX|DMX|ĐML_|DML_|ĐML|DML|ĐM|DM|TGDĐ|TGDD|TGD|KHO|CH|STR|SIÊU\s*THỊ|CHI\s*NHÁNH|BHX)(?:[\s_\-:\d]|$)/i.test(afterCode) || 
                afterCode.includes('STR_') || 
                afterCode.toLowerCase().includes('kho') ||
                afterCode.toLowerCase().includes('siêu thị')
            ) {
                return l;
            }
        }

        // 2. Khớp tiền tố hệ thống cửa hàng ĐML_ / DML_ (VD: "ĐML_STR_STR - 99 Hùng Vương")
        if (/^(?:ĐML_|DML_)/i.test(l)) {
            return l;
        }

        // 3. Khớp tiền tố thương hiệu + tên cửa hàng (phải có tên cửa hàng phía sau, không phải từ đơn): "ĐMX 99 Hùng Vương", "TGDĐ Ba Tháng Hai"
        if (/^(?:ĐMX|DMX|TGDĐ|TGDD|BHX)\s+([A-Za-z0-9À-ỹ\s/_-]{3,})/i.test(l)) {
            return l;
        }
        if (/^(?:ĐM|DM)\s/i.test(l) && l.includes(' - ')) {
            return l;
        }

        // 4. Khớp nút / nhãn siêu thị chứa mã kho: "Toàn công tySiêu thị 910", "Siêu thị 910", "Kho 910"
        const stCodeMatch = l.match(/(?:Toàn công ty\s*)?(?:Siêu thị|Kho|Store)\s*[:\s-]?\s*(\d{3,5})\b/i);
        if (stCodeMatch) {
            return `Siêu thị ${stCodeMatch[1]}`;
        }

        // 5. Khớp nhãn có dấu hai chấm: "Siêu thị: 99 Hùng Vương", "Kho: Cần Thơ"
        const smMatch = l.match(/^(?:Siêu thị|Kho|Store)\s*:\s*(.+)$/i);
        if (smMatch && smMatch[1].trim()) {
            return smMatch[1].trim();
        }
    }
    return null;
};


export function parseNewPortalIndustryData(text: string) {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const headerIdx = lines.findIndex(l => {
        const u = l.toUpperCase();
        return (
            u.includes('NGÀNH HÀNG / NHÓM HÀNG') || 
            u.includes('NGÀNH HÀNG/NHÓM HÀNG') ||
            (u.includes('NGÀNH HÀNG') && u.includes('NHÓM HÀNG'))
        );
    });
    if (headerIdx === -1) return null;

    let dataStart = -1;
    for (let i = headerIdx + 1; i < lines.length; i++) {
        if (/^-?\d+\s*-\s*/.test(lines[i]) || lines[i].startsWith('Tổng')) {
            dataStart = i;
            break;
        }
    }
    if (dataStart === -1) return null;

    const standardHeaders = [
        'Nhóm ngành hàng',
        'Số lượng',
        'DTLK',
        'DTQĐ',
        '% Tỉ trọng',
        'Target (QĐ)',
        '% HT Target (QĐ)',
        'TB 3 Tháng',
        '% TT',
        'DT TRẢ GÓP',
        'Tỷ Trọng Trả Góp',
    ];

    const tree: IndustryTreeNode[] = [];
    let currentParent: IndustryTreeNode | null = null;
    let totalRow: string[] | null = null;

    let i = dataStart;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('Đơn vị:') || line.startsWith('Tỉ trọng tính') || line.includes('Click+') || line.includes('Đang chọn')) break;

        let name = '';
        let parts: string[] = [];

        if (line.includes('\t')) {
            const split = line.split('\t').map(p => p.trim());
            name = split[0];
            parts = split.slice(1);
            i++;
        } else if (i + 1 < lines.length && lines[i + 1].includes('\t')) {
            name = line;
            parts = lines[i + 1].split('\t').map(p => p.trim());
            i += 2;
        } else if (/^-?\d+\s*-\s*/.test(line) || line.startsWith('Tổng') || isParentIndustry(line)) {
            name = line;
            i++;
            parts = [];
            while (i < lines.length) {
                const nextLine = lines[i];
                if (nextLine.startsWith('Đơn vị:') || nextLine.startsWith('Tỉ trọng tính') || nextLine.includes('Click+') || nextLine.includes('Đang chọn')) break;
                // Dừng nếu gặp dòng tiêu đề của nhóm/ngành tiếp theo hoặc Tổng
                if (/^-?\d+\s*-\s*/.test(nextLine) || nextLine.startsWith('Tổng') || isParentIndustry(nextLine)) {
                    break;
                }
                parts.push(nextLine);
                i++;
            }
        } else {
            i++;
            continue;
        }

        // Đổi chỗ và căn chỉnh cột linh hoạt theo số cột dữ liệu nguồn
        let reorderedParts: string[] = [];
        if (parts.length >= 10) {
            // Định dạng 10 cột có sẵn Target: Số lượng, DTQĐ, % Tỉ trọng, DTLK, Target, %HT, TB3T, %TT, Trả góp, % Trả góp
            reorderedParts = [
                parts[0] ?? '0',  // Số lượng
                parts[3] ?? '0',  // DTLK (THỰC)
                parts[1] ?? '0',  // DTQĐ
                parts[2] ?? '0%', // % Tỉ trọng
                parts[4] ?? '—',  // Target (QĐ)
                parts[5] ?? '—',  // % HT Target (QĐ)
                parts[6] ?? '0',  // TB 3 Tháng
                parts[7] ?? '0%', // % TT
                parts[8] ?? '0',  // DT TRẢ GÓP
                parts[9] ?? '0%'  // Tỷ Trọng Trả Góp
            ];
        } else if (parts.length >= 8) {
            // Định dạng 8 cột chuẩn Portal BI: Số lượng, DTQĐ, % Tỉ trọng, DTLK (THỰC), TB 3 Tháng, % TT, DT Trả Góp, % Trả Góp
            reorderedParts = [
                parts[0] ?? '0',  // Số lượng
                parts[3] ?? '0',  // DTLK (THỰC)
                parts[1] ?? '0',  // DTQĐ
                parts[2] ?? '0%', // % Tỉ trọng
                '—',              // Target (QĐ)
                '—',              // % HT Target (QĐ)
                parts[4] ?? '0',  // TB 3 Tháng
                parts[5] ?? '0%', // % TT
                parts[6] ?? '0',  // DT TRẢ GÓP
                parts[7] ?? '0%'  // Tỷ Trọng Trả Góp
            ];
        } else {
            reorderedParts = [
                parts[0] ?? '0',  // Số lượng
                parts[3] ?? '0',  // DTLK (THỰC)
                parts[1] ?? '0',  // DTQĐ
                parts[2] ?? '0%', // % Tỉ trọng
                parts[4] ?? '—',  // Target (QĐ)
                parts[5] ?? '—',  // % HT Target (QĐ)
                parts[6] ?? '0',  // TB 3 Tháng
                parts[7] ?? '0%', // % TT
                parts[8] ?? '0',  // DT TRẢ GÓP
                parts[9] ?? '0%'  // Tỷ Trọng Trả Góp
            ];
        }

        if (name.startsWith('Tổng')) {
            totalRow = ['Tổng', ...reorderedParts];
            continue;
        }

        const isParent = isParentIndustry(name);
        if (isParent) {
            currentParent = {
                name: name,
                values: [name, ...reorderedParts],
                children: [],
                level: 0
            };
            tree.push(currentParent);
        } else {
            const child: IndustryTreeNode = {
                name: name,
                values: [name, ...reorderedParts],
                children: [],
                level: 1
            };
            if (currentParent) {
                currentParent.children.push(child);
            } else {
                tree.push(child);
            }
        }
    }

    // Tự động tính tổng cộng nếu báo cáo nguồn chưa kèm dòng Tổng
    if (!totalRow && tree.length > 0) {
        const sumSL = tree.reduce((acc, n) => acc + parseNumber(n.values[1]), 0);
        const sumThuc = tree.reduce((acc, n) => acc + parseNumber(n.values[2]), 0);
        const sumQd = tree.reduce((acc, n) => acc + parseNumber(n.values[3]), 0);
        const sumTb3t = tree.reduce((acc, n) => acc + parseNumber(n.values[7]), 0);
        const sumTg = tree.reduce((acc, n) => acc + parseNumber(n.values[9]), 0);
        const ttPct = sumTb3t > 0 ? `${((sumQd - sumTb3t) / sumTb3t * 100).toFixed(1)}%` : '0%';
        const tgPct = sumThuc > 0 ? `${((sumTg / sumThuc) * 100).toFixed(1)}%` : '0%';
        totalRow = [
            'Tổng',
            roundUp(sumSL).toLocaleString('vi-VN'),
            roundUp(sumThuc).toLocaleString('vi-VN'),
            roundUp(sumQd).toLocaleString('vi-VN'),
            '100%',
            '—',
            '—',
            roundUp(sumTb3t).toLocaleString('vi-VN'),
            ttPct.startsWith('-') ? ttPct : `+${ttPct}`,
            roundUp(sumTg).toLocaleString('vi-VN'),
            tgPct
        ];
    }

    const tableRows = tree.map(node => [...node.values]);
    const rows = totalRow ? [...tableRows, totalRow] : tableRows;

    const chiPhiMatch = text.match(/Chi phí\s*(?:\?\s*)?([\d,.]+)/i);

    const portalKpis: Record<string, string> = {
        laiGopQDDuKien: 'N/A',
        chiPhi: chiPhiMatch ? chiPhiMatch[1] : 'N/A',
        targetLNTT: 'N/A',
        htTargetDuKienLNTT: 'N/A'
    };

    // 1. Tỷ trọng trả góp (Trả chậm)
    const tgMatch = text.match(/Tỉ trọng trả góp\s*(?:[:\n\r\t ]+)?([\d,.]+%?)/i);
    if (tgMatch) {
        portalKpis.tyTrongTraGop = tgMatch[1].includes('%') ? tgMatch[1] : `${tgMatch[1]}%`;
    } else {
        const dtTgMatch = text.match(/DT trả góp\s+([\d,.]+)\s*\/\s*([\d,.]+)/i);
        if (dtTgMatch) {
            const tgVal = parseNumber(dtTgMatch[1]);
            const thucVal = parseNumber(dtTgMatch[2]);
            if (thucVal > 0) {
                portalKpis.tyTrongTraGop = `${(Math.round((tgVal / thucVal) * 1000) / 10).toFixed(1)}%`;
            }
        }
    }
    if (!portalKpis.tyTrongTraGop && totalRow) {
        if (totalRow[10] && totalRow[10] !== '0%' && totalRow[10] !== '—') {
            portalKpis.tyTrongTraGop = totalRow[10];
        } else if (totalRow[9] && totalRow[9] !== '0') {
            const tgVal = parseNumber(totalRow[9]);
            const thucVal = parseNumber(totalRow[2]);
            if (thucVal > 0) {
                portalKpis.tyTrongTraGop = `${(Math.round((tgVal / thucVal) * 1000) / 10).toFixed(1)}%`;
            }
        }
    }

    // 2. TLPVTC
    const tlpvVal = extractTlpvFromText(text);
    if (tlpvVal) {
        portalKpis.tlpv = tlpvVal;
    }

    // 3. Bill & Khách
    const { bill, khach } = extractBillAndKhachFromText(text);
    if (bill) {
        portalKpis.lbill = bill;
        portalKpis.lbillBH = bill;
    }
    if (khach) {
        portalKpis.lkhach = khach;
    }

    // 4. Các chỉ số khác
    const dtqdMatch = text.match(/DT quy đổi\s+([\d,.]+)/i);
    if (dtqdMatch) portalKpis.dtqd = dtqdMatch[1];

    const targetMatch = text.match(/Target trọn kỳ\s+([\d,.]+)/i);
    if (targetMatch) portalKpis.targetQD = targetMatch[1];

    const htMatch = text.match(/% HT target(?:\s*\([A-Z]+\))?\s*(?:\?\s*)?([\d,.]+%?)/i);
    if (htMatch) portalKpis.htTargetQD = htMatch[1].includes('%') ? htMatch[1] : `${htMatch[1]}%`;

    const tb3tMatch = text.match(/TT vs TB 3 tháng\s*(?:\?\s*)?([-+\d,.]+%?)/i);
    if (tb3tMatch) portalKpis.dtckThangQD = tb3tMatch[1].includes('%') ? tb3tMatch[1] : `${tb3tMatch[1]}%`;

    const dukienMatch = text.match(/DT dự kiến\s*(?:\?\s*)?([\d,.]+)/i);
    if (dukienMatch) portalKpis.dtDuKienQD = dukienMatch[1];

    return {
        headers: standardHeaders,
        rows,
        allRows: rows,
        tree,
        totalRow,
        kpis: portalKpis
    };
}

export const parseIndustryRealtimeData = (
    text: string,
    industryBiMap?: Record<string, { parent: string; child: string }> | null
) => {
    const result: {
        headers: string[];
        rows: string[][];
        allRows: string[][];
        tree: IndustryTreeNode[];
        totalRow: string[] | null;
        kpis?: Record<string, string>;
    } = {
        headers: [],
        rows: [],
        allRows: [],
        tree: [],
        totalRow: null,
        kpis: {}
    };

    if (!text) return result;

    const upper = text.toUpperCase();
    if (
        upper.includes('NGÀNH HÀNG / NHÓM HÀNG') || 
        upper.includes('NGÀNH HÀNG/NHÓM HÀNG') ||
        (upper.includes('NGÀNH HÀNG') && upper.includes('NHÓM HÀNG')) ||
        upper.includes('DOANH THU NGÀNH HÀNG BI') ||
        upper.includes('DOANH THU NGÀNH HÀNG')
    ) {
        const parsed = parseNewPortalIndustryData(text);
        if (parsed) return parsed;
    }

    const lines = text.split('\n');
    const headerIndex = lines.findIndex(line => line.trim().startsWith('Nhóm ngành hàng\tSL Realtime'));
    if (headerIndex === -1) return result;
    
    result.headers = lines[headerIndex].trim().split('\t');
    
    const allDataRows: string[][] = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        if (trimmed.toLowerCase().includes('hỗ trợ bi')) break;
        const parts = trimmed.split('\t');
        if (parts.length >= 2) {
            allDataRows.push(parts);
        }
    }

    result.allRows = allDataRows;

    const { tree, tableRows, totalRow } = buildIndustryTree(allDataRows, result.headers, industryBiMap);
    result.tree = tree;
    result.rows = totalRow ? [...tableRows, totalRow] : tableRows;
    result.totalRow = totalRow;

    return result;
};

export const parseIndustryLuyKeData = (
    text: string,
    industryBiMap?: Record<string, { parent: string; child: string }> | null
) => {
    const result: {
        kpis: { laiGopQDDuKien: string; chiPhi: string; targetLNTT: string; htTargetDuKienLNTT: string };
        table: { headers: string[]; rows: string[][] };
        tree: IndustryTreeNode[];
        totalRow: string[] | null;
    } = {
        kpis: { laiGopQDDuKien: 'N/A', chiPhi: 'N/A', targetLNTT: 'N/A', htTargetDuKienLNTT: 'N/A' },
        table: { headers: [], rows: [] },
        tree: [],
        totalRow: null
    };
    if (!text) return result;

    const upper = text.toUpperCase();
    if (
        upper.includes('NGÀNH HÀNG / NHÓM HÀNG') || 
        upper.includes('NGÀNH HÀNG/NHÓM HÀNG') ||
        (upper.includes('NGÀNH HÀNG') && upper.includes('NHÓM HÀNG')) ||
        upper.includes('DOANH THU NGÀNH HÀNG BI') ||
        upper.includes('DOANH THU NGÀNH HÀNG')
    ) {
        const parsed = parseNewPortalIndustryData(text);
        if (parsed) {
            return {
                kpis: parsed.kpis as any,
                table: { headers: parsed.headers, rows: parsed.rows },
                tree: parsed.tree,
                totalRow: parsed.totalRow
            };
        }
    }
    const lines = text.split('\n');
    const kpiBlock = lines.join('\n');
    const laiGopMatch = kpiBlock.match(/Lãi gộp QĐ Dự kiến\s+([\d,.]+)/);
    if (laiGopMatch) result.kpis.laiGopQDDuKien = laiGopMatch[1];
    const chiPhiMatch = kpiBlock.match(/Chi phí\s+([\d,.]+)/);
    if (chiPhiMatch) result.kpis.chiPhi = chiPhiMatch[1];
    const targetLNTTMatch = kpiBlock.match(/Target LNTT\s+([\d,.]+)/);
    if (targetLNTTMatch) result.kpis.targetLNTT = targetLNTTMatch[1];
    const htTargetMatch = kpiBlock.match(/%HT Target Dự kiến \(LNTT\)\s+([\d,.]+%)/);
    if (htTargetMatch) result.kpis.htTargetDuKienLNTT = htTargetMatch[1];
    const headerIndex = lines.findIndex(line => line.trim().startsWith('Nhóm ngành hàng\tSố lượng\tDTQĐ'));
    if (headerIndex === -1) return result;
    result.table.headers = lines[headerIndex].trim().split('\t');

    const allDataRows: string[][] = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        if (trimmed.toLowerCase().includes('hỗ trợ bi')) break;
        const parts = trimmed.split('\t');
        if (parts.length >= 2) {
            allDataRows.push(parts);
        }
    }

    const { tree, tableRows, totalRow } = buildIndustryTree(allDataRows, result.table.headers, industryBiMap);
    result.tree = tree;
    result.table.rows = totalRow ? [...tableRows, totalRow] : tableRows;
    result.totalRow = totalRow;

    return result;
};

export const extractSupermarketList = (summaryLuyKe: string): string[] => {
    if (!summaryLuyKe) return [];
    
    // Nếu đây là báo cáo theo ngành hàng (NGÀNH HÀNG BI / NHÓM HÀNG BI), không lấy các nhóm ngành làm siêu thị
    const isIndustryTableReport = summaryLuyKe.toUpperCase().includes('NGÀNH HÀNG') && summaryLuyKe.toUpperCase().includes('NHÓM HÀNG');

    // 1. Thử bóc tách qua parseSummaryData
    const parsed = parseSummaryData(summaryLuyKe);
    let rawExtractedNames: string[] = [];
    if (parsed.table.rows.length > 0) {
        rawExtractedNames = parsed.table.rows
            .map(r => (r[0] || '').trim())
            .filter(name => name && name !== 'Tổng' && !isEmployeeName(name) && !name.includes(' liên hệ ') && !isParentIndustry(name));
    }

    // 2. Dự phòng quét theo dòng nếu bảng chưa có dòng (chỉ khi không phải bảng ngành hàng)
    if (rawExtractedNames.length === 0 && !isIndustryTableReport) {
        rawExtractedNames = Array.from(new Set(summaryLuyKe.split(/\r?\n/)
            .map(line => (line.split('\t')[0] ?? '').trim())
            .filter(name => {
                if (!name || name === 'Tổng' || isEmployeeName(name) || name.includes(' liên hệ ') || name.includes('Đơn vị:')) return false;
                if (isParentIndustry(name)) return false;
                return /^\d+\s*-\s*/.test(name) || name.startsWith('ĐM') || name.startsWith('TGD') || (name.includes(' - ') && !name.includes(':'));
            })));
    }

    const uniqueShortNames = new Set<string>();
    const extractedNames: string[] = [];
    for (const name of rawExtractedNames) {
        const shortName = shortenSupermarketName(name);
        if (!uniqueShortNames.has(shortName)) {
            uniqueShortNames.add(shortName);
            extractedNames.push(name);
        }
    }
    return extractedNames;
};

/**
 * Chuẩn hoá tên siêu thị để so khớp thông minh:
 * - Loại bỏ tiền tố mã kho ở đầu (VD: "910 - ĐML_STR..." -> "ĐML_STR...")
 * - Chuẩn hoá chữ Đ/đ thành D/d để tránh lệch bảng mã tiếng Việt
 * - Loại bỏ dấu tiếng Việt và ký tự đặc biệt
 */
export const normalizeSupermarketKey = (name: string): string => {
    if (!name) return '';
    return name
        .trim()
        .replace(/^\d+\s*-\s*/, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
};

/**
 * Trích xuất mã kho / mã siêu thị từ chuỗi tên siêu thị hoặc nội dung báo cáo.
 * Hỗ trợ các định dạng:
 * - "910 - ĐML_STR_STR - 99 Hùng Vương" -> "910"
 * - "Siêu thị 910", "Kho 910", "Store 910", "Toàn công tySiêu thị 910" -> "910"
 * - Chuỗi số thuần 3-5 chữ số: "910", "3717" -> "910", "3717"
 */
export const extractStoreCode = (name: string): string | null => {
    if (!name) return null;
    const clean = name.trim();
    // 1. "910 - ĐML_STR_STR - 99 Hùng Vương" -> 910
    const leadingMatch = clean.match(/^(\d{3,5})\s*-/);
    if (leadingMatch) return leadingMatch[1];

    // 2. "Siêu thị 910", "Kho 910", "Store 910", "Toàn công tySiêu thị 910"
    const keywordMatch = clean.match(/(?:Toàn công ty\s*)?(?:Siêu thị|Kho|Store)\s*[:\s-]?\s*(\d{3,5})\b/i);
    if (keywordMatch) return keywordMatch[1];

    // 3. Chuỗi thuần số 3-5 chữ số (VD: "910", "3717")
    if (/^\d{3,5}$/.test(clean)) return clean;

    return null;
};

/**
 * So khớp xem 2 tên siêu thị có trỏ về cùng một siêu thị hay không:
 * Hỗ trợ các trường hợp:
 * - Khớp tuyệt đối hoặc khớp không phân biệt hoa thường / khoảng trắng
 * - Khớp theo mã kho trích xuất được (VD: "Siêu thị 910" vs "910 - ĐML_STR_STR - 99 Hùng Vương")
 * - Tra cứu mã kho qua bảng ánh xạ supermarketMap (nếu được truyền)
 * - Một bên có mã kho ở đầu, một bên không (VD: "910 - ĐML_STR_STR - 99 Hùng Vương" vs "DML_STR_STR - 99 Hùng Vương")
 * - Lệch ký tự Đ / D (VD: "ĐML_STR_STR" vs "DML_STR_STR")
 * - Cùng tên rút gọn qua shortenSupermarketName (VD: cùng là "Hùng Vương")
 */
export const isSupermarketMatch = (
    nameA: string, 
    nameB: string, 
    supermarketMap?: Record<string, string> | null
): boolean => {
    if (!nameA || !nameB) return false;
    const cleanA = nameA.trim();
    const cleanB = nameB.trim();

    // 1. Khớp chính xác
    if (cleanA === cleanB) return true;
    if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

    // 2. Không so khớp nếu một trong hai là "Tổng"
    const isTotalA = cleanA.toUpperCase() === 'TỔNG';
    const isTotalB = cleanB.toUpperCase() === 'TỔNG';
    if (isTotalA || isTotalB) return isTotalA === isTotalB;

    // 3. Khớp theo mã kho / siêu thị (VD: "Siêu thị 910" vs "910 - ĐML_STR_STR - 99 Hùng Vương")
    let codeA = extractStoreCode(cleanA);
    let codeB = extractStoreCode(cleanB);
    if (supermarketMap) {
        if (!codeA) {
            codeA = supermarketMap[cleanA] || supermarketMap[shortenSupermarketName(cleanA)] || null;
        }
        if (!codeB) {
            codeB = supermarketMap[cleanB] || supermarketMap[shortenSupermarketName(cleanB)] || null;
        }
    }
    if (codeA && codeB && codeA === codeB) return true;

    // 4. Khớp sau khi chuẩn hoá (bỏ tiền tố mã kho "910 - ", chuẩn hoá D/Đ và dấu)
    const normA = normalizeSupermarketKey(cleanA);
    const normB = normalizeSupermarketKey(cleanB);
    if (normA && normB && normA === normB) return true;

    // 5. Khớp theo shortenSupermarketName (VD: "Hùng Vương" == "Hùng Vương")
    const shortA = shortenSupermarketName(cleanA).trim().toLowerCase();
    const shortB = shortenSupermarketName(cleanB).trim().toLowerCase();
    if (shortA && shortB && shortA === shortB) return true;

    // 6. Khớp bao hàm (substring) theo tên rút gọn nếu đủ dài
    if (shortA.length >= 3 && shortB.length >= 3) {
        if (normA.includes(normB) || normB.includes(normA)) return true;
    }

    return false;
};

/**
 * Tìm key khớp nhất trong danh sách candidateKeys dựa trên isSupermarketMatch
 */
export const findMatchingSupermarketKey = (targetName: string, candidateKeys: string[]): string | undefined => {
    if (!targetName || !candidateKeys || candidateKeys.length === 0) return undefined;

    // 1. Ưu tiên khớp chính xác tuyệt đối
    if (candidateKeys.includes(targetName)) return targetName;

    const trimmedTarget = targetName.trim();
    const foundTrimmed = candidateKeys.find(k => k.trim() === trimmedTarget);
    if (foundTrimmed) return foundTrimmed;

    // 2. Tìm theo isSupermarketMatch
    return candidateKeys.find(k => isSupermarketMatch(targetName, k));
};

/**
 * Gom và trích xuất danh sách siêu thị từ TẤT CẢ các nguồn dữ liệu:
 * - Doanh thu Luỹ kế (summaryLuyKe)
 * - Doanh thu Realtime (summaryRealtime)
 * - Thi đua Luỹ kế (competitionLuyKe)
 * - Thi đua Realtime (competitionRealtime)
 * - Bảng ánh xạ siêu thị - kho (supermarketMap)
 * - Danh sách siêu thị tùy chỉnh người dùng tự thêm (customSupermarkets)
 */
export const extractAllSupermarketList = (options: {
    summaryLuyKe?: string | null;
    summaryRealtime?: string | null;
    competitionLuyKe?: string | null;
    competitionRealtime?: string | null;
    customSupermarkets?: string[];
    supermarketMap?: Record<string, string>;
}): string[] => {
    const {
        summaryLuyKe,
        summaryRealtime,
        competitionLuyKe,
        competitionRealtime,
        customSupermarkets = [],
        supermarketMap = {}
    } = options;

    const names: string[] = [];

    // 1. Từ Doanh thu LK
    if (summaryLuyKe) {
        names.push(...extractSupermarketList(summaryLuyKe));
    }
    // 2. Từ Doanh thu RT
    if (summaryRealtime) {
        names.push(...extractSupermarketList(summaryRealtime));
    }
    // 3. Từ Thi đua LK
    if (competitionLuyKe) {
        try {
            const compData = parseCompetitionDataBySupermarket(competitionLuyKe);
            names.push(...Object.keys(compData).filter(n => n && n !== 'TỔNG' && n !== 'Tổng' && !isEmployeeName(n)));
        } catch { /* ignore */ }
    }
    // 4. Từ Thi đua RT
    if (competitionRealtime) {
        try {
            const compData = parseCompetitionDataBySupermarket(competitionRealtime);
            names.push(...Object.keys(compData).filter(n => n && n !== 'TỔNG' && n !== 'Tổng' && !isEmployeeName(n)));
        } catch { /* ignore */ }
    }
    // 5. Từ Bảng ánh xạ mã kho
    if (supermarketMap) {
        names.push(...Object.keys(supermarketMap));
    }
    // 6. Từ Custom Supermarkets người dùng tự thêm
    if (customSupermarkets && customSupermarkets.length > 0) {
        names.push(...customSupermarkets);
    }

    // Khử trùng lặp thông minh theo shortenSupermarketName
    const uniqueShortNames = new Set<string>();
    const result: string[] = [];
    for (const name of names) {
        const trimmed = (name || '').trim();
        if (!trimmed || trimmed === 'Tổng' || trimmed === 'TỔNG' || isParentIndustry(trimmed)) continue;
        const isCustomOrMap = customSupermarkets.includes(trimmed) || Boolean(supermarketMap[trimmed]);
        if (!isCustomOrMap && isEmployeeName(trimmed)) continue;

        const short = shortenSupermarketName(trimmed);
        if (!uniqueShortNames.has(short)) {
            uniqueShortNames.add(short);
            result.push(trimmed);
        }
    }
    return result;
};


