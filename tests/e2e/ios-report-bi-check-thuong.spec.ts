import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { SUMMARY_REALTIME, SUMMARY_LUYKE, COMPETITION_LUYKE } from './helpers/seed';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

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
    await page.getByRole('button', { name: /Cập nhật/i }).first().tap({ timeout: 30_000 });
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

test('Check thưởng trên iPhone: tải Excel trong iframe, thanh công cụ gọn, xuất ảnh → chạm lại ở trang cha', async ({ page }) => {
    test.setTimeout(180_000);
    const loi = theoDoiLoiJs(page);
    await giaLapSafari(page); await batDemo(page);
    // CDN không ra được từ máy test — phục vụ bản cục bộ
    await page.route('https://cdn.jsdelivr.net/npm/html-to-image**', r => r.fulfill({ path: 'node_modules/html-to-image/dist/html-to-image.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.sheetjs.com/**', r => r.fulfill({ path: 'node_modules/xlsx/dist/xlsx.full.min.js', contentType: 'application/javascript' }));

    const head = ['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng'];
    const rows: (string | number)[][] = [head];
    const nganh = ['ICT', 'Phụ kiện', 'Gia dụng', 'Điện lạnh', 'Tivi', 'Máy giặt', 'Đồng hồ', 'Laptop'];
    ['910 - ĐML Hùng Vương', '920 - ĐML Tân Phú', '930 - ĐML Cần Thơ'].forEach((st, i) => nganh.forEach((ng, j) =>
        rows.push([rows.length, 'V1', 'M1', 'DML', st, ng, 0.8 + (i + j) / 20, 0, '', j + 1, j + 2, 100_000 * j, 50_000 * i, 150_000 * (i + j)])));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const file = join(mkdtempSync(join(tmpdir(), 'ct-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, file);

    await page.goto('/?tab=check-thuong');
    const f = page.frameLocator('iframe[src*="check-thuong"]');
    await expect(f.getByText('Chưa có file nào được chọn')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await f.locator('#fileInput').setInputFiles(file);
    await expect(f.getByText('Kết quả tra cứu').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    // Thanh công cụ không còn chen vào thanh trên cùng (từng đè logo), mọi nút/ô ≥ 44px
    expect(await page.locator('#mobile-topbar-actions').evaluate(e => e.children.length)).toBe(0);
    const nhoHon44 = await page.evaluate(() => Array.from(document.querySelectorAll('button, input')).filter(b => {
        const r = b.getBoundingClientRect(); return r.width > 0 && r.top < 200 && r.height < 44;
    }).length);
    expect(nhoHon44, 'nút/ô nhập dưới 44px ở đầu màn hình').toBe(0);
    for (const d of [await page.evaluate(DO), await f.locator('html').evaluate(DO)]) {
        expect(d.tranNgang, 'tràn ngang').toBeLessThanOrEqual(0);
        expect(d.chuNho, 'chữ dưới 11px').toEqual([]);
    }
    await expect(f.locator('#versionInfoPersistent'), 'nút phiên bản nổi đè lên nội dung').toBeHidden();

    await f.locator('#exportSummaryImageButton').tap();
    const nutLai = page.getByRole('button', { name: 'Chia sẻ / Lưu ảnh' });
    await expect(nutLai, 'iframe không nhờ được trang cha hiện nút chạm lại').toBeVisible({ timeout: 30_000 });
    await nutLai.tap();
    await expect.poll(() => soLanShare(page)).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { __share: string[] }).__share[0])).toBe('ĐML_Hùng_Vương_tong_hop.png');
    expect(loi, 'lỗi JS').toEqual([]);
});
