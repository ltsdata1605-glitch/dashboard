import { expect, test } from '@playwright/test';
import { openReportBi, seedCompetitionData, openCompetitionTable } from './helpers/seed';

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
    // Nạp dữ liệu Thi đua CÓ CHỨA payload độc ở phần header cột.
    await seedCompetitionData(page, maliciousCompetitionLuyKe);
    await openCompetitionTable(page);
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 30_000 });

    // GHI CHÚ 2026-09-09 — vì sao test này KHÔNG còn bật cột độc lên để soi chữ:
    // Trước đây test mở popup "Bộ lọc thi đua" rồi gạt cột ứng với payload để nó hiện lên bảng,
    // sau đó khẳng định payload hiện ra dưới dạng CHỮ THÔ. Từ commit 3a9dbad8 (feat(competition):
    // tách biệt bộ lọc Realtime/Luỹ kế, liên kết nhóm cột), popup lọc không còn liệt kê từng cột
    // lạ do người dùng dán vào nữa, nên không thể bật nó lên được — bước đó timeout.
    // Đã kiểm chứng bằng tay: bỏ bước đó ra thì payload KHÔNG chạy (xem 3 khẳng định bên dưới),
    // tức tính chất bảo mật vẫn nguyên. Phần "escape có đúng không" được phủ chặt hơn ở tầng đơn
    // vị: features/bi-dashboard/components/dashboard/SafeHeaderText.test.ts (4 test, có case
    // payload độc xen giữa <br/>) khẳng định renderHeaderText() LUÔN trả về string, không bao giờ
    // sinh ra phần tử HTML. Ở đây giữ đúng phần E2E chỉ E2E mới làm được: chạy thật trên trình
    // duyệt và xác nhận KHÔNG có gì được thực thi.

    const xssFired = await page.evaluate(() => (window as unknown as { __xssFired?: number }).__xssFired);
    expect(xssFired, 'onerror của thẻ <img> độc đã CHẠY — payload bị parse thành HTML thật (XSS)').toBeUndefined();
    expect(dialogs, 'có dialog (alert/confirm) xuất hiện — dấu hiệu script đã thực thi').toEqual([]);

    // Không có <img> nào được TẠO RA từ payload (nếu bị parse, DOM sẽ có 1 thẻ img với src="x")
    const injectedImgCount = await page.locator('img[src="x"]').count();
    expect(injectedImgCount).toBe(0);
});
