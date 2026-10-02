import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * 2026-10-02 — Nút "Gửi nhóm LINE" dùng chung (components/shared/export/LineSendButton + lineDelivery).
 * Bot/nhóm LINE giả qua `__YCX_TEST_LINE__` (chỉ bản dev); lượt gọi api.line.me bị chặn ở shim GM_xmlhttpRequest của
 * userscript — kiểm đúng nội dung gửi đi, không gửi thật. Có thể ép lỗi lượt gửi thứ N qua `__lineFail`.
 */
const USERSCRIPT = readFileSync(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');
const NHOM = 'C0123456789abcdef0123456789abcdef';
const NHOM2 = NHOM.replace('C0', 'C9');
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

type LineCall = { url: string; body: { to: string; messages: { type: string; text?: string }[] } };
type W = { __line: LineCall[]; __lineFail: number[]; __lineN: number };

async function chuanBi(page: Page, viewport = { width: 1920, height: 1000 }) {
    await page.setViewportSize(viewport);
    await page.route('**://docs.google.com/**', (r) => r.fulfill({ status: 200, contentType: XLSX_MIME, body: cauHinh() }));
    await page.addInitScript(({ nhom, nhom2 }) => {
        const w = window as unknown as Record<string, unknown>;
        w.__YCX_TEST_LINE__ = { bot: { botId: 'bot-test', token: 'TOKEN-TEST', botName: 'Bot Test' }, groups: [{ groupId: nhom, groupName: 'Nhóm Siêu Thị 910' }, { groupId: nhom2, groupName: 'Nhóm Quản Lý' }], uploadUrl: 'https://example.com/anh.jpg' };
        w.__YCX_TEST_LINE_UPLOADS__ = [];
        w.__line = []; w.__lineFail = []; w.__lineN = 0;
        const store = new Map<string, unknown>();
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        w.GM_openInTab = () => {};
        w.GM_xmlhttpRequest = (o: { url: string; data?: string; onload?: (r: unknown) => void }) => {
            if (!o.url.startsWith('https://api.line.me/')) return;
            const n = ++(w.__lineN as number);
            const loi = (w.__lineFail as number[]).includes(n);
            (w.__line as unknown[]).push({ url: o.url, body: JSON.parse(o.data || '{}'), loi });
            setTimeout(() => o.onload?.(loi ? { status: 500, responseText: '{"message":"Lỗi giả"}' } : { status: 200, responseText: '{}' }), 30);
        };
    }, { nhom: NHOM, nhom2: NHOM2 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.addScriptTag({ content: USERSCRIPT });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'ycx.xlsx', mimeType: XLSX_MIME, buffer: fileBanHang() });
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
}
const lineCalls = (page: Page) => page.evaluate(() => (window as unknown as W).__line);

test('1 ảnh: nút LINE ở "Chi tiết ngành hàng" → chọn nhóm → gửi, không tải về; lần sau nhớ nhóm', async ({ page }) => {
    test.setTimeout(150_000);
    await chuanBi(page);
    let taiVe = false;
    page.on('download', () => { taiVe = true; });

    const nut = page.getByTestId('line-send-pt:Chi Tiết Ngành Hàng');
    await nut.scrollIntoViewIfNeeded();
    await expect(nut).toHaveAttribute('title', 'Gửi nhóm LINE — Chi tiết ngành hàng');
    await nut.click();
    const hop = page.getByTestId('line-send-dialog');
    await expect(hop).toContainText('bot Bot Test');
    await expect(page.getByTestId('line-send-confirm')).toBeDisabled();
    await hop.getByText('Nhóm Siêu Thị 910').click();
    await page.screenshot({ path: test.info().outputPath('1-hop-chon-nhom.png') });
    await page.getByTestId('line-send-confirm').click();

    await expect(page.getByTestId('line-send-stage')).toHaveText('Đã gửi nhóm LINE thành công', { timeout: 40_000 });
    await page.screenshot({ path: test.info().outputPath('2-da-gui.png') });
    const calls = await lineCalls(page);
    expect(calls).toHaveLength(1);
    expect(calls[0].body.to).toBe(NHOM);
    expect(calls[0].body.messages[0].text).toContain('Chi Tiết Ngành Hàng');
    expect(calls[0].body.messages[1]).toMatchObject({ type: 'image' });
    expect(taiVe, 'chỉ gửi LINE thì không tải về').toBe(false);

    // Thẻ tự tắt; mở lại → nhóm lần trước đã tích sẵn
    await expect(page.getByTestId('line-send-progress')).toHaveCount(0, { timeout: 10_000 });
    await nut.click();
    await expect(page.getByTestId('line-send-confirm')).toBeEnabled();
    await expect(page.getByTestId('line-send-dialog').getByRole('checkbox', { name: /Nhóm Siêu Thị 910/ })).toBeChecked();
});

test('hàng loạt + 1 ảnh lỗi: gửi tuần tự từng ảnh, báo ảnh lỗi, "Thử lại" chỉ gửi ảnh lỗi', async ({ page }) => {
    test.setTimeout(200_000);
    await chuanBi(page);
    // Lượt gọi LINE thứ 2 lỗi
    await page.evaluate(() => { (window as unknown as W).__lineFail = [2]; });

    // Bảng Top nhân viên: "Báo cáo chi tiết từng nhân viên" = 3 ảnh (3 nhân viên trong file mẫu)
    const top = page.getByTestId('line-send-pt:Top Nhân Viên');
    await top.scrollIntoViewIfNeeded();
    await expect(top, 'nút LINE ở Top nhân viên').toBeVisible({ timeout: 20_000 });
    await top.click();
    const hop = page.getByTestId('line-send-dialog');
    await hop.getByText('Báo cáo chi tiết từng nhân viên').click();
    await hop.getByText('Nhóm Siêu Thị 910').click();
    await page.getByTestId('line-send-confirm').click();

    const the = page.getByTestId('line-send-progress');
    await expect(the).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('3-dang-gui.png') });
    await expect(page.getByTestId('line-send-stage')).toHaveText(/Gửi được 2\/3 ảnh — 1 ảnh lỗi/, { timeout: 120_000 });
    await expect(page.getByTestId('line-send-failed')).toContainText('Lỗi gửi LINE');
    await page.screenshot({ path: test.info().outputPath('4-co-loi.png') });
    expect(await lineCalls(page)).toHaveLength(3);

    await page.getByTestId('line-send-retry').click();
    await expect(page.getByTestId('line-send-stage')).toHaveText('Đã gửi đủ 3/3 ảnh vào nhóm Nhóm Siêu Thị 910', { timeout: 30_000 });
    const calls = await lineCalls(page);
    expect(calls).toHaveLength(4);
    // Ảnh gửi lại đúng là ảnh đã lỗi (cùng chú thích với lượt 2)
    expect(calls[3].body.messages[0].text).toBe(calls[1].body.messages[0].text);
});

test('iPhone: hộp chọn nhóm + thẻ tiến trình nằm gọn trong màn hình, nút đủ lớn để chạm', async ({ page }) => {
    test.setTimeout(150_000);
    await chuanBi(page, { width: 390, height: 844 });
    const nut = page.getByTestId('line-send-pt:Chi Tiết Ngành Hàng');
    await nut.scrollIntoViewIfNeeded();
    const hop0 = await nut.boundingBox();
    expect(hop0!.width).toBeGreaterThanOrEqual(40);
    expect(hop0!.height).toBeGreaterThanOrEqual(40);
    await nut.click();
    await page.getByTestId('line-send-dialog').getByText('Nhóm Quản Lý').click();
    const xn = await page.getByTestId('line-send-confirm').boundingBox();
    expect(xn!.y + xn!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: test.info().outputPath('5-iphone-hop.png') });
    await page.getByTestId('line-send-confirm').click();
    const the = page.getByTestId('line-send-progress');
    await expect(the).toBeVisible();
    const b = await the.boundingBox();
    expect(b!.x).toBeGreaterThanOrEqual(0);
    expect(b!.x + b!.width).toBeLessThanOrEqual(390);
    expect(b!.y + b!.height).toBeLessThanOrEqual(844);
    await expect(page.getByTestId('line-send-stage')).toHaveText('Đã gửi nhóm LINE thành công', { timeout: 40_000 });
    await page.screenshot({ path: test.info().outputPath('6-iphone-the.png') });
    expect((await lineCalls(page))[0].body.to).toBe(NHOM2);
});
