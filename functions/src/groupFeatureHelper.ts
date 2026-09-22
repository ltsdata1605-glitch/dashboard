/**
 * Cấu hình bật/tắt tính năng bot THEO NHÓM LINE (tab "Giới Hạn Tính Năng" ở Dashboard).
 * Dữ liệu: line_bots/{uid}/group_features/{groupId} — do features/line-bot ghi từ client.
 * Chưa nhóm nào cấu hình thì mặc định BẬT hết để không đổi hành vi cũ.
 *
 * ⚠️ Trước 2026-09-22 file này CHƯA được webhook gọi: người dùng tắt tính năng trên Dashboard
 * mà bot vẫn trả lời (chủ dự án báo thật). Nay lineBotWebhook đọc cấu hình 1 lần cho mỗi
 * tin nhắn nhóm rồi chặn đúng nhánh tương ứng.
 */

import { db } from './firebaseAdmin';

export interface GroupFeatures {
    /** Lọc PMH khi chuyển tiếp danh sách + lệnh "csd". */
    filterCoupon: boolean;
    /** Cấp mã PMH: form xin PMH, lệnh e{n}/gv{n}, số trần. */
    issueCoupon: boolean;
    syntax_tk: boolean;
    syntax_cancel: boolean;
    /** Tra cứu mã (dán mã vào chat). */
    syntax_search: boolean;
    keywordReply: boolean;
    /** Tin nhắn tự động khác: hướng dẫn "hd", chào hỏi… */
    autoReply: boolean;
}

export type GroupFeatureKey = keyof GroupFeatures;

const DEFAULT_FEATURES: GroupFeatures = {
    filterCoupon: true,
    issueCoupon: true,
    syntax_tk: true,
    syntax_cancel: true,
    syntax_search: true,
    keywordReply: true,
    autoReply: true
};

/**
 * Cache theo tiến trình (60s): mỗi tin nhắn nhóm chỉ đọc Firestore 1 lần, và trong 60s kế
 * tiếp thì không đọc lại — nhóm đông tin nhắn nếu đọc mỗi lượt sẽ đốt hạn mức đọc
 * (xem CLAUDE.md mục 1.1 về hạn mức Firestore). Đổi cấu hình trên Dashboard có hiệu lực
 * chậm nhất sau 60 giây.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: GroupFeatures }>();

export async function getGroupFeatures(userId: string, groupId: string): Promise<GroupFeatures> {
    const key = `${userId}|${groupId}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    try {
        const snap = await db.collection('line_bots').doc(userId).collection('group_features').doc(groupId).get();
        const features = snap.exists ? (snap.data()?.features as Partial<GroupFeatures> | undefined) : undefined;
        const value = { ...DEFAULT_FEATURES, ...(features || {}) };
        cache.set(key, { at: Date.now(), value });
        return value;
    } catch (error) {
        console.warn(`[groupFeatureHelper] Lỗi đọc cấu hình nhóm ${groupId}:`, error);
        return DEFAULT_FEATURES;
    }
}

/** Chat 1-1 (không có groupId) không bị giới hạn. */
export async function isFeatureEnabled(userId: string, groupId: string | undefined, featureKey: GroupFeatureKey): Promise<boolean> {
    if (!groupId) return true;
    const features = await getGroupFeatures(userId, groupId);
    return features[featureKey] !== false;
}

/** Dùng trong test/khi cần ép đọc lại ngay sau khi người dùng đổi cấu hình. */
export function clearGroupFeatureCache(): void {
    cache.clear();
}
