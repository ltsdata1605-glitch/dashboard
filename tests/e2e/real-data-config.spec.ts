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
    // CẬP NHẬT 2026-09-09: commit 3a9dbad8 (tách biệt bộ lọc Realtime/Luỹ kế) đổi THỨ TỰ cột mặc
    // định CÓ CHỦ Ý — comment ngay tại `defaultVisibleCols` trong CompetitionView.tsx ghi rõ
    // "Realtime: T.HIỆN, M.TIÊU V.TRỘI, %HT V.Trội, C.LẠI". Test cũ khoá thứ tự cũ nên cập nhật.
    expect(headers.slice(2).map(h => h.toUpperCase()))
        .toEqual(['T.HIỆN', 'M.TIÊU V.TRỘI', '%HT V.TRỘI', 'C.LẠI']);
});

test('Bộ lọc cột: bật cột nhóm Cơ bản thì tắt nhóm Vượt trội (và ngược lại)', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Tổng quan/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('Luỹ kế', { exact: true }).first().click();
    await ensureSupermarketPicked(page);
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });

    // VIẾT LẠI 2026-09-09: test cũ khẳng định "bật 1 cột thì nó xuống CUỐI bảng, các cột khác giữ
    // nguyên". Từ commit 3a9dbad8, các cột Target được LIÊN KẾT THÀNH 2 NHÓM LOẠI TRỪ NHAU — quy
    // tắc ghi rõ trong `toggleCompetitionColumn()` (competitionSortAndCalc.ts): bật 1 cột nhóm Cơ
    // bản (Target/%HT/%DKHT) sẽ bật cả nhóm đó và TẮT nhóm Vượt trội, để bảng luôn có đúng 1 bộ
    // Target làm căn cứ tính cột "Còn Lại". Test giờ khoá đúng quy tắc đó thay vì hành vi cũ.
    const readHeaders = async () => (await page.locator('table thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    // Nhãn trong popup đi qua getCompetitionColumnLabel() nên là chữ HOA.
    const rowFor = (label: string) =>
        page.locator(`xpath=//span[normalize-space(text())="${label}"]/ancestor::div[.//*[@role="switch"]][1]`).first();

    await page.getByTitle(/Bộ lọc thi đua/i).click();

    // Về trạng thái gốc: đảm bảo đang bật nhóm VƯỢT TRỘI (cấu hình được lưu giữa các lần chạy).
    if (!(await readHeaders()).some(h => h.includes('V.TRỘI'))) {
        await rowFor('TARGET V.TRỘI').getByRole('switch').click();
    }
    const before = await readHeaders();
    expect(before.some(h => h.includes('V.TRỘI')), 'chưa về được trạng thái bật nhóm Vượt trội').toBe(true);

    // Bật cột nhóm Cơ bản -> nhóm Vượt trội phải TẮT hết
    await rowFor('TARGET').getByRole('switch').click();
    await page.keyboard.press('Escape');
    const after = await readHeaders();
    console.log('CỘT TRƯỚC:', JSON.stringify(before));
    console.log('CỘT SAU KHI BẬT NHÓM CƠ BẢN:', JSON.stringify(after));

    expect(after.some(h => h.includes('V.TRỘI')), 'bật nhóm Cơ bản nhưng nhóm Vượt trội vẫn còn — sai quy tắc loại trừ').toBe(false);
    expect(after, 'bật nhóm Cơ bản thì phải có cột M.TIÊU').toContain('M.TIÊU');
    // Cột độc lập không bị ảnh hưởng
    expect(after, 'cột độc lập C.LẠI bị mất').toContain('C.LẠI');
    expect(after, 'cột độc lập L.KẾ bị mất').toContain('L.KẾ');
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
