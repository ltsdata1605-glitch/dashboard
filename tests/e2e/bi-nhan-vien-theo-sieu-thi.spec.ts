import { expect, test } from '@playwright/test';

/**
 * DANH SÁCH NHÂN VIÊN CHỈ LẤY TỪ BÁO CÁO PHÂN TÍCH (file YCX) — chủ dự án chốt lại 2026-10-10 (f0a5558,
 * features/bi-dashboard/services/employeeParser.ts: "🔴 KHÔNG lấy hoặc lọc theo Dữ liệu Luỹ Kế Doanh Thu").
 * Quy tắc cũ 2026-09-23 (giao với báo cáo luỹ kế của từng siêu thị) ĐÃ BỎ — test cũ còn chờ "2 NV" nên đỏ từ đó (GĐ9 viết lại).
 * Khoá hành vi hiện hành: báo cáo luỹ kế (có cả người siêu thị khác) KHÔNG lọc bớt ai; mỗi siêu thị khác nhau nhờ danh sách
 * NHÂN VIÊN ẨN riêng của siêu thị đó (`hidden-employees-<tên>`).
 */
const ANALYSIS = {
    updatedAt: Date.now(),
    totalCount: 4,
    employees: [
        { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
        { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
        { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
        { id: '104', name: 'Phạm Thị D', originalName: '104 - Phạm Thị D', department: 'BP ALL IN ONE - DMX' },
    ],
};

const LUYKE_A = [
    'BP ALL IN ONE - DMX\t\t',
    '101 - Nguyễn Văn A\t10,000,000\t100',
    '102 - Trần Thị B\t8,000,000\t80',
    '900 - Người Siêu Thị Khác\t5,000,000\t50',
].join('\n');

const LUYKE_B = [
    'BP ALL IN ONE - DMX\t\t',
    '103 - Lê Văn C\t12,000,000\t120',
    '901 - Người Siêu Thị Khác\t4,000,000\t40',
].join('\n');

test('số nhân viên theo danh sách Phân Tích, luỹ kế không lọc; nhân viên ẩn tính riêng từng siêu thị', async ({ page }) => {
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);

    await page.evaluate(async ({ analysis, luyKeA, luyKeB }) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2');
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite');
            const store = tx.objectStore('settings');
            // Key của module BI luôn có tiền tố 'bi_' trong store settings
            store.put(['Tân Hiệp', 'Thạnh An'], 'bi_updater-custom-supermarkets');
            store.put(analysis, 'analysis-employees-list');
            store.put(analysis, 'bi_analysis-employees-list');
            store.put(luyKeA, 'bi_config-Tân Hiệp-danhsach');
            store.put(luyKeB, 'bi_config-Thạnh An-danhsach');
            // Thạnh An ẩn 1 người (vd đã chuyển đi) — chỉ siêu thị này bớt, Tân Hiệp giữ nguyên.
            store.put(['101 - Nguyễn Văn A'], 'bi_hidden-employees-Thạnh An');
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, { analysis: ANALYSIS, luyKeA: LUYKE_A, luyKeB: LUYKE_B });

    await page.reload();
    await page.waitForTimeout(4000);

    // Mở màn "Cập nhật dữ liệu" — nơi có khu CẤU HÌNH SIÊU THỊ & NHÂN VIÊN
    // exact: từ 2026-10-11 dòng phụ tiêu đề có nút "Cập nhật dữ liệu" (bấm là CHẠY tự động MWG) đứng trước trong DOM —
    // /Cập nhật/ lấy .first() trúng nút đó, mở modal tự động thay vì màn Cập nhật.
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).first().click();
    await page.waitForTimeout(2500);
    await expect(page.getByText(/CẤU HÌNH SIÊU THỊ & NHÂN VIÊN/i)).toBeVisible({ timeout: 20_000 });

    // Mở khu "CẤU HÌNH SIÊU THỊ & NHÂN VIÊN" -> tab Target Doanh thu của từng siêu thị
    const readCount = async (store: string) => {
        await page.getByRole('button', { name: store, exact: true }).first().click();
        await page.waitForTimeout(1200);
        const badge = page.getByText(/^\d+ NV$/).first();
        return (await badge.innerText()).trim();
    };

    await page.getByText('Target Doanh thu').first().click();
    await page.waitForTimeout(800);

    const tanHiep = await readCount('Tân Hiệp');
    const thanhAn = await readCount('Thạnh An');
    console.log('SỐ NV — Tân Hiệp:', tanHiep, '| Thạnh An:', thanhAn);

    // Tân Hiệp: đủ 4 người của danh sách Phân Tích — báo cáo luỹ kế chỉ có 101, 102 (+ người lạ 900) nhưng KHÔNG dùng để lọc.
    expect(tanHiep).toBe('4 NV');
    // Thạnh An: 4 − 1 người ẩn riêng của siêu thị này.
    expect(thanhAn).toBe('3 NV');
    await page.screenshot({ path: 'test-results/bi-nv-theo-sieu-thi.png', fullPage: true });
});
