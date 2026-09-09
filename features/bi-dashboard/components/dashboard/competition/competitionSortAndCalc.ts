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
    'Còn Lại'
] as const;

/**
 * Xử lý bật/tắt cột theo quy tắc nhóm loại trừ tương hỗ (Coupled & Mutually Exclusive):
 * - Nhóm Cơ bản:
 *   + Realtime: ['Target', '%HT']
 *   + Luỹ kế: ['Target', '%HT', '%DKHT']
 * - Nhóm Vượt trội:
 *   + Realtime & Luỹ kế: ['Target V.Trội', '%HT V.Trội']
 * 
 * Quy tắc:
 * 1. Nếu bật 1 trong các cột nhóm Cơ bản => Bật tất cả các cột nhóm Cơ bản, đồng thời TẮT nhóm Vượt trội.
 * 2. Nếu bật 1 trong các cột nhóm Vượt trội => Bật tất cả các cột nhóm Vượt trội, đồng thời TẮT nhóm Cơ bản.
 * 3. Nếu click vào cột đang bật của một nhóm, tự động chuyển sang bật nhóm còn lại để đảm bảo luôn có 1 bộ Target tính toán Còn Lại.
 * 4. Các cột độc lập (T.HIỆN, L.Kế, Còn Lại) bật/tắt bình thường.
 */
export function toggleCompetitionColumn(
    clickedHeader: string,
    currentVisibleColumns: string[],
    allAllowedColumns: string[],
    isRealtime: boolean
): string[] {
    const isStandardCol = (h: string) => h === 'Target' || h === '%HT' || h === '%DKHT' || h === '%HTDK';
    const isSuperCol = (h: string) => h === 'Target V.Trội' || h === '%HT V.Trội' || h === '%HTDK V.Trội';

    const standardCols = (isRealtime
        ? ['Target', '%HT']
        : ['Target', '%HT', '%DKHT']
    ).filter(c => allAllowedColumns.includes(c));

    const superCols = [
        'Target V.Trội',
        allAllowedColumns.includes('%HT V.Trội') ? '%HT V.Trội' : '%HTDK V.Trội'
    ].filter(c => allAllowedColumns.includes(c));

    let nextVisible: string[];

    if (isStandardCol(clickedHeader)) {
        const isStandardActive = standardCols.some(c => currentVisibleColumns.includes(c));
        if (!isStandardActive) {
            // Chuyển sang bật nhóm Cơ bản, tắt nhóm Vượt trội
            const remaining = currentVisibleColumns.filter(c => !superCols.includes(c) && !standardCols.includes(c));
            nextVisible = [...remaining, ...standardCols];
        } else {
            // Đang bật nhóm Cơ bản mà click tắt -> chuyển sang bật nhóm Vượt trội
            const remaining = currentVisibleColumns.filter(c => !standardCols.includes(c) && !superCols.includes(c));
            nextVisible = [...remaining, ...superCols];
        }
    } else if (isSuperCol(clickedHeader)) {
        const isSuperActive = superCols.some(c => currentVisibleColumns.includes(c));
        if (!isSuperActive) {
            // Chuyển sang bật nhóm Vượt trội, tắt nhóm Cơ bản
            const remaining = currentVisibleColumns.filter(c => !standardCols.includes(c) && !superCols.includes(c));
            nextVisible = [...remaining, ...superCols];
        } else {
            // Đang bật nhóm Vượt trội mà click tắt -> chuyển sang bật nhóm Cơ bản
            const remaining = currentVisibleColumns.filter(c => !superCols.includes(c) && !standardCols.includes(c));
            nextVisible = [...remaining, ...standardCols];
        }
    } else {
        // Các cột độc lập khác (Realtime, L.Kế, Còn Lại)
        if (currentVisibleColumns.includes(clickedHeader)) {
            nextVisible = currentVisibleColumns.filter(c => c !== clickedHeader);
        } else {
            nextVisible = [...currentVisibleColumns, clickedHeader];
        }
    }

    // THỨ TỰ CÁC CỘT SẼ LUÔN ĐƯỢC SẮP XẾP THEO THỨ TỰ NÀY:
    // Lọc và sắp xếp theo đúng thứ tự chuẩn định sẵn trong allAllowedColumns
    return allAllowedColumns.filter(col => nextVisible.includes(col));
}

/**
 * Lấy các chỉ số % hoàn thành của chương trình theo thứ tự ưu tiên:
 * 1. %HT V.Trội (%HT V.Trội ở Realtime, hoặc %HTDK V.Trội ở Luỹ kế, hoặc program.htdkVT)
 * 2. %DKHT (%HTDK, %DKHT, % DỰ BÁO, % HT Dự Kiến)
 * 3. %HT (%HT, % HT NGÀY, % HT THÁNG, % HT Target Ngày)
 */
export function getProgramCompletionMetrics(program: ProcessedProgram, headers: string[]): {
    htVT: number | null;
    htDK: number | null;
    ht: number | null;
} {
    // 1. %HT V.Trội
    let htVT: number | null = null;
    const htVTIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === '%ht v.trội' || 
               lower === '%htdk v.trội' || 
               lower === '%ht target v.trội' ||
               (lower.includes('%') && lower.includes('trội'));
    });
    if (htVTIndex !== -1 && program.data[htVTIndex] !== undefined && program.data[htVTIndex] !== '' && program.data[htVTIndex] !== '-') {
        const val = parseNumber(program.data[htVTIndex]);
        if (!isNaN(val)) htVT = val;
    }
    if (htVT === null && program.htdkVT !== undefined && program.htdkVT !== null) {
        const val = typeof program.htdkVT === 'number' ? program.htdkVT : parseNumber(program.htdkVT);
        if (!isNaN(val)) htVT = val;
    }

    // 2. %DKHT (%HTDK)
    let htDK: number | null = null;
    const htDKIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === '%htdk' || 
               lower === '%dkht' || 
               lower === '% dự báo' || 
               lower === '% ht dự kiến';
    });
    if (htDKIndex !== -1 && program.data[htDKIndex] !== undefined && program.data[htDKIndex] !== '' && program.data[htDKIndex] !== '-') {
        const val = parseNumber(program.data[htDKIndex]);
        if (!isNaN(val)) htDK = val;
    }

    // 3. %HT (% HT NGÀY / % HT THÁNG)
    let ht: number | null = null;
    const htIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === '%ht' || 
               lower === '% ht ngày' || 
               lower === '% ht tháng' || 
               lower === '% ht target ngày' ||
               lower === '% ht target tháng';
    });
    if (htIndex !== -1 && program.data[htIndex] !== undefined && program.data[htIndex] !== '' && program.data[htIndex] !== '-') {
        const val = parseNumber(program.data[htIndex]);
        if (!isNaN(val)) ht = val;
    }

    return { htVT, htDK, ht };
}

export type PrimaryMetric = 'htVT' | 'htDK' | 'ht';

/**
 * Xác định thứ tự ưu tiên các chỉ số % hoàn thành dựa vào chế độ Realtime/Luỹ kế và cột đang hiển thị:
 * - Realtime: Sắp xếp theo cột %HT hoặc %HT V.Trội (tuỳ nhóm cột nào đang bật hiển thị)
 * - Luỹ kế: Sắp xếp theo cột %DKHT, %HT V.Trội (tuỳ nhóm cột nào đang bật hiển thị)
 */
export function getCompletionSortOrder(
    visibleColumns?: string[],
    isRealtime: boolean = false,
    explicitPrimary?: PrimaryMetric | null
): PrimaryMetric[] {
    if (explicitPrimary) {
        if (explicitPrimary === 'htVT') {
            return isRealtime ? ['htVT', 'ht', 'htDK'] : ['htVT', 'htDK', 'ht'];
        }
        if (explicitPrimary === 'htDK') {
            return ['htDK', 'htVT', 'ht'];
        }
        if (explicitPrimary === 'ht') {
            return isRealtime ? ['ht', 'htVT', 'htDK'] : ['ht', 'htDK', 'htVT'];
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
            return ['htVT', 'ht', 'htDK'];
        }
        if (hasVisible('%ht')) {
            return ['ht', 'htVT', 'htDK'];
        }
        return ['htVT', 'ht', 'htDK'];
    } else {
        // Luỹ kế: Ưu tiên cột đang hiển thị giữa %HT V.Trội và %DKHT
        if (hasVisible('trội')) {
            return ['htVT', 'htDK', 'ht'];
        }
        if (hasVisible('dk') || hasVisible('dự')) {
            return ['htDK', 'htVT', 'ht'];
        }
        if (hasVisible('%ht')) {
            return ['ht', 'htDK', 'htVT'];
        }
        return ['htVT', 'htDK', 'ht'];
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
    isRealtime: boolean = false
): ProcessedProgram[] {
    return [...programs].sort((a, b) => {
        if (!sortConfig) {
            return compareByCompletionPriority(a, b, headers, 'desc', visibleColumns, isRealtime);
        }

        // Nếu sort theo cột % hoàn thành: áp dụng trực tiếp chuỗi ưu tiên với cột đó làm primary
        if (typeof sortConfig.columnIndex === 'number' && sortConfig.columnIndex >= 0 && sortConfig.columnIndex < headers.length) {
            const colHeader = headers[sortConfig.columnIndex] || '';
            const lowerHeader = colHeader.toLowerCase();
            if (lowerHeader.includes('%') || lowerHeader.includes('trội')) {
                let explicitPrimary: PrimaryMetric = 'htVT';
                if (lowerHeader.includes('trội')) {
                    explicitPrimary = 'htVT';
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
