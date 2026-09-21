/**
 * Helper function để check cấu hình tính năng cho Nhóm
 */

import { db } from './firebaseAdmin';
import { doc, getDoc } from 'firebase-admin/firestore';

export interface GroupFeatures {
    filterCoupon: boolean;
    syntax_tk: boolean;
    syntax_cancel: boolean;
    syntax_search: boolean;
    keywordReply: boolean;
    autoReply: boolean;
}

const defaultFeatures: GroupFeatures = {
    filterCoupon: true,
    syntax_tk: true,
    syntax_cancel: true,
    syntax_search: true,
    keywordReply: true,
    autoReply: true
};

/**
 * Lấy cấu hình tính năng cho Nhóm (mặc định: tất cả bật)
 */
export async function getGroupFeatures(userId: string, groupId: string): Promise<GroupFeatures> {
    try {
        const configRef = doc(db, 'line_bots', userId, 'group_features', groupId);
        const snap = await getDoc(configRef);
        if (snap.exists()) {
            const data = snap.data();
            return data.features || defaultFeatures;
        }
    } catch (error) {
        console.warn(`[groupFeatureHelper] Lỗi lấy config cho nhóm ${groupId}:`, error);
    }
    return defaultFeatures;
}

/**
 * Check xem tính năng có được bật cho Nhóm không
 */
export async function isFeatureEnabled(
    userId: string,
    groupId: string | undefined,
    featureKey: keyof GroupFeatures
): Promise<boolean> {
    // Nếu không phải Nhóm (1-on-1), cho phép tất cả
    if (!groupId) return true;
    
    const features = await getGroupFeatures(userId, groupId);
    return features[featureKey] !== false;
}
