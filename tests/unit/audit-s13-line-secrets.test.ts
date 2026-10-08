import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Audit S13/S14/B3 — bí mật Bot LINE ở `line_bot_secrets`, không ở `line_bots`.
 * Chạy THẬT handler lineBotWebhook trên Firestore giả. Kiểm:
 *  - đọc có dự phòng (chưa di trú vẫn chạy; đã di trú thì bí mật thắng, kể cả khi line_bots không còn field);
 *  - botId + ID token: chủ bot / admin / manager CÙNG Kho dùng được, manager Kho khác và người lạ bị chặn;
 *  - token KHÔNG bao giờ có trong phản hồi; saveSecrets chỉ chủ bot/admin, ghi cờ hasToken không ghi giá trị.
 */
type Doc = Record<string, any>;
const store = new Map<string, Doc>();
const idTokens = new Map<string, Doc>(); // idToken -> claims
const lineCalls: { url: string; auth: string; body: any }[] = [];

const docRef = (path: string): any => ({
    id: path.split('/').pop(), path,
    get: async () => ({ exists: store.has(path), id: path.split('/').pop(), ref: docRef(path), data: () => store.get(path), get: (k: string) => store.get(path)?.[k] }),
    set: async (v: Doc, o?: { merge?: boolean }) => { store.set(path, o?.merge ? { ...(store.get(path) ?? {}), ...v } : { ...v }); },
    create: async (v: Doc) => { store.set(path, { ...v }); },
    update: async (v: Doc) => { store.set(path, { ...(store.get(path) ?? {}), ...v }); },
    collection: (c: string) => colRef(`${path}/${c}`),
});
const colRef = (path: string, filters: [string, unknown][] = []): any => ({
    doc: (id: string) => docRef(`${path}/${id}`),
    where: (k: string, _op: string, v: unknown) => colRef(path, [...filters, [k, v]]),
    orderBy: () => colRef(path, filters), limit: () => colRef(path, filters),
    get: async () => {
        const docs = [...store.entries()]
            .filter(([p]) => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes('/'))
            .filter(([, d]) => filters.every(([k, v]) => d[k] === v))
            .map(([p, d]) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => d }));
        return { empty: docs.length === 0, docs, size: docs.length };
    },
});
vi.mock('../../functions/src/firebaseAdmin', () => ({
    db: { collection: (c: string) => colRef(c), batch: () => ({ update() {}, commit: async () => {} }), runTransaction: async (fn: any) => fn({ get: (r: any) => r.get(), update() {}, set() {} }) },
    stickerDb: {},
    auth: { verifyIdToken: async (t: string) => { const c = idTokens.get(t); if (!c) throw new Error('bad'); return c; } },
}));

const { lineBotWebhook } = await import('../../functions/src/lineBotWebhook');
const { withSecrets, canCallerUseBot, findBotUidByRelayToken } = await import('../../functions/src/lineBotSecrets');

async function call(query: Doc, body: Doc = {}, idToken?: string) {
    const out: { status: number; json?: any } = { status: 200 };
    const res: any = { setHeader() {}, getHeader() {}, status: (s: number) => { out.status = s; return res; }, json: (j: unknown) => { out.json = j; return res; }, send: () => res, end: () => res, on: () => res };
    const headers: Doc = { origin: 'https://x' };
    if (idToken) headers.authorization = `Bearer ${idToken}`;
    await (lineBotWebhook as any)({ method: 'POST', query, body, headers, rawBody: Buffer.from(JSON.stringify(body)) }, res);
    return out;
}

beforeEach(() => {
    store.clear(); idTokens.clear(); lineCalls.length = 0;
    // Bot Kho 910 của owner1: bí mật CHỈ ở line_bot_secrets (đã di trú), line_bots không còn token.
    store.set('line_bots/owner1', { active: true, departmentId: '910', hasToken: true });
    store.set('line_bot_secrets/owner1', { channelAccessToken: 'TOKEN-OWNER1', channelSecret: 'SEC-OWNER1', pmhRelayToken: 'RELAY-1' });
    idTokens.set('t-owner', { uid: 'owner1', role: 'manager', departmentId: '910' });
    idTokens.set('t-admin', { uid: 'adm', role: 'admin', departmentId: 'ALL' });
    idTokens.set('t-mgr-same', { uid: 'm1', role: 'manager', departmentId: '910,911' });
    idTokens.set('t-mgr-other', { uid: 'm2', role: 'manager', departmentId: '555' });
    idTokens.set('t-staff', { uid: 's1', role: 'user', departmentId: '910' });
    vi.stubGlobal('fetch', async (url: string, init: any) => {
        lineCalls.push({ url, auth: init?.headers?.Authorization, body: init?.body ? JSON.parse(init.body) : null });
        return { ok: true, status: 200, json: async () => ({ displayName: 'Bot' }) };
    });
});

describe('S1 — đọc bí mật có dự phòng', () => {
    it('đã di trú: bí mật thắng dù line_bots không còn field', async () => {
        const c = await withSecrets('owner1', store.get('line_bots/owner1'));
        expect(c.channelAccessToken).toBe('TOKEN-OWNER1');
        expect(c.channelSecret).toBe('SEC-OWNER1');
    });
    it('chưa di trú: dùng field cũ trong line_bots', async () => {
        store.set('line_bots/old', { channelAccessToken: 'OLD-TOK', channelSecret: 'OLD-SEC' });
        const c = await withSecrets('old', store.get('line_bots/old'));
        expect(c.channelAccessToken).toBe('OLD-TOK');
    });
    it('tìm bot theo pmhRelayToken ở cả bí mật lẫn field cũ', async () => {
        store.set('line_bots/old', { pmhRelayToken: 'RELAY-OLD' });
        expect(await findBotUidByRelayToken('RELAY-1')).toBe('owner1');
        expect(await findBotUidByRelayToken('RELAY-OLD')).toBe('old');
        expect(await findBotUidByRelayToken('khong-co')).toBeNull();
    });
    it('webhook chữ ký đọc Channel secret từ line_bot_secrets', async () => {
        const out = await call({ uid: 'owner1' }, { events: [{ type: 'message' }] });
        // không có chữ ký → 401 chứ KHÔNG phải "Channel secret not configured" ⇒ đã thấy secret ở kho bí mật
        expect(out.status).toBe(401);
    });
});

describe('S2 — quyền dùng bot qua botId', () => {
    it('canCallerUseBot khớp luật rules: chủ, admin, manager cùng Kho', () => {
        const bot = { departmentId: '910' };
        expect(canCallerUseBot({ uid: 'owner1' }, 'owner1', bot)).toBe(true);
        expect(canCallerUseBot({ uid: 'x', role: 'admin' }, 'owner1', bot)).toBe(true);
        expect(canCallerUseBot({ uid: 'm1', role: 'manager', departmentId: '910,911' }, 'owner1', bot)).toBe(true);
        expect(canCallerUseBot({ uid: 'm2', role: 'manager', departmentId: '555' }, 'owner1', bot)).toBe(false);
        expect(canCallerUseBot({ uid: 's1', role: 'user', departmentId: '910' }, 'owner1', bot)).toBe(false);
    });
    it('manager cùng Kho gửi được qua bot Kho; LINE nhận ĐÚNG token của bot, phản hồi không chứa token', async () => {
        const out = await call({ action: 'sendTestPush' }, { botId: 'owner1', toUserId: 'U' + 'a'.repeat(32), text: 'hi' }, 't-mgr-same');
        expect(out.json.success).toBe(true);
        expect(lineCalls[0].auth).toBe('Bearer TOKEN-OWNER1');
        expect(JSON.stringify(out.json)).not.toContain('TOKEN-OWNER1');
    });
    it('manager Kho khác / nhân viên / người chưa đăng nhập bị chặn, LINE không bị gọi', async () => {
        for (const t of ['t-mgr-other', 't-staff']) {
            const out = await call({ action: 'sendBroadcast' }, { botId: 'owner1', text: 'x' }, t);
            expect(out.status).toBe(403);
        }
        const anon = await call({ action: 'sendBroadcast' }, { botId: 'owner1', text: 'x' });
        expect(anon.status).toBe(401);
        expect(lineCalls).toHaveLength(0);
    });
    it('không có botId: vẫn kiểm được token do người dùng tự gõ (khi lưu token mới)', async () => {
        const out = await call({ action: 'verifyToken' }, { token: 'TOKEN-MOI' });
        expect(out.json.success).toBe(true);
        expect(lineCalls[0].auth).toBe('Bearer TOKEN-MOI');
    });
});

describe('S2 — saveSecrets', () => {
    it('chủ bot lưu token mới: ghi vào line_bot_secrets, line_bots chỉ có cờ, không có giá trị', async () => {
        const out = await call({ action: 'saveSecrets' }, { botId: 'owner1', channelAccessToken: ' TOKEN-NEW ' }, 't-owner');
        expect(out.json).toMatchObject({ success: true, hasToken: true });
        expect(store.get('line_bot_secrets/owner1')?.channelAccessToken).toBe('TOKEN-NEW');
        expect(store.get('line_bot_secrets/owner1')?.channelSecret).toBe('SEC-OWNER1'); // field không gửi = giữ nguyên
        expect(JSON.stringify(store.get('line_bots/owner1'))).not.toContain('TOKEN-NEW');
    });
    it('manager cùng Kho KHÔNG được đổi token của bot Kho; người lạ cũng không', async () => {
        for (const t of ['t-mgr-same', 't-staff']) {
            const out = await call({ action: 'saveSecrets' }, { botId: 'owner1', channelAccessToken: 'CHIEM' }, t);
            expect(out.status).toBe(403);
        }
        expect(store.get('line_bot_secrets/owner1')?.channelAccessToken).toBe('TOKEN-OWNER1');
    });
    it('admin được đổi; mặc định botId = chính mình', async () => {
        expect((await call({ action: 'saveSecrets' }, { botId: 'owner1', channelSecret: 'S2' }, 't-admin')).json.success).toBe(true);
        await call({ action: 'saveSecrets' }, { channelAccessToken: 'MINE' }, 't-mgr-same');
        expect(store.get('line_bot_secrets/m1')?.channelAccessToken).toBe('MINE');
    });
});
