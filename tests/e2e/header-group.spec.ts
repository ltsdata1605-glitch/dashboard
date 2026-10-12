import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

async function navigateAndEnsureApp(page: Page, url: string) {
    await page.goto(url);
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trialBtn.click();
    }
    await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('Header controls (Font, Filter, Notification) are grouped in a single unified pill container', async ({ page }) => {
    await navigateAndEnsureApp(page, '/?tab=analysis');

    // Find the header controls container
    const headerActions = page.locator('#global-header-actions');
    await expect(headerActions).toBeVisible();

    // Group 1: Data import & management tools (YCX, link, cache, delete)
    const importGroup = headerActions.locator('> div > div').first();
    await expect(importGroup).toBeVisible();

    // Group 2: The 3 controls grouped in a single rounded pill [ T | ☵ | 🔔 ]
    const controlsGroup = headerActions.locator('> div > div').nth(1);
    await expect(controlsGroup).toBeVisible();

    // Verify FontSelector button exists inside controlsGroup
    const fontBtn = controlsGroup.locator('button[title*="Font hiện tại"]');
    await expect(fontBtn).toBeVisible();

    // Verify View Options / Filters button exists inside controlsGroup
    const filterBtn = controlsGroup.locator('button[title*="Bộ lọc nâng cao"]');
    await expect(filterBtn).toBeVisible();

    // Verify Notification dropdown exists inside controlsGroup
    const notifBtn = controlsGroup.locator('button[aria-label*="thông báo" i], button[title*="Thông báo" i]');
    await expect(notifBtn).toBeVisible();

    // Take screenshot of the grouped pill and the whole toolbar
    await controlsGroup.screenshot({ path: 'test-results/grouped-pill.png' });
    await headerActions.screenshot({ path: 'test-results/header-toolbar.png' });
});
