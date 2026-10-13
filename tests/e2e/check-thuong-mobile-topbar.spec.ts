import { test, expect } from '@playwright/test';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';

/**
 * Check thưởng trên iPhone: thanh công cụ (Tra cứu / Top thưởng, Kho 1 / Kho 2, đổi file, đồng bộ cloud) nằm GỌN trên thanh trên,
 * không thêm hàng riêng — chủ dự án chốt "1 thanh bar duy nhất" (a4168bd, 2026-10-11).
 * GĐ7 (2026-10-13): chuyển sang bản React (bản cũ chờ iframe `check-thuong.html` đã bỏ nên đỏ sẵn) và thêm: dưới 540px chữ tiêu đề
 * nhường chỗ cho thanh công cụ (trước bị cắt còn chữ "C").
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Check thưởng mobile topbar: các nút nhỏ gọn nằm trên thanh Bar, không còn hàng riêng', async ({ page }) => {
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(['910 - ĐML Hùng Vương', '911 - ĐML Tân Hiệp']));

    const topbarActions = page.locator('#mobile-topbar-actions');
    const kho1Input = topbarActions.locator('input[placeholder="Kho 1"]');
    const kho2Input = topbarActions.locator('input[placeholder="Kho 2"]');
    await expect(kho1Input).toBeVisible();
    await expect(kho2Input).toBeVisible();
    // 1. Không có hàng công cụ riêng: ô mã kho chỉ có MỘT bộ, nằm trên thanh trên
    await expect(page.locator('input[placeholder="Kho 1"]:visible')).toHaveCount(1);

    // 2. Đủ nút trên thanh
    await expect(topbarActions.getByRole('button', { name: /tra cứu/i })).toBeVisible();
    await expect(topbarActions.getByRole('button', { name: /top/i })).toBeVisible();
    await expect(topbarActions.getByTitle(/tải file khác/i)).toBeVisible();
    await expect(topbarActions.getByTitle(/Đồng bộ dữ liệu từ Đám Mây/i)).toBeVisible();
    // Nút xoá mã kho so sánh chỉ hiện khi đang so sánh 2 kho
    await expect(topbarActions.getByTitle(/xoá mã kho/i)).toHaveCount(0);
    await kho2Input.fill('911');
    await expect(topbarActions.getByTitle(/xoá mã kho/i)).toBeVisible();

    // 3. Gọn: ô nhập cao ≤ 30px (cỡ chủ dự án chọn) nhưng chữ đọc được (≥ 13px)
    const boxKho1 = (await kho1Input.boundingBox())!;
    expect(boxKho1.height).toBeLessThanOrEqual(30);
    expect(parseFloat(await kho1Input.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(13);

    // 4. Chuông không bị đẩy ra ngoài mép màn hình; chữ tiêu đề nhường chỗ (không còn "C" bị cắt)
    const boxBell = (await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: /Thông báo/ }).boundingBox())!;
    expect(boxBell.x + boxBell.width).toBeLessThanOrEqual(390);
    await expect(page.locator('[data-app-chrome="topbar"] [data-navbar-title]')).toBeHidden();

    await page.screenshot({ path: test.info().outputPath('check-thuong-mobile-topbar.png') });
});
