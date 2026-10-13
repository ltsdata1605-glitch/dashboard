import { expect, test, type Page } from '@playwright/test';
import { SUMMARY_REALTIME, SUMMARY_LUYKE, COMPETITION_LUYKE } from './helpers/seed';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';

/**
 * Report BI và Check thưởng chạy trên khung iPhone CẢM ỨNG (UA iOS, isMobile, hasTouch) với dữ liệu
 * mẫu (2026-09-27). Máy test chỉ có Chromium nên mô phỏng quy tắc Safari: `navigator.share` chỉ được
 * trong 1 giây sau lượt chạm ở cùng khung. Kiểm: không tràn ngang, không chữ < 11px, thanh công cụ
 * không đè logo / nút ≥ 44px, xuất ảnh → nút "Chia sẻ / Lưu ảnh" → mở được bảng chia sẻ.
 * (Phân tích với dữ liệu cần tải cấu hình từ Google Sheet — xem phan-tich-mat-mang-cau-hinh.spec.ts.)
 */
test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

/** Mô phỏng Safari: share chỉ được trong 1s sau lượt chạm ở CÙNG khung. */
const giaLapSafari = async (page: Page) => {
    await page.addInitScript(() => {
        const w = window as unknown as { __share: string[]; __tai: number; __tap: number };
        w.__share = []; w.__tai = 0; w.__tap = -1e9;
        addEventListener('pointerdown', () => { w.__tap = performance.now(); }, true);
        addEventListener('touchstart', () => { w.__tap = performance.now(); }, true);
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async (d: ShareData) => {
                if (performance.now() - w.__tap > 1000) throw new DOMException('not allowed', 'NotAllowedError');
                w.__share.push(...(d.files || []).map(f => f.name));
            },
        });
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { if (this.download) { w.__tai++; return; } return click.call(this); };
    });
};

/** Chỉ bắt lỗi JS thật; bỏ lỗi mạng (máy test không ra được Firebase/CDN). */
const theoDoiLoiJs = (page: Page) => {
    const loi: string[] = [];
    page.on('pageerror', e => loi.push(e.message));
    return loi;
};

const DO = () => {
    const el = document.documentElement;
    const chuNho = Array.from(document.querySelectorAll('*')).filter(e => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && e.children.length === 0 && !!e.textContent?.trim() && parseFloat(getComputedStyle(e).fontSize) < 11;
    }).map(e => (e.textContent || '').trim().slice(0, 20));
    return { tranNgang: el.scrollWidth - el.clientWidth, chuNho };
};

const soLanShare = (page: Page) => page.evaluate(() => (window as unknown as { __share: string[] }).__share.length);

async function batDemo(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().tap({ timeout: 30_000 });
    await page.waitForTimeout(2000);
}

test('Report BI trên iPhone: dán 3 ô, xem Siêu thị, xuất ảnh → chạm lại để chia sẻ', async ({ page, context }) => {
    test.setTimeout(180_000);
    const loi = theoDoiLoiJs(page);
    await giaLapSafari(page); await batDemo(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).first().tap({ timeout: 30_000 });
    const dan = async (ten: RegExp, idx: number, text: string) => {
        await page.evaluate(t => navigator.clipboard.writeText(t), text);
        await page.locator('h4').filter({ hasText: ten }).nth(idx).tap();
        await page.waitForTimeout(1500);
    };
    await dan(/Realtime/i, 0, SUMMARY_REALTIME);
    await dan(/Lu[ỹy] kế/i, 0, SUMMARY_LUYKE);
    await dan(/Lu[ỹy] kế/i, 1, COMPETITION_LUYKE);
    await page.getByRole('button', { name: /Siêu thị/i }).first().tap();
    await page.waitForTimeout(2500);

    const d = await page.evaluate(DO);
    expect(d.tranNgang, 'trang tràn ngang').toBeLessThanOrEqual(0);
    expect(d.chuNho, 'chữ dưới 11px').toEqual([]);

    const nut = page.locator('button[title="Xuất ảnh"], button[aria-label="Xuất ảnh"]').first();
    await nut.scrollIntoViewIfNeeded(); await nut.tap();
    const menu = page.getByRole('menuitem').first();
    if (await menu.isVisible({ timeout: 1500 }).catch(() => false)) await menu.tap();

    // Dựng ảnh > 1s sau lượt chạm → Safari từ chối → phải có nút chạm lại (không lặng lẽ tải file)
    const nutLai = page.getByRole('button', { name: 'Chia sẻ / Lưu ảnh' });
    await expect(nutLai).toBeVisible({ timeout: 60_000 });
    await nutLai.tap();
    await expect.poll(() => soLanShare(page)).toBe(1);
    expect(loi, 'lỗi JS').toEqual([]);
});

// GĐ9 (2026-10-13): chủ dự án viết lại Check thưởng bằng React (2026-10-11, bỏ iframe `public/check-thuong.html`) — bản cũ của test
// này chờ iframe (`#fileInput`, `#exportSummaryImageButton`, nhờ trang cha hiện nút chạm lại) nên đỏ sẵn. Ý định giữ nguyên: nạp Excel
// trên iPhone cảm ứng → không tràn ngang, không chữ < 11px → xuất ảnh tổng hợp → chia sẻ được dưới quy tắc 1 giây của Safari.
// Bỏ khẳng định "thanh trên không có nút": chủ dự án đã chốt Check thưởng đưa cả thanh công cụ lên thanh trên (a4168bd).
test('Check thưởng trên iPhone (bản React): nạp Excel, gọn màn, xuất ảnh tổng hợp → chia sẻ được', async ({ page }) => {
    test.setTimeout(180_000);
    const loi = theoDoiLoiJs(page);
    await giaLapSafari(page);
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(
        ['910 - ĐML Hùng Vương', '920 - ĐML Tân Phú', '930 - ĐML Cần Thơ'],
        ['ICT', 'Phụ kiện', 'Gia dụng', 'Điện lạnh', 'Tivi', 'Máy giặt', 'Đồng hồ', 'Laptop'],
    ));
    await page.waitForTimeout(1500);

    const d = await page.evaluate(DO);
    expect(d.tranNgang, 'tràn ngang').toBeLessThanOrEqual(0);
    expect(d.chuNho, 'chữ dưới 11px').toEqual([]);

    await page.locator('button[title="Xuất ảnh báo cáo tổng hợp"]').first().tap();
    // Dựng ảnh > 1 giây sau lượt chạm → Safari từ chối chia sẻ → phải hiện nút chạm lại (không lặng lẽ tải file). Máy nhanh dựng
    // xong trong 1 giây thì chia sẻ luôn — cả 2 đường đều đúng.
    const nutLai = page.getByRole('button', { name: 'Chia sẻ / Lưu ảnh' });
    await expect.poll(async () => (await soLanShare(page)) > 0 || await nutLai.isVisible(), { timeout: 60_000 }).toBe(true);
    if (await soLanShare(page) === 0) await nutLai.tap();
    await expect.poll(() => soLanShare(page)).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { __share: string[] }).__share[0])).toMatch(/^Tong_Hop_Thuong_.+\.png$/);
    expect(loi, 'lỗi JS').toEqual([]);
});
