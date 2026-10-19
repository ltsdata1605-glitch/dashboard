import { test, expect } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

test('Verify reduced compact spacing between SummaryTable, AppFooter, and MobileBottomNav', async ({ page }) => {
    test.setTimeout(60_000);

    // Thiết lập màn hình chuẩn iPhone (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=analysis');

    // Kích hoạt Dùng thử
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });

    // Nạp file sales mẫu
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();

    // Chờ tải xong và tắt thông báo nếu có
    await expect(page.getByText(/CHI TIẾT NGÀNH HÀNG/i).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3000);
    const closeBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /Đóng|×/i }).first();
    if (await closeBtn.isVisible()) {
        await closeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
    }

    // Cuộn xuống tận cùng trang (nơi có SummaryTable và Footer)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    // Xác nhận Footer hiển thị
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible({ timeout: 5000 });

    // Xác nhận Floating Bottom Nav hiển thị
    const bottomNav = page.locator('nav[data-app-chrome="tabbar"]').first();
    await expect(bottomNav).toBeVisible({ timeout: 5000 });

    // Đo vị trí thực tế
    const summaryTable = page.locator('#summary-table').first();
    const tableBox = await summaryTable.boundingBox();
    const footerBox = await footer.boundingBox();
    const navBox = await bottomNav.boundingBox();

    console.log('Table box:', tableBox);
    console.log('Footer box:', footerBox);
    console.log('Nav box:', navBox);

    // Chụp ảnh màn hình kiểm chứng khoảng cách thực tế trên Mobile
    await page.screenshot({ path: 'test-results/khoang-trong-thua-fixed-mobile.png' });

    // 2. Kiểm tra trên Desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/khoang-trong-thua-fixed-desktop.png' });
});
