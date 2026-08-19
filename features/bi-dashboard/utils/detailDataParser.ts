import { parseNumber } from "../../../utils/dataUtils";
import { isLevel0 } from "./dashboardHelpers";
/**
 * Parser for 4-level employee revenue detail data.
 * Hierarchy: Department > Employee > Ngành hàng (NNH) > Nhóm hàng > Hãng > Sản phẩm
 */

export interface DetailNode {
    name: string;
    level: 'total' | 'department' | 'employee' | 'nnh' | 'nhomHang' | 'hang' | 'sanPham';
    dtlk: number;
    dtqd: number;
    hieuQuaQD: number;
    soLuong: number;
    donGia: number;
    children: DetailNode[];
}




/**
 * Detect row level from context:
 * - "Tổng" → total
 * - Starts with "BP " → department
 * - Matches "Name - DIGITS" (employee ID pattern) → employee
 * - Starts with "NNH " → nnh (ngành hàng)
 * - Everything else is nhomHang, hang, or sanPham (determined by tree structure)
 */
function detectLevel(name: string): 'total' | 'department' | 'employee' | 'nnh' | 'nhomHang' {
    if (name === 'Tổng') return 'total';
    if (name.startsWith('BP ')) return 'department';
    // Employee: "Name - 12345" or "Name - 123456"
    if (/\s-\s\d{4,}$/.test(name)) return 'employee';
    if (isLevel0(name)) return 'nnh';
    return 'nhomHang'; // Will be refined based on tree structure
}

export function parseDetailData(raw: string): DetailNode[] {
    return parseDetailDataV2(raw);
}

const KNOWN_BRANDS = new Set([
    // Laptop / Máy tính / IT
    'acer', 'asus', 'hp', 'dell', 'lenovo', 'msi', 'macbook', 'singpc', 'chuwi', 'microsoft surface', 'gigabyte', 'vaio', 'lg gram',
    // Điện thoại / Tablet
    'apple', 'samsung', 'oppo', 'xiaomi', 'realme', 'vivo', 'honor', 'nokia', 'masstel', 'mobell', 'itel', 'tecno', 'infinix', 'bphone', 'vsmart', 'huawei', 'zte', 'tcl', 'oneplus', 'poco',
    // Điện tử / Tivi / Loa / Âm thanh
    'lg', 'aqua', 'toshiba', 'panasonic', 'sharp', 'casper', 'tcl', 'sony', 'hisense', 'coocaa',
    'jbl', 'marshall', 'harman kardon', 'alpha works', 'soundcore', 'anker', 'bose', 'sennheiser', 'edifier', 'dalton', 'nanomax', 'acnos', 'paramax', 'boston acoustics', 'zenbos', 'sumico', 'monster', 'klipsch',
    // Điện lạnh (Tủ lạnh, Máy giặt, Máy lạnh, Tủ đông)
    'daikin', 'midea', 'nagakawa', 'comfee', 'gree', 'bompani', 'electrolux', 'sanaki', 'sanaky', 'funiki', 'mitsubishi heavy', 'mitsubishi electric', 'hitachi', 'carrier', 'candy', 'beko', 'haier',
    // Điện gia dụng & Bếp & Lọc nước
    'kangaroo', 'karofi', 'sunhouse', 'bluestone', 'tefal', 'cuckoo', 'philips', 'bear', 'elmich', 'delites', 'ava', 'ava+', 'dreame', 'roborock', 'ecovacs', 'daikiosan', 'makano', 'mishio', 'hafele', 'bosch', 'pramie', 'malloca', 'stiebel eltron', 'ferroli', 'ariston', 'rossi', 'rapido', 'hawonkoo', 'supor', 'kitchenlux', 'homemy', 'happycook', 'lotte', 'lock&lock', 'lock and lock', 'inochi', 'namilux', 'senko', 'asia', 'ac', 'mitsubishi', 'kdk', 'lifan', 'yanfan', 'viet nhat', 'viet-tiep', 'dien quang', 'rang dong', 'kutchen', 'kuvings', 'hurom', 'tiross', 'zelmer', 'korihome', 'mutosi', 'aosmith', 'a.o. smith', 'coway', 'chungho', 'pureit', 'unilever pureit', 'braun', 'oral-b', 'oral b', 'flyco', 'enchen', 'showsee',
    // Đồng hồ & Phụ kiện
    'casio', 'elio', 'mvw', 'smile kid', 'korlex', 'q&q', 'orient', 'citizen', 'fossil', 'tommy hilfiger', 'anne klein', 'titan', 'rossini', 'nakzen', 'curren', 'naviforce', 'skmei', 'julius', 'srwatch', 'mathey tissot', 'candino', 'frederique constant', 'certina', 'tissot', 'bulova', 'coach', 'michael kors', 'lacoste', 'adriatica', 'baby-g', 'g-shock', 'sheen', 'edifice', 'pro trek',
    'belkin', 'baseus', 'ugreen', 'remax', 'hoco', 'rezo', 'hydrus', 'joway', 'mipow', 'x-mobile', 'targus', 'tomtoc', 'jincase', 'occa', 'togo', 'akko', 'dareu', 'logitech', 'razer', 'corsair', 'hyperwork', 'edra', 'e-dra', 'machenike', 'kinh van hoa', 'canon', 'brother', 'kingston', 'sandisk', 'kioxia', 'hiksemi', 'transcend', 'lexar', 'seagate', 'western digital', 'wd', 'tp-link', 'mercusys', 'totolink', 'tenda', 'd-link',
    // Xe đạp & Dụng cụ thể thao
    'thong nhat', 'thống nhất', 'fornix', 'giant', 'trinx', 'twitter', 'java', 'sava', 'maruishi', 'royalbaby', 'stitch', 'chipmunk', 'fascino',
    // Dịch vụ & Phần mềm
    'viettel', 'vinaphone', 'mobifone', 'vietnamobile', 'itravel', 'wintel', 'local',
    'mic', 'pvi', 'pti', 'bao viet', 'vbi', 'fubon', 'vieon', 'galaxy play', 'fpt play', 'tv360', 'k+', 'office 365', 'microsoft', 'kaspersky', 'bkav', 'eset'
]);

function isKnownBrand(name: string): boolean {
    const clean = name.trim().toLowerCase();
    if (KNOWN_BRANDS.has(clean)) return true;
    const normalized = clean.replace(/[^a-z0-9]/g, '');
    if (KNOWN_BRANDS.has(normalized)) return true;
    return false;
}

function isCategoryName(name: string): boolean {
    const lowercaseName = name.toLowerCase();
    const categoryKeywords = [
        'quạt', 'nồi', 'bếp', 'máy', 'lọc', 'bình', 'xay', 'áp suất', 'lẩu', 'chiên', 'nướng', 
        'chăm sóc', 'bàn ủi', 'lò', 'hút bụi', 'tỏi đen', 'sấy tóc', 'dụng cụ', 'đồ dùng', 
        'loa', 'amply', 'tivi', 'tủ lạnh', 'máy giặt', 'điều hòa', 'điện thoại', 'máy tính', 
        'laptop', 'tablet', 'đồng hồ', 'cáp', 'sạc', 'tai nghe', 'pin', 'ốp lưng', 'phụ kiện',
        'sim', 'thẻ cào', 'dịch vụ', 'xe đạp', 'thể thao', 'bình đun', 'sinh tố', 'ép trái cây',
        'nước nóng', 'sấy quần áo', 'rửa chén', 'hút mùi', 'chảo', 'nồi cơm', 'nồi áp suất',
        'bàn là', 'vợt muỗi', 'đèn', 'sưởi', 'massage', 'cân', 'bàn chải', 'cạo râu', 'triệt lông',
        'xoay', 'ép', 'âm thanh', 'kỹ thuật số', 'gia dụng', 'điện tử', 'điện lạnh', 'bàn phím', 'chuột'
    ];

    return categoryKeywords.some(keyword => lowercaseName.includes(keyword));
}

function rebuildNnhChildren(flatChildren: DetailNode[]): DetailNode[] {
    const structuredChildren: DetailNode[] = [];
    let currentNhomHang: DetailNode | null = null;
    let remainingSL = 0;
    let remainingDTQD = 0;

    let currentBrand: DetailNode | null = null;
    let remainingBrandSL = 0;
    let remainingBrandDTQD = 0;

    for (const child of flatChildren) {
        const isBrand = isKnownBrand(child.name);

        // Check if child is product of currentBrand
        const fitsBrand = currentBrand && 
                          !isBrand &&
                          remainingBrandSL > 0.01 && 
                          child.soLuong <= remainingBrandSL + 0.1 && 
                          child.dtqd <= remainingBrandDTQD + 1.0;

        if (fitsBrand && currentBrand) {
            child.level = 'sanPham';
            currentBrand.children.push(child);
            remainingBrandSL = Math.max(0, remainingBrandSL - child.soLuong);
            remainingBrandDTQD = Math.max(0, remainingBrandDTQD - child.dtqd);
            continue;
        }

        // Check if child is brand of currentNhomHang
        const hasCatKeyword = isCategoryName(child.name);
        const fitsNhomHang = currentNhomHang && 
                            !hasCatKeyword && 
                            child.soLuong <= remainingSL + 0.1 && 
                            child.dtqd <= remainingDTQD + 1.0 && 
                            remainingSL > 0.01;

        if ((isBrand || fitsNhomHang) && currentNhomHang) {
            child.level = 'hang';
            child.children = [];
            currentNhomHang.children.push(child);
            currentBrand = child;
            remainingBrandSL = child.soLuong;
            remainingBrandDTQD = child.dtqd;
            remainingSL = Math.max(0, remainingSL - child.soLuong);
            remainingDTQD = Math.max(0, remainingDTQD - child.dtqd);
        } else if (isBrand && !currentNhomHang) {
            currentNhomHang = {
                name: child.name,
                level: 'nhomHang',
                dtlk: 0,
                dtqd: 0,
                hieuQuaQD: 0,
                soLuong: 0,
                donGia: 0,
                children: []
            };
            structuredChildren.push(currentNhomHang);
            child.level = 'hang';
            child.children = [];
            currentNhomHang.children.push(child);
            currentBrand = child;
            remainingBrandSL = child.soLuong;
            remainingBrandDTQD = child.dtqd;
        } else {
            child.level = 'nhomHang';
            child.children = [];
            structuredChildren.push(child);
            currentNhomHang = child;
            remainingSL = child.soLuong;
            remainingDTQD = child.dtqd;
            currentBrand = null;
            remainingBrandSL = 0;
            remainingBrandDTQD = 0;
        }
    }

    return structuredChildren;
}

function rebuildAllNnhChildren(roots: DetailNode[]): DetailNode[] {
    const walk = (node: DetailNode) => {
        if (node.level === 'nnh') {
            node.children = rebuildNnhChildren(node.children);
        } else {
            for (const child of node.children) {
                walk(child);
            }
        }
    };
    for (const root of roots) {
        walk(root);
    }
    return roots;
}

function rebuildEmployeeSubtree(
    rows: { name: string; dtlk: number; dtqd: number; hieuQuaQD: number; soLuong: number; donGia: number; indent: number }[],
    industryBiMap: Record<string, { parent: string; child: string }>
): DetailNode[] {
    const parentNames = new Set(Object.values(industryBiMap).map(v => v.parent.toLowerCase()));
    
    // Construct a tree of Level 3 (nnh) -> Level 4 (nhomHang) -> Level 5 (hang) -> Level 6 (sanPham)
    const nnhMap = new Map<string, DetailNode>(); // Key: parentKey
    const nhomHangMaps = new Map<string, Map<string, DetailNode>>(); // Key: parentKey, Value: Map of childKey -> nhomHang Node
    const nnhOrder: string[] = [];

    let activeNhomHangNode: DetailNode | null = null;
    let remainingNhomHangSL = 0;
    let remainingNhomHangDTQD = 0;
    let activeNhomHangIndent = -1;

    let activeBrandNode: DetailNode | null = null;
    let remainingBrandSL = 0;
    let remainingBrandDTQD = 0;

    let currentNnhHeader = '';

    for (const row of rows) {
        const cleanName = row.name.trim();
        const lowerName = cleanName.toLowerCase();
        
        // 1. Check if it is a category summary row (like NNH Điện lạnh)
        const isCategorySummary = cleanName.startsWith('NNH ') || 
                                 parentNames.has(lowerName) || 
                                 parentNames.has(cleanName.replace(/^NNH\s+/i, '').toLowerCase());
        
        if (isCategorySummary) {
            currentNnhHeader = cleanName;
            const parentName = cleanName.replace(/^NNH\s+/i, '').trim();
            const parentKey = parentName.toLowerCase();
            
            let nnhNode = nnhMap.get(parentKey);
            if (!nnhNode) {
                nnhNode = {
                    name: parentName,
                    level: 'nnh',
                    dtlk: row.dtlk,
                    dtqd: row.dtqd,
                    hieuQuaQD: row.hieuQuaQD,
                    soLuong: row.soLuong,
                    donGia: row.donGia,
                    children: []
                };
                nnhMap.set(parentKey, nnhNode);
                nnhOrder.push(parentKey);
                nhomHangMaps.set(parentKey, new Map());
            } else {
                nnhNode.dtlk += row.dtlk;
                nnhNode.dtqd += row.dtqd;
                nnhNode.soLuong += row.soLuong;
            }
            activeNhomHangNode = null;
            remainingNhomHangSL = 0;
            remainingNhomHangDTQD = 0;
            activeNhomHangIndent = -1;

            activeBrandNode = null;
            remainingBrandSL = 0;
            remainingBrandDTQD = 0;
            continue;
        }

        // 2. Check if it is a Level 4 Nhóm hàng
        const compoundKey = `${currentNnhHeader.toLowerCase()}|||${lowerName}`;
        const mapInfo = industryBiMap[compoundKey] || industryBiMap[lowerName];
        const isBrand = isKnownBrand(cleanName);
        const isActuallyNhomHang = !isBrand && !!mapInfo && (
            activeNhomHangNode === null || 
            remainingNhomHangSL <= 0.01 || 
            row.indent <= activeNhomHangIndent
        );

        if (isActuallyNhomHang) {
            const parentName = currentNnhHeader ? currentNnhHeader.replace(/^NNH\s+/i, '').trim() : mapInfo.parent.trim(); // Level 3 (Ngành hàng)
            const childName = mapInfo.child.trim();   // Level 4 (Nhóm hàng)
            const parentKey = parentName.toLowerCase();
            const childKey = childName.toLowerCase();
            
            let nnhNode = nnhMap.get(parentKey);
            if (!nnhNode) {
                nnhNode = {
                    name: parentName,
                    level: 'nnh',
                    dtlk: 0,
                    dtqd: 0,
                    hieuQuaQD: 0,
                    soLuong: 0,
                    donGia: 0,
                    children: []
                };
                nnhMap.set(parentKey, nnhNode);
                nnhOrder.push(parentKey);
                nhomHangMaps.set(parentKey, new Map());
            }
            
            const nhomHangMap = nhomHangMaps.get(parentKey)!;
            let nhomHangNode = nhomHangMap.get(childKey);
            if (!nhomHangNode) {
                nhomHangNode = {
                    name: childName,
                    level: 'nhomHang',
                    dtlk: row.dtlk,
                    dtqd: row.dtqd,
                    hieuQuaQD: row.hieuQuaQD,
                    soLuong: row.soLuong,
                    donGia: row.donGia,
                    children: []
                };
                nhomHangMap.set(childKey, nhomHangNode);
                nnhNode.children.push(nhomHangNode);
            } else {
                // Sum the group row's values if repeated
                nhomHangNode.dtlk += row.dtlk;
                nhomHangNode.dtqd += row.dtqd;
                nhomHangNode.soLuong += row.soLuong;
            }

            activeNhomHangNode = nhomHangNode;
            remainingNhomHangSL = row.soLuong;
            remainingNhomHangDTQD = row.dtqd;
            activeNhomHangIndent = row.indent;

            activeBrandNode = null;
            remainingBrandSL = 0;
            remainingBrandDTQD = 0;
            continue;
        }

        // 3. Check if it is a Level 6 Product (Sản phẩm) under activeBrandNode
        const fitsBrandQty = activeBrandNode && remainingBrandSL > 0.01 && row.soLuong <= remainingBrandSL + 0.1;
        const fitsBrandRev = activeBrandNode && remainingBrandDTQD > 0.01 && row.dtqd <= remainingBrandDTQD + 1.0;

        if (activeBrandNode && !isBrand && fitsBrandQty && fitsBrandRev) {
            const productNode: DetailNode = {
                name: cleanName,
                level: 'sanPham',
                dtlk: row.dtlk,
                dtqd: row.dtqd,
                hieuQuaQD: row.hieuQuaQD,
                soLuong: row.soLuong,
                donGia: row.donGia,
                children: []
            };
            activeBrandNode.children.push(productNode);
            remainingBrandSL = Math.max(0, remainingBrandSL - row.soLuong);
            remainingBrandDTQD = Math.max(0, remainingBrandDTQD - row.dtqd);
            continue;
        }

        // 4. Otherwise, it is a Level 5 Brand (Hãng) under activeNhomHangNode
        if (isBrand || activeNhomHangNode) {
            if (!activeNhomHangNode) {
                const parentName = currentNnhHeader ? currentNnhHeader.replace(/^NNH\s+/i, '').trim() : 'Khác';
                const parentKey = parentName.toLowerCase();
                let nnhNode = nnhMap.get(parentKey);
                if (!nnhNode) {
                    nnhNode = {
                        name: parentName,
                        level: 'nnh',
                        dtlk: 0,
                        dtqd: 0,
                        hieuQuaQD: 0,
                        soLuong: 0,
                        donGia: 0,
                        children: []
                    };
                    nnhMap.set(parentKey, nnhNode);
                    nnhOrder.push(parentKey);
                    nhomHangMaps.set(parentKey, new Map());
                }
                const nhomHangMap = nhomHangMaps.get(parentKey)!;
                let nhomHangNode = nhomHangMap.get(parentKey);
                if (!nhomHangNode) {
                    nhomHangNode = {
                        name: parentName,
                        level: 'nhomHang',
                        dtlk: 0,
                        dtqd: 0,
                        hieuQuaQD: 0,
                        soLuong: 0,
                        donGia: 0,
                        children: []
                    };
                    nhomHangMap.set(parentKey, nhomHangNode);
                    nnhNode.children.push(nhomHangNode);
                }
                activeNhomHangNode = nhomHangNode;
            }

            const brandNode: DetailNode = {
                name: cleanName,
                level: 'hang',
                dtlk: row.dtlk,
                dtqd: row.dtqd,
                hieuQuaQD: row.hieuQuaQD,
                soLuong: row.soLuong,
                donGia: row.donGia,
                children: []
            };
            activeNhomHangNode.children.push(brandNode);
            activeBrandNode = brandNode;
            remainingBrandSL = row.soLuong;
            remainingBrandDTQD = row.dtqd;
            remainingNhomHangSL = Math.max(0, remainingNhomHangSL - row.soLuong);
            remainingNhomHangDTQD = Math.max(0, remainingNhomHangDTQD - row.dtqd);
        } else {
            // Fallback when not a known brand and no active nhomHang
            const fallbackParentName = currentNnhHeader ? currentNnhHeader.replace(/^NNH\s+/i, '').trim() : 'Khác';
            const fallbackChildName = cleanName;
            const parentKey = fallbackParentName.toLowerCase();
            const childKey = fallbackChildName.toLowerCase();
            
            let nnhNode = nnhMap.get(parentKey);
            if (!nnhNode) {
                nnhNode = {
                    name: fallbackParentName,
                    level: 'nnh',
                    dtlk: 0,
                    dtqd: 0,
                    hieuQuaQD: 0,
                    soLuong: 0,
                    donGia: 0,
                    children: []
                };
                nnhMap.set(parentKey, nnhNode);
                nnhOrder.push(parentKey);
                nhomHangMaps.set(parentKey, new Map());
            }

            const nhomHangMap = nhomHangMaps.get(parentKey)!;
            let nhomHangNode = nhomHangMap.get(childKey);
            if (!nhomHangNode) {
                nhomHangNode = {
                    name: fallbackChildName,
                    level: 'nhomHang',
                    dtlk: row.dtlk,
                    dtqd: row.dtqd,
                    hieuQuaQD: row.hieuQuaQD,
                    soLuong: row.soLuong,
                    donGia: row.donGia,
                    children: []
                };
                nhomHangMap.set(childKey, nhomHangNode);
                nnhNode.children.push(nhomHangNode);
            }
            activeNhomHangNode = nhomHangNode;
            remainingNhomHangSL = row.soLuong;
            remainingNhomHangDTQD = row.dtqd;
            activeBrandNode = null;
            remainingBrandSL = 0;
            remainingBrandDTQD = 0;
        }
    }

    return nnhOrder.map(key => nnhMap.get(key)!).filter(Boolean);
}

/**
 * Better parser: re-parse using a cleaner state machine approach and mathematical prefix sums.
 */
export function parseDetailDataV2(
    raw: string,
    industryBiMap?: Record<string, { parent: string; child: string }> | null
): DetailNode[] {
    if (!raw) return [];

    const lines = raw.split('\n').filter(l => l.trim());
    const headerIdx = lines.findIndex(l => l.includes('Nhân viên') && l.includes('DTLK') && l.includes('DTQĐ'));
    if (headerIdx === -1) return [];

    const dataLines = lines.slice(headerIdx + 1);
    if (dataLines.length === 0) return [];

    interface RawRow {
        name: string;
        dtlk: number;
        dtqd: number;
        hieuQuaQD: number;
        soLuong: number;
        donGia: number;
        indent: number;
    }

    const rawRows: RawRow[] = [];
    for (const line of dataLines) {
        const parts = line.split('\t');
        let nameIdx = 0;
        while (nameIdx < parts.length && parts[nameIdx].trim() === '') {
            nameIdx++;
        }
        if (nameIdx >= parts.length) continue;

        const rawName = parts[nameIdx];
        const leadingSpaces = rawName.length - rawName.trimStart().length;
        const name = rawName.trim();
        if (!name) continue;

        if (name.includes('Hỗ trợ BI') || name.includes('Logo BI') || name.includes('Trang chủ')) continue;
        if (name.includes('Doanh thu theo') || name.includes('Ngành hàng chính') || name.includes('Tháng ') || name.includes('Phòng ban') || name.includes('Tất cả ngành hàng') || name.includes('Danh sách')) continue;
        if (name === 'Nhân viên') continue;

        const indent = nameIdx * 4 + leadingSpaces;

        rawRows.push({
            name,
            indent,
            dtlk: parseNumber(parts[nameIdx + 1]),
            dtqd: parseNumber(parts[nameIdx + 2]),
            hieuQuaQD: parseNumber(parts[nameIdx + 3]),
            soLuong: parseNumber(parts[nameIdx + 4]),
            donGia: parseNumber(parts[nameIdx + 5]),
        });
    }

    if (industryBiMap && Object.keys(industryBiMap).length > 0) {
        const roots: DetailNode[] = [];
        let currentTotal: DetailNode | null = null;
        let currentDept: DetailNode | null = null;
        let currentEmp: DetailNode | null = null;
        let currentEmpRows: RawRow[] = [];

        const flushEmpRows = () => {
            if (currentEmp && currentEmpRows.length > 0) {
                currentEmp.children = rebuildEmployeeSubtree(currentEmpRows, industryBiMap);
                currentEmpRows = [];
            }
        };

        for (const row of rawRows) {
            const level = detectLevel(row.name);
            if (level === 'total') {
                flushEmpRows();
                const node: DetailNode = {
                    name: row.name,
                    level: 'total',
                    dtlk: row.dtlk,
                    dtqd: row.dtqd,
                    hieuQuaQD: row.hieuQuaQD,
                    soLuong: row.soLuong,
                    donGia: row.donGia,
                    children: []
                };
                roots.push(node);
                currentTotal = node;
                currentDept = null;
                currentEmp = null;
            } else if (level === 'department') {
                flushEmpRows();
                const node: DetailNode = {
                    name: row.name,
                    level: 'department',
                    dtlk: row.dtlk,
                    dtqd: row.dtqd,
                    hieuQuaQD: row.hieuQuaQD,
                    soLuong: row.soLuong,
                    donGia: row.donGia,
                    children: []
                };
                if (currentTotal) {
                    currentTotal.children.push(node);
                } else {
                    roots.push(node);
                }
                currentDept = node;
                currentEmp = null;
            } else if (level === 'employee') {
                flushEmpRows();
                const node: DetailNode = {
                    name: row.name,
                    level: 'employee',
                    dtlk: row.dtlk,
                    dtqd: row.dtqd,
                    hieuQuaQD: row.hieuQuaQD,
                    soLuong: row.soLuong,
                    donGia: row.donGia,
                    children: []
                };
                if (currentDept) {
                    currentDept.children.push(node);
                } else if (currentTotal) {
                    currentTotal.children.push(node);
                } else {
                    roots.push(node);
                }
                currentEmp = node;
            } else {
                if (currentEmp) {
                    currentEmpRows.push(row);
                }
            }
        }
        flushEmpRows();
        optimizeTreeHierarchy(roots);
        return roots;
    }

    const roots: DetailNode[] = [];
    
    interface StackElement {
        node: DetailNode;
        indent: number;
    }
    let stack: StackElement[] = [];

    for (const row of rawRows) {
        const level = detectLevel(row.name);
        
        let displayName = row.name;
        if (level === 'nnh' && displayName.startsWith('NNH ')) {
            displayName = displayName.substring(4).trim();
        }

        const node: DetailNode = {
            name: displayName,
            level,
            dtlk: row.dtlk,
            dtqd: row.dtqd,
            hieuQuaQD: row.hieuQuaQD,
            soLuong: row.soLuong,
            donGia: row.donGia,
            children: []
        };

        if (level === 'total') {
            roots.push(node);
            stack = [{ node, indent: row.indent }];
        } else if (level === 'department') {
            const totalEl = stack.find(el => el.node.level === 'total');
            if (totalEl) {
                totalEl.node.children.push(node);
            } else {
                roots.push(node);
            }
            stack = stack.filter(el => el.node.level === 'total');
            stack.push({ node, indent: row.indent });
        } else if (level === 'employee') {
            const parentEl = stack.find(el => el.node.level === 'department') || stack.find(el => el.node.level === 'total');
            if (parentEl) {
                parentEl.node.children.push(node);
            } else {
                roots.push(node);
            }
            stack = stack.filter(el => ['total', 'department'].includes(el.node.level));
            stack.push({ node, indent: row.indent });
        } else if (level === 'nnh') {
            const parentEl = stack.find(el => el.node.level === 'employee');
            if (parentEl) {
                parentEl.node.children.push(node);
            }
            stack = stack.filter(el => ['total', 'department', 'employee'].includes(el.node.level));
            stack.push({ node, indent: row.indent });
        } else {
            const nnhEl = stack.find(el => el.node.level === 'nnh');
            if (nnhEl) {
                nnhEl.node.children.push(node);
            }
        }
    }

    rebuildAllNnhChildren(roots);
    optimizeTreeHierarchy(roots);

    return roots;
}

function optimizeTreeHierarchy(roots: DetailNode[]) {
    const walk = (node: DetailNode) => {
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                walk(child);
            }

            // Level 5 (hang) - roll up product metrics if children exist
            if (node.level === 'hang') {
                let totalDtlk = 0;
                let totalDtqd = 0;
                let totalSoLuong = 0;
                for (const prod of node.children) {
                    totalDtlk += prod.dtlk;
                    totalDtqd += prod.dtqd;
                    totalSoLuong += prod.soLuong;
                }
                
                if (totalSoLuong > 0 || totalDtqd > 0) {
                    node.dtlk = totalDtlk;
                    node.dtqd = totalDtqd;
                    node.soLuong = totalSoLuong;
                }
                node.donGia = node.soLuong > 0 ? (node.dtqd / node.soLuong) : 0;
                node.hieuQuaQD = node.dtlk > 0 ? (node.dtqd - node.dtlk) / node.dtlk : 0;

                if (node.children.length === 1) {
                    const singleChild = node.children[0];
                    if (singleChild.name.trim().toLowerCase() === node.name.trim().toLowerCase()) {
                        node.children = [];
                    }
                }
            }

            // Level 4 (nhomHang)
            if (node.level === 'nhomHang') {
                let totalDtlk = 0;
                let totalDtqd = 0;
                let totalSoLuong = 0;
                for (const hang of node.children) {
                    totalDtlk += hang.dtlk;
                    totalDtqd += hang.dtqd;
                    totalSoLuong += hang.soLuong;
                }
                
                if (totalSoLuong > 0 || totalDtqd > 0) {
                    node.dtlk = totalDtlk;
                    node.dtqd = totalDtqd;
                    node.soLuong = totalSoLuong;
                }
                node.donGia = node.soLuong > 0 ? (node.dtqd / node.soLuong) : 0;
                node.hieuQuaQD = node.dtlk > 0 ? (node.dtqd - node.dtlk) / node.dtlk : 0;
            }
            
            if (['nnh', 'employee', 'department', 'total'].includes(node.level)) {
                let totalDtlk = 0;
                let totalDtqd = 0;
                let totalSoLuong = 0;
                for (const child of node.children) {
                    totalDtlk += child.dtlk;
                    totalDtqd += child.dtqd;
                    totalSoLuong += child.soLuong;
                }
                if (totalSoLuong > 0 || totalDtqd > 0) {
                    node.dtlk = totalDtlk;
                    node.dtqd = totalDtqd;
                    node.soLuong = totalSoLuong;
                }
                node.donGia = node.soLuong > 0 ? (node.dtqd / node.soLuong) : 0;
                node.hieuQuaQD = node.dtlk > 0 ? (node.dtqd - node.dtlk) / node.dtlk : 0;
            }
        }
    };

    for (const root of roots) {
        walk(root);
    }
}
