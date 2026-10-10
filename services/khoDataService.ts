/**
 * Kho Data Service — đồng bộ dữ liệu doanh số DÙNG CHUNG theo Mã Kho.
 *
 * Khác với cloudDataService.ts (users/{uid}/salesData — theo UID CÁ NHÂN, chỉ đồng bộ
 * cho chính người tải giữa các thiết bị của họ), service này lưu dữ liệu theo Mã Kho để
 * quản lý cập nhật 1 lần, mọi nhân viên/quản lý khác cùng Kho đăng nhập trên thiết bị
 * riêng đều thấy được (xem implementation_plan.md mục 37).
 *
 * Firestore structure:
 *   khoData/{maKho}/salesFiles/{fileId}                — metadata 1 file đã tải lên
 *   khoData/{maKho}/salesFiles/{fileId}/chunks/{n}      — dữ liệu dòng, chia nhỏ (giống
 *                                                          cloudDataService.ts)
 *
 * Nhiều quản lý cùng 1 Kho → nhiều fileId khác nhau cùng tồn tại dưới 1 maKho (không
 * ghi đè lẫn nhau) — merge lại ở downloadKhoSalesData(), giống cách hệ thống lũy kế cục
 * bộ (dbService/salesData.ts) đang gộp nhiều file isActive=true.
 */

import { db } from './firebase';
import {
    doc, getDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, serverTimestamp
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { DataRow } from '../types';
import { cleanRow, chunkData, BATCH_GROUP_SIZE } from './cloudDataService';
import * as dbService from './dbService';
import { getRowValue, parseKhoList } from '../utils/dataUtils';
import { COL } from '../constants';
import { mapWithLimit } from './mapWithLimit';
import { cleanYcxFileName } from './ycxAutoSyncService';

/** Số file / chunk tải song song tối đa (audit GĐ3 — trước đây không giới hạn). Tối đa 3 × 4 = 12 request. */
const FILE_CONCURRENCY = 3;
const CHUNK_CONCURRENCY = 4;

export interface KhoSalesFileMeta {
    fileId: string;
    maKho: string;
    filename: string;
    uploadedByUid: string;
    uploadedByName: string;
    uploadedAt: number;       // timestamp ms
    fileLastModified: number;
    totalRows: number;
    chunkCount: number;
    isRealtime: boolean;
    isActive: boolean;
    version: number;
    /** Ngày dữ liệu gần nhất tìm thấy trong file (từ parsedDate của từng dòng) — dùng làm
     * mốc tính retention 24 tháng, ưu tiên hơn uploadedAt (ngày bấm tải lên), khớp đúng cách
     * `dbService/salesData.ts` đang tính cho hệ thống lũy kế cục bộ. */
    maxDate?: number;
    /** Ô theo THÁNG (định dạng YYYY-MM, hoặc 'nodate') — có ở file ghi từ 2026-10-07. File cũ không
     *  có trường này là "bản chụp gộp" (auto-id Lũy kế / realtime_{uid}). Xem selectLatestRowsByMonth. */
    month?: string;
    /** Phiên bản chunk: chunk nằm ở `${rev}_${i}`. Không có = file cũ, chunk ở `chunk_${i}`. */
    rev?: string;
}

/** Tháng của 1 dòng (YYYY-MM) — đọc được cả Date (lúc tải lên) lẫn chuỗi ISO (lúc tải xuống). */
export function rowMonthKey(row: DataRow): string {
    const raw = row.parsedDate as unknown;
    const d = raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number') ? new Date(raw) : null;
    if (!d || isNaN(d.getTime())) return 'nodate';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Audit 2026-10-07 (D02): MỖI lượt đồng bộ lên Kho là BẢN CHỤP ĐẦY ĐỦ dữ liệu đã gộp của người tải
 * (getMergedSalesData) — trước đây file Lũy kế dùng ID mới mỗi lần nên các bản chụp nằm chồng lên nhau
 * và bị CỘNG DỒN khi đọc (cùng dữ liệu tải 2 lần → doanh thu x2).
 *
 * Quy tắc đọc: với MỖI THÁNG, chỉ lấy các dòng từ NGUỒN MỚI NHẤT (uploadedAt) có dữ liệu tháng đó.
 * Không xoá gì trên cloud — dữ liệu đã trùng từ trước tự hết trùng khi đọc.
 */
export function selectLatestRowsByMonth(sources: { uploadedAt: number; rows: DataRow[] }[]): DataRow[] {
    const covered = new Set<string>();
    const out: DataRow[] = [];
    for (const src of [...sources].sort((a, b) => b.uploadedAt - a.uploadedAt)) {
        const monthsHere = new Set<string>();
        for (const row of src.rows) {
            const m = rowMonthKey(row);
            if (covered.has(m)) continue;
            monthsHere.add(m);
            out.push(row);
        }
        monthsHere.forEach(m => covered.add(m));
    }
    return out;
}

/**
 * Chọn file cần tải: mọi ô theo tháng + với file cũ (bản chụp gộp, không có `month`) chỉ bản MỚI
 * NHẤT của từng người tải — các bản cũ hơn của cùng người là bản chụp trước đó, đã bị bản mới bao trùm.
 */
export function pickKhoFilesToLoad(files: KhoSalesFileMeta[]): KhoSalesFileMeta[] {
    const monthSlots = files.filter(f => f.month);
    const newestLegacyByUploader = new Map<string, KhoSalesFileMeta>();
    for (const f of files) {
        if (f.month) continue;
        const cur = newestLegacyByUploader.get(f.uploadedByUid);
        if (!cur || f.uploadedAt > cur.uploadedAt) newestLegacyByUploader.set(f.uploadedByUid, f);
    }
    return [...monthSlots, ...newestLegacyByUploader.values()];
}

const filesCollectionRef = (maKho: string) => collection(db, 'khoData', maKho, 'salesFiles');
const chunksCollectionRef = (maKho: string, fileId: string) => collection(db, 'khoData', maKho, 'salesFiles', fileId, 'chunks');

/**
 * Tải dữ liệu lên Kho dùng chung — 1 Ô CHO MỖI (người tải, tháng): `m_{YYYYMM}_{uid}`.
 *
 * Audit 2026-10-07 (D02/D03): dữ liệu truyền vào luôn là bản gộp đầy đủ của người tải, nên đồng bộ
 * lại nhiều lần GHI ĐÈ đúng các ô tháng đó thay vì tạo thêm bản mới. Chunk ghi vào phiên bản mới
 * (`${rev}_${i}`), metadata (trỏ tới `rev`) ghi SAU CÙNG — người đọc giữa chừng vẫn thấy trọn bản cũ,
 * không bao giờ thấy bản trộn nửa cũ nửa mới. Chunk của phiên bản cũ dọn sau khi metadata đã trỏ sang.
 * (`isRealtime` giữ trong metadata để hiển thị; không còn quyết định cách đặt ID.)
 */
export async function uploadKhoSalesData(
    user: User,
    maKho: string,
    data: DataRow[],
    filename: string,
    fileLastModified: number,
    isRealtime: boolean,
    uploadedByName?: string
): Promise<void> {
    if (!user || !maKho || data.length === 0) return;

    const cleanedFileName = cleanYcxFileName(filename);
    const rowsByMonth = new Map<string, DataRow[]>();
    for (const row of data) {
        const m = rowMonthKey(row);
        if (!rowsByMonth.has(m)) rowsByMonth.set(m, []);
        rowsByMonth.get(m)!.push(row);
    }

    for (const [month, rows] of rowsByMonth) {
        await uploadKhoMonthSlot(user, maKho, month, rows, cleanedFileName, fileLastModified, isRealtime, uploadedByName);
    }
}

async function uploadKhoMonthSlot(
    user: User,
    maKho: string,
    month: string,
    data: DataRow[],
    filename: string,
    fileLastModified: number,
    isRealtime: boolean,
    uploadedByName?: string
): Promise<void> {
    const cleanedData = data.map(cleanRow);
    const chunks = chunkData(cleanedData);

    // Ngày dữ liệu gần nhất — dùng cho retention (pruneStaleKhoFiles). Quét trên `data` gốc (còn Date).
    let maxDate: number | undefined;
    for (const row of data) {
        const d = row.parsedDate;
        if (d instanceof Date && !isNaN(d.getTime())) {
            if (maxDate === undefined || d.getTime() > maxDate) maxDate = d.getTime();
        }
    }

    const filesRef = filesCollectionRef(maKho);
    const fileRef = doc(filesRef, `m_${month.replace('-', '')}_${user.uid}`);
    const chunksRef = chunksCollectionRef(maKho, fileRef.id);
    const rev = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const meta: Omit<KhoSalesFileMeta, 'fileId'> = {
        maKho,
        filename: month === 'nodate' ? filename : `${filename} · tháng ${month.slice(5)}/${month.slice(0, 4)}`,
        uploadedByUid: user.uid,
        uploadedByName: uploadedByName || user.email || user.uid,
        uploadedAt: now,
        // Đổi theo MỖI lần ghi (khoá cache phía đọc) — fileLastModified của bản gộp có thể không đổi
        // dù nội dung đổi (vd vừa xoá 1 file cục bộ).
        fileLastModified: Math.max(fileLastModified || 0, now),
        totalRows: data.length,
        chunkCount: chunks.length,
        isRealtime,
        isActive: true,
        version: 2,
        month,
        rev,
        ...(maxDate !== undefined ? { maxDate } : {}),
    };

    // Chunk trước (phiên bản mới, chưa ai trỏ tới) — gộp writeBatch như cloudDataService.ts.
    const chunkDocs = chunks.map((chunk, index) => ({ ref: doc(chunksRef, `${rev}_${index}`), data: { rows: chunk } }));
    for (let i = 0; i < chunkDocs.length; i += BATCH_GROUP_SIZE) {
        const batch = writeBatch(db);
        chunkDocs.slice(i, i + BATCH_GROUP_SIZE).forEach(({ ref, data: d }) => batch.set(ref, d));
        await batch.commit();
    }
    // Metadata SAU CÙNG — đây là thời điểm "công bố" phiên bản mới.
    const metaBatch = writeBatch(db);
    metaBatch.set(fileRef, { ...meta, updatedAt: serverTimestamp() });
    await metaBatch.commit();

    // Dọn chunk của phiên bản cũ (lỗi ở đây chỉ để lại rác, không ảnh hưởng dữ liệu đang đọc).
    try {
        const snapshot = await getDocs(chunksRef);
        const staleRefs = snapshot.docs.filter(d => !d.id.startsWith(`${rev}_`)).map(d => d.ref);
        for (let i = 0; i < staleRefs.length; i += BATCH_GROUP_SIZE) {
            const batch = writeBatch(db);
            staleRefs.slice(i, i + BATCH_GROUP_SIZE).forEach(ref => batch.delete(ref));
            await batch.commit();
        }
    } catch (e) {
        console.warn('[KhoData] Không dọn được chunk phiên bản cũ:', e);
    }
}

/**
 * Lấy TẤT CẢ file (active lẫn không active) của 1 Kho — dùng cho giao diện quản lý
 * (ẩn/xoá file), khác với getKhoActiveFilesMeta() (chỉ active, dùng để gộp dữ liệu hiển thị).
 */
export async function getKhoAllFilesMeta(maKho: string): Promise<KhoSalesFileMeta[]> {
    if (!maKho) return [];
    const snapshot = await getDocs(filesCollectionRef(maKho));
    const files: KhoSalesFileMeta[] = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<KhoSalesFileMeta, 'fileId'>;
        files.push({ ...data, fileId: docSnap.id });
    });
    return files;
}

/**
 * Lấy danh sách metadata các file ĐANG ACTIVE của 1 Kho (không tải dữ liệu dòng) —
 * dùng để so sánh fileLastModified với bản cache cục bộ trước khi quyết định tải chunk.
 */
export async function getKhoActiveFilesMeta(maKho: string): Promise<KhoSalesFileMeta[]> {
    const files = await getKhoAllFilesMeta(maKho);
    return files.filter(f => f.isActive);
}

// Giữ đồng bộ với RETENTION_MONTHS ở services/dbService/salesData.ts (hệ thống lũy kế cục
// bộ) — cùng 1 chính sách 24 tháng, áp dụng thêm cho dữ liệu Kho dùng chung.
const KHO_RETENTION_MONTHS = 24;

/**
 * Tự động ẩn (isActive: false, KHÔNG xoá) các file Lũy kế đã cũ hơn 24 tháng (tính theo
 * maxDate — ngày dữ liệu thực trong file, fallback uploadedAt nếu file cũ chưa có maxDate).
 * Chỉ áp dụng cho file Lũy kế (isRealtime=false) — Realtime luôn là bản mới nhất, không cần
 * prune. An toàn: không ẩn hết TOÀN BỘ file đang active của 1 Kho cùng lúc (tránh Kho đột
 * ngột trống dữ liệu không rõ lý do) — giống hệt logic `pruneStaleActiveFiles` cục bộ.
 */
export async function pruneStaleKhoFiles(maKho: string): Promise<void> {
    const files = await getKhoAllFilesMeta(maKho);
    const cutoffTime = Date.now() - KHO_RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000;

    // Ô theo tháng (có `month`) cũng là dữ liệu tích luỹ — áp retention dù cờ isRealtime của lượt tải là gì.
    const activeLuyKe = files.filter(f => f.isActive && (!f.isRealtime || !!f.month));
    const isWithinRetention = (f: KhoSalesFileMeta) => (f.maxDate ?? f.uploadedAt) >= cutoffTime;

    if (activeLuyKe.length > 0 && activeLuyKe.every(f => !isWithinRetention(f))) return;

    const staleFiles = activeLuyKe.filter(f => !isWithinRetention(f));
    if (staleFiles.length === 0) return;

    await Promise.all(
        staleFiles.map(f => setKhoSalesFileActive(maKho, f.fileId, false)
            .catch(err => console.warn(`[KhoData] Không ẩn được file cũ ${f.fileId} của Kho ${maKho}:`, err)))
    );
}

/**
 * Tải toàn bộ chunk dữ liệu của 1 file cụ thể, gộp lại thành mảng DataRow[].
 * Audit D03: THIẾU chunk là LỖI (ném ra) — trước đây chunk thiếu bị coi như rỗng và trả về
 * "thành công" với một phần dữ liệu (số liệu thiếu mà không ai biết).
 */
export async function downloadKhoFileRows(maKho: string, fileId: string, chunkCount: number, rev?: string): Promise<DataRow[]> {
    const chunksRef = chunksCollectionRef(maKho, fileId);
    const chunkIds = Array.from({ length: chunkCount }, (_, i) => (rev ? `${rev}_${i}` : `chunk_${i}`));
    const chunkResults = await mapWithLimit(chunkIds, CHUNK_CONCURRENCY, chunkId =>
        getDoc(doc(chunksRef, chunkId)).then(snap => {
            if (!snap.exists()) throw new Error(`[KhoData] Thiếu ${chunkId} của file ${fileId} (Kho ${maKho}) — dữ liệu chưa đầy đủ.`);
            return (snap.data().rows || []) as DataRow[];
        }));
    const allRows: DataRow[] = [];
    for (const chunk of chunkResults) {
        for (const row of chunk) {
            if (row.parsedDate && typeof row.parsedDate === 'string') {
                row.parsedDate = new Date(row.parsedDate);
            }
            allRows.push(row);
        }
    }
    return allRows;
}

/**
 * Tải + gộp dữ liệu của TẤT CẢ file đang active trong 1 Kho.
 * Trả kèm danh sách metadata (để tầng gọi tự cache/so sánh fileLastModified sau này).
 */
export async function downloadKhoSalesData(maKho: string): Promise<{ data: DataRow[]; files: KhoSalesFileMeta[] }> {
    const files = pickKhoFilesToLoad(await getKhoActiveFilesMeta(maKho));
    const sources = await mapWithLimit(files, FILE_CONCURRENCY, async f => ({ uploadedAt: f.uploadedAt, rows: await downloadKhoFileRows(maKho, f.fileId, f.chunkCount, f.rev) }));
    return { data: selectLatestRowsByMonth(sources), files };
}

/** Ẩn (không xoá) 1 file khỏi kết quả gộp — dùng cho retention/quản lý sau này (mục 5). */
export async function setKhoSalesFileActive(maKho: string, fileId: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(filesCollectionRef(maKho), fileId), { isActive });
}

/** Xoá hẳn 1 file (metadata + toàn bộ chunk). */
export async function deleteKhoSalesFile(maKho: string, fileId: string): Promise<void> {
    const chunksRef = chunksCollectionRef(maKho, fileId);
    const snapshot = await getDocs(chunksRef);
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => batch.delete(docSnap.ref));
    batch.delete(doc(filesCollectionRef(maKho), fileId));
    await batch.commit();
}

/**
 * Xoá sạch toàn bộ file doanh số (metadata + toàn bộ chunks) của 1 Kho.
 * Dùng khi quản lý reset dữ liệu Kho hoặc bấm xoá tất cả dữ liệu.
 */
export async function purgeKhoSalesFiles(maKho: string): Promise<void> {
    if (!maKho) return;
    try {
        const filesRef = filesCollectionRef(maKho);
        const filesSnap = await getDocs(filesRef);
        if (!filesSnap.empty) {
            for (const fileDoc of filesSnap.docs) {
                const fileId = fileDoc.id;
                const chunksRef = chunksCollectionRef(maKho, fileId);
                const chunkSnap = await getDocs(chunksRef);
                
                for (let i = 0; i < chunkSnap.docs.length; i += BATCH_GROUP_SIZE) {
                    const group = chunkSnap.docs.slice(i, i + BATCH_GROUP_SIZE);
                    const batch = writeBatch(db);
                    group.forEach(c => batch.delete(c.ref));
                    await batch.commit();
                }
                await deleteDoc(fileDoc.ref);
            }
        }

        // Xoá cache cục bộ và snapshot đã lưu của Kho này
        try {
            const appliedSnapshotKey = `khoDataAppliedSnapshot::${maKho}`;
            await dbService.deleteSetting(appliedSnapshotKey);
            const allSettings = await dbService.getAllSettings();
            for (const key of Object.keys(allSettings)) {
                if (key.startsWith(`khoDataCache_${maKho}_`)) {
                    await dbService.deleteSetting(key);
                }
            }
        } catch {
            /* bỏ qua lỗi xoá cache setting */
        }
    } catch (err) {
        console.warn(`[KhoData] Lỗi purgeKhoSalesFiles cho Kho ${maKho}:`, err);
    }
}

/**
 * Điểm gọi DUY NHẤT cho mọi nơi re-sync dữ liệu lên cloud (tải file mới, xoá file, xoá
 * Realtime, xem báo cáo — đều đi qua đây thay vì tự viết lại logic tách theo Kho ở từng
 * nơi). Không làm gì nếu KHÔNG phải admin/manager (nhân viên không được ghi — cũng đã bị
 * Firestore Rules chặn, nhưng chặn sớm ở đây để khỏi tốn 1 request vô ích).
 *
 * `data` truyền vào là TOÀN BỘ dữ liệu người dùng đang thấy (chưa qua rbacData) — tách lại
 * theo "Mã kho tạo", CHỈ đồng bộ các mã Kho nằm trong quyền của người tải (`departmentId`)
 * để tránh lỡ ghi nhầm dữ liệu Kho khác lên Kho không thuộc quyền (Firestore Rules cũng sẽ
 * chặn việc này, nhưng lọc trước ở client cho gọn, khỏi văng lỗi permission-denied vô ích).
 */
export async function syncDataToKhoIfManager(
    user: User | null | undefined,
    userRole: string | null | undefined,
    departmentId: string | undefined,
    data: DataRow[],
    filename: string,
    fileLastModified: number,
    isRealtime: boolean,
    uploadedByName?: string
): Promise<void> {
    if (!user || (userRole !== 'admin' && userRole !== 'manager')) return;

    const allowedKhos = parseKhoList(departmentId);
    if (allowedKhos.length === 0) return;

    const rowsByKho = new Map<string, DataRow[]>();
    for (const row of data) {
        const kho = String(getRowValue(row, COL.KHO) || '').trim();
        if (!kho || !allowedKhos.includes(kho)) continue;
        if (!rowsByKho.has(kho)) rowsByKho.set(kho, []);
        rowsByKho.get(kho)!.push(row);
    }

    await Promise.all(
        Array.from(rowsByKho.entries()).map(([maKho, rows]) =>
            uploadKhoSalesData(user, maKho, rows, filename, fileLastModified, isRealtime, uploadedByName)
                .then(() => pruneStaleKhoFiles(maKho))
                .catch(err => console.error(`[KhoData] Đồng bộ thất bại cho Kho ${maKho}:`, err))
        )
    );
}

interface KhoFileCacheEntry {
    data: DataRow[];
    fileLastModified: number;
    rev?: string | null;
}

const khoFileCacheKey = (maKho: string, fileId: string) => `khoDataCache_${maKho}_${fileId}`;

/** Chuỗi đại diện trạng thái hiện tại của các file active trong Kho — dùng để trả về cho
 * tầng gọi (useDataManagement.ts) so sánh, quyết định có cần ghi đè `originalData`/chạy lại
 * worker xử lý hay không. */
function computeFilesSnapshot(files: KhoSalesFileMeta[]): string {
    return JSON.stringify(
        files.map(f => ({ id: f.fileId, t: f.fileLastModified, r: f.rev ?? null })).sort((a, b) => a.id.localeCompare(b.id))
    );
}

/**
 * Tải dữ liệu 1 Kho, có cache cục bộ theo TỪNG FILE (IndexedDB, dùng chung cơ chế key-value
 * của dbService) — chỉ file nào có `fileLastModified` đổi so với lần trước mới tải lại chunk
 * của riêng file đó, các file còn lại (vd nhiều tháng Lũy kế cũ không đổi) dùng thẳng cache.
 *
 * Trước đây cache theo 1 khoá gộp cho CẢ Kho (snapshot nối tất cả file) — hễ có 1 file đổi
 * (vd quản lý ghi đè bản Realtime của họ, việc này xảy ra thường xuyên) là toàn bộ Kho bị coi
 * là "cũ" và tải lại TẤT CẢ chunk của TẤT CẢ file kể cả những file không hề đổi, khiến tab
 * Phân Tích chậm dần theo thời gian khi Kho tích luỹ nhiều tháng dữ liệu Lũy kế (mục 39b).
 */
async function fetchKhoDataCached(maKho: string): Promise<{ data: DataRow[]; snapshot: string }> {
    const files = pickKhoFilesToLoad(await getKhoActiveFilesMeta(maKho));
    const snapshot = computeFilesSnapshot(files);

    const sources = await mapWithLimit(files, FILE_CONCURRENCY, async (f) => {
        const cacheKey = khoFileCacheKey(maKho, f.fileId);
        const cached = await dbService.getSetting<KhoFileCacheEntry>(cacheKey).catch(() => null);
        if (cached && cached.fileLastModified === f.fileLastModified && (cached.rev ?? null) === (f.rev ?? null)) {
            return { uploadedAt: f.uploadedAt, rows: cached.data };
        }

        const rows = await downloadKhoFileRows(maKho, f.fileId, f.chunkCount, f.rev);
        dbService.saveSetting(cacheKey, { data: rows, fileLastModified: f.fileLastModified, rev: f.rev ?? null } as KhoFileCacheEntry).catch(err =>
            console.warn(`[KhoData] Không lưu được cache cục bộ cho file ${f.fileId} (Kho ${maKho}):`, err)
        );
        return { uploadedAt: f.uploadedAt, rows };
    });

    return { data: selectLatestRowsByMonth(sources), snapshot };
}

/**
 * Tải + gộp dữ liệu từ TẤT CẢ mã Kho user được cấp quyền (`departmentId`, có thể nhiều mã
 * Kho nối dấu phẩy) — dùng khi mở app cho manager/employee thay vì chỉ đọc IndexedDB cục
 * bộ (vốn trống với nhân viên dùng thiết bị cá nhân riêng, chưa từng tự tải file — xem
 * implementation_plan.md mục 37).
 *
 * Trả kèm `snapshot` gộp (nối các snapshot từng Kho) — để tầng gọi (useDataManagement.ts)
 * so sánh với lần áp dụng gần nhất và BỎ QUA việc ghi đè `originalData`/chạy lại worker xử
 * lý nếu dữ liệu Kho không đổi so với lần trước — tránh xử lý lại 2 lần (1 lần cho dữ liệu
 * local, 1 lần cho dữ liệu Kho giống hệt) mỗi lần mở app, vốn là nguyên nhân chính khiến màn
 * hình loading kéo dài không cần thiết (mục 39 implementation_plan.md).
 */
export async function fetchAllowedKhoData(departmentId: string | undefined): Promise<{ data: DataRow[]; snapshot: string }> {
    const allowedKhos = parseKhoList(departmentId);
    if (allowedKhos.length === 0) return { data: [], snapshot: '' };

    const results = await mapWithLimit(allowedKhos, 2, maKho => fetchKhoDataCached(maKho));
    return {
        data: results.flatMap(r => r.data),
        snapshot: results.map(r => r.snapshot).join('|'),
    };
}
