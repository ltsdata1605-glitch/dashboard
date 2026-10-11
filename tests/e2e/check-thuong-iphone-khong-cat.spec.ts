import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Audit A24 (2026-09-30) — Check thưởng trên iPhone (390px): trang ẩn tràn ngang (`overflow-x: hidden`)
 * nên nội dung rộng hơn màn hình có thể bị CẮT MẤT mà không ai thấy. Đo hộp bao của từng phần tử
 * (không chỉ scrollWidth toàn trang): phần tử nào vượt mép phải mà KHÔNG nằm trong vùng cuộn ngang
 * thật là bị cắt. Modal phải vừa chiều cao nhìn thấy (dvh), không vượt mép dưới.
 * Chromium giả lập — không phải Safari thật.
 */

const taoFile = () => {
    const rows: (string | number)[][] = [['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng']];
    ['ICT', 'Phụ kiện', 'Gia dụng', 'Điện lạnh', 'Điện tử', 'Máy lọc nước', 'Đồng hồ thông minh', 'Laptop'].forEach((ng, j) => rows.push([j + 1, 'V1', 'M1', 'DML', '910 - ĐML Hùng Vương - Quận Bình Thạnh - TP Hồ Chí Minh', ng, 1.1, 0, '', 1, 1, 100_000, 0, 300_000 * (j + 1)]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const f = join(mkdtempSync(join(tmpdir(), 'ct-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, f); return f;
};

const chuanBi = async (page: Page) => {
    // CDN không ra được từ máy test — phục vụ bản cục bộ (xlsx, html-to-image). idb-keyval: trang không gọi CDN nữa (2026-10-11).
    await page.route('https://cdn.sheetjs.com/**', r => r.fulfill({ path: 'node_modules/xlsx/dist/xlsx.full.min.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/html-to-image**', r => r.fulfill({ path: 'node_modules/html-to-image/dist/html-to-image.js', contentType: 'application/javascript' }));
};

const moCheckThuong = async (page: Page) => {
    await page.goto('/?tab=check-thuong');
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    const iframe = page.locator('iframe[src*="check-thuong"]');
    await expect(demo.or(iframe)).toBeVisible({ timeout: 30_000 });
    if (await demo.isVisible()) { await demo.click(); await expect(iframe).toBeAttached({ timeout: 30_000 }); }
    return page.frameLocator('iframe[src*="check-thuong"]');
};


test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

test('Check thưởng 390px: không nội dung nào bị cắt ngang; modal vừa màn hình', async ({ page }) => {
    test.setTimeout(120_000);
    await chuanBi(page);
    const f = await moCheckThuong(page);
    await expect(f.getByText('Chưa có file nào được chọn')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await f.locator('#fileInput').setInputFiles(taoFile());
    await expect(f.getByText('Kết quả tra cứu').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    const biCat = await f.locator('body').evaluate(() => {
        const W = document.documentElement.clientWidth;
        const trongVungCuon = (el: Element) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
                const ox = getComputedStyle(p).overflowX;
                if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth) return true;
            }
            return false;
        };
        const out: string[] = [];
        document.querySelectorAll('#mainContent *').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            if (r.right > W + 1 && !trongVungCuon(el)) out.push(`${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)} phải=${Math.round(r.right)} > ${W}`);
        });
        return out;
    });
    console.log('BỊ CẮT:', JSON.stringify(biCat.slice(0, 15)), 'tổng', biCat.length);
    expect(biCat, 'phần tử vượt mép phải mà không cuộn được → bị cắt mất').toEqual([]);

    // Modal BXH: mở và đo
    const mo = await f.locator('#rankingModal').evaluate((m) => {
        m.classList.remove('hidden');
        const hop = m.firstElementChild as HTMLElement;
        const r = hop.getBoundingClientRect();
        return { day: Math.round(r.bottom), cao: window.innerHeight, maxH: getComputedStyle(hop).maxHeight };
    });
    console.log('MODAL:', JSON.stringify(mo));
    expect(mo.day).toBeLessThanOrEqual(mo.cao);
});
