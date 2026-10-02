import { test, expect, type Page } from '@playwright/test';

/**
 * Đợt B — kế hoạch iPhone: Modal `position="bottom"` trên màn < 640px là sheet kiểu iOS:
 * trượt từ đáy, có thanh nắm, VUỐT XUỐNG để đóng; vuốt ngắn thì bật về; cuộn trong nội dung KHÔNG đóng.
 * Màn rộng (máy tính) giữ nguyên hộp thoại giữa màn, không có thanh nắm.
 */
async function mo(page: Page, position: 'center' | 'bottom') {
    await page.goto('/');
    await page.evaluate(async (pos) => {
        const m = await import('/tests/e2e/helpers/sheetHarness.tsx' as string);
        m.mount(pos);
    }, position);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(500); // chờ hoạt ảnh trượt lên xong
}

/** Kéo bằng chuột (Pointer Events — motion xử lý chuột và ngón tay như nhau). */
async function keo(page: Page, from: { x: number; y: number }, dy: number, steps = 12) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, from.y + dy, { steps });
    await page.mouse.up();
}

test.describe('sheet trên iPhone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: true });

    test('dán đáy, có thanh nắm; vuốt thanh nắm xuống 200px thì đóng', async ({ page }) => {
        await mo(page, 'bottom');
        const dialog = page.getByRole('dialog');
        const box = (await dialog.boundingBox())!;
        expect(Math.round(box.y + box.height)).toBe(844);
        const handle = page.locator('[data-sheet-handle]');
        await expect(handle).toBeVisible();
        await page.screenshot({ path: 'test-results/sheet-iphone.png' });
        const h = (await handle.boundingBox())!;
        await keo(page, { x: h.x + h.width / 2, y: h.y + h.height / 2 }, 200);
        await expect(dialog).toBeHidden();
        expect(await page.evaluate(() => (window as unknown as { __sheetClosed: number }).__sheetClosed)).toBe(1);
    });

    test('kéo hàng tiêu đề cũng đóng được', async ({ page }) => {
        await mo(page, 'bottom');
        const title = (await page.getByText('Cấu hình thử').boundingBox())!;
        await keo(page, { x: title.x + 10, y: title.y + 5 }, 220);
        await expect(page.getByRole('dialog')).toBeHidden();
    });

    test('vuốt ngắn (40px, chậm) thì bật về, không đóng', async ({ page }) => {
        await mo(page, 'bottom');
        const h = (await page.locator('[data-sheet-handle]').boundingBox())!;
        await keo(page, { x: h.x + h.width / 2, y: h.y + 3 }, 40, 30);
        await expect(page.getByRole('dialog')).toBeVisible();
        // Lò xo bật về cần chút thời gian để dừng hẳn
        await expect.poll(async () => {
            const box = (await page.getByRole('dialog').boundingBox())!;
            return Math.round(box.y + box.height);
        }).toBe(844);
    });

    test('kéo trong nội dung là cuộn nội dung, không đóng modal', async ({ page }) => {
        await mo(page, 'bottom');
        const body = (await page.getByTestId('sheet-body').boundingBox())!;
        await keo(page, { x: body.x + 50, y: body.y + 100 }, 250);
        await page.waitForTimeout(400);
        await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('nút Đóng trong hàng tiêu đề vẫn bấm được', async ({ page }) => {
        await mo(page, 'bottom');
        await page.getByRole('button', { name: 'Đóng' }).click();
        await expect(page.getByRole('dialog')).toBeHidden();
    });

    test('modal giữa màn (center) không có thanh nắm', async ({ page }) => {
        await mo(page, 'center');
        await expect(page.locator('[data-sheet-handle]')).toHaveCount(0);
    });
});

test.describe('máy tính', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('position="bottom" vẫn là hộp thoại giữa màn, không thanh nắm, kéo không đóng', async ({ page }) => {
        await mo(page, 'bottom');
        await expect(page.locator('[data-sheet-handle]')).toHaveCount(0);
        const title = (await page.getByText('Cấu hình thử').boundingBox())!;
        await keo(page, { x: title.x + 10, y: title.y + 5 }, 250);
        await page.waitForTimeout(400);
        await expect(page.getByRole('dialog')).toBeVisible();
    });
});
