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

    if (isStandardCol(clickedHeader)) {
        const isStandardActive = standardCols.some(c => currentVisibleColumns.includes(c));
        if (!isStandardActive) {
            // Chuyển sang bật nhóm Cơ bản, tắt nhóm Vượt trội
            const remaining = currentVisibleColumns.filter(c => !superCols.includes(c) && !standardCols.includes(c));
            return [...remaining, ...standardCols].filter(c => allAllowedColumns.includes(c));
        } else {
            // Đang bật nhóm Cơ bản mà click tắt -> chuyển sang bật nhóm Vượt trội
            const remaining = currentVisibleColumns.filter(c => !standardCols.includes(c) && !superCols.includes(c));
            return [...remaining, ...superCols].filter(c => allAllowedColumns.includes(c));
        }
    }

    if (isSuperCol(clickedHeader)) {
        const isSuperActive = superCols.some(c => currentVisibleColumns.includes(c));
        if (!isSuperActive) {
            // Chuyển sang bật nhóm Vượt trội, tắt nhóm Cơ bản
            const remaining = currentVisibleColumns.filter(c => !standardCols.includes(c) && !superCols.includes(c));
            return [...remaining, ...superCols].filter(c => allAllowedColumns.includes(c));
        } else {
            // Đang bật nhóm Vượt trội mà click tắt -> chuyển sang bật nhóm Cơ bản
            const remaining = currentVisibleColumns.filter(c => !superCols.includes(c) && !standardCols.includes(c));
            return [...remaining, ...standardCols].filter(c => allAllowedColumns.includes(c));
        }
    }

    // Các cột độc lập khác (Realtime, L.Kế, Còn Lại)
    if (currentVisibleColumns.includes(clickedHeader)) {
        return currentVisibleColumns.filter(c => c !== clickedHeader);
    } else {
        return [...currentVisibleColumns, clickedHeader];
    }
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
    const htVTIndex = headers.findIndex(h => 
        h === '%HT V.Trội' || 
        h === '%HTDK V.Trội' || 
        h === '%HT Target V.Trội' ||
        (h.includes('%') && h.toLowerCase().includes('v.trội'))
    );
    if (htVTIndex !== -1 && program.data[htVTIndex] !== undefined && program.data[htVTIndex] !== '' && program.data[htVTIndex] !== '-') {
        htVT = parseNumber(program.data[htVTIndex]);
    } else if (program.htdkVT !== undefined && program.htdkVT !== null) {
        htVT = program.htdkVT;
    }

    // 2. %DKHT (%HTDK)
    let htDK: number | null = null;
    const htDKIndex = headers.findIndex(h => 
        h === '%HTDK' || 
        h === '%DKHT' || 
        h === '% DỰ BÁO' || 
        h === '% HT Dự Kiến'
    );
    if (htDKIndex !== -1 && program.data[htDKIndex] !== undefined && program.data[htDKIndex] !== '' && program.data[htDKIndex] !== '-') {
        htDK = parseNumber(program.data[htDKIndex]);
    }

    // 3. %HT (% HT NGÀY / % HT THÁNG)
    let ht: number | null = null;
    const htIndex = headers.findIndex(h => 
        h === '%HT' || 
        h === '% HT NGÀY' || 
        h === '% HT THÁNG' || 
        h === '% HT Target Ngày' ||
        h === '% HT Target Tháng'
    );
    if (htIndex !== -1 && program.data[htIndex] !== undefined && program.data[htIndex] !== '' && program.data[htIndex] !== '-') {
        ht = parseNumber(program.data[htIndex]);
    }

    return { htVT, htDK, ht };
}

/**
 * So sánh 2 chương trình theo chuỗi ưu tiên giảm dần:
 * %HT V.Trội > %DKHT > %HT
 */
export function compareByCompletionPriority(
    a: ProcessedProgram,
    b: ProcessedProgram,
    headers: string[],
    direction: 'asc' | 'desc' = 'desc'
): number {
    const aMetrics = getProgramCompletionMetrics(a, headers);
    const bMetrics = getProgramCompletionMetrics(b, headers);

    const mult = direction === 'asc' ? 1 : -1;

    // Ưu tiên 1: %HT V.Trội
    const aVT = aMetrics.htVT ?? -Infinity;
    const bVT = bMetrics.htVT ?? -Infinity;
    if (aVT !== bVT) {
        return (aVT - bVT) * mult;
    }

    // Ưu tiên 2: %DKHT (%HTDK)
    const aDK = aMetrics.htDK ?? -Infinity;
    const bDK = bMetrics.htDK ?? -Infinity;
    if (aDK !== bDK) {
        return (aDK - bDK) * mult;
    }

    // Ưu tiên 3: %HT
    const aHT = aMetrics.ht ?? -Infinity;
    const bHT = bMetrics.ht ?? -Infinity;
    if (aHT !== bHT) {
        return (aHT - bHT) * mult;
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
 * - Khi sortConfig === null: Mặc định LUÔN sắp xếp giảm dần theo chuỗi ưu tiên %HT V.Trội > %DKHT > %HT.
 * - Khi sortConfig theo 'conLai': sắp xếp theo Còn Lại, tie-break bằng chuỗi % ưu tiên.
 * - Khi sortConfig theo tên (-1): sắp xếp theo tên hiển thị.
 * - Khi sortConfig theo 1 cột dữ liệu:
 *   + Nếu là cột % hoàn thành, khi bằng nhau tie-break bằng các cột % ưu tiên còn lại.
 *   + Nếu là cột số lượng/doanh thu, khi bằng nhau tie-break bằng chuỗi % ưu tiên.
 */
export function sortProgramsList(
    programs: ProcessedProgram[],
    sortConfig: { columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null,
    headers: string[],
    nameOverrides: Record<string, string> = {}
): ProcessedProgram[] {
    return [...programs].sort((a, b) => {
        if (!sortConfig) {
            return compareByCompletionPriority(a, b, headers, 'desc');
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
                return compareByCompletionPriority(a, b, headers, 'desc');
            }
            aValue = parseNumber(a.data[sortConfig.columnIndex]);
            bValue = parseNumber(b.data[sortConfig.columnIndex]);
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const res = sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            if (res !== 0) return res;
            return compareByCompletionPriority(a, b, headers, 'desc');
        }

        const numA = aValue as number;
        const numB = bValue as number;
        if (numA !== numB) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        // Khi 2 giá trị bằng nhau: tie-breaker theo chuỗi ưu tiên %HT V.Trội > %DKHT > %HT
        return compareByCompletionPriority(a, b, headers, 'desc');
    });
}
