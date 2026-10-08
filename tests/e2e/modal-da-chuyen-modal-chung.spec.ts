import { expect, test } from '@playwright/test';

/**
 * Modal tự dựng (`fixed inset-0`) chuyển dần sang <Modal> dùng chung (GĐ4 — rawOverlay). Mỗi modal đã chuyển phải:
 * có tên, khoá cuộn, bẫy Tab, Escape đóng + trả focus, nằm gọn trong màn hình ở laptop và iPhone.
 */
const CASES = [
    { nut: '#mo-chon-tuong-tac', ten: /Chọn Admin Từ Tương Tác LINE/, anh: 'chon-tuong-tac' },
    { nut: '#mo-chon-loc', ten: /Chọn Người Dùng Bot Để Lọc PMH/, anh: 'chon-loc' },
    { nut: '#mo-tu-khoa', ten: /Thêm Từ Khoá Tự Động/, anh: 'tu-khoa' },
    { nut: '#mo-lich-hen', ten: /Tạo Lịch Hẹn Thông Báo/, anh: 'lich-hen' },
    { nut: '#mo-huong-dan', ten: /Hướng dẫn tự tạo & Cấu hình BOT LINE/, anh: 'huong-dan' },
];

for (const vp of [{ ten: 'laptop', width: 1366, height: 768 }, { ten: 'iphone', width: 390, height: 844 }]) {
    for (const c of CASES) {
        test(`${c.anh} (${vp.ten}): hành vi chuẩn + nằm gọn trong màn hình`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/');
            await page.evaluate(async () => (await import('/tests/e2e/helpers/modalDaChuyenHarness.tsx' as string)).mountHarness());
            await page.locator(c.nut).click();
            const hop = page.getByRole('dialog', { name: c.ten });
            await expect(hop).toBeVisible();
            expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

            const box = await hop.boundingBox();
            expect(box!.x).toBeGreaterThanOrEqual(-1);
            expect(box!.y).toBeGreaterThanOrEqual(-1);
            expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
            expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
            await page.screenshot({ path: `test-results/modal-chuyen-${c.anh}-${vp.ten}.png` });

            for (let i = 0; i < 12; i++) {
                await page.keyboard.press('Tab');
                expect(await hop.evaluate(el => el.contains(document.activeElement)), `Tab lần ${i + 1} lạc ra ngoài`).toBe(true);
            }
            await page.keyboard.press('Escape');
            await expect(hop).toHaveCount(0);
            expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
            expect(await page.evaluate(() => document.activeElement?.id)).toBe(c.nut.slice(1));
        });
    }
}
