import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

/**
 * Chạy ĐÚNG hàm lineBotWebhook (functions/src/lineBotWebhook.ts) với Firestore giả: sự kiện LINE không có/sai chữ ký
 * hoặc bot chưa nhập Channel secret thì KHÔNG được xử lý (không ghi/đọc thêm gì sau bước tải cấu hình bot).
 */
const state = { bot: {} as Record<string, unknown>, ops: [] as string[] };

const docApi = (path: string): any => ({
    get: async () => { state.ops.push(`get ${path}`); return { exists: path === 'line_bots/uid1', id: 'uid1', data: () => (path === 'line_bots/uid1' ? state.bot : {}) }; },
    set: async () => { state.ops.push(`set ${path}`); },
    update: async () => { state.ops.push(`update ${path}`); },
    collection: (c: string) => colApi(`${path}/${c}`),
});
const colApi = (path: string): any => ({
    doc: (id: string) => docApi(`${path}/${id}`),
    where: () => colApi(path),
    limit: () => colApi(path),
    get: async () => { state.ops.push(`query ${path}`); return { empty: true, docs: [] }; },
    add: async () => { state.ops.push(`add ${path}`); },
});
vi.mock('../../functions/src/firebaseAdmin', () => ({ db: { collection: (c: string) => colApi(c) }, stickerDb: {} }));

const { lineBotWebhook } = await import('../../functions/src/lineBotWebhook');
const handler = lineBotWebhook as unknown as (req: any, res: any) => Promise<void>;

const SECRET = 'kenh-bi-mat';
const body = { destination: 'Ubot', events: [{ type: 'memberJoined', source: { type: 'group', groupId: 'C1' }, timestamp: 1 }] };
const raw = JSON.stringify(body);
const sign = (s: string, secret = SECRET) => createHmac('sha256', secret).update(s).digest('base64');

async function goi(headers: Record<string, string>, rawBody = raw) {
    const out = { status: 0, body: '' as unknown };
    // Hàm thật được bọc bởi onRequest của firebase-functions (có CORS) → phản hồi giả cần đủ API kiểu Express.
    const hdr: Record<string, unknown> = {};
    const res: any = {
        statusCode: 200, headersSent: false,
        status(c: number) { out.status = c; res.statusCode = c; return res; },
        send(b: unknown) { out.body = b; if (!out.status) out.status = res.statusCode; return res; },
        json(b: unknown) { out.body = b; if (!out.status) out.status = res.statusCode; return res; },
        end() { if (!out.status) out.status = res.statusCode; return res; },
        setHeader(k: string, v: unknown) { hdr[k.toLowerCase()] = v; }, getHeader(k: string) { return hdr[k.toLowerCase()]; },
        removeHeader(k: string) { delete hdr[k.toLowerCase()]; }, header(k: string, v: unknown) { hdr[k.toLowerCase()] = v; return res; },
        on() { return res; }, once() { return res; }, emit() { return true; },
    };
    const req: any = { method: 'POST', url: '/', query: { uid: 'uid1' }, headers, body: JSON.parse(rawBody), rawBody: Buffer.from(rawBody),
        header(k: string) { return headers[k.toLowerCase()]; }, get(k: string) { return headers[k.toLowerCase()]; }, on() { return req; } };
    await handler(req, res);
    await new Promise((r) => setTimeout(r, 30));
    return out;
}

beforeEach(() => {
    state.bot = { channelAccessToken: 'tok', channelSecret: SECRET, active: true };
    state.ops = [];
});

describe('webhook LINE: kiểm chữ ký trước khi xử lý sự kiện', () => {
    it('không có chữ ký → 401, không xử lý sự kiện nào', async () => {
        const r = await goi({});
        expect(r.status).toBe(401);
        expect(state.ops).toEqual(['get line_bots/uid1']);
    });
    it('chữ ký ký bằng secret khác (kẻ giả mạo) → 401', async () => {
        const r = await goi({ 'x-line-signature': sign(raw, 'secret-doan-bua') });
        expect(r.status).toBe(401);
        expect(state.ops).toEqual(['get line_bots/uid1']);
    });
    it('thân bị sửa sau khi ký → 401', async () => {
        const sua = raw.replace('C1', 'C2');
        const r = await goi({ 'x-line-signature': sign(raw) }, sua);
        expect(r.status).toBe(401);
    });
    it('bot CHƯA nhập Channel secret → bỏ qua sự kiện (200 để LINE không báo lỗi webhook), không xử lý', async () => {
        state.bot = { channelAccessToken: 'tok', active: true };
        const r = await goi({ 'x-line-signature': sign(raw) });
        expect(r.status).toBe(200);
        expect(r.body).toBe('Channel secret not configured');
        expect(state.ops).toEqual(['get line_bots/uid1']);
    });
    it('chữ ký đúng → đi tiếp vào xử lý sự kiện', async () => {
        const r = await goi({ 'x-line-signature': sign(raw) });
        expect(r.status).not.toBe(401);
        expect(r.body).not.toBe('Channel secret not configured');
    });
});
