import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

const IDB_KEYVAL_GIA = `(function(){function s(){return new Promise(function(res,rej){var r=indexedDB.open('keyval-store');
r.onupgradeneeded=function(){r.result.createObjectStore('keyval')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function q(m,f){return s().then(function(db){return new Promise(function(res,rej){var t=db.transaction('keyval',m);var o=f(t.objectStore('keyval'));
t.oncomplete=function(){res(o&&o.result)};t.onerror=function(){rej(t.error)}})})}
window.idbKeyval={get:function(k){return q('readonly',function(st){return st.get(k)})},set:function(k,v){return q('readwrite',function(st){st.put(v,k)})}};})();`;

const taoFile = () => {
    const rows: (string | number)[][] = [['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng']];
    ['ICT', 'Phụ kiện', 'Gia dụng', 'Điện lạnh', 'Điện tử'].forEach((ng, j) => rows.push([j + 1, 'V1', 'M1', 'DML', '910 - ĐML Hùng Vương', ng, 1.1, 0, '', 1, 1, 100_000, 0, 300_000 * (j + 1)]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const f = join(mkdtempSync(join(tmpdir(), 'ct-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, f); return f;
};

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Check thưởng mobile topbar: các nút nhỏ gọn nằm trên thanh Bar, không còn hàng riêng', async ({ page }) => {
    await page.route('https://cdn.sheetjs.com/**', r => r.fulfill({ path: 'node_modules/xlsx/dist/xlsx.full.min.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/html-to-image**', r => r.fulfill({ path: 'node_modules/html-to-image/dist/html-to-image.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/idb-keyval**', r => r.fulfill({ body: IDB_KEYVAL_GIA, contentType: 'application/javascript' }));

    await page.goto('/?tab=check-thuong');
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    const iframe = page.locator('iframe[src*="check-thuong"]');
    await expect(demo.or(iframe)).toBeVisible({ timeout: 30_000 });
    if (await demo.isVisible()) {
        await demo.click();
        await expect(iframe).toBeAttached({ timeout: 30_000 });
    }

    const f = page.frameLocator('iframe[src*="check-thuong"]');
    await expect(f.getByText('Chưa có file nào được chọn')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    await f.locator('#fileInput').setInputFiles(taoFile());
    await expect(f.getByText('Kết quả tra cứu').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1000);

    // 1. Kiểm tra không còn hàng riêng phụ phía dưới thanh Top bar
    const hangPhu = page.locator('.lg\\:hidden.shrink-0.px-3.py-1.border-b');
    await expect(hangPhu).toHaveCount(0);

    // 2. Kiểm tra thanh công cụ nhỏ gọn đã được portal vào #mobile-topbar-actions
    const topbarActions = page.locator('#mobile-topbar-actions');
    await expect(topbarActions).toBeVisible();

    // 3. Kiểm tra các nút và ô nhập con bên trong thanh Bar
    const searchBtn = topbarActions.getByRole('button', { name: /tra cứu/i });
    const topBtn = topbarActions.getByRole('button', { name: /top/i });
    const kho1Input = topbarActions.locator('input[placeholder="Kho 1"]');
    const kho2Input = topbarActions.locator('input[placeholder="Kho 2"]');
    const resetBtn = topbarActions.getByTitle(/xoá mã kho/i);
    const uploadBtn = topbarActions.getByTitle(/tải file khác/i);

    await expect(searchBtn).toBeVisible();
    await expect(topBtn).toBeVisible();
    await expect(kho1Input).toBeVisible();
    await expect(kho2Input).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(uploadBtn).toBeVisible();

    // 4. Đo kích thước: các nút nhỏ gọn h-7 (khoảng 28px)
    const boxKho1 = await kho1Input.boundingBox();
    expect(boxKho1).toBeTruthy();
    expect(boxKho1!.height).toBeLessThanOrEqual(30);

    // 5. Kiểm tra chuông thông báo không bị đẩy ra ngoài mép màn hình
    const bell = page.locator('.mobile-chrome button:has(svg[data-icon="notification"])');
    const boxBell = await bell.boundingBox();
    expect(boxBell).toBeTruthy();
    expect(boxBell!.x + boxBell!.width).toBeLessThanOrEqual(390);

    // 6. Chụp ảnh màn hình để nghiệm thu trực quan
    await page.screenshot({ path: join(process.cwd(), 'scratch/check-thuong-mobile-topbar.png') });
});
