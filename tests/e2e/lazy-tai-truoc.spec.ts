import { test, expect } from '@playwright/test';

/**
 * utils/lazyWithRetry `.preload()` (GĐ9 2026-10-14 — chuyển tab ≤ 0,3 s): module đã tải trước thì lần gắn đầu vẽ component
 * thật NGAY (không treo Suspense, không vòng quay, không bị React giữ màn chờ 300 ms) — đã thử: bỏ đường preload (luôn đi
 * React.lazy) thì test ĐỎ ở bước "màn chờ". Ngoài ra khoá: cả 2 đường (gắn trước khi module về / gắn sau preload) vẽ lại nhiều
 * lần KHÔNG bị gỡ-gắn-lại (mã ngẫu nhiên mỗi lần gắn giữ nguyên = trạng thái tab còn). Ghi chú: bản "đổi loại phần tử theo
 * daNap ở mỗi lần vẽ" cũng xanh ở đây vì React gắn MỚI cây con bị treo khi thử lại — wrapper vẫn chốt loại phần tử một lần lúc
 * gắn (useState) để bất biến đó không phụ thuộc chi tiết nội bộ của React.
 */
test('lazyWithRetry: đường lazy không gắn lại sau khi module về; đường preload vẽ ngay, không qua màn chờ', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const m = await import('/tests/e2e/helpers/lazyWithRetryHarness.tsx' as string);
        await m.mount();
    });
    const w = (fn: string) => page.evaluate((f) => (window as unknown as Record<string, () => void>)[f](), fn);

    // Đường React.lazy: chưa có module → màn chờ; module về → nội dung.
    await expect(page.getByTestId('cho-cham')).toBeVisible();
    await w('__moKhoa');
    await expect(page.getByTestId('cham')).toHaveText('cham 0');
    const maCham = await page.getByTestId('cham').getAttribute('data-ma');
    for (let i = 1; i <= 3; i++) {
        await w('__veLai');
        await expect(page.getByTestId('cham')).toHaveText(`cham ${i}`);
    }
    expect(await page.getByTestId('cham').getAttribute('data-ma'), 'đường lazy bị gắn lại (mất trạng thái) sau khi module về').toBe(maCham);

    // Đường preload: gắn sau khi module đã tải → không bao giờ thấy màn chờ, vẽ lại không gắn lại.
    await page.evaluate(() => {
        const w = window as unknown as { __thayCho: boolean };
        w.__thayCho = false;
        new MutationObserver(() => { if (document.querySelector('[data-testid="cho-tai-truoc"]')) w.__thayCho = true; })
            .observe(document.body, { childList: true, subtree: true });
    });
    await w('__hienTaiTruoc');
    await expect(page.getByTestId('tai-truoc')).toHaveText('tai-truoc 3');
    const maTaiTruoc = await page.getByTestId('tai-truoc').getAttribute('data-ma');
    await w('__veLai');
    await expect(page.getByTestId('tai-truoc')).toHaveText('tai-truoc 4');
    expect(await page.getByTestId('tai-truoc').getAttribute('data-ma')).toBe(maTaiTruoc);
    expect(await page.evaluate(() => (window as unknown as { __thayCho: boolean }).__thayCho), 'đã preload mà vẫn hiện màn chờ Suspense').toBe(false);
});
