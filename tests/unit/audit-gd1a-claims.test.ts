import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Audit 2026-10-07 — GĐ1a. Chạy THẬT resolveSession / adminUpdateUser / stickerResolveSession trên
 * Auth/Firestore giả, soi custom claims cuối cùng (thứ firestore.rules dựa vào):
 *  - S03: user chưa duyệt tự chọn Kho → token KHÔNG mang Kho đó.
 *  - S04: admin "Thu hồi" (status expired) → token mất quyền manager + Kho ngay ở lần ghi claims.
 *  - S05: đăng nhập app gốc và In Sticker theo bất kỳ thứ tự nào → giữ đủ cả 2 bộ claims.
 */
type Doc = Record<string, unknown>;
const users = new Map<string, Doc>();
const stickerUsers = new Map<string, Doc>();
const claims = new Map<string, Record<string, unknown>>();

const docApi = (store: Map<string, Doc>, id: string) => ({
    get: async () => ({ exists: store.has(id), data: () => store.get(id), get: (k: string) => store.get(id)?.[k] }),
    set: async (v: Doc) => { store.set(id, { ...v }); },
    update: async (v: Doc) => {
        const cur = { ...(store.get(id) ?? {}) };
        for (const [k, val] of Object.entries(v)) if (typeof val !== 'object' || val === null) cur[k] = val;
        store.set(id, cur);
    },
});
const emptyQuery: any = { where: () => emptyQuery, limit: () => emptyQuery, get: async () => ({ empty: true, docs: [] }) };

vi.mock('../../functions/src/firebaseAdmin', () => {
    const mk = (store: Map<string, Doc>) => ({ collection: () => ({ doc: (id: string) => docApi(store, id), where: () => emptyQuery }) });
    return {
        db: mk(users),
        stickerDb: mk(stickerUsers),
        STICKER_DB_ID: '(default)',
        auth: {
            getUser: async (uid: string) => ({ uid, customClaims: claims.get(uid), metadata: { creationTime: 'Mon, 01 Jan 2024 00:00:00 GMT' } }),
            setCustomUserClaims: async (uid: string, c: Record<string, unknown>) => { claims.set(uid, { ...c }); },
        },
    };
});
vi.mock('../../functions/src/notifications', () => ({ notifyAdminsAndManagers: async () => {}, notifyUser: async () => {} }));

const { resolveSession } = await import('../../functions/src/session');
const { adminUpdateUser } = await import('../../functions/src/admin');
const { stickerResolveSession } = await import('../../functions/src/stickerEvent');
const run = (fn: unknown, req: unknown) => (fn as { run: (r: unknown) => Promise<any> }).run(req);
const asUser = (uid: string, token: Doc = {}) => ({ auth: { uid, token: { email: `${uid}@gmail.test`, email_verified: true, ...token } } });

beforeEach(() => { users.clear(); stickerUsers.clear(); claims.clear(); });

describe('S03 — chưa duyệt không có quyền Kho', () => {
    it('user pending tự chọn Kho 910: hồ sơ giữ Kho, token KHÔNG mang Kho', async () => {
        users.set('u1', { role: 'pending', status: 'pending', departmentId: '910' });
        const profile = await run(resolveSession, asUser('u1'));
        expect(profile).toMatchObject({ role: 'pending', departmentId: '910', claimRole: 'pending', claimDepartmentId: null });
        expect(claims.get('u1')).toMatchObject({ role: 'pending', departmentId: null });
    });

    it('nhân viên đã duyệt vẫn có Kho trong token', async () => {
        users.set('u2', { role: 'employee', status: 'approved', departmentId: '910' });
        await run(resolveSession, asUser('u2'));
        expect(claims.get('u2')).toMatchObject({ role: 'employee', departmentId: '910' });
    });
});

describe('S04 — thu hồi có hiệu lực', () => {
    it('admin đặt status expired cho manager → token về pending, không còn Kho; đăng nhập lại vẫn vậy', async () => {
        users.set('mgr', { role: 'manager', status: 'approved', departmentId: '910' });
        await run(resolveSession, asUser('mgr'));
        expect(claims.get('mgr')).toMatchObject({ role: 'manager', departmentId: '910' });

        await run(adminUpdateUser, { auth: { uid: 'boss', token: { role: 'admin' } }, data: { targetUid: 'mgr', status: 'expired' } });
        expect(claims.get('mgr')).toMatchObject({ role: 'pending', departmentId: null });

        await run(resolveSession, asUser('mgr'));
        expect(claims.get('mgr')).toMatchObject({ role: 'pending', departmentId: null });
    });
});

describe('S05 — 2 app không xoá claims của nhau', () => {
    it('đăng nhập In Sticker rồi app gốc (và ngược lại) giữ đủ cả 2 bộ', async () => {
        users.set('dual', { role: 'manager', status: 'approved', departmentId: '910' });
        stickerUsers.set('dual', { role: 'admin', storeId: 'K1', username: 'dual' });

        await run(stickerResolveSession, asUser('dual'));
        await run(resolveSession, asUser('dual'));
        expect(claims.get('dual')).toEqual({ stickerRole: 'admin', stickerStoreId: 'K1', role: 'manager', departmentId: '910' });

        await run(stickerResolveSession, asUser('dual'));
        expect(claims.get('dual')).toEqual({ stickerRole: 'admin', stickerStoreId: 'K1', role: 'manager', departmentId: '910' });
    });
});
