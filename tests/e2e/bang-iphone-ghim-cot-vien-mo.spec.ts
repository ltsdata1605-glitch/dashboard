import { test, expect, type Page } from '@playwright/test';

/**
 * Đợt C — kế hoạch iPhone (bảng LUÔN là bảng — chủ dự án chốt 2026-10-02).
 *  - Viền mờ mép phải khi còn cột bên phải (components/shared/ui/tableScrollCue.ts), cuộn hết thì tắt.
 *  - Cột tên ghim trái khi cuộn ngang (class `table-pin-first`).
 *  - Bản sao dùng để XUẤT ẢNH không bao giờ bị mờ mép.
 * Dữ liệu mẫu: chép từ bi-mobile-iphone.spec.ts.
 */
const ANALYSIS = {
    updatedAt: Date.now(), totalCount: 3,
    employees: [
        { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
        { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
        { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
    ],
};
const LUYKE = [
    'BP ALL IN ONE - DMX\t\t',
    '101 - Nguyễn Văn A\t120,000,000\t100',
    '102 - Trần Thị B\t98,000,000\t80',
    '103 - Lê Văn C\t75,000,000\t60',
].join('\n');

async function moBI(page: Page) {
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(async ({ analysis, luyke }) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2');
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite');
            const s = tx.objectStore('settings');
            s.put(['Tân Hiệp'], 'bi_updater-custom-supermarkets');
            s.put(analysis, 'analysis-employees-list');
            s.put(analysis, 'bi_analysis-employees-list');
            s.put(luyke, 'bi_config-Tân Hiệp-danhsach');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, { analysis: ANALYSIS, luyke: LUYKE });
    await page.reload();
    await page.waitForTimeout(4000);
}


test('Report BI › Doanh thu trên iPhone: viền mờ còn cột + cột tên đứng yên khi cuộn ngang', async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 390, height: 844 });
    await moBI(page);
    await page.getByRole('button', { name: /^Nhân viên$/i }).first().click();
    await page.waitForTimeout(2500);

    const table = page.locator('table.table-pin-first').first();
    await expect(table).toBeVisible();
    const scroller = page.locator('[data-xcue-right]').filter({ has: table });
    await expect(scroller).toHaveCount(1, { timeout: 5000 });
    await page.screenshot({ path: 'test-results/bang-truoc-cuon.png' });

    const nameCell = table.locator('tbody tr td:first-child').filter({ hasText: '101 - V.A' }).first();
    const x0 = (await nameCell.boundingBox())!.x;

    // Cuộn hết sang phải
    await scroller.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await page.waitForTimeout(300);
    const x1 = (await nameCell.boundingBox())!.x;
    // tên đứng yên (lệch ≤ 4px: vạch trạng thái 3–4px ở mép trái dòng trôi đi khi cuộn)
    expect(Math.abs(x1 - x0)).toBeLessThanOrEqual(4);
    // cột số bên cạnh đã trôi đi
    const so = table.locator('tbody tr').filter({ hasText: '101 - V.A' }).first().locator('td').nth(1);
    expect((await so.boundingBox())!.x).toBeLessThan(x0);
    await page.screenshot({ path: 'test-results/bang-sau-cuon.png' });

    // Hết cột bên phải → tắt viền mờ
    await expect.poll(() => table.evaluate((t) => {
        let el = t.parentElement;
        while (el && getComputedStyle(el).overflowX !== 'auto') el = el.parentElement;
        return el?.hasAttribute('data-xcue-right');
    })).toBe(false);

    // Bản sao xuất ảnh: không mờ
    const mask = await table.evaluate((t) => {
        let el = t.parentElement;
        while (el && getComputedStyle(el).overflowX !== 'auto') el = el.parentElement;
        el!.scrollLeft = 0;
        el!.setAttribute('data-xcue-right', '');
        const before = getComputedStyle(el!).maskImage || getComputedStyle(el!).webkitMaskImage;
        el!.classList.add('clone-no-scrollbar');
        const after = getComputedStyle(el!).maskImage || getComputedStyle(el!).webkitMaskImage;
        el!.classList.remove('clone-no-scrollbar');
        return { before, after };
    });
    expect(mask.before).toContain('gradient');
    expect(mask.after).toBe('none');
});

test('Report BI › các tab khác trên iPhone: chụp lại để soát', async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 390, height: 844 });
    await moBI(page);
    await page.getByRole('button', { name: /^Nhân viên$/i }).first().click();
    await page.waitForTimeout(2000);
    for (const tab of ['Trả chậm', 'Thi đua', 'Thưởng']) {
        await page.getByRole('button', { name: tab, exact: true }).first().click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `test-results/bi-tab-${tab}.png` });
        const tranNgang = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(tranNgang, tab).toBe(false);
    }
});

test('máy tính: không ghim cột (bảng đủ chỗ), không đổi gì', async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 1366, height: 900 });
    await moBI(page);
    await page.getByRole('button', { name: /^Nhân viên$/i }).first().click();
    await page.waitForTimeout(2500);
    const pos = await page.locator('table.table-pin-first tbody tr td:first-child').first().evaluate((td) => getComputedStyle(td).position);
    expect(pos).not.toBe('sticky');
});
