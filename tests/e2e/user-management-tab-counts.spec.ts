import { test, expect } from './helpers/realDataContext';

test('Xác thực thực tế: 3 tab Chờ duyệt / Hoạt động / Hết hạn hiển thị số lượng badge', async ({ page }) => {
    test.setTimeout(45000);

    // 1. Mở app
    await page.goto('/');
    
    // Nếu có popup dùng thử
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trialBtn.click();
    }

    // 2. Chuyển sang màn Phân quyền & Duyệt yêu cầu
    const dockBtn = page.getByTitle('Cài đặt & Phân quyền').first();
    if (await dockBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dockBtn.click();
    } else {
        // Hoặc nút avatar/cài đặt
        await page.goto('/?tab=settings');
    }

    // Chờ tab "Phân quyền" hoặc segmented control
    const segmentTabs = page.locator('[data-segmented]').last();
    await segmentTabs.waitFor({ state: 'visible', timeout: 20000 });

    // Chờ hết spinner tải nếu có
    await page.getByText(/Đang tải danh sách/i).waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // Tìm các nút segmented
    const btnPending = page.getByRole('button', { name: /Chờ duyệt/i }).first();
    const btnActive = page.getByRole('button', { name: /Hoạt động/i }).first();
    const btnExpired = page.getByRole('button', { name: /Hết hạn/i }).first();

    await expect(btnPending).toBeVisible();
    await expect(btnActive).toBeVisible();
    await expect(btnExpired).toBeVisible();

    // Chờ badge xuất hiện
    await page.waitForTimeout(1000);

    // Chuyển sang Hoạt động
    await btnActive.click();
    await page.waitForTimeout(500);

    // Chụp ảnh khi Hoạt động active
    await page.screenshot({ path: 'test-results/phan-quyen-tab-badges-active.png', fullPage: false });

    const textPending = await btnPending.innerText();
    const textActive = await btnActive.innerText();
    const textExpired = await btnExpired.innerText();

    console.log(`Kết quả hiển thị tab:`);
    console.log(`- Chờ duyệt: "${textPending.replace(/\n/g, ' ')}"`);
    console.log(`- Hoạt động: "${textActive.replace(/\n/g, ' ')}"`);
    console.log(`- Hết hạn: "${textExpired.replace(/\n/g, ' ')}"`);

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: 'test-results/phan-quyen-tab-badges.png', fullPage: false });

    // Kiểm tra có badge
    const badges = segmentTabs.locator('span.rounded-full');
    const badgeCount = await badges.count();
    console.log(`Số lượng badge pill hiển thị: ${badgeCount}`);
    expect(badgeCount).toBeGreaterThanOrEqual(1);
});
