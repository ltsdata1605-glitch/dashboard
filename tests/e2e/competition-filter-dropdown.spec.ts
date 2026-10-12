import { test, expect } from './helpers/realDataContext';

test.describe('Competition Filter Dropdown Visibility', () => {
    test('Filter dropdown in Tuỳ chỉnh tab should render on top and not be clipped', async ({ page }) => {
        await page.goto('/');
        const sidebar = page.locator('aside').first();
        await sidebar.waitFor({ state: 'visible', timeout: 30_000 });
        await sidebar.locator('button:has(svg[data-icon="navReportBi"])').first().click();
        
        // Wait for sub-navigation
        await page.getByRole('button', { name: /Nhân viên/i }).first().waitFor({ timeout: 30_000 });
        await page.getByRole('button', { name: /Nhân viên/i }).first().click();
        await page.waitForTimeout(500);

        // Click "Thi đua"
        const thiDuaBtn = page.getByRole('button', { name: 'Thi đua', exact: true }).first();
        await thiDuaBtn.waitFor({ timeout: 10_000 });
        await thiDuaBtn.click();
        await page.waitForTimeout(500);

        // Click "Tuỳ chỉnh"
        const tuyChinhBtn = page.getByRole('button', { name: 'Tuỳ chỉnh', exact: true }).first();
        await tuyChinhBtn.waitFor({ timeout: 10_000 });
        await tuyChinhBtn.click();
        await page.waitForTimeout(1000);

        // Find the filter button in headerActions of the summary card ("Chọn cột hiển thị")
        const filterBtn = page.locator('button[title="Chọn cột hiển thị"]').first();
        await expect(filterBtn).toBeVisible({ timeout: 10_000 });

        // Check header container computed style: overflow should NOT be hidden
        const headerContainer = filterBtn.locator('xpath=ancestor::div[contains(@class, "border-b")]').first();
        const headerOverflow = await headerContainer.evaluate(el => window.getComputedStyle(el).overflow);
        expect(headerOverflow, 'Header container should not have overflow hidden').not.toBe('hidden');

        // Click the filter button to open dropdown
        await filterBtn.click();
        await page.waitForTimeout(500);

        // Locate the dropdown menu
        const dropdown = page.locator('input[placeholder="Tìm tiêu chí..."]').locator('xpath=ancestor::div[contains(@class, "max-h-80")]').first();
        await expect(dropdown).toBeVisible({ timeout: 5000 });

        // Verify computed z-index of dropdown is >= 50
        const zIndex = await dropdown.evaluate(el => window.getComputedStyle(el).zIndex);
        expect(parseInt(zIndex, 10)).toBeGreaterThanOrEqual(50);

        // Verify that the dropdown bounding box has significant height (> 150px)
        const bbox = await dropdown.boundingBox();
        expect(bbox).not.toBeNull();
        expect(bbox!.height).toBeGreaterThan(150);

        // Verify search input is visible
        const searchInput = page.locator('input[placeholder="Tìm tiêu chí..."]');
        await expect(searchInput).toBeVisible();

        // Verify that options/labels inside the dropdown are visible
        const optionLabels = dropdown.locator('label');
        const optionCount = await optionLabels.count();
        expect(optionCount).toBeGreaterThan(0);
        await expect(optionLabels.first()).toBeVisible();

        // Capture screenshot of the dropdown open over the table
        await page.screenshot({ path: '/Users/ltson/.gemini/antigravity-ide/brain/7529797b-2ffe-4340-9a38-f8aecae3a302/scratch/competition-filter-dropdown-verified.png' });
    });
});
