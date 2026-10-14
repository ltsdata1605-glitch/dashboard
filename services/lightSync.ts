import { doc, setDoc, runTransaction, FieldPath, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import { getSettingsMatching, saveSettingFromCloud } from './dbService';
import { isLightSyncKey } from '../utils/localDbScope';
import { cloudKeyTime, docToLightState, planLightSync, type LightCloudState } from './lightSyncPlan';

/**
 * Phần I/O của đồng bộ cấu hình nhẹ theo từng khoá — quy tắc nằm ở ./lightSyncPlan.ts (đọc comment đầu file đó).
 * Dùng chung bởi hooks/useCloudSync.ts (listener realtime + đẩy sau khi sửa) và hooks/useDataManagement.ts (lúc mở app).
 */

const configRef = (uid: string) => doc(db, 'users', uid, 'setting', 'configuration');
const LM = 'lastModified_';

// Bản Cloud listener vừa nhận — CHỈ để lọc trước: so với bản này mà không có khoá nào cần đẩy thì khỏi mở transaction
// (mốc trên Cloud chỉ tăng, nên "không mới hơn bản đã biết" ⇒ "không mới hơn bản thật"). Quyết định đẩy thật vẫn
// so trong transaction.
let banDaBiet: { uid: string; state: LightCloudState } | null = null;

/** Đọc doc cấu hình Cloud thành trạng thái so được theo từng khoá (và nhớ lại để lọc trước khi đẩy). */
export const rememberLightCloud = (uid: string, data: Parameters<typeof docToLightState>[0]): LightCloudState => {
    const state = docToLightState(data);
    banDaBiet = { uid, state };
    return state;
};

/** Mốc từng khoá cấu hình nhẹ trên máy + danh sách khoá đang có. */
export const readLocalLightTimes = async (): Promise<{ times: Record<string, number>; keys: string[] }> => {
    const raw = await getSettingsMatching(k => k.startsWith(LM) && isLightSyncKey(k.slice(LM.length)));
    const times: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number') times[k.slice(LM.length)] = v;
    return { times, keys: Object.keys(times) };
};

/** Lấy về các khoá Cloud mới hơn máy. Trả danh sách khoá đã lấy. */
export const pullNewerLightKeys = async (state: LightCloudState): Promise<string[]> => {
    const { times, keys } = await readLocalLightTimes();
    const { pull } = planLightSync(state, times, keys, isLightSyncKey);
    for (const k of pull) await saveSettingFromCloud(k, state.backup[k], cloudKeyTime(state, k));
    return pull;
};

/**
 * Đẩy lên CHỈ các khoá máy này mới hơn Cloud (mỗi khoá kèm mốc riêng) — không đụng khoá máy khác vừa sửa.
 * Chạy trong TRANSACTION: so với bản Cloud đọc ngay lúc ghi, không phải bản listener nhận trước đó — máy chưa kịp
 * nhận thay đổi của máy kia (mạng chậm/vừa mở lại) vẫn không đè được bản mới hơn (test: light-sync-hai-may).
 * Ghi theo đường dẫn field để THAY nguyên giá trị khoá (setDoc merge sẽ trộn object con, giữ lại field đã xoá).
 */
export const pushNewerLightKeys = async (user: User): Promise<string[]> => {
    const { times, keys } = await readLocalLightTimes();
    if (keys.length === 0) return [];
    if (banDaBiet?.uid === user.uid && planLightSync(banDaBiet.state, times, keys, isLightSyncKey).push.length === 0) return [];
    const ref = configRef(user.uid);
    const clean = (v: unknown) => JSON.parse(JSON.stringify(v === undefined ? null : v, (_k, x) => x === undefined ? null : x));
    let values: Record<string, unknown> = {};

    const pushed = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const state = docToLightState(snap.exists() ? snap.data() : null);
        const { push } = planLightSync(state, times, keys, isLightSyncKey);
        if (push.length === 0) return push;
        const pushSet = new Set(push);
        values = await getSettingsMatching(k => pushSet.has(k));
        if (snap.exists()) {
            const pairs: unknown[] = [];
            for (const k of push) {
                pairs.push(new FieldPath('settingsStoreBackup', k), clean(values[k]));
                pairs.push(new FieldPath('settingsMeta', k), times[k]);
            }
            (tx.update as (...a: unknown[]) => unknown)(ref, 'updatedAt', serverTimestamp(), ...pairs);
        } else {
            const backup: Record<string, unknown> = {};
            const meta: Record<string, number> = {};
            for (const k of push) { backup[k] = clean(values[k]); meta[k] = times[k]; }
            tx.set(ref, { settingsStoreBackup: backup, settingsMeta: meta, updatedAt: serverTimestamp() });
        }
        return push;
    });

    if (pushed.length && banDaBiet?.uid === user.uid) {
        for (const k of pushed) { banDaBiet.state.backup[k] = values[k]; banDaBiet.state.meta[k] = times[k]; }
    }
    if (pushed.length) {
        // Hồ sơ gốc users/{uid}: mốc đồng bộ gần nhất (giữ như syncToCloud cũ).
        setDoc(doc(db, 'users', user.uid), { email: user.email ?? null, displayName: user.displayName ?? null, lastSync: serverTimestamp() }, { merge: true })
            .catch(() => { /* không quan trọng */ });
    }
    return pushed;
};
