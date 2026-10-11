import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Check Thưởng lưu được dữ liệu vào IndexedDB `keyval-store` (2026-09-27).
 * Lỗi cũ: trang cha mở `keyval-store` v1 KHÔNG tạo store → trên máy mới (hoặc sau khi đổi tài
 * khoản / Safari iOS tự xoá dữ liệu web) database bị tạo RỖNG, iframe không bao giờ tạo được store
 * `keyval` → mọi lần lưu/tải báo "Không lưu được thay đổi Check Thưởng", tải lại trang là mất dữ liệu.
 *
 * Từ 2026-10-11 (GĐ2 tăng tốc) iframe KHÔNG còn nạp idb-keyval@6 từ CDN — bộ lưu `idbKeyval` của chính trang là bản dùng thật
 * (trước đó test chạy 2 nhánh: bản tự viết và thư viện CDN). Test khẳng định thêm: trang không gọi CDN idb-keyval nữa.
 */

const taoFile = () => {
    const rows: (string | number)[][] = [['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng']];
    ['ICT', 'Phụ kiện', 'Gia dụng'].forEach((ng, j) => rows.push([j + 1, 'V1', 'M1', 'DML', '910 - ĐML Hùng Vương', ng, 1.1, 0, '', 1, 1, 100_000, 0, 300_000 * (j + 1)]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const f = join(mkdtempSync(join(tmpdir(), 'ct-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, f); return f;
};

const chuanBi = async (page: Page, goiCdnIdb: string[]) => {
    // CDN không ra được từ máy test — phục vụ bản cục bộ (xlsx, html-to-image); idb-keyval: ghi lại nếu trang còn gọi
    await page.route('https://cdn.sheetjs.com/**', r => r.fulfill({ path: 'node_modules/xlsx/dist/xlsx.full.min.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/html-to-image**', r => r.fulfill({ path: 'node_modules/html-to-image/dist/html-to-image.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/idb-keyval**', r => { goiCdnIdb.push(r.request().url()); return r.abort(); });
};

const moCheckThuong = async (page: Page) => {
    await page.goto('/?tab=check-thuong');
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    const iframe = page.locator('iframe[src*="check-thuong"]');
    await expect(demo.or(iframe)).toBeVisible({ timeout: 30_000 });
    if (await demo.isVisible()) { await demo.click(); await expect(iframe).toBeAttached({ timeout: 30_000 }); }
    return page.frameLocator('iframe[src*="check-thuong"]');
};

{
    for (const hongSan of [false, true]) {
        test(`bộ lưu của trang — ${hongSan ? 'database đã bị tạo rỗng từ trước' : 'máy mới'}: lưu được, tải lại vẫn còn`, async ({ page }) => {
            test.setTimeout(120_000);
            const goiCdnIdb: string[] = [];
            await chuanBi(page, goiCdnIdb);
            const loi: string[] = [];
            page.on('console', m => { if (/object store|Lưu dữ liệu trong iframe thất bại|Tải dữ liệu đã lưu/.test(m.text())) loi.push(m.text()); });
            if (hongSan) {
                // Tái hiện đúng hậu quả của mã cũ: keyval-store v1 KHÔNG có store nào
                await page.goto('/?tab=help');
                await page.evaluate(() => new Promise(r => { const q = indexedDB.open('keyval-store', 1); q.onsuccess = () => { q.result.close(); r(null); }; }));
            }
            const f = await moCheckThuong(page);
            await expect(f.getByText('Chưa có file nào được chọn')).toBeVisible({ timeout: 30_000 });
            await page.waitForTimeout(1500); // iframe gắn xong bộ nghe sự kiện
            await f.locator('#fileInput').setInputFiles(taoFile());
            await expect(f.getByText('Kết quả tra cứu').first()).toBeVisible({ timeout: 20_000 });
            await page.waitForTimeout(1500);
            await expect(page.getByText(/Không lưu được thay đổi Check Thưởng/)).toHaveCount(0);

            await page.reload();
            await expect(page.frameLocator('iframe[src*="check-thuong"]').getByText('Kết quả tra cứu').first(), 'tải lại trang là mất dữ liệu Check Thưởng').toBeVisible({ timeout: 20_000 });
            expect(loi, 'còn lỗi lưu/tải IndexedDB').toEqual([]);
            expect(goiCdnIdb, 'trang Check thưởng vẫn gọi CDN idb-keyval (thẻ script chặn hiển thị)').toEqual([]);
        });
    }
}
