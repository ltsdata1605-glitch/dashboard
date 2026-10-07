import { expect, test } from '@playwright/test';

/**
 * Audit 2026-10-07 (GĐ4):
 *  1. CSS Phân ca không còn ĐÈ kiểu toàn app sau khi mở tab Phân ca (trước: .animate-fade-in toàn app
 *     đổi 0.2s → 0.3s + @keyframes fadeIn bị thay).
 *  2. Vùng chạm 44px theo THIẾT BỊ CẢM ỨNG, không theo bề rộng: iPad ngang có nút ≥44px, laptop chuột giữ cỡ gọn.
 */
const probeFadeIn = (page: import('@playwright/test').Page) => page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'animate-fade-in';
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    const r = { duration: cs.animationDuration, name: cs.animationName };
    el.remove();
    return r;
});

test('mở Phân ca không làm đổi hiệu ứng .animate-fade-in của cả app', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(1500);
    const before = await probeFadeIn(page);
    await page.goto('/?tab=tools-phanca');
    await page.locator('.phanca-root').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    const after = await probeFadeIn(page);
    console.log('animate-fade-in TRƯỚC:', JSON.stringify(before), 'SAU khi mở Phân ca:', JSON.stringify(after));
    expect(after).toEqual(before);
});

test.describe('vùng chạm theo thiết bị cảm ứng', () => {
    test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
    test('iPad ngang (cảm ứng, 1024px): nút dùng chung ≥ 44px', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.waitForTimeout(1500);
        await page.goto('/?tab=tools-phanca');
        await page.locator('.phanca-root').first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(1500);
        const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
        const h = await page.locator('[data-ui="shared"]:visible').first().evaluate(el => el.getBoundingClientRect().height);
        console.log('pointer coarse:', coarse, '| cao nút:', h);
        expect(coarse).toBe(true);
        expect(h).toBeGreaterThanOrEqual(44);
    });
});

test('laptop dùng chuột (1366px): nút dùng chung giữ cỡ gọn < 44px', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(1500);
    await page.goto('/?tab=tools-phanca');
    await page.locator('.phanca-root').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    const h = await page.locator('[data-ui="shared"]:visible:not([class*="h-11"])').first().evaluate(el => el.getBoundingClientRect().height);
    console.log('laptop — cao nút:', h);
    expect(h).toBeLessThan(44);
});
