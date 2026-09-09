import { expect, test } from '@playwright/test';

/**
 * Test hồi quy cho các tab chạy bằng <iframe> — sinh ra sau một sự cố THẬT:
 *
 * CSP bật ở Đợt 2 (index.html) khai `frame-src` mà QUÊN `'self'` và `https://*.run.app`,
 * khiến 2 tính năng hỏng HOÀN TOÀN mà không ai phát hiện: Check Thưởng (iframe nội bộ
 * /check-thuong.html) và Hoàn thuế (iframe ra Cloud Run). Lý do không ai phát hiện: lúc đó
 * KHÔNG có test nào phủ 2 tab này, và trình duyệt không báo lỗi ồn ào — iframe chỉ lặng lẽ
 * thành `chrome-error://chromewebdata/`.
 *
 * Dấu hiệu nhận biết dùng ở đây: iframe bị chặn có URL `chrome-error://...` thay vì URL thật.
 */
test.describe('Tab dùng iframe không bị CSP chặn', () => {
    test('Check Thưởng nạp được iframe nội bộ /check-thuong.html', async ({ page }) => {
        await page.goto('/?tab=check-thuong');
        const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
        if (await demo.isVisible().catch(() => false)) await demo.click();
        await page.waitForTimeout(3500);

        const urls = page.frames().map(f => f.url());
        expect(urls.some(u => u.startsWith('chrome-error')), `iframe bị chặn — kiểm tra frame-src trong index.html. URLs: ${JSON.stringify(urls)}`).toBe(false);

        const frame = page.frames().find(f => f.url().includes('check-thuong.html'));
        expect(frame, 'không tìm thấy iframe check-thuong.html').toBeTruthy();
        await expect(frame!.locator('body')).toContainText(/Tra cứu thưởng/i, { timeout: 15_000 });
    });

    test('Hoàn thuế nạp được iframe ra Cloud Run (*.run.app)', async ({ page }) => {
        await page.goto('/?tab=tools-tax');
        const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
        if (await demo.isVisible().catch(() => false)) await demo.click();
        await page.waitForTimeout(4000);

        const urls = page.frames().map(f => f.url());
        expect(urls.some(u => u.startsWith('chrome-error')), `iframe bị chặn — kiểm tra frame-src trong index.html. URLs: ${JSON.stringify(urls)}`).toBe(false);
        expect(urls.some(u => u.includes('run.app')), `không thấy iframe Cloud Run. URLs: ${JSON.stringify(urls)}`).toBe(true);
    });
});
