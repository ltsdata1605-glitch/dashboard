import { test, expect, type Page } from '@playwright/test';

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

async function moApp(page: Page) {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
}

test('mở Phân Quyền và bấm tab Cấu hình ngành hàng: render mượt mà, không gặp ErrorBoundary', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    await moApp(page);
    await page.goto('/?tab=analysis');

    const nutPhanQuyen = page.getByTitle('Phân Quyền & Duyệt Yêu Cầu').first();
    await nutPhanQuyen.waitFor({ state: 'visible', timeout: 30000 });
    await nutPhanQuyen.click();

    // Xác nhận đã vào màn Phân Quyền
    await expect(page.getByRole('button', { name: /Phân quyền/i }).first()).toBeVisible({ timeout: 15000 });

    // Tìm và bấm tab "Khai báo ngành hàng"
    const tabCauHinh = page.getByRole('button', { name: /Khai báo ngành hàng|Cấu hình ngành hàng/i }).first();
    await expect(tabCauHinh).toBeVisible();
    await tabCauHinh.click();

    // Xác nhận render giao diện tab Cấu hình ngành hàng thành công
    await expect(page.getByText('Cấu Hình Ngành Hàng & Hệ Số Quy Đổi')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Xuất Excel' })).toBeVisible();

    // Đảm bảo không gặp ErrorBoundary "Đã xảy ra lỗi tại MainContent"
    await expect(page.getByText('Đã xảy ra lỗi tại MainContent')).toHaveCount(0);
});
