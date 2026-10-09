import { expect, test } from '@playwright/test';

/**
 * Modal tự dựng (`fixed inset-0`) chuyển dần sang <Modal> dùng chung (GĐ4 — rawOverlay). Mỗi modal đã chuyển phải:
 * có tên, khoá cuộn, bẫy Tab, Escape đóng + trả focus, nằm gọn trong màn hình ở laptop và iPhone.
 */
const CASES = [
    { nut: '#mo-chon-tuong-tac', ten: /Chọn Admin Từ Tương Tác LINE/, anh: 'chon-tuong-tac' },
    { nut: '#mo-chon-loc', ten: /Chọn Người Dùng Bot Để Lọc PMH/, anh: 'chon-loc' },
    { nut: '#mo-tu-khoa', ten: /Thêm Từ Khoá Tự Động/, anh: 'tu-khoa' },
    { nut: '#mo-lich-hen', ten: /Tạo Lịch Hẹn Thông Báo/, anh: 'lich-hen' },
    { nut: '#mo-bieu-thue2', ten: /Biểu Thuế Thu Nhập Cá Nhân/, anh: 'bieu-thue' },
    { nut: '#mo-api-key', ten: /Cài Đặt Gemini API Key/, anh: 'api-key' },
    { nut: '#mo-lich-su-thue', ten: /Lịch Sử Tính Thuế/, anh: 'lich-su-thue' },
    { nut: '#mo-kpi-nganh', ten: /Quản lý & Thêm Thẻ KPI Ngành Hàng/, anh: 'kpi-nganh' },
    { nut: '#mo-avatar', ten: /Ảnh Đại Diện Nhân Viên/, anh: 'avatar' },
    { nut: '#mo-nap-ma2', ten: /Nạp Mã PMH & Quản Lý Lần Nạp/, anh: 'nap-ma' },
    { nut: '#mo-huong-dan', ten: /Hướng dẫn tự tạo & Cấu hình BOT LINE/, anh: 'huong-dan' },
];

for (const vp of [{ ten: 'laptop', width: 1366, height: 768 }, { ten: 'iphone', width: 390, height: 844 }]) {
    for (const c of CASES) {
        test(`${c.anh} (${vp.ten}): hành vi chuẩn + nằm gọn trong màn hình`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/');
            await page.evaluate(async () => (await import('/tests/e2e/helpers/modalDaChuyenHarness.tsx' as string)).mountHarness());
            await page.locator(c.nut).click();
            const hop = page.getByRole('dialog', { name: c.ten });
            await expect(hop).toBeVisible();
            expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

            const box = await hop.boundingBox();
            expect(box!.x).toBeGreaterThanOrEqual(-1);
            expect(box!.y).toBeGreaterThanOrEqual(-1);
            expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
            expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
            await page.screenshot({ path: `test-results/modal-chuyen-${c.anh}-${vp.ten}.png` });

            for (let i = 0; i < 12; i++) {
                await page.keyboard.press('Tab');
                expect(await hop.evaluate(el => el.contains(document.activeElement)), `Tab lần ${i + 1} lạc ra ngoài`).toBe(true);
            }
            await page.keyboard.press('Escape');
            await expect(hop).toHaveCount(0);
            expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
            expect(await page.evaluate(() => document.activeElement?.id)).toBe(c.nut.slice(1));
        });
    }
}

test('modal trong dòng bảng có onClick (ảnh đại diện): click trong khung / ra nền KHÔNG kích hoạt dòng bảng cha', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/modalDaChuyenHarness.tsx' as string)).mountHarness());
    await page.locator('#mo-avatar').click();
    const hop = page.getByRole('dialog', { name: /Ảnh Đại Diện Nhân Viên/ });
    await expect(hop).toBeVisible();
    await hop.getByText('Nguyễn Văn Test').first().click();      // click trong khung
    expect(await page.locator('#hang-bang').getAttribute('data-clicks')).toBe('0');
    await page.mouse.click(5, 5);                                 // click ra nền → đóng modal
    await expect(hop).toHaveCount(0);
    expect(await page.locator('#hang-bang').getAttribute('data-clicks')).toBe('0');
});

test('nạp mã: hộp xác nhận xoá đợt nạp lồng trong modal chính — Escape đóng hộp xác nhận trước, rồi mới đến modal chính', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/modalDaChuyenHarness.tsx' as string)).mountHarness());
    await page.locator('#mo-nap-ma2').click();
    const chinh = page.getByRole('dialog', { name: /Nạp Mã PMH & Quản Lý Lần Nạp/ });
    await expect(chinh).toBeVisible();
    await chinh.getByText(/Lịch Sử Các Lần Nạp/).click();
    await chinh.getByRole('button', { name: /Xoá đợt này/ }).first().click();
    const xacNhan = page.getByRole('dialog', { name: /Xác nhận xoá đợt nạp/ });
    await expect(xacNhan).toBeVisible();
    await page.screenshot({ path: 'test-results/modal-chuyen-nap-ma-xac-nhan.png' });
    await page.keyboard.press('Escape');
    await expect(xacNhan).toHaveCount(0);
    await expect(chinh).toBeVisible();                       // modal chính còn mở
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(chinh).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});
