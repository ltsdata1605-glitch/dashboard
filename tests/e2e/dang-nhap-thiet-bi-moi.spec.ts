/**
 * Đăng nhập trên thiết bị mới (2026-10-13, video chủ dự án): quay về app phải hiện "Đang hoàn tất" chứ không hiện lại
 * form; trang auth.dashboard.pro.vn phải tự sang Google (trước đây bắt bấm 2 lần). Xem functions/src/pwaHandoff.ts.
 */
import { test, expect, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

test('quay về app: hiện ngay "Đang hoàn tất", không hiện lại form', async ({ page, context }) => {
    await context.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', { get: () => true });
        localStorage.setItem('ycxPwaHandoff', JSON.stringify({ v: 'A'.repeat(43), at: Date.now() }));
    });
    let calls = 0;
    await context.route('**/pwaHandoffClaim', async route => {
        calls++;
        await new Promise(r => setTimeout(r, 300));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ready: false } }) });
    });
    const seen = new Set<string>();
    await page.goto('/');
    for (let i = 0; i < 40; i++) {
        if (await page.getByRole('button', { name: /Tiếp tục với Google/ }).isVisible().catch(() => false)) seen.add('FORM');
        if (await page.getByTestId('login-handoff-waiting').isVisible().catch(() => false)) seen.add('WAIT');
        await page.waitForTimeout(150);
    }

    expect(seen.has('FORM')).toBe(false);
    expect(seen.has('WAIT')).toBe(true);
    await page.screenshot({ path: 'test-results/dang-nhap-dang-hoan-tat.png' });
    await page.getByRole('button', { name: 'Huỷ' }).click();
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/ })).toBeVisible();
});

test('trang auth: tự sang Google, không bắt bấm thêm', async ({ page }) => {
    const html = readFileSync('auth-hosting/pwa-login.html', 'utf8');
    let toHandler = '';
    await page.route('https://auth.dashboard.pro.vn/pwa-login.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.route('https://auth.dashboard.pro.vn/__/**', r => { toHandler = r.request().url(); return r.fulfill({ status: 200, body: 'handler-stub' }); });
    await page.route('**/pwaHandoffStore', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"result":{"ok":true}}' }));
    await page.goto('https://auth.dashboard.pro.vn/pwa-login.html#c=' + 'B'.repeat(43));
    await expect.poll(() => toHandler, { timeout: 20_000 }).toContain('/__/auth/handler');

});
