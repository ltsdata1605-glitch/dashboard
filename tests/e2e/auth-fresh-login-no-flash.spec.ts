import { expect, test } from '@playwright/test';

/**
 * Đăng nhập MỚI (không có cache Ultra-Fast Boot) không được nháy màn "Cập Nhật Mã Kho" trong lúc
 * chờ resolveSession() — kể cả với admin. Không đăng nhập Google thật được trong Playwright, nên:
 * - stub dep `firebase/auth` (Vite pre-bundle) — onAuthStateChanged lưu callback lên window,
 *   signInWithPopup gọi callback với user giả;
 * - stub `services/sessionService.ts` — resolveSession trả admin SAU 2,5s (mô phỏng Cloud Function).
 * Trong cửa sổ 2,5s đó, trang phải hiện spinner (hoặc vẫn màn Login), KHÔNG được hiện
 * PendingApprovalView; sau đó phải vào dashboard.
 */
const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider {
  addScope() {} setCustomParameters() {}
  static credentialFromResult() { return null; }
}
export function getAuth() { return { currentUser: null }; }
export function onAuthStateChanged(auth, cb) {
  window.__authCb = cb;
  setTimeout(() => cb(null), 30); // Firebase xác nhận: chưa đăng nhập -> LoginView
  return noop;
}
const fakeUser = {
  uid: 'u-test', email: 'admin@test.local', displayName: 'Admin Test', photoURL: null,
  getIdTokenResult: async () => ({ claims: {} }),
  getIdToken: async () => 'token',
};
export async function signInWithPopup() { window.__authCb(fakeUser); return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signOut() { window.__authCb(null); }
export const browserLocalPersistence = {}; export const browserSessionPersistence = {};
export async function setPersistence() {}
export function getIdToken() { return Promise.resolve('token'); }
`;

const SESSION_STUB = `
export const resolveSession = () => new Promise(resolve => setTimeout(() => resolve({
  role: 'admin', status: 'approved', departmentId: null, employeeName: 'Admin Test', expiresAt: null,
}), 2500));
export const requestAccess = async () => {};
`;

async function installStubs(page: import('@playwright/test').Page, authStub = AUTH_STUB) {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: authStub }));
    await page.route('**/services/sessionService.ts*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
}

test('đăng nhập mới: không nháy "Cập Nhật Mã Kho" trước khi vào dashboard', async ({ page }) => {
    await installStubs(page);

    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: /Tiếp tục với Cổng Google/i });
    await loginBtn.waitFor({ state: 'visible', timeout: 20_000 });
    await loginBtn.click();

    // Lấy mẫu liên tục trong cửa sổ resolveSession() giả (2,5s)
    const seen: string[] = [];
    const deadline = Date.now() + 2300;
    while (Date.now() < deadline) {
        const txt = await page.locator('body').innerText().catch(() => '');
        if (/Cập Nhật Mã Kho|chưa đăng ký mã kho/i.test(txt)) seen.push('PENDING_VIEW');
        else if (/Tiếp tục với Cổng Google/i.test(txt)) seen.push('LOGIN');
        else if (await page.locator('.animate-spin').first().isVisible().catch(() => false)) seen.push('SPINNER');
        else seen.push('OTHER');
        await page.waitForTimeout(100);
    }
    const summary = seen.reduce<Record<string, number>>((m, s) => { m[s] = (m[s] || 0) + 1; return m; }, {});
    console.log('TRẠNG THÁI TRONG LÚC CHỜ resolveSession:', JSON.stringify(summary));
    expect(summary['PENDING_VIEW'] || 0, 'đã nháy màn "Cập Nhật Mã Kho" trong lúc chờ phân quyền').toBe(0);

    // Sau khi resolveSession xong -> vào dashboard (sidebar có nút điều hướng), không còn màn Login/Pending
    await expect(page.locator('aside').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Cập Nhật Mã Kho/i)).toHaveCount(0);
});

/** Đường Ultra-Fast Boot phải còn nguyên: đã có cache hợp lệ -> vào thẳng dashboard, KHÔNG bị
 *  spinner của fix ở trên che lại khi Firebase xác nhận user và resolveSession() còn đang chạy. */
test('mở app có cache admin: vào thẳng dashboard, không spinner/không màn Login', async ({ page }) => {
    // Firebase xác nhận user sau 300ms (chậm hơn cache app), resolveSession vẫn 2,5s.
    const authStubCached = AUTH_STUB.replace('setTimeout(() => cb(null), 30);', 'setTimeout(() => cb(fakeUser), 300);');
    // Lần tải đầu: chưa đăng nhập (để có DB IndexedDB mà gieo cache), rồi mới đổi stub sang "đã đăng nhập".
    await installStubs(page);
    await page.goto('/');
    await page.getByRole('button', { name: /Tiếp tục với Cổng Google/i }).waitFor({ state: 'visible', timeout: 20_000 });
    // Gieo cache như lần đăng nhập trước đã lưu (root app ghi key KHÔNG prefix vào BI_HUB_DATABASE_V2/settings)
    await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite'); const st = tx.objectStore('settings');
            st.put('admin', 'cached_user_role'); st.put('approved', 'cached_user_status'); st.put('Admin Test', 'cached_emp_name');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    });
    await page.unroute('**/node_modules/.vite/deps/firebase_auth.js*');
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: authStubCached }));
    await page.reload();

    const seen: string[] = [];
    const deadline = Date.now() + 2300;
    while (Date.now() < deadline) {
        const txt = await page.locator('body').innerText().catch(() => '');
        if (/Cập Nhật Mã Kho|chưa đăng ký mã kho/i.test(txt)) seen.push('PENDING_VIEW');
        else if (/Tiếp tục với Cổng Google/i.test(txt)) seen.push('LOGIN');
        else if (await page.locator('aside').first().isVisible().catch(() => false)) seen.push('DASHBOARD');
        else if (await page.locator('.animate-spin').first().isVisible().catch(() => false)) seen.push('SPINNER');
        else seen.push('OTHER');
        await page.waitForTimeout(100);
    }
    const summary = seen.reduce<Record<string, number>>((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});
    console.log('CÓ CACHE — TRẠNG THÁI:', JSON.stringify(summary));
    expect(summary['PENDING_VIEW'] || 0).toBe(0);
    expect(summary['LOGIN'] || 0).toBe(0);
    // Cho phép 1-2 mẫu spinner đầu tiên (lúc chưa đọc xong cache IndexedDB), còn lại phải là dashboard
    expect(summary['DASHBOARD'] || 0).toBeGreaterThan(15);
});
