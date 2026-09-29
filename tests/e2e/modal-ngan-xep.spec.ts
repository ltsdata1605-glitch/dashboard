import { expect, test, type Page } from '@playwright/test';

/**
 * Audit A11/A12 (2026-09-29) — Modal dùng chung (components/shared/ui/Modal.tsx, 67 nơi dùng).
 * - A11: modal ĐÓNG cũng ghi body.overflow='unset' → đóng ConfirmDialog lồng trong modal khác là
 *   trang phía sau cuộn được; 1 lần Escape đóng MỌI modal.
 * - A12: thiếu role=dialog/aria-modal/nhãn, không giữ/trả focus, nút đóng không có tên.
 */
const moHarness = async (page: Page) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const p = '/tests/e2e/helpers/modalHarness.tsx';
        const mod = await import(/* @vite-ignore */ p) as { mountHarness: () => void };
        mod.mountHarness();
    });
    await expect(page.locator('#mo-a')).toBeVisible();
};
const overflow = (page: Page) => page.evaluate(() => document.body.style.overflow);

test('khoá cuộn theo ngăn xếp: đóng dialog lồng / mount modal đóng không mở khoá modal còn mở', async ({ page }) => {
    await moHarness(page);
    const truoc = await overflow(page);

    await page.locator('#mo-a').click();
    await expect(page.getByRole('dialog', { name: 'Hộp thoại A' })).toBeVisible();
    expect(await overflow(page)).toBe('hidden');

    // Mount thêm một Modal đang ĐÓNG trong lúc A mở
    await page.locator('#mount-c').click();
    expect(await overflow(page), 'modal đóng vừa mount đã mở khoá cuộn').toBe('hidden');

    // Mở ConfirmDialog lồng rồi đóng nó
    await page.locator('#mo-b').click();
    await expect(page.getByRole('dialog', { name: 'Xác nhận B' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Xác nhận B' }).getByRole('button', { name: 'Hủy' }).click();
    await expect(page.getByRole('dialog', { name: 'Xác nhận B' })).toHaveCount(0);
    expect(await overflow(page), 'đóng dialog lồng đã mở khoá cuộn dù A còn mở').toBe('hidden');

    // Đóng A → trả lại đúng giá trị ban đầu
    await page.getByRole('dialog', { name: 'Hộp thoại A' }).getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByRole('dialog', { name: 'Hộp thoại A' })).toHaveCount(0);
    expect(await overflow(page)).toBe(truoc);
});

test('Escape chỉ đóng modal trên cùng', async ({ page }) => {
    await moHarness(page);
    await page.locator('#mo-a').click();
    await page.locator('#mo-b').click();
    await expect(page.getByRole('dialog', { name: 'Xác nhận B' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Xác nhận B' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Hộp thoại A' }), 'Escape đóng luôn cả modal bên dưới').toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Hộp thoại A' })).toHaveCount(0);
});

test('a11y: role=dialog + aria-modal + tên; focus vào trong, Tab vòng trong modal, đóng thì trả focus', async ({ page }) => {
    await moHarness(page);
    const trigger = page.locator('#mo-a');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Hộp thoại A' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('button', { name: 'Đóng' })).toBeVisible();

    // Focus đã vào trong hộp thoại
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);

    // Tab 10 lần vẫn ở trong hộp thoại (4 phần tử focus được: Đóng, ô nhập, Xoá, Mount C, Lưu A)
    for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(el => el.contains(document.activeElement)), `Tab lần ${i + 1} thoát khỏi modal`).toBe(true);
    }
    // Shift+Tab từ phần tử đầu → về phần tử cuối
    await dialog.getByRole('button', { name: 'Đóng' }).focus();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('a-luu');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.id), 'không trả focus về nút đã mở modal').toBe('mo-a');
});

test('ConfirmDialog có tên = tiêu đề (không có header chuẩn)', async ({ page }) => {
    await moHarness(page);
    await page.locator('#mo-a').click();
    await page.locator('#mo-b').click();
    await expect(page.getByRole('dialog', { name: 'Xác nhận B' })).toBeVisible();
});
