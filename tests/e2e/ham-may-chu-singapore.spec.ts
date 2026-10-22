/**
 * App gọi Cloud Functions ở Singapore (asia-southeast1, cùng vùng Firestore — functions/src/region.ts), không còn gọi
 * us-central1 (Mỹ). Đăng nhập tài khoản thật (chỉ đọc) phải vẫn vào được. 2026-10-14.
 */
import { expect, test } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';
test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
test.use({ launchOptions: { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) } });
test('hàm gọi qua Singapore, đăng nhập thật vẫn vào được', async ({ page }) => {
    test.setTimeout(120_000);
    const urls: string[] = [];
    page.on('request', r => { const u = r.url(); if (/cloudfunctions\.net|\.run\.app/.test(u)) urls.push(u.replace(/\?.*/, '')); });
    const loi: string[] = []; page.on('pageerror', e => loi.push(e.message));
    await chanGhiCloud(page);
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/i })).toHaveCount(0, { timeout: 60_000 });
    await page.waitForTimeout(8000);
    console.log('GOI_HAM', JSON.stringify([...new Set(urls)]), 'LOI', loi.length);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter(u => u.includes('us-central1'))).toEqual([]);
});
