import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

test('Xác thực đã xoá bỏ các thông số thống kê trong tab Ngành hàng', async ({ page }) => {
    // 1. Mở viewport mobile đúng như ảnh của người dùng (iPhone)
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/?tab=settings');
    await page.waitForTimeout(2000);

    // 2. Chuyển sang tab "Ngành hàng"
    const nganhHangTab = page.locator('button:has-text("Ngành hàng")').first();
    await nganhHangTab.waitFor({ state: 'visible', timeout: 15000 });
    await nganhHangTab.click();
    await page.waitForTimeout(2000);

    // 3. Kiểm tra rằng các chuỗi "nhóm cha", "nhóm con", "hệ số quy đổi" KHÔNG còn xuất hiện trong phần tiêu đề cấu hình
    const parentGroupText = page.locator('text=/\\d+\\s+nhóm cha/i');
    expect(await parentGroupText.count()).toBe(0);

    const subGroupText = page.locator('text=/\\d+\\s+nhóm con/i');
    expect(await subGroupText.count()).toBe(0);

    const multiplierText = page.locator('text=/\\d+\\s+hệ số quy đổi/i');
    expect(await multiplierText.count()).toBe(0);

    // 4. Chụp ảnh màn hình lưu làm bằng chứng kiểm nghiệm trực quan
    const screenshotPath = '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/xoa-thong-tin-nganh-hang-verified.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('✅ Screenshot captured at:', screenshotPath);
});
