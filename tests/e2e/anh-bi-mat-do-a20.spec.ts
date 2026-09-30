import { test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { openReportBi, seedCompetitionData, openCompetitionTable } from './helpers/seed';

/** Chụp Report BI ở màn điện thoại (390px) trước/sau A20 — chạy tay: A20_OUT=<thư mục> */
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1366, height: 900 };

async function chup(page: Page, out: string, ten: string) {
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${ten}.png`, fullPage: false });
    // Đo cỡ chữ + đệm của nút dùng chung trong BI (nơi audit nói "cùng class khác kích thước")
    const nut = await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll<HTMLElement>('.bi-report-module button')).find(x => x.offsetParent && x.textContent?.trim());
        if (!b) return null;
        const cs = getComputedStyle(b);
        return { chu: b.textContent!.trim().slice(0, 20), font: cs.fontSize, pad: cs.padding };
    });
    fs.appendFileSync(`${out}/do.txt`, `${ten}: ${JSON.stringify(nut)}\n`);
    // Nút/ô CHUẨN (Button có variant, Input) — nhóm A20 đưa ra khỏi chế độ gọn. Nhận diện KHÔNG dựa vào
    // data-ui (mã cũ chưa có): nút chuẩn có class `rounded` + kích thước chuẩn của Button.
    const chuan = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.bi-report-module button, .bi-report-module input'))
        .filter(x => x.offsetParent && (x.dataset.ui === 'shared' || x.closest('[data-ui]')))
        .slice(0, 6).map(x => `${(x.textContent || (x as HTMLInputElement).placeholder || '').trim().slice(0, 14)}=${getComputedStyle(x).fontSize}/${getComputedStyle(x).paddingLeft}`));
    fs.appendFileSync(`${out}/do.txt`, `${ten} CHUAN: ${JSON.stringify(chuan)}\n`);
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(600);
}

test('chụp Report BI 390px', async ({ page }) => {
    test.skip(!process.env.A20_OUT, 'chạy tay');
    test.setTimeout(240_000);
    const out = process.env.A20_OUT!; fs.mkdirSync(out, { recursive: true });
    await page.setViewportSize(DESKTOP);
    await openReportBi(page);
    await seedCompetitionData(page);
    await chup(page, out, '1-cap-nhat');
    await page.getByRole('button', { name: /Siêu thị/i }).first().click();
    await page.waitForTimeout(2000);
    await chup(page, out, '2-sieu-thi');
    await openCompetitionTable(page);
    await chup(page, out, '3-thi-dua');
    await page.getByRole('button', { name: /Nhân viên/i }).first().click();
    await page.waitForTimeout(2000);
    await chup(page, out, '4-nhan-vien');
});
