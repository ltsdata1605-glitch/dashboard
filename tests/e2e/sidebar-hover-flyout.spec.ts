import { test, expect } from '@playwright/test';

test('laptop: hover vào menu Công cụ và rê chuột sang submenu không bị mất', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2000);

    // Tìm icon/nút Công cụ ở thanh dock trái
    const toolsBtn = page.locator('aside button[title="Công cụ"], aside button[aria-label="Công cụ"]');
    await expect(toolsBtn).toBeVisible();

    // Rê chuột vào nút Công cụ
    await toolsBtn.hover();
    await page.waitForTimeout(100);

    // Submenu xuất hiện
    const stickerItem = page.locator('button:has-text("In Sticker")');
    await expect(stickerItem).toBeVisible();

    // Di chuyển chuột từ từ sang submenu "In Sticker" (vượt qua khoảng cách giữa dock và popover)
    const box = await stickerItem.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    }

    // Đợi 300ms (lớn hơn 220ms grace period) để xác nhận submenu vẫn còn hiển thị vững vàng
    await page.waitForTimeout(300);
    await expect(stickerItem).toBeVisible();

    // Bấm vào mục In Sticker trong submenu
    await stickerItem.click();
    await page.waitForTimeout(500);

    // Xác nhận đã điều hướng sang màn hình In Sticker trên laptop header
    const headerTitle = page.locator('[data-app-chrome="header"] h1');
    await expect(headerTitle).toBeVisible();
    await expect(headerTitle).toContainText('In');
    await expect(headerTitle).toContainText('Sticker');
});

test('laptop: hover vào User Profile avatar và rê chuột sang flyout card không bị mất', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2000);

    // Tìm nút Profile ở dưới cùng dock
    const profileBtn = page.locator('aside button[title="Cài đặt & Phân quyền"], aside button[aria-label="Cài đặt & Phân quyền"]');
    await expect(profileBtn).toBeVisible();

    // Hover vào profile
    await profileBtn.hover();
    await page.waitForTimeout(100);

    // Nút "Phân quyền" trong flyout card
    const phanQuyenBtn = page.locator('aside button:has-text("Phân quyền")');
    await expect(phanQuyenBtn).toBeVisible();

    // Di chuyển chuột sang nút "Phân quyền"
    const box = await phanQuyenBtn.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    }

    await page.waitForTimeout(300);
    await expect(phanQuyenBtn).toBeVisible();
});

test('laptop: bấm vào nút Công cụ chỉ mở menu phụ, không chuyển sang trang trống', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2000);

    // Xác nhận đang ở trang Phân tích
    const headerTitle = page.locator('[data-app-chrome="header"] h1');
    await expect(headerTitle).toBeVisible();
    await expect(headerTitle).toContainText('Phân');

    // Tìm nút Công cụ
    const toolsBtn = page.locator('aside button[title="Công cụ"], aside button[aria-label="Công cụ"]');
    await expect(toolsBtn).toBeVisible();

    // Bấm trực tiếp vào nút Công cụ
    await toolsBtn.click();
    await page.waitForTimeout(300);

    // Menu phụ PHẢI hiển thị
    const stickerItem = page.locator('button:has-text("In Sticker")');
    await expect(stickerItem).toBeVisible();

    // KHÔNG ĐƯỢC xuất hiện thông báo trang rỗng / "Tính năng đang được phát triển"
    const emptyNotice = page.locator('text=Tính năng đang được phát triển');
    await expect(emptyNotice).toHaveCount(0);

    // Tiêu đề trang vẫn phải giữ nguyên là Phân tích (không bị biến mất hay chuyển trang trắng)
    await expect(headerTitle).toContainText('Phân');

    // Bấm ra ngoài màn hình -> menu phụ đóng lại
    await page.mouse.click(500, 300);
    await page.waitForTimeout(400);

    // Khi đã click ra ngoài, menu phụ đóng lại
    await expect(stickerItem).toHaveCount(0);
});

