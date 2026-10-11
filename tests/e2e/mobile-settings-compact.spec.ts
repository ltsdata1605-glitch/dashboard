import { test, expect } from '@playwright/test';
import * as path from 'path';

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
const fakeUser = { uid: 'u-admin', email: 'admin@test.local', displayName: 'MT2 - AM - SƠN', photoURL: null,
  getIdTokenResult: async () => ({ claims: { role: 'admin', departmentId: 'ALL' } }), getIdToken: async () => 'token' };
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
export const resolveSession = async () => ({ role: 'admin', status: 'approved', departmentId: 'ALL', employeeName: '21707 - Lê Trường Sơn', expiresAt: null });
export const requestAccess = async () => {};
`;

test.use({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
});

test('Xác thực giao diện mobile gọn gàng và resize chuẩn trên tab Phân quyền / Cài đặt', async ({ page }) => {
    test.setTimeout(60000);
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
    
    // Mở trang với tab settings
    await page.goto('/?tab=settings');
    await page.waitForLoadState('domcontentloaded');

    // Chờ tiêu đề Hồ Sơ Định Danh hiển thị
    const heading = page.locator('text=Hồ Sơ Định Danh').first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 1. Kiểm tra nút Đăng Xuất trên topbar mobile (icon-only: 32x32px)
    const logoutBtn = page.locator('#mobile-topbar-actions button').first();
    await expect(logoutBtn).toBeVisible();
    const logoutBox = await logoutBtn.boundingBox();
    expect(logoutBox).not.toBeNull();
    console.log('Logout button size:', logoutBox?.width, 'x', logoutBox?.height);
    expect(logoutBox!.height).toBeLessThanOrEqual(36);
    expect(logoutBox!.height).toBeGreaterThanOrEqual(28);
    expect(logoutBox!.width).toBeLessThanOrEqual(36);
    expect(logoutBox!.width).toBeGreaterThanOrEqual(28);

    // 2. Kiểm tra nút Xoá dữ liệu (icon-only trên mobile: 32x32px)
    const resetBtn = page.locator('button[title*="Xoá tất cả dữ liệu"]').first();
    await expect(resetBtn).toBeVisible();
    const resetBox = await resetBtn.boundingBox();
    expect(resetBox).not.toBeNull();
    console.log('Reset button size:', resetBox?.width, 'x', resetBox?.height);
    expect(resetBox!.height).toBeLessThanOrEqual(36);
    expect(resetBox!.height).toBeGreaterThanOrEqual(28);
    expect(resetBox!.width).toBeLessThanOrEqual(36);
    expect(resetBox!.width).toBeGreaterThanOrEqual(28);

    // 3. Kiểm tra nút Gắn kho dùng chung / Đổi mã kho (icon-only trên mobile: 32x32px)
    const actionProfileBtn = page.locator('button[title*="Gắn kho dùng chung"], button[title*="Đổi mã kho"]').first();
    await expect(actionProfileBtn).toBeVisible();
    const actionProfileBox = await actionProfileBtn.boundingBox();
    expect(actionProfileBox).not.toBeNull();
    console.log('Action profile button size:', actionProfileBox?.width, 'x', actionProfileBox?.height);
    expect(actionProfileBox!.height).toBeLessThanOrEqual(36);
    expect(actionProfileBox!.height).toBeGreaterThanOrEqual(28);
    expect(actionProfileBox!.width).toBeLessThanOrEqual(36);
    expect(actionProfileBox!.width).toBeGreaterThanOrEqual(28);

    // 4. Kiểm tra nút Làm Mới
    const refreshBtn = page.locator('button:has-text("Làm Mới")').first();
    if (await refreshBtn.isVisible()) {
        const refreshBox = await refreshBtn.boundingBox();
        expect(refreshBox).not.toBeNull();
        console.log('Refresh button height:', refreshBox?.height);
        expect(refreshBox!.height).toBeLessThanOrEqual(36);
        expect(refreshBox!.height).toBeGreaterThanOrEqual(28);
    }

    // 5. Kiểm tra nút Sắp xếp đảo chiều
    const sortBtn = page.locator('button[title*="Tăng dần"], button[title*="Giảm dần"]').first();
    if (await sortBtn.isVisible()) {
        const sortBox = await sortBtn.boundingBox();
        expect(sortBox).not.toBeNull();
        console.log('Sort button height:', sortBox?.height);
        expect(sortBox!.height).toBeLessThanOrEqual(30);
        expect(sortBox!.height).toBeGreaterThanOrEqual(26);
    }

    // 6. Chụp ảnh màn hình mobile để kiểm chứng
    const screenshotPath = path.resolve(process.cwd(), 'tests/e2e/mobile-settings-compact.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot saved to:', screenshotPath);
});
