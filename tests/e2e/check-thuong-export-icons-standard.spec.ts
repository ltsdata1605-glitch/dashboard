import { test, expect } from '@playwright/test';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';
import path from 'path';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Check thưởng: tất cả các icon xuất ảnh chuẩn hoá theo camera exportImage và style chuẩn', async ({ page }) => {
    await moCheckThuong(page);
    await napFileThuong(page, taoFileThuong(['910 - ĐML Hùng Vương']));

    // 1. Hero banner: Nút xuất ảnh phải dùng icon exportImage, không dùng icon image cũ
    const banner = page.locator('text=Kết quả tra cứu').locator('..').locator('..');
    const bannerExportBtn = banner.getByRole('button', { name: /Xuất ảnh/i });
    await expect(bannerExportBtn).toBeVisible();
    await expect(bannerExportBtn.locator('svg[data-icon="exportImage"]')).toBeVisible();
    await expect(bannerExportBtn.locator('svg[data-icon="image"]')).toHaveCount(0);

    // 2. Thẻ "Phân Tích & Đề Xuất": CHỈ CÓ 1 nút xuất ảnh chuẩn (icon camera exportImage), không có nút cam/hổ phách
    const analysisHeader = page.locator('h3:has-text("Phân Tích & Đề Xuất")').locator('..');
    const copyBtn = analysisHeader.getByRole('button', { name: /Sao chép/i });
    await expect(copyBtn).toBeVisible();

    const analysisExportBtns = analysisHeader.getByRole('button', { name: /Chụp ảnh phân tích|Xuất ảnh phân tích/i });
    await expect(analysisExportBtns).toHaveCount(1);
    await expect(analysisExportBtns.first().locator('svg[data-icon="exportImage"]')).toBeVisible();
    await expect(analysisHeader.locator('svg[data-icon="image"]')).toHaveCount(0);

    // 3. Thanh tổng quan KPI / danh sách: icon xuất ảnh dùng exportImage
    const exportFilteredBtn = page.getByRole('button', { name: /Xuất ảnh danh sách đang lọc/i });
    await expect(exportFilteredBtn).toBeVisible();
    await expect(exportFilteredBtn.locator('svg[data-icon="exportImage"]')).toBeVisible();

    // 4. Bảng nhóm ngành hàng: nút xuất ảnh nhóm dùng exportImage
    const groupExportBtns = page.getByRole('button', { name: /Xuất ảnh nhóm này/i });
    if (await groupExportBtns.count() > 0) {
        await expect(groupExportBtns.first().locator('svg[data-icon="exportImage"]')).toBeVisible();
        await expect(groupExportBtns.first().locator('svg[data-icon="image"]')).toHaveCount(0);
    }

    // 5. Chụp ảnh màn hình kiểm chứng khu vực Phân Tích & Đề Xuất
    const analysisCard = page.locator('h3:has-text("Phân Tích & Đề Xuất")').locator('..').locator('..');
    const screenshotPath = path.resolve(process.cwd(), 'tests/e2e/check-thuong-export-icons-standard.png');
    await analysisCard.screenshot({ path: screenshotPath });
});
