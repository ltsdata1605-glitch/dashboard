import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Kiểm thử thực tế: Grid 1 cột và mỗi ô nhập liệu 1 dòng trên laptop', async ({ page }) => {
    test.setTimeout(60000);
    // Điều hướng vào view updater của BI Dashboard
    await page.goto('/?tab=employees&view=updater');

    // Chờ tiêu đề CẬP NHẬT DỮ LIỆU hoặc DOANH THU & THI ĐUA CỤM
    const mainTitle = page.locator('text=CẬP NHẬT DỮ LIỆU').first();
    await expect(mainTitle).toBeVisible({ timeout: 30000 });

    const cardTitle = page.locator('text=DOANH THU & THI ĐUA CỤM').first();
    await expect(cardTitle).toBeVisible({ timeout: 15000 });

    // Kiểm tra grid chứa Realtime và Luỹ kế trong DOANH THU HỢP NHẤT
    const realtimeTile = page.locator('.group\\/tile').filter({ hasText: /Realtime/i }).first();
    await expect(realtimeTile).toBeVisible();

    const gridInfo = await realtimeTile.evaluate(el => {
        const container = el.parentElement;
        const style = window.getComputedStyle(container!);
        return {
            className: container!.className,
            gridTemplateColumns: style.gridTemplateColumns,
            width: container!.clientWidth,
            tileWidth: el.clientWidth,
            tileHeight: el.clientHeight,
        };
    });

    console.log('Realtime Tile Grid Evaluation:', gridInfo);

    // Xác nhận gridTemplateColumns chỉ có 1 cột (1 giá trị px, không chia đôi)
    const colCount = gridInfo.gridTemplateColumns.trim().split(/\s+/).length;
    expect(colCount, 'Grid trong nhóm báo cáo phải là 1 cột').toBe(1);

    // Xác nhận chiều cao của tile gọn gàng dạng 1 dòng (dưới 65px khi không mở paste)
    expect(gridInfo.tileHeight, 'Mỗi ô nhập liệu dạng 1 dòng có chiều cao gọn gàng <= 65px').toBeLessThanOrEqual(65);

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: 'test-results/data-updater-grid-1col.png', fullPage: false });
    console.log('Đã chụp ảnh bằng chứng layout grid 1 cột tại test-results/data-updater-grid-1col.png');
});
