import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * 2026-09-30: xuất hàng loạt trên ĐIỆN THOẠI. Trước đây mỗi ảnh gọi navigator.share riêng không
 * chờ → Safari iOS từ chối (quá ~1s sau lượt chạm) → N thông báo "chạm lại" chồng nhau.
 * Nay: gom cả lô → MỘT nút → một lượt chạm chia sẻ tất cả ảnh (mỗi ảnh vẫn là 1 PNG riêng).
 * Giả lập luật của Safari: share() không có lượt chạm còn hiệu lực → NotAllowedError.
 * Chromium giả lập iPhone — không phải Safari thật.
 */
const KHOS = [{ ma: '90001', trieu: 11 }, { ma: '90002', trieu: 22 }, { ma: '90003', trieu: 33 }];

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


test.use({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
});

test('xuất hàng loạt NV trên iPhone: một nút, một lượt chia sẻ đủ ảnh', async ({ page }) => {
    test.setTimeout(240_000);
    await page.addInitScript(() => {
        const w = window as unknown as { __share: { soTep: number; tuChoi: boolean; ten: string[] }[] };
        w.__share = [];
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d: ShareData) => !!d?.files?.length });
        Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async (d: ShareData) => {
                const ok = navigator.userActivation?.isActive ?? false;
                w.__share.push({ soTep: d.files?.length || 0, tuChoi: !ok, ten: (d.files || []).map(f => f.name) });
                if (!ok) throw new DOMException('không có lượt chạm', 'NotAllowedError');
            },
        });
    });
    const cauHinh = taoCauHinh();
    await page.route('**://docs.google.com/**', r => r.fulfill({
        status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: cauHinh,
    }));
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(taoFileBanHang());
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });

    await page.locator('#employee-analysis-section').getByTitle('Xuất hàng loạt báo cáo chi tiết').first().click();
    await expect(page.locator('#export-overlay')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('#export-overlay')).toHaveCount(0, { timeout: 180_000 });

    // Trong lúc xuất: không gọi share lần nào, không thông báo "chạm lại" nào
    expect(await page.evaluate(() => (window as unknown as { __share: unknown[] }).__share)).toEqual([]);
    await expect(page.getByTestId('share-retry-toast')).toHaveCount(0);
    const nut = page.getByTestId('batch-share-toast');
    await expect(nut).toHaveCount(1);
    await expect(nut).toContainText('3 ảnh đã sẵn sàng');

    await nut.getByRole('button', { name: /Chia sẻ \/ Lưu 3 ảnh/ }).click();
    const share = await page.evaluate(() => (window as unknown as { __share: { soTep: number; tuChoi: boolean; ten: string[] }[] }).__share);
    expect(share).toHaveLength(1);
    expect(share[0].tuChoi).toBe(false);
    expect(share[0].soTep).toBe(3);
    expect(share[0].ten.every(t => /^Phân Tích Hiệu Quả - .+\.png$/.test(t))).toBe(true);
    await expect(nut).toHaveCount(0);
});

/**
 * 2026-10-20: CI WebKit đỏ 2/27 lượt ở bài trên — "Đã xuất 2/3 ảnh. Chưa xuất được: Nhân Viên 2". Vòng hàng loạt vẽ thẻ nhân
 * viên ngoài màn hình rồi CHỜ CỨNG 800 ms; máy đang bận (lượt tự xuất Bot LINE chụp ảnh ngầm ngay sau khi tải tệp) thì React
 * chưa kịp vẽ → mục đó bị đánh "Không dựng được nội dung". Tái hiện chắc chắn bằng cách làm bộ lập lịch của React (gửi việc
 * qua MessageChannel) đến trễ 1,2 s: code cũ 0/3 ảnh, nay chờ đúng thẻ của đúng người (hooks/useExportLogic.ts) → 3/3.
 */
test('React vẽ trễ (máy bận): xuất hàng loạt vẫn đủ 3/3 ảnh, không đánh hỏng oan', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d: ShareData) => !!d?.files?.length });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {} });
        const W = window as unknown as { __veTre?: boolean; MessageChannel: unknown };
        const Goc = window.MessageChannel;
        W.MessageChannel = class {
            port1: MessagePort; port2: MessagePort;
            constructor() {
                const kenh = new Goc();
                const p2 = kenh.port2;
                const gui = p2.postMessage.bind(p2);
                this.port1 = kenh.port1;
                this.port2 = new Proxy(p2, {
                    get(t, k) {
                        if (k === 'postMessage') return (m: unknown) => { if (W.__veTre) setTimeout(() => gui(m), 1200); else gui(m); };
                        const v = Reflect.get(t, k);
                        return typeof v === 'function' ? v.bind(t) : v;
                    },
                });
            }
        };
    });
    const cauHinh = taoCauHinh();
    await page.route('**://docs.google.com/**', r => r.fulfill({
        status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: cauHinh,
    }));
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(taoFileBanHang());
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });

    await page.evaluate(() => { (window as unknown as { __veTre?: boolean }).__veTre = true; });
    await page.locator('#employee-analysis-section').getByTitle('Xuất hàng loạt báo cáo chi tiết').first().click();
    // Đọc câu tổng kết ngay khi nó hiện (bảng thành công tự tắt sau 2,5 s)
    const tongKet = await page.waitForFunction(() => {
        const t = document.getElementById('export-overlay')?.textContent || '';
        return /Đã xuất đủ|Đã xuất \d|Không xuất được/.test(t) ? t.replace(/\s+/g, ' ') : false;
    }, undefined, { timeout: 150_000, polling: 100 });
    const chu = String(await tongKet.jsonValue());
    expect(chu, chu.slice(0, 300)).toContain('Đã xuất đủ 3/3 ảnh');
    expect(chu).not.toContain('Không dựng được nội dung');
});

test('lớp phủ xuất ảnh: hiện lại ngay sau khi ẩn thì KHÔNG bị gỡ theo hẹn cũ', async ({ page }) => {
    await page.goto('/');
    const conLopPhu = await page.evaluate(async () => {
        const ui = await import('/services/uiService.ts' as string);
        ui.showExportOverlay('Lô 1');
        await new Promise(r => setTimeout(r, 50));
        ui.hideExportOverlay();
        await new Promise(r => setTimeout(r, 50));
        ui.showExportOverlay('Lô 2');
        await new Promise(r => setTimeout(r, 400));
        const el = document.getElementById('export-overlay');
        const ketQua = { coLopPhu: !!el, chu: el?.textContent || '' };
        ui.hideExportOverlay();
        return ketQua;
    });
    expect(conLopPhu.coLopPhu).toBe(true);
    expect(conLopPhu.chu).toContain('Lô 2');
});
