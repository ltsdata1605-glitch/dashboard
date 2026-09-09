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

    /**
     * Check Thưởng là app vanilla độc lập, nạp thư viện qua CDN nên KHÔNG đi qua npm —
     * vì thế nó bị bỏ sót khi Đợt 1 vá lỗ hổng xlsx cho cả dự án, và vẫn dùng bản 0.18.5
     * dính CVE-2023-30533 (Prototype Pollution) + CVE-2024-22363 (ReDoS) trong khi chính
     * nó parse file Excel người dùng tải lên. Test này khoá phiên bản đã vá để không ai
     * vô tình hạ ngược.
     */
    test('check-thuong.html dùng xlsx đã vá lỗ hổng (>= 0.20.3), không phải bản 0.18.5', async ({ page }) => {
        await page.goto('/check-thuong.html');
        await page.waitForTimeout(3000);
        const version = await page.evaluate(
            () => (window as unknown as { XLSX?: { version?: string } }).XLSX?.version
        );
        expect(version, 'không nạp được thư viện XLSX trong check-thuong.html').toBeTruthy();
        expect(version, `xlsx ${version} vẫn dính CVE — phải dùng >= 0.20.3 từ cdn.sheetjs.com`).not.toBe('0.18.5');
        const [maj, min] = String(version).split('.').map(Number);
        expect(maj > 0 || min >= 20, `phiên bản xlsx quá cũ: ${version}`).toBe(true);
    });
});
