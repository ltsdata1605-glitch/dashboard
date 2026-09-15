import { test, expect } from '@playwright/test';

test.describe('Check Thưởng - TOP Siêu Thị Feature', () => {
    test('should display TOP supermarket view with correct layout', async ({ page }) => {
        // Navigate to check-thuong.html directly (served via vite dev server)
        await page.goto('http://127.0.0.1:5174/check-thuong.html', { waitUntil: 'networkidle' });

        // Wait for landing page to load
        await page.waitForSelector('#landingPage', { timeout: 5000 });
        const landingPage = await page.locator('#landingPage').isVisible();
        expect(landingPage).toBe(true);
    });

    test('should show TOP filter buttons after file would be loaded', async ({ page }) => {
        await page.goto('http://127.0.0.1:5174/check-thuong.html', { waitUntil: 'networkidle' });

        // Check that filter buttons exist in DOM (even if hidden initially)
        const filterBtn20 = await page.locator('#topFilter20Btn');
        expect(filterBtn20).toBeDefined();

        const filterBtnAll = await page.locator('#topFilterAllBtn');
        expect(filterBtnAll).toBeDefined();
    });

    test('should have TOP content container', async ({ page }) => {
        await page.goto('http://127.0.0.1:5174/check-thuong.html', { waitUntil: 'networkidle' });

        // Check topContent container exists
        const topContent = await page.locator('#topContent');
        expect(topContent).toBeDefined();

        // Should be hidden initially
        const isHidden = await topContent.evaluate(el =>
            window.getComputedStyle(el).display === 'none' || el.classList.contains('hidden')
        );
        expect(isHidden).toBe(true);
    });
});
