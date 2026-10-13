import { test, expect } from '@playwright/test';

test('sticker: chỉnh sửa phiếu rút thăm, khởi động lại không bị mất và lịch sử khôi phục đầy đủ', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/?tab=tools-print-sticker&sub=draw');
    await page.waitForTimeout(2000);

    // Kích hoạt dùng thử nếu gặp màn đăng nhập
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible()) {
        await trialBtn.click();
        await page.waitForTimeout(2000);
    }

    // Xác nhận đã vào màn hình In Sticker chế độ Phiếu
    const drawMode = page.locator('button:has-text("Phiếu")');
    await expect(drawMode).toBeVisible();

    // Tìm ô tiêu đề phiếu rút thăm trong preview (contenteditable hoặc text)
    const titleElement = page.locator('.input-title-single').first();
    await expect(titleElement).toBeVisible();

    // Sửa tiêu đề thành tiêu đề riêng của người dùng
    const customTitle = 'PHIẾU BỐC THĂM ĐẶC BIỆT 20/10';
    await titleElement.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.type(customTitle);
    await page.waitForTimeout(600); // Đợi debounce saveSetting lưu vào IndexedDB

    // Bấm nút in (sẽ mở print dialog, chúng ta mock window.print để không chặn browser)
    await page.evaluate(() => {
        window.print = () => {};
    });

    const printBtn = page.locator('button:has-text("BẤM ĐỂ IN")');
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await page.waitForTimeout(1000);

    // 1. KIỂM TRA LỊCH SỬ ĐÃ LƯU
    const historyTab = page.locator('button:has-text("Lịch sử")');
    await historyTab.click();
    await page.waitForTimeout(500);

    // Xác nhận trong tab Lịch sử có item với tiêu đề riêng vừa in
    const customHistoryItem = page.locator(`text=${customTitle}`).first();
    await expect(customHistoryItem).toBeVisible();

    // 2. KIỂM TRA KHỞI ĐỘNG LẠI (RELOAD) KHÔNG BỊ MẤT DỮ LIỆU
    await page.reload();
    await page.waitForTimeout(2500);

    // Tiêu đề phiếu trên bản in sau khi reload PHẢI LÀ tiêu đề đã lưu, KHÔNG bị reset về mẫu mặc định
    const titleAfterReload = page.locator('.input-title-single').first();
    await expect(titleAfterReload).toBeVisible();
    await expect(titleAfterReload).toHaveText(customTitle);

    // 3. KIỂM TRA KHÔI PHỤC TỪ LỊCH SỬ
    const historyTabAfterReload = page.locator('button:has-text("Lịch sử")');
    await historyTabAfterReload.click();
    await page.waitForTimeout(500);

    // Khôi phục mẫu mặc định trước (mục đầu tiên trong danh sách lịch sử)
    const restoreButtons = page.locator('button[title="Khôi phục"]');
    await restoreButtons.first().click({ force: true });
    await page.waitForTimeout(500);

    // Tiêu đề đã về mẫu mặc định
    await expect(titleAfterReload).toContainText('TRÚNG THƯỞNG');

    // Giờ khôi phục lại từ lịch sử phiếu riêng vừa tạo (mục thứ 2)
    await restoreButtons.nth(1).click({ force: true });
    await page.waitForTimeout(500);

    // Tiêu đề đã được khôi phục chính xác
    await expect(titleAfterReload).toHaveText(customTitle);
});
