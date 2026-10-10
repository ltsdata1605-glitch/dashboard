import { test, expect } from '@playwright/test';

test.describe('Cloud Sync Toast Notice', () => {
    test('không chiếm chỗ dòng thông báo trong layout giao diện', async ({ page }) => {
        await page.goto('http://127.0.0.1:5173/?tab=analysis');
        await page.waitForLoadState('domcontentloaded');

        // Đảm bảo không có phần tử dòng thông báo cố định chiếm chỗ trên layout
        const lineNotice = page.locator('div:has-text("Đã tự động đồng bộ dữ liệu đám mây"):not([role="status"])');
        const count = await lineNotice.count();
        expect(count).toBe(0);
    });
});
