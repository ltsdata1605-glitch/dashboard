import type { DataRow, StoredSalesData, UploadedFileRegistryItem } from '../../types';
import { getDb, getSetting, saveSetting, APP_STORE, resetDbConnection } from './core';

// --- Sales Data ---
export async function saveSyncCloudData(
    data: DataRow[],
    filename: string,
    savedAt: number,
    fileLastModified: number
): Promise<void> {
    try {
        // 1. Clear all existing sales files & registry
        await clearAllSalesFiles();

        // 2. Save this sync file's data
        const syncId = 'cloud_sync_' + savedAt;
        await saveSalesFileData(syncId, data);

        // 3. Add to files registry
        const item: UploadedFileRegistryItem = {
            id: syncId,
            filename,
            rowCount: data.length,
            savedAt,             // Use the cloud savedAt
            fileLastModified,    // Use the cloud fileLastModified
            isActive: true
        };
        await saveSalesFilesRegistry([item]);
    } catch (error) {
        console.error('[IDB] saveSyncCloudData failed:', error);
        throw error;
    }
}

export async function saveSyncCloudRealtimeData(
    data: DataRow[],
    filename: string,
    savedAt: number,
    fileLastModified: number
): Promise<void> {
    try {
        // 1. Clear all existing sales files & registry
        await clearAllSalesFiles();

        // 2. Save this sync file's data as temporary realtime data
        const stored: StoredSalesData = {
            data,
            filename,
            savedAt: new Date(savedAt),
            fileLastModified
        };
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(APP_STORE, 'readwrite');
            tx.objectStore(APP_STORE).put(JSON.stringify(stored), 'tempRealtimeData');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('[IDB] saveSyncCloudRealtimeData failed:', error);
        throw error;
    }
}

export async function saveSalesData(data: DataRow[], filename: string, fileLastModified?: number): Promise<void> {
    const stored: StoredSalesData = { data, filename, savedAt: new Date(), fileLastModified };
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] saveSalesData timeout');
                    reject(new Error('Transaction timeout'));
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                const store = tx.objectStore(APP_STORE).put(JSON.stringify(stored), 'salesData');
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Save sales data transaction failed'));
                    }
                };
            } catch (error) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }
        });
    };

    try {
        const db = await getDb();
        await tryTransaction(db);
    } catch (error) {
        console.warn('[IDB] Retry saveSalesData after error:', (error as Error)?.message);
        resetDbConnection();
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error('[IDB] Permanent failure saving sales data:', retryError);
        }
    }
}

export async function getSalesData(): Promise<StoredSalesData | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] getSalesData timeout');
                    resolve(null);
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const store = tx.objectStore(APP_STORE);
                const request = store.get('salesData');
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        let res = request.result;
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch(e) { console.error('Failed to parse salesData', e); }
                        }
                        resolve(res || null);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error('[IDB] getSalesData request error:', request.error);
                        resolve(null);
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error('[IDB] getSalesData transaction error:', tx.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    console.error('[IDB] getSalesData synchronous error:', err);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error('[IDB] getSalesData failed to get DB:', error);
        return null;
    }
}

export async function clearSalesData(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] clearSalesData timeout');
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).delete('salesData');
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearSalesData failed:', e);
    }
}

// --- Historical Multi-File Registry & Data management ---

export async function getSalesFilesRegistry(): Promise<UploadedFileRegistryItem[]> {
    const registry = await getSetting<UploadedFileRegistryItem[]>('salesFilesRegistry');
    return registry || [];
}

export async function saveSalesFilesRegistry(registry: UploadedFileRegistryItem[]): Promise<void> {
    await saveSetting('salesFilesRegistry', registry);
}

export async function saveSalesFileData(fileId: string, data: DataRow[]): Promise<void> {
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] saveSalesFileData timeout for ${fileId}`);
                    reject(new Error('Transaction timeout'));
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                const dataToSave = typeof data === 'string' ? data : JSON.stringify(data);
                tx.objectStore(APP_STORE).put(dataToSave, 'salesData_' + fileId);
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Save file data transaction failed'));
                    }
                };
            } catch (error) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }
        });
    };

    try {
        const db = await getDb();
        await tryTransaction(db);
    } catch (error) {
        console.warn(`[IDB] Retry saveSalesFileData for ${fileId} after error:`, (error as Error)?.message);
        resetDbConnection();
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error(`[IDB] Permanent failure saving sales file data for ${fileId}:`, retryError);
            throw retryError;
        }
    }
}

export async function getSalesFileData(fileId: string): Promise<DataRow[] | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] getSalesFileData timeout for ${fileId}`);
                    resolve(null);
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const request = tx.objectStore(APP_STORE).get('salesData_' + fileId);
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        let res = request.result;
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch(e) { console.error('Failed to parse file data', e); }
                        }
                        resolve(res || null);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error(`[IDB] getSalesFileData error for ${fileId}:`, request.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error(`[IDB] getSalesFileData failed to get DB for ${fileId}:`, error);
        return null;
    }
}

export async function checkSalesFileDataExists(fileId: string): Promise<boolean> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve(false);
                }
            }, 5000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const store = tx.objectStore(APP_STORE);
                const request = store.getKey('salesData_' + fileId);
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(request.result !== undefined);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(false);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve(false);
                }
            }
        });
    } catch (error) {
        return false;
    }
}

export async function deleteSalesFileData(fileId: string): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).delete('salesData_' + fileId);
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error(`[IDB] deleteSalesFileData failed for ${fileId}:`, e);
    }
}

export async function clearAllSalesFiles(): Promise<void> {
    try {
        const registry = await getSalesFilesRegistry();
        for (const file of registry) {
            await deleteSalesFileData(file.id);
        }
        await saveSalesFilesRegistry([]);
        await clearSalesData();
        await clearTempRealtimeData();
    } catch (e) {
        console.error('[IDB] clearAllSalesFiles failed:', e);
    }
}

// --- Temporary Realtime File Data ---

export async function saveTempRealtimeData(data: DataRow[], filename: string, fileLastModified?: number): Promise<void> {
    const stored: StoredSalesData = { data, filename, savedAt: new Date(), fileLastModified };
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] saveTempRealtimeData timeout');
                    reject(new Error('Transaction timeout'));
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).put(JSON.stringify(stored), 'tempRealtimeData');
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Save temp realtime data transaction failed'));
                    }
                };
            } catch (error) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }
        });
    };

    try {
        const db = await getDb();
        await tryTransaction(db);
    } catch (error) {
        console.warn('[IDB] Retry saveTempRealtimeData after error:', (error as Error)?.message);
        resetDbConnection();
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error('[IDB] Permanent failure saving temp realtime data:', retryError);
            throw retryError;
        }
    }
}

export async function getTempRealtimeData(): Promise<StoredSalesData | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] getTempRealtimeData timeout');
                    resolve(null);
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const store = tx.objectStore(APP_STORE);
                const request = store.get('tempRealtimeData');
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        let res = request.result;
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch(e) { console.error('Failed to parse tempRealtimeData', e); }
                        }
                        resolve(res || null);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error('[IDB] getTempRealtimeData request error:', request.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error('[IDB] getTempRealtimeData failed:', error);
        return null;
    }
}

export async function clearTempRealtimeData(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] clearTempRealtimeData timeout');
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).delete('tempRealtimeData');
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearTempRealtimeData failed:', e);
    }
}

// Số tháng dữ liệu lịch sử tự động giữ ở trạng thái isActive khi gộp. Tính năng
// "so sánh cùng kỳ năm trước" (useSummaryComparison.ts) cần tới 12 tháng lùi lại —
// 14 tháng chừa biên độ an toàn. File cũ hơn KHÔNG bị xoá, chỉ tự untick (isActive:
// false) — người dùng vẫn tự bật lại được bất cứ lúc nào qua FileHistoryManager.
const RETENTION_MONTHS = 14;

// Ưu tiên ngày dữ liệu thực trong file (maxDate, trích từ cột ngày bán lúc upload).
// Registry cũ tạo trước khi có tính năng này có thể chưa có maxDate — fallback về
// savedAt (ngày bấm upload) làm proxy gần đúng, thay vì coi là "không bao giờ hết hạn"
// (sẽ vô hiệu hoá mục đích giới hạn cho đúng các file thực sự cũ).
function isFileWithinRetention(file: UploadedFileRegistryItem, cutoffTime: number): boolean {
    const referenceTime = file.maxDate ?? file.savedAt;
    return referenceTime >= cutoffTime;
}

async function pruneStaleActiveFiles(registry: UploadedFileRegistryItem[]): Promise<UploadedFileRegistryItem[]> {
    const cutoffTime = Date.now() - RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000;

    // An toàn: nếu việc prune sẽ tắt HẾT toàn bộ file đang active (vd. user không mở app
    // suốt hơn 14 tháng), bỏ qua đợt prune này thay vì để dashboard trống trơn không rõ
    // lý do — thà chậm hơn 1 lần còn hơn trông như mất dữ liệu.
    const activeFiles = registry.filter(f => f.isActive);
    if (activeFiles.length > 0 && activeFiles.every(f => !isFileWithinRetention(f, cutoffTime))) {
        return registry;
    }

    let changed = false;
    const pruned = registry.map(f => {
        if (f.isActive && !isFileWithinRetention(f, cutoffTime)) {
            changed = true;
            return { ...f, isActive: false };
        }
        return f;
    });
    if (changed) {
        await saveSalesFilesRegistry(pruned);
    }
    return pruned;
}

export async function getMergedSalesData(): Promise<{ data: DataRow[]; filename: string; savedAt: Date; fileLastModified?: number; isRealtime?: boolean } | null> {
    try {
        const rawRegistry = await getSalesFilesRegistry();
        const registry = await pruneStaleActiveFiles(rawRegistry);
        let activeFiles = registry.filter(f => f.isActive);

        // MIGRATION: Nếu registry trống, kiểm tra xem có dữ liệu đơn lẻ 'salesData' cũ không
        if (registry.length === 0) {
            const legacySales = await getSalesData();
            if (legacySales && legacySales.data.length > 0) {
                console.warn('[IDB Migration] Chuyển đổi dữ liệu cũ sang cấu trúc đa tệp lịch sử...');
                const legacyId = 'legacy_file_' + Date.now();
                const legacyItem: UploadedFileRegistryItem = {
                    id: legacyId,
                    filename: legacySales.filename || 'Dữ liệu lịch sử cũ',
                    rowCount: legacySales.data.length,
                    savedAt: legacySales.savedAt ? new Date(legacySales.savedAt).getTime() : Date.now(),
                    fileLastModified: legacySales.fileLastModified || Date.now(),
                    isActive: true
                };

                await saveSalesFilesRegistry([legacyItem]);
                await saveSalesFileData(legacyId, legacySales.data);
                await clearSalesData(); // Xóa khóa cũ để tránh nhập nhằng
                activeFiles = [legacyItem];
            }
        }

        // Load active historical files data
        const historicalData: DataRow[] = [];
        let latestHistSavedAt = 0;
        let maxHistFileLastModified = 0;

        const fileDataArray = await Promise.all(activeFiles.map(file => getSalesFileData(file.id)));
        for (let i = 0; i < activeFiles.length; i++) {
            const file = activeFiles[i];
            const fileData = fileDataArray[i];
            if (fileData && fileData.length > 0) {
                for (let j = 0; j < fileData.length; j++) {
                    const row = fileData[j];
                    row._fileLastModified = file.fileLastModified || file.savedAt;
                    row._fileSavedAt = file.savedAt;
                    row._sourceFileId = file.id;
                    row._sourceFilename = file.filename;
                    historicalData.push(row);
                }
            }
            if (file.savedAt > latestHistSavedAt) {
                latestHistSavedAt = file.savedAt;
            }
            if (file.fileLastModified && file.fileLastModified > maxHistFileLastModified) {
                maxHistFileLastModified = file.fileLastModified;
            }
        }

        // If there are active historical files but no local file data (e.g. new browser sync),
        // fallback to legacy salesData store which holds the cloud sync data.
        if (activeFiles.length > 0 && historicalData.length === 0) {
            const legacySales = await getSalesData();
            if (legacySales && legacySales.data.length > 0) {
                for (let j = 0; j < legacySales.data.length; j++) {
                    const row = legacySales.data[j];
                    row._fileLastModified = legacySales.fileLastModified || (legacySales.savedAt ? new Date(legacySales.savedAt).getTime() : Date.now());
                    row._fileSavedAt = legacySales.savedAt ? new Date(legacySales.savedAt).getTime() : Date.now();
                    row._sourceFileId = 'legacy';
                    row._sourceFilename = legacySales.filename || 'Dữ liệu lịch sử cũ';
                    historicalData.push(row);
                }
                latestHistSavedAt = legacySales.savedAt ? new Date(legacySales.savedAt).getTime() : latestHistSavedAt;
                maxHistFileLastModified = legacySales.fileLastModified || maxHistFileLastModified;
            }
        }

        // Load temporary realtime data
        const tempRealtime = await getTempRealtimeData();

        // Merge datasets
        const combinedData: DataRow[] = [];
        let finalFilename = '';
        let finalSavedAt = new Date();
        let finalFileLastModified = 0;
        let isRealtime = false;

        if (tempRealtime && tempRealtime.data.length > 0) {
            for (let j = 0; j < tempRealtime.data.length; j++) {
                const row = tempRealtime.data[j];
                row._fileLastModified = tempRealtime.fileLastModified || (tempRealtime.savedAt ? new Date(tempRealtime.savedAt).getTime() : Date.now());
                row._fileSavedAt = tempRealtime.savedAt ? new Date(tempRealtime.savedAt).getTime() : Date.now();
                row._sourceFileId = 'realtime';
                row._sourceFilename = tempRealtime.filename;
                combinedData.push(row);
            }
            if (historicalData.length > 0) {
                for (let j = 0; j < historicalData.length; j++) {
                    combinedData.push(historicalData[j]);
                }

                // Filename gộp
                const baseRealtimeName = tempRealtime.filename.replace(/\.[^/.]+$/, '');
                finalFilename = `${baseRealtimeName} + Gộp ${activeFiles.length} tệp lịch sử`;
                if (finalFilename.length > 85) {
                    finalFilename = `${baseRealtimeName} + Gộp ${activeFiles.length} tệp...`;
                }

                // Timestamps
                const realtimeSavedAt = tempRealtime.savedAt ? new Date(tempRealtime.savedAt).getTime() : Date.now();
                finalSavedAt = new Date(Math.max(realtimeSavedAt, latestHistSavedAt));
                finalFileLastModified = Math.max(tempRealtime.fileLastModified || realtimeSavedAt, maxHistFileLastModified);
                isRealtime = false;
            } else {
                finalFilename = tempRealtime.filename;
                finalSavedAt = tempRealtime.savedAt ? new Date(tempRealtime.savedAt) : new Date();
                finalFileLastModified = tempRealtime.fileLastModified || finalSavedAt.getTime();
                isRealtime = true;
            }
        } else if (historicalData.length > 0) {
            for (let j = 0; j < historicalData.length; j++) {
                combinedData.push(historicalData[j]);
            }

            if (activeFiles.length === 1) {
                finalFilename = activeFiles[0].filename;
            } else {
                const fileNames = activeFiles.map(f => f.filename.replace(/\.[^/.]+$/, ''));
                finalFilename = `Gộp ${activeFiles.length} Báo cáo (${fileNames.join(', ')})`;
                if (finalFilename.length > 85) {
                    finalFilename = `Gộp ${activeFiles.length} Báo cáo (${fileNames.slice(0, 2).join(', ')}...)`;
                }
            }
            finalSavedAt = new Date(latestHistSavedAt);
            finalFileLastModified = maxHistFileLastModified || latestHistSavedAt;
            isRealtime = false;
        } else {
            return null; // Không có tệp nào hoạt động
        }

        return {
            data: combinedData,
            filename: finalFilename,
            savedAt: finalSavedAt,
            fileLastModified: finalFileLastModified,
            isRealtime
        };
    } catch (error) {
        console.error('[IDB] getMergedSalesData failed:', error);
        return null;
    }
}
