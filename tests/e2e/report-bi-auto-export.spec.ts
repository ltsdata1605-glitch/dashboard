import { test, expect } from '@playwright/test';

import { openReportBi, seedCompetitionData, seedAnalysisEmployees } from './helpers/seed';

test.describe('Cấu hình tự xuất Bot LINE trên REPORT BI', () => {
    test('Nút Bot LINE hiển thị trên Header Report BI và mở modal cấu hình', async ({ page }) => {
        await openReportBi(page);
        await seedCompetitionData(page);

        // Chuyển sang màn hình Siêu thị để xem bảng và Header
        await page.getByRole('button', { name: /Siêu thị/i }).first().click();
        await page.waitForTimeout(1500);

        // Nút Cấu hình tự xuất Bot LINE trên DashboardHeader
        const botBtn = page.locator('button[aria-label*="Cấu hình tự động xuất ảnh cho Bot LINE"], button[title*="Cấu hình tự động xuất ảnh cho Bot LINE"]').first();
        await expect(botBtn).toBeVisible({ timeout: 15000 });

        // Click mở modal cấu hình
        await botBtn.click();
        await page.waitForTimeout(500);

        // Modal cấu hình hiển thị
        const modal = page.locator('text=Cấu hình tự xuất cho Bot LINE');
        await expect(modal.first()).toBeVisible({ timeout: 5000 });

        // Kiểm tra các tuỳ chọn bcrt và bclk
        const rtOption = page.locator('text=Báo cáo Realtime').or(page.locator('text=bcrt'));
        await expect(rtOption.first()).toBeVisible();

        const lkOption = page.locator('text=Báo cáo Lũy kế').or(page.locator('text=bclk'));
        await expect(lkOption.first()).toBeVisible();

        // Nút chụp thử nghiệm
        const testBtn = page.getByRole('button', { name: /Chụp thử/i });
        await expect(testBtn.first()).toBeVisible();
    });

    test('Nút Bot LINE hiển thị trên các tab Nhân viên của Report BI', async ({ page }) => {
        await openReportBi(page);
        await seedAnalysisEmployees(page, [
            { id: '101', name: 'Nguyễn Văn A', department: 'KHO 910' }
        ]);

        // Chuyển sang màn hình Nhân viên
        await page.getByRole('button', { name: /Nhân viên/i }).first().click();
        await page.waitForTimeout(1500);

        // Nút Cấu hình tự xuất Bot LINE trên tab Nhân viên
        const botBtn = page.locator('button[aria-label*="Cấu hình tự động xuất ảnh cho Bot LINE"], button[title*="Cấu hình tự động xuất ảnh cho Bot LINE"]').first();
        await expect(botBtn).toBeVisible({ timeout: 15000 });

        // Click mở modal cấu hình
        await botBtn.click();
        await page.waitForTimeout(500);

        // Modal cấu hình hiển thị
        const modal = page.locator('text=Cấu hình tự xuất cho Bot LINE');
        await expect(modal.first()).toBeVisible({ timeout: 5000 });
    });

    test('Cấu hình tùy chỉnh lệnh gọi LINE và cập nhật giao diện mẹo tra cứu', async ({ page }) => {
        await openReportBi(page);
        await seedCompetitionData(page);

        await page.getByRole('button', { name: /Siêu thị/i }).first().click();
        await page.waitForTimeout(1200);

        const botBtn = page.locator('button[aria-label*="Cấu hình tự động xuất ảnh cho Bot LINE"], button[title*="Cấu hình tự động xuất ảnh cho Bot LINE"]').first();
        await expect(botBtn).toBeVisible({ timeout: 15000 });
        await botBtn.click();

        // Modal cấu hình
        const modal = page.locator('text=Cấu hình tự xuất cho Bot LINE');
        await expect(modal.first()).toBeVisible({ timeout: 5000 });

        // Click badge lệnh Realtime để mở inline form sửa lệnh
        const editRtBtn = page.locator('button[title*="cấu hình lệnh gọi LINE"]').first();
        await expect(editRtBtn).toBeVisible();
        await editRtBtn.click();

        // Nhập lệnh mới: cttk, rt
        const rtInput = page.locator('input[placeholder*="Ví dụ: bcrt"]');
        await expect(rtInput).toBeVisible();
        await rtInput.fill('cttk, rt');

        // Nhấn nút Lưu
        const saveBtn = page.getByRole('button', { name: 'Lưu' }).first();
        await saveBtn.click();

        // Kiểm tra badge hiển thị đúng lệnh đã lưu
        await expect(page.locator('text=Lệnh: cttk, rt')).toBeVisible();

        // Kiểm tra mẹo tra cứu cập nhật hiển thị mã lệnh cttk
        await expect(page.locator('code:has-text("cttk")').first()).toBeVisible();
    });
});
