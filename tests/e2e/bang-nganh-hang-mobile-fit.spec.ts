import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

test('Xác thực bảng Ngành hàng hiển thị vừa vặn 100% màn hình mobile không bị tràn', async ({ page }) => {
    // 1. Mở viewport mobile đúng như ảnh của người dùng (iPhone 430px)
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/?tab=settings');
    await page.waitForTimeout(2000);

    // 2. Chuyển sang tab "Ngành hàng"
    const nganhHangTab = page.locator('button:has-text("Ngành hàng")').first();
    await nganhHangTab.waitFor({ state: 'visible', timeout: 15000 });
    await nganhHangTab.click();
    await page.waitForTimeout(2000);

    // 3. Kiểm tra table
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // 4. Kiểm tra header mobile hiển thị đúng các cột
    const mobileHeader = table.locator('thead tr.sm\\:hidden');
    await expect(mobileHeader).toBeVisible();

    // 5. Kiểm tra không có cuộn ngang trên container
    const tableContainer = page.locator('div.overflow-x-auto').first();
    const scrollDelta = await tableContainer.evaluate((el) => el.scrollWidth - el.clientWidth);
    console.log('Horizontal scroll overflow delta (px):', scrollDelta);
    // Bảng phải vừa vặn, scrollDelta <= 2px (không cuộn ngang)
    expect(scrollDelta).toBeLessThanOrEqual(2);

    // 6. Chụp ảnh màn hình làm bằng chứng kiểm nghiệm trực quan
    const screenshotPath = '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/bang-nganh-hang-mobile-fit.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('✅ Screenshot captured at:', screenshotPath);
});
