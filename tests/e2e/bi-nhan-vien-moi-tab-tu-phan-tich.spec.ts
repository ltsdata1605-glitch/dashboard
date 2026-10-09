import { test, expect, type Page } from '@playwright/test';

/**
 * Report BI › Nhân viên: danh sách nhân viên ở CẢ 4 tab (Doanh thu, Trả chậm, Thi đua, Thưởng) phải lấy từ Phân Tích
 * (chủ dự án hỏi lại 2026-10-09). Báo cáo BI có thêm "Người Ngoài Danh Sách" (không có trong Phân Tích) → không tab
 * nào được hiện người đó; Doanh thu & Thưởng hiện ĐỦ mọi nhân viên Phân Tích (kể cả người chưa có số liệu).
 */
const emps = [
    { id: '101', name: 'An Phân Tích', originalName: '101 - An Phân Tích', department: 'BP ALL IN ONE - DMX' },
    { id: '102', name: 'Bình Phân Tích', originalName: '102 - Bình Phân Tích', department: 'BP ALL IN ONE - DMX' },
    { id: '103', name: 'Chưa Có Số', originalName: '103 - Chưa Có Số', department: 'BP ĐIỆN MÁY - DMX' },
];
const ANALYSIS = { updatedAt: Date.now(), totalCount: emps.length, employees: emps };
const NGOAI = '900 - Người Ngoài Danh Sách';
const DS = ['NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
    '101 - An Phân Tích\t5\t5,000\t—\t4,000\t6,000\t80.0%\t—\t—\t500\t10.0%',
    '102 - Bình Phân Tích\t3\t3,000\t—\t2,500\t4,000\t70.0%\t—\t—\t300\t10.0%',
    `${NGOAI}\t9\t9,000\t—\t9,000\t9,000\t100.0%\t—\t—\t900\t10.0%`,
    'Tổng\t17\t17,000\t100.0%\t15,500\t—\t—\t—\t—\t1,700\t10.0%'].join('\n');
const TD = ['Thi đua nhân viên theo chương trình', 'Bảo hiểm tổng', 'DOANH THU',
    '101 - An Phân Tích\t12', '102 - Bình Phân Tích\t8', `${NGOAI}\t30`].join('\n');
const TC = ['Nhân viên\tDT Trả góp\tDT Siêu thị\tTỷ trọng\tHomeCredit(HC)\t%',
    '101 - An Phân Tích\t400\t1000\t40\t200\t50', `${NGOAI}\t900\t1000\t90\t450\t50`].join('\n');

async function moTab(page: Page, nhan: string) {
    await page.evaluate((label) => (Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.trim() === label && b.offsetParent !== null) as HTMLButtonElement).click(), nhan);
    await page.waitForTimeout(1200);
}
const vungDangMo = (page: Page) => page.locator('[data-bi-view] div.block').last();

test('4 tab Nhân viên chỉ hiện nhân viên của Phân Tích', async ({ page }) => {
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(async ({ a, ds, td, tc }) => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite'); const s = tx.objectStore('settings');
            s.put(['Tân Hiệp'], 'bi_updater-custom-supermarkets');
            s.put(['Tân Hiệp'], 'bi_nhanvien-active-supermarkets');
            s.put(a, 'analysis-employees-list'); s.put(a, 'bi_analysis-employees-list');
            s.put(ds, 'bi_config-Tân Hiệp-danhsach'); s.put(td, 'bi_config-Tân Hiệp-thidua'); s.put(tc, 'bi_config-Tân Hiệp-tragop');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        }); db.close();
    }, { a: ANALYSIS, ds: DS, td: TD, tc: TC });
    await page.reload();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: /^Nhân viên$/ }).first().click();
    await expect(page.getByText('An Phân Tích').first()).toBeVisible({ timeout: 30_000 });

    for (const tab of ['Doanh thu', 'Trả chậm', 'Thi đua', 'Thưởng']) {
        await moTab(page, tab);
        const text = await vungDangMo(page).innerText();
        // Tên có thể bị rút gọn theo bảng ("101 - P.Tích", "An P.Tích") → so theo phần chắc chắn còn lại.
        expect(text, `tab ${tab} không được hiện người ngoài Phân Tích`).not.toMatch(/Ngoài/);
        expect(text, `tab ${tab} phải có nhân viên Phân Tích`).toMatch(/\bAn\b|101/);
        if (tab === 'Doanh thu' || tab === 'Thưởng') {
            expect(text, `tab ${tab} hiện đủ cả người chưa có số liệu`).toMatch(/Chưa Có|103/);
            expect(text).toMatch(/Bình|102/);
        }
        if (tab === 'Trả chậm') {
            // Dòng TỔNG CỘNG chỉ cộng nhân viên đang hiện (NV 101: HC 200 / DT 1.000), không cộng người ngoài (450 / 1.000)
            const tong = text.slice(text.indexOf('TỔNG CỘNG'));
            expect(tong).toMatch(/200/);
            expect(tong).not.toMatch(/650|2\.000/);
        }
    }
});
