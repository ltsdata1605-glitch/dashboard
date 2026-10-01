import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Userscript 7.12 — chủ dự án 2026-10-01: dữ liệu cập nhật lâu rồi mà mỗi lần mở Dashboard lại có pháo giấy + toast
 * "Tự động cập nhật thành công". Cầu nối trên trang Dashboard poll bộ nhớ Tampermonkey với mốc ban đầu = null nên mở
 * trang là phát lại kết quả lượt CŨ. Nay: chỉ phát kết quả phát sinh SAU khi trang mở.
 * Nạp NGUYÊN userscript thật trên trang giả đúng domain dashboard.pro.vn, shim GM_* có sẵn kết quả cũ.
 */
const USERSCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');

test('mở Dashboard: KHÔNG phát lại kết quả cũ; kết quả mới phát sinh sau đó thì phát đúng 1 lượt', async ({ page }) => {
    await page.route('https://dashboard.pro.vn/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body>Dashboard</body></html>' }));
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        // Kết quả của lượt hôm qua vẫn nằm trong bộ nhớ Tampermonkey
        store.set('ycx_bi_automation_done', { source: 'ycx-bi-automation', type: 'done', jobId: 'bi-job-hom-qua', mode: 'luyke', results: { summary: 'CŨ' } });
        w.__gm = store;
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        const nhan: string[] = [];
        w.__nhan = nhan;
        window.addEventListener('ycx-bi-automation:done', (e) => nhan.push(String((e as CustomEvent).detail?.jobId)));
    });
    await page.goto('https://dashboard.pro.vn/?tab=employees');
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => (window as unknown as { __nhan: string[] }).__nhan)).toEqual([]);

    // Lượt mới xong (tab MWG ghi kết quả) → phát đúng lượt mới
    await page.evaluate(() => {
        (window as unknown as { __gm: Map<string, unknown> }).__gm.set('ycx_bi_automation_done', { source: 'ycx-bi-automation', type: 'done', jobId: 'bi-job-moi', mode: 'realtime', results: {} });
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __nhan: string[] }).__nhan)).toEqual(['bi-job-moi']);
});
