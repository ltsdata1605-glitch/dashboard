import { db } from './firebaseAdmin';
import { splitKhos } from './lineBotScope';

/**
 * Bí mật của Bot LINE (audit S13/S14/B3, 2026-10-08).
 *
 * `channelAccessToken`, `channelSecret`, `pmhRelayToken` KHÔNG còn nằm trong `line_bots/{uid}` (mọi manager
 * cùng Kho đọc được document đó) mà ở `line_bot_secrets/{uid}` — rules khoá hẳn với client, chỉ Admin SDK đọc.
 *
 * Giai đoạn chuyển tiếp: nếu chưa có document bí mật thì dùng field cũ trong `line_bots` (đọc có dự phòng).
 */
export const BOT_SECRETS_COL = 'line_bot_secrets';
export const SECRET_KEYS = ['channelAccessToken', 'channelSecret', 'pmhRelayToken'] as const;
export type BotSecretKey = typeof SECRET_KEYS[number];

type Data = Record<string, any>;

/** Trộn bí mật vào dữ liệu bot: giá trị trong `line_bot_secrets` thắng field cũ (nếu có). */
export async function withSecrets(uid: string, data: Data | undefined | null): Promise<Data> {
    const base: Data = { ...(data || {}) };
    const snap = await db.collection(BOT_SECRETS_COL).doc(uid).get();
    const sec = snap.exists ? (snap.data() || {}) : {};
    for (const k of SECRET_KEYS) {
        if (typeof sec[k] === 'string' && sec[k]) base[k] = sec[k];
    }
    return base;
}

/** Như withSecrets nhưng cho một danh sách document bot (scheduler quét mọi bot active). */
export async function botsWithSecrets<T extends { id: string; data(): Data | undefined }>(
    docs: T[],
): Promise<Array<{ doc: T; config: Data }>> {
    return Promise.all(docs.map(async (doc) => ({ doc, config: await withSecrets(doc.id, doc.data()) })));
}

/** Tìm uid bot theo pmhRelayToken (ưu tiên document bí mật, dự phòng field cũ). */
export async function findBotUidByRelayToken(token: string): Promise<string | null> {
    const s = await db.collection(BOT_SECRETS_COL).where('pmhRelayToken', '==', token).limit(1).get();
    if (!s.empty) return s.docs[0].id;
    const legacy = await db.collection('line_bots').where('pmhRelayToken', '==', token).limit(1).get();
    return legacy.empty ? null : legacy.docs[0].id;
}

export interface BotCaller { uid: string; role?: string; departmentId?: unknown }

/** Cùng luật `canUseBot` của firestore.rules: chủ bot, admin, hoặc manager cùng Mã Kho với bot. */
export function canCallerUseBot(caller: BotCaller, botId: string, botData: Data | undefined | null): boolean {
    if (caller.uid === botId) return true;
    if (caller.role === 'admin') return true;
    if (caller.role !== 'manager') return false;
    const mine = splitKhos(caller.departmentId);
    return splitKhos(botData?.departmentId).some((k) => mine.includes(k));
}
