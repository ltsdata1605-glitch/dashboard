import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAllSettings, mergeSettings } from './dbService';

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

export const pushSettingsToFirebase = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const allSettings = await getAllSettings();
        
        // Lọc chỉ đồng bộ các cấu hình tĩnh, dung lượng nhẹ. KHÔNG ĐỒNG BỘ data lớn (như productConfig, departmentMap).
        const settingsToSync: Record<string, any> = {};
        for (const key of Object.keys(allSettings)) {
            // Loại bỏ các key không cần thiết hoặc quá lớn
            if (key !== 'productConfig' && key !== 'departmentMap' && !key.startsWith('cached_') && key !== 'localSettingsLastModified') {
                settingsToSync[key] = allSettings[key];
            }
        }

        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { settings: settingsToSync }, { merge: true });
        console.log("[Sync] Đã đồng bộ ngầm cài đặt lên Firebase");
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
        if (key && (key === 'productConfig' || key === 'departmentMap' || key.startsWith('cached_'))) return;
        
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
