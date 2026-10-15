import { expect, test, type Page } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * GĐ5 — Phân tích YCX (KE_HOACH_GIAO_DIEN_APPLE.md mục 1, lỗi sếp thấy trong video). Mỗi test khoá đúng một lỗi đã sửa:
 *  #4  cột MÃ KHO ghim lộ chữ các cột cuộn qua ở mép trái  · #7  nút "+" đè nút chụp ảnh ở Lịch
 *  #8  chọn "Từ 17/10 → Đến 16/10" mà không một lời giải thích · #13 tiêu đề khối IN HOA, cụm nút rớt dòng
 *  #16 công tắc "Hiển thị các khu vực" mỗi cái một màu        · #19 số phụ KPI ngắt "806 / Tr"
 *  #28 4 ô lọc của Lịch nhỏ và chật
 */

async function napDuLieuMau(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.getByText('Tệp Realtime (Xem nhanh)').last().click();
    await expect(page.getByText(/chi tiết theo kho/i).first()).toBeVisible({ timeout: 90_000 });
}

test.describe('iPhone SE 375×812 (cảm ứng)', () => {
    test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

    test('#4 bảng Chi tiết theo kho: khung cuộn không đệm ngang, bảng không viền trái, ô ghim tự vẽ đường kẻ', async ({ page }) => {
        // Bảng NGANG — đúng cảnh trong video. (Từ d70baad chủ dự án cho iPhone mặc định bảng DỌC: vừa màn, không cuộn.)
        await page.addInitScript(() => { try { localStorage.setItem('warehouseViewMode', 'horizontal'); } catch { /* bỏ qua */ } });
        await napDuLieuMau(page);
        const khung = page.locator('section.overflow-x-auto').first();
        await khung.evaluate(el => { el.scrollLeft = 160; });
        const do_ = await khung.evaluate(el => {
            const cs = getComputedStyle(el);
            const bang = el.querySelector('table')!;
            const ghim = Array.from(el.querySelectorAll<HTMLElement>('table tr > :first-child')).filter(c => getComputedStyle(c).position === 'sticky');
            return {
                dem: [cs.paddingLeft, cs.paddingRight],
                vienTraiBang: getComputedStyle(bang).borderLeftWidth,
                soOGhim: ghim.length,
                oGhimCoDuongKe: ghim.every(c => getComputedStyle(c).boxShadow.includes('inset')),
                trai: ghim.map(c => Math.round(c.getBoundingClientRect().left - el.getBoundingClientRect().left)),
            };
        });
        expect(do_.dem).toEqual(['0px', '0px']);
        expect(do_.vienTraiBang).toBe('0px');
        expect(do_.soOGhim).toBeGreaterThan(1);
        expect(do_.oGhimCoDuongKe).toBe(true);
        for (const x of do_.trai) expect(x).toBe(0); // dính sát mép khung cuộn, không chừa dải lộ chữ
    });

    test('#8 Từ ngày > Đến ngày: tự dời đầu kia + báo bằng toast; ô ngày có min/max', async ({ page }) => {
        await napDuLieuMau(page);
        await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Bộ lọc nâng cao' }).click();
        await expect(page.getByRole('heading', { name: 'Tuỳ chỉnh' })).toBeVisible();
        const tu = page.locator('#loc-tu-ngay');
        const den = page.locator('#loc-den-ngay');
        await den.fill('2026-10-16');
        await expect(tu).toHaveAttribute('max', '2026-10-16');
        await tu.fill('2026-10-17');
        await expect(page.getByText(/"Đến ngày" được dời theo thành 17\/10\/2026/)).toBeVisible();
        await expect(den).toHaveValue('2026-10-17');
        await expect(den).toHaveAttribute('min', '2026-10-17');
        // ô ngày 16px trên điện thoại — Safari không tự phóng to khi chạm
        await expect(tu).toHaveCSS('font-size', '16px');
    });

    test('#16 "Hiển thị các khu vực": 4 công tắc dùng chung (một kiểu), tắt Xu hướng thì khối biến mất', async ({ page }) => {
        await napDuLieuMau(page);
        await expect(page.getByRole('heading', { name: /Xu hướng doanh thu/i })).toBeVisible();
        await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Bộ lọc nâng cao' }).click();
        const congTac = page.getByRole('switch');
        await expect(congTac).toHaveCount(4);
        const lop = await congTac.evaluateAll(els => els.map(e => e.className.includes('ycx-switch')));
        expect(lop.every(Boolean)).toBe(true);
        const xuHuong = page.getByRole('switch', { name: 'Xu hướng doanh thu' });
        await expect(xuHuong).toHaveAttribute('aria-checked', 'true');
        await xuHuong.click();
        await expect(xuHuong).toHaveAttribute('aria-checked', 'false');
        await page.getByRole('button', { name: 'Đóng' }).first().click();
        await expect(page.getByRole('heading', { name: /Xu hướng doanh thu/i })).toHaveCount(0);
    });

    test('#13 + #7 + #28 Xu hướng & Lịch: tiêu đề in hoa theo nhóm; bộ lọc Lịch 2 cột ô 44px; "+" không đè nút ảnh', async ({ page }) => {
        await napDuLieuMau(page);
        const tieuDe = page.getByRole('heading', { name: /Xu hướng doanh thu/i });
        await expect(tieuDe).toHaveCSS('text-transform', 'uppercase');
        await expect(tieuDe).toHaveCSS('font-size', '17px');
        await page.getByTitle('Chuyển sang dạng Bảng Lịch').first().click();
        const lich = page.locator('.calendar-export-target').first();
        await expect(lich).toBeVisible({ timeout: 15_000 });
        // Bộ lọc: Tháng, Chỉ số (select) + Ngành, Nhóm (dropdown) — mỗi ô ≥ 44px
        for (const o of [page.getByLabel('Tháng', { exact: true }), page.getByLabel('Chỉ số', { exact: true })]) {
            expect((await o.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
        }
        // Cụm nút bảng nháp: không chồng nhau, nằm trong khung lịch
        const cong = page.getByRole('button', { name: 'Lưu bảng nháp thành bảng mới' });
        const anh = page.getByRole('button', { name: 'Xuất ảnh bảng nháp' });
        const [a, b, k] = [(await cong.boundingBox())!, (await anh.boundingBox())!, (await lich.boundingBox())!];
        expect(a.x + a.width).toBeLessThanOrEqual(b.x);
        expect(b.x + b.width).toBeLessThanOrEqual(k.x + k.width + 0.5);
        // Nút 32px nhưng vùng chạm 44 (::after)
        const vung = await cong.evaluate(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el, '::after'); return r.height - (parseFloat(s.top) || 0) - (parseFloat(s.bottom) || 0); });
        expect(vung).toBeGreaterThanOrEqual(43.5);
    });

    test('#19 số phụ thẻ KPI không ngắt giữa số và đơn vị', async ({ page }) => {
        await napDuLieuMau(page);
        const ws = await page.locator('.kpi-overview-card').first().evaluate(el => {
            const o = el.querySelector('[data-kpi-phu]');
            return o ? Array.from(o.querySelectorAll('span')).map(s => getComputedStyle(s).whiteSpace) : [];
        });
        expect(ws.length, 'không thấy số phụ của thẻ KPI').toBeGreaterThan(0);
        for (const w of ws) expect(w).toBe('nowrap');
    });
});

test.describe('laptop 1366×800', () => {
    test.use({ viewport: { width: 1366, height: 800 } });

    test('#4 trên laptop: bảng bỏ viền trái nhưng ô cột đầu vẫn tự vẽ đường kẻ trái + bóng mờ (không mất khung)', async ({ page }) => {
        await napDuLieuMau(page);
        const khung = page.locator('section.overflow-x-auto').first();
        const do_ = await khung.evaluate(el => {
            const bang = el.querySelector('table')!;
            const dau = el.querySelector<HTMLElement>('table tbody tr > td:first-child')!;
            return { vienTraiBang: getComputedStyle(bang).borderLeftWidth, bong: getComputedStyle(dau).boxShadow };
        });
        expect(do_.vienTraiBang).toBe('0px');
        expect(do_.bong).toContain('inset');
    });
});
