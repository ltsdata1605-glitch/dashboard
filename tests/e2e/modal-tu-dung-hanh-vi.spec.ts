import { expect, test } from '@playwright/test';

/**
 * Audit A34 (2026-09-30): ~9 modal TỰ DỰNG (Thuế, Bot LINE, KPI ngành hàng BI) không qua Modal dùng
 * chung nên thiếu hành vi chuẩn: Escape không đóng, Tab lạc ra trang phía sau, trang sau vẫn cuộn,
 * đóng xong focus rơi về body, không có role/tên cho trình đọc màn hình. Nay gắn `useModalBehavior`.
 * Kiểm bằng TaxBracketModal thật.
 */
test('modal tự dựng: tên + khoá cuộn + bẫy Tab + Escape đóng + trả focus', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/tuDungModalHarness.tsx' as string)).mountHarness());
    await page.locator('#mo-bieu-thue').click();

    const hop = page.getByRole('dialog', { name: 'Biểu thuế thu nhập cá nhân' });
    await expect(hop).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    // Tab 12 lần: focus luôn ở trong hộp thoại
    for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        expect(await hop.evaluate(el => el.contains(document.activeElement)), `Tab lần ${i + 1} lạc ra ngoài`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(hop).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('mo-bieu-thue');
});
