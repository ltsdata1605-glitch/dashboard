import { test, expect, devices } from '@playwright/test';

/**
 * Nhớ tài khoản đã dùng trên máy (2026-10-21, chủ dự án yêu cầu): lần sau Google chọn sẵn tài khoản đó (login_hint), bỏ bước
 * chọn tài khoản. "Dùng tài khoản khác" quên đi → lại hiện danh sách chọn. Đi THẲNG tới trang xử lý của Firebase.
 */
test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

async function moTrangDangNhap(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
    let toi = '';
    await context.route('https://auth.dashboard.pro.vn/**', r => { toi = r.request().url(); return r.fulfill({ status: 200, body: 'stub' }); });
    await context.route('**/pwaHandoffStore', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"result":{"ok":true}}' }));
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Tiếp tục với Google/ });
    await expect(btn).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500); // chờ băm mã sẵn
    return { btn, toi: () => toi };
}
const thamSo = (url: string) => JSON.parse(new URL(url).searchParams.get('customParameters') || '{}');

test('đã nhớ tài khoản: hiện email, Google chọn sẵn tài khoản đó', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('ycxTaiKhoanGanNhat', JSON.stringify({ email: 'quanly@vd.vn', ten: 'Quản lý' })));
    const { btn, toi } = await moTrangDangNhap(page, context);
    await expect(page.getByTestId('login-tai-khoan-nho')).toContainText('quanly@vd.vn');
    await page.screenshot({ path: 'test-results/nho-tai-khoan.png' });
    await btn.click();
    await expect.poll(toi, { timeout: 10_000 }).toContain('/__/auth/handler');
    expect(thamSo(toi())).toEqual({ login_hint: 'quanly@vd.vn' });
    expect(new URL(new URL(toi()).searchParams.get('redirectUrl')!).searchParams.get('h')).toBe('quanly@vd.vn');
});

test('"Dùng tài khoản khác": quên tài khoản, Google hiện danh sách chọn', async ({ page, context }) => {
    await context.addInitScript(() => { if (!sessionStorage.getItem('da-dat')) { sessionStorage.setItem('da-dat', '1'); localStorage.setItem('ycxTaiKhoanGanNhat', JSON.stringify({ email: 'quanly@vd.vn' })); } });
    const { btn, toi } = await moTrangDangNhap(page, context);
    await page.getByRole('button', { name: 'Dùng tài khoản khác' }).click();
    await expect(page.getByTestId('login-tai-khoan-nho')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ycxTaiKhoanGanNhat'))).toBeNull();
    await btn.click();
    await expect.poll(toi, { timeout: 10_000 }).toContain('/__/auth/handler');
    expect(thamSo(toi())).toEqual({ prompt: 'select_account' });
});

test('đăng xuất (dọn dữ liệu máy) VẪN nhớ tài khoản; "Xoá tất cả dữ liệu" thì quên', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const ketQua = await page.evaluate(async () => {
        const duongDan = '/services/localDataOwner.ts';
        const owner = await import(/* @vite-ignore */ duongDan) as { clearAllLocalAppData: (o?: { xoaKhaiThacRiengHienTai?: boolean }) => Promise<void> };
        localStorage.setItem('ycxTaiKhoanGanNhat', JSON.stringify({ email: 'quanly@vd.vn' }));
        localStorage.setItem('ycx_du_lieu_rieng', 'x');
        await owner.clearAllLocalAppData(); // đúng bước AuthContext.logout()
        const sauDangXuat = [localStorage.getItem('ycxTaiKhoanGanNhat'), localStorage.getItem('ycx_du_lieu_rieng')];
        await owner.clearAllLocalAppData({ xoaKhaiThacRiengHienTai: true }); // "Xoá tất cả dữ liệu (Người dùng mới)"
        return { sauDangXuat, sauXoaHet: localStorage.getItem('ycxTaiKhoanGanNhat') };
    });
    expect(ketQua.sauDangXuat).toEqual([JSON.stringify({ email: 'quanly@vd.vn' }), null]);
    expect(ketQua.sauXoaHet).toBeNull();
});
