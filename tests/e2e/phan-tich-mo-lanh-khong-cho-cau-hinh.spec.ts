import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Lần mở ĐẦU trên máy mới (IndexedDB chưa có cấu hình ngành hàng) và chưa có dữ liệu: màn tải tệp của Phân tích phải hiện NGAY,
 * không chờ tải cấu hình (2026-10-22, chủ dự án duyệt). Trước: `loadInitialData` chờ Firestore tới 5 s (+ Google Sheet — nguồn đã
 * bỏ cùng ngày) mới hiện màn — đo bản build giả lập iPhone 4G: ~4,4 s.
 * Ở đây Firestore TREO (không trả lời) để chứng minh màn không còn phụ thuộc nó. Bước 2: tải tệp lúc cấu hình còn treo → "mạng
 * lành lại" (request đi tiếp tới Firestore thật như mọi bài Phân tích khác) → effect xử lý tự tải lại cấu hình rồi ra bảng.
 */
test.use({
    viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

test('máy mới, chưa có dữ liệu: màn tải tệp hiện ngay dù cấu hình ngành hàng tải treo', async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addInitScript(() => {
        try { localStorage.setItem('ycx_demo_mode', 'true'); } catch { /* */ }
        // Ghi lại nếu lớp chờ từng hiện "Đang tải cấu hình ngành hàng…" (code cũ hiện suốt lúc chờ Firestore tới 5 s).
        const w = window as unknown as { __choCauHinh?: boolean };
        new MutationObserver(() => {
            if (!w.__choCauHinh && /cấu hình ngành hàng từ Cloud/i.test(document.body?.innerText || '')) w.__choCauHinh = true;
        }).observe(document, { childList: true, subtree: true, characterData: true });
    });
    let treo = true;
    await page.route('**://firestore.googleapis.com/**', async (route) => {
        while (treo) await new Promise((r) => setTimeout(r, 200));
        await route.fallback().catch(() => {});
    });

    const t0 = Date.now();
    await page.goto('/?tab=analysis');
    await expect(page.getByText('Phân tích siêu tốc.').first()).toBeVisible({ timeout: 15_000 });
    // Đo 22/10 (dev server): 1,4 s nóng · 3,7 s nguội; code cũ 8,9 s. Không đặt ngưỡng giờ (tốc độ máy CI dao động) — phép kiểm
    // quyết định là lớp chờ "Đang tải cấu hình ngành hàng…" KHÔNG từng hiện (code cũ: đỏ đúng ở đây).
    console.log('màn tải tệp hiện sau', Date.now() - t0, 'ms');
    expect(await page.evaluate(() => !!(window as unknown as { __choCauHinh?: boolean }).__choCauHinh), 'không được chờ tải cấu hình').toBe(false);

    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').first().tap();
    await page.waitForTimeout(1500);
    treo = false;
    await expect(page.getByText(/Doanh Thu/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Không tải được cấu hình ngành hàng/)).toHaveCount(0);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
});
