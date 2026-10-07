import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Audit 2026-10-07 — GĐ1c. Chạy THẬT handler HTTP lineBotWebhook (?action=mark-used / uploadMedia,
 * GET ?mediaId=) trên Firestore giả trong bộ nhớ.
 *  - S06: mark-used cần vé thẻ đúng bot; vé sai/giả bị từ chối, không đổi coupon nào.
 *  - S07: uploadMedia cần ID token, không ghi đè ID có sẵn, chỉ nhận ảnh thật.
 *  - B5 : ảnh lưu với contentType text/html không được phục vụ như HTML.
 */
type Doc = Record<string, any>;
const store = new Map<string, Doc>();
const verifiedTokens = new Map<string, string>(); // idToken -> uid

const docRef = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    get: async () => ({ exists: store.has(path), id: path.split('/').pop(), ref: docRef(path), data: () => store.get(path), get: (k: string) => store.get(path)?.[k] }),
    set: async (v: Doc) => { store.set(path, { ...v }); },
    create: async (v: Doc) => { if (store.has(path)) throw new Error('ALREADY_EXISTS'); store.set(path, { ...v }); },
    update: async (v: Doc) => { store.set(path, { ...(store.get(path) ?? {}), ...v }); },
    collection: (c: string) => colRef(`${path}/${c}`),
});
const colRef = (path: string, filters: [string, unknown][] = []): any => ({
    doc: (id: string) => docRef(`${path}/${id}`),
    where: (k: string, _op: string, v: unknown) => colRef(path, [...filters, [k, v]]),
    orderBy: () => colRef(path, filters),
    limit: () => colRef(path, filters),
    get: async () => {
        const docs = [...store.entries()]
            .filter(([p]) => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes('/'))
            .filter(([, d]) => filters.every(([k, v]) => d[k] === v))
            .map(([p, d]) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => d, get: (k: string) => d[k] }));
        return { empty: docs.length === 0, docs, size: docs.length };
    },
});

vi.mock('../../functions/src/firebaseAdmin', () => ({
    db: {
        collection: (c: string) => colRef(c),
        batch: () => { const ops: (() => Promise<void>)[] = []; return { update: (r: any, v: Doc) => ops.push(() => r.update(v)), commit: async () => { for (const o of ops) await o(); } }; },
        // Transaction giả: chạy tuần tự (JS 1 luồng) — đủ để tái hiện 2 yêu cầu cùng đọc 1 mã UNUSED.
        runTransaction: async (fn: (tx: any) => Promise<unknown>) => fn({
            get: (r: any) => r.get(),
            update: (r: any, v: Doc) => { store.set(r.path, { ...(store.get(r.path) ?? {}), ...v }); },
            set: (r: any, v: Doc) => { store.set(r.path, { ...v }); },
        }),
    },
    stickerDb: {},
    auth: { verifyIdToken: async (t: string) => { const uid = verifiedTokens.get(t); if (!uid) throw new Error('bad token'); return { uid }; } },
}));

const { lineBotWebhook } = await import('../../functions/src/lineBotWebhook');
const { liffTicket } = await import('../../functions/src/liffTicket');

async function call(method: 'GET' | 'POST', query: Doc, body: Doc = {}, headers: Doc = {}) {
    const out: { status: number; json?: any; body?: any; headers: Doc } = { status: 200, headers: {} };
    const res: any = {
        statusCode: 200,
        setHeader: (k: string, v: unknown) => { out.headers[k.toLowerCase()] = v; },
        getHeader: (k: string) => out.headers[k.toLowerCase()],
        status: (s: number) => { out.status = s; return res; },
        json: (j: unknown) => { out.json = j; return res; },
        send: (b: unknown) => { out.body = b; return res; },
        end: () => res,
        on: () => res,
    };
    const req: any = { method, query, body, headers: { origin: 'https://x', ...headers }, rawBody: Buffer.from(JSON.stringify(body)) };
    await (lineBotWebhook as any)(req, res);
    return out;
}

beforeEach(() => {
    store.clear(); verifiedTokens.clear();
    store.set('line_bots/botA', { active: true, channelSecret: 'secret-A', channelAccessToken: 'tokA' });
    store.set('line_bots/botB', { active: true, channelSecret: 'secret-B', channelAccessToken: 'tokB' });
    store.set('line_bots/botA/filtered_coupons/f1', { code: 'MOCK1', status: 'SENT' });
    store.set('line_bots/botB/filtered_coupons/f2', { code: 'MOCK1', status: 'SENT' });
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => ({}) }));
});

describe('S06 — mark-used cần vé thẻ', () => {
    it('vé đúng bot A: chỉ coupon của bot A chuyển USED, bot B giữ nguyên', async () => {
        const r = await call('POST', { action: 'mark-used', code: 'MOCK1', usedBy: 'Nhân', b: 'botA', t: liffTicket('secret-A', 'MOCK1') });
        expect(r.json).toMatchObject({ success: true, updatedCount: 1 });
        expect(store.get('line_bots/botA/filtered_coupons/f1')?.status).toBe('USED');
        expect(store.get('line_bots/botB/filtered_coupons/f2')?.status).toBe('SENT');
    });

    it('vé giả / vé của bot khác bị từ chối 403, không đổi gì', async () => {
        for (const q of [
            { b: 'botA', t: 'deadbeef' },
            { b: 'botA', t: liffTicket('secret-B', 'MOCK1') },
            { b: 'botX', t: liffTicket('secret-A', 'MOCK1') },
            { t: liffTicket('secret-A', 'MOCK1') },
        ]) {
            const r = await call('POST', { action: 'mark-used', code: 'MOCK1', usedBy: 'Giả', ...q });
            expect(r.status).toBe(403);
        }
        expect(store.get('line_bots/botA/filtered_coupons/f1')?.status).toBe('SENT');
        expect(store.get('line_bots/botB/filtered_coupons/f2')?.status).toBe('SENT');
    });

    it('thẻ cũ không vé: từ chối sau mốc chuyển tiếp', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
        const r = await call('POST', { action: 'mark-used', code: 'MOCK1', usedBy: 'X' });
        vi.useRealTimers();
        expect(r.status).toBe(403);
        expect(store.get('line_bots/botA/filtered_coupons/f1')?.status).toBe('SENT');
    });
});

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]).toString('base64');

describe('S07 — uploadMedia', () => {
    it('không có ID token: 401, không ghi', async () => {
        const r = await call('POST', { action: 'uploadMedia' }, { base64: JPEG, contentType: 'image/jpeg', mediaId: 'victim1' });
        expect(r.status).toBe(401);
        expect(store.has('bot_media/victim1')).toBe(false);
    });

    it('có token: tạo ảnh mới; KHÔNG ghi đè ID có sẵn; KHÔNG nhận HTML giả ảnh', async () => {
        verifiedTokens.set('tok-u1', 'u1');
        const auth = { authorization: 'Bearer tok-u1' };
        const ok = await call('POST', { action: 'uploadMedia' }, { base64: JPEG, contentType: 'image/jpeg', mediaId: 'mine_001' }, auth);
        expect(ok.json).toMatchObject({ success: true });
        expect(store.get('bot_media/mine_001')).toMatchObject({ ownerUid: 'u1', contentType: 'image/jpeg' });

        store.set('bot_media/victim1', { base64: JPEG, contentType: 'image/jpeg', ownerUid: 'other' });
        const over = await call('POST', { action: 'uploadMedia' }, { base64: JPEG, contentType: 'image/jpeg', mediaId: 'victim1' }, auth);
        expect(over.json?.success).not.toBe(true);
        expect(store.get('bot_media/victim1')?.ownerUid).toBe('other');

        const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
        const bad = await call('POST', { action: 'uploadMedia' }, { base64: html, contentType: 'text/html', mediaId: 'evil_01' }, auth);
        expect(bad.status).toBe(400);
        expect(store.has('bot_media/evil_01')).toBe(false);
    });
});

describe('B5 — phục vụ ảnh', () => {
    it('document cũ lưu contentType text/html vẫn chỉ trả về dạng ảnh + nosniff', async () => {
        store.set('bot_media/old_html', { base64: Buffer.from('<html>x</html>').toString('base64'), contentType: 'text/html' });
        const r = await call('GET', { mediaId: 'old_html' });
        expect(r.headers['content-type']).toBe('image/jpeg');
        expect(r.headers['x-content-type-options']).toBe('nosniff');
    });
});

const { computeLineSignature } = await import('../../functions/src/lineSignature');
const lineTexts: string[] = [];
let msgSeq = 0;
async function lineEvent(text: string, userId: string) {
    const body = { destination: 'Ubot', events: [{ type: 'message', replyToken: 'r1', source: { type: 'group', groupId: 'Cgroup', userId }, message: { type: 'text', id: `m${++msgSeq}`, text } }] };
    const raw = Buffer.from(JSON.stringify(body));
    const out: any = { headers: {} };
    const res: any = { setHeader: () => res, getHeader: () => undefined, status: (s: number) => { out.status = s; return res; }, json: () => res, send: () => res, end: () => res, on: () => res };
    const req: any = { method: 'POST', query: { uid: 'botA' }, body, rawBody: raw, headers: { 'x-line-signature': computeLineSignature(raw, 'secret-A') } };
    await (lineBotWebhook as any)(req, res);
    return out;
}

describe('S08 — lệnh DUYỆT / huỷ mã trong nhóm LINE', () => {
    beforeEach(() => {
        lineTexts.length = 0;
        vi.stubGlobal('fetch', async (_u: string, init?: any) => {
            try { for (const m of JSON.parse(init?.body ?? '{}').messages ?? []) if (m.text) lineTexts.push(m.text); } catch { /* không phải JSON */ }
            return { ok: true, status: 200, json: async () => ({ displayName: 'Người chat' }) };
        });
        store.set('line_bots/botA/admins/a1', { lineUserId: 'Uadmin', role: 'APPROVER', active: true });
        store.set('line_bots/botA/pending_requests/ORDER1', { status: 'PENDING', requestedProduct: 'PMH', senderUserId: 'Ukhach' });
        store.set('line_bots/botA/coupons/c1', { code: 'C1', status: 'UNUSED', productName: 'PMH' });
        store.set('line_bots/botA/coupons/c2', { code: 'CODE22', status: 'USED', recipientId: 'Ukhach', productName: 'PMH' });
        store.set('line_bots/botA/coupons/c3', { code: 'CODE33', status: 'SENT', recipientId: 'Ukhach', productName: 'PMH' });
    });

    it('người không phải Admin gõ DUYỆT: bị từ chối, yêu cầu vẫn chờ', async () => {
        await lineEvent('DUYỆT', 'Ulaxa');
        expect(lineTexts.some((t) => t.includes('Chỉ Admin'))).toBe(true);
        expect(store.get('line_bots/botA/pending_requests/ORDER1')?.status).toBe('PENDING');
        expect(store.get('line_bots/botA/coupons/c1')?.status).toBe('UNUSED');
    });

    it('không trả mã ĐÃ DÙNG về kho; người lạ không trả được mã của người khác', async () => {
        await lineEvent('huy CODE22', 'Ukhach');
        expect(store.get('line_bots/botA/coupons/c2')?.status).toBe('USED');
        await lineEvent('huy CODE33', 'Ulaxa');
        expect(store.get('line_bots/botA/coupons/c3')?.status).toBe('SENT');
        await lineEvent('huy CODE33', 'Ukhach');
        expect(store.get('line_bots/botA/coupons/c3')?.status).toBe('UNUSED');
    });
});

describe('D09 — 2 lệnh DUYỆT cùng lúc không cấp 1 mã cho 2 người', () => {
    beforeEach(() => {
        lineTexts.length = 0;
        vi.stubGlobal('fetch', async (_u: string, init?: any) => {
            try { for (const m of JSON.parse(init?.body ?? '{}').messages ?? []) if (m.text) lineTexts.push(m.text); } catch { /* không phải JSON */ }
            return { ok: true, status: 200, json: async () => ({ displayName: 'Admin' }) };
        });
        store.set('line_bots/botA/admins/a1', { lineUserId: 'Uadmin', role: 'APPROVER', active: true });
        store.set('line_bots/botA/pending_requests/ORDER111', { status: 'PENDING', requestedProduct: 'PMH', senderUserId: 'U1', orderId: 'ORDER111' });
        store.set('line_bots/botA/pending_requests/ORDER222', { status: 'PENDING', requestedProduct: 'PMH', senderUserId: 'U2', orderId: 'ORDER222' });
        store.set('line_bots/botA/coupons/only', { code: 'ONLYONE1', status: 'UNUSED', productName: 'PMH', type: 'PMH' });
    });

    it('chỉ 1 yêu cầu nhận mã, yêu cầu kia được báo gửi lại', async () => {
        await Promise.all([lineEvent('DUYỆT ORDER111', 'Uadmin'), lineEvent('DUYỆT ORDER222', 'Uadmin')]);
        const approved = ['ORDER111', 'ORDER222'].filter((o) => store.get(`line_bots/botA/pending_requests/${o}`)?.status === 'APPROVED');
        expect(approved).toHaveLength(1);
        const recipient = store.get('line_bots/botA/coupons/only')?.recipientId;
        expect(recipient === 'U1' || recipient === 'U2').toBe(true);
        expect(lineTexts.some((t) => t.includes('đã được cấp cho người khác'))).toBe(true);
    });
});

const { isUsedOnVnDay } = await import('../../functions/src/lineBotScheduler');
describe('D10 — báo cáo theo NGÀY VIỆT NAM', () => {
    it('lượt dùng 06:30 sáng giờ VN (23:30 UTC hôm trước) được tính vào hôm nay', () => {
        expect(isUsedOnVnDay('2026-10-06T23:30:00.000Z', '2026-10-07')).toBe(true);
        expect(isUsedOnVnDay('2026-10-07T17:30:00.000Z', '2026-10-07')).toBe(false); // 00:30 ngày 8 giờ VN
        expect(isUsedOnVnDay('', '2026-10-07')).toBe(false);
    });
});
