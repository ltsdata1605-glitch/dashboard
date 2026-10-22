import { test, expect } from '@playwright/test';

test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
});

test('Chuyển chức năng Báo cáo lên nhóm Công cụ trong sheet Thêm mobile', async ({ page }) => {
    await page.goto('/?tab=analysis');
    
    // Kích hoạt chế độ dùng thử nếu ở màn Login
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    await demo.click({ timeout: 15000 });

    // Nút "Khác" trên thanh tab dưới
    const moreBtn = page.getByRole('button', { name: 'Khác' });
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();

    // Chờ sheet "Thêm" mở ra
    const dialog = page.getByRole('dialog', { name: 'Thêm' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Xác nhận nhóm Công cụ có heading và nút Báo cáo
    await expect(dialog.getByRole('heading', { name: 'Công cụ' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Báo cáo' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'In Sticker' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Phân ca' })).toBeVisible();

    // Xác nhận nhóm Hệ thống có heading và các nút
    await expect(dialog.getByRole('heading', { name: 'Hệ thống' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Phân quyền' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Giới thiệu' })).toBeVisible();

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/bao-cao-chuyen-len-nhom-cong-cu.png' });
});
