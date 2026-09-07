import { expect, test } from '@playwright/test';
import { createSalesXlsx, TEST_EMPLOYEE } from './helpers/salesFixture';

/** Phân Tích > Nhân Viên > modal "Phân Tích Hiệu Quả Cá Nhân" — kiểm chứng thay đổi 2026-09-05. */
test.describe('Phân Tích — modal hiệu quả cá nhân', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();

        // Nạp dữ liệu bán hàng giả qua đúng ô upload Excel của module Phân Tích
        const file = createSalesXlsx();
        await page.locator('input[type="file"]').first().setInputFiles(file);
        // App hỏi chế độ phân tích cho tệp vừa tải lên
        await page.getByText('Tệp Realtime (Xem nhanh)').click();

        // Chờ dashboard dựng xong (KPI hiện ra)
        await expect(page.getByText(/Doanh Thu/i).first()).toBeVisible({ timeout: 45_000 });

        // Bảng nhân viên nằm ngay trong trang Phân tích (không phải tab riêng); tên hiển thị đã rút
        // gọn nên tìm theo mã nhân viên cho chắc.
        const section = page.locator('#employee-analysis-section');
        await section.scrollIntoViewIfNeeded();
        await section.getByText(new RegExp(TEST_EMPLOYEE.split(' - ')[0])).first().click();
        // 2 phần tử mang chữ này: header của modal + header ẩn chỉ dùng cho ảnh xuất.
        await expect(page.getByText('Phân Tích Hiệu Quả Cá Nhân').first()).toBeVisible({ timeout: 15_000 });
    });

    test('bảng Phụ kiện & ĐGD thay cho biểu đồ Tỷ Trọng Doanh Thu Ngành Hàng', async ({ page }) => {
        await expect(page.getByText('Phụ Kiện & Điện Gia Dụng')).toBeVisible();
        await expect(page.getByText('Tỷ Trọng Doanh Thu Ngành Hàng')).toHaveCount(0);
    });

    test('bảng có đủ 3 nhóm cột giống bảng Chi Tiết Theo Kho', async ({ page }) => {
        const table = page.locator('.category-summary-table table');
        await expect(table).toBeVisible();
        const groupHeaders = await table.locator('thead tr').first().allInnerTexts();
        expect(groupHeaders.join(' ')).toContain('SL PHỤ KIỆN');
        expect(groupHeaders.join(' ')).toContain('SL DỊCH VỤ');
        expect(groupHeaders.join(' ')).toContain('SL GIA DỤNG');
    });

    test('vẫn có nút xuất ảnh và danh sách khách hàng', async ({ page }) => {
        await expect(page.getByTitle('Xuất Ảnh Phân Tích')).toBeVisible();
        await expect(page.getByText('Chi Tiết Theo Khách Hàng')).toBeVisible();
    });

    test('header dành cho ảnh xuất có trong DOM nhưng ẩn trên giao diện', async ({ page }) => {
        // class .export-always-show còn được dùng ở vài nơi khác trong app — lọc đúng header của modal
        const exportHeader = page.locator('.export-always-show', { hasText: 'Phân Tích Hiệu Quả Cá Nhân' });
        await expect(exportHeader).toHaveCount(1);
        await expect(exportHeader).toBeHidden();
    });

    test('số liệu Phụ kiện/ĐGD khớp dữ liệu đã nạp', async ({ page }) => {
        const table = page.locator('.category-summary-table table');
        // innerText trả về text ĐÃ qua `text-transform: uppercase` của CSS ("Loa" → "LOA"),
        // nên so khớp tên cột phải bỏ qua hoa/thường.
        const subHeaders = (await table.locator('thead tr').nth(1).locator('th').allInnerTexts()).map(t => t.trim().toUpperCase());
        const values = (await table.locator('tbody tr').first().locator('td').allInnerTexts()).map(t => t.trim());
        const valueOf = (col: string) => values[subHeaders.indexOf(col.toUpperCase())];
        // Dữ liệu giả: Camera 2 cái, Pin SDP 1, Loa 1, Máy lọc nước 1, Nồi cơm 1
        expect(valueOf('CAM')).toBe('2');
        expect(valueOf('SDP')).toBe('1');
        expect(valueOf('Loa')).toBe('1');
        expect(valueOf('MLN')).toBe('1');
        expect(valueOf('N.Cơm')).toBe('1');
    });
});
