import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

async function navigateAndEnsureApp(page: Page, url: string) {
    await page.goto(url);
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trialBtn.click();
    }
    await page.locator('aside:visible, nav:visible, header:visible, .kpi-overview-card:visible').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('Kiểm thử thực tế: Taste Skill & Apple Design System cho InstallmentTab và RevenueTab', async ({ page }) => {
    await navigateAndEnsureApp(page, '/?tab=employees&sub=revenue');
    await page.waitForTimeout(1000);

    // Click chuyển sang phân hệ Nhân viên
    const nvBtn = page.locator('button, a, div').filter({ hasText: /^Nhân viên$/ }).first();
    if (await nvBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nvBtn.click();
        await page.waitForTimeout(1500);
    }

    // Kiểm tra nút con nhộng capsule (Realtime, Cùng kỳ)
    const capsuleBtn = page.locator('button.ycx-hit.rounded-full:visible').filter({ hasText: /Realtime|Cùng kỳ/i }).first();
    await expect(capsuleBtn).toBeVisible({ timeout: 10_000 });
    const capsuleRadius = await capsuleBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
    expect(parseFloat(capsuleRadius)).toBeGreaterThanOrEqual(16);

    // Kiểm tra khung bảng rounded-card (16px) theo chuẩn B của dự án
    const tableContainer = page.locator('div.rounded-card.overflow-hidden').filter({ has: page.locator('table.table-pin-first') }).first();
    await expect(tableContainer).toBeVisible({ timeout: 10_000 });
    const { cls, containerRadius } = await tableContainer.evaluate(el => ({
        cls: el.className,
        containerRadius: window.getComputedStyle(el).borderRadius
    }));
    console.log('TABLE CONTAINER INFO:', { cls, containerRadius });
    // Kiểm tra nút chức năng toolbar Hình 2: rounded-lg (8px)
    const revViewModeBtn = page.locator('button[title*="theo Bộ phận"], button[title*="Danh sách"]').first();
    if (await revViewModeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const revRadius = await revViewModeBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
        console.log('REVENUE TAB viewModeBtn radius (Hình 2):', revRadius);
        expect(parseFloat(revRadius)).toBeGreaterThanOrEqual(6);
        expect(parseFloat(revRadius)).toBeLessThanOrEqual(10);
    }

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: 'test-results/taste-apple-revenue.png' });

    // ─── 2. KIỂM TRA TAB NHÂN VIÊN - TRẢ CHẬM ───
    const traChamTabBtn = page.locator('button, div, a').filter({ hasText: /^Trả chậm$/i }).first();
    if (await traChamTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await traChamTabBtn.click();
        await page.waitForTimeout(2000);

        // Kiểm tra nút Cột %
        const colPercentBtn = page.locator('button.ycx-hit.rounded-full').filter({ hasText: /Cột %/i }).first();
        if (await colPercentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            const btnRadius = await colPercentBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
            expect(parseFloat(btnRadius)).toBeGreaterThanOrEqual(16);
        }

        // Chụp ảnh bằng chứng
        await page.screenshot({ path: 'test-results/taste-apple-installment.png' });
    }

    // ─── 3. KIỂM TRA TAB NHÂN VIÊN - THƯỞNG (BONUSTAB) ───
    const thuongTabBtn = page.locator('button, div, a').filter({ hasText: /^Thưởng$/i }).first();
    if (await thuongTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await thuongTabBtn.click();
        await page.waitForTimeout(2000);

        // 3.1 Kiểm tra nút viewMode ([viewGrid] / [viewList])
        const viewModeBtn = page.locator('button[title*="Đang xem theo Bộ phận"], button[title*="Đang xem Danh sách"]').first();
        await expect(viewModeBtn).toBeVisible({ timeout: 5000 });
        const vmRadius = await viewModeBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
        console.log('BONUS TAB viewModeBtn radius:', vmRadius);
        expect(parseFloat(vmRadius)).toBeGreaterThanOrEqual(6); // rounded-lg = 8px
        expect(parseFloat(vmRadius)).toBeLessThanOrEqual(10);

        // 3.2 Kiểm tra nút periodMode trigger ([⇄])
        const periodModeTrigger = page.locator('[data-testid="bonus-period-mode-trigger"]').first();
        await expect(periodModeTrigger).toBeVisible({ timeout: 5000 });
        const pmRadius = await periodModeTrigger.evaluate(el => window.getComputedStyle(el).borderRadius);
        console.log('BONUS TAB periodModeTrigger radius:', pmRadius);
        expect(parseFloat(pmRadius)).toBeGreaterThanOrEqual(6); // rounded-lg = 8px
        expect(parseFloat(pmRadius)).toBeLessThanOrEqual(10);

        // 3.3 Kiểm tra nút ExportButton ([📷])
        const exportBtn = page.locator('.export-button-component:visible').first();
        if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            const expRadius = await exportBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
            console.log('BONUS TAB exportBtn radius:', expRadius);
            expect(parseFloat(expRadius)).toBeGreaterThanOrEqual(6); // rounded-lg = 8px
            expect(parseFloat(expRadius)).toBeLessThanOrEqual(10);
        }

        // 3.4 Kiểm tra khung bảng thưởng (rounded-card = 16px, overflow: hidden)
        const bonusTableCard = page.locator('div.rounded-card.preserve-rounded').filter({ has: page.locator('table') }).first();
        if (await bonusTableCard.isVisible({ timeout: 3000 }).catch(() => false)) {
            const cardRadius = await bonusTableCard.evaluate(el => window.getComputedStyle(el).borderRadius);
            console.log('BONUS TAB tableCard radius:', cardRadius);
            expect(cardRadius).toBe('16px');
        }

        // Chụp ảnh bằng chứng trực quan cho tab Thưởng
        await page.screenshot({ path: 'test-results/taste-apple-bonus.png' });
    }

    // ─── 4. KIỂM TRA PHÂN HỆ SIÊU THỊ - LUỸ KẾ - THI ĐUA (COMPETITIONVIEW) ───
    await page.goto('/?tab=employees&view=dashboard&mode=cumulative&sub=competition');
    await page.waitForTimeout(2000);

    // Chuyển sang view Siêu thị nếu đang ở Nhân viên
    const sieuthiBtn = page.locator('button, a, div').filter({ hasText: /^Siêu thị$/ }).first();
    if (await sieuthiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sieuthiBtn.click();
        await page.waitForTimeout(1500);
    }
    // Tìm cụm nút toolbar trong Siêu thị Thi đua: layers, filter, settings
    const layersBtn = page.locator('button[aria-label*="nhóm"], button[title*="Chế độ nhóm"]').first();
    if (await layersBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const layersRadius = await layersBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
        console.log('SUPERMARKET COMPETITION layersBtn radius:', layersRadius);
        expect(parseFloat(layersRadius)).toBeGreaterThanOrEqual(6); // rounded-lg = 8px
        expect(parseFloat(layersRadius)).toBeLessThanOrEqual(10);
    }

    const filterBtn = page.locator('button[title*="Bộ lọc thi đua"]').first();
    if (await filterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const filterRadius = await filterBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
        console.log('SUPERMARKET COMPETITION filterBtn radius:', filterRadius);
        expect(parseFloat(filterRadius)).toBeGreaterThanOrEqual(6); // rounded-lg = 8px
        expect(parseFloat(filterRadius)).toBeLessThanOrEqual(10);
    }

    // Chụp ảnh bằng chứng thực tế tại Siêu thị - Luỹ kế - Thi đua
    await page.screenshot({ path: 'test-results/taste-apple-competition-supermarket.png' });

    // ─── 5. KIỂM TRA TAB NHÂN VIÊN - THI ĐUA (HÌNH 1 CỦA USER) ───
    await page.goto('/?tab=employees&sub=competition');
    await page.waitForTimeout(2000);

    const empCompViewModeBtn = page.locator('button[title*="theo Bộ phận"], button[title*="Danh sách"]').first();
    if (await empCompViewModeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const ecRadius = await empCompViewModeBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
        console.log('EMPLOYEE COMPETITION viewModeBtn radius (Hình 1):', ecRadius);
        expect(parseFloat(ecRadius)).toBeGreaterThanOrEqual(6);
        expect(parseFloat(ecRadius)).toBeLessThanOrEqual(10);
    }

    // Chụp ảnh bằng chứng thực tế tại Nhân viên - Thi đua (Hình 1)
    await page.screenshot({ path: 'test-results/taste-apple-competition-employee.png' });
});
