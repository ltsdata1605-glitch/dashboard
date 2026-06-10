import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAllSettings, mergeSettings } from './dbService';
import { isHeavySyncKey } from './firestoreService';

export const pullSettingsFromFirebase = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data.settings) {
                await mergeSettings(data.settings);
                console.log("[Sync] Đã tải cài đặt cấu hình từ Firebase xuống IndexedDB");
            }
        }
    } catch (e) {
        console.error("[Sync] Lỗi pull settings từ Firebase:", e);
    }
};

// Keys that are too large or unnecessary for cloud sync
const EXCLUDED_SYNC_KEYS = new Set([
    'productConfig',
    'departmentMap',
    'localSettingsLastModified',
    'topSellerAnalysisHistory',   // Contains Employee[] arrays — can be huge
    'customTabs',                 // Large contest table configs
    'headToHeadTables',           // Large table configs
    'customCalendars',            // Calendar data
    'crossSellingConfig',         // Can grow large
    'industryAnalysisCustomTabs', // Large analysis configs
]);

// Firestore max doc size is 1MB. We target 800KB to leave room for other document fields.
const MAX_SYNC_BYTES = 800 * 1024;

export const pushSettingsToFirebase = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const allSettings = await getAllSettings();
        
        // Lọc chỉ đồng bộ các cấu hình tĩnh, dung lượng nhẹ. KHÔNG ĐỒNG BỘ data lớn.
        const settingsToSync: Record<string, any> = {};
        for (const key of Object.keys(allSettings)) {
            if (
                !EXCLUDED_SYNC_KEYS.has(key) && 
                !key.startsWith('cached_') &&
                !key.startsWith('lastModified_') &&
                !key.startsWith('bi_') &&
                !isHeavySyncKey(key)
            ) {
                settingsToSync[key] = allSettings[key];
            }
        }

        // Safety: estimate size and trim if over limit without blocking the thread
        let jsonStr = JSON.stringify(settingsToSync);
        if (jsonStr.length > MAX_SYNC_BYTES) {
            console.warn(`[Sync] Settings too large (${(jsonStr.length / 1024).toFixed(0)}KB). Trimming largest keys...`);
            // Pre-calculate size contributions
            const entries = Object.entries(settingsToSync)
                .map(([k, v]) => ({ key: k, valueStr: JSON.stringify(v) }))
                .map(item => ({ key: item.key, size: item.valueStr.length + item.key.length + 4 }))
                .sort((a, b) => b.size - a.size);
            
            let currentSize = jsonStr.length;
            for (const entry of entries) {
                if (currentSize <= MAX_SYNC_BYTES) break;
                delete settingsToSync[entry.key];
                currentSize -= entry.size;
                console.warn(`[Sync] Removed key "${entry.key}" (${(entry.size / 1024).toFixed(1)}KB) to reduce sync size`);
            }
            jsonStr = JSON.stringify(settingsToSync); // stringify only once at the end
        }

        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { settings: settingsToSync }, { merge: true });
        console.log(`[Sync] Đã đồng bộ ngầm cài đặt lên Firebase (${(jsonStr.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
        console.error("[Sync] Lỗi push settings lên Firebase:", e);
    }
};

export const initSyncListeners = () => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    // Khi ẩn trình duyệt (đổi qua tab khác, thu nhỏ)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            pushSettingsToFirebase();
        }
    };
    
    // Fallback cho refresh/close tab
    const handleBeforeUnload = () => {
        pushSettingsToFirebase();
    };

    // Khi người dùng thay đổi setting (IndexedDB trigger event) -> debounced sync
    const handleSettingChanged = (e: any) => {
        const key = e.detail?.key;
        if (key && (EXCLUDED_SYNC_KEYS.has(key) || key.startsWith('cached_'))) return;
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            pushSettingsToFirebase();
        }, 30000); // Tự động sync sau 30s nếu có thay đổi mà ko thoát trình duyệt
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('ycx-setting-changed', handleSettingChanged);

    return () => {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('ycx-setting-changed', handleSettingChanged);
        clearTimeout(debounceTimer);
    };
};
