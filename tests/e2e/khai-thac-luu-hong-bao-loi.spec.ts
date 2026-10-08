import { test, expect } from '@playwright/test';

/**
 * Audit D11 (2026-10-08): Báo cáo khai thác lưu DUY NHẤT trong IndexedDB trên máy. Trước đây thêm khách
 * ghi không chờ rồi báo "Đã thêm khách …" ngay — ghi hỏng (bộ nhớ đầy) thì mở lại là mất mà người dùng tưởng
 * đã lưu. Nay chỉ báo thành công sau khi ghi xong; hỏng → báo lỗi + gỡ dòng vừa thêm.
 */
test('thêm khách lúc bộ nhớ đầy: báo lỗi, không báo "Đã thêm", dòng khách được gỡ', async ({ page }) => {
    await page.addInitScript(() => {
        const goc = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
            if ((window as unknown as { __dayBoNho?: boolean }).__dayBoNho && this.name === 'leads') {
                throw new DOMException('Quota exceeded (giả lập)', 'QuotaExceededError');
            }
            return goc.call(this, value, key);
        };
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('aside').first().hover();
    await page.getByRole('button', { name: /^Báo cáo$/ }).first().click();
    await page.getByRole('button', { name: /^Khách hàng/ }).click();

    await page.evaluate(() => { (window as unknown as { __dayBoNho: boolean }).__dayBoNho = true; });
    await page.locator('#lead-name').fill('Nguyễn Văn B');
    await page.locator('#lead-phone').fill('0909000111');
    const tivi = page.getByRole('button', { name: 'Tivi', exact: true });
    if (await tivi.getAttribute('aria-pressed') !== 'true') await tivi.click();
    await page.getByTestId('btn-add-lead').click();

    await expect(page.getByText(/Không lưu được trên máy \(thêm khách\)/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Đã thêm khách Nguyễn Văn B/)).toHaveCount(0);
    await expect(page.getByTestId('lead-row')).toHaveCount(0);

    // Bộ nhớ ổn lại → thêm được bình thường
    await page.evaluate(() => { (window as unknown as { __dayBoNho: boolean }).__dayBoNho = false; });
    await page.locator('#lead-name').fill('Nguyễn Văn B');
    await page.locator('#lead-phone').fill('0909000111');
    if (await tivi.getAttribute('aria-pressed') !== 'true') await tivi.click();
    await page.getByTestId('btn-add-lead').click();
    await expect(page.getByText(/Đã thêm khách Nguyễn Văn B/)).toBeVisible();
    await expect(page.getByTestId('lead-row')).toHaveCount(1);
});
