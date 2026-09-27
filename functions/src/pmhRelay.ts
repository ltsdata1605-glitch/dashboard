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

const REGION = 'asia-southeast1';
const QUEUE_COL = 'pmh_relay_queue';

interface RelayQueueDoc {
    ownerUid: string;
    form: string;
    groupId: string;
    senderName: string;
    quoteToken?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    result?: {
        codes: Array<{ kho: string; type: string; code: string }>;
        errors: string[];
    };
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
}

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
        codes: Array<{ kho: string; type: string; code: string }>;
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

    // Gửi LINE push message
    const botDoc = await db.collection('line_bots').doc(uid).get();
    const token = botDoc.data()?.channelAccessToken;
    if (!token || !data.groupId) {
        res.json({ ok: true, pushed: false, reason: 'no-token-or-group' });
        return;
    }

    const codeList = (codes || []);
    const errList = (errors || []);
    const lines: string[] = [];

    if (codeList.length > 0) {
        lines.push(`✅ Đã lấy ${codeList.length} mã PMH:`);
        for (const c of codeList) {
            lines.push(`${c.kho} - ${c.type} : ${c.code}`);
        }
    }
    if (errList.length > 0) {
        lines.push('');
        lines.push(`❌ Lỗi (${errList.length}):`);
        for (const e of errList) {
            lines.push(`• ${e}`);
        }
    }
    if (lines.length === 0) {
        lines.push('⚠️ Không nhận được mã nào từ admintnb.');
    }

    const replyText = lines.join('\n');
    const messages: any[] = [{
        type: 'text',
        text: replyText,
        ...(data.quoteToken ? { quoteToken: data.quoteToken } : {}),
    }];

    try {
        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ to: data.groupId, messages }),
        });
        if (!pushRes.ok) {
            // Retry without quoteToken
            if (data.quoteToken) {
                const retry = await fetch('https://api.line.me/v2/bot/message/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        to: data.groupId,
                        messages: [{ type: 'text', text: replyText }],
                    }),
                });
                res.json({ ok: true, pushed: retry.ok });
                return;
            }
        }
        res.json({ ok: true, pushed: pushRes.ok });
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
}): Promise<string> {
    const docRef = await db.collection(QUEUE_COL).add({
        ownerUid: params.ownerUid,
        form: params.form,
        groupId: params.groupId,
        senderName: params.senderName,
        quoteToken: params.quoteToken || null,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
}
