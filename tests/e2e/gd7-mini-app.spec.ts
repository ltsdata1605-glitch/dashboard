import { expect, test, type Page } from '@playwright/test';

/**
 * GĐ7 — các mini-app còn lại (KE_HOACH_GIAO_DIEN_APPLE.md mục GĐ7). Khoá các sửa theo từng khu vực, chạy ở Chế độ Dùng Thử.
 *  In Sticker: dải chế độ KHÔNG còn nhét vào thanh trên iPhone (trước: thanh 470px trong khe 250px, phải vuốt ngang) → hàng thứ hai
 *              ngay dưới thanh trên, segmented 4 chế độ + hàng cỡ chữ nút −/+ 44px. Laptop giữ dải trên thanh tiêu đề.
 *  (Phân quyền #11 — "Xoá tất cả dữ liệu" xuống "Vùng nguy hiểm" cuối trang: tests/e2e/mobile-settings-compact.spec.ts)
 */

async function moDungThu(page: Page, url: string) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.goto(url);
}

test.describe('iPhone 16 Pro Max (cảm ứng)', () => {
    test.use({ viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true });

    test('In Sticker: chế độ là segmented ở hàng thứ hai, thanh trên không còn nút của In Sticker', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-print-sticker&sub=draw');
        const thanhCheDo = page.getByTestId('sticker-mode-bar');
        await expect(thanhCheDo).toBeVisible({ timeout: 20_000 });
        // Nằm DƯỚI thanh trên, không chồng lên
        const top = (await page.locator('[data-app-chrome="topbar"]').boundingBox())!;
        const bar = (await thanhCheDo.boundingBox())!;
        expect(bar.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
        // Thanh trên sạch: không còn dải chế độ / ô cỡ chữ cũ
        expect(await page.locator('#mobile-topbar-actions').evaluate(e => e.children.length)).toBe(0);

        const seg = thanhCheDo.locator('[data-segmented]');
        for (const ten of ['Giá sốc', 'Giờ vàng', 'Phiếu', 'Sticker']) {
            const hop = (await seg.getByRole('button', { name: ten, exact: true }).boundingBox())!;
            expect(hop.height, ten).toBeGreaterThanOrEqual(43.5);
            expect(hop.x + hop.width, `${ten} lọt màn`).toBeLessThanOrEqual(440);
        }
        await expect(seg.getByRole('button', { name: 'Phiếu', exact: true })).toHaveAttribute('aria-pressed', 'true');

        // Cỡ chữ: một lần chữ "Cỡ chữ" (trước: "Cỡ chữ Cỡ chữ Thông tin trái"), nút −/+ đủ 44px, bấm + là tăng
        await expect(thanhCheDo.getByText(/Cỡ chữ Cỡ chữ/)).toHaveCount(0);
        const tang = thanhCheDo.getByRole('button', { name: 'Tăng cỡ chữ' });
        expect((await tang.boundingBox())!.width).toBeGreaterThanOrEqual(43.5);
        const giaTri = thanhCheDo.locator('span.tabular-nums');
        const truoc = parseFloat((await giaTri.textContent()) || '0');
        await tang.click();
        await expect.poll(async () => parseFloat((await giaTri.textContent()) || '0')).toBeGreaterThan(truoc);

        // Đổi chế độ bằng segmented: đổi URL, sang Sticker thì ẩn hàng cỡ chữ
        await seg.getByRole('button', { name: 'Giờ vàng', exact: true }).click();
        await expect(page).toHaveURL(/sub=gio-vang/);
        await seg.getByRole('button', { name: 'Sticker', exact: true }).click();
        await expect(page).toHaveURL(/sub=event/);
        await expect(thanhCheDo.getByRole('button', { name: 'Tăng cỡ chữ' })).toHaveCount(0);
        await page.screenshot({ path: test.info().outputPath('in-sticker-iphone.png') });
    });

    test('In Sticker: nút In viết như câu, tab Dữ liệu một kiểu nút (không còn nút đặc đỏ/cam/xanh lá)', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-print-sticker&sub=gia-soc');
        const nutIn = page.getByRole('button', { name: /Bấm để in/ });
        await expect(nutIn).toBeVisible({ timeout: 20_000 });
        await expect(nutIn).toHaveCSS('text-transform', 'none');
        expect(await nutIn.textContent()).not.toMatch(/BẤM ĐỂ IN/);
        for (const ten of ['Máy lọc nước (mẫu in 99)', 'Điện tử/Lạnh (mẫu in 97)', 'Tải file mẫu', 'Nhập file mẫu']) {
            const el = page.getByText(ten, { exact: true }).first();
            await expect(el, ten).toBeVisible();
            // Nút phụ xám (slate-100) — không còn nền đặc màu
            const nen = await el.evaluate((e: HTMLElement) => { let n: HTMLElement | null = e; while (n && getComputedStyle(n).backgroundColor === 'rgba(0, 0, 0, 0)') n = n.parentElement; return n ? getComputedStyle(n).backgroundColor : ''; });
            const slate100 = await page.evaluate(() => { const d = document.createElement('div'); d.className = 'bg-slate-100'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
            expect(nen, ten).toBe(slate100);
        }
    });
});

test.describe('Laptop 1366', () => {
    test.use({ viewport: { width: 1366, height: 800 } });

    test('In Sticker: laptop giữ dải chế độ trên thanh tiêu đề, không có hàng thứ hai', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-print-sticker&sub=draw');
        await expect(page.locator('#global-header-actions').getByRole('button', { name: /Phiếu/ })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('sticker-mode-bar')).toHaveCount(0);
    });
});
