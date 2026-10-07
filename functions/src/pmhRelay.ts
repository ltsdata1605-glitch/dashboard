/**
 * PMH Relay — cầu nối giữa LINE bot và admintnb.com qua trình duyệt người dùng.
 *
 * Luồng: LINE group → webhook ghi queue → userscript (trình duyệt) poll & gửi form →
 *         userscript POST kết quả → Cloud Function push LINE reply về group.
 *
 * 2 endpoint HTTP:
 *   - pmhRelayPoll   (GET)  — userscript gọi mỗi 5s, nhận form pending
 *   - pmhRelayComplete (POST) — userscript trả mã, CF gửi LINE push
 *
 * Auth: Bearer token = field `pmhRelayToken` trong `line_bots/{uid}`.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createFilteredPmhFlexMessages } from './pmhFlexCard';
import { signLiffUris } from './liffTicket';
import { allocatePmhSequence } from './pmhSequence';

const REGION = 'asia-southeast1';
const QUEUE_COL = 'pmh_relay_queue';

interface RelayQueueDoc {
    ownerUid: string;
    form: string;
    groupId: string;
    senderName: string;
    quoteToken?: string;
    replyToken?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    result?: {
        codes: Array<{ kho: string; ten?: string; storeHeader?: string; type: string; code: string }>;
        errors: string[];
    };
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
}

const KNOWN_STORE_NAMES: Record<string, string> = {
    '910': 'ĐML_STR_STR - 99 Hùng Vương',
};

async function resolveToken(authHeader: string | undefined): Promise<string | null> {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token || token.length < 8) return null;

    const snap = await db.collection('line_bots')
        .where('pmhRelayToken', '==', token)
        .limit(1)
        .get();
    if (snap.empty) return null;
    return snap.docs[0].id;
}

/**
 * GET /pmhRelayPoll — trả danh sách form pending cho userscript xử lý.
 */
export const pmhRelayPoll = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'GET') { res.status(405).send('Method Not Allowed'); return; }

    const uid = await resolveToken(req.headers.authorization);
    if (!uid) { res.status(401).json({ error: 'invalid-token' }); return; }

    const snap = await db.collection(QUEUE_COL)
        .where('ownerUid', '==', uid)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc')
        .limit(5)
        .get();

    const items = snap.docs.map(d => ({
        id: d.id,
        form: (d.data() as RelayQueueDoc).form,
    }));

    // Đánh dấu processing để không poll lại
    const batch = db.batch();
    for (const d of snap.docs) {
        batch.update(d.ref, { status: 'processing', updatedAt: FieldValue.serverTimestamp() });
    }
    if (!snap.empty) await batch.commit();

    res.json({ items });
});

/**
 * POST /pmhRelayComplete — userscript gửi kết quả, CF push LINE reply.
 */
export const pmhRelayComplete = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const uid = await resolveToken(req.headers.authorization);
    if (!uid) { res.status(401).json({ error: 'invalid-token' }); return; }

    const { id, codes, errors } = req.body as {
        id: string;
        codes: Array<{ kho: string; ten?: string; storeHeader?: string; type: string; code: string }>;
        errors: string[];
    };
    if (!id) { res.status(400).json({ error: 'missing-id' }); return; }

    const docRef = db.collection(QUEUE_COL).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) { res.status(404).json({ error: 'not-found' }); return; }

    const data = docSnap.data() as RelayQueueDoc;
    if (data.ownerUid !== uid) { res.status(403).json({ error: 'forbidden' }); return; }

    await docRef.update({
        status: 'done',
        result: { codes: codes || [], errors: errors || [] },
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Gửi LINE message (Ưu tiên dạng Thẻ Flex Message chuẩn giao diện)
    const botDoc = await db.collection('line_bots').doc(uid).get();
    const botData = botDoc.data();
    const token = botData?.channelAccessToken;
    const liffId = botData?.liffId || '2011679071-BclvutpD';
    if (!token || !data.groupId) {
        res.json({ ok: true, pushed: false, reason: 'no-token-or-group' });
        return;
    }

    console.info(`[pmhRelayComplete] docId=${id}, codes=${(codes||[]).length}, errors=${(errors||[]).length}, groupId=${data.groupId}`);
    const codeList = (codes || []);
    const errList = (errors || []);

const makeFilteredDocId = (item: { code: string; recipient: string }) =>
    `${item.code}_${item.recipient}`.replace(/[^a-zA-Z0-9_-]/g, '_');

async function saveQuoteTokens(
    uid: string,
    items: Array<{ code: string; recipient: string }>,
    sentMessages: Array<{ id: string; quoteToken?: string }> | undefined,
    chatId: string
) {
    if (!sentMessages || sentMessages.length === 0 || items.length === 0 || !chatId) return;
    try {
        const qBatch = db.batch();
        items.forEach((item, fIdx) => {
            const quoteToken = sentMessages[Math.floor(fIdx / 10)]?.quoteToken;
            if (!quoteToken) return;
            const docId = makeFilteredDocId(item);
            qBatch.update(db.collection('line_bots').doc(uid).collection('filtered_coupons').doc(docId), {
                quoteToken,
                chatId,
                chatType: 'group'
            });
        });
        await qBatch.commit();
        console.info(`[pmhRelayComplete] Saved quoteTokens for ${items.length} codes`);
    } catch (err) {
        console.warn('[pmhRelayComplete] Error saving quoteTokens:', err);
    }
}

    // 1. Tạo tin nhắn dạng Thẻ Flex Message Card
    let messages: any[] = [];
    let matchedItems: Array<{
        recipient: string;
        productName: string;
        categoryLabel: string;
        code: string;
        orderId?: string;
        cardIndex: number;
    }> = [];

    if (codeList.length > 0) {
        const startSeq = await allocatePmhSequence(uid, codeList.length, new Date(), 'pmh');
        matchedItems = codeList.map((c, idx) => {
            let storeTitle = c.storeHeader || (c.ten ? `${c.kho} - ${c.ten}` : '');
            if (!storeTitle) {
                const knownName = KNOWN_STORE_NAMES[c.kho];
                storeTitle = knownName ? `${c.kho} - ${knownName}` : `${c.kho}`;
            }
            return {
                recipient: storeTitle,
                productName: `PMH ${c.type.toUpperCase()}`,
                categoryLabel: c.type.toUpperCase(),
                code: c.code,
                orderId: (c as any).orderId || undefined,
                cardIndex: (startSeq && startSeq > 0) ? startSeq + idx : (idx + 1),
            };
        });
        messages = signLiffUris(createFilteredPmhFlexMessages(matchedItems, liffId), uid, botData?.channelSecret);

        // Lưu vào kho filtered_coupons (kho CSD) để hỗ trợ lệnh "csd" và ghi nhận lịch sử LIFF khi bấm copy
        try {
            const fBatch = db.batch();
            const fNow = new Date().toISOString();
            matchedItems.forEach((item) => {
                const docId = makeFilteredDocId(item);
                const docRef = db.collection('line_bots').doc(uid).collection('filtered_coupons').doc(docId);
                fBatch.set(docRef, {
                    id: docId,
                    code: item.code,
                    productName: item.productName,
                    categoryLabel: item.categoryLabel,
                    recipient: item.recipient,
                    orderId: item.orderId || null,
                    cardIndex: item.cardIndex,
                    status: 'UNUSED',
                    filteredAt: fNow,
                    chatId: data.groupId || null,
                    chatType: 'group',
                    source: 'admintnb'
                }, { merge: true });
            });
            await fBatch.commit();
            console.info(`[pmhRelayComplete] Saved ${matchedItems.length} codes to filtered_coupons for uid=${uid}`);
        } catch (err) {
            console.warn('[pmhRelayComplete] Error saving to filtered_coupons:', err);
        }
    }

    if (errList.length > 0) {
        messages.push({
            type: 'text',
            text: `❌ Lỗi (${errList.length}):\n` + errList.map(e => `• ${e}`).join('\n')
        });
    }

    if (messages.length === 0) {
        messages.push({
            type: 'text',
            text: '⚠️ Không nhận được mã nào từ admintnb.'
        });
    }

    // Chuẩn bị sẵn fallback text nếu gửi thẻ Flex Message gặp lỗi
    const fallbackLines: string[] = [];
    for (const c of codeList) {
        let storeTitle = c.storeHeader || (c.ten ? `${c.kho} - ${c.ten}` : '');
        if (!storeTitle) {
            const knownName = KNOWN_STORE_NAMES[c.kho];
            storeTitle = knownName ? `${c.kho} - ${knownName}` : `${c.kho}`;
        }
        fallbackLines.push(storeTitle);
        fallbackLines.push(`➜ PMH ${c.type} : ${c.code}`);
    }
    if (errList.length > 0) {
        if (fallbackLines.length > 0) fallbackLines.push('');
        fallbackLines.push(`❌ Lỗi (${errList.length}):\n` + errList.map(e => `• ${e}`).join('\n'));
    }
    const fallbackText = fallbackLines.join('\n');

    try {
        // 1. Ưu tiên cao nhất: Dùng replyToken nếu có (Miễn phí 100%, không bao giờ bị trừ quota push 429)
        if (data.replyToken) {
            console.info(`[pmhRelayComplete] Attempting FREE reply via replyToken for docId=${id}`);
            const replyRes = await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    replyToken: data.replyToken,
                    messages,
                }),
            });
            if (replyRes.ok) {
                console.info(`[pmhRelayComplete] Reply SUCCESS via replyToken! docId=${id}`);
                const replyJson = await replyRes.json().catch(() => ({})) as any;
                const sentMessages = Array.isArray(replyJson?.sentMessages) ? replyJson.sentMessages : [];
                if (data.groupId) {
                    await saveQuoteTokens(uid, matchedItems, sentMessages, data.groupId);
                }
                res.json({ ok: true, pushed: true, method: 'reply' });
                return;
            }
            const replyErr = await replyRes.text();
            console.warn(`[pmhRelayComplete] replyToken failed (likely expired > 1m): ${replyRes.status} ${replyErr}. Falling back to push.`);
        }

        // 2. Fallback: Dùng push message nếu không có replyToken hoặc replyToken đã hết hạn
        console.info(`[pmhRelayComplete] Pushing to LINE, groupId=${data.groupId}`);
        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ to: data.groupId, messages }),
        });
        if (!pushRes.ok) {
            const errBody = await pushRes.text();
            console.warn(`[pmhRelayComplete] Push failed: ${pushRes.status} ${errBody}`);
            // Retry with text format
            if (fallbackText) {
                const retry = await fetch('https://api.line.me/v2/bot/message/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        to: data.groupId,
                        messages: [{ type: 'text', text: fallbackText }],
                    }),
                });
                if (retry.ok) {
                    res.json({ ok: true, pushed: true, method: 'push-text-retry' });
                    return;
                }
                const retryErr = await retry.text();
                const reason = (retryErr.includes('monthly limit') || retry.status === 429)
                    ? 'Tài khoản LINE Bot hết hạn mức tin nhắn tháng (429: You have reached your monthly limit)'
                    : retryErr;
                res.json({ ok: true, pushed: false, reason });
                return;
            }
            const reason = (errBody.includes('monthly limit') || pushRes.status === 429)
                ? 'Tài khoản LINE Bot hết hạn mức tin nhắn tháng (429: You have reached your monthly limit)'
                : errBody;
            res.json({ ok: true, pushed: false, reason });
            return;
        }
        const pushJson = await pushRes.json().catch(() => ({})) as any;
        const sentMessages = Array.isArray(pushJson?.sentMessages) ? pushJson.sentMessages : [];
        if (data.groupId) {
            await saveQuoteTokens(uid, matchedItems, sentMessages, data.groupId);
        }
        res.json({ ok: true, pushed: true, method: 'push' });
    } catch (e: any) {
        console.error('[pmhRelayComplete] Push error:', e);
        res.json({ ok: true, pushed: false, reason: e?.message });
    }
});

/**
 * Ghi form PMH vào queue — gọi từ lineBotWebhook khi group bật pmhRelay.
 */
export async function enqueuePmhRelay(params: {
    ownerUid: string;
    form: string;
    groupId: string;
    senderName: string;
    quoteToken?: string;
    replyToken?: string;
}): Promise<string> {
    const docRef = await db.collection(QUEUE_COL).add({
        ownerUid: params.ownerUid,
        form: params.form,
        groupId: params.groupId,
        senderName: params.senderName,
        quoteToken: params.quoteToken || null,
        replyToken: params.replyToken || null,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
}
