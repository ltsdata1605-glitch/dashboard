import { test, expect, hasRealDataProfile } from './helpers/realDataContext';

test.skip(!hasRealDataProfile(), 'Cần profile dữ liệu thật .e2e-chrome-profile');

test('Kiểm thử thực tế: Cột MỤC TIÊU được làm tròn lên (Math.ceil, không còn số thập phân)', async ({ page }) => {
    test.setTimeout(60000);

    // Mở trang Report BI tab Nhân viên
    await page.goto('/?tab=employees&view=employee');

    // Chờ giao diện Nhân Viên sẵn sàng
    const mainHeading = page.locator('text=Nhân Viên').first();
    await expect(mainHeading).toBeVisible({ timeout: 20000 });

    // Click vào tab "Thi đua"
    const thiDuaTab = page.locator('button, [role="tab"]').filter({ hasText: /^Thi đua$/i }).first();
    await expect(thiDuaTab).toBeVisible({ timeout: 10000 });
    await thiDuaTab.click();
    await page.waitForTimeout(500);

    // Chuyển sang sub-tab "Nhóm" nếu có
    const nhomTab = page.locator('button, a, span').filter({ hasText: /^Nhóm$/i }).first();
    if (await nhomTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nhomTab.click();
        await page.waitForTimeout(500);
    }

    // Chờ thẻ thi đua xuất hiện
    const cardTitle = page.locator('.competition-group-card').first();
    await expect(cardTitle).toBeVisible({ timeout: 20000 });

    // Lấy các giá trị trong cột M.TIÊU của các thẻ thi đua
    const targetCells = page.locator('.competition-group-card table tbody td:nth-child(2)');
    const count = await targetCells.count();
    console.log(`Tìm thấy ${count} ô trong cột M.TIÊU`);
    expect(count).toBeGreaterThan(0);

    const sampleValues: string[] = [];
    for (let i = 0; i < Math.min(count, 30); i++) {
        const text = (await targetCells.nth(i).innerText()).trim();
        if (text && text !== '-') {
            sampleValues.push(text);
            // Xác nhận không còn dấu phẩy thập phân (ví dụ: không còn 96,9 hay 2,8)
            expect(text, `Giá trị "${text}" trong cột M.TIÊU phải là số nguyên đã làm tròn lên`).not.toMatch(/,\d+$/);
        }
    }
    console.log('Mẫu các giá trị M.TIÊU sau khi làm tròn lên:', sampleValues.slice(0, 15));

    // Kiểm tra tiêu đề thẻ: phải luôn nằm trên 1 dòng duy nhất (chiều cao <= 30px, whiteSpace nowrap)
    const cardHeadings = page.locator('.competition-group-card h4');
    const headingCount = await cardHeadings.count();
    console.log(`Tìm thấy ${headingCount} tiêu đề thẻ thi đua`);
    for (let i = 0; i < Math.min(headingCount, 10); i++) {
        const heading = cardHeadings.nth(i);
        const style = await heading.evaluate(el => ({
            whiteSpace: window.getComputedStyle(el).whiteSpace,
            overflow: window.getComputedStyle(el).overflow,
            textOverflow: window.getComputedStyle(el).textOverflow,
            height: el.clientHeight,
            text: el.textContent?.trim()
        }));
        console.log(`Tiêu đề #${i + 1}: "${style.text}" - Height: ${style.height}px, whiteSpace: ${style.whiteSpace}`);
        expect(style.whiteSpace, 'Tiêu đề phải là nowrap').toBe('nowrap');
        expect(style.height, 'Tiêu đề chỉ hiển thị trên 1 dòng (height <= 30px)').toBeLessThanOrEqual(30);
    }

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: 'test-results/competition-target-roundup.png', fullPage: false });
    console.log('Đã lưu ảnh chụp kiểm chứng tại test-results/competition-target-roundup.png');
});
