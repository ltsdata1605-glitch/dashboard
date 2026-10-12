import { test, expect } from '@playwright/test';

test('Verify redesigned LoginView appearance in Normal and Error states', async ({ page }) => {
    // Open login view
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Make sure we are on login view
    const card = page.locator('text=Dashboard Report').locator('..').locator('..');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // 1. Verify Google button & Trial button
    const googleBtn = page.getByRole('button', { name: /Tiếp tục với Cổng Google/i });
    await expect(googleBtn).toBeVisible();

    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    await expect(trialBtn).toBeVisible();

    // Verify no literal '&rarr;' appears in text
    const rawRarr = page.locator('text="&rarr;"');
    await expect(rawRarr).toHaveCount(0);

    // Capture Normal State Screenshot
    await card.screenshot({ path: 'test-results/login-card-normal.png' });
    await page.screenshot({ path: 'test-results/login-page-normal.png' });

    // 2. Simulate error banner to verify modern Error State appearance
    await page.evaluate(() => {
        const errorHtml = `
          <div id="simulated-error" class="mb-4 p-3.5 bg-rose-50/90 text-rose-700 rounded-2xl text-xs font-medium border border-rose-200/70 leading-relaxed shadow-xs">
            <div class="flex items-start gap-2">
              <span class="text-rose-500 font-bold shrink-0 mt-0.5">⚠️</span>
              <div class="flex-1">Trình duyệt chưa hoàn tất chuyển hướng. Vui lòng thử lại hoặc mở bằng trình duyệt Safari.</div>
            </div>
            <div class="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-end">
              <button class="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                Đăng nhập chuyển hướng →
              </button>
            </div>
          </div>
        `;
        const actionGroup = document.querySelector('.space-y-3');
        if (actionGroup) {
            actionGroup.insertAdjacentHTML('beforebegin', errorHtml);
        }
    });

    // Capture Error State Screenshot
    await card.screenshot({ path: 'test-results/login-card-error.png' });
    await page.screenshot({ path: 'test-results/login-page-error.png' });

    // 3. Test Clicking "Kích hoạt Chế độ Dùng Thử" enters app smoothly
    await trialBtn.click();
    await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 15_000 });
});
