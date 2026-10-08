import { test, expect } from '@playwright/test';

/**
 * Audit 2026-10-07 (GĐ5, IOS-04): menu "Khác" ở thanh dưới trên iPhone XOAY NGANG. Trước đây khung không có
 * trần chiều cao: cao hơn màn hình nên đầu khung + nút đóng + hàng Công cụ đầu bị đẩy ra ngoài, không cuộn được.
 */
for (const [w, h] of [[844, 390], [667, 375]] as const) {
    test(`iPhone ngang ${w}×${h}: thấy nút đóng, cuộn tới được mục đầu và cuối, Esc đóng`, async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width: w, height: h });
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.waitForTimeout(2500);

        await page.getByRole('button', { name: 'Khác', exact: true }).click();
        const sheet = page.getByRole('dialog', { name: 'Thêm' });
        await expect(sheet).toBeVisible();
        await page.waitForTimeout(600); // hết hiệu ứng trượt lên

        const box = (await sheet.boundingBox())!;
        console.log(`${w}×${h} — khung menu: top ${Math.round(box.y)}, cao ${Math.round(box.height)} (màn ${h})`);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.height).toBeLessThanOrEqual(h);

        // Nút đóng (đầu khung) phải nằm trong màn.
        const close = sheet.getByRole('button').first();
        const cb = (await close.boundingBox())!;
        expect(cb.y).toBeGreaterThanOrEqual(0);

        // Mục đầu (In Sticker) và mục cuối (Giới thiệu) đều bấm tới được.
        const first = sheet.getByRole('button', { name: /In Sticker/ });
        await first.scrollIntoViewIfNeeded();
        await expect(first).toBeInViewport();
        const last = sheet.getByRole('button', { name: /Giới thiệu/ });
        await last.scrollIntoViewIfNeeded();
        await expect(last).toBeInViewport();

        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden();
    });
}
