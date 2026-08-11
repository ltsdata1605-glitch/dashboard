/**
 * Cloud Data Service — Firebase JSON Sync
 * 
 * Thay thế Google Drive Excel upload bằng Firebase Firestore JSON sync.
 * Dữ liệu Excel sau khi xử lý (DataRow[]) được nén, chia chunks ≤ 800KB,
 * và upload lên Firestore sub-collection `salesData`.
 * 
 * Trên thiết bị khác (mobile), chỉ cần tải JSON chunks → hiển thị ngay,
 * không cần xử lý lại Excel.
 */

import { db } from './firebase';
import { doc, getDoc, getDocs, collection, writeBatch, serverTimestamp, FieldValue } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { DataRow } from '../types';

// Firestore document limit is 1MB. We target 800KB per chunk for safety.
const MAX_CHUNK_BYTES = 800 * 1024;

// Số document tối đa gộp vào 1 writeBatch — 10 chunk × 800KB ≈ 8MB, an toàn dưới giới hạn
// kích thước 1 lần commit của Firestore (giảm số lượt ghi ĐỘC LẬP, tránh cạn hàng đợi write
// stream khi file có nhiều chunk, xem services/firestoreService.ts áp dụng cùng nguyên tắc).
// Xuất ra để services/khoDataService.ts dùng chung — tránh khai báo trùng ngưỡng lần 2.
export const BATCH_GROUP_SIZE = 10;

// Fields to strip from DataRow before uploading (save bandwidth)
const STRIP_FIELDS = new Set([
    '__rowOriginal',
    '__rowIndex',
    '__hash',
]);

export interface SalesDataMeta {
    filename: string;
    savedAt: number;         // timestamp ms
    fileLastModified: number;
    totalRows: number;
    chunkCount: number;
    version: number;         // for future migration
    uploadedFrom: string;    // 'laptop' | 'mobile'
    isRealtime?: boolean;
    updatedAt?: FieldValue;  // serverTimestamp
}

/**
 * Cleans a single DataRow for upload:
 * - Strips unnecessary fields
 * - Converts Date objects to ISO strings
 *
 * Xuất ra (export) để services/khoDataService.ts dùng chung — tránh viết lại logic
 * strip-field/convert-date lần 2 cho luồng đồng bộ dữ liệu theo Kho.
 */
export function cleanRow(row: DataRow): DataRow {
    const clean: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
        if (STRIP_FIELDS.has(key)) continue;
        if (value instanceof Date) {
            clean[key] = value.toISOString();
        } else if (value !== undefined && value !== null) {
            clean[key] = value;
        }
    }
    return clean;
}

/**
 * Splits DataRow[] into chunks where each chunk's JSON size ≤ MAX_CHUNK_BYTES.
 * Uses a greedy approach: keep adding rows until size exceeds limit.
 *
 * Xuất ra (export) để services/khoDataService.ts dùng chung.
 */
export function chunkData(data: DataRow[]): DataRow[][] {
    if (data.length === 0) return [];

    const chunks: DataRow[][] = [];
    let currentChunk: DataRow[] = [];
    let currentSize = 2; // for '[]' wrapper

    for (const row of data) {
        const rowStr = JSON.stringify(row);
        const rowSize = rowStr.length + 1; // +1 for comma separator

        if (currentSize + rowSize > MAX_CHUNK_BYTES && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [row];
            currentSize = 2 + rowStr.length;
        } else {
            currentChunk.push(row);
            currentSize += rowSize;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

/**
 * Upload processed DataRow[] to Firestore as JSON chunks.
 * 
 * Firestore structure:
 *   users/{uid}/salesData/meta     — metadata
 *   users/{uid}/salesData/chunk_0  — first batch of rows
 *   users/{uid}/salesData/chunk_1  — second batch
 *   ...
 */
export async function uploadProcessedData(
    user: User,
    data: DataRow[],
    filename: string,
    fileLastModified: number,
    customSavedAt?: number,
    isRealtime?: boolean
): Promise<void> {
    if (!user || data.length === 0) return;

    console.warn(`[CloudData] Starting upload: ${data.length} rows, file: ${filename}`);
    const startTime = Date.now();

    // 1. Clean and chunk data
    const cleanedData = data.map(cleanRow);
    const chunks = chunkData(cleanedData);

    console.warn(`[CloudData] Split into ${chunks.length} chunks`);

    // 2. Upload chunks + meta theo NHÓM writeBatch (không còn Promise.all(setDoc...) rời rạc
    // từng document — với file Lũy kế nhiều tháng, hàng chục chunk bắn setDoc() độc lập cùng
    // lúc từng gây Firestore SDK báo "Write stream exhausted maximum allowed queued writes",
    // nhất là khi trùng thời điểm với các lượt ghi khác (heavy-sync config, khoData...). Gộp
    // thành writeBatch giảm số lượt ghi ĐỘC LẬP từ N xuống ceil(N/BATCH_GROUP_SIZE).
    const salesDataRef = collection(db, 'users', user.uid, 'salesData');

    const meta: SalesDataMeta = {
        filename,
        savedAt: customSavedAt || Date.now(),
        fileLastModified,
        totalRows: data.length,
        chunkCount: chunks.length,
        version: 1,
        uploadedFrom: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'laptop',
        isRealtime: !!isRealtime
    };

    const docsToWrite: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = chunks.map((chunk, index) => ({
        ref: doc(salesDataRef, `chunk_${index}`),
        data: { rows: chunk }
    }));
    docsToWrite.push({ ref: doc(salesDataRef, 'meta'), data: { ...meta, updatedAt: serverTimestamp() } });

    for (let i = 0; i < docsToWrite.length; i += BATCH_GROUP_SIZE) {
        const group = docsToWrite.slice(i, i + BATCH_GROUP_SIZE);
        const batch = writeBatch(db);
        group.forEach(({ ref, data: docData }) => batch.set(ref, docData));
        await batch.commit();
    }

    // 3. Clean up old chunks that are no longer needed
    //    (e.g., if previous upload had 5 chunks but this one only has 3)
    try {
        const snapshot = await getDocs(salesDataRef);
        const staleRefs = snapshot.docs
            .filter(docSnap => {
                const id = docSnap.id;
                if (!id.startsWith('chunk_')) return false;
                const chunkIndex = parseInt(id.replace('chunk_', ''), 10);
                return chunkIndex >= chunks.length;
            })
            .map(docSnap => docSnap.ref);

        for (let i = 0; i < staleRefs.length; i += BATCH_GROUP_SIZE) {
            const group = staleRefs.slice(i, i + BATCH_GROUP_SIZE);
            const batch = writeBatch(db);
            group.forEach(ref => batch.delete(ref));
            await batch.commit();
        }
        if (staleRefs.length > 0) {
            console.warn(`[CloudData] Cleaned up ${staleRefs.length} stale chunks`);
        }
    } catch (e) {
        console.warn('[CloudData] Failed to cleanup old chunks:', e);
    }

    const elapsed = Date.now() - startTime;
    console.warn(`[CloudData] Upload complete in ${elapsed}ms (${chunks.length} chunks, ${data.length} rows)`);
}

/**
 * Download processed data from Firestore.
 * Returns null if no data exists on cloud.
 */
export async function downloadProcessedData(
    user: User,
    preloadedMeta?: SalesDataMeta | null
): Promise<{ data: DataRow[]; meta: SalesDataMeta } | null> {
    if (!user) return null;

    const salesDataRef = collection(db, 'users', user.uid, 'salesData');

    // 1. Read meta first — bỏ qua nếu caller đã có sẵn (vd vừa gọi getCloudDataMeta() để so sánh
    // thời điểm trước khi quyết định tải) để tránh 1 round-trip Firestore dư thừa trên critical path.
    let meta: SalesDataMeta;
    if (preloadedMeta) {
        meta = preloadedMeta;
    } else {
        const metaSnap = await getDoc(doc(salesDataRef, 'meta'));
        if (!metaSnap.exists()) return null;
        meta = metaSnap.data() as SalesDataMeta;
    }
    console.warn(`[CloudData] Found cloud data: ${meta.totalRows} rows in ${meta.chunkCount} chunks`);

    // 2. Download all chunks in parallel
    const chunkPromises: Promise<DataRow[]>[] = [];
    for (let i = 0; i < meta.chunkCount; i++) {
        chunkPromises.push(
            getDoc(doc(salesDataRef, `chunk_${i}`)).then(snap => {
                if (!snap.exists()) return [];
                return (snap.data().rows || []) as DataRow[];
            })
        );
    }

    const chunkResults = await Promise.all(chunkPromises);

    // 3. Merge chunks and restore Date objects
    const allRows: DataRow[] = [];
    for (const chunk of chunkResults) {
        for (const row of chunk) {
            // Restore parsedDate from ISO string back to Date object
            if (row.parsedDate && typeof row.parsedDate === 'string') {
                row.parsedDate = new Date(row.parsedDate);
            }
            allRows.push(row);
        }
    }

    console.warn(`[CloudData] Downloaded ${allRows.length} rows from cloud`);
    return { data: allRows, meta };
}

/**
 * Get only the metadata (without downloading full data).
 * Useful for checking if cloud data is newer than local.
 */
export async function getCloudDataMeta(user: User): Promise<SalesDataMeta | null> {
    if (!user) return null;
    const metaRef = doc(db, 'users', user.uid, 'salesData', 'meta');
    const snap = await getDoc(metaRef);
    if (!snap.exists()) return null;
    return snap.data() as SalesDataMeta;
}

/**
 * Delete all cloud sales data for the user.
 */
export async function deleteCloudSalesData(user: User): Promise<void> {
    if (!user) return;
    const salesDataRef = collection(db, 'users', user.uid, 'salesData');
    const snapshot = await getDocs(salesDataRef);
    
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.warn(`[CloudData] Deleted all cloud sales data`);
}
