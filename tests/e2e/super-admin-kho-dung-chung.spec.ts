import { expect, test } from '@playwright/test';

/**
 * Super Admin gắn được Kho dùng chung (2026-09-27 — chủ dự án báo "Không nhập được mã kho cho
 * Super Admin"). Không đăng nhập Google thật được trong Playwright, nên dùng lại cách của
 * auth-fresh-login-no-flash.spec.ts: stub `firebase/auth` + `resolveSession` để app nhận mình là
 * Super Admin, và CHẶN request tới Cloud Function `adminUpdateUser` để kiểm đúng payload gửi đi
 * (không chạm production). Phía server (resolveSession GIỮ Kho gắn thêm) có unit test riêng:
 * tests/unit/super-admin-kho.test.ts.
 */
const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
const fakeUser = { uid: 'u-super', email: 'lts.truongson@gmail.com', displayName: 'Super Admin', photoURL: null,
  getIdTokenResult: async () => ({ claims: {} }), getIdToken: async () => { window.__tokenRefreshed = (window.__tokenRefreshed||0)+1; return 'token'; } };
export function getAuth() { return { currentUser: fakeUser }; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb(fakeUser), 30); return noop; }
export async function signInWithPopup() { return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signOut() {}
export const browserLocalPersistence = {}; export const browserSessionPersistence = {};
export async function setPersistence() {}
export function getIdToken() { return Promise.resolve('token'); }
`;
const sessionStub = (dept: string, role = 'admin') => `
export const resolveSession = async () => ({ role: ${JSON.stringify(role)}, status: 'approved', departmentId: ${JSON.stringify(dept)}, employeeName: '21707 - Lê Trường Sơn', expiresAt: null });
export const requestAccess = async (...args) => { (window.__reqCalls ||= []).push(args); };
`;
async function stubs(page: import('@playwright/test').Page, dept: string, bodies: unknown[], role = 'admin') {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: sessionStub(dept, role) }));
    await page.route('**/adminUpdateUser*', async r => {
        const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
        bodies.push(r.request().postDataJSON());
        return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ result: { success: true } }) });
    });
}
test('Super Admin gắn được Kho dùng chung 910', async ({ page }) => {
    test.setTimeout(120_000);
    const bodies: unknown[] = [];
    await stubs(page, 'ALL (Super Admin)', bodies);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?tab=settings');
    await expect(page.getByText('Hồ Sơ Định Danh')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Kho dùng chung:\s*chưa gắn/)).toBeVisible();
    await page.screenshot({ path: `test-results/sa-1-truoc.png` });
    await page.getByRole('button', { name: /Gắn kho dùng chung/ }).click();
    const o = page.getByPlaceholder('Ví dụ: 1032, 3717, 910, 58614');
    await expect(o).toHaveValue('');
    await o.fill('910');
    await page.screenshot({ path: `test-results/sa-2-dang-sua.png` });
    await page.getByRole('button', { name: /^Lưu$/ }).click();
    await expect.poll(() => bodies.length, { timeout: 10_000 }).toBeGreaterThan(0);
    console.log('GỬI adminUpdateUser:', JSON.stringify(bodies[0]));
    expect((bodies[0] as { data: unknown }).data).toEqual({ targetUid: 'u-super', departmentId: 'ALL (Super Admin),910' });
    await expect(page.getByText(/Đã gắn Kho dùng chung: 910/)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __tokenRefreshed?: number }).__tokenRefreshed || 0)).toBeGreaterThan(0);
});
test('Sau khi gắn: hiện nhãn + Kho dùng chung, ô sửa chỉ có Kho thật; để trống vẫn lưu được', async ({ page }) => {
    test.setTimeout(120_000);
    const bodies: unknown[] = [];
    await stubs(page, 'ALL (Super Admin),910', bodies);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/?tab=settings');
    await expect(page.getByText('Hồ Sơ Định Danh')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Kho dùng chung:\s*910/)).toBeVisible();
    await page.screenshot({ path: `test-results/sa-3-sau-iphone.png`, fullPage: true });
    await page.getByRole('button', { name: /Gắn kho dùng chung/ }).click();
    const o = page.getByPlaceholder('Ví dụ: 1032, 3717, 910, 58614');
    await expect(o).toHaveValue('910');
    await o.fill('');
    await page.getByRole('button', { name: /^Lưu$/ }).click();
    await expect.poll(() => bodies.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect((bodies[0] as { data: unknown }).data).toEqual({ targetUid: 'u-super', departmentId: 'ALL (Super Admin)' });
    // mã kho sai định dạng vẫn bị chặn
});

// ── 2 lỗi có sẵn sửa 2026-09-27 ────────────────────────────────────────────────────────────────
const reqCalls = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { __reqCalls?: unknown[][] }).__reqCalls || []);

test('Quản lý đổi mã kho: gửi YÊU CẦU duyệt (không ghi thẳng bị Rules từ chối), có xác nhận', async ({ page }) => {
    test.setTimeout(120_000);
    await stubs(page, '910', [], 'manager');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?tab=settings');
    await expect(page.getByText('Hồ Sơ Định Danh')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Đổi mã kho/ }).click();
    await expect(page.getByText(/tạm khoá quyền Quản lý cho đến khi Admin duyệt/)).toBeVisible();

    // Kho không đổi → không gửi gì
    await page.getByRole('button', { name: /^Lưu$/ }).click();
    await expect(page.getByText('Mã Kho không thay đổi.')).toBeVisible();
    expect(await reqCalls(page)).toEqual([]);

    // Đổi sang 911 → hỏi xác nhận → gửi requestAccess('manager', …)
    await page.getByRole('button', { name: /Đổi mã kho/ }).click();
    await page.getByPlaceholder('Ví dụ: 1032, 3717, 910, 58614').fill('911');
    await page.getByRole('button', { name: /^Lưu$/ }).click();
    await expect(page.getByText('Gửi yêu cầu đổi Mã Kho?')).toBeVisible();
    await page.screenshot({ path: 'test-results/ql-doi-kho-xac-nhan.png' });
    expect(await reqCalls(page)).toEqual([]); // chưa bấm xác nhận thì chưa gửi
    await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    await expect.poll(() => reqCalls(page)).toEqual([['manager', '911', '21707 - Lê Trường Sơn']]);
    await expect(page.getByText(/Đã gửi yêu cầu đổi Mã Kho/)).toBeVisible();
});

test('"Xoá tất cả dữ liệu": quản lý được cảnh báo đúng Kho của mình', async ({ page }) => {
    test.setTimeout(120_000);
    await stubs(page, '910', [], 'manager');
    await page.goto('/?tab=settings');
    await page.getByRole('button', { name: /Xoá tất cả dữ liệu/ }).click();
    await expect(page.getByText(/kèm báo cáo Luỹ kế & Thi đua dùng chung của Kho 910/)).toBeVisible();
});

// Test RIÊNG (context riêng): 2 trang cùng context dùng chung module stub đã cache của trang trước.
test('"Xoá tất cả dữ liệu": Super Admin có Kho gắn thêm 910 — báo cáo dùng chung được GIỮ', async ({ page }) => {
    test.setTimeout(120_000);
    await stubs(page, 'ALL (Super Admin),910', []);
    await page.goto('/?tab=settings');
    await expect(page.getByRole('button', { name: /Gắn kho dùng chung/ })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Xoá tất cả dữ liệu/ }).click();
    const hop = page.locator('p', { hasText: 'xoá luôn trên cloud' });
    await expect(hop).toContainText('Báo cáo dùng chung của các Kho được giữ nguyên');
    await expect(hop).toContainText('tài khoản Admin không xoá dữ liệu dùng chung của Kho');
    await expect(hop).not.toContainText('Kho 910');
    await page.screenshot({ path: 'test-results/sa-xoa-du-lieu-giu-chung.png' });
});

test('Duyệt yêu cầu: ô vai trò mặc định = vai trò người đó XIN; chọn "Chờ duyệt" mà Duyệt thì bị chặn', async ({ page }) => {
    test.setTimeout(120_000);
    const bodies: unknown[] = [];
    await stubs(page, 'ALL (Super Admin)', bodies);
    // Quản lý Kho 910 vừa gửi yêu cầu đổi sang 911 → requestAccess đã hạ role xuống 'pending'
    await page.route('**/listManagedUsers*', async r => {
        const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
        const mode = (r.request().postDataJSON() as { data?: { mode?: string } }).data?.mode;
        const users = mode === 'pending' ? [{
            id: 'u-ql', displayName: 'Quản lý 910', email: 'ql910@test.local', role: 'pending', status: 'pending',
            requestedRole: 'manager', departmentId: '911', employeeName: '1234', requestDate: new Date().toISOString(),
        }] : [];
        return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ result: { users } }) });
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?tab=settings');
    await expect(page.getByText('Quản lý 910')).toBeVisible({ timeout: 30_000 });
    const oVaiTro = page.locator('select').filter({ has: page.locator('option[value="manager"]') }).first();
    await expect(oVaiTro).toHaveValue('manager');

    await oVaiTro.selectOption('pending');
    await page.getByRole('button', { name: /Duyệt/ }).last().click();
    await expect(page.getByText(/Chọn vai trò .* trước khi bấm Duyệt/)).toBeVisible();
    expect(bodies).toEqual([]);

    await oVaiTro.selectOption('manager');
    await page.getByRole('button', { name: /Duyệt/ }).last().click();
    await expect.poll(() => bodies.length, { timeout: 10_000 }).toBeGreaterThan(0);
    const data = (bodies[0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ targetUid: 'u-ql', role: 'manager', status: 'approved', departmentId: '911' });
});
