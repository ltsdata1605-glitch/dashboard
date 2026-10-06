import { test, expect, type Page } from '@playwright/test';

/**
 * CHUẨN HOÁ ICON — Giai đoạn 1: điều hướng (2026-10-02, chủ dự án duyệt thang size 16/18 và mốc lg).
 *
 * Trước khi sửa: thanh trái 22px, thanh dưới 22px nét 1.8/2.5, header 16px, In Sticker là `Sticker`
 * ở thanh trái nhưng `Printer` ở thanh dưới, Report BI dùng icon người. Test chặn quay lại:
 *   - cùng một tab = cùng một icon ở thanh trái, thanh dưới và ô icon trang trên thanh tiêu đề mobile;
 *   - size đúng token (`lg`: 20 laptop / 22 mobile; ô icon trang `md`: 18 mobile), nét luôn 2;
 *   - không còn icon dấu-hỏi dự phòng (tên icon gõ sai từng âm thầm ra HelpCircle).
 */
async function vaoDungThu(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
}

async function doIcon(page: Page, selector: string) {
    return page.$$eval(selector, (els) => els
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
        .map((el) => {
            const r = el.getBoundingClientRect();
            return { name: el.getAttribute('data-icon'), w: r.width, h: r.height, stroke: el.getAttribute('stroke-width') };
        }));
}

for (const width of [360, 390, 430]) {
    test(`điện thoại ${width}px: thanh dưới + ô icon trang đúng icon và size`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await vaoDungThu(page);

        const nav = await doIcon(page, 'nav.mobile-chrome svg.ycx-icon');
        expect(nav.map((i) => i.name)).toEqual(['navAnalysis', 'navReportBi', 'navRewardCheck', 'navTools']);
        for (const i of nav) {
            expect([i.w, i.h], i.name!).toEqual([22, 22]);
            expect(i.stroke, i.name!).toBe('2');
        }

        // Ô icon trang trên thanh tiêu đề mobile (App.tsx) dùng chung map với thanh dưới.
        const top = await doIcon(page, 'div.mobile-chrome.sticky svg.ycx-icon[data-icon^="nav"]');
        expect(top[0]).toMatchObject({ name: 'navAnalysis', w: 18, h: 18 });

        // Nút bấm của thanh dưới đủ vùng chạm 44px.
        const tapH = await page.$$eval('nav.mobile-chrome button', (b) => b.map((x) => x.getBoundingClientRect().height));
        for (const h of tapH) expect(h).toBeGreaterThanOrEqual(44);

        // Bảng "Khác": mọi icon công cụ cùng cỡ lg, cùng hình với Sidebar.
        await page.locator('nav.mobile-chrome button').last().click();
        await page.waitForTimeout(600);
        const sheet = await doIcon(page, 'div.fixed.bottom-0 svg.ycx-icon[data-icon^="nav"]');
        expect(sheet.length).toBeGreaterThanOrEqual(9);
        expect(sheet.find((i) => i.name === 'navStickerPrint')).toBeTruthy();
        for (const i of sheet) expect([i.w, i.h], i.name!).toEqual([22, 22]);
        if (width === 390) await page.screenshot({ path: `test-results/icon-nav-${width}.png` });
    });
}

test('laptop 1366px: thanh trái đúng icon, cỡ lg 20px; header 16px; không có icon dự phòng', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await vaoDungThu(page);

    const side = await doIcon(page, 'aside svg.ycx-icon[data-icon^="nav"]');
    expect(side.map((i) => i.name)).toEqual(expect.arrayContaining(['navAnalysis', 'navReportBi', 'navRewardCheck', 'navReports', 'navTools']));
    for (const i of side) {
        expect([i.w, i.h], i.name!).toEqual([20, 20]);
        expect(i.stroke).toBe('2');
    }

    // Thanh công cụ header (portal vào #global-header-actions): mọi icon cỡ md = 16px trên laptop.
    const header = await doIcon(page, '#global-header-actions svg.ycx-icon');
    expect(header.length).toBeGreaterThan(0);
    for (const i of header) expect([i.w, i.h], i.name!).toEqual([16, 16]);

    // Icon dấu hỏi dự phòng của components/common/Icon.tsx không được xuất hiện ở khung điều hướng.
    const fallback = await page.$$eval('aside svg.lucide-circle-help, #global-header-actions svg.lucide-circle-help', (e) => e.length);
    expect(fallback).toBe(0);
    await page.screenshot({ path: 'test-results/icon-nav-1366.png', clip: { x: 0, y: 0, width: 1366, height: 420 } });
});
