import { test, expect } from '@playwright/test';

/**
 * Đợt D — kế hoạch iPhone: ô nhập số bật bàn phím số, nút "Chụp" (phiếu lương) mở thẳng camera,
 * dải nút cuộn ngang tự đưa mục đang chọn vào giữa MÀ KHÔNG làm trang nhảy dọc.
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Tabs: chọn mục khuất bên phải → dải tự cuộn đưa mục vào giữa, trang không nhảy dọc', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const m = await import('/tests/e2e/helpers/tabsHarness.tsx' as string);
        m.mount();
    });
    await expect(page.getByRole('button', { name: 'Kho số 1000' })).toBeVisible();
    const y0 = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => (window as unknown as { __setTab: (id: string) => void }).__setTab('k8'));
    const active = page.getByRole('button', { name: 'Kho số 1008' });
    await expect(active).toHaveAttribute('data-active', 'true');
    await expect.poll(async () => {
        const b = (await active.boundingBox())!;
        return Math.abs(b.x + b.width / 2 - 195); // tâm nút gần tâm màn 390px
    }, { timeout: 3000 }).toBeLessThan(20);
    expect(await page.evaluate(() => window.scrollY)).toBe(y0);
});

test.describe('iPhone SE', () => { test.use({ viewport: { width: 375, height: 667 } }); test('Tính thuế 375px: nút Chụp không tràn chữ', async ({ page }) => { await page.goto('/?tab=tools-tax'); await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click(); const l = page.locator('label[for="capture-slot-day5"]'); await expect(l).toBeVisible({ timeout: 20_000 }); expect(await l.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true); await l.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'test-results/thue-se.png' }); }); });

test('Tính thuế: ô nhập số có bàn phím số; có nút "Chụp" mở camera', async ({ page }) => {
    await page.goto('/?tab=tools-tax');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await expect(page.locator('#capture-slot-day5')).toHaveCount(1, { timeout: 20_000 });
    for (const slot of ['day5', 'day20']) {
        const cam = page.locator(`#capture-slot-${slot}`);
        await expect(cam).toHaveAttribute('capture', 'environment');
        await expect(page.locator(`label[for="capture-slot-${slot}"]`)).toBeVisible();
        // ô tải ảnh cũ KHÔNG có capture (giữ lựa chọn Thư viện ảnh)
        expect(await page.locator(`#upload-slot-${slot}`).getAttribute('capture')).toBeNull();
    }
    await page.locator('label[for="capture-slot-day5"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/thue-chup-phieu.png' });
    const thieu = await page.evaluate(() => [...document.querySelectorAll('input[type="number"]')]
        .filter((el) => !el.getAttribute('inputmode')).length);
    expect(thieu).toBe(0);
});
