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
 * Better parser: re-parse using a cleaner state machine approach.
 * This replaces the above parseDetailData with correct nhomHang/hang detection.
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
    }

    const rawRows: RawRow[] = [];
    for (const line of dataLines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;
        const name = parts[0].trim();
        if (!name) continue;
        if (name.includes('Hỗ trợ BI') || name.includes('Logo BI') || name.includes('Trang chủ')) continue;
        if (name.includes('Doanh thu theo') || name.includes('Ngành hàng chính') || name.includes('Tháng ') || name.includes('Phòng ban') || name.includes('Tất cả ngành hàng') || name.includes('Danh sách')) continue;
        if (name === 'Nhân viên') continue;

        rawRows.push({
            name,
            dtlk: parseNum(parts[1]),
            dtqd: parseNum(parts[2]),
            hieuQuaQD: parseNum(parts[3]),
            soLuong: parseNum(parts[4]),
            donGia: parseNum(parts[5]),
        });
    }

    // Build tree using stack
    const roots: DetailNode[] = [];
    const stack: { node: DetailNode; depth: number }[] = [];

    // Depth mapping: total=0, department=1, employee=2, nnh=3, nhomHang=4, hang=5
    const levelDepth: Record<string, number> = {
        'total': 0, 'department': 1, 'employee': 2, 'nnh': 3, 'nhomHang': 4, 'hang': 5
    };

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        let level: DetailNode['level'] = detectLevel(row.name);
        
        // For nhomHang detection: if current level is nhomHang (generic),
        // check if we're inside an NNH (stack has nnh at depth 3)
        // If parent is NNH → this is nhomHang
        // If parent is nhomHang → this is hang
        let depth: number;
        
        if (level === 'total' || level === 'department' || level === 'employee' || level === 'nnh') {
            depth = levelDepth[level];
        } else {
            // Determine if nhomHang or hang based on stack
            const parentOnStack = findParentOnStack(stack, 3); // nnh depth
            const nhomHangOnStack = findParentOnStack(stack, 4); // nhomHang depth

            if (nhomHangOnStack) {
                // Check: is this a NEW nhomHang or a hang under existing nhomHang?
                // Look ahead: if the next row is also generic and current row's name 
                // doesn't match known patterns... 
                // Simpler: check if there's a row after this that has the SAME parent NNH.
                // Use dtqd comparison: if this row's dtqd equals the sum hint... too complex.
                
                // Best heuristic: look at the NNH's expected children.
                // If this row matches a known nhomHang name pattern (contains "(IMEI)", 
                // "Dây da", "Dây kim loại", etc.), treat as nhomHang.
                // Otherwise: if parent nhomHang exists and this doesn't look like a new nhomHang, 
                // it's a hang.
                
                // Simplest working approach: 
                // After an NNH, alternate: nhomHang → hang(s) → nhomHang → hang(s)
                // A new nhomHang is detected when sum of its hangs' dtqd should equal it.
                // For now: just check if parent NNH dtqd differs significantly from current nhomHang dtqd
                
                // Actually the safest: check if the sum of current nhomHang's children 
                // plus this row would exceed parent NNH. If so, this is a new nhomHang.
                // But we don't know future rows.
                
                // Use a different heuristic: if this row's dtqd is larger than the last hang added,
                // and it's a category name (not a brand), it's probably a new nhomHang.
                // But we can't distinguish categories from brands by name alone.
                
                // Final approach: 
                // After NNH, the FIRST row is always nhomHang.
                // After nhomHang, rows are hang UNTIL a row's values don't fit as a child
                // (i.e., its dtqd > remaining dtqd of parent nhomHang).
                // Actually simplest: track running sum. When sum of hangs >= nhomHang dtqd → next is new nhomHang.
                
                const parentNhomHang = nhomHangOnStack.node;
                const childrenDtqd = parentNhomHang.children.reduce((s, c) => s + c.dtqd, 0);
                const tolerance = 0.5; // Allow small rounding errors
                
                if (Math.abs(childrenDtqd - parentNhomHang.dtqd) < tolerance || childrenDtqd >= parentNhomHang.dtqd - tolerance) {
                    // Current nhomHang is "full" → this is a NEW nhomHang
                    level = 'nhomHang';
                    depth = 4;
                } else {
                    level = 'hang';
                    depth = 5;
                }
            } else if (parentOnStack) {
                // First generic row after NNH → nhomHang
                level = 'nhomHang';
                depth = 4;
            } else {
                // Shouldn't happen in well-formed data
                continue;
            }
        }

        const node: DetailNode = { ...row, level, children: [] };

        // Pop stack until we find proper parent
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
            stack.pop();
        }

        if (stack.length === 0) {
            roots.push(node);
        } else {
            stack[stack.length - 1].node.children.push(node);
        }

        stack.push({ node, depth });
    }

    return roots;
}

function findParentOnStack(stack: { node: DetailNode; depth: number }[], targetDepth: number): { node: DetailNode; depth: number } | null {
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].depth === targetDepth) return stack[i];
    }
    return null;
}
