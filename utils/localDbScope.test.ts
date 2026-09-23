import { beforeEach, describe, expect, it } from 'vitest';
import {
    LEGACY_BI_HUB_DB_NAME,
    biHubDbName,
    getActiveLocalUid,
    resetLocalDbScopeForTests,
    setActiveLocalUid,
} from './localDbScope';

/** localStorage giả — môi trường test của Vitest là node, không có sẵn */
const installLocalStorage = (initial: Record<string, string> = {}) => {
    const store = new Map(Object.entries(initial));
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size; },
    } as Storage;
    return store;
};

describe('biHubDbName — mỗi tài khoản một database riêng', () => {
    beforeEach(() => {
        resetLocalDbScopeForTests();
        installLocalStorage();
    });

    it('chưa đăng nhập thì vẫn dùng database dùng chung cũ', () => {
        setActiveLocalUid(null);
        expect(biHubDbName()).toBe(LEGACY_BI_HUB_DB_NAME);
    });

    it('hai tài khoản khác nhau mở hai database khác nhau', () => {
        setActiveLocalUid('uid-nguoi-cu');
        const cu = biHubDbName();
        setActiveLocalUid('uid-nguoi-moi');
        const moi = biHubDbName();

        expect(cu).toBe(`${LEGACY_BI_HUB_DB_NAME}__uid-nguoi-cu`);
        expect(moi).toBe(`${LEGACY_BI_HUB_DB_NAME}__uid-nguoi-moi`);
        expect(cu).not.toBe(moi);
    });

    it('cùng một uid luôn ra đúng một tên (hàm thuần, không phụ thuộc trạng thái ẩn)', () => {
        setActiveLocalUid('abc123');
        const lan1 = biHubDbName();
        setActiveLocalUid('khac');
        setActiveLocalUid('abc123');
        expect(biHubDbName()).toBe(lan1);
    });

    it('uid có ký tự lạ vẫn cho tên database an toàn', () => {
        setActiveLocalUid('uid/có dấu*lạ');
        const name = biHubDbName();
        expect(name.startsWith(`${LEGACY_BI_HUB_DB_NAME}__uid_c`)).toBe(true);
        expect(name).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('lúc mở app (chưa ai báo uid) thì đoán bằng dấu chủ sở hữu của lần trước', () => {
        installLocalStorage({ 'ycx-local-data-owner-uid': 'uid-lan-truoc' });
        expect(getActiveLocalUid()).toBe('uid-lan-truoc');
        expect(biHubDbName()).toBe(`${LEGACY_BI_HUB_DB_NAME}__uid-lan-truoc`);
    });

    it('AuthContext báo uid thật thì lấy uid đó, không lấy giá trị đoán nữa', () => {
        installLocalStorage({ 'ycx-local-data-owner-uid': 'uid-lan-truoc' });
        setActiveLocalUid('uid-that');
        expect(biHubDbName()).toBe(`${LEGACY_BI_HUB_DB_NAME}__uid-that`);
    });

    it('đăng xuất thì quay về database dùng chung, không còn chạm dữ liệu tài khoản vừa thoát', () => {
        installLocalStorage({ 'ycx-local-data-owner-uid': 'uid-vua-thoat' });
        setActiveLocalUid(null);
        expect(biHubDbName()).toBe(LEGACY_BI_HUB_DB_NAME);
    });

    it('trình duyệt chặn localStorage vẫn chạy được (không ném lỗi)', () => {
        (globalThis as unknown as { localStorage: Storage }).localStorage = {
            get length(): number { throw new Error('blocked'); },
            clear() { throw new Error('blocked'); },
            getItem() { throw new Error('blocked'); },
            key() { throw new Error('blocked'); },
            removeItem() { throw new Error('blocked'); },
            setItem() { throw new Error('blocked'); },
        } as unknown as Storage;
        expect(() => biHubDbName()).not.toThrow();
        expect(biHubDbName()).toBe(LEGACY_BI_HUB_DB_NAME);
    });
});
