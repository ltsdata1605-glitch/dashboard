import { expect, test } from '@playwright/test';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';

/**
 * Audit A24 (2026-09-30) — Check thưởng trên iPhone (390px): trang ẩn tràn ngang (`overflow-x: hidden`) nên nội dung rộng hơn
 * màn hình có thể bị CẮT MẤT mà không ai thấy. Đo hộp bao của từng phần tử (không chỉ scrollWidth toàn trang): phần tử nào vượt
 * mép phải mà KHÔNG nằm trong vùng cuộn ngang thật là bị cắt. Modal phải vừa chiều cao nhìn thấy, không vượt mép dưới.
 * GĐ7 (2026-10-13): chuyển sang bản React (bản iframe `check-thuong.html` đã bỏ). Chromium giả lập — không phải Safari thật.
 */
test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

test('Check thưởng 390px: không nội dung nào bị cắt ngang; modal vừa màn hình', async ({ page }) => {
    test.setTimeout(120_000);
    await moCheckThuong(page);
    // Tên siêu thị rất dài + 8 ngành hàng (có tên dài) — dễ tràn nhất
    await napFileThuong(page, taoFileThuong(
        ['910 - ĐML Hùng Vương - Quận Bình Thạnh - TP Hồ Chí Minh', '911 - ĐML Tân Hiệp'],
        ['ICT', 'Phụ kiện', 'Gia dụng', 'Điện lạnh', 'Điện tử', 'Máy lọc nước', 'Đồng hồ thông minh', 'Laptop'],
    ));
    await page.waitForTimeout(800);

    const biCat = await page.locator('main').evaluate((main) => {
        const W = document.documentElement.clientWidth;
        const trongVungCuon = (el: Element) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
                const ox = getComputedStyle(p).overflowX;
                if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth) return true;
            }
            return false;
        };
        const out: string[] = [];
        main.querySelectorAll('*').forEach(el => {
            if (el.closest('[data-app-chrome]')) return; // thanh trên/thanh tab đo ở apple-tuong-thich
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            if (r.right > W + 1 && !trongVungCuon(el)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} phải=${Math.round(r.right)} > ${W}`);
        });
        return out;
    });
    console.log('BỊ CẮT:', JSON.stringify(biCat.slice(0, 15)), 'tổng', biCat.length);
    expect(biCat, 'phần tử vượt mép phải mà không cuộn được → bị cắt mất').toEqual([]);

    // Modal bảng xếp hạng: bấm dòng ngành hàng đầu tiên, hộp thoại phải nằm trọn trong chiều cao nhìn thấy
    await page.locator('tr:has-text("#1")').first().click();
    const hop = page.getByRole('dialog');
    await expect(hop).toBeVisible();
    const r = (await hop.boundingBox())!;
    const cao = await page.evaluate(() => window.innerHeight);
    console.log('MODAL:', JSON.stringify({ day: Math.round(r.y + r.height), cao }));
    expect(r.y + r.height).toBeLessThanOrEqual(cao + 1);
    expect(r.x + r.width).toBeLessThanOrEqual(390 + 1);
});
