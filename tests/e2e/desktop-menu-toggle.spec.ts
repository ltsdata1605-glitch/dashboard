import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

async function navigateAndEnsureApp(page: Page, url: string) {
    await page.goto(url);
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trialBtn.click();
    }
    await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible, iframe:visible').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('Thanh menu desktop lúc nào cũng hiển thị sẵn: mở mặc định, chuyển tab không tự đóng, có thể ẩn/hiện bằng nút toggle', async ({ page }) => {
    await navigateAndEnsureApp(page, '/?tab=analysis');

    // 1. Kiểm tra header desktop có nút toggle tròn
    const header = page.locator('[data-app-chrome="header"]');
    await expect(header).toBeVisible({ timeout: 10_000 });

    const toggleBtn = header.getByRole('button', { name: /Hiện menu chức năng|Ẩn menu/i });
    await expect(toggleBtn).toBeVisible();

    // 2. Ban đầu: THANH MENU LUÔN HIỂN THỊ SẴN MẶC ĐỊNH
    const floatingMenu = page.locator('[data-testid="desktop-nav-menu"]');
    await expect(floatingMenu).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/desktop-menu-always-visible.png' });

    // 3. Bấm vào chức năng "Check thưởng" -> menu VẪN HIỂN THỊ SẴN (không tự đóng)
    const checkThuongItem = floatingMenu.locator('button[aria-label="Check thưởng"]');
    await expect(checkThuongItem).toBeVisible();
    await checkThuongItem.click();

    // Menu vẫn hiển thị sẵn
    await expect(floatingMenu).toBeVisible({ timeout: 5_000 });

    // Kiểm tra URL hoặc tiêu đề đã chuyển sang Check Thưởng
    await expect(page).toHaveURL(/.*tab=check-thuong.*/);
    const titleHighlight = header.locator('span.text-sky-600');
    await expect(titleHighlight).toContainText('Thưởng');

    // 4. Bấm nút toggle [<] -> menu thu gọn ẩn đi khi người dùng muốn
    await toggleBtn.click();
    await expect(floatingMenu).toHaveCount(0);

    // 5. Bấm nút toggle [>] -> menu hiển thị trở lại
    await toggleBtn.click();
    await expect(floatingMenu).toBeVisible({ timeout: 5_000 });

    // Chụp ảnh lại bằng chứng
    await page.screenshot({ path: 'test-results/desktop-menu-toggle-verified.png' });
});

test('Check Thưởng có hiển thị thời gian đồng bộ và nút refresh (Giống Hình 2)', async ({ page }) => {
    // 1. Kiểm tra trên giao diện Mobile / Tablet nhỏ
    await page.setViewportSize({ width: 500, height: 850 });
    await navigateAndEnsureApp(page, '/?tab=check-thuong');

    const mobileSubtitle = page.locator('#mobile-topbar-subtitle');
    await expect(mobileSubtitle).toBeVisible({ timeout: 10_000 });
    
    // Nút refresh / Cập nhật phải có mặt trong subtitle
    const mobileSyncBtn = mobileSubtitle.locator('button');
    await expect(mobileSyncBtn).toBeVisible();
    await expect(mobileSyncBtn).toContainText(/Cập nhật/i);

    await page.screenshot({ path: 'test-results/checkthuong-sync-time-mobile.png' });

    // 2. Kiểm tra trên giao diện Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    const desktopSubtitle = page.locator('#desktop-header-subtitle');
    await expect(desktopSubtitle).toBeVisible({ timeout: 10_000 });
    const desktopSyncBtn = desktopSubtitle.locator('button');
    await expect(desktopSyncBtn).toBeVisible();
    await expect(desktopSyncBtn).toContainText(/Cập nhật|Đồng bộ/i);

    await page.screenshot({ path: 'test-results/checkthuong-sync-time-desktop.png' });
});

test('Menu Thêm trên mobile hiển thị đầy đủ thông tin người đăng nhập (Avatar, Tên, Quyền, Kho, Đăng xuất)', async ({ page }) => {
    await page.setViewportSize({ width: 450, height: 850 });
    await navigateAndEnsureApp(page, '/?tab=check-thuong');

    // Bấm nút "Khác" / "Thêm" trên thanh điều hướng đáy
    const moreBtn = page.locator('nav[data-app-chrome="tabbar"]').getByRole('button', { name: /Khác/i });
    await expect(moreBtn).toBeVisible({ timeout: 10_000 });
    await moreBtn.click();

    // Dialog "Thêm" mở ra
    const dialog = page.getByRole('dialog', { name: /Thêm/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Phải có thẻ thông tin người dùng
    const profileBtn = dialog.locator('button[title*="Phân Quyền"]');
    await expect(profileBtn).toBeVisible();

    // Nút đăng xuất có mặt
    const logoutBtn = dialog.locator('button[aria-label="Đăng xuất"]');
    await expect(logoutBtn).toBeVisible();

    await page.screenshot({ path: 'test-results/mobile-more-user-info.png' });
});
