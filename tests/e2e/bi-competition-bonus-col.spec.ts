import { expect, test, type Page } from '@playwright/test';
import { openReportBi, seedCompetitionData, openCompetitionTable, TEST_SUPERMARKET } from './helpers/seed';

/** Cột THƯỞNG ở Report BI › Siêu thị › Luỹ kế › Thi đua — lấy từ dữ liệu Check Thưởng (checkthuong_data). */
const ctRow = (store: string, group: string, pct: number, rankVuot: number | '', rankTar: number | '', tVuot: number, tTop: number, tong: number) =>
    ['', 'Sóc Trăng', 'QL', 'ĐML', store, group, pct, 0, 7, rankVuot, rankTar, tVuot, tTop, tong];
const ME = `910 - ${TEST_SUPERMARKET}`;
const CHECK_THUONG_PAYLOAD = {
    competitionData: [
        ctRow(ME, 'VAS', 2.3, 1, '', 0, 3002000, 3002000),                         // thưởng thật 3,002tr
        ctRow(ME, 'SIM TỔNG', 2.0, 2, '', 0, 2174000, 2174000),                    // thưởng thật 2,174tr
        ctRow(ME, 'TC HOMECREDIT', 1.16, 6, '', 0, 0, 0),                          // chưa đạt, có quỹ -> dự kiến
        ctRow('649 - ĐML_AGI_CMO - 02 Tỉnh Lộ 942', 'TC HOMECREDIT', 1.5, 2, 3, 0, 2849000, 2849000),
        ctRow(ME, 'NẠP/RÚT NH', 0.83, 9, '', 0, 0, 0),                             // không ai có thưởng -> 0
        ctRow('312 - ĐML_DTH_SDE - 90 Hùng Vương', 'VAS', 1.1, 9, 12, 0, 0, 0),    // bẫy cùng tên đường
    ],
    fileName: 'TNB - Du Kien Thuong Thi Dua TEST.xlsx',
    uploadTime: '2026-09-22T08:00:00.000Z',
    code1: '910', code2: '', singleViewMode: 'list', lastModified: Date.now(),
};

async function seedCheckThuong(page: Page) {
    await page.evaluate(async (payload) => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise<void>((res, rej) => { const tx = db.transaction(['settings'], 'readwrite'); tx.objectStore('settings').put(payload, 'checkthuong_data'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
        db.close();
        window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'checkthuong_data' } }));
    }, CHECK_THUONG_PAYLOAD);
}

test('bảng Thi đua Luỹ kế có cột THƯỞNG khớp theo tên nhóm với Check Thưởng', async ({ page }) => {
    await openReportBi(page);
    await seedCompetitionData(page);
    await openCompetitionTable(page);
    await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 15_000 });

    // Chưa có dữ liệu Check Thưởng -> không có cột
    await expect(page.locator('table thead th', { hasText: /^THƯỞNG$/ })).toHaveCount(0);

    await seedCheckThuong(page);
    await expect(page.locator('table thead th', { hasText: /^THƯỞNG$/ })).toBeVisible({ timeout: 10_000 });

    const readBonus = async (name: string) => (await page.locator('table tbody tr').filter({ hasText: name }).first().locator('[data-testid="bonus-cell"]').innerText()).trim();
    const got = { VAS: await readBonus('VAS'), SIM: await readBonus('SIM TỔNG'), HC: await readBonus('TC HOMECREDIT'), NR: await readBonus('NẠP/RÚT'), LAP: await readBonus('LAPTOP') };
    console.log('CỘT THƯỞNG:', JSON.stringify(got));
    expect(got.VAS).toBe('3,002tr');
    expect(got.SIM).toBe('2,174tr');
    expect(got.HC).toBe('~2,849tr');   // dự kiến theo siêu thị đạt giải
    expect(got.NR).toBe('0');          // nhóm không có quỹ
    expect(got.LAP).toBe('-');         // không có trong file Check Thưởng
    await expect(page.getByText(/THƯỞNG lấy từ Check Thưởng/)).toBeVisible();

    // Thẻ KPI thứ 5 "Tổng thưởng" = tổng thưởng THẬT của các nhóm đang hiện (3,002 + 2,174 = 5,176tr), 5 thẻ 1 hàng
    const kpi = page.locator('.competition-kpi-container');
    await expect(kpi.locator(':scope > div')).toHaveCount(5);
    // Thẻ Tổng thưởng phải nằm ĐẦU TIÊN
    const bonusCard = kpi.locator(':scope > div').first();
    await expect(bonusCard).toContainText(/Tổng thưởng/i);
    const cardText = (await bonusCard.innerText()).replace(/\s+/g, ' ');
    console.log('THẺ TỔNG THƯỞNG:', cardText);
    expect(cardText).toContain('5,176tr');
    expect(cardText).toMatch(/2\/4 nhóm/);
    expect(cardText).toContain('D.kiến +2,849tr');
    const box = await kpi.boundingBox(); const first = await kpi.locator(':scope > div').first().boundingBox(); const last = await kpi.locator(':scope > div').last().boundingBox();
    expect(Math.abs((first?.y ?? 0) - (last?.y ?? 1))).toBeLessThan(2); // cùng 1 hàng ở 1280px
    void box;
    await page.screenshot({ path: 'test-results/bi-competition-bonus-col.png', fullPage: true });
});
