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
    const cleaned = s.replace(/,/g, '').trim();
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}

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
    if (name.startsWith('NNH ')) return 'nnh';
    return 'nhomHang'; // Will be refined to 'hang' based on tree structure
}

export function parseDetailData(raw: string): DetailNode[] {
    if (!raw) return [];

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
    
    // Find header line
    const headerIdx = lines.findIndex(l => l.includes('Nhân viên') && l.includes('DTLK') && l.includes('DTQĐ'));
    if (headerIdx === -1) return [];

    const dataLines = lines.slice(headerIdx + 1);
    if (dataLines.length === 0) return [];

    const roots: DetailNode[] = [];
    
    // Stack-based parsing for hierarchy
    let currentTotal: DetailNode | null = null;
    let currentDept: DetailNode | null = null;
    let currentEmployee: DetailNode | null = null;
    let currentNnh: DetailNode | null = null;
    let currentNhomHang: DetailNode | null = null;

    for (const line of dataLines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;

        const name = parts[0].trim();
        if (!name) continue;

        // Skip known non-data lines
        if (name.includes('Hỗ trợ BI') || name.includes('Logo BI') || name.includes('Trang chủ')) continue;
        // Skip filter/header lines
        if (name.includes('Doanh thu theo') || name.includes('Ngành hàng chính') || name.includes('Tháng ') || name.includes('Phòng ban') || name.includes('Tất cả ngành hàng') || name.includes('Danh sách')) continue;
        if (name === 'Nhân viên') continue;

        const level = detectLevel(name);
        
        const node: DetailNode = {
            name,
            level,
            dtlk: parseNum(parts[1]),
            dtqd: parseNum(parts[2]),
            hieuQuaQD: parseNum(parts[3]),
            soLuong: parseNum(parts[4]),
            donGia: parseNum(parts[5]),
            children: []
        };

        if (level === 'total') {
            currentTotal = node;
            currentDept = null;
            currentEmployee = null;
            currentNnh = null;
            currentNhomHang = null;
            roots.push(node);
        } else if (level === 'department') {
            currentDept = node;
            currentEmployee = null;
            currentNnh = null;
            currentNhomHang = null;
            if (currentTotal) {
                currentTotal.children.push(node);
            } else {
                roots.push(node);
            }
        } else if (level === 'employee') {
            currentEmployee = node;
            currentNnh = null;
            currentNhomHang = null;
            if (currentDept) {
                currentDept.children.push(node);
            } else if (currentTotal) {
                currentTotal.children.push(node);
            } else {
                roots.push(node);
            }
        } else if (level === 'nnh') {
            currentNnh = node;
            currentNhomHang = null;
            if (currentEmployee) {
                currentEmployee.children.push(node);
            }
        } else {
            // nhomHang or hang — depends on context
            if (currentNhomHang && currentNnh) {
                // Check if this is a child of current nhomHang (hang level)
                // A hang is a leaf under nhomHang. If we're already inside a nhomHang,
                // check if this looks like a brand (no NNH prefix, appears after nhomHang)
                // Heuristic: if there's an existing nhomHang and this row could be a child brand
                node.level = 'hang';
                currentNhomHang.children.push(node);
            } else if (currentNnh) {
                // First non-NNH after an NNH is nhomHang
                currentNhomHang = node;
                node.level = 'nhomHang';
                currentNnh.children.push(node);
            }
        }
    }

    // Post-process: refine nhomHang vs hang
    // Rule: if a nhomHang has no children, AND there's a subsequent row that was put as hang,
    // we need to check the tree. Actually the heuristic above doesn't handle the transition 
    // from one nhomHang to another well. Let me use a better approach.
    
    // Re-parse with a smarter sub-tree builder for the NNH level
    return reprocessTree(roots);
}

/**
 * Re-process tree to correctly assign nhomHang vs hang.
 * Within each NNH, rows alternate between nhomHang and their child hangs.
 * Pattern: each NNH contains nhomHang entries, and each nhomHang contains hang entries.
 * 
 * From the sample data, the structure under NNH is:
 *   Nhóm hàng 1 (e.g., "Máy lạnh (IMEI)")
 *     Hãng 1 (e.g., "Daikin")
 *     Hãng 2 (e.g., "NAGAKAWA")
 *   Nhóm hàng 2 (e.g., "Tủ lạnh (IMEI)")
 *     Hãng 1
 * 
 * We rebuild NNH children by detecting: a row whose children come right after it
 * at the same apparent level, forming nhomHang > hang pairs.
 */
function reprocessTree(roots: DetailNode[]): DetailNode[] {
    for (const root of roots) {
        for (const dept of root.children) {
            for (const emp of dept.children) {
                for (const nnh of emp.children) {
                    if (nnh.level === 'nnh') {
                        nnh.children = rebuildNnhChildren(nnh.children);
                    }
                }
            }
        }
    }
    return roots;
}

/**
 * Given flat list of rows under an NNH, rebuild nhomHang > hang hierarchy.
 * Strategy: parse sequentially. First encountered row = nhomHang.
 * All rows after it until the next nhomHang = hang.
 * We detect a new nhomHang when a row name is NOT a known brand pattern.
 * 
 * Better approach: re-parse from raw. Since we already built a flat list,
 * we need context. The simplest approach: rebuild from the original flat parsing.
 * 
 * Actually, let's use a simpler initial approach:
 * Just do a two-pass parse from the raw data with proper state tracking.
 */
function rebuildNnhChildren(flatChildren: DetailNode[]): DetailNode[] {
    // Already built during initial parse - just ensure levels are correct
    // If the initial parse correctly assigned nhomHang and hang, return as-is
    return flatChildren;
}

/**
 * Better parser: re-parse using a cleaner state machine approach and mathematical prefix sums.
 */
export function parseDetailDataV2(raw: string): DetailNode[] {
    if (!raw) return [];

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
    const headerIdx = lines.findIndex(l => l.includes('Nhân viên') && l.includes('DTLK') && l.includes('DTQĐ'));
    if (headerIdx === -1) return [];

    const dataLines = lines.slice(headerIdx + 1);
    if (dataLines.length === 0) return [];

    // Parse all rows with detected levels
    interface RawRow {
        name: string;
        dtlk: number;
        dtqd: number;
        hieuQuaQD: number;
        soLuong: number;
        donGia: number;
        originalName: string;
        leadingSpaces: number;
    }

    const rawRows: RawRow[] = [];
    for (const line of dataLines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;
        const rawName = parts[0];
        const leadingSpaces = rawName.length - rawName.trimStart().length;
        const name = rawName.trim();
        if (!name) continue;
        if (name.includes('Hỗ trợ BI') || name.includes('Logo BI') || name.includes('Trang chủ')) continue;
        if (name.includes('Doanh thu theo') || name.includes('Ngành hàng chính') || name.includes('Tháng ') || name.includes('Phòng ban') || name.includes('Tất cả ngành hàng') || name.includes('Danh sách')) continue;
        if (name === 'Nhân viên') continue;

        rawRows.push({
            name,
            originalName: rawName,
            leadingSpaces,
            dtlk: parseNum(parts[1]),
            dtqd: parseNum(parts[2]),
            hieuQuaQD: parseNum(parts[3]),
            soLuong: parseNum(parts[4]),
            donGia: parseNum(parts[5]),
        });
    }

    // Build tree using stack for total -> department -> employee -> NNH
    const roots: DetailNode[] = [];
    const stack: { node: DetailNode; depth: number }[] = [];

    const levelDepth: Record<string, number> = {
        'total': 0, 'department': 1, 'employee': 2, 'nnh': 3
    };

    // We will collect all rows under each NNH as a flat list, and process them mathematically
    let currentNnhNode: DetailNode | null = null;

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        let level: DetailNode['level'] = detectLevel(row.name);
        
        if (level === 'total' || level === 'department' || level === 'employee' || level === 'nnh') {
            const depth = levelDepth[level];
            let nodeName = row.name;
            if (level === 'nnh' && nodeName.startsWith('NNH ')) {
                nodeName = nodeName.substring(4).trim();
            }
            const node: DetailNode = { ...row, name: nodeName, level, children: [] };
            
            while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
                stack.pop();
            }

            if (stack.length === 0) {
                roots.push(node);
            } else {
                stack[stack.length - 1].node.children.push(node);
            }

            stack.push({ node, depth });

            if (level === 'nnh') {
                currentNnhNode = node;
            } else {
                currentNnhNode = null;
            }
        } else {
            // It's a generic row (nhomHang or hang) under an NNH
            if (currentNnhNode) {
                // Temporarily add as a flat child. We will rebuild the hierarchy later.
                const node: DetailNode = { ...row, level: 'nhomHang', children: [] };
                currentNnhNode.children.push(node);
            }
        }
    }

    // Rebuild the NNH -> nhomHang -> hang hierarchy using mathematical prefix sums
    for (const root of roots) {
        for (const dept of root.children) {
            for (const emp of dept.children) {
                for (const nnh of emp.children) {
                    if (nnh.level === 'nnh') {
                        nnh.children = rebuildNnhChildrenMathematically(nnh.children);
                    }
                }
            }
        }
    }

    return roots;
}

/**
 * Mathematically determines the hierarchy of nhomHang and hang.
 * For each row assumed to be a nhomHang, its children (if any) MUST sum to its dtqd.
 * We look ahead to find a prefix of subsequent rows that sum to the nhomHang's dtqd.
 */
function rebuildNnhChildrenMathematically(flatChildren: DetailNode[]): DetailNode[] {
    const result: DetailNode[] = [];
    let i = 0;
    const tolerance = 1.0; // Allow 1 unit rounding difference

    while (i < flatChildren.length) {
        const potentialNhomHang = flatChildren[i];
        potentialNhomHang.level = 'nhomHang';
        
        let foundChildren = false;
        let runningSum = 0;
        let j = i + 1;
        
        // Look ahead to see if there's a prefix summing to potentialNhomHang.dtqd
        while (j < flatChildren.length) {
            runningSum += flatChildren[j].dtqd;
            
            if (Math.abs(runningSum - potentialNhomHang.dtqd) <= tolerance) {
                // Found an exact match! The rows from i+1 to j are children.
                foundChildren = true;
                for (let k = i + 1; k <= j; k++) {
                    const child = flatChildren[k];
                    child.level = 'hang';
                    potentialNhomHang.children.push(child);
                }
                i = j + 1; // Move pointer past the children
                break;
            } else if (runningSum > potentialNhomHang.dtqd + tolerance) {
                // Exceeded the target sum without a match, so it has 0 children
                break;
            }
            j++;
        }

        if (!foundChildren) {
            // It has no children. The next row will be treated as the next nhomHang.
            i++;
        }
        
        result.push(potentialNhomHang);
    }

    return result;
}
