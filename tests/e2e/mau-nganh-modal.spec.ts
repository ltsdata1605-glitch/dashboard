import { test, expect } from '@playwright/test';

/**
 * Ô ngành ở 2 modal "chưa xuất" / "chưa thu" (2026-10-15): trước đây class màu dựng ĐỘNG (`border-${color}-500`…) → Tailwind
 * không sinh → 6 ngành (Tablet, Phụ kiện, Gia dụng, CE, Sim, Vieon) không có màu. Đo KIỂU TÍNH THẬT trên trình duyệt (không so
 * với "phần tử mẫu" — thiếu class thì mẫu cũng mất màu, so bằng nhau là xanh giả):
 *  - vạch trái KHÔNG phải currentColor (mặc định của border trong Tailwind v4) và không trong suốt;
 *  - ô icon có nền (không trong suốt), icon + con số KHÁC màu chữ thừa hưởng.
 */
const NGANH = ['Smartphone', 'Laptop', 'Tablet', 'Phụ kiện', 'Gia dụng', 'Wearable', 'CE', 'Bảo hiểm', 'Sim', 'Máy lọc nước', 'Vieon', 'Khác'];

for (const loai of ['chua-xuat', 'chua-thu'] as const) {
    test(`modal ${loai}: đủ 12 ngành, ngành nào cũng có màu (vạch trái, ô icon, con số)`, async ({ page }, info) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto('/');
        await page.evaluate(async (l) => {
            const m = await import('/tests/e2e/helpers/industryTileHarness.tsx' as string);
            m.mount(l);
        }, loai);
        await expect(page.locator('p[title="Khác"]')).toBeVisible({ timeout: 20_000 });

        const ketQua = await page.evaluate((nganh) => nganh.map((ten) => {
            const nhan = document.querySelector(`p[title="${ten}"]`);
            const o = nhan?.closest('div[class*="border-l-4"]') as HTMLElement | null;
            if (!o) return { ten, loi: 'không thấy ô' };
            const cs = getComputedStyle(o);
            const tron = o.querySelector(':scope > div.rounded-full') as HTMLElement;
            const so = o.querySelector('p.font-black') as HTMLElement;
            const trong = (c: string) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
            return {
                ten,
                vach: cs.borderLeftColor,
                vachLaMacDinh: cs.borderLeftColor === cs.color || trong(cs.borderLeftColor),
                nenIconTrong: trong(getComputedStyle(tron).backgroundColor),
                iconThuaHuong: getComputedStyle(tron).color === cs.color,
                soThuaHuong: getComputedStyle(so).color === getComputedStyle(so.parentElement!).color,
            };
        }), NGANH);

        for (const r of ketQua) {
            expect(r, `${r.ten}: ${JSON.stringify(r)}`).toMatchObject({ vachLaMacDinh: false, nenIconTrong: false, iconThuaHuong: false, soThuaHuong: false });
        }
        // Các họ màu khác nhau thật sự khác màu (vd Tablet sky ≠ Gia dụng amber ≠ CE emerald ≠ Wearable rose).
        const vach = Object.fromEntries(ketQua.map((r) => [r.ten, (r as { vach?: string }).vach]));
        expect(new Set([vach['Tablet'], vach['Gia dụng'], vach['CE'], vach['Wearable'], vach['Khác']]).size).toBe(5);

        await page.screenshot({ path: info.outputPath(`${loai}.png`), fullPage: true });
    });
}
