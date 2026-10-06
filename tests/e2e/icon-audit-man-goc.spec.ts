import { test, expect, type Page } from '@playwright/test';
import { auditIcons } from './helpers/iconAudit';

/**
 * CHUẨN HOÁ ICON — Giai đoạn 3: audit icon trên các màn khu vực gốc (Phân tích, Check thưởng, Báo cáo,
 * Phân quyền, Thuế, Coupon, So sánh giá, Giới thiệu) ở điện thoại và laptop.
 *
 * Đo trên trình duyệt thật, mỗi màn:
 *   - `legacy`: svg icon KHÔNG đi qua AppIcon (không có lớp .ycx-icon) — phải về 0;
 *   - `lech`: icon trong nút lệch tâm dọc > 1px so với nút;
 *   - `nutChuNhoHon`: icon nằm trong nút CÓ CHỮ nhưng nhỏ hơn token md (icon chính trên thanh công cụ phải md);
 *   - `vungCham`: nút chỉ có icon, nhỏ hơn 44px trên điện thoại.
 */
const TABS = ['analysis', 'check-thuong', 'reports', 'settings', 'tools-tax', 'tools-coupon', 'tools-price-compare', 'help'];

async function vaoDungThu(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
}


for (const [label, width] of [['điện thoại 390', 390], ['laptop 1366', 1366]] as const) {
    test(`audit icon các màn gốc — ${label}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width, height: 900 });
        await vaoDungThu(page);
        const ketQua: Record<string, Awaited<ReturnType<typeof auditIcons>>> = {};
        for (const tab of TABS) {
            await page.goto(`/?tab=${tab}`);
            await page.waitForTimeout(2500);
            ketQua[tab] = await auditIcons(page, width < 1024);
            await page.screenshot({ path: `test-results/icon-audit-${tab}-${width}.png` });
        }
        console.log(`AUDIT ${label}\n` + JSON.stringify(ketQua, null, 1));
        for (const [tab, r] of Object.entries(ketQua)) {
            expect(r.legacy, `${tab}: icon chưa qua AppIcon`).toEqual([]);
            expect(r.lech, `${tab}: icon lệch dọc trong nút`).toEqual([]);
            expect(r.nutChuNhoHon, `${tab}: icon trong nút có chữ nhỏ hơn md`).toEqual([]);
            expect(r.vungCham, `${tab}: nút chỉ có icon dưới 44px trên điện thoại`).toEqual([]);
        }
    });
}
