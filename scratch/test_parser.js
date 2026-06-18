import fs from 'fs';

function parseNum(s) {
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

function detectLevel(name) {
    if (name === 'Tổng') return 'total';
    if (name.startsWith('BP ')) return 'department';
    if (/\s-\s\d{4,}$/.test(name)) return 'employee';
    if (name.startsWith('NNH ')) return 'nnh';
    return 'nhomHang'; // Temp
}

function isCategoryName(name) {
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

function rebuildNnhChildren(flatChildren) {
    const structuredChildren = [];
    let currentNhomHang = null;
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

function rebuildAllNnhChildren(roots) {
    const walk = (node) => {
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

export function parseDetailDataV2(raw) {
    if (!raw) return [];

    const lines = raw.split('\n').filter(l => l.trim());
    const headerIdx = lines.findIndex(l => l.includes('Nhân viên') && l.includes('DTLK') && l.includes('DTQĐ'));
    if (headerIdx === -1) return [];

    const dataLines = lines.slice(headerIdx + 1);
    if (dataLines.length === 0) return [];

    const rawRows = [];
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
            dtlk: parseNum(parts[nameIdx + 1]),
            dtqd: parseNum(parts[nameIdx + 2]),
            hieuQuaQD: parseNum(parts[nameIdx + 3]),
            soLuong: parseNum(parts[nameIdx + 4]),
            donGia: parseNum(parts[nameIdx + 5]),
        });
    }

    const roots = [];
    let stack = [];

    for (const row of rawRows) {
        const level = detectLevel(row.name);
        
        let displayName = row.name;
        if (level === 'nnh' && displayName.startsWith('NNH ')) {
            displayName = displayName.substring(4).trim();
        }

        const node = {
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

// Test case where sibling category groups have different indentation
const mockTsv = `Nhân viên\tDTLK\tDTQĐ\tHiệu quả QĐ\tSố lượng\tĐơn giá
Tổng\t10000\t15000\t0.5\t100\t150
BP All In One - ĐMX\t8623.43\t12803.30\t0.48\t4250\t3.01
Chế Thị Út - 95970\t488.48\t757.51\t0.55\t310\t2.44
\tNNH Điện gia dụng\t85.15\t166.70\t0.96\t135\t1.23
\t\tLọc nước dạng tủ đứng\t26.27\t54.98\t1.09\t4\t13.74
\t\t\tKangaroo\t16.00\t30.00\t1.00\t2\t15.00
\t\t\tKarofi\t10.27\t24.98\t1.18\t2\t12.49
\t\t\tQuạt điều hòa\t19.08\t36.98\t0.94\t7\t5.28
\t\t\tNồi cơm nắp gài/nắp rời\t9.82\t18.17\t0.85\t14\t1.30
\t\tBếp gas đôi\t4.95\t9.17\t0.85\t3\t3.06
\t\tBình đun siêu tốc\t4.67\t8.64\t0.85\t47\t0.18
\t\tMáy lọc không khí\t2.95\t6.35\t1.15\t1\t6.35
\t\tQuạt đứng\t2.25\t4.16\t0.85\t4\t1.04
\t\tXay Sinh tố\t2.20\t4.07\t0.85\t3\t1.36
Lên Trường Sơn - 21707\t2.40\t8.82\t2.67\t1\t8.82
\tNNH Phụ kiện\t2.40\t8.82\t2.67\t1\t8.82
\t\tLoa di động\t2.40\t8.82\t2.67\t1\t8.82
`;

const res = parseDetailDataV2(mockTsv);
console.log(JSON.stringify(res, null, 2));
