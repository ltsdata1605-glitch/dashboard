import { expect, test, type Page } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * GĐ4 — Khung ứng dụng (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.2–3.5, 2026-10-12). Kiểm HÀNH VI + số đo thật của khung app mới:
 *  - Thanh trên iPhone (`MobileNavBar`): tiêu đề 17px viết như câu, vật liệu mờ, chuông 44×44; nút Phân tích khai báo qua
 *    `usePageActions` → [Tải YCX lên] [Bộ lọc] [⋯] — không còn 5 nút 32px đè chuông, không tràn ngang ở iPhone SE.
 *  - Thanh tab dưới: vật liệu mờ, mục đang chọn `aria-current="page"`; bảng "Khác" là sheet dùng chung + danh sách nhóm.
 *  - Chuông trên iPhone mở sheet "Thông báo" (Esc / nền để đóng).
 *  - Laptop: logo bật/tắt dock điều hướng và NHỚ trạng thái; Phân tích giữ cụm nút laptop của chủ dự án (không vẽ trùng).
 *  - Thư viện motion KHÔNG còn nằm trên đường mở app.
 * Chạy trên dev server: URL module là đường dẫn nguồn → đếm được thư viện nào đã tải.
 */

async function vaoDungThu(page: Page, tab = 'analysis') {
    await page.goto(`/?tab=${tab}`);
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
}

async function napDuLieuMau(page: Page) {
    await vaoDungThu(page);
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.getByText('Tệp Realtime (Xem nhanh)').last().click();
    await expect(page.getByText(/chi tiết theo kho/i).first()).toBeVisible({ timeout: 90_000 });
}

test.describe('iPhone SE 375×667 (cảm ứng)', () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

    test('thanh trên Phân tích: tiêu đề 17px, [Tải YCX] [Bộ lọc] [⋯] [chuông] đều 44px, không tràn ngang', async ({ page }) => {
        await napDuLieuMau(page);
        const bar = page.locator('[data-app-chrome="topbar"]');
        const h1 = bar.getByRole('heading', { level: 1 });
        await expect(h1).toHaveText('Phân tích');
        await expect(h1).toHaveCSS('font-size', '17px');
        expect(await bar.evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).getPropertyValue('-webkit-backdrop-filter'))).toContain('blur');

        const nut = ['Tải YCX lên', 'Bộ lọc nâng cao', 'Thêm thao tác', 'Thông báo'];
        for (const ten of nut) {
            const b = bar.getByRole('button', { name: ten, exact: true });
            await expect(b, ten).toBeVisible();
            const hop = (await b.boundingBox())!;
            expect(Math.round(hop.width), ten).toBeGreaterThanOrEqual(44);
            expect(Math.round(hop.height), ten).toBeGreaterThanOrEqual(44);
            expect(hop.x + hop.width, `${ten} lọt khỏi màn`).toBeLessThanOrEqual(375);
        }
        // Khe portal cũ trống — Phân tích không còn nhét nút vào thanh trên.
        expect(await page.locator('#mobile-topbar-actions').evaluate(e => e.children.length)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

        // ⋯ → action sheet: BCNB, Quản lý tệp, nhóm cuối Xoá (đỏ)
        await bar.getByRole('button', { name: 'Thêm thao tác' }).click();
        const sheet = page.locator('[data-action-sheet]');
        await expect(sheet).toBeVisible();
        await expect(sheet.getByRole('menuitem', { name: /Mở báo cáo BCNB/ })).toBeVisible();
        await expect(sheet.getByRole('menuitem', { name: /Quản lý tệp đã lưu/ })).toBeVisible();
        await expect(sheet.getByRole('menu').last().getByRole('menuitem')).toHaveText(/Xoá|Xóa/);
        await sheet.getByRole('button', { name: 'Huỷ' }).click();
        await expect(sheet).toHaveCount(0);

        // Bộ lọc nâng cao mở bảng "Tuỳ chỉnh" của Phân tích (làm lại ở GĐ5: nhóm "Khoảng thời gian")
        await bar.getByRole('button', { name: 'Bộ lọc nâng cao' }).click();
        await expect(page.getByRole('heading', { name: 'Tuỳ chỉnh' })).toBeVisible();
        await expect(page.getByText('Khoảng thời gian', { exact: true }).first()).toBeVisible();
        await page.screenshot({ path: test.info().outputPath('iphone-se-phan-tich.png') });
    });

    test('tab khác không hiện nút của Phân tích (khai báo gỡ khi tab ẩn)', async ({ page }) => {
        await napDuLieuMau(page);
        await page.locator('nav[data-app-chrome="tabbar"]').getByRole('button', { name: 'Check thưởng' }).click();
        const bar = page.locator('[data-app-chrome="topbar"]');
        await expect(bar.getByRole('heading', { level: 1 })).toHaveText('Check thưởng');
        await expect(bar.getByRole('button', { name: 'Tải YCX lên' })).toHaveCount(0);
        await expect(page.locator('[data-page-actions="mobile"]')).toHaveCount(0);
    });
});

test.describe('iPhone 16 Pro Max 440×956 (cảm ứng)', () => {
    test.use({ viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true });

    test('thanh tab: vật liệu mờ, mục đang chọn aria-current; "Khác" là sheet danh sách nhóm, chọn mục thì chuyển tab + đóng', async ({ page }) => {
        await vaoDungThu(page);
        const nav = page.locator('nav[data-app-chrome="tabbar"]');
        await expect(nav.getByRole('button', { name: /^Phân tích/ })).toHaveAttribute('aria-current', 'page');
        expect(await nav.evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).getPropertyValue('-webkit-backdrop-filter'))).toContain('blur');
        for (const b of await nav.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);

        await nav.getByRole('button', { name: 'Khác', exact: true }).click();
        const sheet = page.getByRole('dialog', { name: 'Thêm' });
        await expect(sheet).toBeVisible();
        await expect(sheet.getByRole('heading', { name: 'Công cụ' })).toBeVisible();
        await expect(sheet.getByRole('heading', { name: 'Hệ thống' })).toBeVisible();
        await expect(sheet.locator('button[title*="Phân Quyền"]')).toBeVisible();
        await expect(sheet.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
        const hang = sheet.getByRole('button', { name: /Phân ca/ });
        expect((await hang.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
        await page.screenshot({ path: test.info().outputPath('iphone-khac.png') });

        await hang.click();
        await expect(sheet).toBeHidden();
        await expect(page.locator('[data-app-chrome="topbar"]').getByRole('heading', { level: 1 })).toHaveText('Phân ca');
        // Phân ca là mini-app toàn màn: có nút ‹ về Dashboard, ẩn thanh tab dưới
        await expect(page.getByRole('button', { name: 'Về Dashboard' })).toBeVisible();
        await expect(nav).toHaveCount(0);
        await page.getByRole('button', { name: 'Về Dashboard' }).click();
        await expect(page.locator('[data-app-chrome="topbar"]').getByRole('heading', { level: 1 })).toHaveText('Phân tích');
    });

    test('chuông trên iPhone mở sheet "Thông báo", Esc đóng', async ({ page }) => {
        await vaoDungThu(page);
        await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Thông báo' }).click();
        const sheet = page.getByRole('dialog', { name: 'Thông báo' });
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveAttribute('data-sheet', '');
        await expect(sheet.getByText(/Không có thông báo mới|thông báo/i).first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden();
    });

    test('Report BI: 3 phân hệ ở cụm nút thanh trên, mỗi nút ≥ 44; nút "Cập nhật…" ở dòng phụ có vùng chạm ≥ 44 (::after)', async ({ page }) => {
        await vaoDungThu(page, 'employees');
        const bar = page.locator('[data-app-chrome="topbar"]');
        // Chủ dự án d7720ef (2026-10-14, "đưa 3 chức năng lên thanh trên như hình 2"): 3 phân hệ chuyển từ segmented trong nội dung
        // (GĐ6) lên CapsuleBar ở khe #mobile-topbar-actions — mỗi nút icon con nhộng có aria-label và ycx-hit.
        const cum = bar.getByRole('group', { name: 'Phân hệ Report BI' });
        await expect(cum).toBeVisible({ timeout: 30_000 });
        for (const ten of ['Siêu thị', 'Nhân viên', 'Cập nhật']) {
            const btn = cum.getByRole('button', { name: ten, exact: true });
            await expect(btn).toBeVisible();
            const hop = await btn.boundingBox();
            expect(hop, `thiếu nút "${ten}" trên thanh trên`).not.toBeNull();
            expect(Math.min(hop!.width, hop!.height), `nút "${ten}" kích thước < 30`).toBeGreaterThanOrEqual(30);
        }
        await cum.getByRole('button', { name: 'Nhân viên', exact: true }).click();
        await expect(cum.getByRole('button', { name: 'Nhân viên', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await cum.getByRole('button', { name: 'Siêu thị', exact: true }).click();
        await expect(bar.getByRole('button', { name: 'Thêm thao tác' })).toBeVisible();
        // Dòng phụ "↻ Cập nhật dữ liệu" — chỉ tìm trong khe dòng phụ (cụm nút cũng có nút tên "Cập nhật").
        const capNhat = page.locator('#mobile-topbar-subtitle').getByRole('button', { name: /^Cập nhật/ });
        await expect(capNhat).toBeVisible({ timeout: 30_000 });
        const vung = await capNhat.evaluate(el => {
            const r = el.getBoundingClientRect(); const a = getComputedStyle(el, '::after');
            const px = (v: string) => parseFloat(v) || 0;
            return { w: r.width - px(a.left) - px(a.right), h: r.height - px(a.top) - px(a.bottom), hien: r.height, content: a.content };
        });
        expect(vung.content).not.toBe('none');
        expect(vung.h).toBeGreaterThanOrEqual(43.5);
        expect(vung.hien).toBeLessThan(44); // cỡ nhìn thấy: một dòng chữ phụ 12px
    });
});

test.describe('laptop 1366×800', () => {
    test.use({ viewport: { width: 1366, height: 800 } });

    test('logo bật/tắt dock điều hướng và nhớ trạng thái qua lần mở lại', async ({ page }) => {
        await vaoDungThu(page);
        const dock = page.locator('[data-testid="desktop-nav-menu"]');
        await expect(dock).toBeVisible();
        const logo = page.getByRole('button', { name: /Trang chủ/ });
        await logo.click();
        await expect(dock).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem('ycx_desktop_menu_open'))).toBe('false');
        await page.reload();
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 }).catch(() => undefined);
        await expect(page.getByRole('button', { name: /Trang chủ/ })).toBeVisible();
        await expect(dock).toHaveCount(0);
        await page.getByRole('button', { name: /Trang chủ/ }).click();
        await expect(dock).toBeVisible();
        await page.screenshot({ path: test.info().outputPath('laptop-dock.png'), clip: { x: 0, y: 0, width: 1366, height: 420 } });
    });

    test('Phân tích trên laptop: không vẽ thêm thanh nút của khung (giữ cụm nút nhóm của Header)', async ({ page }) => {
        await napDuLieuMau(page);
        await expect(page.locator('#global-header-actions button[title*="Bộ lọc nâng cao"]')).toBeVisible();
        await expect(page.locator('[data-page-actions="desktop"]')).toHaveCount(0);
    });

    test('mở app không tải thư viện motion', async ({ page }) => {
        const tai: string[] = [];
        page.on('request', r => { if (/node_modules\/\.vite\/deps\/motion|framer-motion/.test(r.url())) tai.push(r.url()); });
        await napDuLieuMau(page);
        await page.waitForTimeout(3000); // qua lượt tải trước khi rảnh
        expect(tai, 'motion vẫn bị tải lúc mở app').toEqual([]);
    });
});
