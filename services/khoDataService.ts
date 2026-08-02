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
    doc, getDoc, getDocs, updateDoc, collection, writeBatch, serverTimestamp
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { DataRow } from '../types';
import { cleanRow, chunkData, BATCH_GROUP_SIZE } from './cloudDataService';
import * as dbService from './dbService';

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
}

const filesCollectionRef = (maKho: string) => collection(db, 'khoData', maKho, 'salesFiles');
const chunksCollectionRef = (maKho: string, fileId: string) => collection(db, 'khoData', maKho, 'salesFiles', fileId, 'chunks');

/**
 * Tải dữ liệu 1 file lên Kho dùng chung.
 *
 * Realtime: fileId CỐ ĐỊNH theo uploader (`realtime_{uid}`) — mỗi quản lý chỉ có đúng 1
 * "bản Realtime hiện tại" của riêng họ trong Kho, tải lại sẽ GHI ĐÈ bản cũ của chính họ
 * (không tích luỹ vô hạn). Nếu 2 quản lý cùng Kho đều tải Realtime, cả 2 bản cùng tồn tại
 * song song (mỗi người 1 slot riêng) và được gộp khi tải xuống.
 *
 * Lũy kế: fileId MỚI mỗi lần tải (Firestore auto-id) — mỗi file lũy kế là 1 giai đoạn dữ
 * liệu riêng biệt (vd "Tháng 5", "Tháng 6"), không được ghi đè lẫn nhau.
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

    const cleanedData = data.map(cleanRow);
    const chunks = chunkData(cleanedData);

    // Ngày dữ liệu gần nhất trong file — dùng cho retention (pruneStaleKhoFiles), không phải
    // ngày tải lên. Quét trên `data` gốc (còn Date object) trước khi cleanRow chuyển thành
    // chuỗi ISO cho cleanedData.
    let maxDate: number | undefined;
    for (const row of data) {
        const d = row.parsedDate;
        if (d instanceof Date && !isNaN(d.getTime())) {
            if (maxDate === undefined || d.getTime() > maxDate) maxDate = d.getTime();
        }
    }

    const filesRef = filesCollectionRef(maKho);
    const fileRef = isRealtime ? doc(filesRef, `realtime_${user.uid}`) : doc(filesRef);
    const fileId = fileRef.id;
    const chunksRef = chunksCollectionRef(maKho, fileId);

    const meta: Omit<KhoSalesFileMeta, 'fileId'> = {
        maKho,
        filename,
        uploadedByUid: user.uid,
        uploadedByName: uploadedByName || user.email || user.uid,
        uploadedAt: Date.now(),
        fileLastModified,
        totalRows: data.length,
        chunkCount: chunks.length,
        isRealtime,
        isActive: true,
        version: 1,
        ...(maxDate !== undefined ? { maxDate } : {}),
    };

    // Gộp chunk + meta thành các nhóm writeBatch (không còn Promise.all(setDoc...) rời rạc
    // từng document) — cùng nguyên tắc đã áp dụng ở cloudDataService.ts: giảm số lượt ghi ĐỘC
    // LẬP bắn song song, tránh cạn hàng đợi write stream của Firestore SDK khi Kho có file
    // nhiều chunk (xem implementation_plan.md mục 60).
    const docsToWrite: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = chunks.map((chunk, index) => ({
        ref: doc(chunksRef, `chunk_${index}`),
        data: { rows: chunk }
    }));
    docsToWrite.push({ ref: fileRef, data: { ...meta, updatedAt: serverTimestamp() } });

    for (let i = 0; i < docsToWrite.length; i += BATCH_GROUP_SIZE) {
        const group = docsToWrite.slice(i, i + BATCH_GROUP_SIZE);
        const batch = writeBatch(db);
        group.forEach(({ ref, data: docData }) => batch.set(ref, docData));
        await batch.commit();
    }

    // Dọn chunk cũ dư ra nếu lần tải này ít chunk hơn lần trước (chỉ áp dụng cho slot
    // Realtime bị ghi đè — file lũy kế luôn là fileId mới nên không có chunk cũ để dọn).
    if (isRealtime) {
        try {
            const snapshot = await getDocs(chunksRef);
            const staleRefs = snapshot.docs
                .filter(docSnap => {
                    const id = docSnap.id;
                    if (!id.startsWith('chunk_')) return false;
                    const idx = parseInt(id.replace('chunk_', ''), 10);
                    return idx >= chunks.length;
                })
                .map(docSnap => docSnap.ref);

            for (let i = 0; i < staleRefs.length; i += BATCH_GROUP_SIZE) {
                const group = staleRefs.slice(i, i + BATCH_GROUP_SIZE);
                const batch = writeBatch(db);
                group.forEach(ref => batch.delete(ref));
                await batch.commit();
            }
        } catch (e) {
            console.warn('[KhoData] Failed to cleanup stale realtime chunks:', e);
        }
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

    const activeLuyKe = files.filter(f => f.isActive && !f.isRealtime);
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
 */
export async function downloadKhoFileRows(maKho: string, fileId: string, chunkCount: number): Promise<DataRow[]> {
    const chunksRef = chunksCollectionRef(maKho, fileId);
    const chunkPromises: Promise<DataRow[]>[] = [];
    for (let i = 0; i < chunkCount; i++) {
        chunkPromises.push(
            getDoc(doc(chunksRef, `chunk_${i}`)).then(snap => (snap.exists() ? (snap.data().rows || []) as DataRow[] : []))
        );
    }
    const chunkResults = await Promise.all(chunkPromises);
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
    const files = await getKhoActiveFilesMeta(maKho);
    const rowsByFile = await Promise.all(files.map(f => downloadKhoFileRows(maKho, f.fileId, f.chunkCount)));
    const data = rowsByFile.flat();
    return { data, files };
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

    const allowedKhos = (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
    if (allowedKhos.length === 0) return;

    const rowsByKho = new Map<string, DataRow[]>();
    for (const row of data) {
        const kho = String(row['Mã kho tạo'] || '').trim();
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
}

const khoFileCacheKey = (maKho: string, fileId: string) => `khoDataCache_${maKho}_${fileId}`;

/** Chuỗi đại diện trạng thái hiện tại của các file active trong Kho — dùng để trả về cho
 * tầng gọi (useDataManagement.ts) so sánh, quyết định có cần ghi đè `originalData`/chạy lại
 * worker xử lý hay không. */
function computeFilesSnapshot(files: KhoSalesFileMeta[]): string {
    return JSON.stringify(
        files.map(f => ({ id: f.fileId, t: f.fileLastModified })).sort((a, b) => a.id.localeCompare(b.id))
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
    const files = await getKhoActiveFilesMeta(maKho);
    const snapshot = computeFilesSnapshot(files);

    const rowsByFile = await Promise.all(files.map(async (f) => {
        const cacheKey = khoFileCacheKey(maKho, f.fileId);
        const cached = await dbService.getSetting<KhoFileCacheEntry>(cacheKey).catch(() => null);
        if (cached && cached.fileLastModified === f.fileLastModified) {
            return cached.data;
        }

        const rows = await downloadKhoFileRows(maKho, f.fileId, f.chunkCount);
        dbService.saveSetting(cacheKey, { data: rows, fileLastModified: f.fileLastModified } as KhoFileCacheEntry).catch(err =>
            console.warn(`[KhoData] Không lưu được cache cục bộ cho file ${f.fileId} (Kho ${maKho}):`, err)
        );
        return rows;
    }));

    const data = rowsByFile.flat();
    return { data, snapshot };
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
    const allowedKhos = (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
    if (allowedKhos.length === 0) return { data: [], snapshot: '' };

    const results = await Promise.all(allowedKhos.map(maKho => fetchKhoDataCached(maKho)));
    return {
        data: results.flatMap(r => r.data),
        snapshot: results.map(r => r.snapshot).join('|'),
    };
}
