import { expect, test } from '@playwright/test';
import { openReportBi, pasteIntoTile, SUMMARY_LUYKE, SUMMARY_REALTIME } from './helpers/seed';

/**
 * Kiểm chứng fix bảo mật Đợt 2 (KE_HOACH_TONG_THE.md mục 2.3): trước đây bảng Thi đua render tên
 * cột qua `dangerouslySetInnerHTML={{ __html: mapping[header] || header }}` — khi cột không khớp
 * bảng ánh xạ cố định (luôn đúng với bất kỳ nội dung nào không có sẵn trong code), chuỗi THÔ từ
 * dữ liệu Thi đua NGƯỜI DÙNG DÁN VÀO được render thẳng làm HTML (XSS lưu trữ). Đã thay bằng
 * `renderHeaderText()` (features/bi-dashboard/components/dashboard/SafeHeaderText.tsx) — test này
 * dán thẳng 1 payload độc qua UI thật (đúng đường ClipboardEvent người dùng thật sẽ dùng) và xác
 * nhận nó KHÔNG được thực thi.
 */
test('dán tên cột chứa HTML/script độc vào dữ liệu Thi đua KHÔNG thực thi trên trang', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    const maliciousHeader = '<img src=x onerror="window.__xssFired=(window.__xssFired||0)+1">';
    const maliciousCompetitionLuyKe = [
        'Chương trình thi đua tháng 9',
        `VAS\tSLLK\tTarget\t${maliciousHeader}`,
        'ĐML_STR_STR - 99 Hùng Vương\t224\t39\t574\t1',
        'Tổng\t224\t39\t574\t1',
    ].join('\n');

    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click(); // openReportBi() chỉ chờ nút hiện ra, chưa bấm
    await pasteIntoTile(page, 'Báo cáo Tổng hợp', 'Realtime', SUMMARY_REALTIME);
    await pasteIntoTile(page, 'Báo cáo Tổng hợp', 'Luỹ kế', SUMMARY_LUYKE);
    await pasteIntoTile(page, 'Thi đua Cụm', 'Luỹ kế', maliciousCompetitionLuyKe);

    await page.getByRole('button', { name: /Tổng quan/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('Luỹ kế', { exact: true }).first().click();
    if (!(await page.getByText('NHÓM THI ĐUA').isVisible().catch(() => false))) {
        const picker = page.getByText('CỤM', { exact: true }).first();
        if (await picker.isVisible().catch(() => false)) {
            await picker.click();
            await page.locator('[role="button"]').filter({ hasNotText: 'Chọn tất cả' }).first().click();
            await page.keyboard.press('Escape');
        }
    }
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });

    // Cột ứng với header độc không nằm trong bộ cột MẶC ĐỊNH đang bật (cấu hình lưu từ trước) nên
    // chưa hiện trên bảng — mở popup "Bộ lọc thi đua" và bật nó lên. Popup này render tên cột làm
    // text con bình thường (không dangerouslySetInnerHTML) nên tìm bằng 1 đoạn đầu của payload.
    await page.getByTitle(/Bộ lọc thi đua/i).click();
    await page.getByText('<img src=x', { exact: false }).first()
        .locator('xpath=ancestor::div[.//*[@role="switch"]][1]')
        .getByRole('switch')
        .click();
    await page.keyboard.press('Escape');

    // Payload phải hiện ra làm CHỮ thô trên trang (header cột ứng với payload độc), không phải
    // bị trình duyệt diễn giải thành ảnh — getByText tìm theo text node, không khớp DOM element.
    await expect(page.getByText(maliciousHeader, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    const xssFired = await page.evaluate(() => (window as unknown as { __xssFired?: number }).__xssFired);
    expect(xssFired, 'onerror của thẻ <img> độc đã CHẠY — payload bị parse thành HTML thật (XSS)').toBeUndefined();
    expect(dialogs, 'có dialog (alert/confirm) xuất hiện — dấu hiệu script đã thực thi').toEqual([]);

    // Không có <img> nào được TẠO RA từ payload (nếu bị parse, DOM sẽ có 1 thẻ img với src="x")
    const injectedImgCount = await page.locator('img[src="x"]').count();
    expect(injectedImgCount).toBe(0);
});
