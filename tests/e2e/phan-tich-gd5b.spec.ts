import { expect, test, type Page } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * GĐ5 loạt B — Phân tích YCX (KE_HOACH_GIAO_DIEN_APPLE.md mục 1). Khoá các lỗi sếp thấy trong video:
 *  #5  sheet "Dãy thẻ KPI" chia 2 cột, tràn ngang ("Xóa the")      · #6  modal Mục tiêu GTĐH cắt mép trái, tiêu đề đỏ, nút hồng
 *  #13 tiêu đề khối IN HOA, dòng phụ 8px                             · #14/#23 Chi tiết đơn hàng: tên khách IN HOA 16px, 6 nút 4 kiểu
 *  #25 màn chào chữ tiếng Anh                                        · toast tự vẽ bằng DOM ở đáy màn (đè thanh tab iPhone)
 * Gốc chung của #5/#6/#21: khối tự bù đệm `-m-5` (20px) trong thân modal chỉ đệm 12px trên iPhone → nay `modal-bleed`.
 */

async function napDuLieu(page: Page, chuaXuat: string[] = []) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx({ chuaXuat }));
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.getByText(/chi tiết theo kho/i).first()).toBeVisible({ timeout: 90_000 });
}

/** Thân modal không cuộn ngang và khối `modal-bleed` (nếu có) khớp đúng mép khung modal — không lấn ra ngoài (bị cắt). */
async function doTranMep(page: Page, dialogName: string | RegExp) {
    const hop = page.getByRole('dialog', { name: dialogName });
    await expect(hop).toBeVisible();
    return hop.evaluate(el => {
        const than = Array.from(el.querySelectorAll<HTMLElement>('div')).find(d => getComputedStyle(d).overflowY === 'auto' && d.className.includes('overscroll-contain'))!;
        const k = el.getBoundingClientRect();
        const bleed = than.querySelector<HTMLElement>('.modal-bleed');
        const b = bleed?.getBoundingClientRect();
        return {
            cuonNgang: than.scrollWidth - than.clientWidth,
            lechTrai: b ? Math.round(b.left - k.left) : 0,
            lechPhai: b ? Math.round(k.right - b.right) : 0,
        };
    });
}

test.describe('iPhone SE 375×812 (cảm ứng)', () => {
    test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

    test('#25 màn chào: không còn chữ tiếng Anh, có dòng cam kết tiếng Việt', async ({ page }) => {
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
        await expect(page.getByText('Xử lý trên máy')).toBeVisible();
        await expect(page.getByText('Tức thì', { exact: true })).toBeVisible();
        for (const en of ['Local Processing', 'Instant Speed', 'Smart UI']) await expect(page.getByText(en)).toHaveCount(0);
        await expect(page.getByText(/không lưu trữ dữ liệu/)).toHaveCount(0);
    });

    test('#5 Dãy thẻ KPI: một cột, công tắc ẩn/hiện, chạm thẻ → màn chi tiết, ⋯ đổi thứ tự, Lưu trên đầu sheet', async ({ page }) => {
        await napDuLieu(page);
        await page.getByRole('button', { name: 'Tuỳ chỉnh dãy thẻ KPI' }).click();
        const sheet = page.getByRole('dialog', { name: 'Dãy thẻ KPI' });
        const tran = await doTranMep(page, 'Dãy thẻ KPI');
        expect(tran.cuonNgang).toBeLessThanOrEqual(0);
        await expect(sheet.getByRole('switch')).toHaveCount(5);
        await page.screenshot({ path: test.info().outputPath('kpi-danh-sach.png') });

        // ⋯ của thẻ đầu → Đưa xuống dưới: thẻ đầu đổi chỗ
        const hangDau = sheet.locator('.ycx-list-row').first();
        const tenDau = (await hangDau.locator('span.truncate').first().textContent())!.trim();
        await hangDau.getByRole('button', { name: /Thao tác thẻ/ }).click();
        await page.getByRole('menuitem', { name: 'Đưa xuống dưới' }).click();
        await expect(sheet.locator('.ycx-list-row').nth(1).locator('span.truncate').first()).toHaveText(tenDau);

        // Chạm thẻ DTQĐ → màn chi tiết, sửa tiêu đề, quay lại danh sách
        await sheet.getByRole('button', { name: /^DTQĐ/ }).click();
        await expect(sheet.getByRole('button', { name: 'Danh sách thẻ' })).toBeVisible();
        const o = sheet.getByRole('textbox').first();
        await expect(o).toHaveValue('DTQĐ');
        await o.fill('DTQĐ tháng');
        expect((await doTranMep(page, 'Dãy thẻ KPI')).cuonNgang).toBeLessThanOrEqual(0);
        await page.screenshot({ path: test.info().outputPath('kpi-chi-tiet.png') });
        await sheet.getByRole('button', { name: 'Danh sách thẻ' }).click();
        await expect(sheet.getByRole('button', { name: /^DTQĐ tháng/ })).toBeVisible();

        // Nút chính ở đầu sheet (kiểu iOS: [Huỷ] Tiêu đề [Hoàn tất] — chủ dự án chuyển sang TỰ LƯU mỗi thay đổi ở d2d24bc) → sheet
        // đóng, thẻ KPI đổi tên
        await sheet.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
        await expect(sheet).toBeHidden();
        // (thẻ KPI có 2 bản tiêu đề: iPhone và laptop — lấy bản đang hiện)
        await expect(page.locator('.kpi-overview-card').getByText('DTQĐ tháng').filter({ visible: true }).first()).toBeVisible();
    });

    test('#6 Mục tiêu GTĐH: không cắt mép, tiêu đề trung tính, nút Lưu màu chính (sky)', async ({ page }) => {
        await napDuLieu(page);
        await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Bộ lọc nâng cao' }).click();
        await page.getByRole('button', { name: /Mục tiêu GTĐH/ }).click();
        const tran = await doTranMep(page, /Mục tiêu GTĐH/);
        expect(tran.cuonNgang).toBeLessThanOrEqual(0);
        expect(Math.abs(tran.lechTrai)).toBeLessThanOrEqual(1);
        expect(Math.abs(tran.lechPhai)).toBeLessThanOrEqual(1);
        const hop = page.getByRole('dialog', { name: /Mục tiêu GTĐH/ });
        // Tailwind v4 trả màu dạng oklch → so với màu token của chính trang (đọc qua một phần tử dò).
        const mau = await page.evaluate(() => {
            const d = document.createElement('div');
            document.body.appendChild(d);
            const doc = (v: string, thuocTinh: 'color' | 'backgroundColor') => { d.style[thuocTinh] = `var(${v})`; return getComputedStyle(d)[thuocTinh]; };
            const kq = { sky600: doc('--color-sky-600', 'backgroundColor'), rose700: doc('--color-rose-700', 'color') };
            d.remove();
            return kq;
        });
        await expect(hop.getByRole('heading', { name: /Mục tiêu GTĐH/ }).first()).not.toHaveCSS('color', mau.rose700);
        await expect(hop.getByRole('button', { name: 'Lưu mục tiêu' })).toHaveCSS('background-color', mau.sky600);
        await page.screenshot({ path: test.info().outputPath('gtdh.png') });
    });

    test('#13 tiêu đề khối viết như câu, dòng phụ ≥ 12px; không chữ nào dưới 11px trong vùng Phân tích', async ({ page }) => {
        await napDuLieu(page);
        for (const ten of ['Tổng quan doanh thu', 'Chi tiết theo kho', 'Phân tích nhân viên', 'Tỷ trọng ngành hàng']) {
            const h = page.getByRole('heading', { name: new RegExp(ten, 'i') }).first();
            await h.scrollIntoViewIfNeeded();
            await expect(h, ten).toBeVisible();
        }
        const nho = await page.evaluate(() => {
            const out: string[] = [];
            const goc = document.querySelector('main') || document.body;
            const w = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
            for (let n = w.nextNode(); n; n = w.nextNode()) {
                const t = n.textContent?.trim();
                const el = n.parentElement;
                if (!t || !el) continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || el.closest('.hide-on-export, [aria-hidden="true"]')) continue;
                const cs = getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none') continue;
                if (parseFloat(cs.fontSize) < 11) out.push(`${parseFloat(cs.fontSize)}px "${t.slice(0, 30)}"`);
            }
            return out;
        });
        expect(nho, 'chữ dưới 11px').toEqual([]);
        await page.locator('.kpi-overview-card').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath('kpi-11px.png') });
    });

    test('#20 trạng thái trống dùng chung: Quản lý tệp đã lưu (chưa có tệp lịch sử) hiện EmptyState', async ({ page }) => {
        await napDuLieu(page);
        await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Thêm thao tác' }).click();
        await page.getByRole('menuitem', { name: /Quản lý tệp đã lưu/ }).click();
        const hop = page.getByRole('dialog').filter({ hasText: 'Chưa có dữ liệu lịch sử' });
        await expect(hop).toBeVisible();
        // EmptyState: tiêu đề 14px đậm vừa + mô tả xám — không còn chữ 11px tự vẽ
        const tieuDe = hop.getByRole('heading', { name: 'Chưa có dữ liệu lịch sử' });
        await expect(tieuDe).toBeVisible();
        expect(parseFloat(await tieuDe.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(13);
        expect((await doTranMep(page, 'Danh sách YCX luỹ kế')).cuonNgang).toBeLessThanOrEqual(0);
    });

    test('#14/#23 Chi tiết đơn hàng: 2 nút + ⋯, tên khách không IN HOA 16px; sao chép mã đơn dùng toast chung ở TRÊN', async ({ page }) => {
        await napDuLieu(page, ['SO002', 'SO003']);
        await page.getByRole('button', { name: /^Chờ xuất/ }).first().click();
        const hop = page.getByRole('dialog', { name: /DTQĐ chờ xuất/ });
        await expect(hop).toBeVisible();
        expect((await doTranMep(page, /DTQĐ chờ xuất/)).cuonNgang).toBeLessThanOrEqual(0);
        // Thanh công cụ: Thu gọn/Hiển thị + Xuất ảnh + ⋯ (không còn nút Excel/Sheet màu riêng)
        await expect(hop.getByRole('button', { name: /Thu gọn tất cả|Hiển thị tất cả/ })).toBeVisible();
        await expect(hop.getByRole('button', { name: 'Xuất ảnh toàn bộ danh sách' })).toBeVisible();
        await expect(hop.getByRole('button', { name: 'Excel' })).toHaveCount(0);
        await hop.getByRole('button', { name: 'Thêm thao tác' }).click();
        await expect(page.getByRole('menuitem', { name: 'Xuất lên Google Sheet' })).toBeVisible();
        await page.keyboard.press('Escape');

        // Tên khách: không ép IN HOA, cỡ ≤ 14px
        const ten = hop.getByText('Trương Như Quỳnh', { exact: false }).or(hop.getByText('TRƯƠNG NHƯ QUỲNH')).first();
        await expect(ten).toBeVisible();
        expect(parseFloat(await ten.evaluate(e => getComputedStyle(e).fontSize))).toBeLessThanOrEqual(14);

        // Mở khách → chạm mã đơn → toast chung (data-app-toast), nằm nửa TRÊN màn hình
        await ten.click();
        await hop.getByText('SO002', { exact: true }).first().click();
        const t = page.locator('[data-app-toast]').filter({ hasText: 'Đã sao chép: SO002' });
        await expect(t).toBeVisible();
        const hopT = (await t.boundingBox())!;
        expect(hopT.y).toBeLessThan(812 / 2);
        // Toast phải nằm TRÊN lớp nền của modal (không bị phủ mờ): điểm giữa toast trỏ vào chính toast.
        const trenCung = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-app-toast]'), { x: hopT.x + hopT.width / 2, y: hopT.y + hopT.height / 2 });
        expect(trenCung, 'toast bị lớp nền modal phủ lên').toBe(true);
        await page.screenshot({ path: test.info().outputPath('don-hang.png') });
    });
});
