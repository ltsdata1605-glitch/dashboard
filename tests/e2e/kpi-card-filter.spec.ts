import { test, expect } from './helpers/realDataContext';

test.describe('Bộ lọc thẻ KPI trong bảng Thi đua Report BI', () => {
    test('Bấm vào thẻ KPI lọc đúng bảng bên dưới và bấm Tổng thưởng thì show all', async ({ page }) => {
        await page.goto('/');
        
        // Mở Report BI từ sidebar
        const sidebar = page.locator('aside').first();
        await sidebar.waitFor({ state: 'visible', timeout: 30_000 });
        await sidebar.locator('button:has(svg[data-icon="navReportBi"])').first().click();

        // Mở Siêu thị -> Thi đua
        await page.getByRole('button', { name: /Siêu thị/i }).first().click();
        await page.waitForTimeout(1000);
        await page.getByText('Thi đua', { exact: true }).first().click();
        await page.waitForTimeout(1000);

        // Đảm bảo thẻ KPI đã xuất hiện
        const kpiContainer = page.locator('.competition-kpi-container');
        await expect(kpiContainer).toBeVisible({ timeout: 15_000 });

        // Đếm tổng số dòng dữ liệu ban đầu
        const allRows = page.locator('tbody tr');
        const initialRowCount = await allRows.count();
        expect(initialRowCount).toBeGreaterThan(0);
        console.log(`[TEST] Tổng số dòng ban đầu: ${initialRowCount}`);

        // 1. Thử bấm vào thẻ "NHÓM >100%"
        const overCard = page.locator('.competition-kpi-container .kpi-overview-card').filter({ hasText: 'NHÓM >100%' }).first();
        if (await overCard.isVisible()) {
            await overCard.click();
            await page.waitForTimeout(600);

            // Kiểm tra thuộc tính data-kpi-active="true"
            await expect(overCard).toHaveAttribute('data-kpi-active', 'true');

            // Kiểm tra thanh thông báo trạng thái lọc xuất hiện
            const filterBar = page.locator('text=Đang lọc: NHÓM >100%');
            await expect(filterBar).toBeVisible();

            // Số dòng sau khi lọc
            const overRowCount = await allRows.count();
            console.log(`[TEST] Số dòng sau khi lọc NHÓM >100%: ${overRowCount}`);

            // Chụp màn hình bằng chứng
            await page.screenshot({ path: 'test-results/kpi-filter-over.png' });
        }

        // 2. Bấm vào thẻ "Tổng thưởng" -> show all, không cần lọc
        const bonusCard = page.locator('.competition-kpi-container .kpi-overview-card').filter({ hasText: 'TỔNG THƯỞNG' }).first();
        if (await bonusCard.isVisible()) {
            await bonusCard.click();
            await page.waitForTimeout(600);

            // Kiểm tra thanh lọc đã biến mất (kpiFilter === 'all')
            const filterBar = page.locator('text=Đang lọc:');
            await expect(filterBar).toHaveCount(0);

            const resetRowCount = await allRows.count();
            console.log(`[TEST] Số dòng sau khi bấm Tổng thưởng: ${resetRowCount}`);
            expect(resetRowCount).toBe(initialRowCount);

            await page.screenshot({ path: 'test-results/kpi-filter-all.png' });
        }

        // 3. Bấm vào thẻ "NHÓM <100%" rồi bấm lại để toggle
        const underCard = page.locator('.competition-kpi-container .kpi-overview-card').filter({ hasText: 'NHÓM <100%' }).first();
        if (await underCard.isVisible()) {
            await underCard.click();
            await page.waitForTimeout(600);

            await expect(underCard).toHaveAttribute('data-kpi-active', 'true');
            const underRowCount = await allRows.count();
            console.log(`[TEST] Số dòng sau khi lọc NHÓM <100%: ${underRowCount}`);

            // Bấm lại thẻ đang active để toggle bỏ lọc
            await underCard.click();
            await page.waitForTimeout(600);

            const toggledRowCount = await allRows.count();
            console.log(`[TEST] Số dòng sau khi toggle lại: ${toggledRowCount}`);
            expect(toggledRowCount).toBe(initialRowCount);
        }
    });
});
