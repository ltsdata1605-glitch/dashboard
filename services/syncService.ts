import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getSettingsMatching } from './dbService';
import { isHeavySyncKey } from './firestoreService';
import { isLightSyncKey, isLocalOnlyKey } from '../utils/localDbScope';

// Đọc thẳng sessionStorage (không qua React Context) — module thuần, không phải hook. Đây là
// nguồn chân lý duy nhất cho Demo Mode (xem contexts/AuthContext.tsx isDemoMode/setDemoMode).
// BUG FIX: initSyncListeners() trước đây không hề kiểm tra Demo Mode (khác hooks/useCloudSync.ts
// đã gate rõ ràng `!user || isDemoMode`) — auth.currentUser vẫn là tài khoản THẬT khi bật Demo
// Mode (chỉ userRole/status bị che), nên sửa setting lúc xem Demo Mode vẫn bị đẩy lên Firestore
// tài khoản thật.
const isDemoModeActive = (): boolean =>
    typeof window !== 'undefined' && (sessionStorage.getItem('ycx_demo_mode') === 'true' || localStorage.getItem('ycx_demo_mode') === 'true');

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
    'analysis-employees-list',    // Heavy sync key - synced separately to configs/{key}
]);

/**
 * Đường đồng bộ CŨ (users/{uid}.settings) — từ 2026-10-14 CHỈ còn lo các khoá mà đường mới KHÔNG quản:
 * khoá cấu hình nhẹ → services/lightSync.ts (mới nhất thắng theo từng khoá), khoá nặng → configs/{key}.
 * Trước đây đường này đẩy MỌI cài đặt mỗi lần ẩn app và lúc đăng nhập ghi đè NGUYÊN bộ xuống máy, không mốc thời gian
 * — máy nào ẩn app sau cùng "thắng" dù dữ liệu cũ hơn, và còn chép cả trạng thái riêng từng máy (tab đang mở, chế độ
 * xem…) sang máy khác (đo thật bằng tests/e2e/dong-bo-hai-may-du-lieu-that.spec.ts).
 */
export const laKhoaDongBoCu = (key: string): boolean =>
    !EXCLUDED_SYNC_KEYS.has(key) &&
    !key.startsWith('cached_') &&
    !key.startsWith('lastModified_') &&
    !key.startsWith('bi_') &&
    !key.startsWith('khoDataCache_') &&
    !key.startsWith('khoDataAppliedSnapshot::') &&
    !isHeavySyncKey(key) &&
    !isLightSyncKey(key) &&
    !isLocalOnlyKey(key);

/** Lọc bản `settings` tải từ Cloud: chỉ giữ khoá đường cũ còn quản (xem laKhoaDongBoCu). */
export const locCaiDatDongBoCu = (settings: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(settings).filter(([k]) => laKhoaDongBoCu(k)));

let lanDayCuoi = '';

// Firestore max doc size is 1MB. We target 800KB to leave room for other document fields.
const MAX_SYNC_BYTES = 800 * 1024;

export const pushSettingsToFirebase = async () => {
    const user = auth.currentUser;
    if (!user || isDemoModeActive()) return;
    try {
        // Lọc chỉ đồng bộ các cấu hình tĩnh, dung lượng nhẹ. KHÔNG ĐỒNG BỘ data lớn.
        // PERF FIX (2026-10-07): lọc theo TÊN khoá trước khi đọc giá trị — bản cũ getAllSettings() nạp và
        // JSON.stringify cả khoDataCache_* (dữ liệu Kho hàng MB, lọt bộ lọc) rồi mới cắt vì quá 800KB:
        // đứng hình ~6s + giữ kho settings lúc mở app trên điện thoại. 2 tiền tố Kho là cache riêng máy.
        const settingsToSync = await getSettingsMatching(laKhoaDongBoCu);
        if (Object.keys(settingsToSync).length === 0) return;

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

        if (jsonStr === lanDayCuoi) return; // không đổi gì kể từ lần đẩy trước — khỏi ghi
        const userRef = doc(db, 'users', user.uid);
        // Lọc bỏ các giá trị undefined đệ quy thành null trước khi lưu lên Firestore
        const cleanSettings = JSON.parse(JSON.stringify(settingsToSync, (k, v) => v === undefined ? null : v));
        await setDoc(userRef, { settings: cleanSettings }, { merge: true });
        lanDayCuoi = jsonStr;
        console.warn(`[Sync] Đã đồng bộ ngầm cài đặt lên Firebase (${(jsonStr.length / 1024).toFixed(0)}KB)`);
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
    const handleSettingChanged = (e: CustomEvent<{ key: string; source?: string }>) => {
        const key = e.detail?.key;
        if (!key || !laKhoaDongBoCu(key)) return;
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            pushSettingsToFirebase();
        }, 2000); // Tự động sync ngầm lên Firebase sau 2s khi có thay đổi
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('ycx-setting-changed', handleSettingChanged as EventListener);

    return () => {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('ycx-setting-changed', handleSettingChanged as EventListener);
        clearTimeout(debounceTimer);
    };
};
