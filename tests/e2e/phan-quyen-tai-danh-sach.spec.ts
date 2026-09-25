import { test, expect, type Page } from '@playwright/test';

/**
 * Chủ dự án báo 2026-09-25: màn "Phân quyền & Duyệt yêu cầu" *"load danh sách rất lâu, mặc dù
 * danh sách không có siêu thị nào"*.
 *
 * Nguyên nhân: chuông thông báo/badge đã tải sẵn danh sách chờ duyệt vào RAM qua
 * `services/pendingApprovalsStore.ts`, nhưng `UserManagementView` lại gọi Cloud Function
 * `listManagedUsers` MỘT LẦN NỮA cho đúng dữ liệu đó — người dùng ngồi chờ một vòng gọi mạng để
 * nhận về danh sách rỗng mà app đã biết từ trước.
 *
 * Test dựng Cloud Function GIẢ chậm 2,5 giây (đúng cảm giác "rất lâu") và đếm số lượt gọi.
 */
const CHAM_MS = 2500;

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
const fakeUser = {
  uid: 'u-quanly', email: 'quanly@test.local', displayName: 'Quản Lý Kho 405', photoURL: null,
  getIdTokenResult: async () => ({ claims: { role: 'manager', departmentId: '405' } }),
  getIdToken: async () => 'token',
};
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
export const resolveSession = async () => ({
  role: 'manager', status: 'approved', departmentId: '405', employeeName: '21707 - Lê Trường Sơn', expiresAt: null,
});
export const requestAccess = async () => {};
`;

/** Cloud Function giả: chậm ${CHAM_MS}ms, trả danh sách RỖNG, và đếm số lượt bị gọi */
const ADMIN_SERVICE_STUB = `
export const MANAGED_USERS_CHANGED_EVENT = 'ycx-managed-users-changed';
window.__soLuotGoi = 0;
export const listManagedUsers = async (mode) => {
  window.__soLuotGoi++;
  window.__lanGoiCuoi = mode;
  await new Promise(r => setTimeout(r, ${CHAM_MS}));
  return [];
};
export const adminUpdateUser = async () => {
  window.dispatchEvent(new CustomEvent(MANAGED_USERS_CHANGED_EVENT));
};
`;

async function moApp(page: Page) {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
    await page.route('**/services/adminUserService.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: ADMIN_SERVICE_STUB }));
}

test('mở màn Phân quyền: hiện danh sách NGAY, không gọi lại Cloud Function', async ({ page }) => {
    test.setTimeout(90000);
    await moApp(page);

    // 1. Mở app ở tab khác — chuông thông báo/badge tự tải danh sách chờ duyệt vào RAM
    await page.goto('/?tab=analysis');
    await page.waitForTimeout(6000); // đủ cho lượt tải nền (2,5s) xong

    const truocKhiMo = await page.evaluate(() => (window as unknown as { __soLuotGoi: number }).__soLuotGoi);
    console.log(`SỐ LƯỢT GỌI CLOUD FUNCTION trước khi mở màn Phân quyền: ${truocKhiMo}`);

    // 2. Người dùng bấm vào thẻ tài khoản ở sidebar để mở màn Phân quyền — ĐIỀU HƯỚNG TRONG APP
    //    (không tải lại trang), đúng như thao tác thật.
    const t0 = Date.now();
    await page.getByTitle('Phân Quyền & Duyệt Yêu Cầu').first().click();
    await page.getByRole('button', { name: /Chờ duyệt/i }).first().waitFor({ state: 'visible', timeout: 20000 });

    // Chờ khu danh sách thôi hiện spinner "Đang tải danh sách..."
    await page.getByText(/Đang tải danh sách/i).waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    const msHienDanhSach = Date.now() - t0;

    const sauKhiMo = await page.evaluate(() => (window as unknown as { __soLuotGoi: number }).__soLuotGoi);
    console.log(`THỜI GIAN tới lúc hiện danh sách: ${msHienDanhSach}ms | số lượt gọi thêm: ${sauKhiMo - truocKhiMo}`);

    await page.screenshot({ path: 'test-results/phan-quyen-tai-nhanh.png', fullPage: false });

    // Dữ liệu đã nằm sẵn trong RAM -> KHÔNG được gọi lại Cloud Function cho tab "Chờ duyệt"
    expect(sauKhiMo - truocKhiMo).toBe(0);
    // và không được bắt người dùng chờ hết một vòng gọi mạng giả lập 2,5 giây
    expect(msHienDanhSach).toBeLessThan(CHAM_MS);
});

test('mở thẳng bằng đường dẫn: view và chuông dùng CHUNG một request, không gọi 2 lượt', async ({ page }) => {
    test.setTimeout(90000);
    await moApp(page);

    // Tải thẳng vào màn Phân quyền: cả chuông thông báo lẫn màn này cùng cần danh sách chờ duyệt
    await page.goto('/?tab=settings');
    await page.getByRole('button', { name: /Chờ duyệt/i }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByText(/Đang tải danh sách/i).waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const soLuot = await page.evaluate(() => (window as unknown as { __soLuotGoi: number }).__soLuotGoi);
    console.log(`SỐ LƯỢT GỌI khi tải thẳng vào màn Phân quyền: ${soLuot}`);
    // Trước bản sửa: 2 lượt (chuông 1 + màn này 1) chạy song song, cùng chậm.
    expect(soLuot).toBe(1);
});
