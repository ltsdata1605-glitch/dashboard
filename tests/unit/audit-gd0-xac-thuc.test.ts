import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Audit 2026-10-07 — Giai đoạn 0 (vá khẩn). Chạy THẬT thân các callable trên Auth/Firestore giả:
 *  - S01/B1: luồng Nhân viên In Sticker (không mật khẩu, chủ dự án chốt giữ nguyên) KHÔNG được
 *    đổi mật khẩu/hồ sơ/claims hay tạo token cho tài khoản không phải nhân viên.
 *  - S02: username '21707'/'admin' không còn tự cấp superadmin.
 *  - S10: OCR phiếu lương không gọi Gemini khi chưa đăng nhập.
 */
type UserRec = { uid: string; email: string; providerData: { providerId: string }[]; metadata: { creationTime: string } };
const authUsers = new Map<string, UserRec>();
const stickerUsers = new Map<string, Record<string, unknown>>();
const events: string[] = [];

const docRef = (id: string) => ({
    get: async () => ({ exists: stickerUsers.has(id), data: () => stickerUsers.get(id), get: (k: string) => stickerUsers.get(id)?.[k] }),
    set: async (v: Record<string, unknown>) => { events.push(`set:${id}`); stickerUsers.set(id, { ...(stickerUsers.get(id) ?? {}), ...v }); },
});
const query = (filters: [string, unknown][]) => ({
    where: (k: string, _op: string, v: unknown) => query([...filters, [k, v]]),
    limit: () => query(filters),
    get: async () => {
        const docs = [...stickerUsers.entries()].filter(([, d]) => filters.every(([k, v]) => d[k] === v));
        return { empty: docs.length === 0, docs: docs.map(([id, d]) => ({ id, data: () => d, get: (k: string) => d[k] })) };
    },
});

vi.mock('../../functions/src/firebaseAdmin', () => {
    const stickerDb = { collection: () => ({ doc: docRef, where: (k: string, _o: string, v: unknown) => query([[k, v]]) }) };
    const auth = {
        getUserByEmail: async (email: string) => {
            const u = [...authUsers.values()].find((x) => x.email === email.toLowerCase());
            if (!u) throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
            return u;
        },
        getUser: async (uid: string) => authUsers.get(uid)!,
        updateUser: async (uid: string) => { events.push(`updatePassword:${uid}`); },
        createUser: async ({ email }: { email: string }) => {
            const u: UserRec = { uid: `new-${email}`, email, providerData: [{ providerId: 'password' }], metadata: { creationTime: new Date().toUTCString() } };
            authUsers.set(u.uid, u); events.push(`createUser:${u.uid}`); return u;
        },
        setCustomUserClaims: async (uid: string, c: Record<string, unknown>) => { events.push(`claims:${uid}:${JSON.stringify(c)}`); },
        createCustomToken: async (uid: string) => { events.push(`token:${uid}`); return `tok-${uid}`; },
    };
    return { auth, stickerDb, db: stickerDb, STICKER_DB_ID: '(default)' };
});

const geminiCalls: unknown[] = [];
vi.mock('@google/genai', () => ({
    GoogleGenAI: class { models = { generateContent: async (x: unknown) => { geminiCalls.push(x); return { text: '{}' }; } }; },
    Type: new Proxy({}, { get: (_t, p) => String(p) }),
}));

const { stickerStaffAuth, stickerRegister } = await import('../../functions/src/stickerEvent');
const { parseSalarySlipWithGemini } = await import('../../functions/src/gemini');
type Runnable = { run: (req: unknown) => Promise<any> };
const run = (fn: unknown, req: unknown) => (fn as Runnable).run(req);

const addUser = (uid: string, email: string, providers: string[], created = '2026-01-01T00:00:00Z') =>
    authUsers.set(uid, { uid, email, providerData: providers.map((providerId) => ({ providerId })), metadata: { creationTime: new Date(created).toUTCString() } });

beforeEach(() => {
    authUsers.clear(); stickerUsers.clear(); events.length = 0; geminiCalls.length = 0;
    addUser('owner', 'owner@gmail.test', ['google.com']);
    addUser('kho-admin', 'quanly@example.com', ['password']);
    stickerUsers.set('kho-admin', { role: 'admin', storeId: 'K1', username: 'quanly' });
    addUser('nv1', 'nv1@example.com', ['password']);
    stickerUsers.set('nv1', { role: 'staff', storeId: 'K1', username: 'nv1' });
});

const mutations = () => events.filter((e) => !e.startsWith('noop'));

describe('GĐ0 — luồng Nhân viên In Sticker không chạm tài khoản khác', () => {
    it('username chứa @ (email tài khoản Google) bị từ chối, không có thao tác ghi nào', async () => {
        for (const isLogin of [true, false]) {
            await expect(run(stickerStaffAuth, { data: { username: 'owner@gmail.test', storeId: 'K1', isLogin } }))
                .rejects.toMatchObject({ code: 'invalid-argument' });
        }
        expect(mutations()).toEqual([]);
    });

    it('"đăng ký nhân viên" đè lên Admin kho bị từ chối trước khi đổi mật khẩu', async () => {
        await expect(run(stickerStaffAuth, { data: { username: 'quanly', storeId: 'K1', isLogin: false } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(mutations()).toEqual([]);
        expect(stickerUsers.get('kho-admin')?.role).toBe('admin');
    });

    it('tài khoản @example.com có liên kết Google cũng bị từ chối', async () => {
        addUser('lai', 'lai@example.com', ['password', 'google.com']);
        await expect(run(stickerStaffAuth, { data: { username: 'lai', storeId: 'K1', isLogin: false } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(mutations()).toEqual([]);
    });

    it('username dành riêng (21707/admin) không đi được luồng nhân viên', async () => {
        await expect(run(stickerStaffAuth, { data: { username: '21707', storeId: 'K1', isLogin: true } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(mutations()).toEqual([]);
    });

    it('nhân viên thật vẫn đăng nhập & đăng ký như cũ (giữ nguyên hành vi)', async () => {
        const login = await run(stickerStaffAuth, { data: { username: 'nv1', isLogin: true } });
        expect(login).toMatchObject({ customToken: 'tok-nv1', role: 'staff', storeId: 'K1' });

        const reg = await run(stickerStaffAuth, { data: { username: 'nvmoi', storeId: 'K1', isLogin: false } });
        expect(reg).toMatchObject({ role: 'staff', storeId: 'K1' });
        expect(stickerUsers.get('new-nvmoi@example.com')).toMatchObject({ role: 'staff', storeId: 'K1' });
    });
});

describe('GĐ0 — superadmin không còn suy ra từ username', () => {
    it('user thường đăng ký username 21707 bị từ chối, không nhận claim superadmin', async () => {
        addUser('ke-gian', 'kegian@gmail.test', ['google.com']);
        await expect(run(stickerRegister, {
            auth: { uid: 'ke-gian', token: { email: 'kegian@gmail.test', email_verified: true } },
            data: { username: '21707', storeId: 'X9', requestedRole: 'admin' },
        })).rejects.toMatchObject({ code: 'permission-denied' });
        expect(events.some((e) => e.includes('superadmin'))).toBe(false);
    });

    it('tài khoản 21707@example.com tạo SAU mốc vá không được superadmin', async () => {
        addUser('moi-tao', '21707@example.com', ['password'], '2026-10-07T10:00:00Z');
        await run(stickerRegister, {
            auth: { uid: 'moi-tao', token: { email: '21707@example.com', email_verified: false } },
            data: { username: 'abc', storeId: 'X8', requestedRole: 'admin' },
        });
        expect(events.find((e) => e.startsWith('claims:moi-tao'))).toContain('"stickerRole":"admin"');
    });

    it('tài khoản superadmin cũ (tạo trước mốc vá) vẫn giữ superadmin', async () => {
        addUser('cu', '21707@example.com', ['password'], '2025-05-01T00:00:00Z');
        await run(stickerRegister, {
            auth: { uid: 'cu', token: { email: '21707@example.com', email_verified: false } },
            data: { username: '21707', requestedRole: 'admin' },
        });
        expect(events.find((e) => e.startsWith('claims:cu'))).toContain('"stickerRole":"superadmin"');
    });
});

describe('GĐ0 — OCR phiếu lương', () => {
    it('chưa đăng nhập: từ chối, không gọi Gemini', async () => {
        await expect(run(parseSalarySlipWithGemini, { data: { base64Data: 'AAAA', mimeType: 'image/jpeg', targetSlip: 'day5' } }))
            .rejects.toMatchObject({ code: 'unauthenticated' });
        expect(geminiCalls).toHaveLength(0);
    });

    it('MIME lạ hoặc ảnh quá lớn: từ chối, không gọi Gemini', async () => {
        const auth = { uid: 'nv1', token: {} };
        await expect(run(parseSalarySlipWithGemini, { auth, data: { base64Data: 'AAAA', mimeType: 'text/html' } }))
            .rejects.toMatchObject({ code: 'invalid-argument' });
        await expect(run(parseSalarySlipWithGemini, { auth, data: { base64Data: 'A'.repeat(6_000_001), mimeType: 'image/jpeg' } }))
            .rejects.toMatchObject({ code: 'invalid-argument' });
        expect(geminiCalls).toHaveLength(0);
    });
});
