import { expect, test } from '@playwright/test';

/**
 * Audit A32/A33 (2026-09-30) — So giá dùng server trên máy tính (localhost:3456).
 * A32: trên điện thoại báo rõ "chỉ dùng trên máy tính", không gọi localhost vô ích.
 * A33: view bị gỡ khi đang so giá → huỷ request + đóng luồng tiến độ (trước: chạy tiếp mồ côi).
 */
const HARNESS = '/tests/e2e/helpers/priceHarness.tsx';

test.describe('iPhone', () => {
    test.use({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    });
    test('báo chỉ dùng trên máy tính, không gọi localhost', async ({ page }) => {
        const goiLocalhost: string[] = [];
        page.on('request', r => { if (r.url().includes('localhost:3456')) goiLocalhost.push(r.url()); });
        await page.goto('/');
        await page.evaluate(async (p) => (await import(p)).mountPrice(), HARNESS);
        await expect(page.getByTestId('so-gia-chi-may-tinh')).toBeVisible();
        await expect(page.getByText('Chỉ dùng trên máy tính')).toBeVisible();
        await page.waitForTimeout(1000);
        expect(goiLocalhost).toEqual([]);
        await page.getByPlaceholder(/Paste danh sách sản phẩm/).fill('Tivi Samsung 55 inch');
        await page.getByRole('button', { name: /Thêm vào danh sách/ }).click();
        await expect(page.getByRole('button', { name: /Bắt đầu so sánh giá/ })).toBeDisabled();
    });
});

test('máy tính: gỡ view giữa lúc so giá → huỷ request và đóng luồng tiến độ', async ({ page }) => {
    await page.route('**://localhost:3456/api/health', r => r.fulfill({ status: 200, body: '{}' }));
    await page.route('**://localhost:3456/api/scrape-prices', () => { /* treo: không bao giờ trả lời */ });
    await page.addInitScript(() => {
        const w = window as unknown as { __sse: { url: string; dong: boolean }[] };
        w.__sse = [];
        window.EventSource = class {
            onmessage: unknown = null; onerror: unknown = null; rec: { url: string; dong: boolean };
            constructor(url: string) { this.rec = { url, dong: false }; w.__sse.push(this.rec); }
            close() { this.rec.dong = true; }
        } as unknown as typeof EventSource;
    });
    const huy: string[] = [];
    page.on('requestfailed', r => { if (r.url().includes('scrape-prices')) huy.push(r.failure()?.errorText || ''); });
    await page.goto('/');
    await page.evaluate(async (p) => (await import(p)).mountPrice(), HARNESS);
    await expect(page.getByText('Server Online')).toBeVisible();
    await page.getByPlaceholder(/Paste danh sách sản phẩm/).fill('Tivi Samsung 55 inch');
    await page.getByRole('button', { name: /Thêm vào danh sách/ }).click();
    await page.getByRole('button', { name: /Bắt đầu so sánh giá/ }).click();
    await expect(page.getByText('Đang chạy...')).toBeVisible();

    await page.evaluate(async (p) => (await import(p)).unmountPrice(), HARNESS);
    await expect.poll(() => huy.length, { timeout: 5000 }).toBe(1);
    const sse = await page.evaluate(() => (window as unknown as { __sse: { dong: boolean }[] }).__sse);
    expect(sse).toHaveLength(1);
    expect(sse[0].dong, 'luồng tiến độ phải được đóng khi gỡ view').toBe(true);
});
