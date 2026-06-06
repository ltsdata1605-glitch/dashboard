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
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { DataRow } from '../types';

// Firestore document limit is 1MB. We target 800KB per chunk for safety.
const MAX_CHUNK_BYTES = 800 * 1024;

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
    updatedAt?: any;         // serverTimestamp
}

/**
 * Cleans a single DataRow for upload:
 * - Strips unnecessary fields
 * - Converts Date objects to ISO strings
 */
function cleanRow(row: DataRow): DataRow {
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
 */
function chunkData(data: DataRow[]): DataRow[][] {
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
    fileLastModified: number
): Promise<void> {
    if (!user || data.length === 0) return;

    console.log(`[CloudData] Starting upload: ${data.length} rows, file: ${filename}`);
    const startTime = Date.now();

    // 1. Clean and chunk data
    const cleanedData = data.map(cleanRow);
    const chunks = chunkData(cleanedData);

    console.log(`[CloudData] Split into ${chunks.length} chunks`);

    // 2. Upload all chunks in parallel using batched writes
    const salesDataRef = collection(db, 'users', user.uid, 'salesData');
    
    const uploadPromises = chunks.map((chunk, index) => {
        const chunkRef = doc(salesDataRef, `chunk_${index}`);
        return setDoc(chunkRef, { rows: chunk });
    });

    // 3. Upload meta document
    const meta: SalesDataMeta = {
        filename,
        savedAt: Date.now(),
        fileLastModified,
        totalRows: data.length,
        chunkCount: chunks.length,
        version: 1,
        uploadedFrom: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'laptop',
    };

    const metaRef = doc(salesDataRef, 'meta');
    uploadPromises.push(
        setDoc(metaRef, { ...meta, updatedAt: serverTimestamp() })
    );

    await Promise.all(uploadPromises);

    // 4. Clean up old chunks that are no longer needed
    //    (e.g., if previous upload had 5 chunks but this one only has 3)
    try {
        const snapshot = await getDocs(salesDataRef);
        const deletePromises: Promise<void>[] = [];
        snapshot.forEach(docSnap => {
            const id = docSnap.id;
            if (id.startsWith('chunk_')) {
                const chunkIndex = parseInt(id.replace('chunk_', ''), 10);
                if (chunkIndex >= chunks.length) {
                    deletePromises.push(deleteDoc(doc(salesDataRef, id)));
                }
            }
        });
        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log(`[CloudData] Cleaned up ${deletePromises.length} stale chunks`);
        }
    } catch (e) {
        console.warn('[CloudData] Failed to cleanup old chunks:', e);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CloudData] Upload complete in ${elapsed}ms (${chunks.length} chunks, ${data.length} rows)`);
}

/**
 * Download processed data from Firestore.
 * Returns null if no data exists on cloud.
 */
export async function downloadProcessedData(
    user: User
): Promise<{ data: DataRow[]; meta: SalesDataMeta } | null> {
    if (!user) return null;

    const salesDataRef = collection(db, 'users', user.uid, 'salesData');
    
    // 1. Read meta first
    const metaSnap = await getDoc(doc(salesDataRef, 'meta'));
    if (!metaSnap.exists()) return null;

    const meta = metaSnap.data() as SalesDataMeta;
    console.log(`[CloudData] Found cloud data: ${meta.totalRows} rows in ${meta.chunkCount} chunks`);

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

    console.log(`[CloudData] Downloaded ${allRows.length} rows from cloud`);
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
    console.log(`[CloudData] Deleted all cloud sales data`);
}
