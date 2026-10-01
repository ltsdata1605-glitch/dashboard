import { test, expect, type Page } from '@playwright/test';

/**
 * Modal "Tự động Cập nhật Realtime" (Report BI) — theo dõi tiến trình ngay tại Dashboard (chủ dự án 2026-10-01:
 * "bảng tiến trình ở tab MWG nằm trong modal, hoàn tất tự quay về trang gốc và tự đóng thông báo").
 * Bơm đúng chuỗi tiến trình mà Direct API Engine (userscript 7.x) gửi: 1 Hợp nhất → 2 Thi đua → 3 Ngành hàng → 4 Nhân viên.
 */

const bom = (page: Page, step: number, ten: string, tin: string) =>
    page.evaluate(([s, n, m]) => (window as unknown as { __bi: { tienTrinh: (a: number, b: string, c: string) => void } }).__bi.tienTrinh(s as number, n as string, m as string), [step, ten, tin]);

const dong = (page: Page, ten: string) => page.getByRole('dialog').locator('div.flex.items-center.justify-between.p-3', { hasText: ten });

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/biAutoSyncHarness.tsx' as string)).mountHarness());
});

test('hiện khung tiến trình như tab MWG; bước xác định theo TÊN (Thi đua báo số 2 vẫn sáng đúng dòng Thi đua)', async ({ page }) => {
    const khung = page.getByTestId('bi-sync-tien-trinh');
    await expect(khung).toContainText('Đang mở trang MWG');

    await bom(page, 1, 'Doanh thu hợp nhất', 'Đang tải dữ liệu Doanh thu hợp nhất (DT quy đổi & Trả góp)...');
    await expect(khung).toContainText('1/4 (25%)');
    await expect(khung).toContainText('Đang tải dữ liệu Doanh thu hợp nhất');

    await bom(page, 2, 'Thi đua', 'Đang tải 39 chương trình Thi đua qua API...');
    await expect(khung).toContainText('2/4 (50%)');
    await expect(khung.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    await expect(dong(page, 'Báo cáo Thi đua')).toContainText('Đang xử lý');
    await expect(dong(page, 'Doanh thu hợp nhất')).toContainText('Đã xong');
    // Mã cũ so theo SỐ: bước 2 = "Ngành hàng BI" → sáng nhầm dòng này
    await expect(dong(page, 'Ngành hàng BI')).not.toContainText('Đang xử lý');
    await expect(dong(page, 'Ngành hàng BI')).not.toContainText('Đã xong');

    await bom(page, 3, 'Ngành hàng BI', '[1/2] Đang tải cây ngành hàng BI cho 1678...');
    await expect(dong(page, 'Ngành hàng BI')).toContainText('Đang xử lý');
    await expect(dong(page, 'Báo cáo Thi đua')).toContainText('Đã xong');
    await page.waitForTimeout(800); // chờ hiệu ứng chuyển màu/độ rộng xong rồi mới chụp
    await page.screenshot({ path: test.info().outputPath('tien-trinh.png') });
});

test('hoàn tất: báo xong, đếm ngược rồi TỰ ĐÓNG modal', async ({ page }) => {
    await bom(page, 4, 'Doanh thu nhân viên', 'Đang tải nhân viên...');
    await page.evaluate(() => (window as unknown as { __bi: { xong: () => void } }).__bi.xong());
    await expect(page.getByRole('dialog')).toContainText('Toàn bộ 4 báo cáo Realtime');
    await expect(page.getByRole('dialog')).toContainText(/Tự đóng sau \d giây/);
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 6000 });
    await expect(page.locator('#trang-thai-mo')).toHaveText('dong');
});

test('đang chạy mà bấm Esc: hỏi bằng ConfirmDialog (không window.confirm), chọn "Tiếp tục chạy" thì giữ modal', async ({ page }) => {
    let coConfirmGoc = false;
    page.on('dialog', d => { coConfirmGoc = true; void d.dismiss(); });
    await bom(page, 1, 'Doanh thu hợp nhất', '...');
    await page.keyboard.press('Escape');
    await expect(page.getByText('Huỷ cập nhật tự động?')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp tục chạy' }).click();
    await expect(page.getByText('Huỷ cập nhật tự động?')).toHaveCount(0);
    await expect(page.getByTestId('bi-sync-tien-trinh')).toBeVisible();
    expect(coConfirmGoc).toBe(false);
});
