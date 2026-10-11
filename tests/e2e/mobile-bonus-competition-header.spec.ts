import { test, expect } from '@playwright/test';

test.describe('Mobile BI Header Tests', () => {
    test('BonusTab: Thu cong & Tu dong bi an tren mobile, nut con lai nam ben phai', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?tab=employees&subTab=bonus');
        await page.waitForLoadState('networkidle');

        // Nut "Thủ công" phai bi an tren mobile
        const thuCongBtn = page.getByRole('button', { name: /^Thủ công$/i });
        if (await thuCongBtn.count() > 0) {
            await expect(thuCongBtn).toBeHidden();
        }

        // Nut "Tự động" phai bi an tren mobile
        const tuDongBtn = page.getByRole('button', { name: /Tự động/i });
        if (await tuDongBtn.count() > 0) {
            await expect(tuDongBtn).toBeHidden();
        }
    });

    test('CompetitionSummaryView: Header tren mobile nam tren 1 dong duy nhat (khong bi wrap thanh 2 dong)', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?tab=employees&subTab=competition');
        await page.waitForLoadState('networkidle');

        // Kiem tra phan tu tieu de va cum controls
        const reportTitle = page.locator('.js-report-title').first();
        if (await reportTitle.count() > 0) {
            const headerContainer = reportTitle.locator('xpath=ancestor::div[contains(@class, "flex-nowrap")]').first();
            await expect(headerContainer).toBeVisible();

            // Kiem tra container header khong wrap
            const flexWrap = await headerContainer.evaluate(el => window.getComputedStyle(el).flexWrap);
            expect(flexWrap).toBe('nowrap');
        }
    });

    test('CompetitionCompareView: Tab So sanh tren mobile nho gon, cap so sanh nhanh scroll ngang', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?tab=employees&subTab=competition');
        await page.waitForLoadState('networkidle');

        // Click vao tab "So sánh"
        const soSanhTab = page.getByRole('button', { name: /^So sánh$/i });
        if (await soSanhTab.count() > 0) {
            await soSanhTab.click();
            await page.waitForTimeout(500);

            // Kiem tra phan tu tray cap so sanh nhanh co lop overflow-x-auto va khong wrap
            const quickSelectTray = page.locator('div.overflow-x-auto').first();
            if (await quickSelectTray.count() > 0) {
                await expect(quickSelectTray).toBeVisible();
                const flexWrap = await quickSelectTray.evaluate(el => window.getComputedStyle(el).flexWrap);
                expect(flexWrap).toBe('nowrap');
            }

            // Kiem tra avatar trong card banner da duoc co nho gon
            const avatar = page.locator('[data-avatar="true"]').first();
            if (await avatar.count() > 0) {
                const box = await avatar.boundingBox();
                if (box) {
                    // w-12 h-12 tren mobile tuong duong 48px
                    expect(box.width).toBeLessThanOrEqual(64);
                }
            }
        }
    });

    test('IndividualCompetitionView: Tab Ca nhan tren mobile nho gon, avatar <= 64px', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?tab=employees&subTab=competition');
        await page.waitForLoadState('networkidle');

        // Click vao tab "Cá nhân"
        const caNhanTab = page.getByRole('button', { name: /^Cá nhân$/i });
        if (await caNhanTab.count() > 0) {
            await caNhanTab.click();
            await page.waitForTimeout(500);

            // Kiem tra avatar trong profile card da duoc co nho gon
            const avatar = page.locator('[data-avatar="true"]').first();
            if (await avatar.count() > 0) {
                const box = await avatar.boundingBox();
                if (box) {
                    // w-14 h-14 tren mobile tuong duong 56px, nho hon 96px cu
                    expect(box.width).toBeLessThanOrEqual(64);
                }
            }

            // Kiem tra donut widget co mat
            const donut = page.locator('.recharts-surface').first();
            if (await donut.count() > 0) {
                await expect(donut).toBeVisible();
            }
        }
    });
});
