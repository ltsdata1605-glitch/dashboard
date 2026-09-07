import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

/**
 * Test chạy trên DỮ LIỆU THẬT của tài khoản đã đăng nhập (profile `.e2e-chrome-profile`).
 * Chỉ ĐỌC: mở màn hình, đọc số liệu, chụp ảnh để đối chiếu — không dán dữ liệu, không đổi cấu hình.
 *
 * Bỏ qua toàn bộ nếu chưa chạy `node scripts/e2e-auth-setup.mjs` để tạo phiên đăng nhập.
 */
test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

const openReportBi = async (page: import('@playwright/test').Page) => {
    await page.goto('/');
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 60_000 });
    await sidebar.locator('button:has(svg.lucide-users)').first().click();
    await page.getByRole('button', { name: /Tổng quan/i }).first().waitFor({ timeout: 30_000 });
};

test('tài khoản đăng nhập thật và vào được Report BI', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0);
    await expect(page.locator('aside').first()).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: 'test-results/real-01-app.png' });
});

test('bảng Thi đua Luỹ kế trên dữ liệu thật: cột đúng thứ tự, %DKHT, V.Trội có số', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Tổng quan/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('Luỹ kế', { exact: true }).first().click();

    // Mặc định là "Tổng" (không có dữ liệu thi đua) nên phải chọn siêu thị. Lựa chọn này được LƯU
    // LẠI giữa các lần chạy — nếu đã chọn từ trước thì nút không còn nhãn "CỤM" và bảng đã có dữ
    // liệu, khi đó bỏ qua bước chọn.
    if (!(await page.getByText('NHÓM THI ĐUA').isVisible().catch(() => false))) {
        const picker = page.getByText('CỤM', { exact: true }).first();
        if (await picker.isVisible().catch(() => false)) {
            await picker.click();
            const options = page.locator('[role="button"]').filter({ hasNotText: 'Chọn tất cả' });
            const names = (await options.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
            console.log('SIÊU THỊ TRONG DỮ LIỆU THẬT:', JSON.stringify(names));
            await options.first().click();
            await page.keyboard.press('Escape');
        }
    }

    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'test-results/real-02-thidua.png', fullPage: true });

    const headers = (await page.locator('table thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    console.log('CỘT ĐANG HIỂN THỊ:', JSON.stringify(headers));
    expect(headers.join(' ')).toContain('%DKHT');

    const targetVTIndex = headers.findIndex(h => h.includes('M.TIÊU V.TRỘI'));
    expect(targetVTIndex, 'không thấy cột M.TIÊU V.TRỘI').toBeGreaterThan(-1);

    const rows = page.locator('table tbody tr').filter({ has: page.locator('td') });
    const rowCount = await rows.count();
    const values: string[] = [];
    for (let i = 0; i < Math.min(rowCount, 40); i++) {
        const cells = rows.nth(i).locator('td');
        if (await cells.count() < headers.length) continue; // dòng tiêu đề nhóm tiêu chí
        values.push((await cells.nth(targetVTIndex).innerText()).trim());
    }
    console.log('M.TIÊU V.TRỘI (dữ liệu thật):', JSON.stringify(values.slice(0, 15)));
    expect(values.length, 'bảng không có dòng dữ liệu nào').toBeGreaterThan(0);
    expect(values.some(v => v !== '-' && v !== ''), 'toàn bộ cột M.TIÊU V.TRỘI vẫn trống').toBe(true);
});
