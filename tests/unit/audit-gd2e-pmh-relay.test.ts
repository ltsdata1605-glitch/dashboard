/**
 * Audit 2026-10-07 — D18. Chạy THẬT pmhRelayPoll / pmhRelayComplete trên Firestore giả trong bộ nhớ.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Doc = Record<string, any>;
const store = new Map<string, Doc>();
const pushes: unknown[] = [];

const docRef = (path: string): any => ({
    id: path.split('/').pop(), path,
    get: async () => ({ exists: store.has(path), id: path.split('/').pop(), ref: docRef(path), data: () => store.get(path), get: (k: string) => store.get(path)?.[k] }),
    update: async (v: Doc) => { store.set(path, { ...(store.get(path) ?? {}), ...v }); },
    set: async (v: Doc) => { store.set(path, { ...v }); },
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
        return { empty: docs.length === 0, docs };
    },
});
vi.mock('../../functions/src/firebaseAdmin', () => ({
    db: {
        collection: (c: string) => colRef(c),
        batch: () => { const ops: (() => Promise<void>)[] = []; return { update: (r: any, v: Doc) => ops.push(() => r.update(v)), set: (r: any, v: Doc) => ops.push(() => r.set(v)), commit: async () => { for (const o of ops) await o(); } }; },
        runTransaction: async (fn: (tx: any) => Promise<unknown>) => fn({
            get: (r: any) => r.get(),
            update: (r: any, v: Doc) => { store.set(r.path, { ...(store.get(r.path) ?? {}), ...v }); },
        }),
    },
    stickerDb: {},
    auth: {},
}));

const { pmhRelayPoll, pmhRelayComplete } = await import('../../functions/src/pmhRelay');

async function call(fn: unknown, method: string, body: Doc = {}) {
    const out: any = { status: 200 };
    const res: any = {
        setHeader: () => res, getHeader: () => undefined, on: () => res, end: () => res,
        status: (s: number) => { out.status = s; return res; },
        json: (j: unknown) => { out.json = j; return res; },
        send: (b: unknown) => { out.body = b; return res; },
    };
    const req: any = { method, query: {}, body, headers: { authorization: 'Bearer relay-token-123', origin: 'https://x' } };
    await (fn as any)(req, res);
    return out;
}

beforeEach(() => {
    store.clear(); pushes.length = 0;
    store.set('line_bots/botA', { pmhRelayToken: 'relay-token-123', channelAccessToken: 'tok', groupId: 'Cg' });
    store.set('pmh_relay_queue/job1', { ownerUid: 'botA', status: 'pending', form: 'FORM-1', createdAt: 1, groupId: 'Cg', senderName: 'A' });
    vi.stubGlobal('fetch', async (_u: string, init?: any) => { pushes.push(init?.body); return { ok: true, status: 200, json: async () => ({ sentMessages: [] }) }; });
});

describe('D18 — hàng đợi PMH relay', () => {
    it('2 tab poll cùng lúc: việc chỉ giao cho đúng 1 tab', async () => {
        const [a, b] = await Promise.all([call(pmhRelayPoll, 'GET'), call(pmhRelayPoll, 'GET')]);
        const total = (a.json.items.length as number) + (b.json.items.length as number);
        expect(total).toBe(1);
    });

    it('việc đang làm mà tab chết: quá hạn giữ thì lượt poll sau lấy lại được', async () => {
        await call(pmhRelayPoll, 'GET');
        expect((await call(pmhRelayPoll, 'GET')).json.items).toHaveLength(0); // còn trong hạn
        store.set('pmh_relay_queue/job1', { ...store.get('pmh_relay_queue/job1'), leaseUntil: Date.now() - 1 });
        expect((await call(pmhRelayPoll, 'GET')).json.items).toHaveLength(1);
    });

    it('gửi kết quả 2 lần: chỉ đẩy LINE 1 lần', async () => {
        await call(pmhRelayPoll, 'GET');
        const body = { id: 'job1', codes: [{ kho: '910', type: '100K', code: 'ABCD1234' }], errors: [] };
        await call(pmhRelayComplete, 'POST', body);
        const pushesAfterFirst = pushes.length;
        const second = await call(pmhRelayComplete, 'POST', body);
        expect(second.json).toMatchObject({ duplicate: true });
        expect(pushes.length).toBe(pushesAfterFirst);
    });
});
