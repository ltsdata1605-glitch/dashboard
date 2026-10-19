import { test, expect } from '@playwright/test';

test('Verify right auto dock is aligned at top-[72px] with left sidebar menu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    
    // Đăng nhập chế độ dùng thử
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);

    const leftSidebar = page.locator('[data-testid="desktop-nav-menu"]');
    const rightDock = page.locator('[data-testid="ycx-auto-dock"]');

    await expect(leftSidebar).toBeVisible({ timeout: 10000 });
    await expect(rightDock).toBeVisible({ timeout: 10000 });

    const leftBox = await leftSidebar.boundingBox();
    const rightBox = await rightDock.boundingBox();

    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();

    console.log(`Left sidebar top: ${leftBox!.y}px, Right dock top: ${rightBox!.y}px`);

    // Cả 2 thanh đều bắt đầu ở top 72px (sai số cho phép <= 1px do subpixel rendering)
    expect(Math.abs(leftBox!.y - 72)).toBeLessThanOrEqual(1);
    expect(Math.abs(rightBox!.y - 72)).toBeLessThanOrEqual(1);
    expect(Math.abs(leftBox!.y - rightBox!.y)).toBeLessThanOrEqual(1);

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: 'test-results/dock-alignment-verification.png', fullPage: false });
});
