import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

test('Xác thực đường kẻ dọc mỏng 1px trên bảng Thưởng Report BI dữ liệu thật', async ({ page }) => {
    // 1. Mở trang với viewport mobile giống người dùng
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/');

    // 2. Chuyển sang Report BI qua nút bottom navigation có aria-label="Report BI"
    const reportBiBtn = page.locator('nav[data-app-chrome="tabbar"] button[aria-label="Report BI"]').first();
    await reportBiBtn.waitFor({ state: 'visible', timeout: 30000 });
    await reportBiBtn.click();
    await page.waitForTimeout(2000);

    // 3. Đảm bảo ở tab Nhân viên (nút trên mobile topbar actions có title/aria-label Nhân viên)
    const nvTab = page.locator('#mobile-topbar-actions button[title*="Nhân viên"], #mobile-topbar-actions button[aria-label*="Nhân viên"], button:has-text("Nhân viên")').first();
    if (await nvTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nvTab.click();
        await page.waitForTimeout(1000);
    }

    // 4. Chuyển sang subview Thưởng
    const bonusSubTab = page.locator('button').filter({ hasText: /^Thưởng$/i }).first();
    if (await bonusSubTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await bonusSubTab.click();
        await page.waitForTimeout(1500);
    }

    // 5. Kiểm tra bảng compact-export-table
    const table = page.locator('table.compact-export-table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // Kiểm tra header DTQĐ có border-left-width là 1px (thay vì 2px trước đây)
    const thDtqd = table.locator('th').filter({ hasText: 'DTQĐ' }).first();
    await expect(thDtqd).toBeVisible();
    const dtqdBorderWidth = await thDtqd.evaluate((el) => window.getComputedStyle(el).borderLeftWidth);
    console.log('✅ thDtqd borderLeftWidth:', dtqdBorderWidth);
    expect(dtqdBorderWidth, 'Đường kẻ dọc DTQĐ phải mỏng 1px').toBe('1px');

    // Kiểm tra header ERP có border-left-width là 1px
    const thErp = table.locator('th').filter({ hasText: 'ERP' }).first();
    await expect(thErp).toBeVisible();
    const erpBorderWidth = await thErp.evaluate((el) => window.getComputedStyle(el).borderLeftWidth);
    console.log('✅ thErp borderLeftWidth:', erpBorderWidth);
    expect(erpBorderWidth, 'Đường kẻ dọc ERP phải mỏng 1px').toBe('1px');

    // Chụp lại toàn màn hình làm bằng chứng trực quan
    const screenshotPath = '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/duong-ke-doc-mong-lai.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('✅ Screenshot captured at:', screenshotPath);
});
