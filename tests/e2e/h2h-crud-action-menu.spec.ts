import { test, expect } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

test('Verify 3-dots ActionMenu replaces CRUD buttons in 7 Ngày tab', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Kiểm tra trên Mobile (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=analysis');

    // Kích hoạt Chế độ Dùng Thử
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });

    // Nạp file sales mẫu
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();

    // Chờ tải dữ liệu và tắt modal thông báo nếu có
    await expect(page.getByText(/PHÂN TÍCH NHÂN VIÊN/i).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3000); // Đợi modal tự tắt hoặc click tắt
    const closeBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /Đóng|×/i }).first();
    if (await closeBtn.isVisible()) {
        await closeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
    }

    // Cuộn tới khối Phân Tích Nhân Viên
    const employeeSection = page.getByText(/PHÂN TÍCH NHÂN VIÊN/i).first();
    await employeeSection.scrollIntoViewIfNeeded();

    // Click tab "7 Ngày"
    const h2hTabButton = page.getByRole('button', { name: /7 Ngày/i }).first();
    await expect(h2hTabButton).toBeVisible({ timeout: 10_000 });
    await h2hTabButton.click();

    // Đợi render nội dung tab 7 Ngày
    await page.waitForTimeout(1500);

    // Tìm nút 3 chấm ActionMenu trong toolbar của tab 7 Ngày
    const menuTrigger = page.locator('[data-testid="h2h-crud-action-menu"] button, [data-testid="h2h-crud-action-menu"]').first();
    await expect(menuTrigger).toBeVisible({ timeout: 5000 });

    // Chụp ảnh thanh toolbar với nút 3 chấm
    const toolbarHeader = page.locator('[data-testid="h2h-crud-action-menu"]').locator('..').locator('..');
    await toolbarHeader.screenshot({ path: 'test-results/h2h-action-menu-mobile-toolbar.png' });

    // Click mở Action Sheet trên mobile
    await menuTrigger.click();
    await page.waitForTimeout(600);

    // Kiểm tra các item trong menu: Thêm Bảng Mới, Sửa Bảng, Xóa Bảng
    await expect(page.getByText(/Thêm Bảng Mới/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Sửa Bảng/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Xóa Bảng/i).first()).toBeVisible({ timeout: 5000 });

    // Chụp ảnh Action Sheet mở ra
    await page.screenshot({ path: 'test-results/h2h-action-menu-mobile-sheet.png' });

    // Đóng menu bằng cách click backdrop hoặc nút Hủy
    const cancelButton = page.getByRole('button', { name: /Hủy/i }).first();
    if (await cancelButton.isVisible()) {
        await cancelButton.click();
    } else {
        await page.mouse.click(10, 10);
    }
    await page.waitForTimeout(600);

    // 2. Kiểm tra trên Desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);

    const desktopMenuTrigger = page.locator('[data-testid="h2h-crud-action-menu"] button, [data-testid="h2h-crud-action-menu"]').first();
    await expect(desktopMenuTrigger).toBeVisible({ timeout: 5000 });

    // Mở dropdown trên Desktop
    await desktopMenuTrigger.click();
    await page.waitForTimeout(600);

    await expect(page.getByText(/Thêm Bảng Mới/i).first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/h2h-action-menu-desktop-dropdown.png' });
});
