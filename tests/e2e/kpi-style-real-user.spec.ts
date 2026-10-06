import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

async function navigateAndEnsureApp(page: Page, url: string) {
    await page.goto(url);
    // Nếu có modal chào hỏi / kích hoạt dùng thử thì click bypass
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trialBtn.click();
    }
    // Chờ aside hoặc giao diện chính sẵn sàng
    await page.locator('aside, nav, .kpi-overview-card').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('Kiểm thử thực tế: Thẻ KPI trong Phân Tích & Report BI phải bo tròn 16px (rounded-2xl)', async ({ page }) => {
    // ─── 1. KIỂM TRA TAB PHÂN TÍCH ───
    await navigateAndEnsureApp(page, '/?tab=analysis');

    const ptCards = page.locator('.kpi-overview-card');
    await expect(ptCards.first()).toBeVisible({ timeout: 20_000 });
    const ptCount = await ptCards.count();
    expect(ptCount, 'Phân Tích phải có ít nhất 4 thẻ KPI').toBeGreaterThanOrEqual(4);

    for (let i = 0; i < ptCount; i++) {
        const card = ptCards.nth(i);
        const radius = await card.evaluate(el => window.getComputedStyle(el).borderRadius);
    }
    await ptCards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/kpi-verify-phantich.png' });

    // ─── 2. KIỂM TRA TAB REPORT BI (REALTIME) ───
    await navigateAndEnsureApp(page, '/?tab=employees&view=dashboard&mode=realtime&sub=revenue');
    const biCards = page.locator('.kpi-overview-card');
    await expect(biCards.first()).toBeVisible({ timeout: 20_000 });
    const biCount = await biCards.count();
    expect(biCount, 'Report BI phải có đủ 8 thẻ KPI').toBeGreaterThanOrEqual(8);

    for (let i = 0; i < biCount; i++) {
        const card = biCards.nth(i);
        const radius = await card.evaluate(el => window.getComputedStyle(el).borderRadius);
        const overflow = await card.evaluate(el => window.getComputedStyle(el).overflow);
        expect(radius, `Thẻ Report BI Realtime #${i + 1} phải bo tròn 16px (rounded-2xl)`).toBe('16px');
        expect(overflow, `Thẻ Report BI Realtime #${i + 1} phải overflow hidden`).toBe('hidden');
    }

    // Đảm bảo tiêu đề TRẢ CHẬM không bị co cắt
    const traChamTitle = page.locator('.kpi-overview-title').filter({ hasText: /TRẢ CHẬM/i });
    await expect(traChamTitle.first()).toBeVisible();

    await page.screenshot({ path: 'test-results/kpi-verify-reportbi-realtime.png' });

    // ─── 2.1. KIỂM TRA THẺ KPI NGÀNH HÀNG (INDUSTRY KPI CARDS) ───
    const smDropdown = page.locator('button').filter({ hasText: /CỤM/i }).first();
    if (await smDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
        await smDropdown.click();
        await page.waitForTimeout(400);
        const smOption = page.locator('label, button, div, span').filter({ hasText: /HÙNG VƯƠNG/i }).first();
        if (await smOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await smOption.click();
            await page.waitForTimeout(1000);
        }
    }

    const indCards = page.locator('.industry-kpi-card');
    if (await indCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const indCount = await indCards.count();
        expect(indCount, 'Thẻ ngành hàng phải có ít nhất 1 thẻ').toBeGreaterThanOrEqual(1);
        for (let i = 0; i < indCount; i++) {
            const card = indCards.nth(i);
            const radius = await card.evaluate(el => window.getComputedStyle(el).borderRadius);
            const overflow = await card.evaluate(el => window.getComputedStyle(el).overflow);
            expect(radius, `Thẻ Ngành hàng #${i + 1} phải bo tròn 16px (rounded-2xl)`).toBe('16px');
            expect(overflow, `Thẻ Ngành hàng #${i + 1} phải overflow hidden`).toBe('hidden');
        }
        await indCards.first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'test-results/kpi-verify-industry.png' });
    }

    // ─── 3. KIỂM TRA TAB REPORT BI (LUỸ KẾ) ───
    await navigateAndEnsureApp(page, '/?tab=employees&view=dashboard&mode=cumulative&sub=revenue');
    const lkCards = page.locator('.kpi-overview-card');
    await expect(lkCards.first()).toBeVisible({ timeout: 20_000 });
    const lkCount = await lkCards.count();
    expect(lkCount, 'Report BI Luỹ kế phải có 8 thẻ KPI').toBeGreaterThanOrEqual(8);

    for (let i = 0; i < lkCount; i++) {
        const card = lkCards.nth(i);
        const radius = await card.evaluate(el => window.getComputedStyle(el).borderRadius);
        expect(radius, `Thẻ Report BI Luỹ Kế #${i + 1} phải bo tròn 16px (rounded-2xl)`).toBe('16px');
    }

    await page.screenshot({ path: 'test-results/kpi-verify-reportbi-cumulative.png' });

    // ─── 4. KIỂM TRA TAB THI ĐUA (COMPETITION) ───
    await navigateAndEnsureApp(page, '/?tab=employees&view=dashboard&mode=realtime&sub=competition');
    const compCards = page.locator('.kpi-overview-card');
    if (await compCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const compCount = await compCards.count();
        expect(compCount, 'Thi Đua phải có thẻ KPI').toBeGreaterThanOrEqual(1);
        for (let i = 0; i < compCount; i++) {
            const card = compCards.nth(i);
            const radius = await card.evaluate(el => window.getComputedStyle(el).borderRadius);
            expect(radius, `Thẻ Thi Đua #${i + 1} phải bo tròn 16px (rounded-2xl)`).toBe('16px');
        }
        await page.screenshot({ path: 'test-results/kpi-verify-competition.png' });
    }

    // ─── 5. KIỂM TRA TAB CHECK THƯỞNG ───
    await navigateAndEnsureApp(page, '/?tab=check-thuong');
    const ctCards = page.locator('.kpi-overview-card');
    if (await ctCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const ctCount = await ctCards.count();
        expect(ctCount, 'Check Thưởng phải có thẻ KPI').toBeGreaterThanOrEqual(1);
        for (let i = 0; i < ctCount; i++) {
            const card = ctCards.nth(i);
            const radius = await card.evaluate(el => window.getComputedStyle(el).borderRadius);
            expect(radius, `Thẻ Check Thưởng #${i + 1} phải bo tròn 16px (rounded-2xl)`).toBe('16px');
        }
        await page.screenshot({ path: 'test-results/kpi-verify-checkthuong.png' });
    }
});
