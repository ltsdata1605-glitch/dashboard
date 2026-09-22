import { expect, test } from '@playwright/test';
import { openReportBi, seedCompetitionData, TEST_SUPERMARKET } from './helpers/seed';

/**
 * Lần đầu dùng Report BI (chưa tải file YCX ở Phân Tích → chưa có danh sách nhân viên):
 * màn Cập nhật › Cấu hình siêu thị › Target Doanh thu phải nhắc rõ và cho nhập ngay bằng nút
 * "Nhập nhân viên (File YCX)" — bấm là mở đúng hộp chọn file của chức năng Phân Tích
 * (Report BI không được import hook/service gốc nên đi qua sự kiện 'ycx-request-upload-ycx').
 */
test('chưa có danh sách nhân viên: hiện lời nhắc + nút mở hộp chọn file YCX', async ({ page }) => {
    await openReportBi(page);
    await seedCompetitionData(page);

    // Vào Cấu hình siêu thị (pill tên siêu thị) → tab "Target Doanh thu"
    await page.getByRole('button', { name: new RegExp(TEST_SUPERMARKET.split(' - ').pop()!, 'i') }).first().click();
    await page.waitForTimeout(800);
    await page.getByText('Target Doanh thu', { exact: true }).first().click();
    await page.waitForTimeout(800);

    await expect(page.getByText('Chưa có danh sách nhân viên')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/bi-import-employees.png' });
    const btn = page.getByRole('button', { name: /Nhập nhân viên \(File YCX\)/i });
    await expect(btn).toBeVisible();

    // Bấm nút → phải mở hộp chọn file (Playwright bắt sự kiện filechooser)
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 15_000 }),
        btn.click(),
    ]);
    console.log('ĐÃ MỞ HỘP CHỌN FILE, nhận nhiều file:', chooser.isMultiple());
    expect(chooser).toBeTruthy();
});
