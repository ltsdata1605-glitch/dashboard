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


/**
 * Chờ frame con điều hướng XONG, dù thành công hay bị chặn.
 *
 * Thẻ `<iframe>` gắn vào DOM và frame con tồn tại KHÔNG có nghĩa là nó đã đi tới đâu: ngay sau khi
 * gắn, `frame.url()` còn là chuỗi rỗng. Bản vá đầu của tôi chỉ chờ tới mức đó rồi đọc URL luôn nên
 * test đỏ ngay ở máy dev với `URLs: [..., ""]` — sửa hụt một nhịp.
 *
 * Chờ tới khi URL frame con mang dấu hiệu đã ngã ngũ: hoặc đúng đích, hoặc `chrome-error://` (dấu
 * hiệu bị CSP chặn — chính thứ 2 test này sinh ra để bắt). Cả hai đều cho phần `expect` bên dưới
 * chạy và báo lỗi đúng nghĩa.
 */
async function waitForFrameToSettle(page: import('@playwright/test').Page, expectedUrlPart: string) {
    await expect
        .poll(() => page.frames().some(f => f.url().includes(expectedUrlPart) || f.url().startsWith('chrome-error')),
            { message: `iframe ${expectedUrlPart} chưa điều hướng xong sau 30s`, timeout: 30_000 })
        .toBe(true);
}

test.describe('Tab dùng iframe không bị CSP chặn', () => {
    test('Check Thưởng nạp được iframe nội bộ /check-thuong.html', async ({ page }) => {
        await page.goto('/?tab=check-thuong');
        await activateDemoMode(page);

        // `CheckThuongView` là React.lazy — chờ THẺ iframe gắn vào DOM, đừng ngủ một khoảng cố định.
        await expect(page.locator('iframe[src*="check-thuong.html"]'),
            'không render thẻ iframe check-thuong.html').toBeAttached({ timeout: 30_000 });
        await waitForFrameToSettle(page, 'check-thuong.html');

        const urls = page.frames().map(f => f.url());
        expect(urls.some(u => u.startsWith('chrome-error')), `iframe bị chặn — kiểm tra frame-src trong index.html. URLs: ${JSON.stringify(urls)}`).toBe(false);

        const frame = page.frames().find(f => f.url().includes('check-thuong.html'));
        expect(frame, 'không tìm thấy iframe check-thuong.html').toBeTruthy();
        await expect(frame!.locator('body')).toContainText(/Tra cứu thưởng/i, { timeout: 15_000 });
    });

    test('Hoàn thuế nạp được iframe ra Cloud Run (*.run.app)', async ({ page }) => {
        await page.goto('/?tab=tools-tax');
        await activateDemoMode(page);

        // ĐÂY LÀ CHỖ ĐỎ TRÊN CI (2026-09-18). Bản cũ ngủ đúng 4000ms rồi chụp `page.frames()` ngay,
        // trong khi `ExternalToolView` là React.lazy (App.tsx) — iframe chỉ có sau khi chunk tải
        // xong. Máy dev kịp trong 4s, runner GitHub thì không: annotation của lượt chạy đỏ cho thấy
        // chỉ có ĐÚNG MỘT frame (trang chính), KHÔNG phải `chrome-error` — tức không hề bị CSP chặn,
        // cũng không phải mất mạng (test xlsx tải CDN ngay bên dưới vẫn XANH trên cùng lượt đó).
        await expect(page.locator('iframe[src*="run.app"]'),
            'không render thẻ iframe Cloud Run').toBeAttached({ timeout: 30_000 });
        await waitForFrameToSettle(page, 'run.app');

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
