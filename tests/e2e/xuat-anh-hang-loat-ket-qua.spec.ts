import { expect, test } from '@playwright/test';

/**
 * Audit A02 (2026-09-29): In Sticker xuất ảnh hàng loạt — ảnh lỗi giữa chừng từng bị bỏ qua lặng
 * lẽ, cuối vòng vẫn trả `success:true, exportedCount: tổng` và app báo "Đã xuất thành công N file".
 *
 * Chạy THẲNG code thật trong Chromium (html-to-image thật, DOM thật). Lỗi được gây ra ở tầng thấp
 * nhất có thể — `HTMLCanvasElement.prototype.toBlob` trả null ở lượt chụp thứ 2 (giống trần canvas
 * của Safari iOS) — không giả lập hàm nào của app.
 */
test('Sticker: 1 ảnh lỗi giữa batch → báo đúng 2/3 ảnh, không còn DOM tạm', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
        const modPath = '/features/sticker-event/services/batchImageExportService.ts';
        const mod = (await import(/* @vite-ignore */ modPath)) as typeof import('../../features/sticker-event/services/batchImageExportService');

        let calls = 0;
        const realToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, ...rest: unknown[]) {
            calls++;
            if (calls === 2) { cb(null); return; }
            return realToBlob.call(this, cb, ...(rest as [string?, number?]));
        };

        const products = Array.from({ length: 125 }, (_, i) => ({
            msp: `10000${i + 1}`, sanPham: i === 3 ? 'Cáp <1m> & "sạc"' : `Sản phẩm ${i + 1}`,
            giaGiam: '100.000 đ', giaGoc: '150.000 đ', tongThuong: 5000, thuongERP: 3000, thuongNong: 2000,
            tonKho: 10, khuyenMai: '', ngayIn: '29/09/2026', selected: false, quantity: 1,
        }));

        const res = await mod.exportProductsInBatches(products as never, { chunkSize: 50, storeId: 'ST<1>' });
        HTMLCanvasElement.prototype.toBlob = realToBlob;
        return {
            res: JSON.parse(JSON.stringify(res)),
            leftover: document.querySelectorAll('.batch-export-container').length,
            overlayVisible: !!document.getElementById('export-overlay') && getComputedStyle(document.getElementById('export-overlay')!).display !== 'none',
        };
    });

    console.log('KẾT QUẢ BATCH STICKER:', JSON.stringify({ ...result.res, items: undefined }));
    expect(result.res.success).toBe(false);
    expect(result.res.batchCount).toBe(2);
    expect(result.res.exportedCount).toBe(75);
    expect(result.res.failed?.map((f: { batchNum: number }) => f.batchNum)).toEqual([2]);
    expect(result.leftover).toBe(0);
});
