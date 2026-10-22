import { test, expect } from '@playwright/test';
import * as path from 'path';

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
export function initializeAuth() { return { currentUser: null }; } // services/firebase.ts dùng initializeAuth (2026-10-21)
export const indexedDBLocalPersistence = {}; export const browserPopupRedirectResolver = {};
const fakeUser = { uid: 'u-admin', email: 'admin@test.local', displayName: 'MT2 - AM - SƠN', photoURL: null,
  getIdTokenResult: async () => ({ claims: { role: 'admin', departmentId: 'ALL' } }), getIdToken: async () => 'token' };
export function onAuthStateChanged(auth, cb) { window.__authCb = cb; setTimeout(() => cb(fakeUser), 30); return noop; }
export async function signInWithPopup() { window.__authCb(fakeUser); return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signInWithCredential() { return { user: null }; } // đăng nhập app Màn hình chính iPhone (services/firebase.ts, 2026-10-12)
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

    // Chờ tiêu đề hồ sơ hiển thị
    const heading = page.getByText('Hồ sơ định danh').first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // GĐ7 (KE_HOACH_GIAO_DIEN_APPLE.md, lỗi #11): bản cũ của test này khoá nút 32×32 (icon trơn) — nay chuẩn Apple là vùng chạm
    // ≥ 44px, và việc nguy hiểm nhất ("Xoá tất cả dữ liệu") KHÔNG được nằm đầu trang.
    const cao = async (loc: import('@playwright/test').Locator) => (await loc.boundingBox())!.height;

    // 1. Đăng xuất: nút trên thanh trên của khung app (usePageActions), VÙNG CHẠM 44×44. Từ 57656d7 (2026-10-15) chủ dự án giữ cỡ
    //    NHÌN THẤY 32×32 cho nút thanh trên + chuông (styles.css "Đồng bộ kích thước thị giác 32×32px"), vùng chạm 44 do `ycx-hit`
    //    (::after vô hình) — nên đo khung ∪ ::after như mobile-iphone-6-module, không đo khung nút (test cũ đỏ từ đó).
    const logoutBtn = page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Đăng xuất' });
    await expect(logoutBtn).toBeVisible();
    const vungCham = await logoutBtn.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const af = getComputedStyle(el, '::after');
        if (af.content === 'none' || af.position !== 'absolute') return { w: r.width, h: r.height };
        const px = (v: string) => (v === 'auto' ? 0 : parseFloat(v) || 0);
        return { w: r.width - px(af.left) - px(af.right), h: r.height - px(af.top) - px(af.bottom) };
    });
    expect(vungCham.h).toBeGreaterThanOrEqual(43.5);
    expect(vungCham.w).toBeGreaterThanOrEqual(43.5);

    // 2. "Xoá tất cả dữ liệu" là icon button nằm cạnh "Đổi mã kho" trong Hồ sơ định danh (vùng chạm 44×44 nhờ .ycx-hit)
    const resetBtn = page.getByRole('button', { name: /Xoá tất cả dữ liệu/ });
    await expect(resetBtn).toBeVisible();
    expect(await cao(resetBtn)).toBeGreaterThanOrEqual(31.5);

    // 3. Đổi mã kho: dạng icon button gọn chuẩn 32px (size bằng nút Xoá tất cả dữ liệu), nằm ở góc trên bên phải
    const actionProfileBtn = page.getByRole('button', { name: /Gắn kho dùng chung|Đổi mã kho/ }).first();
    await expect(actionProfileBtn).toBeVisible();
    expect(await cao(actionProfileBtn)).toBeGreaterThanOrEqual(31.5);
    expect(await cao(actionProfileBtn)).toBeLessThanOrEqual(36);

    // 4. Làm mới + sắp xếp đảo chiều: chuẩn gọn 32px trên mobile
    expect(await cao(page.getByRole('button', { name: 'Làm mới danh sách' }))).toBeLessThanOrEqual(36);
    expect(await cao(page.locator('button[title*="Tăng dần"], button[title*="Giảm dần"]').first())).toBeLessThanOrEqual(36);

    // 5. Hai segmented control (3 phân hệ + 3 trạng thái) — mỗi mục gọn chuẩn 32px trên iPhone
    for (const ten of ['Phân quyền', 'Ngành hàng', 'Duyệt', 'Chờ duyệt', 'Hoạt động', 'Hết hạn']) {
        expect(await cao(page.locator('[data-segmented]').getByRole('button', { name: ten, exact: true })), ten).toBeLessThanOrEqual(36);
    }

    // 6. Chụp ảnh màn hình mobile để kiểm chứng
    const screenshotPath = path.resolve(process.cwd(), 'tests/e2e/mobile-settings-compact.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot saved to:', screenshotPath);
});
