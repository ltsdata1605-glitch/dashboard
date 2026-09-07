import { expect, test } from '@playwright/test';
import { openReportBi, seedCompetitionData } from './helpers/seed';

/** Bảng Thi đua (Report BI > Tổng quan > Thi đua) — kiểm chứng các thay đổi ngày 2026-09-05. */
test.describe('Report BI — bảng Thi đua Luỹ kế', () => {
    test.beforeEach(async ({ page }) => {
        await openReportBi(page);
        await seedCompetitionData(page);
        await page.getByRole('button', { name: /Tổng quan/i }).first().click();
        await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
        // Mặc định là chế độ Realtime + siêu thị "Tổng" (chưa có dữ liệu) — chuyển sang Luỹ kế và
        // chọn đúng siêu thị trong dữ liệu giả.
        await page.getByText('Luỹ kế', { exact: true }).first().click();
        await page.getByText('CỤM', { exact: true }).first().click();
        await page.getByText(/Hùng Vương/).first().click();
        await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 15_000 });
    });

    test('cột mặc định đúng thứ tự và %HTDK hiển thị là %DKHT', async ({ page }) => {
        const headerCells = page.locator('table thead th');
        const labels = (await headerCells.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
        // 2 cột đầu là "#" và "NHÓM THI ĐUA", phần còn lại là các cột dữ liệu đang bật
        expect(labels.slice(2)).toEqual(['M.TIÊU V.TRỘI', 'L.KẾ', '%DKHT', 'C.LẠI']);
    });

    test('2 cột vượt trội có số liệu (không còn "-")', async ({ page }) => {
        const firstRow = page.locator('table tbody tr').filter({ hasText: 'VAS' }).first();
        const targetVT = (await firstRow.locator('td').nth(2).innerText()).trim();
        expect(targetVT).not.toBe('-');
        expect(Number(targetVT.replace(/\./g, ''))).toBeGreaterThan(0);
    });

    test('mặc định sắp xếp giảm dần theo %DKHT', async ({ page }) => {
        // Lấy các dòng của nhóm tiêu chí đầu tiên (mỗi nhóm là 1 <tbody>)
        const rows = page.locator('table tbody').first().locator('tr').filter({ has: page.locator('td') });
        const values: number[] = [];
        const count = await rows.count();
        for (let i = 1; i < count; i++) { // bỏ dòng tiêu đề "TIÊU CHÍ"
            const text = (await rows.nth(i).locator('td').nth(4).innerText()).replace('%', '').trim();
            const num = Number(text);
            if (!Number.isNaN(num)) values.push(num);
        }
        expect(values.length).toBeGreaterThan(1);
        expect([...values].sort((a, b) => b - a)).toEqual(values);
    });

    test('bấm thẳng vào nút gạt thì cột được bật, và nằm ở cuối bảng', async ({ page }) => {
        await page.getByTitle(/Bộ lọc thi đua/i).click();
        const row = page.locator('div').filter({ hasText: /^Target$/ }).last();
        await row.getByRole('switch').click();
        await page.keyboard.press('Escape');
        await page.getByTitle(/Bộ lọc thi đua/i).click({ force: true });

        const labels = (await page.locator('table thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
        expect(labels.slice(2)).toEqual(['M.TIÊU V.TRỘI', 'L.KẾ', '%DKHT', 'C.LẠI', 'M.TIÊU']);
    });
});
