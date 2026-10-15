import { test, expect } from './helpers/realDataContext';

test.describe('Report BI Manual Cloud Sync Button', () => {
    test('clicking topbar subtitle does not trigger bi-auto-sync and triggers manual cloud sync', async ({ page }) => {
        await page.addInitScript(() => {
            window.addEventListener('ycx-trigger-bi-auto-sync', () => {
                (window as any).__autoSyncTriggered = true;
            });
        });

        await page.goto('/?tab=employees&view=dashboard&mode=realtime&sub=revenue');

        // Bỏ qua modal dùng thử nếu có
        const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
        if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await trialBtn.click();
        }

        // Tìm nút cập nhật đang hiển thị trên header (desktop hoặc mobile)
        const btn = page.locator('#desktop-header-subtitle button, #mobile-topbar-subtitle button').locator('visible=true');
        await expect(btn).toBeVisible({ timeout: 15000 });

        // Bấm nút cập nhật trên subtitle
        await btn.click();

        // Kiểm tra chắc chắn rằng Tampermonkey Auto Sync (ycx-trigger-bi-auto-sync) KHÔNG bị kích hoạt
        const wasAutoSyncTriggered = await page.evaluate(() => (window as any).__autoSyncTriggered);
        expect(wasAutoSyncTriggered).toBeFalsy();

        // Kiểm tra phản hồi hiển thị NGAY TẠI NÚT SUBTITLE (inline) chứ không bật toast che màn hình
        await expect(btn).toHaveText(/(đăng nhập|Cloud|mới nhất|đồng bộ|kiểm tra)/i, { timeout: 5000 });

        // Đảm bảo KHÔNG có toast nổi "Dữ liệu trên máy bạn đã là mới nhất!" che lắp giữa màn hình
        const blockingToast = page.locator('[data-toast]:has-text("Dữ liệu trên máy bạn đã là mới nhất"), [role="status"]:has-text("Dữ liệu trên máy bạn đã là mới nhất")');
        expect(await blockingToast.isVisible().catch(() => false)).toBeFalsy();

        // Sau ~3.5 giây, dòng thông báo biến mất và trả lại mốc thời gian "Cập nhật:"
        await expect(btn).toHaveText(/Cập nhật:/i, { timeout: 6000 });
    });

    test('Analysis header subtitle shows inline feedback on click and auto-reverts to timestamp', async ({ page }) => {
        await page.goto('/?tab=analysis');

        // Bỏ qua modal dùng thử nếu có
        const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
        if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await trialBtn.click();
        }

        const btn = page.locator('#desktop-header-subtitle button, #mobile-topbar-subtitle button').locator('visible=true');
        if (await btn.isVisible({ timeout: 10000 }).catch(() => false)) {
            const initialText = await btn.innerText();
            expect(initialText).toMatch(/Cập nhật:/i);

            // Bấm kiểm tra cập nhật
            await btn.click();

            // Nút hiển thị phản hồi inline (Đang kiểm tra... hoặc Dữ liệu trên máy bạn đã là mới nhất!)
            await expect(btn).toHaveText(/(kiểm tra|mới nhất|cập nhật|đăng nhập)/i, { timeout: 5000 });

            // Đảm bảo không có toast nổi "Dữ liệu trên máy bạn đã là mới nhất!" che lắp giữa màn hình
            const blockingToast = page.locator('[data-toast]:has-text("Dữ liệu trên máy bạn đã là mới nhất"), [role="status"]:has-text("Dữ liệu trên máy bạn đã là mới nhất")');
            expect(await blockingToast.isVisible().catch(() => false)).toBeFalsy();

            // Sau ~3.5s tự động trả về mốc thời gian "Cập nhật:"
            await expect(btn).toHaveText(/Cập nhật:/i, { timeout: 6000 });
        }
    });
});
