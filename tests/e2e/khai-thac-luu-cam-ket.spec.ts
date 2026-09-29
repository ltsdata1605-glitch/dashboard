import { expect, test } from '@playwright/test';

/**
 * Audit A30 (2026-09-29) — features/khai-thac/services/khaiThacDb.ts: promise ghi từng resolve ở
 * IDBRequest.onsuccess, CHƯA chờ transaction commit. Transaction bị huỷ sau đó (hết dung lượng,
 * trình duyệt đóng kết nối…) thì UI vẫn báo đã lưu, còn dữ liệu không nằm trên máy.
 * Giả lập đúng tình huống đó: huỷ transaction NGAY SAU khi request put báo thành công.
 */
test('lưu báo cáo: transaction bị huỷ sau khi put thành công → báo lỗi, không báo "đã lưu"', async ({ page }) => {
    await page.goto('/');
    const kq = await page.evaluate(async () => {
        const p = '/features/khai-thac/services/khaiThacDb.ts';
        const { khaiThacDb } = await import(/* @vite-ignore */ p) as typeof import('../../features/khai-thac/services/khaiThacDb');

        const w = window as unknown as { __abort?: string };
        const goc = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args: [unknown, IDBValidKey?]) {
            const req = goc.apply(this, args);
            // Chỉ phá đúng 1 lượt ghi của store `reports` trong YCX_KHAI_THAC_DB — app cũng tự ghi
            // IndexedDB khác lúc trang đang mở, phá nhầm lượt đó thì test chập chờn.
            if (this.name !== 'reports' || this.transaction.db.name !== 'YCX_KHAI_THAC_DB') return req;
            IDBObjectStore.prototype.put = goc;
            req.addEventListener('success', () => {
                try { req.transaction?.abort(); w.__abort = 'ok'; } catch (e) { w.__abort = 'throw ' + (e as Error).name; }
            });
            return req;
        };

        const report = { id: 'r-test-a30', date: '2026-09-29', savedAt: new Date().toISOString() } as never;
        let ketQua = 'đã lưu';
        try { await khaiThacDb.saveReport(report); } catch (e) { ketQua = 'lỗi: ' + (e as Error).name; }
        const conTrongMay = (await khaiThacDb.listReports()).some(r => r.id === 'r-test-a30');

        // Đường bình thường vẫn lưu được
        await khaiThacDb.saveReport({ ...(report as object), id: 'r-ok' } as never);
        const okLuuDuoc = (await khaiThacDb.listReports()).some(r => r.id === 'r-ok');
        await khaiThacDb.deleteReport('r-ok');
        return { ketQua, conTrongMay, okLuuDuoc, abort: w.__abort };
    });
    console.log('KẾT QUẢ A30:', JSON.stringify(kq));
    expect(kq.conTrongMay).toBe(false);               // dữ liệu thật sự KHÔNG được lưu
    expect(kq.ketQua).not.toBe('đã lưu');             // nên không được báo đã lưu
    expect(kq.okLuuDuoc).toBe(true);
});
