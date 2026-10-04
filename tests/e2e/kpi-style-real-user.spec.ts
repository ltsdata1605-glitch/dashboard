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
        expect(radius, `Thẻ Phân Tích #${i + 1} phải bo tròn 16px (rounded-2xl)`).toBe('16px');
    }
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
});
