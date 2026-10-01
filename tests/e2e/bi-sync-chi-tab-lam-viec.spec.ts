import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Userscript 7.11 — chủ dự án 2026-10-01: cập nhật script xong, NHIỀU tab baocao.dienmayxanh.com cùng chạy lấy dữ liệu.
 * Một nguyên nhân: Dashboard ghi job vào GM storage → MỌI tab baocao đang mở sẵn (Báo cáo, Trả chậm…) nghe
 * GM_addValueChangeListener và cùng chạy. Nay chỉ tab làm việc (URL có ycx_mode, do Dashboard mở) mới nhận job qua kênh đó.
 */
const USERSCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');

async function napTab(page: import('@playwright/test').Page, url: string) {
    const calls: string[] = [];
    await page.route('https://baocao.dienmayxanh.com/**', async (route) => {
        const u = route.request().url();
        if (u.includes('/kb-api/')) {
            calls.push(u.split('/kb-api/')[1]);
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
        }
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body><div>Báo cáo</div></body></html>' });
    });
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        const nghe = new Map<string, (n: string, o: unknown, v: unknown) => void>();
        w.__gm = store;
        w.__gmNghe = nghe;
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = (k: string, fn: (n: string, o: unknown, v: unknown) => void) => { nghe.set(k, fn); return 0; };
        localStorage.setItem('oidc.user:test', JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl' }));
    });
    await page.goto(url);
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });
    // Dashboard vừa giao job (giả lập lượt GM storage đổi giá trị)
    await page.evaluate(() => {
        const fn = (window as unknown as { __gmNghe: Map<string, (n: string, o: unknown, v: unknown) => void> }).__gmNghe.get('ycx_bi_automation_job');
        fn?.('ycx_bi_automation_job', null, { jobId: 'job-x', mode: 'realtime', status: 'pending', createdAt: Date.now() });
    });
    await page.waitForTimeout(2500);
    return calls;
}

test('tab baocao người dùng mở sẵn (không có ycx_mode) KHÔNG chạy job Dashboard vừa giao', async ({ page }) => {
    const calls = await napTab(page, 'https://baocao.dienmayxanh.com/dashboard/tra-cham');
    expect(calls).toEqual([]);
    await expect(page.locator('#acp-bi-sync-overlay')).toHaveCount(0);
});

test('tab làm việc (URL có ycx_mode) vẫn nhận job qua kênh GM', async ({ page }) => {
    await napTab(page, 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=realtime');
    await expect(page.locator('#acp-bi-sync-overlay')).toContainText('Tự động Cập nhật Realtime');
});
