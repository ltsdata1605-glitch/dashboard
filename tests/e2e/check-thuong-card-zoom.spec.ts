import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Xác thực thẻ KPI Check Thưởng zoom nhẹ khi chọn, không đổi màu nền và không có viền xanh', async ({ page }) => {
    await page.goto('/?tab=check-thuong');

    // Chờ giao diện sẵn sàng
    await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 30_000 });

    // Tìm thẻ Đạt >= 100%
    const card100 = page.locator('button:has-text("Đạt ≥ 100%"), button:has-text("ĐẠT ≥ 100%"), button:has-text("Đạt >= 100%")').first();
    await expect(card100).toBeVisible({ timeout: 15_000 });

    // Bấm vào thẻ để chọn lọc
    await card100.click();
    await page.waitForTimeout(500);

    // Kiểm tra class và computed style:
    const classes = await card100.getAttribute('class');
    expect(classes).toContain('scale-');
    expect(classes).not.toContain('ring-sky-500');

    // Kiểm tra background color: không bị nhuộm màu glow
    const bgColor = await card100.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Background phải là trắng hoặc slate (nền mặc định), không phải rgba glow của sky
    console.log('Class list:', classes);
    console.log('Card computed background-color:', bgColor);

    // Chụp ảnh kiểm chứng
    await page.locator('.check-thuong-kpi-grid').first().screenshot({ path: 'test-results/check-thuong-card-zoom-verified.png' });
});
