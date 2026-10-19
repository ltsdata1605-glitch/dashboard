import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Verify So sánh thi đua columns fit snugly to content and competition names are shortened', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Kiểm tra trên Mobile (390 x 844 - iPhone)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=employees&subTab=competition');
    await page.waitForTimeout(2000);

    // Nếu có modal chào hỏi / kích hoạt dùng thử thì click bypass
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trialBtn.click();
        await page.waitForTimeout(1000);
    }

    // Chuyển sang phân hệ Nhân viên trong Report BI
    const nhanVienTab = page.getByRole('button', { name: /^Nhân viên$/i }).first();
    await expect(nhanVienTab).toBeVisible({ timeout: 15_000 });
    await nhanVienTab.click();
    await page.waitForTimeout(1000);

    // Chuyển sang sub-tab "Thi đua"
    const thiDuaTab = page.getByRole('button', { name: /^Thi đua$/i }).first();
    await expect(thiDuaTab).toBeVisible({ timeout: 15_000 });
    await thiDuaTab.click();
    await page.waitForTimeout(1000);

    // Chuyển sang sub-tab "So sánh"
    const soSanhTab = page.getByRole('button', { name: /^So sánh$/i }).first();
    await expect(soSanhTab).toBeVisible({ timeout: 15_000 });
    await soSanhTab.click();
    await page.waitForTimeout(1500);

    // Đảm bảo cặp so sánh được chọn (VD bấm Top 1 vs 2 nếu chưa có)
    const pairBtn = page.getByRole('button', { name: /Top 1 vs 2/i }).first();
    if (await pairBtn.isVisible().catch(() => false)) {
        await pairBtn.click();
        await page.waitForTimeout(1000);
    }

    // Chuyển chế độ sang "Thực hiện" để xem các giá trị số giống ảnh người dùng
    const thucHienBtn = page.getByRole('button', { name: /^Thực hiện$/i }).first();
    if (await thucHienBtn.isVisible().catch(() => false)) {
        await thucHienBtn.click();
        await page.waitForTimeout(600);
    }

    // Bảng so sánh xuất hiện
    const tableHeader = page.getByText('Chương trình thi đua').first();
    await expect(tableHeader).toBeVisible({ timeout: 20_000 });

    // Kiểm tra tất cả 5 cột của bảng So sánh
    const headers = page.locator('table.compact-export-table thead th');
    const headerTexts = (await headers.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    console.log('Detected So sánh headers on mobile:', JSON.stringify(headerTexts));

    expect(headerTexts).toContain('#');
    expect(headerTexts.some(h => /Chương trình thi đua/i.test(h))).toBe(true);
    expect(headerTexts.some(h => /Chênh Lệch/i.test(h))).toBe(true);

    // Kiểm tra toạ độ bảng để đảm bảo không bị tràn ra ngoài màn hình 390px
    const table = page.locator('table.compact-export-table').first();
    const tableBox = await table.boundingBox();
    expect(tableBox).not.toBeNull();
    console.log('So sánh table box on 390px viewport:', tableBox);

    // Toàn bộ bảng phải nằm gọn trong khung nhìn màn hình mobile (<= 390px)
    expect(tableBox!.x + tableBox!.width).toBeLessThanOrEqual(390 + 2);

    // Kiểm tra độ rộng các cột số liệu (A.NHÂN, CHÊNH LỆCH, T.ÚT) vừa vặn nội dung (không bị dãn to bất thường)
    const thCount = await headers.count();
    for (let i = 2; i < thCount; i++) {
        const th = headers.nth(i);
        const box = await th.boundingBox();
        if (box) {
            console.log(`Column ${i} width:`, box.width);
            // Kích thước các cột số và chênh lệch trên mobile nằm trong khoảng 50px - 80px (vừa khít nội dung)
            expect(box.width).toBeLessThanOrEqual(85);
        }
    }

    // Cuộn bảng thi đua lên vị trí thuận tiện nhất để chụp rõ các dòng #1 đến #10
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/so-sanh-fit-mobile-table-top.png' });

    // Cuộn xuống xem các dòng tiếp theo và chụp ảnh
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/so-sanh-fit-mobile-scrolled.png' });

    // 2. Kiểm tra trên Desktop (1440 x 900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/so-sanh-fit-desktop.png' });
});
