import { expect, test, type Page } from '@playwright/test';
import { moCheckThuong, napFileThuong, taoFileThuong } from './helpers/checkThuongNative';

/**
 * Check Thưởng lưu được dữ liệu và tải lại vẫn còn (2026-09-27).
 * Lỗi cũ: mở `keyval-store` v1 KHÔNG tạo store → trên máy mới (hoặc sau khi đổi tài khoản / Safari iOS tự xoá dữ liệu web)
 * database bị tạo RỖNG, không bao giờ tạo được store `keyval` → mọi lần lưu/tải lỗi, tải lại trang là mất dữ liệu.
 * Bản React (chủ dự án viết lại 2026-10-11) VẪN đọc kho cũ này qua `services/checkThuongIframeService.ts → getUnifiedCheckThuongData`
 * (có tự vá kho rỗng) nên kịch bản "kho đã bị tạo rỗng từ trước" vẫn phải chạy. GĐ7 (2026-10-13): chuyển sang bản React.
 * Không trang nào được gọi CDN idb-keyval (thẻ script chặn hiển thị — đã bỏ ở GĐ2).
 */

const chuanBi = async (page: Page, goiCdnIdb: string[]) => {
    await page.route('https://cdn.jsdelivr.net/npm/idb-keyval**', r => { goiCdnIdb.push(r.request().url()); return r.abort(); });
};

for (const hongSan of [false, true]) {
    test(`bộ lưu của trang — ${hongSan ? 'database đã bị tạo rỗng từ trước' : 'máy mới'}: lưu được, tải lại vẫn còn`, async ({ page }) => {
        test.setTimeout(120_000);
        const goiCdnIdb: string[] = [];
        await chuanBi(page, goiCdnIdb);
        const loi: string[] = [];
        page.on('console', m => { if (/object store|Lưu mã kho thất bại|Không lưu được/.test(m.text())) loi.push(m.text()); });
        if (hongSan) {
            // Tái hiện đúng hậu quả của mã cũ: keyval-store v1 KHÔNG có store nào
            await page.goto('/?tab=help');
            await page.evaluate(() => new Promise(r => { const q = indexedDB.open('keyval-store', 1); q.onsuccess = () => { q.result.close(); r(null); }; }));
        }
        await moCheckThuong(page);
        await napFileThuong(page, taoFileThuong());
        await page.waitForTimeout(1500);
        await expect(page.getByText(/Không lưu được/)).toHaveCount(0);

        await page.reload();
        await expect(page.getByText('Kết quả tra cứu').first(), 'tải lại trang là mất dữ liệu Check Thưởng').toBeVisible({ timeout: 20_000 });
        expect(loi, 'còn lỗi lưu/tải IndexedDB').toEqual([]);
        expect(goiCdnIdb, 'trang vẫn gọi CDN idb-keyval').toEqual([]);
    });
}
