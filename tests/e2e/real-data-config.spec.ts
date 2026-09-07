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
    expect(headers.slice(2).map(h => h.toUpperCase()))
        .toEqual(['M.TIÊU V.TRỘI', 'T.HIỆN', '%HT V.TRỘI', 'C.LẠI']);
});

test('Bộ lọc cột: bấm thẳng nút gạt thì cột bật và xuống cuối bảng', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Tổng quan/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('Luỹ kế', { exact: true }).first().click();
    await ensureSupermarketPicked(page);
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });

    const targetRow = page.locator('xpath=//span[normalize-space(text())="Target"]/ancestor::div[.//*[@role="switch"]][1]').first();
    const readHeaders = async () => (await page.locator('table thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());

    // Cấu hình cột được lưu lại giữa các lần chạy — tắt cột "Target" trước để phép đo luôn giống nhau
    await page.getByTitle(/Bộ lọc thi đua/i).click();
    if ((await readHeaders()).includes('M.TIÊU')) {
        await targetRow.getByRole('switch').click();
    }
    const before = await readHeaders();
    expect(before).not.toContain('M.TIÊU');

    await targetRow.getByRole('switch').click();
    await page.keyboard.press('Escape');

    const after = await readHeaders();
    console.log('CỘT SAU KHI BẬT "Target":', JSON.stringify(after));
    expect(after).toEqual([...before, 'M.TIÊU']);
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
