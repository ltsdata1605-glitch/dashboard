/**
 * Parser for 4-level employee revenue detail data.
 * Hierarchy: Department > Employee > Ngành hàng (NNH) > Nhóm hàng > Hãng
 */

export interface DetailNode {
    name: string;
    level: 'total' | 'department' | 'employee' | 'nnh' | 'nhomHang' | 'hang';
    dtlk: number;
    dtqd: number;
    hieuQuaQD: number;
    soLuong: number;
    donGia: number;
    children: DetailNode[];
}

function parseNum(s: string): number {
    if (!s) return 0;
    let cleaned = s.trim();
    // If there is both a dot and a comma:
    if (cleaned.includes('.') && cleaned.includes(',')) {
        if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            // Vietnamese: 8.623,43 -> remove dots, replace comma with dot
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            // English: 8,623.43 -> remove commas
            cleaned = cleaned.replace(/,/g, '');
        }
    } else if (cleaned.includes(',')) {
        // Only comma: 166,70 (decimal) or 4,250 (thousand)
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3) {
            cleaned = cleaned.replace(/,/g, '');
        } else {
            cleaned = cleaned.replace(',', '.');
        }
    } else if (cleaned.includes('.')) {
        // Only dot: 4.250 (thousand) or 8623.43 (decimal)
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3) {
            cleaned = cleaned.replace(/\./g, '');
        }
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}


const isLevel0 = (name: string): boolean => {
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

/**
 * Detect row level from context:
 * - "Tổng" → total
 * - Starts with "BP " → department
 * - Matches "Name - DIGITS" (employee ID pattern) → employee
 * - Starts with "NNH " → nnh (ngành hàng)
 * - Everything else is nhomHang or hang (determined by children)
 */
function detectLevel(name: string): 'total' | 'department' | 'employee' | 'nnh' | 'nhomHang' {
    if (name === 'Tổng') return 'total';
    if (name.startsWith('BP ')) return 'department';
    // Employee: "Name - 12345" or "Name - 123456"
    if (/\s-\s\d{4,}$/.test(name)) return 'employee';
    if (isLevel0(name)) return 'nnh';
    return 'nhomHang'; // Will be refined to 'hang' based on tree structure
}

export function parseDetailData(raw: string): DetailNode[] {
    return parseDetailDataV2(raw);
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
        'xoay', 'ép', 'âm thanh', 'kỹ thuật số', 'gia dụng', 'điện tử', 'điện lạnh'
    ];

    return categoryKeywords.some(keyword => lowercaseName.includes(keyword));
}

function rebuildNnhChildren(flatChildren: DetailNode[]): DetailNode[] {
    const structuredChildren: DetailNode[] = [];
    let currentNhomHang: DetailNode | null = null;
    let remainingSL = 0;
    let remainingDTQD = 0;

    for (const child of flatChildren) {
        let isBrand = false;
        if (currentNhomHang) {
            const hasCatKeyword = isCategoryName(child.name);
            const fitsQty = child.soLuong <= remainingSL + 0.1;
            const fitsRevenue = child.dtqd <= remainingDTQD + 1.0;
            
            if (!hasCatKeyword && fitsQty && fitsRevenue && remainingSL > 0) {
                isBrand = true;
            }
        }

        if (isBrand && currentNhomHang) {
            child.level = 'hang';
            currentNhomHang.children.push(child);
            remainingSL -= child.soLuong;
            remainingDTQD -= child.dtqd;
        } else {
            child.level = 'nhomHang';
            child.children = [];
            structuredChildren.push(child);
            currentNhomHang = child;
            remainingSL = child.soLuong;
            remainingDTQD = child.dtqd;
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

/**
 * Better parser: re-parse using a cleaner state machine approach and mathematical prefix sums.
 */
export function parseDetailDataV2(raw: string): DetailNode[] {
    if (!raw) return [];

    // Split into lines, filter out empty lines, but do not trim them immediately
    // to preserve leading spaces/tabs
    const lines = raw.split('\n').filter(l => l.trim());
    const headerIdx = lines.findIndex(l => l.includes('Nhân viên') && l.includes('DTLK') && l.includes('DTQĐ'));
    if (headerIdx === -1) return [];

    const dataLines = lines.slice(headerIdx + 1);
    if (dataLines.length === 0) return [];

    // Parse all rows with detected levels and indentation
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
        
        // Find the first non-empty cell as the name cell
        let nameIdx = 0;
        while (nameIdx < parts.length && parts[nameIdx].trim() === '') {
            nameIdx++;
        }
        if (nameIdx >= parts.length) continue; // empty line

        const rawName = parts[nameIdx];
        const leadingSpaces = rawName.length - rawName.trimStart().length;
        const name = rawName.trim();
        if (!name) continue;

        // Skip known non-data lines
        if (name.includes('Hỗ trợ BI') || name.includes('Logo BI') || name.includes('Trang chủ')) continue;
        // Skip filter/header lines
        if (name.includes('Doanh thu theo') || name.includes('Ngành hàng chính') || name.includes('Tháng ') || name.includes('Phòng ban') || name.includes('Tất cả ngành hàng') || name.includes('Danh sách')) continue;
        if (name === 'Nhân viên') continue;

        const indent = nameIdx * 4 + leadingSpaces;

        rawRows.push({
            name,
            indent,
            dtlk: parseNum(parts[nameIdx + 1]),
            dtqd: parseNum(parts[nameIdx + 2]),
            hieuQuaQD: parseNum(parts[nameIdx + 3]),
            soLuong: parseNum(parts[nameIdx + 4]),
            donGia: parseNum(parts[nameIdx + 5]),
        });
    }

    // Build tree using stack for total -> department -> employee -> NNH -> nhomHang -> hang
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
            // Push directly as flat child under current NNH
            const nnhEl = stack.find(el => el.node.level === 'nnh');
            if (nnhEl) {
                nnhEl.node.children.push(node);
            }
        }
    }

    // Now rebuild and restructure all NNH children lists
    rebuildAllNnhChildren(roots);

    return roots;
}
