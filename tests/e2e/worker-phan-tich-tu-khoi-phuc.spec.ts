import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Audit 2026-10-07 (D17): Worker phân tích SẬP thì app phải tự dựng lại Worker và gửi lại dữ liệu.
 * Trước đây onerror chỉ hiện chữ "Đang tải lại..." mà không làm gì — màn hình xử lý quay mãi.
 * Bọc constructor Worker để đếm Worker phân tích được tạo, rồi phát sự kiện 'error' lên Worker đó.
 */
test('Worker phân tích sập → tự dựng lại, dashboard vẫn có số liệu', async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => {
        const w = window as unknown as { __analyticsWorkers: Worker[]; Worker: typeof Worker };
        w.__analyticsWorkers = [];
        const Orig = w.Worker;
        w.Worker = class extends Orig {
            constructor(url: string | URL, opts?: WorkerOptions) {
                super(url, opts);
                if (String(url).includes('analytics')) w.__analyticsWorkers.push(this);
            }
        } as typeof Worker;
    });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();
    await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2000);

    const before = await page.evaluate(() => (window as unknown as { __analyticsWorkers: Worker[] }).__analyticsWorkers.length);
    expect(before).toBeGreaterThanOrEqual(1);
    await page.evaluate(() => {
        const list = (window as unknown as { __analyticsWorkers: Worker[] }).__analyticsWorkers;
        list[list.length - 1].dispatchEvent(new ErrorEvent('error', { message: 'giả lập Worker sập' }));
    });

    await expect.poll(() => page.evaluate(() => (window as unknown as { __analyticsWorkers: Worker[] }).__analyticsWorkers.length),
        { timeout: 15_000 }).toBe(before + 1);
    await expect(page.getByText(/gặp lỗi lặp lại/)).toHaveCount(0);
    await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 30_000 });
});
