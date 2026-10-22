import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
export function initializeAuth() { return { currentUser: null }; }
export const indexedDBLocalPersistence = {}; export const browserPopupRedirectResolver = {};
const fakeUser = { uid: 'u-admin', email: 'admin@test.local', displayName: 'MT2 - AM - SƠN', photoURL: null,
  getIdTokenResult: async () => ({ claims: { role: 'admin' } }), getIdToken: async () => 'token' };
export function onAuthStateChanged(auth, cb) { window.__authCb = cb; setTimeout(() => cb(fakeUser), 30); return noop; }
export async function signInWithPopup() { window.__authCb(fakeUser); return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signInWithCredential() { return { user: null }; }
export async function signOut() { window.__authCb(null); }
export const browserLocalPersistence = {}; export const browserSessionPersistence = {};
export async function setPersistence() {}
export function getIdToken() { return Promise.resolve('token'); }
`;
const SESSION_STUB = `
export const resolveSession = async () => ({ role: 'admin', status: 'approved', departmentId: 'all', employeeName: '21707', expiresAt: null });
export const requestAccess = async () => {};
`;

async function moApp(page: Page) {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
}

test('Xác thực cột Hệ số SL quy đổi và banner nghiệp vụ trong tab Cấu hình theo Mã sản phẩm', async ({ page }) => {
    test.setTimeout(60000);
    await moApp(page);
    await page.goto('/?tab=analysis');

    const nutPhanQuyen = page.getByTitle('Cài đặt & Phân quyền').first();
    await nutPhanQuyen.waitFor({ state: 'visible', timeout: 30000 });
    await nutPhanQuyen.click();

    const tabCauHinh = page.getByRole('button', { name: /Khai báo ngành hàng|Cấu hình ngành hàng/i }).first();
    await expect(tabCauHinh).toBeVisible({ timeout: 15000 });
    await tabCauHinh.click();

    const subTabMaSP = page.getByRole('button', { name: /Cấu hình theo Mã sản phẩm/i }).first();
    await expect(subTabMaSP).toBeVisible({ timeout: 10000 });
    await subTabMaSP.click();

    const banner = page.locator('text=Hệ số quy đổi số lượng:');
    await expect(banner).toBeVisible({ timeout: 10000 });

    const headerHeso = page.locator('th:has-text("HỆ SỐ SL")');
    await expect(headerHeso).toBeVisible();

    // Cuộn xuống bảng để chụp trọn vẹn
    await headerHeso.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const artifactPath = path.resolve('/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/he-so-so-luong-quy-doi-verified.png');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log('Saved screenshot to:', artifactPath);
});
