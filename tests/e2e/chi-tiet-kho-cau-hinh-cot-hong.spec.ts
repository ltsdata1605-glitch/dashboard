import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Chủ dự án báo 2026-10-07: "Chi tiết theo kho" treo mãi ở "Đang tải cấu hình cột…". Nguyên nhân:
 * `warehouseColumnConfig` lưu trong máy không đúng dạng (không phải mảng / có phần tử rỗng) làm
 * migrateColumns() ném lỗi trong effect → không bao giờ bật columnsLoaded. Nay phải hiện bảng.
 */
for (const [ten, hong] of [['object', { a: 1 }], ['phan-tu-rong', [null, { id: 'x' }]], ['chuoi', 'abc']] as const) {
    test(`cấu hình cột hỏng (${ten}) vẫn hiện bảng Chi tiết theo kho`, async ({ page }) => {
        test.setTimeout(150_000);
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });
        await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
        await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();
        await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3000);

        await page.evaluate(async (v) => {
            const db = await new Promise<IDBDatabase>((res, rej) => {
                const r = indexedDB.open('BI_HUB_DATABASE_V2');
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
            await new Promise<void>((res) => {
                const tx = db.transaction('settings', 'readwrite');
                tx.objectStore('settings').put(v, 'warehouseColumnConfig');
                tx.oncomplete = () => res();
            });
            db.close();
        }, hong as unknown);
        await page.reload();

        await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText('Đang tải cấu hình cột')).toBeHidden({ timeout: 15_000 });
    });
}
