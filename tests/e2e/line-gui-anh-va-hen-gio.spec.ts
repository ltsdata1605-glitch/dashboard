import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * 2026-10-01 — (1) Mỗi nút xuất ảnh Phân tích chọn đích: tải về / gửi nhóm LINE; (2) Auto Sync YCX Realtime nạp xong
 * → tự gửi các ảnh đặt "nhóm LINE"; (3) Hẹn giờ cho nút Auto Sync; (4) cầu LINE của userscript 7.16.
 * Bot/nhóm LINE giả qua `__YCX_TEST_LINE__` (chỉ bản dev). Lượt gọi api.line.me bị chặn ở shim GM_xmlhttpRequest —
 * kiểm đúng nội dung gửi đi, không gửi thật.
 */
const USERSCRIPT = readFileSync(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');
const NHOM = 'C0123456789abcdef0123456789abcdef';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
test.use({ bypassCSP: true });

const KHOS = [{ ma: '90001', trieu: 11 }, { ma: '90002', trieu: 22 }, { ma: '90003', trieu: 33 }];
function fileBanHang(): Buffer {
    const d = new Date();
    const ngay = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} 09:30`;
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

type W = { __gm: Map<string, unknown>; __line: { url: string; headers: Record<string, string>; body: { to: string; messages: { type: string; text?: string; originalContentUrl?: string }[] } }[]; __tabs: string[] };

async function chuanBi(page: Page, opts: { homNay?: string } = {}) {
    await page.setViewportSize({ width: 1920, height: 1000 });
    if (opts.homNay) await page.clock.install({ time: new Date(opts.homNay) });
    await page.route('**://docs.google.com/**', (r) => r.fulfill({ status: 200, contentType: XLSX_MIME, body: cauHinh() }));
    await page.route('**/__ycx_file_mwg__', (r) => r.fulfill({ status: 200, contentType: XLSX_MIME, body: fileBanHang() }));
    await page.context().route('https://report.mwgroup.vn/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>MWG</body></html>' }));
    await page.addInitScript((nhom) => {
        const w = window as unknown as Record<string, unknown>;
        w.__YCX_TEST_LINE__ = { bot: { botId: 'bot-test', token: 'TOKEN-TEST', botName: 'Bot Test' }, groups: [{ groupId: nhom, groupName: 'Nhóm Siêu Thị 910' }], uploadUrl: 'https://example.com/anh-bao-cao.jpg' };
        w.__YCX_TEST_LINE_UPLOADS__ = [];
        const store = new Map<string, unknown>();
        w.__gm = store; w.__line = []; w.__tabs = [];
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        w.GM_openInTab = (url: string) => { (w.__tabs as string[]).push(url); };
        w.GM_xmlhttpRequest = (o: { method: string; url: string; headers?: Record<string, string>; data?: string; onload?: (r: unknown) => void }) => {
            if (o.url.startsWith('https://api.line.me/')) {
                (w.__line as unknown[]).push({ url: o.url, headers: o.headers, body: JSON.parse(o.data || '{}') });
                setTimeout(() => o.onload?.({ status: 200, responseText: '{}' }), 50);
                return;
            }
            fetch('/__ycx_file_mwg__').then((r) => r.arrayBuffer()).then((buf) => setTimeout(() => o.onload?.({ status: 200, response: buf }), 100));
        };
    }, NHOM);
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.addScriptTag({ content: USERSCRIPT });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

async function napDuLieu(page: Page) {
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'ycx.xlsx', mimeType: XLSX_MIME, buffer: fileBanHang() });
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
}
const lineCalls = (page: Page) => page.evaluate(() => (window as unknown as W).__line);

test('đích xuất ảnh: chọn nhóm LINE ở nút → bấm xuất là GỬI LINE (không tải về), nhớ sau khi tải lại trang', async ({ page }) => {
    test.setTimeout(150_000);
    await chuanBi(page);
    await napDuLieu(page);

    const nutDich = page.getByTestId('export-dest-Tổng Quan Doanh Thu');
    await expect(nutDich).toHaveAttribute('title', /tải về máy/);
    await nutDich.click();
    const modal = page.getByTestId('export-dest-modal');
    await expect(modal).toContainText('bot Bot Test');
    await page.screenshot({ path: test.info().outputPath('1-chon-dich.png') });
    await modal.getByRole('button', { name: /Nhóm Siêu Thị 910/ }).click();
    await expect(modal).toHaveCount(0);
    await expect(nutDich).toHaveAttribute('title', /gửi nhóm LINE Nhóm Siêu Thị 910/);

    let taiVe = false;
    page.on('download', () => { taiVe = true; });
    await page.getByTitle('Chỉ Xuất Ảnh Tổng Quan').click();
    await expect(page.getByText(/Đã gửi "Tổng Quan Doanh Thu" vào nhóm LINE Nhóm Siêu Thị 910/)).toBeVisible({ timeout: 30_000 });
    const calls = await lineCalls(page);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.line.me/v2/bot/message/push');
    expect(calls[0].headers.Authorization).toBe('Bearer TOKEN-TEST');
    expect(calls[0].body.to).toBe(NHOM);
    expect(calls[0].body.messages[0]).toMatchObject({ type: 'text' });
    expect(calls[0].body.messages[0].text).toContain('Tổng Quan Doanh Thu');
    expect(calls[0].body.messages[1]).toMatchObject({ type: 'image', originalContentUrl: 'https://example.com/anh-bao-cao.jpg' });
    const kichThuoc = await page.evaluate(() => (window as unknown as { __YCX_TEST_LINE_UPLOADS__: number[] }).__YCX_TEST_LINE_UPLOADS__);
    expect(kichThuoc[0]).toBeGreaterThan(1000);
    expect(kichThuoc[0]).toBeLessThanOrEqual(950_000);
    expect(taiVe, 'đặt đích LINE thì không tải về máy').toBe(false);
    await page.screenshot({ path: test.info().outputPath('2-da-gui.png') });

    // Nút khác vẫn tải về như cũ
    await expect(page.getByTestId('export-dest-Chi Tiết Theo Kho')).toHaveAttribute('title', /tải về máy/);
});

test('Auto Sync YCX Realtime nạp xong → TỰ gửi các ảnh đã đặt "nhóm LINE" (chỉ các ảnh đó)', async ({ page }) => {
    test.setTimeout(150_000);
    await chuanBi(page);
    // Đặt trước: "Tổng Quan Doanh Thu" và "Chi Tiết Theo Kho" gửi nhóm LINE; còn lại tải về
    await page.evaluate(async (nhom) => {
        const duongDan = '/services/analysisExportDestinations.ts';
        const m = (await import(/* @vite-ignore */ duongDan)) as typeof import('../../services/analysisExportDestinations');
        await m.setExportDestination('Tổng Quan Doanh Thu', { kind: 'line', groupId: nhom, groupName: 'Nhóm Siêu Thị 910' });
        await m.setExportDestination('Chi Tiết Theo Kho', { kind: 'line', groupId: nhom, groupName: 'Nhóm Siêu Thị 910' });
    }, NHOM);

    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toContainText('bản 7.16', { timeout: 8000 });
    const popupP = page.waitForEvent('popup');
    await dock.getByRole('button', { name: 'Tự động YCX Realtime' }).click();
    const jobId = new URL((await popupP).url()).searchParams.get('ycx_job')!;
    await page.evaluate((id) => {
        (window as unknown as W).__gm.set('ycx_ycx_done', { source: 'ycx-ycx-auto', type: 'done', jobId: id, mode: 'realtime', url: 'https://report.mwgroup.vn/files/a.xlsx', fileName: 'a.xlsx', at: 1 });
    }, jobId);
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
    await expect(page.getByText(/Tự gửi LINE: đã gửi 2 ảnh/)).toBeVisible({ timeout: 60_000 });
    const calls = await lineCalls(page);
    const daGui = calls.map((c) => c.body.messages[0].text || '');
    expect(daGui).toHaveLength(2);
    expect(daGui.some((t) => t.includes('Tổng Quan Doanh Thu'))).toBe(true);
    expect(daGui.some((t) => t.includes('Chi Tiết Theo Kho'))).toBe(true);
    await page.screenshot({ path: test.info().outputPath('tu-gui.png') });
});

test('hẹn giờ: đặt 09:00 cho YCX Realtime trên nút → đến giờ tự chạy đúng 1 lần (mở báo cáo 77 nhờ userscript)', async ({ page }) => {
    test.setTimeout(120_000);
    await chuanBi(page, { homNay: '2026-10-15T08:58:00' });
    const dock = page.getByTestId('ycx-auto-dock');
    await expect(dock).toContainText('bản 7.16', { timeout: 8000 });

    await page.getByTestId('sched-ycx-realtime').click();
    const modal = page.getByTestId('sched-modal-ycx-realtime');
    await modal.getByTestId('sched-input-ycx-realtime').fill('09:00');
    await modal.getByRole('button', { name: /Thêm giờ/ }).click();
    await expect(page.getByTestId('sched-times-ycx-realtime')).toContainText('09:00');
    await expect(page.getByTestId('sched-toggle-ycx-realtime')).toHaveText('Đang bật');
    await page.screenshot({ path: test.info().outputPath('hen-gio-modal.png') });
    await page.getByRole('dialog', { name: 'Hẹn giờ tự chạy' }).getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByTestId('sched-modal-ycx-realtime')).toHaveCount(0);
    await expect(dock).toContainText('⏰ Hẹn 09:00');
    await page.screenshot({ path: test.info().outputPath('hen-gio-khung.png') });

    // Chưa tới giờ: không chạy
    await page.clock.runFor(60_000);
    expect(await page.evaluate(() => (window as unknown as W).__tabs)).toEqual([]);
    // 09:00 → chạy
    await page.clock.runFor(90_000);
    await expect.poll(() => page.evaluate(() => (window as unknown as W).__tabs), { timeout: 10_000 }).toHaveLength(1);
    const tabs = await page.evaluate(() => (window as unknown as W).__tabs);
    expect(tabs[0]).toMatch(/^https:\/\/report\.mwgroup\.vn\/home\/dashboard\/77\?ycx_ycx=realtime&ycx_job=ycx-/);
    await expect(page.getByRole('dialog', { name: /Tự động YCX Realtime/ })).toBeVisible();
    // Không chạy lại trong cùng khung giờ
    await page.clock.runFor(5 * 60_000);
    expect(await page.evaluate(() => (window as unknown as W).__tabs)).toHaveLength(1);
});

test('userscript 7.16: cầu LINE chỉ gửi đúng định dạng (ID nhóm sai / tin lạ bị từ chối)', async ({ page }) => {
    await chuanBi(page);
    const ketQua = await page.evaluate(async (nhom) => {
        const gui = (detail: Record<string, unknown>) => new Promise<{ ok: boolean; error: string }>((res) => {
            const id = Math.random().toString(36).slice(2);
            const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d.requestId === id) { window.removeEventListener('ycx-line-push:result', on); res(d); } };
            window.addEventListener('ycx-line-push:result', on);
            window.dispatchEvent(new CustomEvent('ycx-line-push:send', { detail: { source: 'ycx-line-push', requestId: id, token: 'T', ...detail } }));
        });
        return {
            dung: await gui({ to: nhom, messages: [{ type: 'text', text: 'hi' }] }),
            saiTo: await gui({ to: 'abc', messages: [{ type: 'text', text: 'hi' }] }),
            tinLa: await gui({ to: nhom, messages: [{ type: 'flex', contents: {} }] }),
            anhHttp: await gui({ to: nhom, messages: [{ type: 'image', originalContentUrl: 'http://x/a.jpg', previewImageUrl: 'http://x/a.jpg' }] }),
        };
    }, NHOM);
    expect(ketQua.dung.ok).toBe(true);
    expect(ketQua.saiTo.ok).toBe(false);
    expect(ketQua.tinLa.ok).toBe(false);
    expect(ketQua.anhHttp.ok).toBe(false);
    expect(await lineCalls(page)).toHaveLength(1);
});
