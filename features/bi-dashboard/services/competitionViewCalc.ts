import { parseNumber, roundUp, type SupermarketCompetitionData } from '../utils/dashboardHelpers';
import {
    ALLOWED_REALTIME_COLUMNS,
    ALLOWED_LUYKE_COLUMNS,
} from '../components/dashboard/competition/competitionSortAndCalc';

/**
 * Dựng bảng Thi đua của một siêu thị — tách NGUYÊN KHỐI từ `CompetitionView.tsx` (Đợt 1.5).
 *
 * Việc nó làm: đổi tên cột về bộ tên chuẩn (mỗi chế độ Realtime/Luỹ kế một bảng ánh xạ riêng), bỏ
 * cột không thuộc chế độ đang xem, chèn 2 cột phái sinh `%HT V.Trội` và `Còn Lại`, sắp cột theo
 * thứ tự chuẩn, rồi tính giá trị cho 2 cột vừa chèn.
 *
 * Tách bằng script, chép nguyên văn — KHÔNG đổi con số nào.
 *
 * ⚠️ NỢ KỸ THUẬT CÒN LẠI: file này phải import `ALLOWED_*_COLUMNS` từ
 * `components/dashboard/competition/competitionSortAndCalc.ts` — tức logic ở `services/` đang phụ
 * thuộc ngược vào `components/`. `competitionSortAndCalc.ts` và `competitionCommentaryCalc.ts`
 * đều là logic thuần bị đặt nhầm trong `components/`; PHẢI chuyển sang `services/` trước Đợt 3,
 * nếu không chúng sẽ bị vứt cùng giao diện.
 */

/** Một chương trình thi đua sau khi đã xử lý cột.
 *  Khai ở đây (không phải trong component) để sống sót qua đợt lột xác giao diện —
 *  `CompetitionView.tsx` re-export lại để 6 file đang import không phải sửa. */
export interface ProcessedProgram {
    name: string;
    data: (string | number)[];
    metric: string;
    htdkVT?: number;
    conLai: number | null;
}

export interface BuildCompetitionTableResult {
    headers: string[];
    programs: ProcessedProgram[];
}

export function buildCompetitionTable(
    supermarketData: SupermarketCompetitionData | undefined,
    isRealtime: boolean
): BuildCompetitionTableResult | undefined {
    if (!supermarketData || !supermarketData.headers) return undefined;
    let processedHeaders = [...supermarketData.headers];
    let processedPrograms: ProcessedProgram[] = JSON.parse(JSON.stringify(supermarketData.programs)).map((p: SupermarketCompetitionData['programs'][number]) => ({ ...p, conLai: null }));
    if (!isRealtime) {
        const htdkVTIndex = processedHeaders.indexOf('%HTDK V.Trội');
        if (htdkVTIndex !== -1) {
            processedPrograms = processedPrograms.map((program) => ({
                ...program,
                htdkVT: parseNumber(program.data[htdkVTIndex])
            }));
        }
    }
    const headersToRemove = [
        'Xếp hạng trong miền', 'HẠNG VÙNG', 'TOP/BOTTOM VÙNG', 'Hạng vùng', 'Top/Bottom Vùng', 'Top/Bottom Trong Miền'
    ];
    const headerRenames: Record<string, string> = isRealtime ? { 
        'DOANH THU (RT)': 'Realtime',
        'SỐ LƯỢNG (RT)': 'Realtime',
        'DOANH THU': 'Realtime',
        'SỐ LƯỢNG': 'Realtime',
        'TARGET': 'Target',
        '% HT NGÀY': '%HT',
        '% DỰ BÁO': '%DKHT',
        'DT Realtime': 'Realtime', 
        'DT Realtime (QĐ)': 'Realtime', 
        'SL Realtime': 'Realtime', 
        'Target Ngày': 'Target', 
        '% HT Target Ngày': '%HT', 
        '%HT Target V.Trội': '%HT V.Trội',
        '%HTDK V.Trội': '%HT V.Trội'
    } : { 
        'DOANH THU': 'L.Kế',
        'SỐ LƯỢNG': 'L.Kế',
        'TARGET': 'Target',
        '% HT THÁNG': '%HT',
        '% DỰ BÁO': '%DKHT',
        'DTLK': 'L.Kế', 
        'DTQĐ': 'L.Kế', 
        'SLLK': 'L.Kế', 
        'Target': 'Target', 
        '% HT Target Tháng': '%HT', 
        '% HT Dự Kiến': '%DKHT', 
        'Target V.Trội': 'Target V.Trội', 
        '%HT Target V.Trội': '%HT V.Trội', 
        '%HTDK V.Trội': '%DKHT V.Trội',
        '%DKHT V.Trội': '%DKHT V.Trội',
        '%HTDK': '%DKHT'
    };

    const allowedColumns: readonly string[] = isRealtime ? ALLOWED_REALTIME_COLUMNS : ALLOWED_LUYKE_COLUMNS;
    const indicesToRemove: number[] = [];
    processedHeaders = processedHeaders.map((header, index) => {
        if (headersToRemove.includes(header)) {
            indicesToRemove.push(index);
            return header;
        }
        const renamed = headerRenames[header] || header;
        // Tách biệt rõ giữa Realtime và Luỹ kế: chỉ giữ cột thuộc chế độ hiện tại
        if (!allowedColumns.includes(renamed)) {
            indicesToRemove.push(index);
            return header;
        }
        return renamed;
    }).filter((_, index) => !indicesToRemove.includes(index));

    processedPrograms = processedPrograms.map((program) => ({
        ...program,
        data: program.data.filter((_, index) => !indicesToRemove.includes(index))
    }));

    // CHẾ ĐỘ LUỸ KẾ: Bổ sung thêm cột %HT V.TRỘI nếu có cột Target V.Trội
    if (!isRealtime && processedHeaders.includes('Target V.Trội') && !processedHeaders.includes('%HT V.Trội')) {
        processedHeaders.push('%HT V.Trội');
    }

    if (processedHeaders.length > 0 && !processedHeaders.includes('Còn Lại')) {
        processedHeaders.push('Còn Lại');
    }

    // Sắp xếp lại các cột theo thứ tự chuẩn
    const orderedHeaders = allowedColumns.filter(c => processedHeaders.includes(c));
    const finalHeaders = [...orderedHeaders, ...processedHeaders.filter(c => !orderedHeaders.includes(c))];

    const remappedPrograms = processedPrograms.map((program) => {
        const reorderedData = finalHeaders.map(h => {
            const oldIdx = processedHeaders.indexOf(h);
            return oldIdx !== -1 ? program.data[oldIdx] : '';
        });

        // CHẾ ĐỘ LUỸ KẾ: BỔ SUNG THÊM CỘT %HT V.TRỘI, cột này đặt sau cột TAR V.TRỘI, Cách tính: LUỸ KẾ/ TAR V.TRỘI
        if (!isRealtime) {
            const htVTIndex = finalHeaders.indexOf('%HT V.Trội');
            const lkIndex = finalHeaders.indexOf('L.Kế');
            const targetVTIndex = finalHeaders.indexOf('Target V.Trội');
            if (htVTIndex !== -1 && lkIndex !== -1 && targetVTIndex !== -1) {
                const lkVal = parseNumber(reorderedData[lkIndex]);
                const targetVTVal = parseNumber(reorderedData[targetVTIndex]);
                const htVTRate = targetVTVal > 0 ? (lkVal / targetVTVal) * 100 : 0;
                reorderedData[htVTIndex] = roundUp(htVTRate);
            }
        }

        let conLaiValue: number | null = null;
        const actualIndex = isRealtime ? finalHeaders.indexOf('Realtime') : finalHeaders.indexOf('L.Kế');
        let targetIndex = finalHeaders.indexOf('Target V.Trội');
        if (targetIndex === -1) {
            targetIndex = finalHeaders.indexOf('Target');
        }
        if (actualIndex !== -1 && targetIndex !== -1) {
            const actual = parseNumber(reorderedData[actualIndex]);
            const target = parseNumber(reorderedData[targetIndex]);
            conLaiValue = actual - target;
        }
        return { ...program, data: reorderedData, conLai: conLaiValue };
    });

    return { headers: finalHeaders, programs: remappedPrograms };
}
