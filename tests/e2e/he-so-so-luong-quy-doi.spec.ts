import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
export function initializeAuth() { return { currentUser: null }; }
export const indexedDBLocalPersistence = {}; export const browserPopupRedirectResolver = {};
const fakeUser = { uid: 'u-admin', email: 'lts.truongson@gmail.com', displayName: 'MT2 - AM - SƠN', photoURL: null,
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
export const resolveSession = async () => ({ role: 'admin', status: 'approved', departmentId: 'ALL (Super Admin)', employeeName: '21707', expiresAt: null });
export const requestAccess = async () => {};
`;

async function moApp(page: Page) {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
}

test('Xác thực cột Hệ số SL, Hệ số DT và tính năng chọn loại hệ số trong Cấu hình theo Mã sản phẩm', async ({ page }) => {
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

    // 1. Kiểm tra banner nghiệp vụ hướng dẫn cả 2 loại hệ số
    const bannerSL = page.locator('text=Hệ số quy đổi số lượng (SL):');
    await expect(bannerSL).toBeVisible({ timeout: 10000 });
    const bannerDT = page.locator('text=Hệ số quy đổi doanh thu (DT):');
    await expect(bannerDT).toBeVisible({ timeout: 10000 });

    // 2. Kiểm tra 2 cột riêng biệt trong bảng
    const headerHesoSL = page.locator('th:has-text("HỆ SỐ SL")');
    await expect(headerHesoSL).toBeVisible();
    const headerHesoDT = page.locator('th:has-text("HỆ SỐ DT")');
    await expect(headerHesoDT).toBeVisible();

    // 3. Mở form thêm mới và kiểm tra các nút chọn loại hệ số
    const nutThemMoi = page.getByRole('button', { name: 'Thêm mới' }).first();
    await expect(nutThemMoi).toBeVisible();
    await nutThemMoi.click();

    const btnChonSL = page.getByRole('button', { name: 'Số lượng (SL)' });
    const btnChonDT = page.getByRole('button', { name: 'Doanh thu (DT)' });
    const btnChonCaHai = page.getByRole('button', { name: 'Cả hai (SL & DT)' });

    await expect(btnChonSL).toBeVisible();
    await expect(btnChonDT).toBeVisible();
    await expect(btnChonCaHai).toBeVisible();

    // Thử chọn Doanh thu (DT)
    await btnChonDT.click();
    await expect(page.locator('label:has-text("Hệ số DT:")')).toBeVisible();

    // Thử chọn Cả hai (SL & DT)
    await btnChonCaHai.click();
    await expect(page.locator('label:has-text("Hệ số SL:")')).toBeVisible();
    await expect(page.locator('label:has-text("Hệ số DT:")')).toBeVisible();

    // 4. Nhập và lưu thử 1 sản phẩm hệ số Doanh thu
    await btnChonDT.click();
    await page.getByPlaceholder('VD: 1997139000289').fill('99990001');
    await page.getByPlaceholder('VD: BHMR 1 năm Apple Watch').fill('Gói Dịch Vụ Doanh Thu VIP');
    await page.locator('#cfg-ma-sp-he-so-dt').fill('1.85');
    await page.getByRole('button', { name: 'Lưu mã SP' }).click();

    // Kiểm tra dòng vừa thêm xuất hiện trong bảng với Hệ số DT = 1,85 và Hệ số SL = —
    const dongDT = page.locator('tr:has-text("99990001")');
    await expect(dongDT).toBeVisible();
    await expect(dongDT).toContainText('1,85');

    // Cuộn xuống bảng để chụp trọn vẹn
    await dongDT.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const artifactPath = path.resolve('/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/he-so-sl-dt-quy-doi-verified.png');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log('Saved screenshot to:', artifactPath);
});
