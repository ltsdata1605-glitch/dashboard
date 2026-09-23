import { expect, test } from '@playwright/test';

/**
 * MỖI SIÊU THỊ CÓ DANH SÁCH NHÂN VIÊN RIÊNG (chủ dự án chốt 2026-09-23).
 * Trước đây mọi tab siêu thị đều hiện cùng một số "19 NV" vì lấy trọn danh sách Phân Tích.
 * Nay: giao giữa báo cáo "Luỹ kế doanh thu nhân viên" của chính siêu thị đó và danh sách Phân Tích.
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

test('hai siêu thị có số nhân viên khác nhau theo đúng báo cáo luỹ kế của từng nơi', async ({ page }) => {
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
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, { analysis: ANALYSIS, luyKeA: LUYKE_A, luyKeB: LUYKE_B });

    await page.reload();
    await page.waitForTimeout(4000);

    // Mở màn "Cập nhật dữ liệu" — nơi có khu CẤU HÌNH SIÊU THỊ & NHÂN VIÊN
    await page.getByRole('button', { name: /Cập nhật dữ liệu|Cập nhật/i }).first().click();
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

    expect(tanHiep).toBe('2 NV'); // 101 + 102 (bỏ người lạ 900)
    expect(thanhAn).toBe('1 NV'); // chỉ 103 (bỏ người lạ 901)
    await page.screenshot({ path: 'test-results/bi-nv-theo-sieu-thi.png', fullPage: true });
});
