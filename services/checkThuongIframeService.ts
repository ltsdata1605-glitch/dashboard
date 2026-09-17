/**
 * Helper service to write check-thuong state directly into the iframe's IndexedDB 'keyval-store' 
 * from the parent context (since they share the same origin).
 */
export function saveCheckThuongDataToIframeDb(value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open('keyval-store', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('keyval');
            };
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('keyval', 'readwrite');
                const store = tx.objectStore('keyval');
                store.put(value, 'checkthuong_data');
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    db.close();
                    reject(tx.error || new Error('Transaction failed'));
                };
            };
            request.onerror = () => reject(request.error || new Error('Failed to open DB'));
        } catch (e) {
            reject(e);
        }
    });
}

export function getCheckThuongDataFromIframeDb(): Promise<any> {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open('keyval-store', 1);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('keyval')) {
                    db.close();
                    resolve(null);
                    return;
                }
                const tx = db.transaction('keyval', 'readonly');
                const store = tx.objectStore('keyval');
                const getReq = store.get('checkthuong_data');
                getReq.onsuccess = () => {
                    db.close();
                    resolve(getReq.result || null);
                };
                getReq.onerror = () => {
                    db.close();
                    resolve(null);
                };
            };
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

