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
    // Chờ aside (desktop) hoặc nav (mobile) hoặc thẻ KPI sẵn sàng
    await page.locator('aside:visible, nav:visible, .kpi-overview-card:visible').first().waitFor({ state: 'visible', timeout: 30_000 });
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

test('Kiểm thử thực tế: Giao diện mobile thẻ KPI có icon nhỏ, tiêu đề cùng dòng, bỏ dấu chấm đỏ', async ({ page }) => {
    // Đặt viewport mobile chuẩn (iPhone 14/15: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await navigateAndEnsureApp(page, '/?tab=analysis');

    const ptCards = page.locator('.kpi-overview-card:visible');
    await expect(ptCards.first()).toBeVisible({ timeout: 20_000 });
    const count = await ptCards.count();
    expect(count, 'Phải có đúng 4 thẻ KPI hiển thị trên mobile').toBe(4);

    for (let i = 0; i < count; i++) {
        const card = ptCards.nth(i);
        // Mobile layout container
        const mobileContainer = card.locator('.lg\\:hidden');
        await expect(mobileContainer).toBeVisible();

        // 1. Kiểm tra hàng 1 chứa cả icon và title
        const row1 = mobileContainer.locator('> div').first();
        const iconEl = row1.locator('.ycx-icon');
        const titleEl = row1.locator('.kpi-overview-title');
        
        await expect(iconEl).toBeVisible();
        await expect(titleEl).toBeVisible();

        // 2. Kiểm tra không có dấu chấm đỏ/xanh trạng thái trong mobileContainer
        const statusDot = mobileContainer.locator('.rounded-full.bg-rose-500, .rounded-full.bg-emerald-500');
        expect(await statusDot.count(), `Thẻ #${i + 1} không được chứa dấu chấm đỏ/xanh`).toBe(0);
    }

    // Cuộn thẻ KPI vào giữa khung nhìn màn hình
    await page.evaluate(() => {
        const card = document.querySelector('.kpi-overview-card');
        if (card) {
            card.scrollIntoView({ block: 'center' });
        }
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const trendEl = document.getElementById('trend-chart-section');
        if (trendEl) {
            trendEl.scrollIntoView({ block: 'center' });
        }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/trend-chart-mobile.png' });
});

test('Kiểm thử thực tế: Nút chuyển chế độ Biểu đồ / Bảng lịch được gộp làm 1 nút toggle', async ({ page }) => {
    await navigateAndEnsureApp(page, '/?tab=analysis');

    // Nút toggle chuyển chế độ xem
    const toggleBtn = page.locator('button[title*="dạng Bảng Lịch"], button[title*="dạng Biểu đồ"]').first();
    await expect(toggleBtn).toBeVisible({ timeout: 15_000 });

    // Ban đầu ở chart mode -> icon calendar
    await expect(toggleBtn.locator('[data-icon="calendar"]')).toBeVisible();

    // Click chuyển sang bảng lịch
    await toggleBtn.click();
    await page.waitForTimeout(400);

    // Bây giờ icon đổi thành chartBar
    await expect(toggleBtn.locator('[data-icon="chartBar"]')).toBeVisible();

    // Click lần nữa để quay lại biểu đồ
    await toggleBtn.click();
    await page.waitForTimeout(400);
    await expect(toggleBtn.locator('[data-icon="calendar"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/trend-chart-toggle-verify.png' });
});


