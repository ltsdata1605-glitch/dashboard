import { expect, test, type Page } from '@playwright/test';
import { openReportBi, pasteIntoTile, TILE, SUMMARY_REALTIME, SUMMARY_LUYKE, TEST_SUPERMARKET } from './helpers/seed';

/** safeName của TEST_SUPERMARKET theo shortenSupermarketName(): "99 Hùng Vương" -> "Hùng Vương". */
const SAFE_NAME = 'Hùng Vương';

/** Danh sách nhân viên tối giản (parser parseRevenueData): header chứa "Nhân viên\tDTLK\tDTQĐ",
 *  dòng "BP ..." đổi bộ phận, nhân viên dạng "<mã> - <Tên>" ≥4 cột. */
const DANH_SACH = [
    'Nhân viên\tDTLK\tDTQĐ\tHQQĐ',
    'Tổng\t3000\t4200\t40',
    'BP ĐIỆN MÁY\t3000\t4200\t40',
    '111395 - Chí Tâm\t1000\t1400\t40',
    '17952 - Mỹ Hương\t1000\t1400\t40',
    '107617 - Anh Nhân\t1000\t1400\t40',
].join('\n');

const metrics = (erp: number, tNong: number) => ({
    erp, tNong, tong: erp + tNong, dKien: (erp + tNong) * 30 / 21, pNong: tNong / (erp + tNong) * 100,
    updatedAt: '09:00:00 22/9/2026', dailyData: {},
});

/** Kho so sánh giả — đúng cấu trúc BonusCompareStore mà handleSaveBonusCompare ghi.
 *  Tâm tăng, Hương giảm, Nhân thiếu kỳ trước (chỉ có kỳ này). */
const COMPARE_STORE = {
    runId: 'test-run',
    current: {
        fromDate: '01/09/2026', toDate: '21/09/2026',
        data: {
            '111395 - Chí Tâm': metrics(9_745_000, 10_199_000),
            '17952 - Mỹ Hương': metrics(8_000_000, 7_000_000),
            '107617 - Anh Nhân': metrics(9_548_000, 9_485_000),
        },
    },
    previous: {
        fromDate: '01/08/2026', toDate: '21/08/2026',
        data: {
            '111395 - Chí Tâm': metrics(8_000_000, 9_000_000),
            '17952 - Mỹ Hương': metrics(9_636_000, 10_156_000),
        },
    },
    updatedAt: '09:00:00 22/9/2026',
};

/** Ghi thẳng vào IndexedDB BI_HUB_DATABASE_V2/settings (key có prefix "bi_") rồi bắn event
 *  `indexeddb-change` y như utils/db.ts để hook đang mount tự tải lại. */
async function seedBiKeys(page: Page, entries: { key: string; value: unknown }[]) {
    await page.evaluate(async (items) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open('BI_HUB_DATABASE_V2');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(['settings'], 'readwrite');
            const store = tx.objectStore('settings');
            items.forEach(({ key, value }) => store.put(value, `bi_${key}`));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
        items.forEach(({ key }) => window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } })));
    }, entries);
}

async function openBonusTab(page: Page) {
    await page.getByRole('button', { name: /Nhân viên/i }).first().click();
    await page.waitForTimeout(1200);
    // Nhãn tab hiển thị UPPERCASE do CSS — DOM là "Thưởng"; tránh trùng "Check thưởng" ở sidebar.
    const tab = page.locator('button', { hasText: /^Thưởng$/ }).first();
    await tab.click();
    await page.waitForTimeout(800);
}

test.describe('Report BI › Thưởng — menu chế độ xem + So sánh cùng kỳ', () => {
    test.beforeEach(async ({ page }) => {
        await openReportBi(page);
        await page.getByRole('button', { name: /Cập nhật/i }).first().click();
        await page.waitForTimeout(800);
        await pasteIntoTile(page, TILE.DOANH_THU_REALTIME, SUMMARY_REALTIME);
        await pasteIntoTile(page, TILE.DOANH_THU_LUYKE, SUMMARY_LUYKE);
        await seedBiKeys(page, [
            { key: `config-${SAFE_NAME}-danhsach`, value: DANH_SACH },
            { key: `bonus-compare-${SAFE_NAME}`, value: COMPARE_STORE },
            { key: 'nhanvien-active-supermarkets', value: [TEST_SUPERMARKET] },
        ]);
        await openBonusTab(page);
        await expect(page.getByText(/Hiệu suất làm việc/i).first()).toBeVisible({ timeout: 15_000 });
    });

    test('bấm nút chế độ xem mở MENU liệt kê đủ 4 chế độ, mục đang chọn được tô', async ({ page }) => {
        await page.getByTestId('bonus-period-mode-trigger').click();
        const menuLabels = ['Tổng hợp kỳ', 'Xem theo ngày', 'Luỹ kế tháng', 'So sánh cùng kỳ'];
        for (const label of menuLabels) {
            await expect(page.getByRole('button', { name: new RegExp(label) })).toBeVisible();
        }
        await expect(page.locator('[aria-current="true"]')).toContainText('Tổng hợp kỳ');
        await page.waitForTimeout(400); // đợi hết animate-fade-in 0.2s để ảnh chụp không bị mờ
        await page.screenshot({ path: 'test-results/bonus-period-menu.png' });

        // Chọn thẳng "Luỹ kế tháng" — không phải xoay vòng qua "Xem theo ngày" như nút cũ.
        await page.getByRole('button', { name: /Luỹ kế tháng/ }).click();
        await page.waitForTimeout(800);
        await expect(page.getByText(/Chưa có dữ liệu tháng nào|T\.Bình/).first()).toBeVisible();
        await page.getByTestId('bonus-period-mode-trigger').click();
        await expect(page.locator('[aria-current="true"]')).toContainText('Luỹ kế tháng');
        await page.keyboard.press('Escape');
    });

    test('chế độ So sánh cùng kỳ: tiêu đề, 3 nhóm cột, Δ đúng dấu, thiếu kỳ hiện "—"', async ({ page }) => {
        await page.getByTestId('bonus-period-mode-trigger').click();
        await page.getByRole('button', { name: /So sánh cùng kỳ/ }).click();

        const table = page.getByTestId('bonus-compare-table');
        await expect(table).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(/SO SÁNH 01→21\/8 VS 01→21\/9/i).first()).toBeVisible();

        // Mỗi nhóm cột = 1 tiêu chí (ERP / T.Nóng / Tổng), cột phụ H.Tại | CK | +/- (Tổng thêm %).
        const headers = (await table.locator('thead tr').first().locator('th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
        console.log('HEADER NHÓM:', JSON.stringify(headers));
        expect(headers[1]).toMatch(/^ERP$/i);
        expect(headers[2]).toMatch(/^T\.Nóng$/i);
        expect(headers[3]).toMatch(/^Tổng$/i);
        // innerText trả chữ HOA do CSS uppercase — so sánh không phân biệt hoa/thường.
        const subHeaders = (await table.locator('thead tr').nth(1).locator('th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').replace(/ [▲▼]$/, '').trim().toUpperCase());
        console.log('CỘT PHỤ:', JSON.stringify(subHeaders));
        expect(subHeaders).toEqual(['H.TẠI', 'CK', '+/-', 'H.TẠI', 'CK', '+/-', 'H.TẠI', 'CK', '+/-', '%']);
        // Kỳ của H.Tại/CK ghi ở chú thích dưới bảng.
        await expect(page.getByText(/H\.Tại = 01→21\/9 · CK \(cùng kỳ tháng trước\) = 01→21\/8/)).toBeVisible();

        const rowTexts = await table.locator('tbody tr').allInnerTexts();
        console.log('DÒNG:', JSON.stringify(rowTexts.map(t => t.replace(/\s+/g, ' ').trim())));
        // Sort mặc định Δ Tổng giảm dần: Tâm (+2.944) trước Hương (−4.792); Nhân thiếu kỳ trước -> cuối.
        // Tên hiển thị đã rút gọn (formatEmployeeName): "Chí Tâm" -> "C.Tâm".
        expect(rowTexts[0]).toContain('C.Tâm');
        // Thứ tự ô trong nhóm ERP: H.Tại 9.745 | CK 8.000 | +/- +1.745
        expect(rowTexts[0].replace(/\s+/g, ' ')).toMatch(/9\.745 8\.000 \+1\.745/);
        expect(rowTexts[0]).toMatch(/\+2\.944/);
        expect(rowTexts[1]).toContain('M.Hương');
        expect(rowTexts[1]).toMatch(/−4\.792/);
        expect(rowTexts[2]).toContain('A.Nhân');
        expect(rowTexts[2]).toContain('—');

        // Chân bảng: Δ Tổng chỉ tính trên 2 người đủ 2 kỳ = (19.944+15.000) − (17.000+19.792) = −1.848
        const foot = (await table.locator('tfoot').innerText()).replace(/\s+/g, ' ');
        console.log('CHÂN BẢNG:', foot);
        expect(foot).toMatch(/−1\.848/);
        await expect(page.getByText(/2 nhân viên có đủ 2 kỳ/)).toBeVisible();

        await page.screenshot({ path: 'test-results/bonus-compare-table.png', fullPage: true });
    });

    test('popup Tự động có tab "So sánh cùng kỳ" hiện đúng 2 kỳ', async ({ page }) => {
        await page.getByRole('button', { name: /Tự động/ }).first().click();
        await expect(page.getByText('Chọn thời gian đổ thưởng')).toBeVisible();
        await page.getByRole('button', { name: /^So sánh cùng kỳ$/ }).click();
        await expect(page.getByText(/Kỳ này:/)).toBeVisible();
        await expect(page.getByText(/Kỳ trước:/)).toBeVisible();
        await expect(page.getByRole('button', { name: /Chạy 2 kỳ/ })).toBeVisible();
        const body = (await page.locator('[role="dialog"], .fixed').last().innerText()).replace(/\s+/g, ' ');
        console.log('POPUP:', body);
        await page.screenshot({ path: 'test-results/bonus-compare-picker.png' });
    });
});
