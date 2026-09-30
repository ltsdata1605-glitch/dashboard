import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);

/**
 * Đợt 6 (2026-09-30): nạp tệp Phân tích — Worker đọc tệp gửi khúc JSON UTF-8, lúc lưu các khúc đi
 * sang `salesJsonWriter.worker.ts` ghi IndexedDB ngoài luồng chính (bỏ JSON.stringify ~1,4s ở
 * 200.000 dòng). Kiểm: (1) đúng là Worker ghi đã chạy và ghi xong, không rơi về đường cũ;
 * (2) chuỗi lưu đúng định dạng cũ, đọc lại sau khi TẢI LẠI TRANG ra đúng số liệu;
 * (3) chặn Worker ghi → vẫn lưu được bằng đường cũ; (4) nhánh Lũy kế (salesData_<id>).
 */
const today = new Date();
const ngay = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} 09:30`;

function taoFileBanHang(): string {
    const rows = [11, 22, 33].map((trieu, i) => ({
        'Mã Đơn Hàng': `SO${i}`, 'Tên Sản Phẩm': 'Điện thoại iPhone', 'Tên Khách Hàng': 'KH "Đặc biệt" \\', 'Số Lượng': 1,
        'Giá bán_1': trieu * 1_000_000, 'Giá bán': trieu * 1_000_000, 'Mã kho tạo': `9000${i}`, 'Kho tạo': `Kho 9000${i}`,
        'Người tạo': `19500${i} - Nhân Viên ${i}`, 'Trạng thái xuất': 'Đã xuất', 'Ngày tạo': ngay, 'Thời gian hẹn giao': ngay,
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị', 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả',
        'Trạng thái thu tiền': 'Đã thu', 'Trạng thái hủy': 'Chưa hủy', 'Trạng thái hồ sơ': '1 - Mới',
        'Ngành Hàng': 'ICT', 'Nhóm Hàng': '1491', 'Nhà sản xuất': 'Khác', 'Mã sản phẩm': `SP${i}`,
    }));
    const file = join(mkdtempSync(join(tmpdir(), 'ycx-luu-')), 'sales.xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
    XLSX.writeFile(wb, file);
    return file;
}

function taoCauHinh(): Buffer {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['NhomCha', 'NhomCon', 'NhomHang'], ['ICT', 'Smartphone', '1491']]), 'Ngành hàng');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Hình thức xuất', 'Tính doanh thu', 'Hình thức'], ['Xuất bán hàng tại siêu thị', 'Có', 'Tiền mặt']]), 'Hình thức xuất');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Ghi lại mọi Worker được tạo (URL) + tin nhắn Worker ghi trả về; tuỳ chọn chặn Worker ghi. */
async function chuanBi(page: Page, chanWorkerGhi = false) {
    const cauHinh = taoCauHinh();
    await page.route('**://docs.google.com/**', r => r.fulfill({
        status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: cauHinh,
    }));
    await page.addInitScript((chan) => {
        const w = window as unknown as { __workers: string[]; __ghi: unknown[] };
        w.__workers = [];
        w.__ghi = [];
        const RealWorker = window.Worker;
        window.Worker = class extends RealWorker {
            constructor(url: string | URL, opts?: WorkerOptions) {
                const u = String(url);
                const laWorkerGhi = /salesJsonWriter/.test(u) || (opts?.name || '').includes('salesJsonWriter');
                if (chan && laWorkerGhi) throw new Error('chặn Worker ghi (test)');
                super(url, opts);
                w.__workers.push(u);
                if (laWorkerGhi) this.addEventListener('message', (e: MessageEvent) => w.__ghi.push(e.data));
            }
        } as typeof Worker;
    }, chanWorkerGhi);
    const canhBao: string[] = [];
    page.on('console', m => { if (/\[IDB\]/.test(m.text())) canhBao.push(m.text()); });
    return canhBao;
}

async function napTep(page: Page, cheDo: 'Tệp Realtime (Xem nhanh)' | 'Lũy kế / Quá khứ') {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(taoFileBanHang());
    await page.locator('[data-modal-overlay]').getByText(cheDo).click();
}

/** Đọc thẳng IndexedDB: mọi khoá dữ liệu bán hàng trong database BI_HUB_DATABASE_V2* */
const docIdb = (page: Page) => page.evaluate(async () => {
    const out: Record<string, string> = {};
    const dbs = await indexedDB.databases();
    for (const info of dbs) {
        if (!info.name?.startsWith('BI_HUB_DATABASE_V2')) continue;
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(info.name!); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        if (db.objectStoreNames.contains('appStorage')) {
            const tx = db.transaction('appStorage', 'readonly');
            const store = tx.objectStore('appStorage');
            const keys = await new Promise<IDBValidKey[]>(res => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); });
            for (const k of keys) {
                const ks = String(k);
                if (ks !== 'tempRealtimeData' && !ks.startsWith('salesData_')) continue;
                const v = await new Promise<unknown>(res => { const r = store.get(k); r.onsuccess = () => res(r.result); });
                if (typeof v === 'string') out[`${info.name}|${ks}`] = v;
            }
        }
        db.close();
    }
    return out;
});

test('Realtime: Worker ghi IndexedDB, đúng định dạng cũ, tải lại trang vẫn đúng số', async ({ page }) => {
    test.setTimeout(180_000);
    const canhBao = await chuanBi(page);
    await napTep(page, 'Tệp Realtime (Xem nhanh)');
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });

    const { workers, ghi } = await page.evaluate(() => {
        const w = window as unknown as { __workers: string[]; __ghi: unknown[] };
        return { workers: w.__workers, ghi: w.__ghi };
    });
    expect(workers.some(u => /salesJsonWriter/.test(u)), `Worker ghi phải được tạo — có: ${workers.join(', ')}`).toBe(true);
    expect(ghi).toEqual([{ ok: true }]);
    expect(canhBao, 'không được rơi về đường ghi cũ').toEqual([]);

    const idb = await docIdb(page);
    const khoa = Object.keys(idb).filter(k => k.endsWith('|tempRealtimeData'));
    expect(khoa).toHaveLength(1);
    const chuoi = idb[khoa[0]];
    expect(chuoi.startsWith('{"data":[')).toBe(true); // hasTempRealtimeData() dựa vào tiền tố này
    const parsed = JSON.parse(chuoi) as { data: Record<string, unknown>[]; filename: string; savedAt: string };
    expect(parsed.data).toHaveLength(3);
    expect(parsed.filename).toBe('sales.xlsx');
    expect(String(parsed.data[0].parsedDate)).toMatch(/^\d{4}-\d\d-\d\dT/);
    // Định dạng cũ = JSON.stringify của chính object đó → parse rồi stringify phải ra lại y nguyên
    expect(JSON.stringify(parsed)).toBe(chuoi);

    await page.reload();
    const nutDungThu = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await nutDungThu.isVisible({ timeout: 5_000 }).catch(() => false)) await nutDungThu.click();
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
});

test('chặn Worker ghi → vẫn lưu được bằng đường cũ (không mất dữ liệu)', async ({ page }) => {
    test.setTimeout(180_000);
    const canhBao = await chuanBi(page, true);
    await napTep(page, 'Tệp Realtime (Xem nhanh)');
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
    expect(canhBao.some(t => /đường cũ/.test(t)), 'phải báo đã rơi về đường cũ').toBe(true);
    const idb = await docIdb(page);
    const chuoi = Object.entries(idb).find(([k]) => k.endsWith('|tempRealtimeData'))?.[1] || '';
    expect((JSON.parse(chuoi) as { data: unknown[] }).data).toHaveLength(3);
});

test('Lũy kế: tệp lưu vào salesData_<id> bằng Worker ghi, đúng 3 dòng', async ({ page }) => {
    test.setTimeout(180_000);
    const canhBao = await chuanBi(page);
    await napTep(page, 'Lũy kế / Quá khứ');
    const o = page.getByPlaceholder('Nhập tên hiển thị...');
    await o.fill('Tháng test');
    await o.press('Enter');
    await expect(page.locator('#business-overview')).toContainText('66 Tr', { timeout: 60_000 });
    const ghi = await page.evaluate(() => (window as unknown as { __ghi: unknown[] }).__ghi);
    expect(ghi).toEqual([{ ok: true }]);
    expect(canhBao).toEqual([]);
    const idb = await docIdb(page);
    const tep = Object.entries(idb).filter(([k]) => /\|salesData_file_/.test(k));
    expect(tep).toHaveLength(1);
    const rows = JSON.parse(tep[0][1]) as unknown[];
    expect(rows).toHaveLength(3);
    expect(JSON.stringify(rows)).toBe(tep[0][1]);
});
