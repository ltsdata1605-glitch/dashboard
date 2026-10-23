/**
 * Cloud Scheduler cho BOT LINE: 5 phút/lần gửi các lịch "Gửi Notify" người dùng tạo (lineBotUserSchedules, 2026-10-02).
 *
 * 2026-10-20 (chủ dự án chốt "Xoá tất cả báo cáo tồn kho và tổng kết. Không cần tính năng này"): ĐÃ XOÁ 2 lịch tự đẩy
 * vào nhóm — báo cáo tồn kho 06:00 (dailyMorningInventoryReport) và tổng kết 22:00 (dailyEveningUsageSummary). Chúng tốn
 * hạn mức tin LINE theo số thành viên nhóm mỗi ngày, góp phần làm bot hết hạn mức từ 02/10. Xem tồn kho: gõ "tk" trong
 * nhóm (bot TRẢ LỜI — miễn phí).
 */

import { botsWithSecrets } from './lineBotSecrets';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './firebaseAdmin';
import { dueSlot, renderTemplate, vnNow, type ScheduleLike } from './lineBotScheduleDue';
import { moTaLoiLine } from './lineErrors';
import { autoRevokeAllBotsStaleCoupons } from './couponAutoRevoke';

const SCHEDULER_REGION = 'asia-southeast1';

/**
 * Gửi tin nhắn PUSH trực tiếp tới Nhóm LINE (chỉ gửi trong nhóm, không gửi riêng)
 */
async function pushLineMessagesDetailed(token: string, toGroupId: string, messages: any[]): Promise<{ ok: boolean; status: number; error?: string }> {
    if (!token || !toGroupId || !messages || messages.length === 0) return { ok: false, status: 0, error: 'Thiếu token hoặc nhóm nhận' };
    try {
        const sanitized = messages.slice(0, 5).map(m => {
            if (m.type === 'text') {
                return { type: 'text', text: String(m.text || '') };
            }
            return m;
        });

        const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                to: toGroupId,
                messages: sanitized
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({})) as { message?: string };
            console.error('[Scheduler Push Error]', res.status, errData);
            return { ok: false, status: res.status, error: moTaLoiLine(res.status, errData?.message) };
        }
        console.info(`[Scheduler Push Success] Đã gửi ${sanitized.length} tin nhắn đến nhóm ${toGroupId}`);
        return { ok: true, status: res.status };
    } catch (err) {
        console.error('[Scheduler Push Exception]', err);
        return { ok: false, status: 0, error: 'Không kết nối được máy chủ LINE.' };
    }
}

/**
 * LỊCH "GỬI NOTIFY" DO NGƯỜI DÙNG TẠO (Bot LINE › Gửi Notify) — chạy 5 phút/lần (2026-10-02).
 * Trước đây lịch chỉ được LƯU, tin chỉ đi khi bấm tay "Gửi ngay". Giờ máy chủ tự gửi đúng giờ (giờ Việt Nam):
 * - Quyết định đến giờ: `dueSlot()` ở lineBotScheduleDue.ts (khe `ngày giờ`, trễ tối đa 20 phút, không gửi trùng).
 * - Giữ chỗ khe bằng transaction TRƯỚC khi gửi → hai lượt chạy chồng nhau không gửi 2 lần.
 * - Đối tượng: SPECIFIC_GROUPS → targetGroupIds; ALL_GROUPS → mọi nhóm đã lưu (groups, active ≠ false). KHÔNG dùng
 *   broadcast của LINE (gửi tới MỌI người kết bạn với bot, không phải các nhóm, và tốn hạn mức tin).
 * - ONCE: gửi xong tự tắt lịch.
 * - Chi phí đọc Firestore mỗi lượt: 1 truy vấn bot + 1 truy vấn lịch đang bật mỗi bot (+ nhóm/coupon chỉ khi có lịch đến giờ).
 */
export const lineBotUserSchedules = onSchedule(
    {
        schedule: '*/5 * * * *',
        timeZone: 'Asia/Ho_Chi_Minh',
        region: SCHEDULER_REGION
    },
    async () => {
        const now = vnNow();
        try {
            // Tự động quét và hoàn kho các mã SENT quá 30 phút chưa copy sử dụng
            await autoRevokeAllBotsStaleCoupons().catch(err => {
                console.error('[lineBotUserSchedules] Lỗi tự động hoàn kho:', err);
            });

            const botsSnap = await db.collection('line_bots').where('active', '==', true).get();
            for (const { doc: botDoc, config } of await botsWithSecrets(botsSnap.docs)) {
                const uid = botDoc.id;
                const token = String(config.channelAccessToken || '');
                if (!token) continue;

                const schedSnap = await botDoc.ref.collection('schedules').where('active', '==', true).get();
                const due = schedSnap.docs
                    .map((d) => ({ ref: d.ref, data: d.data() as ScheduleLike & Record<string, any> }))
                    .map((x) => ({ ...x, slot: dueSlot(x.data, now) }))
                    .filter((x): x is typeof x & { slot: string } => !!x.slot);
                if (due.length === 0) continue;

                let allGroupIds: string[] | null = null;
                let tonKho: number | null = null;

                for (const { ref, data, slot } of due) {
                    // Giữ chỗ khe: chỉ lượt nào ghi được lastAutoRunSlot mới gửi
                    const claimed = await db.runTransaction(async (tx) => {
                        const fresh = await tx.get(ref);
                        const cur = (fresh.data() || {}) as ScheduleLike;
                        if (cur.active === false || cur.lastAutoRunSlot === slot) return false;
                        tx.update(ref, {
                            lastAutoRunSlot: slot,
                            lastRunAt: new Date().toISOString(),
                            ...(cur.repeatType === 'ONCE' ? { active: false } : {}),
                        });
                        return true;
                    });
                    if (!claimed) continue;

                    let targets: string[];
                    if (data.targetType === 'SPECIFIC_GROUPS') {
                        targets = (Array.isArray(data.targetGroupIds) ? data.targetGroupIds : []).filter(Boolean);
                    } else {
                        if (!allGroupIds) {
                            const gSnap = await botDoc.ref.collection('groups').get();
                            allGroupIds = gSnap.docs
                                .filter((g) => g.data()?.active !== false)
                                .map((g) => String(g.data()?.groupId || g.id))
                                .filter(Boolean);
                        }
                        targets = allGroupIds;
                    }

                    const template = String(data.messageTemplate || '');
                    if (tonKho === null && template.includes('{ton_kho}')) {
                        const cSnap = await botDoc.ref.collection('coupons').get();
                        tonKho = cSnap.docs.filter((c) => {
                            const d = c.data();
                            const st = d?.status;
                            const isExpired = d?.expiryDate && d.expiryDate < now.date;
                            return (st === 'UNUSED' || !st) && !isExpired;
                        }).length;
                    }
                    const text = renderTemplate(template, { date: now.date, botName: config.botName, tonKho }).slice(0, 5000);
                    if (!text.trim() || targets.length === 0) {
                        await ref.update({ lastAutoRunResult: `Bỏ qua: ${!text.trim() ? 'nội dung trống' : 'không có nhóm nhận'}` });
                        console.warn(`[Scheduler Notify] Bot ${uid} lịch ${ref.id}: bỏ qua (${!text.trim() ? 'nội dung trống' : 'không có nhóm'}).`);
                        continue;
                    }

                    let ok = 0;
                    let loiDau: string | undefined;
                    for (const groupId of targets) {
                        const r = await pushLineMessagesDetailed(token, groupId, [{ type: 'text', text }]);
                        if (r.ok) ok++; else loiDau = loiDau || r.error;
                    }
                    // Ghi RÕ lý do khi không gửi được (vd hết hạn mức tin LINE) — trước đây chỉ "Đã gửi 0/1 nhóm".
                    await ref.update({
                        lastAutoRunResult: ok === targets.length
                            ? `Đã gửi ${ok}/${targets.length} nhóm lúc ${slot}`
                            : `Không gửi được ${targets.length - ok}/${targets.length} nhóm lúc ${slot}: ${loiDau || 'lỗi không rõ'}`,
                        lastAutoRunOk: ok === targets.length,
                    });
                    console.info(`[Scheduler Notify] Bot ${uid} lịch "${data.name || ref.id}" (${slot}): gửi ${ok}/${targets.length} nhóm.`);
                }
            }
        } catch (error) {
            console.error('[Scheduler Notify Error]', error);
        }
    }
);

/**
 * Tự động quét và xoá sạch PMH hết hạn khỏi kho mỗi ngày lúc 00:01 (giờ Việt Nam)
 */
export const lineBotDailyExpiredCouponsCleanup = onSchedule(
    {
        schedule: '1 0 * * *',
        timeZone: 'Asia/Ho_Chi_Minh',
        region: SCHEDULER_REGION
    },
    async () => {
        try {
            const botsSnap = await db.collection('line_bots').get();
            const todayVN = vnNow().date;
            let totalDeleted = 0;

            for (const botDoc of botsSnap.docs) {
                const uid = botDoc.id;
                const colRef = botDoc.ref.collection('coupons');
                const snap = await colRef.get();
                if (snap.empty) continue;

                const expiredDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
                for (const d of snap.docs) {
                    const data = d.data();
                    if (data.expiryDate && data.expiryDate < todayVN) {
                        expiredDocs.push(d);
                    }
                }

                if (expiredDocs.length > 0) {
                    const batchSize = 450;
                    for (let i = 0; i < expiredDocs.length; i += batchSize) {
                        const chunk = expiredDocs.slice(i, i + batchSize);
                        const b = db.batch();
                        for (const doc of chunk) {
                            b.delete(doc.ref);
                        }
                        await b.commit();
                    }
                    totalDeleted += expiredDocs.length;
                    console.info(`[lineBotDailyExpiredCouponsCleanup] Đã tự động xoá ${expiredDocs.length} mã hết hạn của bot ${uid}`);
                }
            }
            console.info(`[lineBotDailyExpiredCouponsCleanup] Hoàn tất xoá ${totalDeleted} mã PMH hết hạn trên toàn hệ thống`);
        } catch (err) {
            console.error('[lineBotDailyExpiredCouponsCleanup Error]', err);
        }
    }
);
