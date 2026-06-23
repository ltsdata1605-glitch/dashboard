
// --- TYPES ---
export interface SupermarketCompetitionData {
    headers: string[];
    programs: { name: string; data: (string | number)[]; metric: string }[];
}

export type MainTab = 'realtime' | 'cumulative' | 'report';
export type SubTab = 'revenue' | 'competition';
export type Criterion = 'DTLK' | 'DTQĐ' | 'SLLK';

import { roundUp, parseNumber, shortenName, shortenSupermarketName } from '../../../utils/dataUtils';
export { roundUp, parseNumber, shortenName, shortenSupermarketName };

// --- DATA PARSERS ---

export const parseSummaryData = (text: string) => {
    if (!text) return { kpis: {}, table: { headers: [], rows: [] } };
    const lines = text.split('\n');
    const kpis: Record<string, string> = {};
    
    const kpiRegexes: Record<string, RegExp> = {
        dtlk: /DTLK\s+DTLK\s+([\d,.]+)/,
        dtqd: /Doanh thu quy đổi\s+DTQĐ\s+([\d,.]+)/,
        targetQD: /Target \(QĐ\)\s+([\d,.]+)/,
        htTargetQD: /% HT Target \(QĐ\)\s+([\d,.]+%)/,
        tyTrongTraGop: /Tỷ Trọng Trả (?:Góp|Chậm)\s+([\d,.]+%)/,
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
        traGopChange: /\+\/- Tỷ Trọng Trả (?:Góp|Chậm)\s+(?:\+\/- Tỷ Trọng Trả (?:Góp|Chậm)\s+)?([-+\d,.]+%)/,
        dtckThangQD: /\+\/- DTCK Tháng \(QĐ\)\s+(?:\+\/- DTCK Tháng \(QĐ\)\s+)?([-+\d,.]+%)/,
    };

    const textContent = text;
    for(const key in kpiRegexes) {
        const match = textContent.match(kpiRegexes[key]);
        if (match && match[1]) kpis[key] = match[1];
    }
    
    let headerIndex = lines.findIndex(line => line.trim().startsWith('Tên miền\t'));
    if (headerIndex === -1) return { kpis, table: { headers: [], rows: [] } };
    
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
        // 1. Chứa SĐT hỗ trợ
        // 2. Tên miền là "0%" (thường do paste sai cột)
        // 3. Chứa chuỗi "Hỗ trợ BI"
        if (firstCol.includes('(097.') || firstCol === '0%' || firstCol.includes('Hỗ trợ BI')) {
            continue;
        }

        // Nhận diện siêu thị dựa trên tiền tố hoặc có chứa dấu gạch ngang
        if (firstCol === 'Tổng' || firstCol.startsWith('ĐM') || firstCol.startsWith('TGD') || (firstCol.includes(' - ') && !firstCol.includes(' liên hệ '))) {
            rows.push(parts);
        } else if(line.startsWith('Hỗ trợ BI')) {
            break;
        }
    }
    return { kpis, table: { headers, rows } };
};

export const parseCompetitionDataBySupermarket = (text: string) => {
    if (!text) return {};
    const supermarketData: Record<string, SupermarketCompetitionData> = {};
    const lines = text.split('\n');
    let currentCompetition: string | null = null;
    let currentHeaders: string[] = [];
    let currentMetric: string = '';
    const headerKeywords = ['Target Ngày', '% HT Target Ngày', 'Target', '% HT Target Tháng'];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) { currentCompetition = null; continue; }
        const parts = trimmedLine.split('\t');
        const firstCol = parts[0]?.trim() || '';

        // Loại bỏ rác
        if (firstCol.includes('(097.') || firstCol === '0%' || firstCol.includes('Hỗ trợ BI')) {
            continue;
        }

        const isHeader = headerKeywords.some(kw => trimmedLine.includes(kw)) && parts.length > 2;

        if (isHeader) {
            currentCompetition = parts[0];
            currentHeaders = parts.slice(1);
            const firstHeader = parts[1].trim();
            if (firstHeader.includes('DTQĐ') || firstHeader.includes('DT Realtime (QĐ)')) currentMetric = 'DTQĐ';
            else if (firstHeader.includes('SLLK') || firstHeader.includes('SL Realtime')) currentMetric = 'SLLK';
            else if (firstHeader.includes('DTLK') || firstHeader.includes('DT Realtime')) currentMetric = 'DTLK';
            else currentMetric = '';
        } else if (currentCompetition && (firstCol.startsWith('ĐM') || firstCol.startsWith('TGD') || firstCol.startsWith('Tổng') || (firstCol.includes(' - ') && !firstCol.includes(' liên hệ ')))) {
            const supermarketName = parts[0];
            const programData = parts.slice(1);
            if (!supermarketData[supermarketName]) {
                supermarketData[supermarketName] = { headers: [], programs: [] };
            }
            supermarketData[supermarketName].headers = currentHeaders;
            supermarketData[supermarketName].programs.push({ name: currentCompetition, data: programData, metric: currentMetric });
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

export const parseIndustryRealtimeData = (text: string) => {
    const result: {
        headers: string[];
        rows: string[][];
        allRows: string[][];
        tree: IndustryTreeNode[];
        totalRow: string[] | null;
    } = {
        headers: [],
        rows: [],
        allRows: [],
        tree: [],
        totalRow: null
    };

    if (!text) return result;
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
    result.rows = allDataRows.filter(r => isLevel0(r[0] || '') || r[0] === 'Tổng');

    const targetIndex = result.headers.indexOf('Target Ngày (QĐ)');

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
            result.tree.push(currentNNH);
            currentNNH = null;
        }
    };

    for (const row of allDataRows) {
        const name = (row[0] || '').trim();

        if (name === 'Tổng') {
            result.totalRow = row;
            continue;
        }

        if (isLevel0(name)) {
            flushNNH();
            currentNNH = { name, values: row, children: [], level: 0 };
            continue;
        }

        if (!currentNNH) continue;

        const targetVal = targetIndex >= 0 && row[targetIndex] ? parseNumber(row[targetIndex]) : 0;

        if (targetVal > 0.001) {
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

    return result;
};

// --- INDUSTRY TREE TYPES ---
export interface IndustryTreeNode {
    name: string;
    values: string[];
    children: IndustryTreeNode[];
    level: number; // 0=Ngành hàng (NNH), 1=Nhóm hàng, 2=Hãng
}

export const parseIndustryLuyKeData = (text: string) => {
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

    // Parse ALL data rows (not just NNH/Tổng)
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

    // Keep backward-compatible flat rows (only NNH + Tổng)
    result.table.rows = allDataRows.filter(r => isLevel0(r[0] || '') || r[0] === 'Tổng');

    // --- Build 3-level tree: NNH > Nhóm hàng > Hãng ---
    const targetIndex = result.table.headers.indexOf('Target (QĐ)');
    const laiGopIndex = result.table.headers.indexOf('Lãi gộp QĐ');

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
            result.tree.push(currentNNH);
            currentNNH = null;
        }
    };

    for (const row of allDataRows) {
        const name = (row[0] || '').trim();

        if (name === 'Tổng') {
            result.totalRow = row;
            continue;
        }

        if (isLevel0(name)) {
            flushNNH();
            currentNNH = { name, values: row, children: [], level: 0 };
            continue;
        }

        if (!currentNNH) continue;

        // Determine if this row is Nhóm hàng (Level 1) or Hãng (Level 2)
        // Nhóm hàng: has Target > 0 OR Lãi gộp > 0
        // Hãng: Target = 0 AND Lãi gộp = 0
        const targetVal = targetIndex >= 0 && row[targetIndex] ? parseNumber(row[targetIndex]) : 0;
        const laiGopVal = laiGopIndex >= 0 && row[laiGopIndex] ? parseNumber(row[laiGopIndex]) : 0;

        if (targetVal > 0.001 || laiGopVal > 0.001) {
            // Definitely a Nhóm hàng (Level 1)
            flushNhomHang();
            currentNhomHang = { name, values: row, children: [], level: 1 };
        } else {
            // Target = 0 and Lãi gộp = 0 → Hãng (Level 2) if inside a Nhóm hàng
            if (currentNhomHang) {
                currentNhomHang.children.push({ name, values: row, children: [], level: 2 });
            } else {
                // No active Nhóm hàng → treat as orphan Nhóm hàng leaf
                currentNNH.children.push({ name, values: row, children: [], level: 1 });
            }
        }
    }

    flushNNH();

    return result;
};

export const extractSupermarketList = (summaryLuyKe: string): string[] => {
    if (!summaryLuyKe || !summaryLuyKe.includes('Tên miền\tDT Hôm Qua\tDTLK\tDT Dự Kiến\tDTQĐ')) {
        return [];
    }
    const rawExtractedNames = Array.from(new Set(summaryLuyKe.split('\n')
        .map(line => (line.split('\t')[0] ?? '').trim())
        .filter(name => (name.startsWith('ĐM') || name.startsWith('TGD')) && name.includes(' - '))));

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
