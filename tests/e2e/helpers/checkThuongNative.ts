import { expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Check thưởng bản React (chủ dự án viết lại 2026-10-11, bỏ iframe `public/check-thuong.html`). Các spec cũ còn chờ iframe nên đỏ
 * sẵn — GĐ7 (2026-10-13) chuyển chúng sang bản này qua 2 hàm dưới, giữ nguyên ý định từng spec.
 */
export const COT_THUONG = ['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng'];

export const taoFileThuong = (sieuThi: string[] = ['910 - ĐML Hùng Vương'], nganh: string[] = ['ICT', 'Phụ kiện', 'Gia dụng']) => {
    const rows: (string | number)[][] = [COT_THUONG];
    let stt = 1;
    for (const st of sieuThi) nganh.forEach((ng, j) => rows.push([stt++, 'V1', 'M1', 'DML', st, ng, 1.1 - j * 0.05, 0, '', 1, 1, 100_000, 0, 300_000 * (j + 1)]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const f = join(mkdtempSync(join(tmpdir(), 'ct-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, f); return f;
};

/** Mở tab Check thưởng (bật Chế độ Dùng Thử nếu đang ở màn đăng nhập) — đứng ở màn "Tải file thưởng thi đua". */
export async function moCheckThuong(page: Page) {
    await page.goto('/?tab=check-thuong');
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    const manTai = page.getByRole('heading', { name: 'Tải file thưởng thi đua' });
    await expect(demo.or(manTai)).toBeVisible({ timeout: 30_000 });
    if (await demo.isVisible()) await demo.click();
    await expect(manTai).toBeVisible({ timeout: 30_000 });
}

/** Nạp file thưởng qua ô chọn file của màn chưa có dữ liệu, chờ màn tra cứu hiện. */
export async function napFileThuong(page: Page, file: string) {
    await page.locator('input[type="file"][accept*=".xlsx"]').first().setInputFiles(file);
    await expect(page.getByText('Kết quả tra cứu').first()).toBeVisible({ timeout: 20_000 });
}
