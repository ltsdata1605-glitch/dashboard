import { expect, test, type Page } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * GĐ2 tăng tốc (KE_HOACH_GIAO_DIEN_APPLE.md mục 4.3, 2026-10-11) — khoá HÀNH VI của các thay đổi về tải, để lần sau không ai
 * vô tình kéo ngược thư viện nặng vào đường khởi động mà không biết:
 *  1. Lịch doanh thu: `lunar-javascript` chỉ tải khi mở chế độ Lịch, lịch vẫn có ngày âm.
 *  2. Phông Google: lúc mở app chỉ có Roboto Condensed (hết thẻ CSS chặn hiển thị 7 họ); mở menu phông mới nạp phần còn lại.
 *  3. Dock Auto Sync (laptop) vẫn xuất hiện dù đã tách gói + gắn sau lần rảnh đầu.
 *  4. Tải trước tab chính khi rảnh: trang Check thưởng được prefetch.
 *  5. BusyBar: chỉ hiện khi bận > 300 ms, không chặn thao tác.
 * Chạy trên dev server: URL module là đường dẫn nguồn (/node_modules/.vite/deps/lunar-javascript.js…), nên đếm được
 * chính xác thư viện nào đã được tải.
 */

test.use({ viewport: { width: 1366, height: 900 } });

async function napDuLieuMau(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.getByText('Tệp Realtime (Xem nhanh)').last().click();
    await expect(page.getByText(/chi tiết theo kho/i).first()).toBeVisible({ timeout: 90_000 });
}

test('Lịch doanh thu: thư viện âm lịch chỉ tải khi mở Lịch, lịch vẫn có ngày âm', async ({ page }) => {
    const daTai: string[] = [];
    page.on('request', r => { if (/lunar-javascript/.test(r.url())) daTai.push(r.url()); });
    await napDuLieuMau(page);
    await page.waitForTimeout(2000); // biểu đồ xu hướng đã vẽ xong
    expect(daTai, 'thư viện âm lịch bị tải dù chưa mở chế độ Lịch').toEqual([]);

    await page.getByTitle('Dạng Bảng Lịch').first().click();
    const lich = page.locator('.calendar-export-target').first();
    await expect(lich).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => daTai.length, { timeout: 15_000 }).toBeGreaterThan(0);
    // Ô ngày có ngày âm dạng "d/m" (vd 15/8) — đủ cho cả tháng.
    await expect.poll(() => lich.evaluate(el =>
        Array.from(el.querySelectorAll('span')).filter(s => /^\d{1,2}\/\d{1,2}$/.test((s.textContent || '').trim())).length,
    ), { timeout: 15_000 }).toBeGreaterThanOrEqual(28);
});

test('Phông Google: lúc mở chỉ nạp Roboto Condensed (không chặn), mở menu phông mới nạp các họ khác', async ({ page }) => {
    await napDuLieuMau(page);
    const linkPhong = () => page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]')).map(l => l.href));
    const luocDau = await linkPhong();
    expect(luocDau.some(h => h.includes('Roboto+Condensed')), `thiếu Roboto Condensed: ${luocDau.join(' | ')}`).toBe(true);
    for (const ho of ['Oswald', 'Jost', 'Josefin+Sans', 'Fjalla+One', 'Inter:', 'Plus+Jakarta+Sans']) {
        expect(luocDau.some(h => h.includes(ho)), `${ho} bị nạp ngay lúc mở app`).toBe(false);
    }
    // index.html không còn thẻ CSS phông nào (thẻ trong <head> lúc tải trang là thẻ chặn hiển thị).
    const html = await (await page.request.get('/')).text();
    expect(html).not.toMatch(/<link[^>]+fonts\.googleapis\.com\/css2/);

    await page.getByTitle(/Font hiện tại/).first().click();
    await expect.poll(async () => (await linkPhong()).some(h => h.includes('Oswald') && h.includes('Jost'))).toBe(true);
});

test('Dock Auto Sync trên laptop vẫn xuất hiện (gói riêng, gắn sau lần rảnh đầu)', async ({ page }) => {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await expect(page.getByTestId('ycx-auto-dock')).toBeVisible({ timeout: 15_000 });
});

test('Rảnh thì tải trước trang Check thưởng (chuyển tab nhanh)', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', r => urls.push(r.url()));
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await expect.poll(() => urls.some(u => u.endsWith('/check-thuong.html')), { timeout: 20_000 }).toBe(true);
});

test('BusyBar: bận ngắn không hiện, bận lâu hiện vạch mảnh và vẫn bấm được nút bên dưới', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/busyBarHarness.tsx' as string)).mountHarness());
    const vach = page.locator('[data-busy-bar]');

    // Bận < 300 ms → không nháy gì.
    await page.locator('#bat-ban').click();
    await page.waitForTimeout(120);
    await page.locator('#het-ban').click();
    await page.waitForTimeout(500);
    await expect(vach).toHaveCount(0);

    // Bận lâu → vạch hiện, cao 2px ở mép trên, có tên cho trình đọc màn hình, KHÔNG chặn bấm.
    await page.locator('#bat-ban').click();
    await expect(vach).toBeVisible({ timeout: 2000 });
    const hop = await vach.boundingBox();
    expect(hop!.y).toBe(0);
    expect(hop!.height).toBeLessThanOrEqual(3);
    await expect(vach).toHaveAttribute('aria-label', 'Đang tính lại theo bộ lọc');
    await page.locator('#nut-van-bam-duoc').click();
    await expect(page.locator('#so-lan-bam')).toHaveText('1');
    await page.locator('#het-ban').click();
    await expect(vach).toHaveCount(0, { timeout: 2000 });
});
