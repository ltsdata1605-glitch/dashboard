import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

async function navigateAndEnsureApp(page: Page, tab: string) {
    await page.goto(`/?tab=${tab}`);
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trialBtn.click();
    }
    await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('All 5 views have standardized desktop header bar matching Hình 1', async ({ page }) => {
    const views = [
        { id: 'analysis', name: 'Phân tích' },
        { id: 'employees', name: 'Report BI' },
        { id: 'check-thuong', name: 'Check Thưởng' },
        { id: 'tools-print-sticker', name: 'In Sticker' },
        { id: 'tools-phanca', name: 'Phân Ca' },
    ];

    for (const view of views) {
        await navigateAndEnsureApp(page, view.id);
        await page.waitForTimeout(1000);

        const headerActions = page.locator('#global-header-actions');
        await expect(headerActions).toBeVisible();

        // 1. Kiểm tra khung ngoài thuỷ tinh theo chuẩn Hình 1
        const outerContainer = headerActions.locator('> div');
        await expect(outerContainer).toHaveClass(/rounded-full/);
        await expect(outerContainer).toHaveClass(/backdrop-blur-xl/);

        // 2. Kiểm tra cụm hệ thống HeaderSystemGroup [ T | 🔔 ]
        const systemGroup = outerContainer.locator('> div').last();
        await expect(systemGroup).toBeVisible();

        // Nút phông chữ [ T ]
        const fontBtn = systemGroup.locator('button[title*="Font hiện tại"]');
        await expect(fontBtn).toBeVisible();

        // Nút chuông thông báo [ 🔔 ]
        const notifBtn = systemGroup.locator('button[aria-label*="thông báo" i], button[title*="Thông báo" i]');
        await expect(notifBtn).toBeVisible();

        // Chụp screenshot bằng chứng để kiểm tra thị giác
        await outerContainer.screenshot({ path: `test-results/desktop-bar-${view.id}.png` });
        console.log(`✅ [${view.name}] Header bar chuẩn 100%: outer glass pill + action pills + system group [T | 🔔]`);
    }
});
