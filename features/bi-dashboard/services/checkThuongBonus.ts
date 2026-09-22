/**
 * Cột THƯỞNG cho bảng Thi đua siêu thị (Report BI › Siêu thị › Luỹ kế › Thi đua) — đọc dữ liệu
 * của chức năng Check Thưởng (file "Dự kiến thưởng thi đua" công ty phát, lưu ở IndexedDB key
 * `checkthuong_data` — cùng database BI_HUB_DATABASE_V2, KHÔNG import code của Check Thưởng vì
 * đó là iframe vanilla JS ở public/check-thuong.html).
 *
 * LUẬT hiển thị thưởng chép đúng từ check-thuong.html (renderSingleRow + preProcessData +
 * getPotentialBonus, 2026-09-22):
 *   - Cột N (TỔNG THƯỞNG) > 0  → thưởng THẬT.
 *   - N = 0 nhưng nhóm (kênh|ngành hàng) có quỹ (siêu thị nào đó cùng kênh có N > 0) → thưởng
 *     DỰ KIẾN = tổng thưởng của siêu thị đạt giải có hạng %Target cao nhất trong nhóm (fallback:
 *     theo tên ngành hàng bất kể kênh). Check Thưởng hiện dạng "~1,945tr" màu cam.
 *   - Còn lại → 0 (nhóm không có quỹ).
 * Khớp ngành hàng với tên gốc chương trình thi đua của Report BI: cùng nguồn công ty, chỉ khác
 * HOA/thường ("Bảo hiểm tổng" ↔ "BẢO HIỂM TỔNG") → so sánh sau khi upper-case + gộp khoảng trắng.
 */
import { parseNumber, extractStoreCode, normalizeSupermarketKey } from '../utils/dashboardHelpers';

/** Vị trí cột trong file Excel Check Thưởng — khoá cứng giống COLS ở check-thuong.html. */
export const CT_COLS = {
    KENH: 3, SIEU_THI: 4, NGANH_HANG: 5, PERCENT_DU_KIEN: 6, DU_KIEN_VUOT: 7, LAY_TOP: 8,
    HANG_VUOT_UU: 9, HANG_PERCENT_TARGET: 10, THUONG_VUOT_UU: 11, THUONG_TOP_PERCENT: 12, TONG_THUONG: 13,
} as const;

export type CtRow = (string | number | null | undefined)[];

export interface BonusCell {
    amount: number;
    /** actual = cột N > 0; projected = dự kiến nếu đạt giải; none = nhóm không có quỹ. */
    kind: 'actual' | 'projected' | 'none';
}

/** Dòng lưu ở IndexedDB là mảng thuần; bản đồng bộ từ Firestore có thể còn bọc {__fsArr: [...]}. */
export function unwrapCheckThuongRows(payload: unknown): CtRow[] {
    const raw = (payload as { competitionData?: unknown } | null)?.competitionData;
    if (!Array.isArray(raw)) return [];
    return raw
        .map(r => (Array.isArray(r) ? r : (r && typeof r === 'object' && Array.isArray((r as { __fsArr?: unknown }).__fsArr) ? (r as { __fsArr: CtRow }).__fsArr : null)))
        .filter((r): r is CtRow => Array.isArray(r));
}

export const normalizeGroupName = (s: unknown): string =>
    String(s ?? '').normalize('NFC').toUpperCase().replace(/\s+/g, ' ').trim();

/** "1,117tr" / "892,6k" / "0" — chép formatCurrencySimple của Check Thưởng để 2 màn hình đọc cùng 1 số. */
export function formatBonusShort(value: number): string {
    const num = Number(value) || 0;
    if (num === 0) return '0';
    const abs = Math.abs(num);
    if (abs >= 1_000_000) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(num / 1_000_000) + 'tr';
    if (abs >= 1_000) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(num / 1_000) + 'k';
    return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Tìm tên siêu thị trong file Check Thưởng (TOÀN QUỐC, ~700 siêu thị) ứng với siêu thị đang
 * chọn ở Report BI. KHÔNG dùng isSupermarketMatch/findMatchingSupermarketKey: luật số 5 của nó
 * so tên rút gọn ("Hùng Vương" == "Hùng Vương") nên "ĐML_STR_STR - 99 Hùng Vương" khớp nhầm
 * "312 - ĐML_DTH_SDE - 90 Hùng Vương" (đo thật 2026-09-22 → thưởng sai hết). Ở đây chỉ nhận:
 *   1. trùng MÃ KHO (đứng đầu tên "910 - …", hoặc `storeCode` truyền từ bảng map siêu thị→mã kho);
 *   2. hoặc trùng tên đầy đủ sau khi bỏ tiền tố mã kho + chuẩn hoá dấu (normalizeSupermarketKey).
 */
export function findCheckThuongStore(storeNames: string[], supermarketName: string, storeCode?: string | null): string | undefined {
    const code = storeCode || extractStoreCode(supermarketName);
    if (code) {
        const byCode = storeNames.find(n => extractStoreCode(n) === code);
        if (byCode) return byCode;
    }
    const norm = normalizeSupermarketKey(supermarketName);
    if (!norm) return undefined;
    return storeNames.find(n => normalizeSupermarketKey(n) === norm);
}

/**
 * Tính thưởng theo ngành hàng cho 1 siêu thị. `supermarketName` là tên đang chọn ở Report BI;
 * `storeCode` (tuỳ chọn) là Mã Kho tra từ bảng map siêu thị→mã kho khi tên không có mã đứng đầu.
 * Trả Map<tên ngành hàng đã chuẩn hoá, BonusCell>; Map rỗng nếu không thấy siêu thị.
 */
export function computeBonusByGroup(rows: CtRow[], supermarketName: string, storeCode?: string | null): Map<string, BonusCell> {
    const result = new Map<string, BonusCell>();
    if (!rows.length || !supermarketName) return result;

    const storeNames = Array.from(new Set(rows.map(r => String(r[CT_COLS.SIEU_THI] ?? '').trim()).filter(Boolean)));
    const matchedStore = findCheckThuongStore(storeNames, supermarketName, storeCode);
    if (!matchedStore) return result;

    // preProcessData: nhóm có quỹ + siêu thị đạt giải hạng cao nhất theo (kênh|ngành) và theo ngành
    const fundByKey = new Set<string>();
    const bestByKey = new Map<string, { rank: number; row: CtRow }>();
    const bestByName = new Map<string, { rank: number; row: CtRow }>();
    rows.forEach(row => {
        const name = normalizeGroupName(row[CT_COLS.NGANH_HANG]);
        if (!name) return;
        const kenh = normalizeGroupName(row[CT_COLS.KENH] || 'N/A');
        const key = `${kenh}|${name}`;
        const bonus = parseNumber(row[CT_COLS.TONG_THUONG]);
        if (bonus <= 0) return;
        fundByKey.add(key);
        const rank = parseInt(String(row[CT_COLS.HANG_PERCENT_TARGET]), 10) || 0;
        const curKey = bestByKey.get(key);
        if (!curKey || rank > curKey.rank) bestByKey.set(key, { rank, row });
        const curName = bestByName.get(name);
        if (!curName || rank > curName.rank) bestByName.set(name, { rank, row });
    });

    rows.forEach(row => {
        if (String(row[CT_COLS.SIEU_THI] ?? '').trim() !== matchedStore) return;
        const name = normalizeGroupName(row[CT_COLS.NGANH_HANG]);
        if (!name) return;
        const kenh = normalizeGroupName(row[CT_COLS.KENH] || 'N/A');
        const key = `${kenh}|${name}`;
        const actual = parseNumber(row[CT_COLS.TONG_THUONG]);
        if (actual > 0) { result.set(name, { amount: actual, kind: 'actual' }); return; }

        const best = bestByKey.get(key) || bestByName.get(name);
        if (best && fundByKey.has(key)) {
            const b = best.row;
            const tong = parseNumber(b[CT_COLS.TONG_THUONG]);
            const potential = tong > 0 ? tong : parseNumber(b[CT_COLS.THUONG_VUOT_UU]) + parseNumber(b[CT_COLS.THUONG_TOP_PERCENT]);
            if (potential > 0) { result.set(name, { amount: potential, kind: 'projected' }); return; }
        }
        result.set(name, { amount: 0, kind: 'none' });
    });
    return result;
}

/** Tra thưởng cho 1 chương trình thi đua Report BI theo TÊN GỐC (originalTitle/program.name). */
export function getBonusForProgram(map: Map<string, BonusCell> | null | undefined, programName: string): BonusCell | null {
    if (!map || map.size === 0) return null;
    const key = normalizeGroupName(programName);
    if (map.has(key)) return map.get(key)!;
    // Dự phòng: khác dấu câu/khoảng trắng nhỏ ("OTT MANGO+, ICALLME -" vs "OTT MANGO+, ICALLME")
    const loose = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '');
    const lk = loose(key);
    if (!lk) return null;
    for (const [k, v] of map) if (loose(k) === lk) return v;
    return null;
}
