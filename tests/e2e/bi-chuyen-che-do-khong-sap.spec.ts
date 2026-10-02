import { expect, test } from '@playwright/test';
import { openReportBi, seedCompetitionData } from './helpers/seed';

/**
 * 2026-10-02 — đồng bộ URL ↔ chế độ (deep link ?mode=&sub=) từng tạo vòng lặp: hiệu ứng "đọc URL" chạy lại mỗi lần chế
 * độ đổi nên kéo về giá trị CŨ trong URL, hiệu ứng "ghi URL" ghi giá trị mới → giật qua lại vô hạn → Report BI sập
 * ("Maximum update depth exceeded") ngay khi bấm Realtime/Luỹ kế hay Doanh thu/Thi đua.
 */
test('Report BI: bấm qua lại Realtime/Luỹ kế và Doanh thu/Thi đua không sập, URL theo đúng lựa chọn', async ({ page }) => {
    test.setTimeout(120_000);
    const loi: string[] = [];
    page.on('console', (m) => { if (/Maximum update depth|ErrorBoundary/.test(m.text())) loi.push(m.text()); });
    await openReportBi(page);
    await seedCompetitionData(page);
    await page.getByRole('button', { name: /Siêu thị/i }).first().click();
    await page.waitForTimeout(1500);
    await page.getByText('Thi đua', { exact: true }).first().click();
    await expect(page).toHaveURL(/sub=competition/);
    await page.getByText('Doanh thu', { exact: true }).first().click();
    await expect(page).toHaveURL(/sub=revenue/);
    await page.getByText('Thi đua', { exact: true }).first().click();
    await expect(page).toHaveURL(/sub=competition/);
    await page.waitForTimeout(1500);
    expect(loi).toEqual([]);
    await expect(page.getByText(/Đã xảy ra lỗi|Something went wrong/i)).toHaveCount(0);
});

test('Report BI: mở link sâu ?mode=cumulative&sub=competition → đúng chế độ', async ({ page }) => {
    test.setTimeout(120_000);
    await openReportBi(page);
    await seedCompetitionData(page);
    await page.goto('/?tab=employees&view=dashboard&mode=cumulative&sub=competition');
    await expect(page).toHaveURL(/mode=cumulative/);
    await expect(page).toHaveURL(/sub=competition/);
});
