import { expect, test, type Page } from '@playwright/test';

/**
 * "Bảng luôn là bảng" (CLAUDE.md mục 2, chủ dự án chốt 2026-10-02) — danh sách mã coupon ở Bot LINE trước đây trên điện thoại là
 * DANH SÁCH THẺ (2026-10-07). GĐ9 (2026-10-14): mọi cỡ màn là BẢNG; điện thoại ẩn cột "#", ghim cột Mã Coupon (trái) và Thao tác (phải)
 * để copy / thu hồi không phải cuộn ngang, giữa cuộn ngang trong khung bảng — trang không tràn ngang.
 * Dữ liệu mẫu qua harness (tests/e2e/helpers/couponTableHarness.tsx) — mã coupon thật đọc từ Firestore theo tài khoản.
 */
const moHarness = async (page: Page) => {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/couponTableHarness.tsx' as string)).mountHarness());
    await expect(page.getByTestId('coupon-table').locator('table')).toBeVisible({ timeout: 20_000 });
};

test.describe('iPhone 16 Pro Max', () => {
    test.use({
        viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    test('bảng (không phải thẻ), ghim Mã Coupon + Thao tác, cuộn ngang trong khung', async ({ page }) => {
        await moHarness(page);
        const khung = page.getByTestId('coupon-table');
        await expect(page.getByTestId('coupon-cards')).toHaveCount(0);
        await expect(khung.locator('th', { hasText: '#' })).toBeHidden();
        const dong = khung.locator('tbody tr').first();
        const ma = dong.locator('td').nth(1);
        const thaoTac = dong.locator('td').last();
        await page.screenshot({ path: test.info().outputPath('coupon-iphone-dau.png') });

        const kq = await page.evaluate(() => ({ tran: document.documentElement.scrollWidth - innerWidth }));
        expect(kq.tran, 'trang không được tràn ngang').toBeLessThanOrEqual(0);
        const k = (await khung.boundingBox())!;
        const truoc = { ma: (await ma.boundingBox())!, tt: (await thaoTac.boundingBox())! };
        expect(truoc.tt.x + truoc.tt.width, 'cột Thao tác nằm trong màn hình').toBeLessThanOrEqual(k.x + k.width + 1);

        // Cuộn ngang hết cỡ: 2 cột ghim đứng yên.
        await khung.evaluate(el => { el.scrollLeft = el.scrollWidth; });
        await page.waitForTimeout(200);
        const sau = { ma: (await ma.boundingBox())!, tt: (await thaoTac.boundingBox())! };
        expect(Math.abs(sau.ma.x - k.x), 'cột Mã Coupon ghim mép trái').toBeLessThan(2);
        expect(Math.abs(sau.tt.x - truoc.tt.x), 'cột Thao tác ghim mép phải').toBeLessThan(2);
        await page.screenshot({ path: test.info().outputPath('coupon-iphone-cuon.png') });

        // Nút thao tác 28px nhìn thấy nhưng vùng chạm ≥ 44 (ycx-hit).
        const nut = thaoTac.getByRole('button', { name: /Xoá mã này/ }).first();
        const vung = await nut.evaluate(el => {
            const r = el.getBoundingClientRect(); const af = getComputedStyle(el, '::after');
            const mo = af.content !== 'none' && af.position === 'absolute';
            return { h: mo ? r.height - (parseFloat(af.top) || 0) - (parseFloat(af.bottom) || 0) : r.height };
        });
        expect(vung.h).toBeGreaterThanOrEqual(43.5);
    });
});

test.describe('laptop', () => {
    test.use({ viewport: { width: 1366, height: 900 } });
    test('bảng đủ cột như cũ, không ghim', async ({ page }) => {
        await moHarness(page);
        const khung = page.getByTestId('coupon-table');
        await expect(khung.locator('th', { hasText: '#' })).toBeVisible();
        const viTri = await khung.locator('tbody tr').first().locator('td').nth(1).evaluate(el => getComputedStyle(el).position);
        expect(viTri).toBe('static');
        await page.screenshot({ path: test.info().outputPath('coupon-laptop.png') });
    });
});
