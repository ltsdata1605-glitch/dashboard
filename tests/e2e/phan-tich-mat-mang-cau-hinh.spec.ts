import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Phân tích khi KHÔNG tải được cấu hình ngành hàng (2026-09-27). Hay gặp trên iPhone: Safari iOS tự
 * xoá dữ liệu web sau 7 ngày không mở app → mất cấu hình đã lưu; lúc đó mạng 4G/Wi-Fi siêu thị
 * chập chờn thì tải lại cũng hỏng. Lỗi cũ: màn hình TREO MÃI ở 95% "Đang gộp và phân tích…".
 * Nay phải báo lỗi rõ ràng và quay về màn tải tệp.
 */
test.use({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

test('mất mạng khi tải cấu hình: báo lỗi rõ ràng, không treo ở 95%', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**://docs.google.com/**', r => r.abort('internetdisconnected'));
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().tap({ timeout: 20_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().tap();

    await expect(page.getByText(/Không tải được cấu hình ngành hàng/).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Đang gộp và phân tích/)).toBeHidden();
});
