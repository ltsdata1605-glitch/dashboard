import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

test('Xác thực chiều cao cụm tìm kiếm/sắp xếp và dropdown vai trò trong Phân quyền & duyệt', async ({ page }) => {
    // 1. Mở viewport mobile đúng như ảnh của người dùng (iPhone)
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/?tab=settings');
    await page.waitForTimeout(2000);

    // 2. Chuyển sang tab "Hoạt động" giống hệt màn hình người dùng
    const activeTabBtn = page.locator('button:has-text("Hoạt động")').first();
    if (await activeTabBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await activeTabBtn.click();
        await page.waitForTimeout(1000);
    }

    // 3. Kiểm tra ô tìm kiếm
    const searchInput = page.locator('input[placeholder*="Tìm email, mã kho"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });

    const searchBox = (await searchInput.boundingBox())!;
    console.log('Search input height:', searchBox.height);
    expect(searchBox.height).toBeLessThanOrEqual(34);
    expect(searchBox.height).toBeGreaterThanOrEqual(28);

    // 4. Kiểm tra cụm sắp xếp (Select Ngày ĐK)
    const sortSelect = page.locator('select[aria-label="Sắp xếp theo"]').first();
    const sortBox = (await sortSelect.boundingBox())!;
    console.log('Sort select height:', sortBox.height);
    expect(sortBox.height).toBeLessThanOrEqual(34);
    expect(sortBox.height).toBeGreaterThanOrEqual(28);

    // 5. Kiểm tra dropdown vai trò trong thẻ người dùng tab Hoạt động
    const roleSelect = page.locator('div[class*="rounded-card"] select').first();
    if (await roleSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        const roleBox = (await roleSelect.boundingBox())!;
        console.log('Role select height:', roleBox.height);
        // Chiều cao phải nhỏ gọn (<= 32px), không bị phình 44px như trước
        expect(roleBox.height).toBeLessThanOrEqual(32);
        expect(roleBox.height).toBeGreaterThanOrEqual(24);

        // Đo luôn nút Gia hạn bên cạnh
        const giaHanBtn = page.locator('button:has-text("Gia hạn")').first();
        if (await giaHanBtn.isVisible()) {
            const giaHanBox = (await giaHanBtn.boundingBox())!;
            console.log('Gia hạn button height:', giaHanBox.height);
            // Chiều cao dropdown vai trò và nút Gia hạn phải tương đồng (chênh không quá 4px)
            expect(Math.abs(roleBox.height - giaHanBox.height)).toBeLessThanOrEqual(4);
        }
    }

    // 6. Chụp ảnh màn hình lưu làm bằng chứng kiểm nghiệm trực quan
    const screenshotPath = '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/phan-quyen-chieu-cao-fixed.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('✅ Screenshot captured at:', screenshotPath);
});
