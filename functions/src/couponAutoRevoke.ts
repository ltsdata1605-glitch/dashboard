/**
 * Module xử lý Tự Động Hoàn Kho Sau Thời Gian Chờ (30 phút)
 * 
 * Nghiệp vụ: Khi bot phát mã coupon ra nhóm (trạng thái SENT), nếu sau 30 phút nhân viên
 * chưa bấm "Chạm để copy" (mã chưa chuyển sang USED), bot sẽ tự động thu hồi mã về lại kho UNUSED
 * và gửi thông báo nhẹ vào nhóm chat: "Mã đã tự động hoàn kho do chưa được sao chép sử dụng".
 */

import { db } from './firebaseAdmin';
import { botsWithSecrets } from './lineBotSecrets';

/** Thời gian chờ mặc định: 30 phút (tính bằng mili-giây) */
export const DEFAULT_REVOKE_TIMEOUT_MS = 30 * 60 * 1000;

export interface CouponDocData {
    code?: string;
    productName?: string;
    type?: string;
    category?: string;
    status?: string;
    sentAt?: string;
    updatedAt?: string;
    chatId?: string;
    orderId?: string;
    recipient?: string;
    recipientId?: string;
    cardIndex?: number;
    [key: string]: any;
}

/**
 * Kiểm tra xem một mã coupon có phải là mã treo quá 30 phút chưa được sao chép không
 */
export function isCouponStale(
    couponData: CouponDocData,
    nowMs: number = Date.now(),
    timeoutMs: number = DEFAULT_REVOKE_TIMEOUT_MS
): boolean {
    if (couponData.status !== 'SENT') return false;
    const timeStr = couponData.sentAt || couponData.updatedAt;
    if (!timeStr) return false;
    const sentTime = new Date(timeStr).getTime();
    if (isNaN(sentTime) || sentTime <= 0) return false;
    return (nowMs - sentTime) >= timeoutMs;
}

/**
 * Tạo nội dung thông báo nhẹ nhàng gửi vào nhóm chat khi mã được hoàn kho
 */
export function formatRevokeNotification(coupons: CouponDocData[]): string {
    if (!coupons || coupons.length === 0) return '';
    if (coupons.length === 1) {
        const c = coupons[0];
        const pName = c.productName || c.type || 'PMH';
        return `ℹ️ Mã [${pName}] đã tự động hoàn kho do chưa được sao chép sử dụng.`;
    }
    const names = Array.from(new Set(coupons.map(c => c.productName || c.type || 'PMH'))).join(', ');
    return `ℹ️ Các mã [${names}] đã tự động hoàn kho do chưa được sao chép sử dụng.`;
}

/**
 * Gửi tin nhắn PUSH trực tiếp tới nhóm LINE / đoạn chat nhận mã
 */
export async function pushLineSimpleText(token: string, chatId: string, text: string): Promise<boolean> {
    if (!token || !chatId || !text) return false;
    try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                to: chatId,
                messages: [{ type: 'text', text }]
            })
        });
        if (!res.ok) {
            console.warn('[pushLineSimpleText] Gửi push thất bại, HTTP:', res.status);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[pushLineSimpleText] Ngoại lệ khi gửi push:', e);
        return false;
    }
}

export interface AutoRevokeOptions {
    nowMs?: number;
    timeoutMs?: number;
    pushFn?: (token: string, chatId: string, text: string) => Promise<boolean>;
}

/**
 * Quét và thu hồi các mã coupon ở trạng thái SENT quá thời gian chờ (30 phút) của 1 bot cụ thể
 */
export async function autoRevokeStaleCouponsForBot(
    botUid: string,
    botToken?: string,
    options?: AutoRevokeOptions
): Promise<{ revokedCount: number; notifiedChats: number }> {
    if (!botUid) return { revokedCount: 0, notifiedChats: 0 };
    const nowMs = options?.nowMs ?? Date.now();
    const timeoutMs = options?.timeoutMs ?? DEFAULT_REVOKE_TIMEOUT_MS;
    const push = options?.pushFn ?? pushLineSimpleText;
    const nowIso = new Date(nowMs).toISOString();

    try {
        const colRef = db.collection('line_bots').doc(botUid).collection('coupons');
        const snap = await colRef.where('status', '==', 'SENT').get();
        if (snap.empty) return { revokedCount: 0, notifiedChats: 0 };

        const staleCoupons: Array<{
            ref: FirebaseFirestore.DocumentReference;
            data: CouponDocData;
        }> = [];

        for (const doc of snap.docs) {
            const data = doc.data() as CouponDocData;
            if (isCouponStale(data, nowMs, timeoutMs)) {
                staleCoupons.push({ ref: doc.ref, data });
            }
        }

        if (staleCoupons.length === 0) return { revokedCount: 0, notifiedChats: 0 };

        // Gom nhóm theo chatId để gửi tin thông báo
        const byChat = new Map<string, CouponDocData[]>();
        const batch = db.batch();

        for (const item of staleCoupons) {
            batch.update(item.ref, {
                status: 'UNUSED',
                orderId: '',
                recipient: '',
                recipientId: '',
                revokedAt: nowIso,
                revokeReason: 'Tự động hoàn kho sau 30 phút do chưa sao chép sử dụng',
                updatedAt: nowIso
            });

            const chatId = item.data.chatId;
            if (chatId) {
                if (!byChat.has(chatId)) byChat.set(chatId, []);
                byChat.get(chatId)!.push(item.data);
            }
        }

        await batch.commit();
        console.info(`[autoRevokeStaleCouponsForBot] Bot ${botUid}: Đã tự động hoàn kho ${staleCoupons.length} mã SENT quá 30 phút.`);

        let notifiedChats = 0;
        if (botToken && byChat.size > 0) {
            for (const [chatId, groupCoupons] of byChat) {
                const text = formatRevokeNotification(groupCoupons);
                if (text) {
                    const ok = await push(botToken, chatId, text).catch(() => false);
                    if (ok) notifiedChats++;
                }
            }
        }

        return { revokedCount: staleCoupons.length, notifiedChats };
    } catch (err) {
        console.error(`[autoRevokeStaleCouponsForBot] Lỗi xử lý bot ${botUid}:`, err);
        return { revokedCount: 0, notifiedChats: 0 };
    }
}

/**
 * Quét toàn bộ bot đang hoạt động để thu hồi các mã SENT treo quá 30 phút
 */
export async function autoRevokeAllBotsStaleCoupons(
    options?: AutoRevokeOptions
): Promise<{ totalRevoked: number; totalNotified: number }> {
    try {
        const botsSnap = await db.collection('line_bots').where('active', '==', true).get();
        if (botsSnap.empty) return { totalRevoked: 0, totalNotified: 0 };

        let totalRevoked = 0;
        let totalNotified = 0;

        for (const { doc: botDoc, config } of await botsWithSecrets(botsSnap.docs)) {
            const uid = botDoc.id;
            const token = String(config.channelAccessToken || '');
            const res = await autoRevokeStaleCouponsForBot(uid, token, options);
            totalRevoked += res.revokedCount;
            totalNotified += res.notifiedChats;
        }

        if (totalRevoked > 0) {
            console.info(`[autoRevokeAllBotsStaleCoupons] Toàn hệ thống: Đã hoàn kho ${totalRevoked} mã, gửi thông báo đến ${totalNotified} nhóm.`);
        }
        return { totalRevoked, totalNotified };
    } catch (err) {
        console.error('[autoRevokeAllBotsStaleCoupons] Lỗi quét toàn hệ thống:', err);
        return { totalRevoked: 0, totalNotified: 0 };
    }
}
