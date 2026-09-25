import { parseNumber, IndustryTreeNode, formatIndustryDisplayName } from '../utils/dashboardHelpers';

export interface IndustryKpiCardConfig {
    id: string;
    title: string;
    type?: 'industry' | 'subIndustry'; // 'industry' = Ngành hàng (Level 0), 'subIndustry' = Nhóm hàng (Level 1)
}

export interface IndustryKpiMetricData {
    id: string;
    title: string;
    displayTitle: string;
    type: 'industry' | 'subIndustry';
    matchedName?: string;
    parentName?: string;
    sl: number;
    dtThuc: number;
    dtQd: number;
    target: number;
    ptHt: number;
    tb3t: number;
    growth: number; // %TT
    dtTraGop: number;
    ptTraGop: number;
    hasData: boolean;
}

export const DEFAULT_INDUSTRY_KPI_CARDS: IndustryKpiCardConfig[] = [
    { id: 'sub_smartphone', title: 'Smartphone', type: 'subIndustry' },
    { id: 'ind_laptop', title: 'Laptop', type: 'industry' },
    { id: 'sub_iphone', title: 'Iphone', type: 'subIndustry' },
    { id: 'sub_dongho', title: 'Đồng hồ thời trang', type: 'subIndustry' },
    { id: 'sub_simdata', title: 'Sim data', type: 'subIndustry' },
    { id: 'sub_pinsac', title: 'Pin sạc dự phòng', type: 'subIndustry' },
    { id: 'sub_camera', title: 'Camera', type: 'subIndustry' },
    { id: 'sub_tainghe', title: 'Tai nghe', type: 'subIndustry' },
    { id: 'ind_tulanh', title: 'Tủ lạnh, đông, mát', type: 'industry' },
    { id: 'sub_tivi', title: 'Tivi', type: 'subIndustry' },
    { id: 'ind_maygiat', title: 'Máy giặt, sấy', type: 'industry' },
    { id: 'ind_maylanh', title: 'Máy lạnh & máy nước nóng', type: 'industry' },
];

/**
 * Chuẩn hoá chuỗi để so khớp không phân biệt dấu, khoảng trắng, mã số
 */
export const normalizeKpiName = (name: string): string => {
    if (!name) return '';
    // Loại bỏ mã số ở đầu: "1491 - Smartphone" -> "Smartphone"
    const cleaned = name.replace(/^NNH\s+/i, '').replace(/^\d+\s*-\s*/, '').trim();
    return cleaned
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '')
        .trim();
};

export interface IndustryItemOption {
    id: string;
    rawName: string;
    displayName: string;
    type: 'industry' | 'subIndustry';
    parentName?: string;
}

/**
 * Lấy danh sách toàn bộ các Ngành hàng và Nhóm hàng có trong cây dữ liệu
 */
export const getAllAvailableIndustryItems = (tree?: IndustryTreeNode[] | null): {
    industries: IndustryItemOption[];
    subIndustries: IndustryItemOption[];
} => {
    if (!tree || tree.length === 0) {
        return { industries: [], subIndustries: [] };
    }

    const industries: IndustryItemOption[] = [];
    const subIndustries: IndustryItemOption[] = [];
    const seenSub = new Set<string>();

    tree.forEach((node) => {
        if (!node.name || node.name === 'Tổng' || node.name === 'Không tính doanh thu') return;
        const indDisplayName = formatIndustryDisplayName(node.name);
        industries.push({
            id: `ind_${normalizeKpiName(node.name)}`,
            rawName: node.name,
            displayName: indDisplayName,
            type: 'industry',
        });

        node.children.forEach((child) => {
            if (!child.name || child.name === 'Tổng' || child.name === 'Không tính doanh thu') return;
            const subDisplayName = formatIndustryDisplayName(child.name);
            const normSub = normalizeKpiName(child.name);
            if (!seenSub.has(normSub)) {
                seenSub.add(normSub);
                subIndustries.push({
                    id: `sub_${normSub}`,
                    rawName: child.name,
                    displayName: subDisplayName,
                    type: 'subIndustry',
                    parentName: indDisplayName,
                });
            }
        });
    });

    return { industries, subIndustries };
};

/**
 * Trích xuất chỉ số KPI cho một cấu hình thẻ từ cây dữ liệu và danh sách headers
 */
export const extractKpiMetric = (
    config: IndustryKpiCardConfig,
    tree: IndustryTreeNode[] | undefined | null,
    headers: string[],
    isRealtime: boolean
): IndustryKpiMetricData => {
    const defaultResult: IndustryKpiMetricData = {
        id: config.id,
        title: config.title,
        displayTitle: config.title,
        type: config.type || 'subIndustry',
        sl: 0,
        dtThuc: 0,
        dtQd: 0,
        target: 0,
        ptHt: 0,
        tb3t: 0,
        growth: 0,
        dtTraGop: 0,
        ptTraGop: 0,
        hasData: false,
    };

    if (!tree || tree.length === 0 || !headers || headers.length === 0) {
        return defaultResult;
    }

    const targetNorm = normalizeKpiName(config.title);

    // Tìm kiếm node khớp nhất trong cây:
    let matchedNode: IndustryTreeNode | null = null;
    let matchedParentName: string | undefined = undefined;
    let detectedType: 'industry' | 'subIndustry' = config.type || 'subIndustry';

    // Ưu tiên 1: Khớp chính xác theo loại người dùng chọn
    if (config.type === 'industry') {
        for (const node of tree) {
            const nodeNorm = normalizeKpiName(node.name);
            if (nodeNorm === targetNorm || nodeNorm.includes(targetNorm) || targetNorm.includes(nodeNorm)) {
                matchedNode = node;
                detectedType = 'industry';
                break;
            }
        }
    } else if (config.type === 'subIndustry') {
        for (const node of tree) {
            for (const child of node.children) {
                const childNorm = normalizeKpiName(child.name);
                if (childNorm === targetNorm || childNorm.includes(targetNorm) || targetNorm.includes(childNorm)) {
                    matchedNode = child;
                    matchedParentName = formatIndustryDisplayName(node.name);
                    detectedType = 'subIndustry';
                    break;
                }
            }
            if (matchedNode) break;
        }
    }

    // Ưu tiên 2 (fallback nếu chưa tìm thấy): quét toàn bộ cây (cả Level 0 và Level 1)
    if (!matchedNode) {
        // Thử tìm trong nhóm con (subIndustry) trước
        for (const node of tree) {
            for (const child of node.children) {
                const childNorm = normalizeKpiName(child.name);
                if (childNorm === targetNorm || childNorm.includes(targetNorm) || targetNorm.includes(childNorm)) {
                    matchedNode = child;
                    matchedParentName = formatIndustryDisplayName(node.name);
                    detectedType = 'subIndustry';
                    break;
                }
            }
            if (matchedNode) break;
        }

        // Nếu vẫn không thấy, thử tìm ở ngành cha (industry)
        if (!matchedNode) {
            for (const node of tree) {
                const nodeNorm = normalizeKpiName(node.name);
                if (nodeNorm === targetNorm || nodeNorm.includes(targetNorm) || targetNorm.includes(nodeNorm)) {
                    matchedNode = node;
                    detectedType = 'industry';
                    break;
                }
            }
        }
    }

    if (!matchedNode) {
        return defaultResult;
    }

    // Bóc tách giá trị từ `matchedNode.values` dựa vào headers
    const slIdx = headers.findIndex(h => h === 'SL Realtime' || h === 'Số lượng');
    const dtThucIdx = headers.findIndex(h => h === 'DTLK' || h === 'DOANH THU' || h === 'D.THU');
    const dtqdIdx = headers.findIndex(h => h === 'DT Realtime (QĐ)' || h === 'DTQĐ' || h === 'DOANH THU QĐ');
    const targetIdx = headers.findIndex(h => h === 'Target Ngày (QĐ)' || h === 'Target (QĐ)' || h === 'TARGET');
    const htIdx = headers.findIndex(h => h === '% HT Target Ngày (QĐ)' || h === '% HT Target (QĐ)' || h === '% HT TARGET');
    const tb3tIdx = headers.findIndex(h => h === 'TB 3 Tháng' || h === 'TB 3 THÁNG');
    const ttIdx = headers.findIndex(h => h === '% TT' || h === '+/- DTCK Tháng (QĐ)');
    const dtgIdx = headers.findIndex(h => h === 'DT Trả Góp' || h === 'DT TRẢ GÓP' || h === 'DT Trả Chậm' || h === 'DT TRẢ CHẬM');
    const ptgIdx = headers.findIndex(h => h === 'Tỷ Trọng Trả Góp' || h === '% TRẢ GÓP' || h === 'Tỷ Trọng Trả Chậm');

    const sl = slIdx >= 0 ? parseNumber(matchedNode.values[slIdx]) : 0;
    const dtThuc = dtThucIdx >= 0 ? parseNumber(matchedNode.values[dtThucIdx]) : 0;
    const dtQd = dtqdIdx >= 0 ? parseNumber(matchedNode.values[dtqdIdx]) : 0;
    const target = targetIdx >= 0 ? parseNumber(matchedNode.values[targetIdx]) : 0;
    const tb3t = tb3tIdx >= 0 ? parseNumber(matchedNode.values[tb3tIdx]) : 0;
    const growth = ttIdx >= 0 ? parseNumber(matchedNode.values[ttIdx]) : 0;
    const dtTraGop = dtgIdx >= 0 ? parseNumber(matchedNode.values[dtgIdx]) : 0;

    let ptHt = 0;
    if (htIdx >= 0 && matchedNode.values[htIdx]) {
        ptHt = parseNumber(matchedNode.values[htIdx]);
    } else if (target > 0) {
        ptHt = Math.round((dtQd / target) * 100);
    }

    let ptTraGop = 0;
    if (ptgIdx >= 0 && matchedNode.values[ptgIdx]) {
        ptTraGop = parseNumber(matchedNode.values[ptgIdx]);
    } else if (dtQd > 0 && dtTraGop > 0) {
        ptTraGop = Math.round((dtTraGop / dtQd) * 100);
    }

    return {
        id: config.id,
        title: config.title,
        displayTitle: formatIndustryDisplayName(matchedNode.name) || config.title,
        type: detectedType,
        matchedName: matchedNode.name,
        parentName: matchedParentName,
        sl,
        dtThuc,
        dtQd,
        target,
        ptHt,
        tb3t,
        growth,
        dtTraGop,
        ptTraGop,
        hasData: true,
    };
};
