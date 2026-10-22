/**
 * Gửi Notify: bot hết hạn mức tin LINE tháng (LINE trả 429 monthly limit) → màn lịch phải báo RÕ, không im lặng "0/1 nhóm"
 * (2026-10-15). Tài khoản thật chỉ đọc; phản hồi action=quota giả lập hết hạn mức.
 */
import { expect, test } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';
test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
test.use({ viewport: { width: 1280, height: 900 }, launchOptions: { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) } });
const moManNotify = async (page: import('@playwright/test').Page, phanHoi: object) => {
    await chanGhiCloud(page);
    // Phản hồi action=quota giả lập. Đăng ký SAU chanGhiCloud nên được ưu tiên.
    await page.context().route(/lineBotWebhook\?action=quota/, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, ...phanHoi }) }));
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/i })).toHaveCount(0, { timeout: 60_000 });
    await page.goto('/?tab=tools-line-bot');
    await page.getByText('Gửi Notify', { exact: true }).first().click({ timeout: 30_000 });
    await page.waitForTimeout(6000);
};

test('Gửi Notify: lịch đang bật vượt hạn mức gói → cảnh báo trước khi hết', async ({ page }) => {
    test.setTimeout(150_000);
    await moManNotify(page, { limit: 1000, used: 120, exhausted: false, notifyCaThang: 9300, notifyConLai: 5100 });
    await expect(page.getByText('Lịch Gửi Notify vượt hạn mức gói LINE')).toBeVisible();
    await expect(page.getByText(/9\.300 tin\/tháng/)).toBeVisible();
});

test('Gửi Notify: lịch trong hạn mức → chỉ dòng ước tính, không cảnh báo', async ({ page }) => {
    test.setTimeout(150_000);
    await moManNotify(page, { limit: 1000, used: 120, exhausted: false, notifyCaThang: 600, notifyConLai: 300 });
    await expect(page.getByText(/Lịch đang bật cần khoảng 600\/1\.000 tin/)).toBeVisible();
    await expect(page.getByText('Lịch Gửi Notify vượt hạn mức gói LINE')).toHaveCount(0);
});

test('Gửi Notify: hiện hạn mức tin LINE thật', async ({ page }) => {
    test.setTimeout(150_000);
    await chanGhiCloud(page);
    // Cho riêng action=quota đi thật (chỉ đọc số từ LINE). Đăng ký SAU chanGhiCloud nên được ưu tiên.
    await page.context().route(/lineBotWebhook\?action=quota/, async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, type: 'limited', limit: 300, used: 300, exhausted: true }) });
    });
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/i })).toHaveCount(0, { timeout: 60_000 });
    await page.goto('/?tab=tools-line-bot');
    await page.getByText('Gửi Notify', { exact: true }).first().click({ timeout: 30_000 });
    await page.waitForTimeout(8000);
    await expect(page.getByText('Bot đã hết hạn mức tin nhắn LINE tháng này')).toBeVisible();
    await page.screenshot({ path: 'test-results/han-muc-line.png' });
});
