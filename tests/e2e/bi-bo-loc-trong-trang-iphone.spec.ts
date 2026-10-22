import { expect, test, type Page } from '@playwright/test';
import { SUMMARY_REALTIME, SUMMARY_LUYKE, TEST_SUPERMARKET } from './helpers/seed';

/**
 * Report BI trên iPhone: bộ lọc nằm TRONG TRANG, thanh trên không tràn (2026-10-22, chủ dự án chọn "Đưa về chuẩn đã chốt").
 * 19b5dbf1 + f33b3462 từng đưa bộ lọc lên thanh trên (khe #mobile-topbar-filters, viên "Realtime ⇆" + chọn siêu thị; 2 bộ lọc
 * Nhân viên) và ẩn hàng lọc trong trang → thanh trên tràn (58px với dữ liệu thật), tiêu đề ép 13,5px. Bài này thay 2 bài kiểm thiết
 * kế đó (bi-dashboard-mobile-topbar-filters, bi-mobile-filters-topbar): khoá lại chuẩn GĐ6 — segmented "Realtime | Luỹ kế" + chọn
 * siêu thị trong trang (Siêu thị), 2 bộ lọc Siêu thị / Bộ phận trong trang (Nhân viên), tiêu đề thanh trên 17px, trang không tràn ngang.
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const DS = { updatedAt: Date.now(), totalCount: 3, employees: [
    { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
    { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
    { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' } ] };
const LUYKE_NV = ['BP ALL IN ONE - DMX\t\t', '101 - Nguyễn Văn A\t120,000,000\t100', '102 - Trần Thị B\t98,000,000\t80', '103 - Lê Văn C\t75,000,000\t60'].join('\n');

async function napDuLieu(page: Page, url: string, du: Record<string, unknown>) {
    await page.addInitScript(() => {
        sessionStorage.setItem('ycx_demo_mode', 'true');
        localStorage.setItem('ycx_demo_mode', 'true');
    });
    await page.goto(url);
    await page.evaluate(async (ghi) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2');
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite');
            const s = tx.objectStore('settings');
            for (const [k, v] of Object.entries(ghi)) s.put(v, k);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, du);
    await page.reload();
}

async function khongTranVaTieuDeChuan(page: Page) {
    await expect(page.locator('#mobile-topbar-filters')).toHaveCount(0);
    await expect(page.locator('[data-app-chrome="topbar"]').getByRole('heading', { level: 1 })).toHaveCSS('font-size', '17px');
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(tran, 'trang không được tràn ngang').toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => window.innerWidth), 'khung nhìn không bị nới (nội dung rộng hơn màn)').toBe(390);
}

test('Siêu thị: segmented "Realtime | Luỹ kế" + chọn siêu thị nằm trong trang, thanh trên không tràn', async ({ page }) => {
    await napDuLieu(page, '/?tab=employees&view=dashboard', {
        'bi_updater-custom-supermarkets': ['Hùng Vương', TEST_SUPERMARKET],
        'summary-realtime': SUMMARY_REALTIME, 'bi_summary-realtime': SUMMARY_REALTIME,
        'summary-luy-ke': SUMMARY_LUYKE, 'bi_summary-luy-ke': SUMMARY_LUYKE,
    });
    const main = page.locator('main');
    const realtime = main.getByRole('button', { name: 'Realtime', exact: true }).first();
    const luyKe = main.getByRole('button', { name: 'Luỹ kế', exact: true }).first();
    await expect(realtime).toBeVisible({ timeout: 15_000 });
    await expect(luyKe).toBeVisible();
    await luyKe.click();
    await expect(luyKe).toHaveAttribute('aria-pressed', 'true');
    await realtime.click();
    await expect(realtime).toHaveAttribute('aria-pressed', 'true');
    await khongTranVaTieuDeChuan(page);
});

test('Nhân viên: 2 bộ lọc Siêu thị / Bộ phận nằm trong trang, thanh trên không tràn', async ({ page }) => {
    await napDuLieu(page, '/?tab=employees&view=employee', {
        'bi_updater-custom-supermarkets': ['Hùng Vương'],
        'analysis-employees-list': DS, 'bi_analysis-employees-list': DS,
        'bi_config-Hùng Vương-danhsach': LUYKE_NV,
    });
    const main = page.locator('main');
    // Trigger 2 dropdown bộ lọc: nhãn "All" (chưa lọc) hoặc tên siêu thị / bộ phận đang chọn.
    const boLoc = main.locator('button').filter({ hasText: /^(All|Hùng Vương|BP .+)\s*\d*$/ });
    await expect(boLoc.first()).toBeVisible({ timeout: 15_000 });
    expect(await boLoc.count(), '2 bộ lọc Siêu thị + Bộ phận').toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 2; i++) {
        const hop = (await boLoc.nth(i).boundingBox())!;
        expect(hop.x + hop.width, 'bộ lọc lọt màn').toBeLessThanOrEqual(390);
    }
    await khongTranVaTieuDeChuan(page);
});
