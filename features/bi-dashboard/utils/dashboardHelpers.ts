
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
            values[htIdx] = target > 0 ? `${((dtqd / target) * 100).toFixed(1)}%` : '0%';
        }
        if (ttgIdx >= 0 && dtgIdx >= 0 && dtqdIdx >= 0) {
            const dtg = parseNumber(values[dtgIdx]);
            const dtqd = parseNumber(values[dtqdIdx]);
            values[ttgIdx] = dtqd > 0 ? `${((dtg / dtqd) * 100).toFixed(1)}%` : '0%';
        }
        if (dgIdx >= 0 && dtqdIdx >= 0 && slIdx >= 0) {
            const dtqd = parseNumber(values[dtqdIdx]);
            const sl = parseNumber(values[slIdx]);
            values[dgIdx] = sl > 0 ? (dtqd / sl).toFixed(2) : '0';
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
                values[dtckIdx] = sumDTCK > 0 ? `${(((totalDtqd - sumDTCK) / sumDTCK) * 100).toFixed(1)}%` : '0%';
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
                values[dtckIdx] = sumDTCK > 0 ? `${(((totalDtqd - sumDTCK) / sumDTCK) * 100).toFixed(1)}%` : '0%';
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
    const tree: IndustryTreeNode[] = [];
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
                    values: headers.map((h, i) => i === 0 ? parentName : '0'),
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
                    values: headers.map((h, i) => i === 0 ? childName : '0'),
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
                        values: headers.map((h, i) => i === 0 ? fallbackParent : '0'),
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
                        values: headers.map((h, i) => i === 0 ? fallbackChild : '0'),
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
