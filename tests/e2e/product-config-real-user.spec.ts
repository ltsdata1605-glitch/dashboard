import { expect, test } from '@playwright/test';

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
const fakeUser = { uid: 'u-super', email: 'lts.truongson@gmail.com', displayName: 'Super Admin', photoURL: null,
  getIdTokenResult: async () => ({ claims: {} }), getIdToken: async () => 'token' };
export function getAuth() { return { currentUser: fakeUser }; }
export function initializeAuth() { return { currentUser: fakeUser }; } // services/firebase.ts dùng initializeAuth (2026-10-21)
export const indexedDBLocalPersistence = {}; export const browserPopupRedirectResolver = {};
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb(fakeUser), 30); return noop; }
export async function signInWithPopup() { return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signInWithCredential() { return { user: null }; } // đăng nhập app Màn hình chính iPhone (services/firebase.ts, 2026-10-12)
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

    // Kiểm tra bảng cấu hình
    const table = page.locator('table').first();
    await table.waitFor({ state: 'visible', timeout: 15_000 });

    // Kiểm tra các nút độc lập (Icon buttons): Tải file Excel, Xuất Excel, Lưu Cloud
    await expect(page.locator('button[title*="Tải file Excel"]')).toBeVisible();
    const exportBtn = page.locator('button[title*="Xuất Excel"]').first();
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled({ timeout: 10_000 });

    // Xác thực tải file từ tab "Khai báo ngành hàng": tên file phải khớp tên tab (Khai_Bao_Nganh_Hang_*.xlsx)
    const [downloadCategory] = await Promise.all([
        page.waitForEvent('download'),
        exportBtn.click(),
    ]);
    const categoryFilename = downloadCategory.suggestedFilename();
    console.log('TÊN FILE TẢI VỀ TỪ TAB KHAI BÁO NGÀNH HÀNG:', categoryFilename);
    expect(categoryFilename).toMatch(/^Khai_Bao_Nganh_Hang_\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Xác thực badge "... mục" KHÔNG CÒN xuất hiện ở góc phải filter bar của tab Khai báo ngành hàng
    await expect(page.locator('.p-3').first().locator('span:has-text("mục")')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/audit-tab-1-category.png', fullPage: true });

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

    // Xác thực tải file từ tab "Cấu hình theo Mã sản phẩm": tên file phải khớp tên tab (Cau_Hinh_Theo_Ma_San_Pham_*.xlsx)
    const [downloadProductCode] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('button[title*="Xuất Excel"]').first().click(),
    ]);
    const productCodeFilename = downloadProductCode.suggestedFilename();
    console.log('TÊN FILE TẢI VỀ TỪ TAB CẤU HÌNH THEO MÃ SẢN PHẨM:', productCodeFilename);
    expect(productCodeFilename).toMatch(/^(Cau_Hinh_Theo_Ma_San_Pham|Mau_Cau_Hinh_Theo_Ma_San_Pham)_\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Xác thực badge "... mục" và banner giải thích nghiệp vụ KHÔNG CÒN xuất hiện ở tab Mã sản phẩm
    await expect(page.locator('.p-3').first().locator('span:has-text("mục")')).toHaveCount(0);
    await expect(page.getByText(/Hệ số quy đổi số lượng \(SL\):/i)).toHaveCount(0);
    await page.screenshot({ path: 'test-results/audit-tab-2-product-code.png', fullPage: true });

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

    // Xác thực nút Thêm mới trong tab Mã sản phẩm có viền xanh emerald
    const addProductBtn = page.getByRole('button', { name: /Thêm mới/i }).first();
    await expect(addProductBtn).toBeVisible();

    // Chuyển sang sub-tab "Hình thức xuất"
    const htxTabBtn = page.getByRole('button', { name: /Hình thức xuất/i }).first();
    await expect(htxTabBtn).toBeVisible({ timeout: 10_000 });
    await htxTabBtn.click();
    await page.waitForTimeout(1000);

    // Xác thực tải file từ tab "Hình thức xuất": tên file phải khớp tên tab (Hinh_Thuc_Xuat_*.xlsx)
    const [downloadHtx] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('button[title*="Xuất Excel"]').first().click(),
    ]);
    const htxFilename = downloadHtx.suggestedFilename();
    console.log('TÊN FILE TẢI VỀ TỪ TAB HÌNH THỨC XUẤT:', htxFilename);
    expect(htxFilename).toMatch(/^Hinh_Thuc_Xuat_\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Xác thực badge "... mục" và thanh KPI Chips KHÔNG CÒN xuất hiện ở tab Hình thức xuất
    await expect(page.locator('.p-3').first().locator('span:has-text("mục")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Tính DT")')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/audit-tab-3-htx.png', fullPage: true });

    // Kiểm tra các cột trong bảng Hình thức xuất
    const htxHeaders = (await page.locator('table thead th').allInnerTexts()).map(t => t.trim().toUpperCase());
    console.log('CÁC CỘT TRONG BẢNG HÌNH THỨC XUẤT THỰC TẾ:', JSON.stringify(htxHeaders));

    expect(htxHeaders.some(h => h.includes('STT')), 'Phải có cột STT').toBe(true);
    expect(htxHeaders.some(h => h.includes('TÊN HÌNH THỨC XUẤT')), 'Phải có cột TÊN HÌNH THỨC XUẤT').toBe(true);
    expect(htxHeaders.some(h => h.includes('PHÂN LOẠI')), 'Phải có cột PHÂN LOẠI').toBe(true);
    expect(htxHeaders.some(h => h.includes('TÍNH DOANH THU')), 'Phải có cột TÍNH DOANH THU').toBe(true);

    // Xác thực nút Thêm mới trong tab Hình thức xuất
    const addHtxBtn = page.getByRole('button', { name: /Thêm mới/i }).first();
    await expect(addHtxBtn).toBeVisible();

    // Chuyển sang sub-tab "Tải file mẫu"
    const templateTabBtn = page.getByRole('button', { name: /(Tải file mẫu|File mẫu)/i }).first();
    await expect(templateTabBtn).toBeVisible({ timeout: 10_000 });
    await templateTabBtn.click();
    await page.waitForTimeout(1000);

    // Xác thực tiêu đề 3 thẻ file mẫu
    await expect(page.getByText('1. Mẫu Khai Báo Ngành Hàng')).toBeVisible();
    await expect(page.getByText('2. Mẫu Cấu Hình Theo Mã Sản Phẩm')).toBeVisible();
    await expect(page.getByText('3. Mẫu Hình Thức Xuất')).toBeVisible();

    // Xác thực KHÔNG CÒN bảng xem trước dữ liệu mẫu (đã được fix gọn lại)
    await expect(page.getByText(/Xem trước dữ liệu mẫu/i)).toHaveCount(0);
    await expect(page.getByText(/3 Dòng mẫu cho 3 loại hệ số/i)).toHaveCount(0);

    // Xác thực 3 nút Tải file mẫu bên trong 3 thẻ file mẫu đều sẵn sàng
    const downloadBtns = page.locator('.grid').getByRole('button', { name: /Tải file mẫu/i });
    await expect(downloadBtns).toHaveCount(3);

    // Xác thực khi chọn tab Tải file mẫu, 2 nút Xuất Excel và Lưu Cloud ở hàng trên ĐÃ ĐƯỢC ẨN HOÀN TOÀN
    await expect(page.locator('button[title*="Xuất Excel"]')).toHaveCount(0);
    await expect(page.locator('button[title*="Lưu lên Cloud Firebase"]')).toHaveCount(0);

    // Chụp ảnh bằng chứng Cấu hình
    await page.screenshot({ path: 'test-results/audit-product-config-all-tabs.png', fullPage: true });
    console.log('Đã lưu ảnh xác thực tại: test-results/audit-product-config-all-tabs.png');
});

