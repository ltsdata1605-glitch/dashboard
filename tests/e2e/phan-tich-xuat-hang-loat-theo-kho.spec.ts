import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Audit A03 (2026-09-29): Phân tích > Báo cáo Kho > "Xuất hàng loạt".
 * Trước đây: đổi bộ lọc sang Kho X rồi chờ cờ `isFilterProcessing` tối đa 8s — HẾT GIỜ VẪN CHỤP.
 * Dữ liệu lớn/máy yếu (Worker > 8s) → ảnh mang tên Kho X nhưng số liệu của Kho trước.
 *
 * Test làm chậm ĐÚNG kết quả Worker (PROCESS_SUCCESS) 9s — vượt ngưỡng cũ — rồi ghi lại nội dung
 * THẬT của từng bản clone mà bộ xuất ảnh đưa vào DOM để chụp, so với Kho đang xuất.
 *
 * Cấu hình ngành hàng tải từ Google Sheets bị proxy của container chặn → trả file cấu hình tối
 * thiểu do test tự tạo (1 ngành ICT/Smartphone, 1 hình thức xuất tính doanh thu).
 */
const KHOS = [{ ma: '90001', trieu: 11 }, { ma: '90002', trieu: 22 }, { ma: '90003', trieu: 33 }];
const WORKER_DELAY_MS = 9000;

const today = new Date();
const ngay = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} 09:30`;

function taoFileBanHang(): string {
    const rows = KHOS.map((k, i) => ({
        'Mã Đơn Hàng': `SO${i}`, 'Tên Sản Phẩm': 'Điện thoại iPhone', 'Tên Khách Hàng': 'KH', 'Số Lượng': 1,
        'Giá bán_1': k.trieu * 1_000_000, 'Giá bán': k.trieu * 1_000_000, 'Mã kho tạo': k.ma, 'Kho tạo': `Kho ${k.ma}`,
        'Người tạo': `19500${i} - Nhân Viên ${i}`, 'Trạng thái xuất': 'Đã xuất', 'Ngày tạo': ngay, 'Thời gian hẹn giao': ngay,
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị', 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả',
        'Trạng thái thu tiền': 'Đã thu', 'Trạng thái hủy': 'Chưa hủy', 'Trạng thái hồ sơ': '1 - Mới',
        'Ngành Hàng': 'ICT', 'Nhóm Hàng': '1491', 'Nhà sản xuất': 'Khác', 'Mã sản phẩm': `SP${i}`,
    }));
    const file = join(mkdtempSync(join(tmpdir(), 'ycx-kho-')), 'sales.xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
    XLSX.writeFile(wb, file);
    return file;
}

function taoCauHinh(): Buffer {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['NhomCha', 'NhomCon', 'NhomHang'], ['ICT', 'Smartphone', '1491']]), 'Ngành hàng');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Hình thức xuất', 'Tính doanh thu', 'Hình thức'], ['Xuất bán hàng tại siêu thị', 'Có', 'Tiền mặt']]), 'Hình thức xuất');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

test('xuất hàng loạt theo Kho khi Worker chậm hơn 8s: mỗi ảnh mang đúng số liệu Kho của nó', async ({ page }) => {
    test.setTimeout(300_000);
    const cauHinh = taoCauHinh();
    await page.route('**://docs.google.com/**', r => r.fulfill({
        status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: cauHinh,
    }));

    await page.addInitScript(() => {
        const w = window as unknown as { __workerDelay: number; __chup: { dangXuat: string; noiDung: string }[] };
        w.__workerDelay = 0;
        w.__chup = [];
        // Làm chậm kết quả PROCESS của Worker (giữ nguyên thứ tự) khi __workerDelay > 0
        const RealWorker = window.Worker;
        window.Worker = class extends RealWorker {
            constructor(url: string | URL, opts?: WorkerOptions) {
                super(url, opts);
                let handler: ((e: MessageEvent) => void) | null = null;
                super.onmessage = (e: MessageEvent) => {
                    const delay = (e.data?.type === 'PROCESS_SUCCESS') ? w.__workerDelay : 0;
                    if (delay > 0) setTimeout(() => handler?.(e), delay); else handler?.(e);
                };
                Object.defineProperty(this, 'onmessage', { get: () => handler, set: (h) => { handler = h; } });
            }
        } as typeof Worker;
        // Ghi lại nội dung của bản clone ĐÚNG lúc bộ xuất ảnh gắn nó vào DOM để chụp
        new MutationObserver(muts => {
            for (const m of muts) m.addedNodes.forEach(n => {
                if (!(n instanceof HTMLElement)) return;
                const text = n.textContent || '';
                if (/tổng quan doanh thu/i.test(text)) {
                    w.__chup.push({ dangXuat: document.getElementById('export-msg')?.textContent || '', noiDung: text.replace(/\s+/g, ' ').slice(0, 200) });
                }
            });
        }).observe(document, { childList: true, subtree: true }); // document: documentElement có thể chưa có lúc init script chạy
    });

    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(taoFileBanHang());
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });

    await page.evaluate(ms => { (window as unknown as { __workerDelay: number }).__workerDelay = ms; }, WORKER_DELAY_MS);
    await page.getByTitle('Xuất hàng loạt').first().click();

    // Chờ tới khi xong: overlay biến mất
    await expect(page.locator('#export-overlay')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('#export-overlay')).toHaveCount(0, { timeout: 240_000 });

    const chup = await page.evaluate(() => (window as unknown as { __chup: { dangXuat: string; noiDung: string }[] }).__chup);
    console.log('CÁC LẦN CHỤP:', JSON.stringify(chup, null, 1));

    const theoKho = chup.filter(c => /Đang xuất: 9000\d/.test(c.dangXuat));
    expect(theoKho.length, 'phải chụp đủ 3 Kho').toBe(3);
    for (const c of theoKho) {
        const ma = c.dangXuat.replace('Đang xuất: ', '').trim();
        const kho = KHOS.find(k => k.ma === ma)!;
        // Ảnh của Kho X phải mang DT THỰC của Kho X, không phải của Kho trước / tổng
        expect(c.noiDung, `ảnh Kho ${ma} chụp nhầm số liệu`).toMatch(new RegExp(`DT THỰC\\D{0,40}${kho.trieu} Tr`, 'i'));
        expect(c.noiDung).not.toMatch(/DT THỰC\D{0,40}66 Tr/i);
    }
});

/** Nạp dữ liệu 3 Kho (3 NV) vào Phân tích ở Chế độ Dùng Thử, với cấu hình ngành hàng giả. */
async function moPhanTich(page: import('@playwright/test').Page) {
    const cauHinh = taoCauHinh();
    await page.route('**://docs.google.com/**', r => r.fulfill({
        status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: cauHinh,
    }));
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(taoFileBanHang());
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
}

/**
 * Audit A04: `await import(PerformanceModal)` từng nằm NGOÀI try/finally → tải chunk lỗi (mạng
 * chập chờn / vừa deploy bản mới) để lớp phủ "Đang xuất ảnh hàng loạt" che màn hình vĩnh viễn.
 */
test('xuất hàng loạt NV: tải chunk lỗi → lớp phủ tắt, báo lỗi rõ (không kẹt màn hình)', async ({ page }) => {
    test.setTimeout(180_000);
    await moPhanTich(page);
    await page.route('**/components/modals/PerformanceModal.tsx*', r => r.abort('internetdisconnected'));

    await page.locator('#employee-analysis-section').getByTitle('Xuất hàng loạt báo cáo chi tiết').first().click();
    await expect(page.getByText(/Xuất ảnh hàng loạt bị lỗi/)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#export-overlay')).toHaveCount(0, { timeout: 5_000 });
});

/** Audit A04: kết quả chụp từng NV từng bị bỏ qua — ảnh lỗi không được báo. */
test('xuất hàng loạt NV: 1 ảnh lỗi giữa batch → báo 2/3 ảnh kèm tên NV lỗi', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
        let lan = 0;
        const goc = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, ...rest: unknown[]) {
            if ((window as unknown as { __failBlob?: boolean }).__failBlob && ++lan === 2) { cb(null); return; }
            return goc.call(this, cb, ...(rest as [string?, number?]));
        };
    });
    await moPhanTich(page);
    await page.evaluate(() => { (window as unknown as { __failBlob: boolean }).__failBlob = true; });

    await page.locator('#employee-analysis-section').getByTitle('Xuất hàng loạt báo cáo chi tiết').first().click();
    await expect(page.locator('#export-overlay')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('#export-overlay')).toHaveCount(0, { timeout: 120_000 });
    await expect(page.getByText(/Đã xuất 2\/3 ảnh\. Chưa xuất được: /)).toBeVisible({ timeout: 5_000 });
});
