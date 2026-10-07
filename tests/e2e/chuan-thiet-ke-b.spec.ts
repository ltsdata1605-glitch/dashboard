import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Chuẩn thiết kế (B) — chủ dự án chốt 2026-10-07 (DESIGN_SYSTEM.md mục 3): đo KIỂU TÍNH TOÁN THẬT trên
 * màn hình Phân tích có dữ liệu mẫu, không chỉ đọc class.
 *   nút dùng chung 8px · thẻ KPI 16px · modal 16px (desktop)
 */
test('bo góc theo thang chuẩn: nút 8px, thẻ KPI 16px, modal 16px', async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 20_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click();
    await expect(page.getByText(/CHI TIẾT THEO KHO/i).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1500);

    const radius = (sel: string) => page.locator(sel).first().evaluate(el => getComputedStyle(el).borderTopLeftRadius);
    const btn = await radius('[data-ui="shared"]:not(.rounded-full):not([class*="rounded-none"])');
    const kpi = await radius('.kpi-overview-card');
    console.log('BO GÓC — nút:', btn, '| thẻ KPI:', kpi);
    expect(btn).toBe('8px');
    expect(kpi).toBe('16px');
    await page.screenshot({ path: 'test-results/chuan-b/phan-tich.png' });

    // Khung KHỐI DỮ LIỆU lớn trên laptop cố ý VUÔNG (giữ quy ước hiện tại — DESIGN_SYSTEM.md mục 3).
    // Mở modal dùng chung "Tùy chỉnh KPI".
    await page.getByRole('button', { name: 'Tùy chỉnh KPI' }).first().click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const modal = await dialog.evaluate(el => getComputedStyle(el).borderTopLeftRadius);
    console.log('BO GÓC — modal:', modal);
    expect(modal).toBe('16px');
    await page.screenshot({ path: 'test-results/chuan-b/modal.png' });
});
