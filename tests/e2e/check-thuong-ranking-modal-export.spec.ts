import { test, expect } from '@playwright/test';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';
import path from 'path';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Check thưởng: modal chi tiết môn thi (Ranking Modal) có nút xuất ảnh chuẩn ở header cạnh nút đóng', async ({ page }) => {
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(['910 - ĐML Hùng Vương'], ['ICT', 'Phụ kiện', 'Gia dụng']));

    // Click vào hàng ngành hàng ICT để mở Modal Chi Tiết Môn Thi / Bảng Xếp Hạng
    const ictRow = page.locator('text=ICT').first();
    await expect(ictRow).toBeVisible();
    await ictRow.click();

    // Verify modal Bảng Xếp Hạng hiển thị
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Bảng Xếp Hạng/i })).toBeVisible();

    // Verify Nút xuất ảnh (icon camera exportImage) nằm ở góc trên bên phải cạnh nút đóng
    const modalHeader = modal.locator('div:has(h3:has-text("Bảng Xếp Hạng"))').first();
    const exportBtn = modalHeader.getByRole('button', { name: /Xuất ảnh/i });
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn.locator('svg[data-icon="exportImage"]')).toBeVisible();

    const closeBtn = modalHeader.getByRole('button', { name: /Đóng/i });
    await expect(closeBtn).toBeVisible();

    // Verify thứ tự: nút xuất ảnh nằm ngay cạnh nút đóng
    const boxExport = await exportBtn.boundingBox();
    const boxClose = await closeBtn.boundingBox();
    expect(boxExport).not.toBeNull();
    expect(boxClose).not.toBeNull();
    // Nút xuất ảnh nằm bên trái nút đóng
    expect(boxExport!.x).toBeLessThan(boxClose!.x);

    // Chụp ảnh màn hình modal kiểm chứng giao diện
    const screenshotPath = path.resolve(process.cwd(), 'tests/e2e/check-thuong-ranking-modal-export.png');
    await modal.screenshot({ path: screenshotPath });
});
