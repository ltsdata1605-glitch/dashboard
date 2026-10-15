/**
 * Gửi Notify: bot hết hạn mức tin LINE tháng (LINE trả 429 monthly limit) → màn lịch phải báo RÕ, không im lặng "0/1 nhóm"
 * (2026-10-15). Tài khoản thật chỉ đọc; phản hồi action=quota giả lập hết hạn mức.
 */
import { expect, test } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';
test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
test.use({ viewport: { width: 1280, height: 900 }, launchOptions: { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) } });
test('Gửi Notify: hiện hạn mức tin LINE thật', async ({ page }) => {
    test.setTimeout(150_000);
    await chanGhiCloud(page);
    // Cho riêng action=quota đi thật (chỉ đọc số từ LINE). Đăng ký SAU chanGhiCloud nên được ưu tiên.
    await page.context().route(/lineBotWebhook\?action=quota/, async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, type: 'limited', limit: 300, used: 300, exhausted: true }) });
    });
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
    await page.goto('/?tab=tools-line-bot');
    await page.getByText('Gửi Notify', { exact: true }).first().click({ timeout: 30_000 });
    await page.waitForTimeout(8000);
    await expect(page.getByText('Bot đã hết hạn mức tin nhắn LINE tháng này')).toBeVisible();
    await page.screenshot({ path: 'test-results/han-muc-line.png' });
});
