import { test, expect, type Page } from '@playwright/test';

/**
 * Ba tab của màn "Phân quyền & Duyệt yêu cầu" không được gọi Cloud Function thừa.
 *
 * Đo ngày 2026-09-25 TRƯỚC khi sửa: bấm lần lượt Chờ duyệt -> Hoạt động -> Hết hạn tốn
 * **4 lượt gọi** `["pending","active","expired","active"]` — lượt `active` cuối là nhánh gộp thêm
 * của tab "Hết hạn", lấy lại đúng dữ liệu mà tab "Hoạt động" vừa lấy xong.
 * Sau khi sửa (services/managedUsersCache.ts): **3 lượt**, và bấm qua lại không tốn thêm lượt nào.
 */

const CHAM_MS = 800;
const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
const fakeUser = { uid: 'u-quanly', email: 'quanly@test.local', displayName: 'Quản Lý Kho 405', photoURL: null,
  getIdTokenResult: async () => ({ claims: { role: 'manager', departmentId: '405' } }), getIdToken: async () => 'token' };
export function onAuthStateChanged(auth, cb) { window.__authCb = cb; setTimeout(() => cb(fakeUser), 30); return noop; }
export async function signInWithPopup() { window.__authCb(fakeUser); return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signOut() { window.__authCb(null); }
export const browserLocalPersistence = {}; export const browserSessionPersistence = {};
export async function setPersistence() {}
export function getIdToken() { return Promise.resolve('token'); }
`;
const SESSION_STUB = `
export const resolveSession = async () => ({ role: 'manager', status: 'approved', departmentId: '405', employeeName: '21707', expiresAt: null });
export const requestAccess = async () => {};
`;
const ADMIN_STUB = `
export const MANAGED_USERS_CHANGED_EVENT = 'ycx-managed-users-changed';
window.__goi = [];
export const listManagedUsers = async (mode) => {
  window.__goi.push(mode);
  await new Promise(r => setTimeout(r, ${CHAM_MS}));
  return [];
};
export const adminUpdateUser = async () => { window.dispatchEvent(new CustomEvent(MANAGED_USERS_CHANGED_EVENT)); };
`;

async function moApp(page: Page) {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
    await page.route('**/services/adminUserService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: ADMIN_STUB }));
}
const doc = (page: Page) => page.evaluate(() => (window as unknown as { __goi: string[] }).__goi.slice());

test('bấm qua lại 3 tab: mỗi tab tốn đúng 1 lượt gọi, không có lượt thừa', async ({ page }) => {
    test.setTimeout(120000);
    await moApp(page);
    await page.goto('/?tab=analysis');
    await page.waitForTimeout(4000);
    await page.getByTitle('Phân Quyền & Duyệt Yêu Cầu').first().click();
    await page.getByRole('button', { name: /Chờ duyệt/i }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1500);
    expect(await doc(page)).toEqual(['pending']);

    await page.getByRole('button', { name: /Hoạt động/i }).first().click();
    await page.waitForTimeout(2000);
    expect(await doc(page)).toEqual(['pending', 'active']);

    // Trước bản sửa, bước này thêm CẢ 'expired' lẫn 'active' (lượt 'active' là thừa)
    await page.getByRole('button', { name: /Hết hạn/i }).first().click();
    await page.waitForTimeout(2000);
    expect(await doc(page)).toEqual(['pending', 'active', 'expired']);

    // Bấm qua lại trong vòng 60s: không được gọi thêm lượt nào
    for (const tab of ['Chờ duyệt', 'Hoạt động', 'Hết hạn']) {
        await page.getByRole('button', { name: new RegExp(tab, 'i') }).first().click();
        await page.waitForTimeout(1200);
    }
    const cuoi = await doc(page);
    console.log('TỔNG LƯỢT GỌI sau khi bấm qua lại cả 3 tab:', JSON.stringify(cuoi));
    expect(cuoi).toEqual(['pending', 'active', 'expired']);
});
