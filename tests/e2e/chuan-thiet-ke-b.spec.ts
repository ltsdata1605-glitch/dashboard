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
    const kpi = await radius('.kpi-overview-card');
    console.log('BO GÓC — thẻ KPI:', kpi);
    expect(kpi).toBe('16px');
    await page.screenshot({ path: 'test-results/chuan-b/phan-tich.png' });

    // Khung KHỐI DỮ LIỆU lớn trên laptop cố ý VUÔNG (giữ quy ước hiện tại — DESIGN_SYSTEM.md mục 3).
    // Mở modal dùng chung "Dãy thẻ KPI" (nút "Tuỳ chỉnh dãy thẻ KPI").
    await page.getByRole('button', { name: 'Tuỳ chỉnh dãy thẻ KPI' }).first().click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const modal = await dialog.evaluate(el => getComputedStyle(el).borderTopLeftRadius);
    console.log('BO GÓC — modal:', modal);
    expect(modal).toBe('16px');
    // Nút dùng chung (kiểu chuẩn, không phải 'unstyled'): đo nút trong modal. 2026-10-11: màn Phân tích hiện KHÔNG còn nút
    // kiểu chuẩn nào (mọi nút ở đó là 'unstyled' tự tạo kiểu — chính là việc GĐ4/GĐ5 làm lại) nên bộ chọn cũ chờ mãi.
    const btn = await dialog.locator('[data-ui="shared"]:not(.rounded-full):not([class*="rounded-none"])').first()
        .evaluate(el => getComputedStyle(el).borderTopLeftRadius);
    console.log('BO GÓC — nút:', btn);
    expect(btn).toBe('8px');
    await page.screenshot({ path: 'test-results/chuan-b/modal.png' });
});
