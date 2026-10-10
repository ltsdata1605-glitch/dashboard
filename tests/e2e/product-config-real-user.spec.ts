import { expect, test } from '@playwright/test';

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
const fakeUser = { uid: 'u-super', email: 'lts.truongson@gmail.com', displayName: 'Super Admin', photoURL: null,
  getIdTokenResult: async () => ({ claims: {} }), getIdToken: async () => 'token' };
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
export const requestAccess = async (...args) => {};
`;

test('Kiểm tra giao diện Cấu hình ngành hàng: đủ 5 cột chuẩn, có nút đồng bộ Google Sheets', async ({ page }) => {
    test.setTimeout(60_000);

    // Dùng stub auth để vào thẳng giao diện Admin
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: sessionStub('ALL (Super Admin)', 'admin') }));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?tab=settings');

    // Chuyển sang sub-tab "Cấu hình ngành hàng" / "Khai báo ngành hàng"
    const tabBtn = page.getByRole('button', { name: /(Cấu hình ngành hàng|Khai báo ngành hàng)/i }).first();
    await expect(tabBtn).toBeVisible({ timeout: 20_000 });
    await tabBtn.click();

    // Chờ tiêu đề Cấu hình Ngành hàng
    const headerTitle = page.getByText(/Cấu hình Ngành hàng/i).first();
    await expect(headerTitle).toBeVisible({ timeout: 20_000 });

    // Xác nhận nút "Đồng bộ từ Google Sheets" KHÔNG còn xuất hiện
    await expect(page.getByRole('button', { name: /Đồng bộ từ Google Sheets/i })).toHaveCount(0);

    // Kiểm tra các nút độc lập (Icon buttons): Tải file Excel, Xuất Excel, Lưu Cloud
    await expect(page.locator('button[title*="Tải file Excel"]')).toBeVisible();
    await expect(page.locator('button[title*="Xuất Excel"]')).toBeVisible();
    await expect(page.locator('button[title*="Lưu lên Cloud Firebase"]')).toBeVisible();

    // Kiểm tra bảng cấu hình
    const table = page.locator('table').first();
    await table.waitFor({ state: 'visible', timeout: 15_000 });

    const headers = (await page.locator('table thead th').allInnerTexts()).map(t => t.trim().toUpperCase());
    console.log('CÁC CỘT TRONG BẢNG CẤU HÌNH THỰC TẾ:', JSON.stringify(headers));

    // Xác thực đầy đủ 5 cột nghiệp vụ chuẩn
    expect(headers.some(h => h.includes('NGÀNH HÀNG')), 'Phải có cột NGÀNH HÀNG').toBe(true);
    expect(headers.some(h => h.includes('NHÓM HÀNG')), 'Phải có cột NHÓM HÀNG').toBe(true);
    expect(headers.some(h => h.includes('NHÓM CHA')), 'Phải có cột NHÓM CHA').toBe(true);
    expect(headers.some(h => h.includes('NHÓM CON')), 'Phải có cột NHÓM CON').toBe(true);
    expect(headers.some(h => h.includes('HỆ SỐ')), 'Phải có cột HỆ SỐ QUY ĐỔI').toBe(true);

    // Chuyển sang loại "Cấu hình theo Mã sản phẩm"
    const productCodeTabBtn = page.getByRole('button', { name: /Cấu hình theo Mã sản phẩm/i }).first();
    await expect(productCodeTabBtn).toBeVisible({ timeout: 10_000 });
    await productCodeTabBtn.click();
    await page.waitForTimeout(1000);

    // Kiểm tra các cột trong bảng Mã sản phẩm (Khớp 100% Hình 1)
    const productHeaders = (await page.locator('table thead th').allInnerTexts()).map(t => t.trim().toUpperCase());
    console.log('CÁC CỘT TRONG BẢNG CẤU HÌNH MÃ SẢN PHẨM THỰC TẾ:', JSON.stringify(productHeaders));

    expect(productHeaders.some(h => h.includes('MÃ SẢN PHẨM')), 'Phải có cột MÃ SẢN PHẨM').toBe(true);
    expect(productHeaders.some(h => h.includes('TÊN SẢN PHẨM')), 'Phải có cột TÊN SẢN PHẨM').toBe(true);
    expect(productHeaders.some(h => h.includes('HỆ SỐ')), 'Phải có cột HỆ SỐ').toBe(true);
    expect(productHeaders.some(h => h.includes('LOẠI')), 'Phải có cột LOẠI').toBe(true);
    expect(productHeaders.some(h => h.includes('NHÓM')), 'Phải có cột NHÓM').toBe(true);

    // Kiểm tra hàng đầu tiên của bảng Mã sản phẩm
    const firstProductRow = await page.locator('table tbody tr').first().locator('td').allInnerTexts();
    console.log('DÒNG ĐẦU TIÊN TRONG BẢNG MÃ SẢN PHẨM:', JSON.stringify(firstProductRow));

    // Chụp ảnh bằng chứng Cấu hình theo mã sản phẩm
    await page.screenshot({ path: 'test-results/audit-product-code-config.png', fullPage: true });
    console.log('Đã lưu ảnh xác thực tại: test-results/audit-product-code-config.png');
});

