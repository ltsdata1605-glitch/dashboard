/**
 * Đồng bộ cấu hình NHẸ giữa các thiết bị — "mới nhất thắng" theo TỪNG khoá (2026-10-14).
 *
 * Doc Cloud `users/{uid}/setting/configuration`:
 *  - `settingsStoreBackup.<khoá>` = giá trị
 *  - `settingsMeta.<khoá>`        = mốc ms lúc khoá đó được sửa (đồng hồ của máy đã sửa)
 *  - `updatedAt`                  = mốc server lần ghi gần nhất (doc cũ chưa có `settingsMeta` dùng mốc này cho mọi khoá)
 *
 * VÌ SAO (lỗi thật trước bản này): mỗi máy đẩy NGUYÊN bộ `settingsStoreBackup` và so 1 mốc chung cho cả bộ.
 * Máy A sửa khoá X lúc 9:00, máy B sửa khoá Y lúc 9:05 → B đẩy cả bộ, trong đó X là bản CŨ của B → thay đổi của A
 * mất. Listener còn bỏ qua cả lượt cập nhật khi máy đang có thay đổi chờ đẩy → không bao giờ nhận lại.
 *
 * Hàm thuần — test ở tests/unit/light-sync-plan.test.ts.
 */

export interface LightCloudState {
    backup: Record<string, unknown>;
    meta: Record<string, number>;
    /** ms; 0 khi không rõ. */
    updatedAt: number;
}

type DocLike = {
    settingsStoreBackup?: unknown;
    settingsMeta?: unknown;
    updatedAt?: { toMillis?: () => number } | number | null;
} | null | undefined;

export const docToLightState = (data: DocLike): LightCloudState => {
    const u = data?.updatedAt;
    const updatedAt = typeof u === 'number' ? u : (u && typeof u.toMillis === 'function' ? u.toMillis() : 0);
    const backup = (data?.settingsStoreBackup && typeof data.settingsStoreBackup === 'object')
        ? data.settingsStoreBackup as Record<string, unknown> : {};
    const meta: Record<string, number> = {};
    if (data?.settingsMeta && typeof data.settingsMeta === 'object') {
        for (const [k, v] of Object.entries(data.settingsMeta as Record<string, unknown>)) {
            if (typeof v === 'number' && Number.isFinite(v)) meta[k] = v;
        }
    }
    return { backup, meta, updatedAt };
};

/** Mốc của 1 khoá trên Cloud: mốc riêng nếu có; doc cũ (chưa có mốc riêng) → mốc cả doc; khoá không có trên Cloud → 0. */
export const cloudKeyTime = (s: LightCloudState, key: string): number => {
    if (typeof s.meta[key] === 'number') return s.meta[key];
    return Object.prototype.hasOwnProperty.call(s.backup, key) ? s.updatedAt : 0;
};

export interface LightSyncPlan {
    /** Khoá Cloud mới hơn máy → lấy về. */
    pull: string[];
    /** Khoá máy mới hơn Cloud → đẩy lên (CHỈ những khoá này, không đẩy cả bộ). */
    push: string[];
}

/**
 * @param localTimes mốc `lastModified_<khoá>` trên máy (khoá thiếu = 0)
 * @param localKeys  các khoá cấu hình nhẹ đang có trên máy
 * @param isLightKey bộ lọc khoá cấu hình nhẹ (utils/localDbScope.ts → isLightSyncKey)
 */
export const planLightSync = (
    cloud: LightCloudState,
    localTimes: Record<string, number>,
    localKeys: string[],
    isLightKey: (k: string) => boolean,
): LightSyncPlan => {
    const pull: string[] = [];
    const push: string[] = [];
    for (const k of Object.keys(cloud.backup)) {
        if (!isLightKey(k)) continue;
        if (cloudKeyTime(cloud, k) > (localTimes[k] || 0)) pull.push(k);
    }
    for (const k of localKeys) {
        if (!isLightKey(k)) continue;
        const t = localTimes[k] || 0;
        if (t > 0 && t > cloudKeyTime(cloud, k)) push.push(k);
    }
    return { pull, push };
};
