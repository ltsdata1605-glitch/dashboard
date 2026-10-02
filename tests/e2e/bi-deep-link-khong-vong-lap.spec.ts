import { test, expect, type Page } from '@playwright/test';
import { openReportBi, seedCompetitionData, openCompetitionTable } from './helpers/seed';

/**
 * Deep link Report BI (?view= &mode= &sub=, commit 19a5336) — 2026-10-02 bản đầu làm Report BI SẬP trên trang thật:
 * effect "đọc URL → state" phụ thuộc chính state đó → bấm đổi chế độ/tab con thì URL (còn giá trị cũ) kéo state về,
 * effect "state → URL" ghi lại → vòng lặp vô hạn ("Maximum update depth exceeded"), mục Nhân viên không đổi được tab.
 */
const khongSap = async (page: Page) => {
    await expect(page.getByText('Đã xảy ra lỗi tại Báo cáo BI')).toHaveCount(0);
    await expect(page.getByText(/Maximum update depth/)).toHaveCount(0);
};

test('Siêu thị: gạt Realtime ↔ Luỹ kế, mở Thi đua — không sập, URL theo đúng chế độ', async ({ page }) => {
    const loi: string[] = [];
    page.on('pageerror', (e) => loi.push(e.message));
    await openReportBi(page);
    await seedCompetitionData(page);
    await openCompetitionTable(page); // gồm gạt Realtime → Luỹ kế
    await khongSap(page);
    await expect(page).toHaveURL(/mode=cumulative/);
    await expect(page).toHaveURL(/sub=competition/);
    await page.getByRole('button', { name: 'Luỹ kế', exact: true }).first().click().catch(async () => {
        await page.getByRole('button', { name: /Lu[ỹỹ] kế/, exact: false }).first().click();
    });
    await page.waitForTimeout(800);
    await khongSap(page);
    expect(loi.filter((m) => /Maximum update depth/.test(m))).toEqual([]);
});

test('Nhân viên: bấm lần lượt 4 tab con → tab đổi thật, URL ?sub= theo, không sập', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /^Nhân viên$/ }).first().click();
    await page.waitForTimeout(1500);
    for (const [tab, nhan] of [['installment', 'Trả chậm'], ['competition', 'Thi đua'], ['bonus', 'Thưởng'], ['revenue', 'Doanh thu']] as const) {
        await page.getByRole('button', { name: nhan, exact: true }).first().click();
        await expect(page).toHaveURL(new RegExp(`sub=${tab}`));
        await page.waitForTimeout(600);
        await expect(page).toHaveURL(new RegExp(`sub=${tab}`)); // không bị kéo ngược về tab cũ
        await khongSap(page);
    }
});

test('deep link: mở thẳng ?tab=employees&view=employee&sub=bonus → đúng mục Nhân viên, tab Thưởng', async ({ page }) => {
    await page.goto('/?tab=employees&view=employee&sub=bonus');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await expect(page.locator('[data-bi-view]')).toHaveAttribute('data-bi-view', 'employee', { timeout: 20_000 });
    await expect(page).toHaveURL(/sub=bonus/);
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/sub=bonus/);
    await khongSap(page);
});

test('deep link: ?tab=employees&view=dashboard&mode=cumulative&sub=competition → Siêu thị, Luỹ kế, Thi đua', async ({ page }) => {
    await page.goto('/?tab=employees&view=dashboard&mode=cumulative&sub=competition');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await expect(page.locator('[data-bi-view]')).toHaveAttribute('data-bi-view', 'dashboard', { timeout: 20_000 });
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/mode=cumulative/);
    await expect(page).toHaveURL(/sub=competition/);
    await khongSap(page);
});
