import { parseNumber, shortenName } from '../../../utils/dashboardHelpers';
import type { ProcessedProgram } from '../CompetitionView';

export const ALLOWED_REALTIME_COLUMNS = [
    'Realtime',
    'Target',
    '%HT',
    'Target V.Trội',
    '%HT V.Trội',
    'Còn Lại'
] as const;

export const ALLOWED_LUYKE_COLUMNS = [
    'L.Kế',
    'Target',
    '%HT',
    '%DKHT',
    'Target V.Trội',
    '%HT V.Trội',
    '%DKHT V.Trội',
    'Còn Lại'
] as const;

/**
 * Xử lý bật/tắt cột theo quy tắc nhóm loại trừ tương hỗ giữa Cơ bản và Vượt trội,
 * đồng thời cho phép người dùng tuỳ chỉnh bật/tắt bớt các cột % trong cùng một bộ:
 * - Nhóm Cơ bản:
 *   + Realtime: ['Target', '%HT']
 *   + Luỹ kế: ['Target', '%HT', '%DKHT']
 * - Nhóm Vượt trội:
 *   + Realtime: ['Target V.Trội', '%HT V.Trội']
 *   + Luỹ kế: ['Target V.Trội', '%HT V.Trội', '%DKHT V.Trội']
 * 
 * Quy tắc:
 * 1. Chuyển đổi giữa 2 bộ:
 *    - Đang ở bộ Vượt trội mà click vào cột Cơ bản => chuyển sang bộ Cơ bản, tắt sạch bộ Vượt trội.
 *    - Đang ở bộ Cơ bản mà click vào cột Vượt trội => chuyển sang bộ Vượt trội, tắt sạch bộ Cơ bản.
 * 2. Tuỳ chỉnh trong cùng 1 bộ:
 *    - Người dùng có thể tuỳ chỉnh bật/tắt riêng lẻ các cột % (%HT, %DKHT, %HT V.Trội, %DKHT V.Trội).
 *    - Nếu click vào cột Target chính (anchor) của bộ đang bật: chuyển sang bộ đối diện.
 * 3. Bảo toàn tối thiểu: Bảng luôn giữ ít nhất 1 bộ Target để tính toán cột "Còn Lại".
 * 4. Các cột độc lập (THỰC HIỆN, L.Kế, Còn Lại) bật/tắt bình thường.
 */
export function toggleCompetitionColumn(
    clickedHeader: string,
    currentVisibleColumns: string[],
    allAllowedColumns: string[],
    isRealtime: boolean
): string[] {
    const isStandardCol = (h: string) => h === 'Target' || h === '%HT' || h === '%DKHT' || h === '%HTDK';
    const isSuperCol = (h: string) => h === 'Target V.Trội' || h === '%HT V.Trội' || h === '%DKHT V.Trội' || h === '%HTDK V.Trội';

    const standardCols = (isRealtime
        ? ['Target', '%HT']
        : ['Target', '%HT', '%DKHT']
    ).filter(c => allAllowedColumns.includes(c));

    const luykeSuperCandidate = ['Target V.Trội', '%HT V.Trội', allAllowedColumns.includes('%DKHT V.Trội') ? '%DKHT V.Trội' : '%HTDK V.Trội'];
    const superCols = (isRealtime
        ? ['Target V.Trội', '%HT V.Trội']
        : luykeSuperCandidate
    ).filter(c => allAllowedColumns.includes(c));

    let nextVisible: string[];

    if (isStandardCol(clickedHeader)) {
        const isSuperActive = superCols.some(c => currentVisibleColumns.includes(c));
        if (isSuperActive) {
            // Đang ở bộ Vượt trội -> chuyển sang bộ Cơ bản
            const remaining = currentVisibleColumns.filter(c => !superCols.includes(c) && !standardCols.includes(c));
            nextVisible = [...remaining, ...standardCols];
        } else {
            // Đang ở trong bộ Cơ bản:
            if (clickedHeader === 'Target') {
                // Click vào cột Target chính: chuyển sang bộ Vượt trội
                const remaining = currentVisibleColumns.filter(c => !standardCols.includes(c) && !superCols.includes(c));
                nextVisible = [...remaining, ...superCols];
            } else {
                // Click vào các cột tỷ lệ % (%HT, %DKHT): cho phép người dùng tuỳ chỉnh bật/tắt bớt
                if (currentVisibleColumns.includes(clickedHeader)) {
                    nextVisible = currentVisibleColumns.filter(c => c !== clickedHeader);
                } else {
                    nextVisible = [...currentVisibleColumns, clickedHeader];
                }
            }
        }
    } else if (isSuperCol(clickedHeader)) {
        const isStandardActive = standardCols.some(c => currentVisibleColumns.includes(c));
        if (isStandardActive) {
            // Đang ở bộ Cơ bản -> chuyển sang bộ Vượt trội
            const remaining = currentVisibleColumns.filter(c => !standardCols.includes(c) && !superCols.includes(c));
            nextVisible = [...remaining, ...superCols];
        } else {
            // Đang ở trong bộ Vượt trội:
            if (clickedHeader === 'Target V.Trội') {
                // Click vào cột Target V.Trội chính: chuyển sang bộ Cơ bản
                const remaining = currentVisibleColumns.filter(c => !superCols.includes(c) && !standardCols.includes(c));
                nextVisible = [...remaining, ...standardCols];
            } else {
                // Click vào các cột tỷ lệ % (%HT V.Trội, %DKHT V.Trội): cho phép người dùng tuỳ chỉnh bật/tắt bớt
                if (currentVisibleColumns.includes(clickedHeader)) {
                    nextVisible = currentVisibleColumns.filter(c => c !== clickedHeader);
                } else {
                    nextVisible = [...currentVisibleColumns, clickedHeader];
                }
            }
        }
    } else {
        // Các cột độc lập khác (Realtime, L.Kế, Còn Lại)
        if (currentVisibleColumns.includes(clickedHeader)) {
            nextVisible = currentVisibleColumns.filter(c => c !== clickedHeader);
        } else {
            nextVisible = [...currentVisibleColumns, clickedHeader];
        }
    }

    // Đảm bảo không bao giờ rơi vào trạng thái mất sạch cả 2 bộ Target
    const hasStandardLeft = standardCols.some(c => nextVisible.includes(c));
    const hasSuperLeft = superCols.some(c => nextVisible.includes(c));
    if (!hasStandardLeft && !hasSuperLeft) {
        nextVisible = [...nextVisible, ...(isStandardCol(clickedHeader) ? superCols : standardCols)];
    }

    // THỨ TỰ CÁC CỘT SẼ LUÔN ĐƯỢC SẮP XẾP THEO THỨ TỰ NÀY:
    // Lọc và sắp xếp theo đúng thứ tự chuẩn định sẵn trong allAllowedColumns
    return allAllowedColumns.filter(col => nextVisible.includes(col));
}

/**
 * Lấy các chỉ số % hoàn thành của chương trình theo thứ tự ưu tiên:
 * 1. %HT V.Trội (tiến độ hoàn thành thực tế = LUỸ KẾ / TAR V.TRỘI)
 * 2. %DKHT V.Trội (dự kiến cuối tháng của target vượt trội)
 * 3. %DKHT (%HTDK, %DKHT, % DỰ BÁO, % HT Dự Kiến của target cơ bản)
 * 4. %HT (%HT, % HT NGÀY, % HT THÁNG)
 */
export function getProgramCompletionMetrics(program: ProcessedProgram, headers: string[]): {
    htVT: number | null;
    htDKVT: number | null;
    htDK: number | null;
    ht: number | null;
} {
    // 1. %HT V.Trội (tiến độ hoàn thành thực tế)
    let htVT: number | null = null;
    const htVTIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return (lower === '%ht v.trội' || lower === '%ht target v.trội') && !lower.includes('dk') && !lower.includes('dự');
    });
    if (htVTIndex !== -1 && program.data[htVTIndex] !== undefined && program.data[htVTIndex] !== '' && program.data[htVTIndex] !== '-') {
        const val = parseNumber(program.data[htVTIndex]);
        if (!isNaN(val)) htVT = val;
    }

    // 2. %DKHT V.Trội (%HTDK V.Trội - dự kiến cuối tháng)
    let htDKVT: number | null = null;
    const htDKVTIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === '%dkht v.trội' || 
               lower === '%htdk v.trội' || 
               (lower.includes('%') && lower.includes('trội') && (lower.includes('dk') || lower.includes('dự')));
    });
    if (htDKVTIndex !== -1 && program.data[htDKVTIndex] !== undefined && program.data[htDKVTIndex] !== '' && program.data[htDKVTIndex] !== '-') {
        const val = parseNumber(program.data[htDKVTIndex]);
        if (!isNaN(val)) htDKVT = val;
    }
    if (htDKVT === null && program.htdkVT !== undefined && program.htdkVT !== null) {
        const val = typeof program.htdkVT === 'number' ? program.htdkVT : parseNumber(program.htdkVT);
        if (!isNaN(val)) htDKVT = val;
    }

    // 3. %DKHT (%HTDK, %DKHT, % DỰ BÁO - target cơ bản)
    let htDK: number | null = null;
    const htDKIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return (lower === '%htdk' || 
               lower === '%dkht' || 
               lower === '% dự báo' || 
               lower === '% ht dự kiến') && !lower.includes('trội');
    });
    if (htDKIndex !== -1 && program.data[htDKIndex] !== undefined && program.data[htDKIndex] !== '' && program.data[htDKIndex] !== '-') {
        const val = parseNumber(program.data[htDKIndex]);
        if (!isNaN(val)) htDK = val;
    }

    // 4. %HT (% HT NGÀY / % HT THÁNG - target cơ bản)
    let ht: number | null = null;
    const htIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return (lower === '%ht' || 
               lower === '% ht ngày' || 
               lower === '% ht tháng' || 
               lower === '% ht target ngày' ||
               lower === '% ht target tháng') && !lower.includes('trội') && !lower.includes('dk');
    });
    if (htIndex !== -1 && program.data[htIndex] !== undefined && program.data[htIndex] !== '' && program.data[htIndex] !== '-') {
        const val = parseNumber(program.data[htIndex]);
        if (!isNaN(val)) ht = val;
    }

    return { htVT, htDKVT, htDK, ht };
}

export type PrimaryMetric = 'htVT' | 'htDKVT' | 'htDK' | 'ht';

/**
 * Xác định thứ tự ưu tiên các chỉ số % hoàn thành dựa vào chế độ Realtime/Luỹ kế và cột đang hiển thị:
 * - Realtime: Sắp xếp theo cột %HT hoặc %HT V.Trội (tuỳ nhóm cột nào đang bật hiển thị)
 * - Luỹ kế: Bảng luôn ưu tiên giảm dần theo %HT V.Trội > %DKHT V.Trội > %DKHT > %HT
 */
export function getCompletionSortOrder(
    visibleColumns?: string[],
    isRealtime: boolean = false,
    explicitPrimary?: PrimaryMetric | null
): PrimaryMetric[] {
    if (explicitPrimary) {
        if (explicitPrimary === 'htVT') {
            return isRealtime ? ['htVT', 'ht', 'htDKVT', 'htDK'] : ['htVT', 'htDKVT', 'htDK', 'ht'];
        }
        if (explicitPrimary === 'htDKVT') {
            return ['htDKVT', 'htVT', 'htDK', 'ht'];
        }
        if (explicitPrimary === 'htDK') {
            return ['htDK', 'htVT', 'htDKVT', 'ht'];
        }
        if (explicitPrimary === 'ht') {
            return isRealtime ? ['ht', 'htVT', 'htDKVT', 'htDK'] : ['ht', 'htDK', 'htVT', 'htDKVT'];
        }
    }

    const hasVisible = (keyword: string) => {
        if (!visibleColumns || visibleColumns.length === 0) return false;
        const lower = keyword.toLowerCase();
        return visibleColumns.some(c => c.toLowerCase().includes(lower));
    };

    if (isRealtime) {
        // Realtime: Ưu tiên cột đang hiển thị giữa %HT V.Trội và %HT
        if (hasVisible('trội')) {
            return ['htVT', 'ht', 'htDKVT', 'htDK'];
        }
        if (hasVisible('%ht')) {
            return ['ht', 'htVT', 'htDKVT', 'htDK'];
        }
        return ['htVT', 'ht', 'htDKVT', 'htDK'];
    } else {
        // Luỹ kế: Luôn ưu tiên giảm dần %HT V.Trội > %DKHT V.Trội > %DKHT > %HT
        if (hasVisible('trội')) {
            return ['htVT', 'htDKVT', 'htDK', 'ht'];
        }
        if (hasVisible('dk') || hasVisible('dự')) {
            return ['htDK', 'ht', 'htVT', 'htDKVT'];
        }
        if (hasVisible('%ht')) {
            return ['ht', 'htDK', 'htVT', 'htDKVT'];
        }
        return ['htVT', 'htDKVT', 'htDK', 'ht'];
    }
}

/**
 * So sánh 2 chương trình theo chuỗi ưu tiên:
 * - Realtime: Sắp xếp theo cột %HT hoặc %HT V.Trội
 * - Luỹ kế: Sắp xếp theo cột %DKHT, %HT V.Trội
 */
export function compareByCompletionPriority(
    a: ProcessedProgram,
    b: ProcessedProgram,
    headers: string[],
    direction: 'asc' | 'desc' = 'desc',
    visibleColumns?: string[],
    isRealtime: boolean = false,
    explicitPrimary?: PrimaryMetric | null
): number {
    const aMetrics = getProgramCompletionMetrics(a, headers);
    const bMetrics = getProgramCompletionMetrics(b, headers);

    const mult = direction === 'asc' ? 1 : -1;
    const priorityOrder = getCompletionSortOrder(visibleColumns, isRealtime, explicitPrimary);

    for (const metric of priorityOrder) {
        const aVal = (aMetrics[metric] !== null && !isNaN(aMetrics[metric])) ? aMetrics[metric] : -Infinity;
        const bVal = (bMetrics[metric] !== null && !isNaN(bMetrics[metric])) ? bMetrics[metric] : -Infinity;
        if (aVal !== bVal) {
            return (aVal - bVal) * mult;
        }
    }

    // Tie-breaker ổn định theo tên
    return a.name.localeCompare(b.name);
}

/**
 * Tính toán giá trị "Còn Lại" cho một chương trình dựa trên các cột hiển thị trên bảng.
 * Nguyên tắc: SẼ LẤY THỰC HIỆN - MỤC TIÊU V.TRỘI (nếu cột Mục tiêu V.Trội đang hiển thị).
 * Nếu người dùng chỉ hiển thị cột Mục tiêu thường thì lấy THỰC HIỆN - MỤC TIÊU.
 */
export function calculateProgramRemaining(
    program: ProcessedProgram,
    visibleColumns: string[],
    allHeaders: string[],
    isRealtime: boolean
): number | null {
    // 1. Xác định cột Mục tiêu: Ưu tiên 'Target V.Trội' nếu đang hiển thị hoặc có trong headers
    let targetColName: string | undefined;
    if (visibleColumns.includes('Target V.Trội')) {
        targetColName = 'Target V.Trội';
    } else if (visibleColumns.includes('Target')) {
        targetColName = 'Target';
    } else if (allHeaders.includes('Target V.Trội')) {
        targetColName = 'Target V.Trội';
    } else if (allHeaders.includes('Target')) {
        targetColName = 'Target';
    }

    // 2. Xác định cột Thực hiện: Realtime (ở chế độ RT) hoặc L.Kế (ở chế độ Luỹ kế)
    let actualColName: string | undefined;
    if (isRealtime) {
        actualColName = visibleColumns.find(c => c.startsWith('Realtime')) || 
                        allHeaders.find(c => c.startsWith('Realtime')) || 
                        'Realtime';
    } else {
        actualColName = visibleColumns.find(c => c.startsWith('L.Kế')) || 
                        allHeaders.find(c => c.startsWith('L.Kế')) || 
                        'L.Kế';
    }

    if (!targetColName || !actualColName) return null;

    const actualIdx = allHeaders.indexOf(actualColName);
    const targetIdx = allHeaders.indexOf(targetColName);

    if (actualIdx === -1 || targetIdx === -1) return null;
    if (program.data[actualIdx] === undefined || program.data[targetIdx] === undefined) return null;

    const actualValue = parseNumber(program.data[actualIdx]);
    const targetValue = parseNumber(program.data[targetIdx]);

    return actualValue - targetValue;
}

/**
 * Sắp xếp danh sách chương trình:
 * - Realtime: Sắp xếp theo cột %HT hoặc %HT V.Trội (tuỳ nhóm đang hiển thị)
 * - Luỹ kế: Sắp xếp theo cột %DKHT, %HT V.Trội (tuỳ nhóm đang hiển thị)
 * - Khi sortConfig theo các cột % hoàn thành: LUÔN sắp xếp theo chỉ số % tương ứng.
 * - Khi sortConfig theo 'conLai': sắp xếp theo Còn Lại, tie-break bằng chuỗi % ưu tiên.
 * - Khi sortConfig theo tên (-1): sắp xếp theo tên hiển thị.
 * - Khi sortConfig theo 1 cột dữ liệu khác: khi bằng nhau tie-break bằng chuỗi % ưu tiên.
 */
export function sortProgramsList(
    programs: ProcessedProgram[],
    sortConfig: { columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null,
    headers: string[],
    nameOverrides: Record<string, string> = {},
    visibleColumns?: string[],
    isRealtime: boolean = false,
    customOrder?: string[]
): ProcessedProgram[] {
    return [...programs].sort((a, b) => {
        if (!sortConfig) {
            if (customOrder && customOrder.length > 0) {
                const idxA = customOrder.indexOf(a.name);
                const idxB = customOrder.indexOf(b.name);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
            }
            return compareByCompletionPriority(a, b, headers, 'desc', visibleColumns, isRealtime);
        }

        // Nếu sort theo cột % hoàn thành: áp dụng trực tiếp chuỗi ưu tiên với cột đó làm primary
        if (typeof sortConfig.columnIndex === 'number' && sortConfig.columnIndex >= 0 && sortConfig.columnIndex < headers.length) {
            const colHeader = headers[sortConfig.columnIndex] || '';
            const lowerHeader = colHeader.toLowerCase();
            if (lowerHeader.includes('%') || lowerHeader.includes('trội')) {
                let explicitPrimary: PrimaryMetric = 'htVT';
                if (lowerHeader.includes('trội')) {
                    if (lowerHeader.includes('dk') || lowerHeader.includes('dự')) {
                        explicitPrimary = 'htDKVT';
                    } else {
                        explicitPrimary = 'htVT';
                    }
                } else if (lowerHeader.includes('dk') || lowerHeader.includes('dự')) {
                    explicitPrimary = 'htDK';
                } else if (lowerHeader === '%ht' || lowerHeader.includes('ngày') || lowerHeader.includes('tháng')) {
                    explicitPrimary = 'ht';
                }
                return compareByCompletionPriority(a, b, headers, sortConfig.direction, visibleColumns, isRealtime, explicitPrimary);
            }
        }

        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.columnIndex === 'conLai') {
            aValue = a.conLai ?? -Infinity;
            bValue = b.conLai ?? -Infinity;
        } else if (sortConfig.columnIndex === 'htdkVT') {
            aValue = a.htdkVT ?? -Infinity;
            bValue = b.htdkVT ?? -Infinity;
        } else if (sortConfig.columnIndex === -1) {
            aValue = shortenName(a.name, nameOverrides);
            bValue = shortenName(b.name, nameOverrides);
        } else {
            if (a.data.length <= sortConfig.columnIndex || b.data.length <= sortConfig.columnIndex) {
                return compareByCompletionPriority(a, b, headers, 'desc', visibleColumns, isRealtime);
            }
            aValue = parseNumber(a.data[sortConfig.columnIndex]);
            bValue = parseNumber(b.data[sortConfig.columnIndex]);
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const res = sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            if (res !== 0) return res;
            return compareByCompletionPriority(a, b, headers, 'desc', visibleColumns, isRealtime);
        }

        const numA = (typeof aValue === 'number' && !isNaN(aValue)) ? aValue : -Infinity;
        const numB = (typeof bValue === 'number' && !isNaN(bValue)) ? bValue : -Infinity;
        if (numA !== numB) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        // Khi 2 giá trị bằng nhau: tie-breaker theo chuỗi ưu tiên phù hợp với chế độ hiện tại
        return compareByCompletionPriority(a, b, headers, 'desc', visibleColumns, isRealtime);
    });
}

/**
 * Thống kê số lượng ngành hàng (chương trình thi đua) đạt >100% và <100% trong một nhóm.
 */
export interface GroupAchievementStats {
    total: number;
    over100: number;  // số ngành hàng đạt >= 100%
    under100: number; // số ngành hàng dưới 100% (< 100%)
    isSuperMode: boolean; // true nếu người dùng đang chọn xem Target Vượt trội, false nếu xem Cơ bản
    evaluatedMetric: 'htVT' | 'htDKVT' | 'htDK' | 'ht';
}

/**
 * Kiểm tra xem người dùng đang chọn xem nhóm cột Target Vượt trội hay Cơ bản (bình thường).
 */
export function isSuperCompetitionActive(visibleColumns: string[]): boolean {
    return visibleColumns.some(col => 
        col === 'Target V.Trội' || 
        col === '%HT V.Trội' || 
        col === '%DKHT V.Trội' ||
        col === '%HTDK V.Trội'
    );
}

/**
 * Lấy chỉ số % hoàn thành dùng để so sánh với mốc 100%:
 * - Dựa vào người dùng chọn V.Trội hay bình thường (isSuperMode).
 * - Kết hợp Realtime (ưu tiên %HT) hay Luỹ kế (ưu tiên %DKHT rồi tới %HT).
 * - Tự động thích ứng nếu người dùng tuỳ biến ẩn/hiện cột trong popup.
 */
export function getProgramEvaluatedCompletion(
    program: ProcessedProgram,
    headers: string[],
    isSuperMode: boolean,
    isRealtime: boolean,
    visibleColumns?: string[]
): { value: number | null; metric: 'htVT' | 'htDKVT' | 'htDK' | 'ht' } {
    const metrics = getProgramCompletionMetrics(program, headers);

    if (isRealtime) {
        if (isSuperMode) {
            return { value: metrics.htVT, metric: 'htVT' };
        } else {
            return { value: metrics.ht, metric: 'ht' };
        }
    } else {
        // Luỹ kế:
        if (isSuperMode) {
            const hasDkhtVT = visibleColumns 
                ? visibleColumns.some(c => c === '%DKHT V.Trội' || c === '%HTDK V.Trội')
                : true;
            if (hasDkhtVT && metrics.htDKVT !== null) {
                return { value: metrics.htDKVT, metric: 'htDKVT' };
            }
            if (metrics.htVT !== null) {
                return { value: metrics.htVT, metric: 'htVT' };
            }
            return { value: metrics.htDKVT, metric: 'htDKVT' };
        } else {
            const hasDkht = visibleColumns 
                ? visibleColumns.some(c => c === '%DKHT' || c === '%HTDK')
                : true;
            if (hasDkht && metrics.htDK !== null) {
                return { value: metrics.htDK, metric: 'htDK' };
            }
            if (metrics.ht !== null) {
                return { value: metrics.ht, metric: 'ht' };
            }
            return { value: metrics.htDK, metric: 'htDK' };
        }
    }
}

/**
 * Đếm số lượng ngành hàng >100% (đạt) và <100% (chưa đạt) trong danh sách chương trình của một nhóm:
 * - >100%: value >= 100
 * - <100%: value < 100 (bao gồm cả null/0/chưa có số liệu)
 */
export function calculateGroupAchievementStats(
    programs: ProcessedProgram[],
    headers: string[],
    visibleColumns: string[],
    isRealtime: boolean
): GroupAchievementStats {
    const isSuperMode = isSuperCompetitionActive(visibleColumns);
    let over100 = 0;
    let under100 = 0;
    let lastMetric: 'htVT' | 'htDKVT' | 'htDK' | 'ht' = isSuperMode 
        ? (isRealtime ? 'htVT' : 'htDKVT') 
        : (isRealtime ? 'ht' : 'htDK');

    for (const prog of programs) {
        const { value, metric } = getProgramEvaluatedCompletion(prog, headers, isSuperMode, isRealtime, visibleColumns);
        lastMetric = metric;
        if (value !== null && !isNaN(value) && value >= 100) {
            over100++;
        } else {
            under100++;
        }
    }

    return {
        total: programs.length,
        over100,
        under100,
        isSuperMode,
        evaluatedMetric: lastMetric
    };
}

/**
 * Thống kê tổng hợp các chỉ số KPI cho toàn bộ các nhóm/ngành hàng thi đua đang hiển thị:
 * 1. % số nhóm đạt 100%: Số nhóm > 100% / tổng nhóm (kèm số lượng nhóm >100%, tổng nhóm)
 * 2. % số nhóm < 100%: Số nhóm < 100% / tổng nhóm (kèm số lượng nhóm <100%, tổng nhóm)
 * 3. 80% < Số nhóm < 100%: Số lượng nhóm trong khoảng 80% đến dưới 100%
 * 4. Số nhóm kết quả 0%: Số lượng nhóm đạt 0% (hoặc chưa có kết quả)
 */
export interface OverallCompetitionKpiStats {
    total: number;
    countOver100: number;
    pctOver100: number;
    countUnder100: number;
    pctUnder100: number;
    countNear100: number; // 80% <= val < 100%
    pctNear100: number;
    countZero: number;    // val === 0 hoặc null/NaN
    pctZero: number;
    isSuperMode: boolean;
}

export function calculateOverallCompetitionKpiStats(
    programs: ProcessedProgram[],
    headers: string[],
    visibleColumns: string[],
    isRealtime: boolean
): OverallCompetitionKpiStats {
    const isSuperMode = isSuperCompetitionActive(visibleColumns);
    const total = programs.length;
    let countOver100 = 0;
    let countNear100 = 0;
    let countZero = 0;

    for (const prog of programs) {
        const { value } = getProgramEvaluatedCompletion(prog, headers, isSuperMode, isRealtime, visibleColumns);
        if (value === null || isNaN(value) || value <= 0) {
            countZero++;
        } else if (value >= 100) {
            countOver100++;
        } else if (value >= 80 && value < 100) {
            countNear100++;
        }
    }

    const countUnder100 = total - countOver100;
    const pctOver100 = total > 0 ? (countOver100 / total) * 100 : 0;
    const pctUnder100 = total > 0 ? (countUnder100 / total) * 100 : 0;
    const pctNear100 = total > 0 ? (countNear100 / total) * 100 : 0;
    const pctZero = total > 0 ? (countZero / total) * 100 : 0;

    return {
        total,
        countOver100,
        pctOver100,
        countUnder100,
        pctUnder100,
        countNear100,
        pctNear100,
        countZero,
        pctZero,
        isSuperMode
    };
}
