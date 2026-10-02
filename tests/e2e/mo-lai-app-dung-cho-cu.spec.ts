import { test, expect } from '@playwright/test';

/**
 * Đợt A — kế hoạch iPhone. App cài lên màn hình chính bị iOS giải phóng khỏi RAM khi ở nền; mở lại
 * luôn vào start_url "/" (URL không còn ?tab=…&sub=…). Phải về đúng chỗ người dùng đang xem.
 * Mô phỏng: chọn chỗ → goto('/') sạch (giống iOS khởi động lại app) → kiểm tra.
 */
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test.describe('mở lại app đúng chỗ cũ', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('Report BI: mở lại vẫn ở mục Nhân viên', async ({ page }) => {
        await page.goto('/?tab=employees');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.getByRole('button', { name: /^Nhân viên$/ }).first().click();
        await page.waitForTimeout(800);

        await page.goto('/');
        await expect(page).toHaveURL(/tab=employees/);
        const view = await page.evaluate(() => localStorage.getItem('bi_active_view'));
        expect(view).toBe('employee');
        await expect(page.locator('[data-bi-view]')).toHaveAttribute('data-bi-view', 'employee');
    });

    test('In Sticker: mở lại vẫn ở tab con lần trước', async ({ page }) => {
        await page.goto('/?tab=tools-print-sticker');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.waitForTimeout(1500);
        await page.evaluate(() => localStorage.setItem('sticker_last_sub', 'gio-vang'));
        await page.goto('/');
        await page.waitForTimeout(1500);
        await expect(page).toHaveURL(/tab=tools-print-sticker/);
        await expect(page).toHaveURL(/sub=gio-vang/);
    });

    test('URL ghi rõ tab con thì theo URL, không theo lần trước', async ({ page }) => {
        await page.goto('/?tab=tools-print-sticker');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.evaluate(() => localStorage.setItem('sticker_last_sub', 'gio-vang'));
        await page.goto('/?tab=tools-print-sticker&sub=gia-soc');
        await page.waitForTimeout(1500);
        await expect(page).toHaveURL(/sub=gia-soc/);
    });
});

test.describe('thẻ nhắc cài app (Safari iPhone)', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE_SAFARI });

    test('hiện sau vài giây, "Để sau" thì tắt và không hiện lại khi mở lại', async ({ page }) => {
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        const hint = page.getByTestId('install-app-hint');
        await expect(hint).toBeVisible({ timeout: 10_000 });
        await page.screenshot({ path: 'test-results/the-nhac-cai-app.png' });
        const box = await hint.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(844 - 64); // không đè thanh điều hướng đáy
        await hint.getByRole('button', { name: 'Để sau' }).click();
        await expect(hint).toBeHidden();
        await page.reload();
        await page.waitForTimeout(6000);
        await expect(hint).toBeHidden();
    });

    test('đã cài (standalone) thì không hiện', async ({ page }) => {
        await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.waitForTimeout(6000);
        await expect(page.getByTestId('install-app-hint')).toBeHidden();
    });
});
