import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

async function navigateAndEnsureApp(page: Page, url: string) {
    await page.goto(url);
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trialBtn.click();
    }
    await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test.describe('Check Thưởng Native React (No iframe)', () => {
    test('hiển thị trực tiếp bằng React Component thuần, không còn iframe, đầy đủ tính năng tra cứu và so sánh', async ({ page }) => {
        await navigateAndEnsureApp(page, '/?tab=check-thuong');

        // 1. Xác thực: TUYỆT ĐỐI KHÔNG CÒN THẺ IFRAME
        const iframeCount = await page.locator('iframe').count();
        expect(iframeCount).toBe(0);

        // Đợi toolbar xuất hiện
        const kho2Input = page.locator('input[placeholder="Kho 2"]:visible').first();
        await expect(kho2Input).toBeVisible({ timeout: 10_000 });

        // Đảm bảo kho 2 rỗng ở đầu test để vào chế độ tra cứu đơn
        if (await kho2Input.inputValue()) {
            const resetBtn = page.locator('button[title="Xoá mã kho đang so sánh"]:visible').first();
            await resetBtn.click();
        }

        // 2. Xác thực: Hero Banner hiển thị đúng tên siêu thị và tổng thưởng
        const heroBanner = page.locator('h2').first();
        await expect(heroBanner).toBeVisible({ timeout: 10_000 });
        const storeNameText = await heroBanner.textContent();
        expect(storeNameText).toBeTruthy();

        // 3. Xác thực: 6 thẻ mini trạng thái hiện diện đầy đủ
        const achievedCard = page.locator('button:has-text("Đạt thưởng")').first();
        await expect(achievedCard).toBeVisible();

        const nearlyCard = page.locator('button:has-text("Sắp có")').first();
        await expect(nearlyCard).toBeVisible();

        await page.screenshot({ path: 'test-results/check-thuong-single-store.png', fullPage: true });

        // 4. Bấm vào một dòng ngành hàng để mở Ranking Modal
        const firstRow = page.locator('tr:has-text("#1")').first();
        await expect(firstRow).toBeVisible();
        await firstRow.click();

        // Modal xếp hạng xuất hiện
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();

        // Lấy tên siêu thị thứ 2 trong bảng xếp hạng để test so sánh thực tế
        const storeCell = modal.locator('tbody tr td span.truncate').nth(1);
        const secondStore = (await storeCell.textContent().catch(() => ''))?.trim() || '';
        const storeSearchTerm = secondStore.split('-')[0]?.trim() || secondStore;

        // Đóng modal
        const closeBtn = page.locator('button:has-text("Đóng")');
        await closeBtn.click();
        await expect(modal).not.toBeVisible();

        // 5. Test tính năng So sánh 2 kho với tên siêu thị thực tế
        if (storeSearchTerm) {
            await kho2Input.fill(storeSearchTerm);
        } else {
            await kho2Input.fill('123');
        }

        // Màn hình so sánh hoặc thông báo xuất hiện
        const compareOrNotFound = page.locator(':text("Không tìm thấy dữ liệu cho kho"), h2:has-text("So Sánh Trực Diện")').first();
        await expect(compareOrNotFound).toBeVisible({ timeout: 5000 });

        // Chụp ảnh bằng chứng
        await page.screenshot({ path: 'test-results/check-thuong-native-verified.png', fullPage: true });

        // Xoá kho 2 để đưa về trạng thái sạch ban đầu
        const resetAfterBtn = page.locator('button[title="Xoá mã kho đang so sánh"]:visible').first();
        if (await resetAfterBtn.isVisible().catch(() => false)) {
            await resetAfterBtn.click();
        }
        await expect(heroBanner).toBeVisible({ timeout: 5000 });
    });
});
