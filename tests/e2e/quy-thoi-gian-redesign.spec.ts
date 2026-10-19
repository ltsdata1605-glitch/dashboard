import { test, expect } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

test('Verify redesigned modern compact Quỹ thời gian bar', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Kiểm tra trên Mobile (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=analysis');

    // Kích hoạt Chế độ Dùng Thử
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });

    // Nạp file sales mẫu
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();
    await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 30_000 });

    const warehouseCard = page.locator('#warehouse-summary-view').first();
    await expect(warehouseCard).toBeVisible({ timeout: 10_000 });

    // Đợi toast/modal biến mất
    await page.waitForTimeout(3000);

    // Chụp ảnh thẻ Chi Tiết Theo Kho trên Mobile
    await warehouseCard.screenshot({ path: 'test-results/quy-thoi-gian-mobile-390.png' });

    // 2. Kiểm tra trên Desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(2500);

    // Chụp ảnh thẻ Chi Tiết Theo Kho trên Desktop
    await warehouseCard.screenshot({ path: 'test-results/quy-thoi-gian-desktop-1440.png' });
});
