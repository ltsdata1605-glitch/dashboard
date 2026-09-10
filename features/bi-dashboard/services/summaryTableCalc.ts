import { parseNumber, roundUp, shortenSupermarketName } from '../utils/dashboardHelpers';
import { getYesterdayDateString } from '../utils/nhanVienHelpers';

/**
 * Dây chuyền dựng bảng "Tổng quan Siêu thị" — tách NGUYÊN KHỐI từ `SummaryTableView.tsx`
 * (Đợt 1.4 của dự án làm lại Report BI). Đặt ở `services/` để sống sót khi đập bỏ `components/`.
 *
 * Đây KHÔNG phải một phép tính đơn lẻ mà là chuỗi biến đổi bảng: chèn cột phái sinh (%HQQĐ,
 * Target V.Trội...), gộp cặp cột "giá trị + tăng trưởng" thành một ô, sắp lại thứ tự cột theo
 * `desiredOrder`, lọc siêu thị bị ẩn, rồi sắp xếp và ghim dòng "Tổng" xuống cuối.
 *
 * TÁCH BẰNG SCRIPT, KHÔNG GÕ TAY: 155 dòng chép nguyên văn để loại trừ sai sót khi chép. Thay đổi
 * DUY NHẤT là `daysInMonth` nay tiêm được qua tham số (mặc định vẫn đọc đồng hồ như cũ) — điều
 * kiện cần để test tất định.
 */

/** `any` giữ nguyên theo bản gốc: mỗi ô có thể là chuỗi thô HOẶC object {value, growth, isMerged}
 *  sau bước gộp cặp cột. Siết kiểu cần viết lại union + narrow ở ~6 nơi render, vượt phạm vi đợt
 *  refactor này. Dự án KHÔNG bật rule no-explicit-any nên không cần eslint-disable — thêm vào
 *  lại thành lỗi "Definition for rule not found". */
export type SummaryCell = any;

export interface SummaryTableInput {
    headers: string[];
    rows: string[][];
}

export interface BuildSummaryTableOptions {
    isCumulative: boolean;
    activeSupermarket: string;
    supermarketMonthlyTargets: Record<string, number>;
    hiddenSupermarkets: string[];
    /** Tiêm để test tất định. Bỏ trống thì lấy số ngày của tháng hiện tại. */
    daysInMonth?: number;
}

export interface SummaryTableResult {
    allHeaders: string[];
    allRows: SummaryCell[][];
    title: string;
}

export function buildSummaryTable(
    data: SummaryTableInput,
    opts: BuildSummaryTableOptions
): SummaryTableResult {
    const { isCumulative, activeSupermarket, supermarketMonthlyTargets, hiddenSupermarkets } = opts;
    const { headers, rows } = data;
    let displayName = (activeSupermarket && activeSupermarket !== 'Tổng') ? shortenSupermarketName(activeSupermarket).toUpperCase() : 'TỔNG QUAN';
    let title = isCumulative ? `LUỸ KẾ DOANH THU - ${displayName} ĐẾN NGÀY ${getYesterdayDateString()}` : `REALTIME DOANH THU - ${displayName}`;

    if (!headers || headers.length === 0) return { allHeaders: [], allRows: [], title };

    const nameIndexOrigin = headers.indexOf('Tên miền');
    let uniqueRows: string[][] = [];
    if (nameIndexOrigin !== -1) {
        const seenNames = new Set<string>();
        rows.forEach(row => { if (!seenNames.has(row[nameIndexOrigin])) { seenNames.add(row[nameIndexOrigin]); uniqueRows.push(row); } });
    } else uniqueRows = rows;

    // any: mỗi ô có thể là string thô hoặc object {value, growth, isMerged, type} sau khi merge cột
    // (xem `cell?.isMerged ? cell.value : cell` ở phần render) — siết kiểu cần viết lại union +
    // narrow ở ~6 nơi render, vượt phạm vi 1 lần sửa type đơn giản.
    let tempHeaders = [...headers], tempRows: any[][] = JSON.parse(JSON.stringify(uniqueRows));
    const nameIndex = tempHeaders.indexOf('Tên miền');

    if (isCumulative) {
        const dtlkIndex = tempHeaders.indexOf('DTLK'), dtqdIndex = tempHeaders.indexOf('DTQĐ');
        if (dtlkIndex !== -1 && dtqdIndex !== -1) {
            tempHeaders.splice(dtqdIndex + 1, 0, '%HQQĐ');
            tempRows = tempRows.map(row => {
                const newRow = [...row], dVal = parseNumber(newRow[dtlkIndex]), qVal = parseNumber(newRow[dtqdIndex]);
                newRow.splice(dtqdIndex + 1, 0, (dVal > 0 ? roundUp(((qVal - dVal) / dVal) * 100) : 0) + '%');
                return newRow;
            });
        }
        const hIndex = tempHeaders.indexOf('% HT Target Dự Kiến (QĐ)'), dDIndex = tempHeaders.indexOf('DT Dự Kiến (QĐ)');
        if (hIndex !== -1 && nameIndex !== -1 && dDIndex !== -1) {
            tempHeaders.splice(hIndex + 1, 0, "Target(QĐ) V.Trội", "%HT TARGET(QĐ) V.Trội");
            tempRows = tempRows.map(row => {
                const newRow = [...row], sm = row[nameIndex];
                let mT = supermarketMonthlyTargets[sm] ?? 0;
                if (sm === 'Tổng') mT = Object.values(supermarketMonthlyTargets).reduce<number>((s, v) => s + Number(v), 0);
                const dkQ = parseNumber(row[dDIndex]), ht = mT > 0 ? (dkQ / mT) * 100 : 0;
                newRow.splice(hIndex + 1, 0, mT, `${roundUp(ht)}%`);
                return newRow;
            });
        }
    } else {
        const indicesToRemove = ['Lãi gộp QĐ', '%HT Target Dự kiến (LNTT)'].map(h => tempHeaders.indexOf(h)).filter(i => i !== -1).sort((a, b) => b - a);
        indicesToRemove.forEach(i => tempHeaders.splice(i, 1));
        tempRows = tempRows.map(row => { const nr = [...row]; indicesToRemove.forEach(i => nr.splice(i, 1)); return nr; });
        const dIndex = tempHeaders.indexOf('DTLK'), qIndex = tempHeaders.indexOf('DTQĐ');
        if (dIndex !== -1 && qIndex !== -1 && nameIndex !== -1) {
            // daysInMonth tiêm từ ngoài để test tất định; mặc định = số ngày tháng hiện tại (như bản gốc).
            const daysInMonth = opts.daysInMonth ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            // Chụp lại thứ tự cột TRƯỚC khi chèn 3 cột mới, để chèn giá trị vào đúng vị trí theo TÊN cột
            // (không dùng indexOf theo giá trị — dễ sai khi nhiều ô trùng giá trị, vd nhiều dòng "0%")
            const preInsertHeaders = [...tempHeaders];
            tempHeaders.splice(qIndex + 1, 0, '%HQQĐ');
            const tIndex = tempHeaders.indexOf('Target (QĐ)');
            if (tIndex !== -1) tempHeaders.splice(tIndex + 1, 0, "Target(QĐ) V.Trội");
            const htIndex = tempHeaders.indexOf('% HT Target (QĐ)');
            if (htIndex !== -1) tempHeaders.splice(htIndex + 1, 0, "%HT V.Trội");
            tempRows = tempRows.map(row => {
                const nr = [...row], dV = parseNumber(nr[dIndex]), qV = parseNumber(nr[qIndex]), sm = nr[nameIndex];
                let mT = supermarketMonthlyTargets[sm] ?? 0;
                if (sm === 'Tổng') mT = Object.values(supermarketMonthlyTargets).reduce<number>((s, v) => s + Number(v), 0);
                const dT = mT / daysInMonth, ht = dT > 0 ? (qV / dT) * 100 : 0;

                const rowHeaders = [...preInsertHeaders];
                const qIdxNow = rowHeaders.indexOf('DTQĐ');
                nr.splice(qIdxNow + 1, 0, (dV > 0 ? roundUp(((qV / dV) - 1) * 100) : 0) + '%');
                rowHeaders.splice(qIdxNow + 1, 0, '%HQQĐ');

                const tIdxNow = rowHeaders.indexOf('Target (QĐ)');
                if (tIdxNow !== -1) {
                    nr.splice(tIdxNow + 1, 0, dT);
                    rowHeaders.splice(tIdxNow + 1, 0, 'Target(QĐ) V.Trội');
                }

                const htIdxNow = rowHeaders.indexOf('% HT Target (QĐ)');
                if (htIdxNow !== -1) {
                    nr.splice(htIdxNow + 1, 0, `${roundUp(ht)}%`);
                    rowHeaders.splice(htIdxNow + 1, 0, '%HT V.Trội');
                }

                return nr;
            });
        }
    }

    const pairs = [{ base: 'Lượt Khách LK', growth: '+/- Lượt Khách' }, { base: 'DT Dự Kiến', growth: '+/- DTCK Tháng' }, { base: 'DT Dự Kiến (QĐ)', growth: '+/- DTCK Tháng (QĐ)' }, { base: 'TLPVTC LK', growth: '+/- TLPVTC' }];
    pairs.forEach(p => {
        const bIdx = tempHeaders.indexOf(p.base), gIdx = tempHeaders.indexOf(p.growth);
        if (bIdx !== -1 && gIdx !== -1) {
            tempRows = tempRows.map(row => {
                row[bIdx] = { value: row[bIdx], growth: row[gIdx], isMerged: true, type: (p.base.includes('Tỷ Trọng') || p.base.includes('TLPVTC')) ? 'percent' : 'number' };
                return row;
            });
            tempHeaders[gIdx] = '__TO_REMOVE__';
        }
    });

    let cleanedHeaders: string[] = [];
    let cleanedRows: any[][] = tempRows.map(() => []);
    tempHeaders.forEach((h, i) => {
        if (h !== '__TO_REMOVE__') {
            cleanedHeaders.push(h);
            tempRows.forEach((r, ri) => cleanedRows[ri].push(r[i]));
        }
    });

    const desiredOrder = [
        'Tên miền', 'DT Hôm Qua',
        // DT THỰC
        'DTLK', 'DT Dự Kiến',
        // DOANH THU QĐ
        'DTQĐ', 'DT Dự Kiến (QĐ)',
        // HIỆU QUẢ
        'Target (QĐ)', 'Target(QĐ) V.Trội', '% HT Target Dự Kiến (QĐ)', '% HT Target (QĐ)', '%HT TARGET(QĐ) V.Trội', '%HT V.Trội', '%HQQĐ',
        // TRAFFIC
        'Lượt Khách LK', 'TLPVTC LK', 'Lượt Bill Bán Hàng', 'Lượt bill', 'Lượt Bill Thu Hộ',
        // TRẢ CHẬM
        'Tỷ Trọng Trả Góp', 'Tỷ Trọng Trả Chậm', '+/- Tỷ Trọng Trả Góp', '+/- Tỷ Trọng Trả Chậm', 'Tỷ lệ duyệt'
    ];
    
    const finalH: string[] = [];
    const colIndices: number[] = [];
    
    desiredOrder.forEach(dh => {
        const idx = cleanedHeaders.indexOf(dh);
        if (idx !== -1) {
            finalH.push(dh);
            colIndices.push(idx);
        }
    });

    cleanedHeaders.forEach((h, idx) => {
        if (!desiredOrder.includes(h)) {
            finalH.push(h);
            colIndices.push(idx);
        }
    });

    tempRows = cleanedRows.map(row => colIndices.map(idx => row[idx]));
    
    let tRowIdx = tempRows.findIndex(r => r[nameIndex] === 'Tổng');
    let tRow = tRowIdx > -1 ? tempRows.splice(tRowIdx, 1)[0] : null;

    // Filter hidden supermarkets
    const hiddenSupermarketsSet = new Set(hiddenSupermarkets);
    tempRows = tempRows.filter(row => {
        const smName = row[nameIndex];
        return smName && !hiddenSupermarketsSet.has(smName);
    });

    let sK = isCumulative ? (finalH.includes('%HT TARGET(QĐ) V.Trội') ? '%HT TARGET(QĐ) V.Trội' : '% HT Target Dự Kiến (QĐ)') : (finalH.includes('%HT V.Trội') ? '%HT V.Trội' : '% HT Target (QĐ)');
    const sIdx = finalH.indexOf(sK);
    if (sIdx !== -1) tempRows.sort((a,b) => parseNumber(b[sIdx]?.isMerged ? b[sIdx].value : b[sIdx]) - parseNumber(a[sIdx]?.isMerged ? a[sIdx].value : a[sIdx]));
    if (tRow) tempRows.push(tRow);
    return { allHeaders: finalH, allRows: tempRows, title };
}
