import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

const taoFile = () => {
    const rows: (string | number)[][] = [['STT', 'Vùng', 'Miền', 'Kênh', 'Siêu thị', 'Ngành hàng', '% dự kiến', 'Dự kiến vượt', 'Lấy top 10', 'Hạng vượt ưu', 'Hạng % target', 'Thưởng vượt ưu', 'Thưởng top %', 'Tổng thưởng']];
    ['ICT', 'Phụ kiện', 'Gia dụng'].forEach((ng, j) => rows.push([j + 1, 'V1', 'M1', 'DML', '910 - ĐML Hùng Vương', ng, 1.1, 0, '', 1, 1, 100_000, 0, 300_000 * (j + 1)]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
    const f = join(mkdtempSync(join(tmpdir(), 'ct-export-')), 'luy-ke-thi-dua.xlsx'); XLSX.writeFile(wb, f); return f;
};

const chuanBi = async (page: Page) => {
    await page.route('https://cdn.sheetjs.com/**', r => r.fulfill({ path: 'node_modules/xlsx/dist/xlsx.full.min.js', contentType: 'application/javascript' }));
    await page.route('https://cdn.jsdelivr.net/npm/html-to-image**', r => r.fulfill({ path: 'node_modules/html-to-image/dist/html-to-image.js', contentType: 'application/javascript' }));
};

test('Kiểm tra toàn bộ chức năng xuất ảnh ở Check Thưởng: không còn lỗi htmlToImage không được tải', async ({ page }) => {
    await chuanBi(page);
    await page.goto('/check-thuong.html');

    // Chờ gắn xong các bộ nghe sự kiện
    await page.waitForTimeout(500);

    // Tải file mẫu lên
    await page.locator('#fileInput').setInputFiles(taoFile());
    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Kết quả tra cứu').first()).toBeVisible({ timeout: 10_000 });

    const messageEl = page.locator('#message');

    // 1. Kiểm tra nút Xuất ảnh báo cáo tổng hợp (#exportSummaryImageButton)
    const exportSummaryBtn = page.locator('#exportSummaryImageButton');
    await expect(exportSummaryBtn).toBeVisible();

    const [download1] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
        exportSummaryBtn.click(),
    ]);

    // Đảm bảo không có thông báo lỗi "htmlToImage không được tải"
    const textMsg1 = (await messageEl.textContent()) || '';
    expect(textMsg1).not.toContain('htmlToImage không được tải');
    expect(textMsg1).not.toContain('Lỗi');

    // 2. Kiểm tra nút Xuất ảnh Phân Tích & Đề Xuất (#exportAnalysisImageButton)
    const exportAnalysisBtn = page.locator('#exportAnalysisImageButton');
    if (await exportAnalysisBtn.isVisible()) {
        await Promise.all([
            page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
            exportAnalysisBtn.click(),
        ]);
        const textMsg2 = (await messageEl.textContent()) || '';
        expect(textMsg2).not.toContain('htmlToImage không được tải');
        expect(textMsg2).not.toContain('Lỗi: Không thể tải');
    }

    // 3. Kiểm tra nút Xuất ảnh từng nhóm thi đua (.exportGroupImageBtn)
    const firstGroupBtn = page.locator('.exportGroupImageBtn').first();
    if (await firstGroupBtn.isVisible()) {
        await Promise.all([
            page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
            firstGroupBtn.click(),
        ]);
        const textMsg3 = (await messageEl.textContent()) || '';
        expect(textMsg3).not.toContain('htmlToImage không được tải');
        expect(textMsg3).not.toContain('Lỗi: Không thể tải');
    }

    // 4. Kiểm tra nút Xuất ảnh tab hiện tại (#exportFilteredImageButton)
    const exportFilteredBtn = page.locator('#exportFilteredImageButton');
    if (await exportFilteredBtn.isVisible()) {
        await Promise.all([
            page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
            exportFilteredBtn.click(),
        ]);
        const textMsg4 = (await messageEl.textContent()) || '';
        expect(textMsg4).not.toContain('htmlToImage không được tải');
        expect(textMsg4).not.toContain('Lỗi: Không thể tải');
    }

    // 5. Kiểm tra nút Xuất ảnh BXH trong modal (#exportRankingImageButton)
    const viewRankingCard = page.locator('.view-ranking-btn, .view-ranking-card, .opportunity-item').first();
    if (await viewRankingCard.isVisible()) {
        await viewRankingCard.click();
        const rankingModal = page.locator('#rankingModal');
        await expect(rankingModal).toBeVisible({ timeout: 5_000 });
        const exportRankingBtn = page.locator('#exportRankingImageButton');
        if (await exportRankingBtn.isVisible()) {
            await Promise.all([
                page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
                exportRankingBtn.click(),
            ]);
            const textMsg5 = (await messageEl.textContent()) || '';
            expect(textMsg5).not.toContain('htmlToImage không được tải');
            expect(textMsg5).not.toContain('Lỗi: Không thể tải');
        }
    }
});
