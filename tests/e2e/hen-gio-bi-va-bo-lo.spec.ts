import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Hẹn giờ (2026-10-02, chủ dự án báo "tính năng hẹn giờ chưa hoạt động"): (1) BI Realtime đến giờ → mở tab MWG nhờ
 * userscript, nhật ký ghi "Đã bắt đầu"; (2) tab bị trình duyệt cho ngủ qua giờ hẹn → KHÔNG im lặng nữa: báo "Bỏ lỡ".
 */
const USERSCRIPT = readFileSync(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');
test.use({ bypassCSP: true });
type W = { __tabs: string[] };

async function chuanBi(page: Page) {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.clock.install({ time: new Date('2026-10-15T14:58:00') });
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        w.__tabs = [];
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        w.GM_setClipboard = () => {};
        w.GM_openInTab = (url: string) => { (w.__tabs as string[]).push(url); };
        w.GM_xmlhttpRequest = () => {};
    });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.addScriptTag({ content: USERSCRIPT });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByTestId('sched-bi-realtime').click();
    const modal = page.getByTestId('sched-modal-bi-realtime');
    await modal.getByTestId('sched-input-bi-realtime').fill('15:00');
    await modal.getByRole('button', { name: /Thêm giờ/ }).click();
    await page.getByRole('dialog', { name: 'Hẹn giờ tự chạy' }).getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByTestId('ycx-auto-dock')).toContainText('Hẹn 15:00');
}
const tabs = (page: Page) => page.evaluate(() => (window as unknown as W).__tabs);

test('BI Realtime hẹn 15:00 → đến giờ mở tab baocao (userscript), nhật ký "Đã bắt đầu"', async ({ page }) => {
    test.setTimeout(120_000);
    await chuanBi(page);
    await page.clock.runFor(150_000);
    await expect.poll(() => tabs(page), { timeout: 15_000 }).toHaveLength(1);
    expect((await tabs(page))[0]).toMatch(/^https:\/\/baocao\.dienmayxanh\.com\/dashboard\/revenue-consolidated\?ycx_mode=realtime&job_id=/);
    // Hộp tiến trình BI đang mở (đúng hành vi) → đọc nhật ký trực tiếp
    await expect(page.getByRole('dialog').filter({ hasText: /Realtime/ }).first()).toBeVisible();
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('ycx-sched-log') || '[]'));
    expect(log).toEqual([expect.objectContaining({ key: 'bi-realtime', time: '15:00', status: 'started' })]);
});

test('tab bị ngủ 14:59 → 15:30 (qua giờ hẹn): báo "Bỏ lỡ khung 15:00" + nhật ký, không chạy bù', async ({ page }) => {
    test.setTimeout(120_000);
    await chuanBi(page);
    await page.clock.runFor(40_000); // trang còn kiểm vài nhịp trước khi "ngủ"
    await page.clock.pauseAt(new Date('2026-10-15T14:59:30'));
    await page.clock.setSystemTime(new Date('2026-10-15T15:30:00')); // ngủ: thời gian trôi, không timer nào chạy
    await page.clock.resume();
    await expect(page.getByText(/Bỏ lỡ khung 15:00/)).toBeVisible({ timeout: 60_000 });
    expect(await tabs(page)).toEqual([]);
    await page.getByTestId('sched-bi-realtime').click();
    await expect(page.getByTestId('sched-log-bi-realtime')).toContainText('Bỏ lỡ');
    await page.screenshot({ path: test.info().outputPath('bo-lo.png') });
});
