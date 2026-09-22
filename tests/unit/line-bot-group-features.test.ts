import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Giới hạn tính năng theo nhóm LINE (tab "Giới Hạn Tính Năng").
 * Trước 2026-09-22 webhook KHÔNG đọc cấu hình này — tắt trên Dashboard mà bot vẫn trả lời
 * (chủ dự án báo thật). Test khoá 3 điểm: mặc định BẬT hết, đọc đúng cờ đã tắt, và CACHE
 * (nhiều tin nhắn liên tiếp chỉ tốn 1 lượt đọc Firestore).
 */
const state = { doc: undefined as Record<string, unknown> | undefined, reads: 0 };

vi.mock('../../functions/src/firebaseAdmin', () => ({
    db: {
        collection: () => ({
            doc: () => ({
                collection: () => ({
                    doc: () => ({
                        get: async () => {
                            state.reads++;
                            return { exists: state.doc !== undefined, data: () => state.doc };
                        },
                    }),
                }),
            }),
        }),
    },
}));

const { getGroupFeatures, isFeatureEnabled, clearGroupFeatureCache } = await import('../../functions/src/groupFeatureHelper');

beforeEach(() => {
    state.doc = undefined;
    state.reads = 0;
    clearGroupFeatureCache();
});

describe('getGroupFeatures', () => {
    it('nhóm chưa cấu hình -> BẬT hết (giữ hành vi cũ)', async () => {
        const f = await getGroupFeatures('uid1', 'G1');
        expect(f).toEqual({
            filterCoupon: true, issueCoupon: true, syntax_tk: true, syntax_cancel: true,
            syntax_search: true, keywordReply: true, autoReply: true,
        });
    });

    it('đọc đúng cờ đã tắt, khoá thiếu thì mặc định BẬT', async () => {
        state.doc = { features: { filterCoupon: false, syntax_tk: false, issueCoupon: false } };
        const f = await getGroupFeatures('uid1', 'G1');
        expect(f.filterCoupon).toBe(false);
        expect(f.syntax_tk).toBe(false);
        expect(f.issueCoupon).toBe(false);
        expect(f.keywordReply).toBe(true);
        expect(f.autoReply).toBe(true);
    });

    it('cache: 5 tin nhắn liên tiếp chỉ tốn 1 lượt đọc Firestore', async () => {
        state.doc = { features: { syntax_tk: false } };
        for (let i = 0; i < 5; i++) await getGroupFeatures('uid1', 'G1');
        expect(state.reads).toBe(1);
        clearGroupFeatureCache();
        await getGroupFeatures('uid1', 'G1');
        expect(state.reads).toBe(2);
    });

    it('nhóm khác nhau có cache riêng', async () => {
        await getGroupFeatures('uid1', 'G1');
        await getGroupFeatures('uid1', 'G2');
        expect(state.reads).toBe(2);
    });
});

describe('isFeatureEnabled', () => {
    it('chat 1-1 (không groupId) không bị giới hạn, không tốn lượt đọc', async () => {
        state.doc = { features: { syntax_tk: false } };
        expect(await isFeatureEnabled('uid1', undefined, 'syntax_tk')).toBe(true);
        expect(state.reads).toBe(0);
    });
    it('trong nhóm: trả đúng trạng thái đã cấu hình', async () => {
        state.doc = { features: { issueCoupon: false } };
        expect(await isFeatureEnabled('uid1', 'G1', 'issueCoupon')).toBe(false);
        expect(await isFeatureEnabled('uid1', 'G1', 'syntax_cancel')).toBe(true);
    });
});
