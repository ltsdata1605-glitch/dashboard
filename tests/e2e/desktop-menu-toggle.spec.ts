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

test('Thanh menu desktop lúc nào cũng hiển thị sẵn: mở mặc định, bấm Logo để thu gọn / mở rộng menu', async ({ page }) => {
    await navigateAndEnsureApp(page, '/?tab=analysis');

    // 1. Kiểm tra header desktop có nút Logo tròn
    const header = page.locator('[data-app-chrome="header"]');
    await expect(header).toBeVisible({ timeout: 10_000 });

    const logoBtn = header.getByRole('button', { name: /Trang chủ/i });
    await expect(logoBtn).toBeVisible();

    // Biểu tượng nút toggle [<] đã được loại bỏ hoàn toàn
    const oldToggleBtn = header.getByRole('button', { name: /Hiện menu chức năng|Ẩn menu/i });
    await expect(oldToggleBtn).toHaveCount(0);

    // 2. Ban đầu: THANH MENU LUÔN HIỂN THỊ SẴN MẶC ĐỊNH
    const floatingMenu = page.locator('[data-testid="desktop-nav-menu"]');
    await expect(floatingMenu).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/desktop-menu-always-visible.png' });

    // 3. Bấm vào Logo -> THU GỌN MENU BAR
    await logoBtn.click();
    await expect(floatingMenu).toHaveCount(0);

    // 4. Bấm lại vào Logo -> MỞ RỘNG MENU BAR TRỞ LẠI
    await logoBtn.click();
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
    await expect(mobileSyncBtn).toContainText(/Cập nhật|\d{2}:\d{2}/i);

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
