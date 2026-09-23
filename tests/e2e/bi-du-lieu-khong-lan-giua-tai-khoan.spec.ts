import { expect, test, type Page } from '@playwright/test';

/**
 * Kiểm chứng Ở MỨC GIAO DIỆN cho yêu cầu "tách BI_HUB_DATABASE_V2 theo uid" (2026-09-23):
 * mở Report BI bằng tài khoản khác trên cùng máy thì KHÔNG còn thấy siêu thị của người trước
 * (đúng lỗi chủ dự án báo: "tài khoản người dùng mới lại dính dữ liệu cũ").
 *
 * Không đăng nhập Google thật được trong Playwright nên stub `firebase/auth` + `sessionService`
 * y như tests/e2e/auth-fresh-login-no-flash.spec.ts.
 */
const authStubFor = (uid: string) => `
const noop = () => {};
export class GoogleAuthProvider {
  addScope() {} setCustomParameters() {}
  static credentialFromResult() { return null; }
}
export function getAuth() { return { currentUser: null }; }
const fakeUser = {
  uid: '${uid}', email: '${uid}@test.local', displayName: 'Người ${uid}', photoURL: null,
  getIdTokenResult: async () => ({ claims: { role: 'admin', departmentId: null } }),
  getIdToken: async () => 'token',
};
export function onAuthStateChanged(auth, cb) {
  window.__authCb = cb;
  setTimeout(() => cb(fakeUser), 30); // máy đã nhớ sẵn phiên đăng nhập
  return noop;
}
export async function signInWithPopup() { window.__authCb(fakeUser); return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signOut() { window.__authCb(null); }
export const browserLocalPersistence = {}; export const browserSessionPersistence = {};
export async function setPersistence() {}
export function getIdToken() { return Promise.resolve('token'); }
`;

const SESSION_STUB = `
export const resolveSession = async () => ({
  role: 'admin', status: 'approved', departmentId: null, employeeName: 'Admin Test', expiresAt: null,
});
export const requestAccess = async () => {};
`;

async function dangNhapBang(page: Page, uid: string) {
    await page.unroute('**/node_modules/.vite/deps/firebase_auth.js*').catch(() => {});
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: authStubFor(uid) }));
    await page.route('**/services/sessionService.ts*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
}

test('Report BI: tài khoản thứ hai trên cùng máy không thấy siêu thị của người trước', async ({ page }) => {
    await dangNhapBang(page, 'nv-so-1');
    await page.goto('/?tab=employees');
    await page.waitForTimeout(3000);

    // Gieo dữ liệu Report BI vào ĐÚNG database riêng của tài khoản 1
    await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2__nv-so-1', 3);
            r.onupgradeneeded = () => {
                if (!r.result.objectStoreNames.contains('settings')) r.result.createObjectStore('settings');
                if (!r.result.objectStoreNames.contains('appStorage')) r.result.createObjectStore('appStorage');
            };
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite');
            tx.objectStore('settings').put(['Tân Hiệp', 'Thạnh An'], 'bi_updater-custom-supermarkets');
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    });

    /** Mở màn "Cập nhật dữ liệu" — nơi liệt kê các siêu thị đã cấu hình — rồi đếm "Tân Hiệp" */
    const demSieuThiTrenManHinh = async (anh: string) => {
        await page.reload();
        await page.waitForTimeout(4000);
        await page.getByRole('button', { name: /Cập nhật dữ liệu|Cập nhật/i }).first().click().catch(() => {});
        await page.waitForTimeout(2500);
        const soLan = await page.getByText('Tân Hiệp', { exact: false }).count();
        await page.screenshot({ path: anh, fullPage: false });
        return soLan;
    };

    const thayCuaMinh = await demSieuThiTrenManHinh('test-results/bi-tai-khoan-1.png');

    // ── Tài khoản THỨ HAI đăng nhập trên cùng máy này
    await dangNhapBang(page, 'nv-so-2');
    const thayCuaNguoiKhac = await demSieuThiTrenManHinh('test-results/bi-tai-khoan-2.png');

    const dbs = await page.evaluate(async () =>
        (await indexedDB.databases()).map(d => d.name).filter(n => n && n.startsWith('BI_HUB')));

    console.log(`SỐ LẦN HIỆN "Tân Hiệp" — tài khoản 1: ${thayCuaMinh} | tài khoản 2: ${thayCuaNguoiKhac}`);
    console.log('DATABASE TRÊN MÁY:', JSON.stringify(dbs));

    expect(thayCuaMinh).toBeGreaterThan(0);   // chính chủ vẫn thấy dữ liệu của mình
    expect(thayCuaNguoiKhac).toBe(0);         // người khác KHÔNG thấy gì của người trước
    expect(dbs).toContain('BI_HUB_DATABASE_V2__nv-so-1');
    expect(dbs).toContain('BI_HUB_DATABASE_V2__nv-so-2');
});
