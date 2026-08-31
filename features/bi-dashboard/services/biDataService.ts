/**
 * BI Data Service — dữ liệu Report BI (Thi đua/Summary Luỹ kế) DÙNG CHUNG theo siêu thị.
 * implementation_plan.md mục "Đợt 4".
 *
 * Mirror trực tiếp services/khoDataService.ts ở root (pattern đã chạy production ổn định),
 * chỉ khác: dùng LẠI đúng field departmentId/hàm myKhos() có sẵn (1 Kho = 1 Siêu thị trong
 * thực tế công ty, xác nhận với user 2026-08-31) — KHÔNG có custom claim allowedSupermarkets
 * riêng, KHÔNG cần Cloud Function mới để set quyền.
 *
 * Firestore structure:
 *   biData/{maKho}/summaryLuyKe      — { headerLine, dataLine, uploadedByUid, uploadedAt }
 *   biData/{maKho}/competitionLuyKe  — { headers, programs, uploadedByUid, uploadedAt }
 *      (programs/headers giữ nguyên shape SupermarketCompetitionData — parse 1 lần lúc dán,
 *      không cần lưu raw text nên khỏi phải viết lại logic tách dòng phức tạp của
 *      parseCompetitionDataBySupermarket() — hàm đó đã xử lý rất nhiều biến thể định dạng.)
 *
 * Đây là điểm DUY NHẤT trong bi-dashboard gọi Firestore trực tiếp (ngoại lệ cách ly thứ 3,
 * xem CLAUDE.md mục 1) — chỉ import db từ services/firebase.ts gốc, không import service/hook
 * nghiệp vụ nào khác của root.
 */

import { db } from '../../../services/firebase';
import {
    doc, getDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { parseCompetitionDataBySupermarket, SupermarketCompetitionData } from '../utils/dashboardHelpers';

const SUMMARY_LUYKE_HEADER_MARKER = 'Tên miền\tDT Hôm Qua\tDTLK\tDT Dự Kiến\tDTQĐ';

interface SummaryLuyKeDoc {
    headerLine: string;
    dataLine: string;
    uploadedByUid: string;
    uploadedByName: string;
}

interface CompetitionLuyKeDoc extends SupermarketCompetitionData {
    uploadedByUid: string;
    uploadedByName: string;
}

const summaryDocRef = (maKho: string) => doc(db, 'biData', maKho, 'reports', 'summaryLuyKe');
const competitionDocRef = (maKho: string) => doc(db, 'biData', maKho, 'reports', 'competitionLuyKe');

/** Tách 1 lần dán "Tên miền" (Summary Luỹ kế) thành fragment riêng cho từng Mã Kho, dựa vào
 * bảng map tên siêu thị → Mã Kho do admin khai báo (biSupermarketMapService.ts). Tên không có
 * trong bảng map bị BỎ QUA (không upload đi đâu) — trả về trong skippedNames để cảnh báo
 * người dán, không chặn hẳn toàn bộ thao tác dán (giữ đúng UX "cảnh báo mềm" nhất quán với
 * các validator khác trong DataUpdater.tsx). */
export function splitSummaryLuyKeByKho(
    rawText: string,
    nameToKho: Record<string, string>
): { byKho: Record<string, string>; headerLine: string | null; skippedNames: string[] } {
    const lines = rawText.split(/\r?\n/);
    const headerLine = lines.find(l => l.includes(SUMMARY_LUYKE_HEADER_MARKER)) ?? null;
    const byKho: Record<string, string> = {};
    const skippedNames: string[] = [];

    if (!headerLine) return { byKho, headerLine, skippedNames };

    for (const line of lines) {
        const name = (line.split('\t')[0] ?? '').trim();
        if (!name || !((name.startsWith('ĐM') || name.startsWith('TGD')) && name.includes(' - '))) continue;
        const maKho = nameToKho[name];
        if (!maKho) { skippedNames.push(name); continue; }
        byKho[maKho] = line;
    }

    return { byKho, headerLine, skippedNames };
}

/** Ghi các fragment Summary Luỹ kế lên biData/{maKho} — CHỈ ghi cho các Mã Kho nằm trong
 * allowedKhos của người dán (Firestore Rules cũng chặn việc này, lọc trước ở client cho gọn,
 * khỏi văng permission-denied vô ích — giống cách syncDataToKhoIfManager() ở root đang làm). */
export async function uploadSummaryLuyKeIfManager(
    user: User,
    allowedKhos: string[],
    rawText: string,
    nameToKho: Record<string, string>,
    uploadedByName?: string
): Promise<{ skippedNames: string[]; uploadedKhos: string[] }> {
    const { byKho, headerLine, skippedNames } = splitSummaryLuyKeByKho(rawText, nameToKho);
    if (!headerLine) return { skippedNames, uploadedKhos: [] };

    const allowedSet = new Set(allowedKhos);
    const entries = Object.entries(byKho).filter(([maKho]) => allowedSet.has(maKho));
    if (entries.length === 0) return { skippedNames, uploadedKhos: [] };

    const batch = writeBatch(db);
    entries.forEach(([maKho, dataLine]) => {
        const docData: SummaryLuyKeDoc & { updatedAt: unknown } = {
            headerLine,
            dataLine,
            uploadedByUid: user.uid,
            uploadedByName: uploadedByName || user.email || user.uid,
            updatedAt: serverTimestamp(),
        };
        batch.set(summaryDocRef(maKho), docData);
    });
    await batch.commit();

    return { skippedNames, uploadedKhos: entries.map(([maKho]) => maKho) };
}

/** Đọc + gộp lại Summary Luỹ kế của mọi Mã Kho user được cấp quyền, dựng lại đúng định dạng
 * raw text mà parseSummaryData()/extractSupermarketList() đang mong đợi — KHÔNG cần sửa 2 hàm
 * đó, chỉ tái tạo lại đúng input của chúng. */
export async function fetchAllowedSummaryLuyKeText(allowedKhos: string[]): Promise<string> {
    if (allowedKhos.length === 0) return '';
    const snaps = await Promise.all(allowedKhos.map(maKho => getDoc(summaryDocRef(maKho))));
    let headerLine: string | null = null;
    const dataLines: string[] = [];
    snaps.forEach(snap => {
        if (!snap.exists()) return;
        const data = snap.data() as SummaryLuyKeDoc;
        if (!headerLine) headerLine = data.headerLine;
        dataLines.push(data.dataLine);
    });
    if (!headerLine || dataLines.length === 0) return '';
    return [headerLine, ...dataLines].join('\n');
}

/** Ghi dữ liệu Thi đua Luỹ kế lên biData/{maKho} — parse 1 lần bằng
 * parseCompetitionDataBySupermarket() (đã có sẵn, xử lý nhiều biến thể định dạng), rồi ghi
 * thẳng object đã parse cho từng Mã Kho thay vì lưu lại raw text. */
export async function uploadCompetitionLuyKeIfManager(
    user: User,
    allowedKhos: string[],
    rawText: string,
    nameToKho: Record<string, string>,
    uploadedByName?: string
): Promise<{ skippedNames: string[]; uploadedKhos: string[] }> {
    const bySupermarket = parseCompetitionDataBySupermarket(rawText);
    const allowedSet = new Set(allowedKhos);
    const skippedNames: string[] = [];
    const uploadedKhos: string[] = [];

    const batch = writeBatch(db);
    let hasWrites = false;
    for (const [name, data] of Object.entries(bySupermarket)) {
        if (!data.programs || data.programs.length === 0) continue;
        const maKho = nameToKho[name];
        if (!maKho) { skippedNames.push(name); continue; }
        if (!allowedSet.has(maKho)) continue;

        const docData: CompetitionLuyKeDoc & { updatedAt: unknown } = {
            headers: data.headers,
            programs: data.programs,
            uploadedByUid: user.uid,
            uploadedByName: uploadedByName || user.email || user.uid,
            updatedAt: serverTimestamp(),
        };
        batch.set(competitionDocRef(maKho), docData);
        uploadedKhos.push(maKho);
        hasWrites = true;
    }
    if (hasWrites) await batch.commit();

    return { skippedNames, uploadedKhos };
}

/** Đọc + gộp Thi đua Luỹ kế của mọi Mã Kho user được cấp quyền, trả về đúng shape
 * Record<tên siêu thị, SupermarketCompetitionData> — shape này khớp thẳng với kết quả của
 * parseCompetitionDataBySupermarket(), dùng để merge vào competitionLuyKeBySupermarket hiện
 * có trong useDashboardLogic.ts mà không cần đổi cấu trúc dữ liệu ở tầng dưới. */
export async function fetchAllowedCompetitionLuyKeData(allowedKhos: string[]): Promise<Record<string, SupermarketCompetitionData>> {
    if (allowedKhos.length === 0) return {};
    const result: Record<string, SupermarketCompetitionData> = {};
    await Promise.all(allowedKhos.map(async (maKho) => {
        const snap = await getDoc(competitionDocRef(maKho));
        if (!snap.exists()) return;
        const data = snap.data() as CompetitionLuyKeDoc;
        // Dùng maKho làm khoá hiển thị tạm — sẽ được thay bằng tên siêu thị thật khi có
        // bảng map ngược (Mã Kho → tên hiển thị) ở lớp gọi, xem biSupermarketMapService.ts.
        result[maKho] = { headers: data.headers, programs: data.programs };
    }));
    return result;
}
