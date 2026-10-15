import { test, expect } from '@playwright/test';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';

/**
 * Check thưởng trên iPhone: thanh công cụ (Tra cứu / Top thưởng, Kho 1 / Kho 2, đổi file, đồng bộ cloud) nằm GỌN trên thanh trên,
 * không thêm hàng riêng — chủ dự án chốt "1 thanh bar duy nhất" (a4168bd, 2026-10-11).
 * GĐ7 (2026-10-13): chuyển sang bản React (bản cũ chờ iframe `check-thuong.html` đã bỏ nên đỏ sẵn) và thêm: dưới 540px chữ tiêu đề
 * nhường chỗ cho thanh công cụ (trước bị cắt còn chữ "C").
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Check thưởng mobile topbar: các nút nhỏ gọn nằm trên thanh Bar, không còn hàng riêng', async ({ page }) => {
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(['910 - ĐML Hùng Vương', '911 - ĐML Tân Hiệp']));

    const topbarActions = page.locator('#mobile-topbar-actions');
    const kho1Input = topbarActions.locator('input[placeholder="Kho 1"]');
    const kho2Input = topbarActions.locator('input[placeholder="Kho 2"]');
    await expect(kho1Input).toBeVisible();
    await expect(kho2Input).toBeVisible();
    // 1. Không có hàng công cụ riêng: ô mã kho chỉ có MỘT bộ, nằm trên thanh trên
    await expect(page.locator('input[placeholder="Kho 1"]:visible')).toHaveCount(1);

    // 2. Đủ nút trên thanh
    const topbar = page.locator('[data-app-chrome="topbar"]');
    await expect(topbarActions.getByRole('button', { name: /tra cứu/i })).toBeVisible();
    await expect(topbarActions.getByRole('button', { name: /top/i })).toBeVisible();
    await expect(topbar.getByTitle(/tải file khác/i)).toBeVisible();
    await expect(topbar.getByTitle(/Đồng bộ dữ liệu từ Đám Mây/i)).toBeVisible();
    await page.evaluate(() => document.querySelectorAll('[data-toast], [data-sonner-toast], [role="status"], [class*="toast"]').forEach(e => e.remove()));
    await topbar.screenshot({ path: test.info().outputPath('check-thuong-single-store.png') });
    await kho2Input.fill('911');
    await expect(topbarActions.getByTitle(/xoá mã kho/i)).toBeVisible();

    // 3. Đồng bộ kích thước: ô nhập cao 32px (capsule 34px đồng bộ cụm thao tác), chữ đọc được (≥ 13px) và rộng đủ (≥ 40px trên 390px)
    const boxKho1 = (await kho1Input.boundingBox())!;
    const boxKho2 = (await kho2Input.boundingBox())!;
    expect(boxKho1.height).toBeGreaterThanOrEqual(28);
    expect(boxKho1.height).toBeLessThanOrEqual(34);
    expect(parseFloat(await kho1Input.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(13);
    expect(boxKho1.width).toBeGreaterThanOrEqual(40);
    expect(boxKho2.width).toBeGreaterThanOrEqual(40);

    // 4. Tiêu đề "Check thưởng" và thời gian cập nhật hiển thị như tab "Phân tích"
    const boxBell = (await topbar.getByRole('button', { name: /Thông báo/ }).boundingBox())!;
    const navTitle = topbar.locator('[data-navbar-title]');
    const boxTitle = (await navTitle.boundingBox())!;
    const boxActions = (await topbar.locator('[data-navbar-actions]').boundingBox())!;
    console.log('MEASURE: boxTitle =', boxTitle, 'boxActions =', boxActions, 'boxBell =', boxBell);
    expect(boxBell.x + boxBell.width).toBeLessThanOrEqual(390);
    await expect(navTitle).toBeVisible();
    await expect(navTitle.getByRole('heading', { level: 1 })).toHaveText(/Check thưởng/i);
    const subtitleBtn = navTitle.locator('#mobile-topbar-subtitle button');
    await expect(subtitleBtn).toBeVisible();
    await expect(subtitleBtn).toHaveText(/(?:Cập nhật:\s*)?\d{2}:\d{2}:\d{2}/);

    // 5. Cụm con nhộng [Tải file khác] [Đồng bộ Cloud] [Chuông] chuẩn iOS/Zalo Capsule Bar
    const capsule = topbar.locator('[data-action-capsule]');
    await expect(capsule).toBeVisible();
    expect(await capsule.evaluate(el => getComputedStyle(el).borderRadius)).toBe('9999px');
    // Ô nhập Kho 2 không bị capsule đè lên: mép phải Kho 2 nằm trước mép trái capsule
    expect(boxKho2.x + boxKho2.width).toBeLessThanOrEqual((await capsule.boundingBox())!.x);

    for (const title of [/tải file khác/i, /Đồng bộ dữ liệu từ Đám Mây/i, /Thông báo/i]) {
        const btn = topbar.getByRole('button', { name: title }).first();
        await expect(btn).toBeVisible();
        const hop = (await btn.boundingBox())!;
        expect(Math.min(hop.width, hop.height)).toBeGreaterThanOrEqual(30);
        expect(Math.max(hop.width, hop.height)).toBeLessThanOrEqual(36);
        // Vùng chạm vô hình ::after trên màn cảm ứng chuẩn Apple HIG >= 43.5px
        const vung = await btn.evaluate(el => {
            const r = el.getBoundingClientRect(); const a = getComputedStyle(el, '::after');
            const px = (v: string) => parseFloat(v) || 0;
            return { w: r.width - px(a.left) - px(a.right), h: r.height - px(a.top) - px(a.bottom), content: a.content };
        });
        expect(vung.content).not.toBe('none');
        expect(vung.h).toBeGreaterThanOrEqual(43.5);
    }

    await page.evaluate(() => document.querySelectorAll('[data-toast], [data-sonner-toast], [role="status"]').forEach(e => e.remove()));
    await topbar.screenshot({ path: test.info().outputPath('check-thuong-mobile-topbar.png') });
});

test('Check thưởng màn hình Pro Max 430px: hiện trọn vẹn tiêu đề "Check thưởng" và "Cập nhật: HH:mm:ss"', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(['910 - ĐML Hùng Vương', '911 - ĐML Tân Hiệp']));

    const topbar = page.locator('[data-app-chrome="topbar"]');
    const navTitle = topbar.locator('[data-navbar-title]');
    console.log('430px: boxTitle =', await navTitle.boundingBox(), 'boxActions =', await topbar.locator('[data-navbar-actions]').boundingBox());
    await expect(navTitle).toBeVisible();
    await expect(navTitle.getByRole('heading', { level: 1 })).toHaveText('Check thưởng');

    const subtitleBtn = navTitle.locator('#mobile-topbar-subtitle button');
    await expect(subtitleBtn).toBeVisible();
    await expect(subtitleBtn).toHaveText(/Cập nhật:\s*\d{2}:\d{2}:\d{2}/);

    const kho1Input = topbar.locator('input[placeholder="Kho 1"]');
    const kho2Input = topbar.locator('input[placeholder="Kho 2"]');
    const capsule = topbar.locator('[data-action-capsule]');
    const boxKho1 = (await kho1Input.boundingBox())!;
    const boxKho2 = (await kho2Input.boundingBox())!;
    const boxCapsule = (await capsule.boundingBox())!;
    expect(boxKho1.width).toBeGreaterThanOrEqual(48);
    expect(boxKho2.width).toBeGreaterThanOrEqual(48);
    expect(boxKho2.x + boxKho2.width).toBeLessThanOrEqual(boxCapsule.x);

    await page.evaluate(() => document.querySelectorAll('[data-toast], [data-sonner-toast], [role="status"], [class*="toast"]').forEach(e => e.remove()));
    await topbar.screenshot({ path: test.info().outputPath('check-thuong-430px.png') });
});

test('Check thưởng màn hình 600px (tablet/máy gập): hiện đầy đủ tiêu đề, nhãn tab và "Cập nhật: HH:mm:ss"', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 960 });
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(['910 - ĐML Hùng Vương', '911 - ĐML Tân Hiệp']));

    const topbar = page.locator('[data-app-chrome="topbar"]');
    const navTitle = topbar.locator('[data-navbar-title]');
    await expect(navTitle).toBeVisible();
    await expect(navTitle.getByRole('heading', { level: 1 })).toHaveText('Check thưởng');

    const subtitleBtn = navTitle.locator('#mobile-topbar-subtitle button');
    await expect(subtitleBtn).toBeVisible();
    await expect(subtitleBtn).toHaveText(/Cập nhật:\s*\d{2}:\d{2}:\d{2}/);

    await page.evaluate(() => document.querySelectorAll('[data-toast], [data-sonner-toast], [role="status"], [class*="toast"]').forEach(e => e.remove()));
    await topbar.screenshot({ path: test.info().outputPath('check-thuong-600px.png') });
});
