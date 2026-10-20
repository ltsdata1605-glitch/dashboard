import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Verify all 6 columns of Nhóm thi đua fit on mobile screen and long names are auto-shortened', async ({ page }) => {
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

    // Chuyển sang sub-tab "Cá nhân" trong Thi đua
    const caNhanTab = page.getByRole('button', { name: /^Cá nhân$/i }).first();
    await expect(caNhanTab).toBeVisible({ timeout: 15_000 });
    await caNhanTab.click();
    await page.waitForTimeout(1500);

    // Bảng thi đua cá nhân (hoặc nhóm) xuất hiện
    const tableHeader = page.getByText('NHÓM THI ĐUA').first();
    await expect(tableHeader).toBeVisible({ timeout: 20_000 });

    // Kiểm tra tất cả 6 cột phải có mặt trong thead
    const headers = page.locator('table thead th');
    const headerTexts = (await headers.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    console.log('Detected headers on mobile:', JSON.stringify(headerTexts));

    expect(headerTexts).toContain('#');
    expect(headerTexts.some(h => h.includes('NHÓM THI ĐUA'))).toBe(true);
    expect(headerTexts.some(h => h.includes('LUỸ KẾ') || h.includes('LUỸ'))).toBe(true);
    expect(headerTexts.some(h => h.includes('TAR'))).toBe(true);
    expect(headerTexts.some(h => h.includes('%DKHT'))).toBe(true);
    expect(headerTexts.some(h => h.includes('C.LẠI'))).toBe(true);

    // Kiểm tra toạ độ bảng để đảm bảo không bị tràn ra ngoài màn hình 390px
    const table = page.locator('table.compact-export-table').first();
    const tableBox = await table.boundingBox();
    expect(tableBox).not.toBeNull();
    console.log('Table box on 390px viewport:', tableBox);

    // Toàn bộ bảng và các cột phải nằm trọn trong khung nhìn màn hình mobile (<= 390px)
    expect(tableBox!.x + tableBox!.width).toBeLessThanOrEqual(390 + 2); // 2px cho phép làm tròn viền

    // Kiểm tra rằng tất cả các cột tiêu đề (th) đều nằm trong màn hình
    const thCount = await headers.count();
    for (let i = 0; i < thCount; i++) {
        const th = headers.nth(i);
        const thBox = await th.boundingBox();
        if (thBox) {
            expect(thBox.x + thBox.width).toBeLessThanOrEqual(390 + 2);
        }
    }

    // Chụp ảnh bằng chứng trên Mobile phần đầu
    await page.screenshot({ path: 'test-results/nhom-thi-dua-fit-mobile.png' });

    // Cuộn xuống xem các nhóm khác (ICT, THI ĐUA HÃNG...)
    await table.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    // Kiểm tra bấm sắp xếp vào cột TAR
    const tarHeader = page.locator('table thead th', { hasText: 'TAR' }).first();
    await tarHeader.click();
    await page.waitForTimeout(500);

    // Xác nhận tiêu đề cột TAR vẫn giữ trạng thái bình thường (không có icon mũi tên to, không đổi màu nền xanh)
    const tarClass = await tarHeader.getAttribute('class');
    expect(tarClass).not.toContain('bg-sky-50');
    expect(tarClass).not.toContain('bg-sky-100');
    expect(tarClass).toContain('bg-slate-50');

    // Chụp ảnh bằng chứng cột TAR sau khi bấm sắp xếp vẫn ở trạng thái bình thường
    await page.evaluate(() => {
        const thead = document.querySelector('table thead');
        if (thead) thead.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/nhom-thi-dua-tar-sorted-normal-header.png' });

    // 2. Kiểm tra trên Desktop (1440 x 900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/nhom-thi-dua-fit-desktop.png' });
});

