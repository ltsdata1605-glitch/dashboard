import { expect, test, type Page } from '@playwright/test';

/**
 * GĐ7 — các mini-app còn lại (KE_HOACH_GIAO_DIEN_APPLE.md mục GĐ7). Khoá các sửa theo từng khu vực, chạy ở Chế độ Dùng Thử.
 *  In Sticker: dải chế độ KHÔNG còn nhét vào thanh trên iPhone (trước: thanh 470px trong khe 250px, phải vuốt ngang) → hàng thứ hai
 *              ngay dưới thanh trên, segmented 4 chế độ + hàng cỡ chữ nút −/+ 44px. Laptop giữ dải trên thanh tiêu đề.
 *  Phân ca:   dải 9 nút cuộn ngang dính đầu nội dung (iPhone) → thanh trên của khung app: nút "+" Nhập nhân viên + menu "⋯" chia
 *              nhóm, "Xoá danh sách" đỏ ở cuối; chưa có nhân viên thì có dải hướng dẫn + nút. Laptop 1366: dock nổi không che form.
 *  Bot LINE:  thẻ đầu trang chỉ còn tên + trạng thái (iPhone: Hướng dẫn lên thanh trên, đăng nhập thành Banner); 8 phân hệ và
 *              bộ lọc trạng thái là segmented chung; "Xoá tất cả mã" vào menu "⋯" chữ đỏ cuối (trước: thùng rác sát nút Xuất Excel).
 *  Loạt 3:    Giới thiệu bỏ lời hứa sai ("Bảo mật tuyệt đối… không đẩy lên máy chủ"); Tính thuế: nút lên thanh trên iPhone; Rút gọn
 *              coupon: khung Kết quả trên iPhone không xẹp thành vạch; Check thưởng: icon tải lên không nhảy liên tục; tiêu đề trang.
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

    test('Phân ca: không còn dải nút cuộn ngang; "+" và "⋯" trên thanh trên; dải hướng dẫn khi chưa có nhân viên', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-phanca');
        const thanhTren = page.locator('[data-app-chrome="topbar"]');
        const nhap = thanhTren.getByRole('button', { name: 'Nhập nhân viên' });
        await expect(nhap).toBeVisible({ timeout: 20_000 });
        expect((await nhap.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
        // Dải cũ (Ca Xoay / Từng NV… trong nội dung) đã bỏ
        await expect(page.locator('main').getByRole('button', { name: /Ca Xoay|Từng NV/ })).toHaveCount(0);

        await thanhTren.getByRole('button', { name: 'Thêm thao tác' }).click();
        const menu = page.getByRole('menu');
        await expect(menu.getByRole('menuitem', { name: 'Ca xoay' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Ảnh lịch tất cả' })).toBeDisabled(); // chưa có nhân viên
        const muc = await menu.getByRole('menuitem').allTextContents();
        expect(muc[muc.length - 1]).toMatch(/Xoá danh sách nhân viên/);
        await page.keyboard.press('Escape');

        const huongDan = page.getByTestId('phanca-chua-co-nv');
        await expect(huongDan).toBeVisible();
        // "Nhập nhân viên" mở hộp chọn file Excel (như nút "+ Nhập NV" cũ)
        const [hop] = await Promise.all([page.waitForEvent('filechooser'), huongDan.getByRole('button', { name: 'Nhập nhân viên' }).click()]);
        expect(hop).toBeTruthy();
        await page.screenshot({ path: test.info().outputPath('phan-ca-iphone.png') });
    });

    test('Bot LINE: thanh trên có Hướng dẫn, đăng nhập là Banner, segmented 44px, "Xoá tất cả mã" đỏ cuối menu', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-line-bot');
        const thanhTren = page.locator('[data-app-chrome="topbar"]');
        const huongDan = thanhTren.getByRole('button', { name: 'Hướng dẫn tạo Bot' });
        await expect(huongDan).toBeVisible({ timeout: 20_000 });
        expect((await huongDan.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
        await expect(page.getByTestId('line-bot-dang-nhap')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Đăng nhập để thừa kế Bot' })).toBeHidden();

        const phanHe = page.locator('[data-segmented]').first();
        for (const ten of ['Coupon Event', 'Coupon lọc', 'Gửi Notify']) {
            expect((await phanHe.getByRole('button', { name: ten }).boundingBox())!.height, ten).toBeGreaterThanOrEqual(43.5);
        }
        await expect(page.getByRole('button', { name: /^Tất cả/ }).first()).toHaveAttribute('aria-pressed', 'true');

        await page.getByTestId('coupon-thao-tac-khac').click();
        const muc = await page.getByRole('menu').getByRole('menuitem').allTextContents();
        expect(muc[muc.length - 1]).toMatch(/Xoá tất cả mã \(0\)/);
        await expect(page.getByRole('menu').getByRole('menuitem', { name: /Xoá tất cả mã/ })).toBeDisabled();
        await page.keyboard.press('Escape');
        await page.screenshot({ path: test.info().outputPath('bot-line-iphone.png') });
    });

    test('Giới thiệu: không còn lời hứa sai; mỗi phân hệ là hàng bấm được để mở', async ({ page }) => {
        await moDungThu(page, '/?tab=help');
        await expect(page.getByRole('heading', { name: 'Dashboard YCX' })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText(/tuyệt đối/i)).toHaveCount(0);
        await expect(page.getByText(/không đẩy lên máy chủ/)).toHaveCount(0);
        await expect(page.getByText('Kết quả đồng bộ theo tài khoản')).toBeVisible();
        await page.getByRole('button', { name: /^Phân ca/ }).click();
        await expect(page).toHaveURL(/tab=tools-phanca/);
    });

    test('Tính thuế: Lịch sử / Biểu thuế / API Key lên thanh trên; nút kéo-thả dấu trang không hiện trên iPhone', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-tax');
        const thanhTren = page.locator('[data-app-chrome="topbar"]');
        await expect(thanhTren.getByRole('button', { name: /Lịch sử tính thuế|Ẩn lịch sử/ })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole('link', { name: /Nút Chụp ảnh/ })).toBeHidden();
        await thanhTren.getByRole('button', { name: 'Thêm thao tác' }).click();
        await page.getByRole('menuitem', { name: 'Biểu thuế' }).click();
        await expect(page.getByRole('dialog', { name: 'Biểu thuế thu nhập cá nhân' })).toBeVisible();
    });

    test('Rút gọn coupon: khung Kết quả đủ cao trên iPhone; "Dán" có chữ, 2 lệnh xoá trong "⋯" (xoá toàn bộ đỏ cuối)', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-coupon');
        const ketQua = page.locator('pre').first();
        await expect(ketQua).toBeAttached({ timeout: 20_000 });
        const cao = await ketQua.evaluate((el: HTMLElement) => el.parentElement!.parentElement!.getBoundingClientRect().height);
        expect(cao, 'khung kết quả xẹp').toBeGreaterThanOrEqual(200);
        await expect(page.getByRole('button', { name: 'Dán' })).toBeVisible();
        await page.getByTestId('coupon-xoa-menu').click();
        const muc = await page.getByRole('menu').getByRole('menuitem').allTextContents();
        expect(muc).toEqual(['Xoá nội dung, giữ tiêu đề', 'Xoá toàn bộ']);
    });

    test('Check thưởng: màn chưa có dữ liệu không còn icon nhảy liên tục; tiêu đề trang không còn "Bảo mật tuyệt đối"', async ({ page }) => {
        await moDungThu(page, '/?tab=check-thuong');
        await expect(page.getByRole('heading', { name: 'Tải file thưởng thi đua' })).toBeVisible({ timeout: 20_000 });
        expect(await page.locator('.animate-bounce').count()).toBe(0);
        expect(await page.title()).toBe('Dashboard YCX');
    });
});

test.describe('Laptop 1366', () => {
    test.use({ viewport: { width: 1366, height: 800 } });

    test('In Sticker: laptop giữ dải chế độ trên thanh tiêu đề, không có hàng thứ hai', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-print-sticker&sub=draw');
        await expect(page.locator('#global-header-actions').getByRole('button', { name: /Phiếu/ })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('sticker-mode-bar')).toHaveCount(0);
    });

    test('Phân ca: dock nổi trái/phải không che ô "Tháng / năm" và nút "Tạo lịch"', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-phanca');
        await expect(page.getByTestId('desktop-nav-menu')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('ycx-auto-dock')).toBeVisible({ timeout: 20_000 });
        for (const loc of [page.locator('#cfgMonth'), page.getByRole('button', { name: 'Tạo lịch' })]) {
            await expect(loc).toBeVisible({ timeout: 20_000 });
            // So hình học (form đang mờ + pointer-events:none khi chưa có NV nên không dùng elementFromPoint được)
            const trung = await loc.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect();
                const docks = ['[data-testid="desktop-nav-menu"]', '[data-testid="ycx-auto-dock"]']
                    .map(q => document.querySelector(q)?.getBoundingClientRect()).filter((d): d is DOMRect => !!d && d.width > 0);
                if (docks.length < 2) return 'thiếu dock';
                return docks.every(d => r.right <= d.left || r.left >= d.right || r.bottom <= d.top || r.top >= d.bottom);
            });
            expect(trung, 'bị dock che').toBe(true);
        }
    });

    test('Bot LINE: bộ lọc trạng thái hiện đủ 4 mục (không cắt "Thu hồi")', async ({ page }) => {
        await moDungThu(page, '/?tab=tools-line-bot');
        const thuHoi = page.getByRole('button', { name: /^Thu hồi/ }).first();
        await expect(thuHoi).toBeVisible({ timeout: 20_000 });
        const [nut, khung] = await thuHoi.evaluate((el: HTMLElement) => {
            const seg = el.closest('[data-segmented]')!;
            return [el.getBoundingClientRect().right, seg.getBoundingClientRect().right];
        });
        expect(nut).toBeLessThanOrEqual(khung + 0.5);
    });
});
