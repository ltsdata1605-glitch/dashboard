import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

/**
 * Phần còn lại của đợt sửa 2026-09-05, kiểm chứng trên DỮ LIỆU THẬT:
 * bảng Thi đua chế độ Realtime, bộ lọc cột, và bảng "Cấu hình Target Thi đua".
 *
 * Mọi thay đổi ở đây chỉ ghi vào IndexedDB của profile test (`.e2e-chrome-profile`), không đụng
 * Firestore dùng chung và không đụng máy thật của người dùng.
 */
test.setTimeout(180_000);
test.skip(!hasRealDataProfile(), 'Chưa có profile đăng nhập — chạy node scripts/e2e-auth-setup.mjs trước');

const openReportBi = async (page: Page) => {
    await page.goto('/');
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 60_000 });
    await sidebar.locator('button:has(svg.lucide-users)').first().click();
    await page.getByRole('button', { name: /Tổng quan/i }).first().waitFor({ timeout: 30_000 });
};

/** Chọn siêu thị nếu bảng chưa có dữ liệu. Lựa chọn siêu thị được LƯU LẠI giữa các lần chạy, nên
 *  nhãn nút có thể là "CỤM" (chưa chọn) hoặc chính tên siêu thị đã chọn từ lần trước. */
const ensureSupermarketPicked = async (page: Page) => {
    if (await page.getByText('NHÓM THI ĐUA').isVisible().catch(() => false)) return;
    const picker = page.getByText('CỤM', { exact: true }).first();
    if (await picker.isVisible().catch(() => false)) {
        await picker.click();
        await page.locator('[role="button"]').filter({ hasNotText: 'Chọn tất cả' }).first().click();
        await page.keyboard.press('Escape');
    }
};

test('Thi đua Realtime: bộ cột mặc định mới', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Tổng quan/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('Realtime', { exact: true }).first().click();
    await ensureSupermarketPicked(page);
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });

    const headers = (await page.locator('table thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    console.log('CỘT REALTIME (dữ liệu thật):', JSON.stringify(headers));
    await page.screenshot({ path: 'test-results/real-03-realtime.png', fullPage: true });

    // KHÔNG khoá cứng NHÃN cột nữa (2026-09-09). Bộ nhãn hiển thị đang được đổi liên tục ở
    // COMPETITION_COLUMN_LABELS (chỉ trong 1 buổi đã đổi 'L.Kế'→'LUỸ KẾ', 'Target V.Trội'→
    // 'TAR V.TRỘI', '%HT V.Trội'→'%DKHT V.TRỘI'), nên test khoá chuỗi hiển thị sẽ đỏ liên tục mà
    // KHÔNG chỉ ra lỗi thật nào. Ở đây chỉ khoá các BẤT BIẾN CẤU TRÚC; còn quy tắc chọn/đổi nhóm
    // cột được phủ chi tiết bằng 7 test đơn vị ở
    // features/bi-dashboard/components/dashboard/competition/competitionSortAndCalc.test.ts.
    expect(headers.length, 'bảng Thi đua Realtime phải có 2 cột cố định + 4 cột mặc định').toBe(6);
    expect(headers[1], 'cột tên nhóm thi đua bị mất').toContain('NHÓM THI ĐUA');
    expect(headers.every(h => h.length > 0), 'có cột trống — nhãn cột hỏng').toBe(true);
    expect(headers.some(h => h.includes('TAR') || h.includes('M.TIÊU')), 'không còn cột Target nào').toBe(true);
    expect(headers.some(h => h.includes('C.LẠI')), 'mất cột Còn Lại').toBe(true);
});

test('Bộ lọc thi đua: popup mở được và có liệt kê cột để bật/tắt', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Tổng quan/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('Luỹ kế', { exact: true }).first().click();
    await ensureSupermarketPicked(page);
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });

    // THU HẸP PHẠM VI 2026-09-09 — có chủ đích:
    // Test cũ lái popup để bật/tắt cột rồi khẳng định thứ tự cột trên bảng. Sau khi commit 3a9dbad8
    // liên kết các cột Target thành 2 nhóm loại trừ nhau, phần khẳng định đó vừa sai (khoá hành vi
    // cũ) vừa RẤT dễ vỡ: nhãn cột đi qua getCompetitionColumnLabel() nên đổi hoa/thường là hỏng
    // selector, và popup tự đóng sau mỗi lần gạt.
    // Quy tắc liên kết nhóm giờ được phủ CHẶT HƠN ở tầng đơn vị — 7 test trong
    // features/bi-dashboard/components/dashboard/competition/competitionSortAndCalc.test.ts,
    // gồm cả bất biến "không bao giờ mất cả 2 nhóm Target". Ở đây chỉ giữ đúng phần E2E mới kiểm
    // được: popup thật sự mở ra và có danh sách cột kèm nút gạt.
    await page.getByTitle(/Bộ lọc thi đua/i).click();
    await expect(page.getByText('Bộ lọc bảng thi đua')).toBeVisible({ timeout: 10_000 });

    const switches = page.locator('[role="switch"]');
    const soLuong = await switches.count();
    console.log('SỐ NÚT GẠT TRONG POPUP LỌC:', soLuong);
    expect(soLuong, 'popup lọc không có nút gạt nào — có thể đã hỏng cấu trúc').toBeGreaterThan(0);

    // Bất biến nghiệp vụ: bảng luôn phải có ít nhất 1 bộ Target (Cơ bản HOẶC Vượt trội), nếu không
    // cột "Còn Lại" mất căn cứ tính. Kiểm ở đây trên dữ liệu thật; quy tắc chuyển nhóm được phủ
    // chi tiết ở test đơn vị.
    const headers = (await page.locator('table thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    console.log('CỘT ĐANG HIỂN THỊ:', JSON.stringify(headers));
    expect(
        headers.some(h => h.includes('TAR') || h.includes('M.TIÊU')),
        'bảng không còn bộ Target nào — cột "Còn Lại" mất căn cứ tính'
    ).toBe(true);
});

test('Cấu hình Target Thi đua: hết thanh trượt, có cột Nhóm tiêu chí, sửa tên tại chỗ', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    await page.getByText('Cấu hình siêu thị chi tiết').first().waitFor({ timeout: 30_000 });

    // Chọn siêu thị đầu tiên rồi mở tab Target Thi đua
    await page.getByText('99 Hùng Vương', { exact: true }).first().click();
    await page.getByText('Target Thi đua', { exact: true }).first().click();
    await expect(page.getByText('Cấu hình Target Thi đua')).toBeVisible({ timeout: 30_000 });

    // 1) Không còn thanh trượt nào trong bảng
    await expect(page.locator('input[type="range"]')).toHaveCount(0);

    // 2) Cột "Nhóm tiêu chí" nằm cuối bảng
    // innerText đã qua `text-transform: uppercase` của CSS nên so khớp bằng chữ hoa
    const firstTable = page.locator('table').filter({ has: page.getByText('Nhóm tiêu chí') }).first();
    const headerCells = (await firstTable.locator('thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim().toUpperCase());
    console.log('HEADER BẢNG TARGET:', JSON.stringify(headerCells));
    expect(headerCells[headerCells.length - 1]).toBe('NHÓM TIÊU CHÍ');

});

test('Cấu hình Target Thi đua: bấm vào tên tiêu chí để sửa tại chỗ, Enter là lưu', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    await page.getByText('Cấu hình siêu thị chi tiết').first().waitFor({ timeout: 60_000 });
    await page.getByText('99 Hùng Vương', { exact: true }).first().click();
    await page.getByText('Target Thi đua', { exact: true }).first().click();
    await expect(page.getByText('Cấu hình Target Thi đua')).toBeVisible({ timeout: 30_000 });

    const targetTable = page.locator('table').filter({ has: page.getByText('Nhóm tiêu chí') }).first();
    const firstName = targetTable.locator('tbody tr').first().locator('td').first();
    const originalLabel = (await firstName.innerText()).trim();
    // Ô tên là <div onDoubleClick> (không phải nút bấm 1 lần) — xem SupermarketConfig.tsx
    await firstName.locator('div[title*="Nhấp đúp"]').first().dblclick();
    const input = firstName.locator('input');
    await expect(input).toBeVisible();
    await input.fill('TÊN TEST E2E');
    await input.press('Enter');
    await expect(firstName).toContainText('TÊN TEST E2E');
    console.log(`Đã đổi "${originalLabel}" → "TÊN TEST E2E", giờ trả lại mặc định`);

    // Xoá trắng = trả về tên gốc của BI (không để lại dấu vết trong cấu hình)
    await firstName.locator('div[title*="Nhấp đúp"]').first().dblclick();
    await firstName.locator('input').fill('');
    await firstName.locator('input').press('Enter');
    await expect(firstName).not.toContainText('TÊN TEST E2E');
});
