import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Tự động YCX Realtime — phía Dashboard (Phân tích, 2026-10-01). Nạp NGUYÊN userscript thật (bản 7.16, nhánh trang
 * Dashboard) với shim GM_*; tab report.mwgroup.vn được giả lập bằng cách ghi thẳng tiến trình / kết quả vào bộ nhớ GM
 * như tab đó sẽ ghi (phần tab đó có test riêng: ycx-tu-dong-report-mwg.spec.ts). GM_xmlhttpRequest "tải file" trả về
 * một file bán hàng 3 Kho thật → kiểm Phân tích nạp đúng như bấm File YCX → Tệp Realtime.
 */
const USERSCRIPT = readFileSync(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');

const KHOS = [{ ma: '90001', trieu: 11 }, { ma: '90002', trieu: 22 }, { ma: '90003', trieu: 33 }];
const today = new Date();
const ngay = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} 09:30`;

function fileBanHang(): Buffer {
    const rows = KHOS.map((k, i) => ({
        'Mã Đơn Hàng': `SO${i}`, 'Tên Sản Phẩm': 'Điện thoại iPhone', 'Tên Khách Hàng': 'KH', 'Số Lượng': 1,
        'Giá bán_1': k.trieu * 1_000_000, 'Giá bán': k.trieu * 1_000_000, 'Mã kho tạo': k.ma, 'Kho tạo': `Kho ${k.ma}`,
        'Người tạo': `19500${i} - Nhân Viên ${i}`, 'Trạng thái xuất': 'Đã xuất', 'Ngày tạo': ngay, 'Thời gian hẹn giao': ngay,
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị', 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả',
        'Trạng thái thu tiền': 'Đã thu', 'Trạng thái hủy': 'Chưa hủy', 'Trạng thái hồ sơ': '1 - Mới',
        'Ngành Hàng': 'ICT', 'Nhóm Hàng': '1491', 'Nhà sản xuất': 'Khác', 'Mã sản phẩm': `SP${i}`,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function cauHinh(): Buffer {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['NhomCha', 'NhomCon', 'NhomHang'], ['ICT', 'Smartphone', '1491']]), 'Ngành hàng');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Hình thức xuất', 'Tính doanh thu', 'Hình thức'], ['Xuất bán hàng tại siêu thị', 'Có', 'Tiền mặt']]), 'Hình thức xuất');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// App có CSP chặn script nội tuyến — Tampermonkey thật không bị CSP chặn, nên test bỏ qua CSP để nạp userscript
test.use({ bypassCSP: true });

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function moPhanTichCoUserscript(page: Page, homNay?: string) {
    if (homNay) await page.clock.install({ time: new Date(homNay) });
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.route('**://docs.google.com/**', (r) => r.fulfill({ status: 200, contentType: XLSX_MIME, body: cauHinh() }));
    await page.route('**/__ycx_file_mwg__', (r) => r.fulfill({ status: 200, contentType: XLSX_MIME, body: fileBanHang() }));
    // Tab report.mwgroup.vn mà Dashboard mở: trang trống (userscript bên đó có test riêng)
    await page.context().route('https://report.mwgroup.vn/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>MWG</body></html>' }));
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        w.__gm = store;
        w.__gmReq = [] as string[];
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        w.GM_openInTab = () => {};
        w.GM_xmlhttpRequest = (o: { method: string; url: string; onload?: (r: unknown) => void; onprogress?: (p: unknown) => void }) => {
            (w.__gmReq as string[]).push(`${o.method} ${o.url}`);
            fetch('/__ycx_file_mwg__').then((r) => r.arrayBuffer()).then((buf) => {
                o.onprogress?.({ loaded: buf.byteLength / 2, total: buf.byteLength, lengthComputable: true });
                setTimeout(() => o.onload?.({ status: 200, response: buf }), 300);
            });
        };
    });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.addScriptTag({ content: USERSCRIPT });
    await page.evaluate(() => window.dispatchEvent(new Event('focus'))); // khung dò lại userscript
}

const gmSet = (page: Page, k: string, v: unknown) => page.evaluate(([key, val]) => { (window as unknown as { __gm: Map<string, unknown> }).__gm.set(key as string, val); }, [k, v] as const);

test('Phân tích: khung AUTO SYNC YCX → mở báo cáo 77 → tiến trình → tải file → nạp như Tệp Realtime', async ({ page }) => {
    test.setTimeout(120_000);
    await moPhanTichCoUserscript(page);

    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toBeVisible();
    await expect(dock).toContainText('Auto Sync');
    await expect(dock).toHaveAttribute('data-userscript', /^7\.\d+/, { timeout: 5000 }); // chân khung bỏ dòng "bản 7.x" ở 41eb025f
    await page.screenshot({ path: test.info().outputPath('1-khung.png') });

    const popupP = page.waitForEvent('popup');
    await dock.getByRole('button', { name: /Tự động YCX Realtime/ }).click();
    const popup = await popupP;
    expect(popup.url()).toMatch(/^https:\/\/report\.mwgroup\.vn\/home\/dashboard\/77\?ycx_ycx=realtime&ycx_job=ycx-/);
    const jobId = new URL(popup.url()).searchParams.get('ycx_job')!;
    const job = await page.evaluate(() => (window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_ycx_job'));
    expect(job).toMatchObject({ jobId, status: 'pending' });

    const modal = page.getByTestId('ycx-auto-modal');
    await expect(modal).toBeVisible();

    // Tab MWG báo tiến trình (của lượt KHÁC trước — phải bị bỏ qua) rồi của lượt này
    await gmSet(page, 'ycx_ycx_progress', { source: 'ycx-ycx-auto', type: 'progress', jobId: 'ycx-luot-cu', step: 'waiting', message: 'LƯỢT CŨ', at: 1 });
    await gmSet(page, 'ycx_ycx_progress', { source: 'ycx-ycx-auto', type: 'progress', jobId, step: 'waiting', message: 'MWG đang xuất file "Chi tiết yêu cầu xuất 01/10/2026 09:15:00"… (12s)', at: 2 });
    await expect(page.getByTestId('ycx-auto-message')).toContainText('MWG đang xuất file', { timeout: 5000 });
    await expect(page.getByTestId('ycx-auto-message')).not.toContainText('LƯỢT CŨ');
    await page.screenshot({ path: test.info().outputPath('2-dang-cho.png') });

    // Tab MWG báo xong → userscript Dashboard tải file → Phân tích nạp
    await gmSet(page, 'ycx_ycx_done', { source: 'ycx-ycx-auto', type: 'done', jobId, url: 'https://report.mwgroup.vn/files/YCX-moi.xlsx', fileName: 'YCX-moi.xlsx', at: 3 });
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
    expect(await page.evaluate(() => (window as unknown as { __gmReq: string[] }).__gmReq)).toEqual(['GET https://report.mwgroup.vn/files/YCX-moi.xlsx']);
    await expect(modal).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('3-da-nap.png') });

    // Khung mở rộng (từ 1536px) không được đè lên khối số liệu
    for (const w of [1536, 1920]) {
        await page.setViewportSize({ width: w, height: 1000 });
        await page.waitForTimeout(300);
        const d = (await dock.boundingBox())!;
        const o = (await page.locator('#business-overview').boundingBox())!;
        expect(d.width, `khung mở rộng ở ${w}px`).toBeGreaterThan(200);
        expect(d.x, `khung đè khối số liệu ở ${w}px`).toBeGreaterThanOrEqual(o.x + o.width);
        await page.screenshot({ path: test.info().outputPath(`4-rong-${w}.png`) });
    }
});

test('Phân tích: tab MWG báo lỗi → khung hiện lỗi + nút Chạy lại, không nạp gì', async ({ page }) => {
    test.setTimeout(60_000);
    await moPhanTichCoUserscript(page);
    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toHaveAttribute('data-userscript', /^7\.\d+/, { timeout: 5000 }); // chân khung bỏ dòng "bản 7.x" ở 41eb025f
    const popupP = page.waitForEvent('popup');
    await dock.getByRole('button', { name: /Tự động YCX Realtime/ }).click();
    const jobId = new URL((await popupP).url()).searchParams.get('ycx_job')!;
    await gmSet(page, 'ycx_ycx_error', { source: 'ycx-ycx-auto', type: 'error', jobId, step: 'open', message: 'Không thấy form báo cáo — anh/chị đã đăng nhập report.mwgroup.vn chưa?', at: 5 });
    await expect(page.getByTestId('ycx-auto-message')).toContainText('đăng nhập report.mwgroup.vn', { timeout: 5000 });
    await expect(page.getByTestId('ycx-auto-modal').getByText('Có thể làm tay')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chạy lại' })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('loi.png') });
    expect(await page.evaluate(() => (window as unknown as { __gmReq: string[] }).__gmReq)).toEqual([]);
});

test('Phân tích: chưa cài userscript → bấm khung hiện hướng dẫn cài, KHÔNG mở tab MWG', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toHaveAttribute('data-userscript', 'none', { timeout: 5000 });
    let moPopup = false;
    page.on('popup', () => { moPopup = true; });
    await dock.getByRole('button', { name: /Tự động YCX Realtime/ }).click();
    await expect(page.getByTestId('ycx-auto-need-script')).toBeVisible();
    await page.waitForTimeout(500);
    expect(moPopup).toBe(false);
});

test('Phân tích: màn 1366px → khung thu gọn thành cột icon, mở tạm được', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toBeVisible();
    const box = await dock.boundingBox();
    expect(box!.width).toBeLessThan(80);
    await dock.getByRole('button', { name: 'Mở rộng khung Auto Sync YCX' }).click();
    await expect(dock).toContainText('Auto Sync Pro');
    await dock.getByRole('button', { name: 'Thu gọn khung Auto Sync YCX' }).click();
    expect((await dock.boundingBox())!.width).toBeLessThan(80);
});

/** YCX Luỹ kế (userscript 7.15): Từ 01 → hôm qua, nạp như "Lũy kế / Quá khứ" (hỏi tên gợi nhớ, lưu kho dữ liệu). */
test('Phân tích: YCX Luỹ kế ngày 15 → mở báo cáo 77 chế độ luyke, nạp file như Lũy kế / Quá khứ', async ({ page }) => {
    test.setTimeout(120_000);
    await moPhanTichCoUserscript(page, '2026-10-15T09:00:00');
    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toHaveAttribute('data-userscript', /^7\.\d+/, { timeout: 5000 }); // chân khung bỏ dòng "bản 7.x" ở 41eb025f
    await expect(dock).toContainText('YCX Luỹ kế');

    const popupP = page.waitForEvent('popup');
    await dock.getByRole('button', { name: 'Tự động YCX Luỹ kế' }).click();
    const popup = await popupP;
    expect(popup.url()).toMatch(/\?ycx_ycx=luyke&ycx_job=ycx-/);
    const jobId = new URL(popup.url()).searchParams.get('ycx_job')!;
    expect(await page.evaluate(() => (window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_ycx_job'))).toMatchObject({ jobId, mode: 'luyke' });

    const modal = page.getByTestId('ycx-auto-modal');
    await expect(page.getByRole('dialog', { name: /Tự động YCX Luỹ kế/ })).toBeVisible();
    await expect(modal).toContainText('01/10/2026 → 14/10/2026');
    await expect(modal).toContainText('Lũy kế / Quá khứ');
    await page.screenshot({ path: test.info().outputPath('luyke-dang-chay.png') });

    await gmSet(page, 'ycx_ycx_done', { source: 'ycx-ycx-auto', type: 'done', jobId, mode: 'luyke', url: 'https://report.mwgroup.vn/files/YCX-LuyKe.xlsx', fileName: 'YCX-LuyKe.xlsx', at: 9 });
    // Nạp kiểu Lũy kế / Quá khứ → Phân tích hỏi tên gợi nhớ (Tệp Realtime thì không hỏi)
    const ten = page.getByPlaceholder('Nhập tên hiển thị...');
    await expect(ten).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: test.info().outputPath('luyke-dat-ten.png') });
    await ten.fill('Luỹ kế 01-14/10');
    await ten.press('Enter');
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
    await page.screenshot({ path: test.info().outputPath('luyke-da-nap.png') });
});

test('Phân tích: bấm YCX Luỹ kế vào NGÀY 01 → chạy Realtime', async ({ page }) => {
    test.setTimeout(60_000);
    await moPhanTichCoUserscript(page, '2026-10-01T09:00:00');
    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toHaveAttribute('data-userscript', /^7\.\d+/, { timeout: 5000 }); // chân khung bỏ dòng "bản 7.x" ở 41eb025f
    const popupP = page.waitForEvent('popup');
    await dock.getByRole('button', { name: 'Tự động YCX Luỹ kế' }).click();
    expect((await popupP).url()).toMatch(/\?ycx_ycx=realtime&ycx_job=ycx-/);
    await expect(page.getByText('Hôm nay là ngày 01 — YCX Luỹ kế chạy Realtime')).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Tự động YCX Realtime/ })).toBeVisible();
});
