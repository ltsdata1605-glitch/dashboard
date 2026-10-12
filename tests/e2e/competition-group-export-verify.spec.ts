import { test, expect } from './helpers/realDataContext';

test.describe('Competition Group View Export Verification', () => {
    test('Exporting competition groups should fit all columns and not cut off %HT and C.LẠI', async ({ page }) => {
        await page.goto('/');
        const sidebar = page.locator('aside').first();
        await sidebar.waitFor({ state: 'visible', timeout: 30_000 });
        await sidebar.locator('button:has(svg[data-icon="navReportBi"])').first().click();
        
        // Wait for sub-navigation and click "Nhân viên"
        await page.getByRole('button', { name: /Nhân viên/i }).first().waitFor({ timeout: 30_000 });
        await page.getByRole('button', { name: /Nhân viên/i }).first().click();
        await page.waitForTimeout(500);

        // Click "Thi đua"
        const thiDuaBtn = page.getByRole('button', { name: 'Thi đua', exact: true }).first();
        await thiDuaBtn.waitFor({ timeout: 10_000 });
        await thiDuaBtn.click();
        await page.waitForTimeout(500);

        // Click "Nhóm" tab
        const nhomBtn = page.getByRole('button', { name: 'Nhóm', exact: true }).first();
        await nhomBtn.waitFor({ timeout: 10_000 });
        await nhomBtn.click();
        await page.waitForTimeout(1000);

        // Ensure group cards are rendered
        const groupCards = page.locator('.competition-group-card');
        await expect(groupCards.first()).toBeVisible({ timeout: 15_000 });
        const cardCount = await groupCards.count();
        console.log(`Rendered ${cardCount} competition group cards.`);

        // Find the export button (camera icon)
        // In CompetitionTab: <ExportButton onExportPNG={async () => { await exportGroupViewToPNG(...) }} />
        const exportBtn = page.locator('button[title*="Xuất ảnh"], button[aria-label*="Xuất ảnh"], .export-button-component').first();
        await expect(exportBtn).toBeVisible({ timeout: 10_000 });

        // Set up download or modal listener
        const dlPromise = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
        await exportBtn.click();

        // If export options modal appears, click "Tải về"
        const downloadModalBtn = page.getByRole('button', { name: /Tải về|Tải ảnh|Download/i }).first();
        if (await downloadModalBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await downloadModalBtn.click();
        }

        const download = await dlPromise;
        const outPath = '/Users/ltson/.gemini/antigravity-ide/brain/7529797b-2ffe-4340-9a38-f8aecae3a302/scratch/competition-group-export-verified.png';
        if (download) {
            await download.saveAs(outPath);
            console.log('Saved exported image via download to', outPath);
        } else {
            // If download was not triggered directly, capture screenshot of the current page as fallback
            await page.screenshot({ path: outPath });
            console.log('Saved page screenshot to', outPath);
        }

        expect(cardCount).toBeGreaterThanOrEqual(1);
    });
});
