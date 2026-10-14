import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 2 "thiết bị" cùng tài khoản, chung 1 doc Firestore giả, mỗi máy 1 IndexedDB giả — chạy đúng hàm thật
 * services/lightSync.ts (đẩy/kéo theo từng khoá). Kịch bản lỗi cũ: A sửa X, B sửa Y → B đẩy cả bộ, X của A mất.
 */
type Store = Map<string, unknown>;
let cloudDoc: Record<string, any> | null = null;
let mayHienTai: Store = new Map();

vi.mock('../../services/firebase', () => ({ db: {} }));
vi.mock('../../utils/localDbScope', () => ({ isLightSyncKey: (k: string) => !k.startsWith('cached_') && !k.startsWith('lastModified_') }));
vi.mock('../../services/dbService', () => ({
    getSettingsMatching: async (m: (k: string) => boolean) => Object.fromEntries([...mayHienTai].filter(([k]) => m(k))),
    saveSettingFromCloud: async (k: string, v: unknown, t: number) => { mayHienTai.set(k, v); mayHienTai.set(`lastModified_${k}`, t); },
}));
vi.mock('firebase/firestore', () => {
    class FieldPath { segs: string[]; constructor(...s: string[]) { this.segs = s; } }
    const ts = { __ts: true };
    const now = () => Date.now();
    const val = (v: any) => (v && v.__ts ? { toMillis: now } : v);
    const getDoc = async () => ({ exists: () => !!cloudDoc, data: () => cloudDoc && JSON.parse(JSON.stringify(cloudDoc)) });
    const setDoc = async (_r: unknown, data: Record<string, any>) => {
        if (!('settingsStoreBackup' in data)) return; // users/{uid} gốc
        cloudDoc = { ...(cloudDoc || {}), ...data, updatedAt: val(data.updatedAt) };
    };
    const updateDoc = async (_r: unknown, ...pairs: any[]) => {
        for (let i = 0; i < pairs.length; i += 2) {
            const f = pairs[i], v = val(pairs[i + 1]);
            if (typeof f === 'string') { cloudDoc![f] = v; continue; }
            const [a, b] = f.segs; cloudDoc![a] = { ...(cloudDoc![a] || {}), [b]: JSON.parse(JSON.stringify(v)) };
        }
    };
    return {
        FieldPath,
        runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
            const ops: (() => Promise<void>)[] = [];
            const r = await fn({
                get: getDoc,
                update: (...a: any[]) => { ops.push(() => updateDoc(...(a as [unknown]))); },
                set: (r2: unknown, d: any) => { ops.push(() => setDoc(r2, d)); },
            });
            for (const op of ops) await op();
            return r;
        },
        doc: (..._a: unknown[]) => ({}),
        serverTimestamp: () => ts,
        getDoc, setDoc,
    };
});

const user = { uid: 'u1', email: null, displayName: null } as any;
const may = async () => { vi.resetModules(); return import('../../services/lightSync'); };
const sua = (s: Store, k: string, v: unknown, t: number) => { s.set(k, v); s.set(`lastModified_${k}`, t); };
const keo = async (m: Awaited<ReturnType<typeof may>>) => m.pullNewerLightKeys(m.rememberLightCloud('u1', JSON.parse(JSON.stringify(cloudDoc))));

describe('2 máy cùng tài khoản — cấu hình nhẹ', () => {
    beforeEach(() => { cloudDoc = null; });

    it('A sửa X, B sửa Y (B còn X cũ): cả 2 thay đổi đều còn, 2 máy hội tụ về bản mới nhất', async () => {
        const A: Store = new Map(), B: Store = new Map();
        sua(A, 'X', 'goc', 100); sua(A, 'Y', 'goc', 100);
        mayHienTai = A; const mA = await may(); await mA.pushNewerLightKeys(user);         // A tạo doc
        mayHienTai = B; const mB = await may(); await keo(mB);                             // B lấy về
        expect(B.get('X')).toBe('goc');

        mayHienTai = A; sua(A, 'X', 'A-sua', 200); await mA.pushNewerLightKeys(user);   // A sửa X
        mayHienTai = B; sua(B, 'Y', 'B-sua', 300); await mB.pushNewerLightKeys(user);   // B sửa Y, CHƯA nhận X mới

        expect(cloudDoc!.settingsStoreBackup).toEqual({ X: 'A-sua', Y: 'B-sua' });     // X của A KHÔNG bị đè
        mayHienTai = B; await keo(mB); expect(B.get('X')).toBe('A-sua');
        mayHienTai = A; await keo(mA); expect(A.get('Y')).toBe('B-sua');
    });

    it('cùng sửa 1 khoá: bản sửa SAU thắng ở cả 2 máy', async () => {
        const A: Store = new Map(), B: Store = new Map();
        sua(A, 'X', 'goc', 100);
        mayHienTai = A; const mA = await may(); await mA.pushNewerLightKeys(user);
        mayHienTai = B; const mB = await may(); await keo(mB);
        mayHienTai = A; sua(A, 'X', 'A', 200);
        mayHienTai = B; sua(B, 'X', 'B-sau', 250); await mB.pushNewerLightKeys(user);
        mayHienTai = A; await mA.pushNewerLightKeys(user); // A cũ hơn → phải KHÔNG đè
        expect(cloudDoc!.settingsStoreBackup.X).toBe('B-sau');
        await keo(mA); expect(A.get('X')).toBe('B-sau');
    });

    it('giá trị object được THAY nguyên (field đã xoá không còn sót trên Cloud)', async () => {
        const A: Store = new Map();
        sua(A, 'F', { a: 1, b: 2 }, 100);
        mayHienTai = A; const mA = await may(); await mA.pushNewerLightKeys(user);
        sua(A, 'F', { a: 1 }, 200); await mA.pushNewerLightKeys(user);
        expect(cloudDoc!.settingsStoreBackup.F).toEqual({ a: 1 });
    });
});
