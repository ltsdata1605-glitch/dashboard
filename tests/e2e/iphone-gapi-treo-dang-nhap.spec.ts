/**
 * iPhone mà apis.google.com treo (khung ẩn gapi không tải xong) vẫn phải đăng nhập/nhận phiên được NGAY — 2026-10-21,
 * video chủ dự án kẹt "Đang hoàn tất đăng nhập…". Trước đây services/firebase.ts dùng getAuth(): trên iPhone thư viện
 * chờ gapi (tới 60 s) rồi mới xong khởi tạo → signInWithCredential/signInWithCustomToken treo theo.
 * Tài khoản thật, CHỈ ĐỌC (chanGhiCloud).
 */
import { expect, test, devices } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';
test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
test.use({
    ...devices['iPhone 15'], defaultBrowserType: undefined,
    launchOptions: { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) },
});
test('iPhone, apis.google.com treo: đăng nhập vẫn xong trong vài giây', async ({ page, context }) => {
    test.setTimeout(120_000);
    const gapi: string[] = [];
    await context.route('https://apis.google.com/**', r => { gapi.push(r.request().url()); return new Promise(() => {}); });
    await chanGhiCloud(page);
    const t0 = Date.now();
    await dangNhapBangToken(page);
    const msDangNhap = Date.now() - t0;
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/i })).toHaveCount(0, { timeout: 30_000 });
    console.log('DANG_NHAP_MS', msDangNhap, 'GAPI', gapi.length);
    expect(msDangNhap).toBeLessThan(20_000);
    expect(gapi).toEqual([]);
    // Đăng nhập xong thì nhớ tài khoản cho lần sau (Google chọn sẵn).
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ycxTaiKhoanGanNhat') || 'null')?.email ?? ''), { timeout: 10_000 }).toContain('@');
});
