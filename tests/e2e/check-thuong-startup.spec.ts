import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Xác thực khởi động lần 1: tự động đồng bộ và hiển thị dữ liệu ngay lập tức, không bị trắng hay rơi vào landing', async ({ page }) => {
    // 1. Vào trang gốc để xóa trắng keyval-store (giả lập khởi động lần 1 khi iframe DB trống)
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(1000);

    await page.evaluate(async () => {
        return new Promise<void>((resolve, reject) => {
            const req = indexedDB.open('keyval-store');
            req.onsuccess = () => {
                const db = req.result;
                if (db.objectStoreNames.contains('keyval')) {
                    const tx = db.transaction('keyval', 'readwrite');
                    tx.objectStore('keyval').clear();
                    tx.oncomplete = () => { db.close(); resolve(); };
                    tx.onerror = () => { db.close(); reject(tx.error); };
                } else {
                    db.close();
                    resolve();
                }
            };
            req.onerror = () => reject(req.error);
        });
    });

    console.log('--- ĐÃ XÓA TRẮNG KEYVAL-STORE ---');

    // 2. Mở trực tiếp tab Check Thưởng (LẦN 1)
    await page.goto('http://127.0.0.1:5173/?tab=check-thuong');

    const iframe = page.frameLocator('iframe[title="Bảng Tra Cứu Thưởng Thi Đua"]');

    // Chờ iframe nạp và hiển thị bảng tra cứu thưởng (mainContent)
    const mainContent = iframe.locator('#mainContent');
    await expect(mainContent).toBeVisible({ timeout: 10_000 });

    // Landing page BẮT BUỘC phải ẩn
    const landingPage = iframe.locator('#landingPage');
    await expect(landingPage).toBeHidden();

    // Summary Card có dữ liệu tra cứu kho 910
    const summaryCard = iframe.locator('#summaryCard');
    await expect(summaryCard).toBeVisible();
    await expect(summaryCard).toContainText(/Kết quả tra cứu/i);

    // Header actions (thanh tra cứu trên header) phải hiển thị
    const searchInputs = page.locator('input[placeholder="Kho 1"]');
    await expect(searchInputs.first()).toBeVisible({ timeout: 5_000 });
    await expect(searchInputs.first()).toHaveValue('910');

    // Chụp ảnh bằng chứng lần 1 thành công
    await page.screenshot({ path: 'test-results/check-thuong-lan-1-fixed.png' });
    console.log('✅ LẦN 1: Dữ liệu thưởng đã hiển thị ngay lập tức, không bị trắng hay landing page!');

    // 3. Kiểm tra khởi động lần 2 (F5 reload)
    await page.reload();
    await expect(mainContent).toBeVisible({ timeout: 10_000 });
    await expect(landingPage).toBeHidden();
    await expect(summaryCard).toBeVisible();

    await page.screenshot({ path: 'test-results/check-thuong-lan-2-fixed.png' });
    console.log('✅ LẦN 2: Dữ liệu thưởng tiếp tục hiển thị hoàn hảo!');
});
