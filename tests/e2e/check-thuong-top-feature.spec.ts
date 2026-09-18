import { test, expect } from '@playwright/test';

// SỬA 2026-09-18: 3 test ở file này chép CỨNG `http://127.0.0.1:5174/...` trong khi dev server của
// Playwright chạy ở cổng 5173 (`DEV_URL` trong playwright.config.ts) → cả 3 đều
// `net::ERR_CONNECTION_REFUSED`. Dùng đường dẫn TƯƠNG ĐỐI để luôn theo `baseURL` của config, kể cả
// khi chạy với `E2E_BASE_URL` trỏ sang môi trường khác.

test.describe('Check Thưởng - TOP Siêu Thị Feature', () => {
    test('should display TOP supermarket view with correct layout', async ({ page }) => {
        // Navigate to check-thuong.html directly (served via vite dev server)
        await page.goto('/check-thuong.html', { waitUntil: 'networkidle' });

        // Wait for landing page to load
        await page.waitForSelector('#landingPage', { timeout: 5000 });
        const landingPage = await page.locator('#landingPage').isVisible();
        expect(landingPage).toBe(true);
    });

    // ĐÃ XOÁ 2 test ở đây (2026-09-18) — chúng nhắm SAI TRANG:
    //
    //  • 'should show TOP filter buttons after file would be loaded' — khẳng định RỖNG:
    //    `expect(page.locator('#topFilter20Btn')).toBeDefined()` luôn đúng vì `locator()` luôn trả
    //    về một object, KỂ CẢ khi phần tử không tồn tại. Đã kiểm: `#topFilter20Btn` và
    //    `#topFilterAllBtn` KHÔNG hề có trong public/check-thuong.html. Test "xanh" suốt mà không
    //    kiểm gì — nguy hiểm hơn test đỏ.
    //  • 'should have TOP content container' — `#topContent` cũng không tồn tại, nên
    //    `.evaluate()` treo tới hết 60 giây rồi timeout.
    //
    // Lý do gốc: tính năng TOP Siêu Thị nằm ở các component REACT
    // (features/check-thuong/components/CheckThuongTopTable.tsx, CheckThuongChannelTopGrid.tsx),
    // không nằm trong trang vanilla `check-thuong.html` mà file này đang mở. Viết lại cho đúng
    // phải test qua ứng dụng React — là việc riêng, không đoán bừa ở đây.
});
