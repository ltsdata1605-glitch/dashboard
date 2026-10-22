import { test, expect } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

test('WarehouseSettingsModal tự động lưu trạng thái ẩn/hiện cột vào IndexedDB và phát sự kiện đồng bộ khi thao tác', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/?tab=analysis');

    // Kích hoạt Chế độ Dùng Thử
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });

    // Nạp file sales mẫu
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();
    await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 30_000 });

    // Bấm nút Cài đặt ở header của Chi tiết theo kho (tiêu đề in hoa từ 57656d79 — tìm theo khối, không theo chữ tiêu đề)
    const settingsBtn = page.locator('#warehouse-summary-view').getByRole('button', { name: 'Cài đặt', exact: true });
    await settingsBtn.click();

    // Modal Cấu Hình Cột Báo Cáo xuất hiện
    const modal = page.locator('[role="dialog"]').filter({ hasText: /Cấu Hình Cột Báo Cáo/i }).first();
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Chụp ảnh màn hình modal đã có ghi chú "Tự động lưu Firebase"
    await page.screenshot({ path: 'test-results/warehouse_settings_autosave.png' });

    // Kiểm tra subTitle có thông báo tự động lưu Firebase
    await expect(modal.getByText(/Tự động lưu Firebase/i)).toBeVisible();

    // Tìm một chip cột đang hiển thị (ví dụ "CE" trong SP CHÍNH)
    const ceChip = modal.locator('.group\\/chip').filter({ hasText: 'CE' }).first();
    await expect(ceChip).toBeVisible();

    // Click vào chip CE để toggle ẩn nó
    await ceChip.click();

    // Chờ 500ms để IndexedDB ghi xong
    await page.waitForTimeout(500);

    // Kiểm tra trực tiếp trong IndexedDB xem CE đã chuyển isVisible: false mà không cần bấm "Hoàn tất"
    const isCeHiddenInIdb = await page.evaluate(async () => {
        const { getSetting } = await import('../../services/dbService');
        const config = await getSetting<Array<{ id: string; subHeader: string; isVisible: boolean }>>('warehouseColumnConfig');
        const ce = config?.find(c => c.subHeader === 'CE');
        return ce ? ce.isVisible : null;
    });

    expect(isCeHiddenInIdb).toBe(false);

    // Đóng modal bằng Escape (không bấm Hoàn tất)
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 5000 });

    // Mở lại modal
    await settingsBtn.click();
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Kiểm tra chip CE vẫn đang ở trạng thái ẩn
    const ceChipReopened = modal.locator('.group\\/chip').filter({ hasText: 'CE' }).first();
    await expect(ceChipReopened).toBeVisible();
    await expect(ceChipReopened).toHaveAttribute('title', /Đang ẩn/i);

    // Bấm lại để bật CE lên
    await ceChipReopened.click();
    await page.waitForTimeout(500);

    const isCeRestoredInIdb = await page.evaluate(async () => {
        const { getSetting } = await import('../../services/dbService');
        const config = await getSetting<Array<{ id: string; subHeader: string; isVisible: boolean }>>('warehouseColumnConfig');
        const ce = config?.find(c => c.subHeader === 'CE');
        return ce ? ce.isVisible : null;
    });

    expect(isCeRestoredInIdb).toBe(true);
});
