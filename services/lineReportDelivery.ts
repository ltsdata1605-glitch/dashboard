/**
 * GỬI ẢNH BÁO CÁO VÀO NHÓM LINE (Phân tích, 2026-10-01).
 *
 * Dùng lại bot LINE chủ dự án đã cấu hình ở mục Bot LINE (features/line-bot): bot riêng của tài khoản, hoặc bot dùng
 * chung theo Mã Kho — cùng quy tắc chọn với useBotScope (lựa chọn đã lưu ở localStorage `line_bot_scope_choice_<uid>`).
 *
 * Đường đi của một ảnh:
 *  1. Nén JPEG ≤ ~700KB (Firestore giới hạn 1 document 1MB; LINE cho ảnh preview ≤ 1MB).
 *  2. Ghi vào `bot_media/{id}` — Cloud Function lineBotWebhook phục vụ lại ảnh qua URL https công khai (LINE cần URL).
 *  3. Đẩy tin vào nhóm qua action `pushImage` của Cloud Function theo `botId` + ID token. Token bot nằm ở server
 *     (`line_bot_secrets`, audit S13) nên client không còn gọi thẳng api.line.me bằng userscript.
 */
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { lineBotFirestoreService } from '../features/line-bot/services/lineBotFirestoreService';
import { botHasToken } from '../features/line-bot/types/lineBot.types';
import { sanitizeReportCommand, getReportCommand, reportKeyFromFilename } from './analysisExportDestinations';

const WEBHOOK_URL = 'https://asia-southeast1-dashboa-7e20b.cloudfunctions.net/lineBotWebhook';

/** Bot LINE dùng để gửi. Token KHÔNG ở client (audit S13) — gửi theo botId, server tự lấy token. */
export interface LineBotRef { botId: string; botName: string }
export interface LineGroupRef { groupId: string; groupName: string }

let botCache: { key: string; at: number; bot: LineBotRef | null } | null = null;

/** CHỈ bản dev (test e2e): bot/nhóm/tải ảnh giả — bản build production loại bỏ nhánh này (import.meta.env.DEV = false). */
interface TestOverride { bot: LineBotRef | null; groups: LineGroupRef[]; uploadUrl?: string; hd?: boolean }
const testOverride = (): TestOverride | null =>
    (import.meta.env.DEV ? ((globalThis as unknown as { __YCX_TEST_LINE__?: TestOverride }).__YCX_TEST_LINE__ || null) : null);

/** Bot LINE của tài khoản (riêng hoặc dùng chung theo Mã Kho). null = chưa cấu hình bot. Nhớ 5 phút. */
export async function resolveLineBot(uid: string, departmentId?: string | null): Promise<LineBotRef | null> {
    const t = testOverride();
    if (t) return t.bot;
    if (!uid) return null;
    const key = `${uid}|${departmentId || ''}`;
    if (botCache && botCache.key === key && Date.now() - botCache.at < 5 * 60_000) return botCache.bot;
    const dept = (departmentId || '').trim();
    const personal = await lineBotFirestoreService.getBotConfig(uid);
    let botId = botHasToken(personal) ? uid : '';
    let choice: string | null = null;
    try { choice = localStorage.getItem(`line_bot_scope_choice_${uid}`); } catch { /* Private Mode */ }
    if (dept && dept !== 'ALL' && !dept.startsWith('ALL ') && (choice === 'warehouse' || !botId)) {
        const wh = await lineBotFirestoreService.findWarehouseBot(dept);
        if (wh?.id && (choice === 'warehouse' || !botId)) botId = wh.id;
    }
    let bot: LineBotRef | null = null;
    if (botId) {
        const cfg = botId === uid ? personal : await lineBotFirestoreService.getBotConfig(botId);
        if (botHasToken(cfg)) bot = { botId, botName: cfg?.botName || 'Bot LINE' };
    }
    botCache = { key, at: Date.now(), bot };
    return bot;
}

/** Nhóm LINE bot đã tham gia (bot tự ghi khi được thêm vào nhóm / có tin nhắn trong nhóm). */
export async function listLineGroups(botId: string): Promise<LineGroupRef[]> {
    const t = testOverride();
    if (t) return t.groups;
    const groups = await lineBotFirestoreService.getGroups(botId);
    return groups
        .filter((g) => g.groupId && g.active !== false)
        .map((g) => ({ groupId: g.groupId, groupName: g.groupName || 'Nhóm LINE' }))
        .sort((a, b) => a.groupName.localeCompare(b.groupName, 'vi'));
}

const MAX_BASE64 = 950_000;
/** Bản gốc HD: LINE nhận ảnh gốc ≤ 10MB — chừa lề cho base64 ở function */
const HD_MAX_BYTES = 9_500_000;
/** Mỗi mảnh ≤ 900k ký tự base64 — vừa 1 document Firestore (1MB) */
const PART_CHARS = 900_000;

const blobToBase64 = (b: Blob): Promise<string> => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ''));
    r.onerror = () => reject(r.error || new Error('Không đọc được ảnh'));
    r.readAsDataURL(b);
});

const veCanvas = (bmp: ImageBitmap, w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không dựng được canvas để nén ảnh');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    return canvas;
};

/**
 * Ảnh XEM TRƯỚC (LINE hiện trong khung chat, ≤ 1MB): JPEG vừa 1 document Firestore. Bề rộng tối đa 2048px, ưu tiên
 * giữ kích thước rồi mới hạ chất lượng — chữ trong bảng hỏng vì thu nhỏ nhiều hơn vì nén.
 */
export async function prepareLineImage(blob: Blob): Promise<{ base64: string; width: number; height: number }> {
    const bmp = await createImageBitmap(blob);
    let scale = Math.min(1, 2048 / bmp.width);
    for (let lan = 0; lan < 10; lan++) {
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = veCanvas(bmp, w, h);
        for (const q of [0.92, 0.85, 0.78]) {
            const base64 = canvas.toDataURL('image/jpeg', q).replace(/^data:image\/jpeg;base64,/, '');
            if (base64.length <= MAX_BASE64) return { base64, width: w, height: h };
        }
        scale *= 0.85;
    }
    throw new Error('Ảnh quá lớn để gửi LINE — thử xuất phần nhỏ hơn');
}

/**
 * Ảnh GỐC (bấm vào ảnh trong LINE mới tải): giữ nguyên độ nét. PNG gốc (không nén mất chữ) nếu ≤ 9,5MB, không thì
 * JPEG chất lượng cao cùng kích thước, cuối cùng mới thu nhỏ.
 */
export async function prepareLineHdImage(blob: Blob): Promise<{ base64: string; contentType: string }> {
    if (/png|jpe?g/i.test(blob.type) && blob.size <= HD_MAX_BYTES) {
        return { base64: await blobToBase64(blob), contentType: /png/i.test(blob.type) ? 'image/png' : 'image/jpeg' };
    }
    const bmp = await createImageBitmap(blob);
    let scale = 1;
    for (let lan = 0; lan < 6; lan++) {
        const canvas = veCanvas(bmp, Math.max(1, Math.round(bmp.width * scale)), Math.max(1, Math.round(bmp.height * scale)));
        for (const q of [0.95, 0.9]) {
            const base64 = canvas.toDataURL('image/jpeg', q).replace(/^data:image\/jpeg;base64,/, '');
            if (base64.length * 0.75 <= HD_MAX_BYTES) return { base64, contentType: 'image/jpeg' };
        }
        scale *= 0.85;
    }
    throw new Error('Ảnh quá lớn để gửi LINE — thử xuất phần nhỏ hơn');
}

/** Cắt chuỗi base64 thành các mảnh vừa 1 document (hàm thuần — test được) */
export function splitBase64(base64: string, size = PART_CHARS): string[] {
    const out: string[] = [];
    for (let i = 0; i < base64.length; i += size) out.push(base64.slice(i, i + size));
    return out.length ? out : [''];
}

interface HdCaps { ok: boolean; at: number }
const G = globalThis as unknown as { __ycxLineHdCaps?: HdCaps };

/**
 * Function lineBotWebhook đã có ghép ảnh HD chưa (`?caps` trả {hdMedia:true}). Bản chưa deploy trả câu chữ → chỉ gửi
 * bản ≤1MB như cũ (không gửi URL HD mà function cũ không phục vụ được → ảnh vỡ). Nhớ "có" cả phiên, "chưa" 10 phút.
 */
export async function lineHdSupported(): Promise<boolean> {
    const t = testOverride();
    if (t) return Boolean(t.hd);
    const c = G.__ycxLineHdCaps;
    if (c && (c.ok || Date.now() - c.at < 10 * 60_000)) return c.ok;
    let ok = false;
    try {
        const res = await fetch(`${WEBHOOK_URL}?caps=1`, { cache: 'no-store' });
        const j = await res.json().catch(() => null) as { hdMedia?: boolean } | null;
        ok = Boolean(j?.hdMedia);
    } catch { /* mất mạng / function lỗi */ }
    G.__ycxLineHdCaps = { ok, at: Date.now() };
    return ok;
}

async function uploadLineImage(base64: string, name: string, contentType = 'image/jpeg', mediaId?: string): Promise<string> {
    const t = testOverride();
    if (t?.uploadUrl) {
        (globalThis as unknown as { __YCX_TEST_LINE_UPLOADS__?: number[] }).__YCX_TEST_LINE_UPLOADS__?.push(base64.length);
        return mediaId ? `${t.uploadUrl}#${mediaId}` : t.uploadUrl;
    }
    const id = mediaId || `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, 'bot_media', id), {
        id, base64, contentType, name, size: Math.round(base64.length * 0.75),
        createdAt: new Date().toISOString(), source: 'analysis-export', ownerUid: auth.currentUser?.uid ?? '',
    });
    return `${WEBHOOK_URL}?mediaId=${id}`;
}

/** Ghi bản HD thành nhiều mảnh `<id>_p<i>` + document đầu `<id>` {parts} — function ghép lại khi LINE tải ảnh */
async function uploadLineHdImage(base64: string, contentType: string, name: string): Promise<string> {
    const id = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_hd`;
    const parts = splitBase64(base64);
    const t = testOverride();
    if (t?.uploadUrl) {
        (globalThis as unknown as { __YCX_TEST_LINE_HD__?: { parts: number; contentType: string; chars: number }[] }).__YCX_TEST_LINE_HD__
            ?.push({ parts: parts.length, contentType, chars: base64.length });
        return `${t.uploadUrl}#${id}`;
    }
    for (let i = 0; i < parts.length; i++) {
        await setDoc(doc(db, 'bot_media', `${id}_p${i}`), { id: `${id}_p${i}`, base64: parts[i], part: i, createdAt: new Date().toISOString(), source: 'analysis-export', ownerUid: auth.currentUser?.uid ?? '' });
    }
    await setDoc(doc(db, 'bot_media', id), {
        id, parts: parts.length, contentType, name, size: Math.round(base64.length * 0.75),
        createdAt: new Date().toISOString(), source: 'analysis-export', ownerUid: auth.currentUser?.uid ?? '',
    });
    return `${WEBHOOK_URL}?mediaId=${id}`;
}

async function pushViaCloudFunction(botId: string, to: string, imageUrl: string, text: string, previewUrl?: string): Promise<void> {
    const idToken = await auth.currentUser?.getIdToken().catch(() => '') ?? '';
    const res = await fetch(`${WEBHOOK_URL}?action=pushImage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ botId, to, imageUrl, previewUrl, text }),
    });
    const data = await res.json().catch(() => null) as { success?: boolean; error?: string } | null;
    if (!data) throw new Error('Cloud Function chưa có chức năng gửi ảnh — cần deploy functions');
    if (!data.success) throw new Error(data.error || 'Gửi ảnh LINE thất bại');
}

/** Lưu / cập nhật cấu hình cú pháp lệnh vào Firestore */
export async function syncReportCommandConfig(params: {
    botId: string;
    reportKey: string;
    command: string;
    groupIds?: string[];
}): Promise<void> {
    const cmd = sanitizeReportCommand(params.command);
    if (!cmd || !params.botId) return;
    const now = new Date().toISOString();
    const data = {
        command: cmd,
        reportKey: params.reportKey,
        groupIds: params.groupIds || [],
        updatedAt: now,
    };
    try {
        await Promise.all([
            setDoc(doc(db, 'line_bots', params.botId, 'report_commands', cmd), data, { merge: true }),
        ]);
        console.info(`[LINE] Đã đồng bộ cấu hình lệnh "${cmd}" cho "${params.reportKey}"`);
    } catch (e) {
        console.warn('[LINE] Lỗi lưu cấu hình report_command:', e);
    }
}

/** Lưu ảnh mới nhất cho cú pháp lệnh vào Firestore để LINE bot reply khi có tin nhắn */
export async function saveReportCommandImage(params: {
    botId: string;
    command: string;
    reportKey: string;
    imageUrl: string;
    previewUrl?: string;
    caption?: string;
    uid?: string;
    groupIds?: string[];
}): Promise<void> {
    const cmd = sanitizeReportCommand(params.command);
    if (!cmd || !params.botId) return;
    const now = new Date().toISOString();
    const data = {
        command: cmd,
        reportKey: params.reportKey,
        imageUrl: params.imageUrl,
        previewUrl: params.previewUrl || params.imageUrl,
        caption: params.caption || '',
        updatedAt: now,
        ...(params.uid ? { updatedBy: params.uid } : {}),
        ...(params.groupIds ? { groupIds: params.groupIds } : {}),
    };
    try {
        await Promise.all([
            setDoc(doc(db, 'line_bots', params.botId, 'report_commands', cmd), data, { merge: true }),
        ]);
        console.info(`[LINE] Đã nạp ảnh mới cho lệnh "${cmd}" (${params.reportKey})`);
    } catch (e) {
        console.warn('[LINE] Lỗi cập nhật ảnh cho report_command:', e);
    }
}

/** Nén & nạp ảnh mới nhất lên Firestore cho một cú pháp lệnh (chạy ngầm, không block download) */
export async function syncReportImageForCommand(params: {
    blob: Blob;
    reportKey: string;
    command?: string;
    fileName: string;
    uid: string;
    departmentId?: string | null;
    caption?: string;
    groupIds?: string[];
}): Promise<void> {
    const cmd = sanitizeReportCommand(params.command || getReportCommand(params.reportKey));
    if (!cmd) return;
    const bot = await resolveLineBot(params.uid, params.departmentId);
    if (!bot) return;

    try {
        const img = await prepareLineImage(params.blob);
        const url = await uploadLineImage(img.base64, params.fileName.replace(/\.png$/i, '.jpg'));
        let goc = url;
        if (await lineHdSupported()) {
            try {
                const hd = await prepareLineHdImage(params.blob);
                goc = await uploadLineHdImage(hd.base64, hd.contentType, params.fileName);
            } catch { /* fallback to url */ }
        }

        await saveReportCommandImage({
            botId: bot.botId,
            command: cmd,
            reportKey: params.reportKey,
            imageUrl: goc,
            previewUrl: url,
            caption: params.caption,
            uid: params.uid,
            groupIds: params.groupIds,
        });
    } catch (err) {
        console.warn('[LINE] Lỗi nạp ảnh cho lệnh:', err);
    }
}

/** Gửi 1 ảnh báo cáo (kèm 1 dòng chú thích) vào NHIỀU nhóm LINE. Nén và tải ảnh lên bot_media 1 lần, rồi gửi tới từng nhóm. */
export async function sendReportImageToLineGroups(params: {
    blob: Blob;
    groups: { groupId: string; groupName: string }[];
    caption: string;
    fileName: string;
    uid: string;
    departmentId?: string | null;
    command?: string;
    reportKey?: string;
}): Promise<{ ok: number; errors: string[] }> {
    const bot = await resolveLineBot(params.uid, params.departmentId);
    if (!bot) throw new Error('Chưa cấu hình Bot LINE — vào mục Bot LINE để kết nối bot trước');
    if (!params.groups || params.groups.length === 0) return { ok: 0, errors: [] };

    // Tải ảnh lên 1 lần duy nhất cho toàn bộ danh sách nhóm
    const img = await prepareLineImage(params.blob);
    const url = await uploadLineImage(img.base64, params.fileName.replace(/\.png$/i, '.jpg'));
    let goc = url;
    if (await lineHdSupported()) {
        try {
            const hd = await prepareLineHdImage(params.blob);
            goc = await uploadLineHdImage(hd.base64, hd.contentType, params.fileName);
        } catch (e) {
            console.warn('[LINE] Không tải được bản HD — gửi bản xem trước làm ảnh gốc', e);
        }
    }

    // Tự động đồng bộ/cập nhật ảnh mới cho cú pháp lệnh LINE (ví dụ "bc")
    const effectiveKey = params.reportKey || reportKeyFromFilename(params.fileName);
    const effectiveCmd = sanitizeReportCommand(params.command || getReportCommand(effectiveKey));
    if (effectiveCmd) {
        void saveReportCommandImage({
            botId: bot.botId,
            command: effectiveCmd,
            reportKey: effectiveKey,
            imageUrl: goc,
            previewUrl: url,
            caption: params.caption,
            uid: params.uid,
            groupIds: params.groups.map(g => g.groupId),
        });
    }

    let ok = 0;
    const errors: string[] = [];
    for (const g of params.groups) {
        try {
            await pushViaCloudFunction(bot.botId, g.groupId, goc, params.caption, url);
            ok++;
        } catch (err) {
            errors.push(`${g.groupName || g.groupId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return { ok, errors };
}

/** Gửi 1 ảnh báo cáo (kèm 1 dòng chú thích) vào 1 nhóm LINE. Ném lỗi có câu chữ đọc được nếu không gửi được. */
export async function sendReportImageToLine(params: {
    blob: Blob; groupId: string; caption: string; fileName: string; uid: string; departmentId?: string | null;
}): Promise<void> {
    const res = await sendReportImageToLineGroups({
        blob: params.blob,
        groups: [{ groupId: params.groupId, groupName: params.groupId }],
        caption: params.caption,
        fileName: params.fileName,
        uid: params.uid,
        departmentId: params.departmentId,
    });
    if (res.errors.length > 0) {
        throw new Error(res.errors[0]);
    }
}

/** Cho test e2e: bỏ bộ nhớ đệm bot */
export function __resetLineBotCache() { botCache = null; }
