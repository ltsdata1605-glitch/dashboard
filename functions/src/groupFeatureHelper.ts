/**
 * Cấu hình bật/tắt tính năng bot THEO NHÓM LINE (tab "Giới Hạn Tính Năng" ở Dashboard).
 * Dữ liệu: line_bots/{uid}/group_features/{groupId} — do features/line-bot ghi từ client.
 * Chưa nhóm nào cấu hình thì mặc định BẬT hết để không đổi hành vi cũ.
 */

import { db } from './firebaseAdmin';

export interface GroupFeatures {
    filterCoupon: boolean;
    syntax_tk: boolean;
    syntax_cancel: boolean;
    syntax_search: boolean;
    keywordReply: boolean;
    autoReply: boolean;
}

const DEFAULT_FEATURES: GroupFeatures = {
    filterCoupon: true,
    syntax_tk: true,
    syntax_cancel: true,
    syntax_search: true,
    keywordReply: true,
    autoReply: true
};

export async function getGroupFeatures(userId: string, groupId: string): Promise<GroupFeatures> {
    try {
        const snap = await db.collection('line_bots').doc(userId).collection('group_features').doc(groupId).get();
        const features = snap.exists ? (snap.data()?.features as Partial<GroupFeatures> | undefined) : undefined;
        return { ...DEFAULT_FEATURES, ...(features || {}) };
    } catch (error) {
        console.warn(`[groupFeatureHelper] Lỗi đọc cấu hình nhóm ${groupId}:`, error);
        return DEFAULT_FEATURES;
    }
}

/** Chat 1-1 (không có groupId) không bị giới hạn. */
export async function isFeatureEnabled(userId: string, groupId: string | undefined, featureKey: keyof GroupFeatures): Promise<boolean> {
    if (!groupId) return true;
    const features = await getGroupFeatures(userId, groupId);
    return features[featureKey] !== false;
}
