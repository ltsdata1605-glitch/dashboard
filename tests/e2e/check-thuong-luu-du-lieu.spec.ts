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
 * Chạy 2 nhánh của iframe: bản `idbKeyval` dự phòng tự viết, và nhánh thư viện idb-keyval@6 (CDN) —
 * mô phỏng đúng `createStore` của nó: mở KHÔNG kèm version, chỉ tạo store trong onupgradeneeded.
 */
const IDB_KEYVAL_GIA = `(function(){function s(){return new Promise(function(res,rej){var r=indexedDB.open('keyval-store');
r.onupgradeneeded=function(){r.result.createObjectStore('keyval')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function q(m,f){return s().then(function(db){return new Promise(function(res,rej){var t=db.transaction('keyval',m);var o=f(t.objectStore('keyval'));
t.oncomplete=function(){res(o&&o.result)};t.onerror=function(){rej(t.error)}})})}
window.idbKeyval={get:function(k){return q('readonly',function(st){return st.get(k)})},set:function(k,v){return q('readwrite',function(st){st.put(v,k)})}};})();`;

const taoFile = () => {
    const rows: (string | number)[][] = [['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng']];
    ['ICT', 'Phụ kiện', 'Gia dụng'].forEach((ng, j) => rows.push([j + 1, 'V1', 'M1', 'DML', '910 - ĐML Hùng Vương', ng, 1.1, 0, '', 1, 1, 100_000, 0, 300_000 * (j + 1)]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const f = join(mkdtempSync(join(tmpdir(), 'ct-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, f); return f;
};

const chuanBi = async (page: Page, coIdbKeyval: boolean) => {
    // CDN không ra được từ máy test — phục vụ bản cục bộ (xlsx, html-to-image) / bản mô phỏng (idb-keyval)
    await page.route('https://cdn.sheetjs.com/**', r => r.fulfill({ path: 'node_modules/xlsx/dist/xlsx.full.min.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/html-to-image**', r => r.fulfill({ path: 'node_modules/html-to-image/dist/html-to-image.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/idb-keyval**', r => coIdbKeyval ? r.fulfill({ body: IDB_KEYVAL_GIA, contentType: 'application/javascript' }) : r.abort());
};

const moCheckThuong = async (page: Page) => {
    await page.goto('/?tab=check-thuong');
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    const iframe = page.locator('iframe[src*="check-thuong"]');
    await expect(demo.or(iframe)).toBeVisible({ timeout: 30_000 });
    if (await demo.isVisible()) { await demo.click(); await expect(iframe).toBeAttached({ timeout: 30_000 }); }
    return page.frameLocator('iframe[src*="check-thuong"]');
};

for (const coIdbKeyval of [false, true]) {
    for (const hongSan of [false, true]) {
        test(`${coIdbKeyval ? 'idb-keyval CDN' : 'bản dự phòng'} — ${hongSan ? 'database đã bị tạo rỗng từ trước' : 'máy mới'}: lưu được, tải lại vẫn còn`, async ({ page }) => {
            test.setTimeout(120_000);
            await chuanBi(page, coIdbKeyval);
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
        });
    }
}
