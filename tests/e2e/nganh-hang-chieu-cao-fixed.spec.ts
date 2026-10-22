import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

test('Xác thực chiều cao thanh công cụ bảng Ngành hàng đã chuẩn mobile h-8 (32px)', async ({ page }) => {
    // 1. Mở viewport mobile đúng như ảnh của người dùng (iPhone)
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/?tab=settings');
    await page.waitForTimeout(2000);

    // 2. Chuyển sang tab "Ngành hàng"
    const nganhHangTab = page.locator('button:has-text("Ngành hàng")').first();
    await nganhHangTab.waitFor({ state: 'visible', timeout: 15000 });
    await nganhHangTab.click();
    await page.waitForTimeout(2000);

    // 3. Đo chiều cao ô tìm kiếm
    const searchInput = page.locator('input[placeholder*="Tìm mã nhóm, nhóm cha"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    const searchBox = (await searchInput.boundingBox())!;
    console.log('Search input height:', searchBox.height);
    expect(searchBox.height).toBeLessThanOrEqual(34);
    expect(searchBox.height).toBeGreaterThanOrEqual(28);

    // 4. Đo chiều cao nút Thêm mới
    const addBtn = page.locator('button:has-text("Thêm mới")').first();
    if (await addBtn.isVisible()) {
        const addBox = (await addBtn.boundingBox())!;
        console.log('Add button height:', addBox.height);
        expect(addBox.height).toBeLessThanOrEqual(34);
        expect(addBox.height).toBeGreaterThanOrEqual(28);
    }

    // 5. Đo chiều cao dropdown nhóm cha
    const parentSelect = page.locator('select:has(option:has-text("Tất cả nhóm cha"))').first();
    if (await parentSelect.isVisible()) {
        const selectBox = (await parentSelect.boundingBox())!;
        console.log('Parent select height:', selectBox.height);
        expect(selectBox.height).toBeLessThanOrEqual(34);
        expect(selectBox.height).toBeGreaterThanOrEqual(28);
    }

    // 6. Đo chiều cao badge đếm mục
    const countBadge = page.locator('span:has-text("mục")').first();
    if (await countBadge.isVisible()) {
        const badgeBox = (await countBadge.boundingBox())!;
        console.log('Count badge height:', badgeBox.height);
        expect(badgeBox.height).toBeLessThanOrEqual(34);
        expect(badgeBox.height).toBeGreaterThanOrEqual(28);
    }

    // 7. Chụp ảnh màn hình lưu làm bằng chứng kiểm nghiệm trực quan
    const screenshotPath = '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/nganh-hang-chieu-cao-fixed.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('✅ Screenshot captured at:', screenshotPath);
});
