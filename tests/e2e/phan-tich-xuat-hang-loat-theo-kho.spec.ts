import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Xuất ảnh hàng loạt ở Phân tích (audit A04): lớp phủ không kẹt, ảnh lỗi phải được báo.
 *
 * (2026-10-09) Đã GỠ bài "xuất hàng loạt theo Kho khi Worker chậm hơn 8s" (audit A03): chủ dự án bỏ nút "Xuất hàng
 * loạt" ở Báo cáo Kho từ commit 9649dc7e (2026-10-02, "chỉ chụp đúng màn đang hiển thị, không xuất hàng loạt") —
 * không còn đường nào trên giao diện tới `handleBatchKhoExport`. Bài đó từ đó bấm nhầm nút "Xuất hàng loạt báo cáo
 * chi tiết" của mục Nhân viên (getByTitle khớp chuỗi con) nên luôn đỏ. Logic chờ đúng dữ liệu Kho vẫn được kiểm ở
 * tests/unit/batch-export-result.test.ts (sameKhoSelection, waitUntil). Bật lại nút thì khôi phục bài từ git.
 *
 * Cấu hình ngành hàng tải từ Google Sheets bị proxy của container chặn → trả file cấu hình tối
 * thiểu do test tự tạo (1 ngành ICT/Smartphone, 1 hình thức xuất tính doanh thu).
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
    // Từ 2026-10-01 tổng kết hiện trên bảng tiến trình chung (components/shared/export) — có nút Đóng, không kẹt
    await expect(page.getByTestId('export-progress-stage')).toContainText(/Xuất ảnh hàng loạt bị lỗi/, { timeout: 15_000 });
    await page.getByTestId('export-progress').getByRole('button', { name: 'Đóng' }).click();
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
    // Tổng kết trên bảng tiến trình chung: câu chữ cũ + danh sách NV lỗi, chờ người dùng bấm Đóng
    await expect(page.getByTestId('export-progress-stage')).toContainText(/Đã xuất 2\/3 ảnh\. Chưa xuất được: /, { timeout: 120_000 });
    await expect(page.getByTestId('export-progress-failed')).toHaveCount(1);
    await page.getByTestId('export-progress').getByRole('button', { name: 'Đóng' }).click();
    await expect(page.locator('#export-overlay')).toHaveCount(0);
});
