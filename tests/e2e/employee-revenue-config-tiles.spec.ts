import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Kiểm thử thực tế: Cột DOANH THU NHÂN VIÊN hiển thị đúng 2 dòng x 2 ô (grid 2 cột) cho Realtime và Luỹ kế', async ({ page }) => {
    // 1. Mở trực tiếp phân hệ Cập nhật trong Report BI
    await page.goto('/?tab=employees&view=updater');

    // 2. Chờ khối "CẤU HÌNH SIÊU THỊ & NHÂN VIÊN" và tiêu đề "DOANH THU NHÂN VIÊN" xuất hiện
    const groupTitle = page.locator('h3').filter({ hasText: /DOANH THU NHÂN VIÊN/i }).first();
    await expect(groupTitle).toBeVisible({ timeout: 25_000 });

    // 4. Lấy container chứa các tile của DOANH THU NHÂN VIÊN
    const groupContainer = groupTitle.locator('xpath=../..');

    // 5. Kiểm tra có đủ 4 ô: REALTIME, REALTIME QĐ, LUỸ KẾ, LUỸ KẾ QĐ
    const rtThuc = groupContainer.locator('h4').filter({ hasText: /^REALTIME$/i });
    const rtQd = groupContainer.locator('h4').filter({ hasText: /^REALTIME QĐ$/i });
    const lkThuc = groupContainer.locator('h4').filter({ hasText: /^LUỸ KẾ$/i });
    const lkQd = groupContainer.locator('h4').filter({ hasText: /^LUỸ KẾ QĐ$/i });

    await expect(rtThuc).toBeVisible();
    await expect(rtQd).toBeVisible();
    await expect(lkThuc).toBeVisible();
    await expect(lkQd).toBeVisible();

    // 6. Kiểm tra cấu trúc grid 2 cột: phải có 2 dòng grid 2 cột
    const gridCols2 = groupContainer.locator('.grid-cols-2');
    const countCols2 = await gridCols2.count();
    expect(countCols2, 'Phải có 2 dòng grid 2 cột (1 dòng Realtime và 1 dòng Luỹ kế)').toBe(2);

    await page.screenshot({ path: 'test-results/verify-employee-revenue-tiles.png' });
});
