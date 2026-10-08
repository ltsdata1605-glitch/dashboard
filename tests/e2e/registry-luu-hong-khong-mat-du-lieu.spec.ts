import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function fileBanHang(): Buffer {
    const ngay = '15/09/2026 09:30';
    const rows = [11, 22].map((trieu, i) => ({
        'Mã Đơn Hàng': `SO${i}`, 'Tên Sản Phẩm': 'Điện thoại iPhone', 'Tên Khách Hàng': 'KH', 'Số Lượng': 1,
        'Giá bán_1': trieu * 1_000_000, 'Giá bán': trieu * 1_000_000, 'Mã kho tạo': '90001', 'Kho tạo': 'Kho 90001',
        'Người tạo': `19500${i} - Nhân Viên ${i}`, 'Trạng thái xuất': 'Đã xuất', 'Ngày tạo': ngay, 'Thời gian hẹn giao': ngay,
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị', 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả',
        'Trạng thái thu tiền': 'Đã thu', 'Trạng thái hủy': 'Chưa hủy', 'Trạng thái hồ sơ': '1 - Mới',
        'Ngành Hàng': 'ICT', 'Nhóm Hàng': '1491', 'Nhà sản xuất': 'Khác', 'Mã sản phẩm': `SP${i}`,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Audit D11/DATA08 (2026-10-08): ghi "mục lục" tệp bán hàng (salesFilesRegistry) vào IndexedDB thất bại
 * (bộ nhớ đầy / bị từ chối) trước đây bị NUỐT — hàm vẫn resolve. Với đồng bộ bản cloud (ghi bản mới → đổi
 * registry → dọn bản cũ), bước dọn vẫn chạy trong khi registry còn trỏ BẢN CŨ → bản cũ bị xoá = mất dữ liệu.
 * Test trên IndexedDB thật của Chromium: giả lập QuotaExceededError chỉ đúng lúc ghi registry.
 */
const MOD = '/services/dbService.ts';

test('ghi registry hỏng khi đồng bộ bản cloud: báo lỗi, dữ liệu cũ còn nguyên, không để rác bản mới', async ({ page }) => {
    await page.goto('/');
    const kq = await page.evaluate(async (path) => {
        const db = await import(/* @vite-ignore */ path);
        const row = (ma: string) => ({ 'Mã Đơn Hàng': ma, 'Ngày tạo': '01/10/2026 09:00', 'Giá bán_1': 1_000_000 });
        // Dữ liệu cũ: 1 tệp lịch sử 2 dòng
        await db.saveSalesFileData('file_cu', [row('A'), row('B')]);
        await db.saveSalesFilesRegistry([{ id: 'file_cu', filename: 'cu.xlsx', rowCount: 2, savedAt: 1, fileLastModified: 1, isActive: true }]);
        const truoc = (await db.getMergedSalesData())?.data.length ?? 0;

        // Bộ nhớ "đầy" đúng lúc ghi registry (mọi lần thử)
        const goc = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
            if (key === 'salesFilesRegistry') throw new DOMException('Quota exceeded (giả lập)', 'QuotaExceededError');
            return goc.call(this, value, key);
        };
        let loi: string | null = null;
        try {
            await db.saveSyncCloudData([row('X'), row('Y'), row('Z')], 'cloud.xlsx', 2000, 2000);
        } catch (e) { loi = (e as Error).message; }
        IDBObjectStore.prototype.put = goc;

        const reg = await db.getSalesFilesRegistry();
        const sau = (await db.getMergedSalesData())?.data.length ?? 0;
        return {
            truoc, sau, loi,
            registry: reg.map((f: { id: string }) => f.id),
            fileCuCon: await db.checkSalesFileDataExists('file_cu'),
            racBanMoi: await db.checkSalesFileDataExists('cloud_sync_2000'),
        };
    }, MOD);
    console.log('Kết quả:', JSON.stringify(kq));
    expect(kq.truoc).toBe(2);
    expect(kq.loi, 'phải báo lỗi, không được im lặng').toContain('Không lưu được danh sách tệp');
    expect(kq.registry).toEqual(['file_cu']);
    expect(kq.fileCuCon, 'dữ liệu cũ KHÔNG được bị xoá').toBe(true);
    expect(kq.sau, 'mở lại vẫn thấy 2 dòng cũ').toBe(2);
    expect(kq.racBanMoi, 'bản mới không lên mục lục thì phải dọn').toBe(false);
});

test('nạp tệp Lũy kế lúc bộ nhớ đầy: hiện lỗi (không tung hoa "thành công"), không để rác dữ liệu tệp', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
        // Chỉ bật "bộ nhớ đầy" khi test bảo (sau khi app đã mở xong)
        const goc = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
            if ((window as unknown as { __dayBoNho?: boolean }).__dayBoNho && key === 'salesFilesRegistry') {
                throw new DOMException('Quota exceeded (giả lập)', 'QuotaExceededError');
            }
            return goc.call(this, value, key);
        };
    });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2000);
    await page.evaluate(() => { (window as unknown as { __dayBoNho: boolean }).__dayBoNho = true; });

    await page.locator('input[type="file"]').first().setInputFiles({ name: 'luyke.xlsx', mimeType: XLSX_MIME, buffer: fileBanHang() });
    await page.locator('[data-modal-overlay]').getByText('Lũy kế / Quá khứ').click();
    await page.getByPlaceholder('Nhập tên hiển thị...').fill('Tháng 9');
    await page.getByRole('button', { name: /Xác nhận đặt tên/ }).click();

    await expect(page.getByText(/Không lưu được danh sách tệp vào máy/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Đã tải lên và xử lý thành công/)).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('loi-luu.png') });

    const rac = await page.evaluate(async ([dbPath, scopePath]) => {
        const db = await import(/* @vite-ignore */ dbPath);
        const reg = await db.getSalesFilesRegistry();
        const { biHubDbName } = await import(/* @vite-ignore */ scopePath);
        const keys: string[] = await new Promise((res) => {
            const r = indexedDB.open(biHubDbName());
            r.onsuccess = () => {
                const d = r.result;
                const names = Array.from(d.objectStoreNames);
                const tx = d.transaction(names, 'readonly');
                const out: string[] = [];
                names.forEach((n) => { const q = tx.objectStore(n).getAllKeys(); q.onsuccess = () => out.push(...q.result.map(String)); });
                tx.oncomplete = () => { d.close(); res(out); };
            };
        });
        return { registry: reg.length, khoaTep: keys.filter((k) => k.includes('file_')) };
    }, [MOD, '/utils/localDbScope.ts'] as const);
    console.log('Sau lỗi lưu:', JSON.stringify(rac));
    expect(rac.registry).toBe(0);
    expect(rac.khoaTep, 'không còn dữ liệu tệp mồ côi').toEqual([]);
});
