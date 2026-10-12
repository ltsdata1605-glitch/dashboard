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

/**
 * Bật Chế độ Dùng Thử. Bản cũ dùng `if (await demo.isVisible())` — hàm đó KHÔNG chờ, nó hỏi ngay
 * lập tức; React chưa vẽ xong nút thì trả `false`, test lặng lẽ bỏ qua cú bấm rồi hỏng ở bước sau
 * với thông điệp chẳng liên quan. Ở đây chờ nút hiện ra rồi mới quyết định.
 */
async function activateDemoMode(page: import('@playwright/test').Page) {
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    await demo.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => { /* đã ở chế độ dùng thử */ });
    if (await demo.isVisible().catch(() => false)) await demo.click();
}


test.describe('Tab dùng iframe không bị CSP chặn', () => {
    test('Check Thưởng chạy NGAY TRONG app (không còn iframe), không khung nào bị CSP chặn', async ({ page }) => {
        // Chủ dự án chuyển Check Thưởng sang component React gốc (features/check-thuong, 2026-10-11) — tab không còn nhúng
        // iframe /check-thuong.html. Test cũ chờ thẻ iframe đó nên đỏ từ khi đổi; kiểm đúng hiện trạng (như tab Tính thuế).
        await page.goto('/?tab=check-thuong');
        await activateDemoMode(page);

        // Chưa có dữ liệu → ô nạp file của màn trống (chỉ chọn file, không cần đăng nhập).
        await expect(page.locator('input[type="file"][accept*=".xlsx"]').first()).toBeAttached({ timeout: 30_000 });
        await expect(page.locator('iframe[src*="check-thuong"]')).toHaveCount(0);
        const urls = page.frames().map(f => f.url());
        expect(urls.some(u => u.startsWith('chrome-error')), `có khung bị chặn. URLs: ${JSON.stringify(urls)}`).toBe(false);
    });

    test('Tính thuế chạy NGAY TRONG app (không còn iframe Cloud Run), không khung nào bị CSP chặn', async ({ page }) => {
        // Tab 'tools-tax' từng nhúng iframe ra Cloud Run (*.run.app); nay App.tsx render thẳng
        // <TaxCalculatorView /> và trong code không còn chỗ nào nạp *.run.app — test cũ chờ thẻ iframe
        // đó nên đỏ từ khi đổi (cập nhật 2026-09-28). Kiểm đúng hiện trạng thay vì thứ đã bị gỡ.
        await page.goto('/?tab=tools-tax');
        await activateDemoMode(page);

        await expect(page.getByTestId('tax-result-panel')).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('iframe[src*="run.app"]')).toHaveCount(0);
        const urls = page.frames().map(f => f.url());
        expect(urls.some(u => u.startsWith('chrome-error')), `có khung bị chặn. URLs: ${JSON.stringify(urls)}`).toBe(false);
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
        // Từ 2026-10-11 xlsx nạp THEO NHU CẦU (napThuVien) thay vì thẻ <script> chặn hiển thị → gọi đúng hàm trang dùng khi
        // người dùng nạp file Excel, để kiểm chính bản thư viện mà luồng thật sẽ chạy.
        await page.evaluate(() => (window as unknown as { napThuVien?: (t: string) => Promise<unknown> }).napThuVien?.('xlsx')?.catch(() => undefined));
        // Chờ thư viện nạp xong thay vì ngủ cố định — script tải từ CDN, thời gian phụ thuộc mạng.
        await page.waitForFunction(
            () => Boolean((window as unknown as { XLSX?: { version?: string } }).XLSX?.version),
            undefined,
            { timeout: 30_000 },
        ).catch(() => { /* để phần expect bên dưới báo lỗi cho rõ nghĩa */ });
        const version = await page.evaluate(
            () => (window as unknown as { XLSX?: { version?: string } }).XLSX?.version
        );
        expect(version, 'không nạp được thư viện XLSX trong check-thuong.html').toBeTruthy();
        expect(version, `xlsx ${version} vẫn dính CVE — phải dùng >= 0.20.3 từ cdn.sheetjs.com`).not.toBe('0.18.5');
        const [maj, min] = String(version).split('.').map(Number);
        expect(maj > 0 || min >= 20, `phiên bản xlsx quá cũ: ${version}`).toBe(true);
    });
});
