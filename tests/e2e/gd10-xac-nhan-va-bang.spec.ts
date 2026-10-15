import { expect, test, type Page } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * GĐ10 bước 1 (2026-10-15) — 2 luật cứng của CLAUDE.md mục 2:
 *  1) KHÔNG hộp thoại của trình duyệt (window.confirm/alert/prompt) — mọi câu hỏi xác nhận qua ConfirmDialog dùng chung. Trước đây 6
 *     chỗ dùng `window.confirm` (ESLint chỉ bắt `confirm()` viết trần); Phân tích còn 2 nhánh xoá NGAY không hỏi.
 *  2) "Bảng luôn là bảng": Bot LINE "Coupon đã lọc" trên điện thoại là BẢNG (trước là danh sách thẻ md:hidden).
 * Mỗi test bắt sự kiện `dialog` của trình duyệt — có một cái là đỏ. Dữ liệu mẫu qua tests/e2e/helpers/gd10Harness.tsx + Chế độ Dùng thử.
 */
const batHopThoaiTrinhDuyet = (page: Page) => {
    const ds: string[] = [];
    page.on('dialog', (d) => { ds.push(`${d.type()}: ${d.message()}`); void d.dismiss(); });
    return ds;
};
const moHarness = async (page: Page, loai: 'coupon-loc' | 'ma-sp' | 'hoi-3') => {
    await page.goto('/');
    await page.evaluate(async (l) => (await import('/tests/e2e/helpers/gd10Harness.tsx' as string)).mount(l), loai);
};
const daBam = (page: Page) => page.evaluate(() => (window as unknown as { __bam?: string[] }).__bam ?? []);
/** Ngay sau khi bấm đóng, modal còn mờ dần ~200 ms (usePresence) — chữ trong hộp phải GIỮ NGUYÊN, không nháy sang câu hỏi khác hay
 *  "Mã SP  sẽ bị xoá" trống (lỗi của bản đầu: trạng thái hộp về null ngay khi đóng). */
const chuHopLucDong = (page: Page) => page.evaluate(() =>
    (Array.from(document.querySelectorAll('[role="dialog"]')).pop() as HTMLElement | undefined)?.innerText ?? '(đã đóng)');

test.describe('iPhone', () => {
    test.use({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });

    test('Coupon đã lọc: BẢNG (không phải thẻ), ghim cột Mã Coupon khi cuộn ngang, trang không tràn', async ({ page }) => {
        const hopThoai = batHopThoaiTrinhDuyet(page);
        await moHarness(page, 'coupon-loc');
        const khung = page.getByTestId('filtered-coupon-table');
        await expect(khung.locator('table')).toBeVisible({ timeout: 20_000 });
        await expect(khung.locator('tbody tr')).toHaveCount(9);
        const tran = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        expect(tran, 'trang không được tràn ngang').toBeLessThanOrEqual(0);
        await page.screenshot({ path: test.info().outputPath('coupon-loc-iphone-dau.png') });

        const k = (await khung.boundingBox())!;
        const ma = khung.locator('tbody tr').first().locator('td').nth(1);
        await khung.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
        await page.waitForTimeout(200);
        const sau = (await ma.boundingBox())!;
        expect(Math.abs(sau.x - k.x), 'cột Mã Coupon ghim mép trái khi cuộn ngang').toBeLessThan(2);
        await expect(ma.getByRole('button')).toBeVisible();
        await page.screenshot({ path: test.info().outputPath('coupon-loc-iphone-cuon.png') });
        expect(hopThoai).toEqual([]);
    });

    test('Coupon đã lọc: "Xoá toàn bộ" hỏi bằng ConfirmDialog — Huỷ không xoá, xác nhận mới xoá', async ({ page }) => {
        const hopThoai = batHopThoaiTrinhDuyet(page);
        await moHarness(page, 'coupon-loc');
        const dong = page.getByTestId('filtered-coupon-table').locator('tbody tr');
        await expect(dong).toHaveCount(9, { timeout: 20_000 });
        const nutXoa = page.getByTitle('Xóa toàn bộ lịch sử lọc');
        const hoi = page.getByRole('dialog', { name: 'Xoá toàn bộ lịch sử coupon đã lọc?' });

        await nutXoa.click();
        await expect(hoi).toBeVisible();
        await hoi.getByRole('button', { name: 'Hủy', exact: true }).click();
        await expect(hoi).toBeHidden();
        expect(await daBam(page)).toEqual([]);
        await expect(dong).toHaveCount(9);

        await nutXoa.click();
        await hoi.getByRole('button', { name: 'Xoá toàn bộ', exact: true }).click();
        await expect(hoi).toBeHidden();
        expect(await daBam(page)).toEqual(['xoa-het:uid-mau']);
        await expect(page.getByText('Chưa có coupon nào được lọc')).toBeVisible();
        expect(hopThoai).toEqual([]);
    });

    test('ConfirmDialog 3 lựa chọn: xếp dọc trong màn hình, vùng chạm 44, thứ tự nhẹ → nặng → Huỷ', async ({ page }) => {
        const hopThoai = batHopThoaiTrinhDuyet(page);
        await moHarness(page, 'hoi-3');
        const hoi = page.getByRole('dialog', { name: 'Xoá dữ liệu YCX' });
        await expect(hoi).toBeVisible({ timeout: 20_000 });
        const nut = ['Chỉ xoá dữ liệu Realtime', 'Xoá toàn bộ dữ liệu tích lũy', 'Hủy'].map((t) => hoi.getByRole('button', { name: t, exact: true }));
        const hop = await Promise.all(nut.map(async (n) => (await n.boundingBox())!));
        hop.forEach((h, i) => {
            expect(h.height, `nút ${i + 1} cao ≥ 44`).toBeGreaterThanOrEqual(43.5);
            expect(h.x + h.width, `nút ${i + 1} nằm trong màn hình`).toBeLessThanOrEqual(390);
            if (i > 0) {
                expect(h.y, `nút ${i + 1} nằm DƯỚI nút ${i}`).toBeGreaterThanOrEqual(hop[i - 1].y + hop[i - 1].height - 1);
                expect(Math.abs(h.x - hop[0].x), 'cùng cột').toBeLessThan(1);
            }
        });
        await page.screenshot({ path: test.info().outputPath('hoi-3-iphone.png') });
        await nut[0].click();
        await expect(hoi).toBeHidden();
        expect(await daBam(page)).toEqual(['chi-realtime']);
        expect(hopThoai).toEqual([]);
    });
});

test.describe('laptop', () => {
    test.use({ viewport: { width: 1366, height: 900 } });

    test('Coupon đã lọc: bảng đủ 7 cột như cũ, cột Mã Coupon không ghim', async ({ page }) => {
        await moHarness(page, 'coupon-loc');
        const khung = page.getByTestId('filtered-coupon-table');
        await expect(khung.locator('tbody tr')).toHaveCount(9, { timeout: 20_000 });
        await expect(khung.locator('thead th')).toHaveCount(7);
        expect(await khung.locator('tbody tr').first().locator('td').nth(1).evaluate((el) => getComputedStyle(el).position)).toBe('static');
        await page.screenshot({ path: test.info().outputPath('coupon-loc-laptop.png') });
    });

    test('Cấu hình mã SP: nút xoá hỏi bằng ConfirmDialog — Huỷ giữ nguyên, Xoá mới xoá', async ({ page }) => {
        const hopThoai = batHopThoaiTrinhDuyet(page);
        await moHarness(page, 'ma-sp');
        const dong = page.locator('tr', { hasText: '7654321' });
        await expect(dong).toBeVisible({ timeout: 20_000 });
        const hoi = page.getByRole('dialog', { name: 'Xoá mã sản phẩm?' });

        await dong.getByTitle('Xoá mã sản phẩm').click();
        await expect(hoi).toContainText('7654321');
        await hoi.getByRole('button', { name: 'Hủy', exact: true }).click();
        expect(await chuHopLucDong(page), 'lúc mờ dần vẫn đúng mã').toContain('7654321');
        await expect(hoi).toBeHidden();
        await expect(dong).toBeVisible();
        expect(await daBam(page)).toEqual([]);

        await dong.getByTitle('Xoá mã sản phẩm').click();
        await hoi.getByRole('button', { name: 'Xoá', exact: true }).click();
        await expect(dong).toHaveCount(0);
        expect(await daBam(page)).toEqual(['xoa-ma:7654321']);
        expect(hopThoai).toEqual([]);
    });

    test('Tính thuế: "Đặt lại" hỏi bằng ConfirmDialog — Huỷ giữ dữ liệu đang nhập, xác nhận mới xoá', async ({ page }) => {
        test.setTimeout(120_000);
        const hopThoai = batHopThoaiTrinhDuyet(page);
        await page.addInitScript(() => { try { localStorage.setItem('ycx_demo_mode', 'true'); } catch { /* */ } });
        await page.goto('/?tab=tools-tax');
        // Ô tên nằm trong mục "Kê khai thêm & Giảm trừ gia cảnh" (mặc định gập).
        await page.getByText('Kê khai thêm & Giảm trừ gia cảnh').first().click({ timeout: 60_000 });
        const ten = page.getByPlaceholder('VD: TRƯƠNG HOÀNG PHÚC').first();
        await expect(ten).toBeVisible();
        await ten.fill('NGUYỄN VĂN THỬ');
        const hoi = page.getByRole('dialog', { name: 'Đặt lại biểu mẫu?' });

        await page.getByTitle('Đặt lại dữ liệu').click();
        await expect(hoi).toBeVisible();
        await hoi.getByRole('button', { name: 'Hủy', exact: true }).click();
        expect(await chuHopLucDong(page), 'lúc mờ dần vẫn là câu hỏi Đặt lại').toContain('Đặt lại biểu mẫu?');
        await expect(hoi).toBeHidden();
        await expect(ten).toHaveValue('NGUYỄN VĂN THỬ');

        await page.getByTitle('Đặt lại dữ liệu').click();
        await hoi.getByRole('button', { name: 'Đặt lại', exact: true }).click();
        await expect(ten).toHaveValue('');
        expect(hopThoai).toEqual([]);
    });

    test('Phân tích: xoá dữ liệu YCX — cả 3 nhánh đều hỏi trước, Huỷ không xoá gì, "Chỉ Realtime" giữ tệp lũy kế', async ({ page }) => {
        test.setTimeout(240_000);
        const hopThoai = batHopThoaiTrinhDuyet(page);
        const napTep = async (tep: string, cheDo: 'Tệp Realtime (Xem nhanh)' | 'Lũy kế / Quá khứ') => {
            await page.locator('input[type="file"]').first().setInputFiles(tep);
            await page.locator('[data-modal-overlay]').getByText(cheDo).click();
            if (cheDo === 'Lũy kế / Quá khứ') {
                const o = page.getByPlaceholder('Nhập tên hiển thị...');
                await o.fill('Tháng thử');
                await o.press('Enter');
            }
        };
        const nut = (title: string) => page.locator(`button[title="${title}"]`);
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });

        // Cách app chạy (hooks/useFileUploadLogic.ts): nạp TỆP NÀO cũng dọn Realtime tạm cũ; nạp Realtime thì tắt các tệp lũy kế đang
        // bật. "Có cả hai" chỉ xảy ra khi người dùng BẬT LẠI tệp lũy kế trong "Quản lý tệp đã lưu" — test đi đúng đường đó.
        const homQua = new Date();
        homQua.setDate(homQua.getDate() - 1);
        const hoiTatCa = page.getByRole('dialog', { name: 'Xoá toàn bộ dữ liệu tích lũy?' });
        const hoiRealtime = page.getByRole('dialog', { name: 'Xoá dữ liệu YCX Realtime?' });
        const hoi3 = page.getByRole('dialog', { name: 'Xoá dữ liệu YCX' });
        const nutTatCa = nut('Xóa tất cả dữ liệu báo cáo tích lũy');
        const nutRealtime = nut('Xóa dữ liệu YCX Realtime');
        const nutCaHai = nut('Xóa dữ liệu YCX (Realtime hoặc Lũy kế)');

        // 1) CHỈ có tệp lũy kế — trước đây MỘT CHẠM là xoá hết (máy + cloud + tệp dùng chung của Kho), không hỏi. Huỷ: không xoá gì.
        await napTep(createSalesXlsx({ ngay: homQua }), 'Lũy kế / Quá khứ');
        await expect(nutTatCa).toBeVisible({ timeout: 60_000 });
        await nutTatCa.click();
        await expect(hoiTatCa).toBeVisible();
        await hoiTatCa.getByRole('button', { name: 'Hủy', exact: true }).click();
        await expect(hoiTatCa).toBeHidden();
        await expect(nutTatCa).toBeVisible();

        // 2) CHỈ có Realtime (nạp Realtime tắt tệp lũy kế) — trước đây cũng xoá NGAY không hỏi.
        await napTep(createSalesXlsx(), 'Tệp Realtime (Xem nhanh)');
        await expect(nutRealtime).toBeVisible({ timeout: 60_000 });
        await nutRealtime.click();
        await expect(hoiRealtime).toBeVisible();
        await hoiRealtime.getByRole('button', { name: 'Hủy', exact: true }).click();
        expect(await chuHopLucDong(page), 'lúc mờ dần vẫn là câu hỏi Realtime').toContain('Xoá dữ liệu YCX Realtime?');
        await expect(hoiRealtime).toBeHidden();
        await expect(nutRealtime).toBeVisible();

        // 3) Bật lại tệp lũy kế → có CẢ HAI → MỘT hộp 3 lựa chọn (trước: 2 hộp confirm nối nhau, "Huỷ" ở hộp đầu lại dẫn sang câu
        //    hỏi xoá toàn bộ).
        await nut('Quản lý tệp đã lưu (Lũy kế)').click();
        // Ô tick là `sr-only` + ô vẽ trong <label>, bật tắt BẤT ĐỒNG BỘ (ghi IndexedDB rồi mới đổi `checked`) → bấm nhãn rồi chờ.
        await page.locator('label:has(input[id^="check-file-"])').first().click();
        await expect(page.locator('input[id^="check-file-"]').first()).toBeChecked({ timeout: 30_000 });
        await page.keyboard.press('Escape');
        await expect(nutCaHai).toBeVisible({ timeout: 60_000 });
        await nutCaHai.click();
        await expect(hoi3).toBeVisible();
        expect((await hoi3.getByRole('button').allInnerTexts()).map((t) => t.trim()))
            .toEqual(['Chỉ xoá dữ liệu Realtime', 'Xoá toàn bộ dữ liệu tích lũy', 'Hủy']);
        await page.screenshot({ path: test.info().outputPath('phan-tich-hoi-3-lua-chon.png') });
        await hoi3.getByRole('button', { name: 'Hủy', exact: true }).click();
        await expect(hoi3).toBeHidden();
        await expect(nutCaHai).toBeVisible();

        await nutCaHai.click();
        await hoi3.getByRole('button', { name: 'Chỉ xoá dữ liệu Realtime', exact: true }).click();
        await expect(page.getByText('Đã xóa dữ liệu xem hiện tại!').first()).toBeVisible({ timeout: 30_000 });
        // Chỉ Realtime bị xoá — tệp lũy kế còn nguyên (nút đổi về "Xóa tất cả…").
        await expect(nutTatCa).toBeVisible({ timeout: 30_000 });

        // 4) Xoá toàn bộ — chỉ sau khi xác nhận.
        await nutTatCa.click();
        await hoiTatCa.getByRole('button', { name: 'Xoá toàn bộ dữ liệu tích lũy', exact: true }).click();
        await expect(page.getByText('Đã xóa toàn bộ dữ liệu phân tích!').first()).toBeVisible({ timeout: 30_000 });
        await expect(nutTatCa).toHaveCount(0);

        // 5) Realtime — xác nhận thì xoá.
        await napTep(createSalesXlsx(), 'Tệp Realtime (Xem nhanh)');
        await expect(nutRealtime).toBeVisible({ timeout: 60_000 });
        await nutRealtime.click();
        await hoiRealtime.getByRole('button', { name: 'Xoá', exact: true }).click();
        await expect(nutRealtime).toHaveCount(0, { timeout: 30_000 });
        expect(hopThoai).toEqual([]);
    });
});
