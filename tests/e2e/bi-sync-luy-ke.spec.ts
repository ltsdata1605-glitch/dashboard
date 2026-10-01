import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Tự động LUỸ KẾ (userscript 7.7, chủ dự án 2026-10-01: "cách lấy tương tự Realtime nhưng chọn Lũy kế, dán vào ô Luỹ kế").
 * Nạp NGUYÊN userscript thật trên trang MWG giả (đúng domain), ghi lại payload mọi POST /kb-api/.
 */
const USERSCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BI_URL = 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=luyke&job_id=test-lk';

// "Realtime" đang được chọn → userscript phải bấm sang "Lũy kế"
const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><title>Doanh thu hợp nhất</title></head><body>
<div><button type="button" id="lk" class="bg-white text-gray-600">Lũy kế</button><button type="button" id="rt" class="bg-blue-600 text-white">Realtime</button></div>
<div><button type="button" class="bg-white text-gray-600">DT thực</button><button type="button" class="bg-blue-600 text-white">DT quy đổi</button></div>
<button type="button" class="border-blue-500 bg-blue-50 text-blue-700"><span>✓</span>Trả góp</button>
<script>
  window.__clicks = [];
  function pick(on, off) { on.className = 'bg-blue-600 text-white'; off.className = 'bg-white text-gray-600'; }
  document.getElementById('lk').addEventListener('click', function () { window.__clicks.push('lk'); pick(this, document.getElementById('rt')); });
  document.getElementById('rt').addEventListener('click', function () { window.__clicks.push('rt'); pick(this, document.getElementById('lk')); });
</script>
</body></html>`;

test('Tự động Luỹ kế: chọn "Lũy kế", dải 01 → hôm nay, Thi đua TIMETYPE 2, Ngành hàng & Nhân viên theo từng siêu thị có Target', async ({ page }) => {
    const calls: { endpoint: string; body: Record<string, unknown> }[] = [];
    await page.route('https://baocao.dienmayxanh.com/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/kb-api/')) {
            const endpoint = url.split('/kb-api/')[1];
            calls.push({ endpoint, body: JSON.parse(route.request().postData() || '{}') });
            let data: unknown[] = [];
            if (endpoint.endsWith('filter-store-getbyasmlist')) data = [
                { id: 1678, Value: '1678 - ĐMM_AGI_TTO - Tri Tôn' }, { id: 8231, Value: '8231 - ĐMS_AGI_TTO - Lương An Trà' }];
            if (endpoint.endsWith('revenue-consolidated-staff-get')) data = [
                { rowcode: '276650', rowname: 'Quách Trần Phương Thảo', quantity: 5, revenue: 40, revenue_kfactor: 50, target_kfactor: 100, revenue_tragop: 10 }];
            if (endpoint.endsWith('revenue-consolidated-get') && JSON.parse(route.request().postData() || '{}').GROUPBY === 'BICAT') data = [
                { rowlevel: 'BICAT', rowcode: '11', rowname: 'Điện thoại', quantity: 3, revenue: 20, revenue_kfactor: 30, target_kfactor: 60, avg3month_kfactor: 25, revenue_tragop: 5 }];
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FIXTURE });
    });
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        w.__gm = store;
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        localStorage.setItem('oidc.user:test', JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl' }));
    });
    await page.goto(BI_URL);
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });

    await page.waitForFunction(() => Boolean((window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_bi_automation_done')), undefined, { timeout: 60_000 });

    expect(await page.evaluate(() => (window as unknown as { __clicks: string[] }).__clicks)).toContain('lk');
    await expect(page.locator('#acp-bi-sync-overlay')).toContainText('Tự động Cập nhật Luỹ Kế');

    const { homNay, dauThang } = await page.evaluate(() => {
        const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0');
        return { homNay: Number(`${y}${m}${String(d.getDate()).padStart(2, '0')}`), dauThang: Number(`${y}${m}01`) };
    });
    const theoNgay = calls.filter(c => 'FROMDATE' in c.body);
    expect(theoNgay.length).toBe(2 + 2 * 2); // hợp nhất (card + bảng) + ngành hàng & nhân viên × 2 siêu thị
    for (const c of theoNgay) {
        expect(c.body.FROMDATE, `${c.endpoint}: Luỹ kế bắt đầu từ 01 đầu tháng`).toBe(dauThang);
        expect(c.body.TODATE).toBe(homNay);
    }
    const thiDua = calls.filter(c => c.endpoint === 'reports/competition-bymsg-get');
    expect(thiDua).toHaveLength(1);
    expect(thiDua[0].body.TIMETYPE, 'Thi đua Luỹ kế: TIMETYPE 2').toBe(2);

    const done = await page.evaluate(() => (window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_bi_automation_done')) as
        { mode: string; results: { industryByStore: Record<string, string>; employeeByStore: Record<string, string> } };
    expect(done.mode).toBe('luyke');
    expect(Object.keys(done.results.industryByStore)).toEqual(expect.arrayContaining(['1678 - ĐMM_AGI_TTO - Tri Tôn', '8231 - ĐMS_AGI_TTO - Lương An Trà']));
    // Luỹ kế điền Target & % HT (Realtime để "—")
    expect(done.results.industryByStore['1678 - ĐMM_AGI_TTO - Tri Tôn']).toContain('11 - Điện thoại\t3\t30\t100.0%\t20\t60\t50.0%');
    expect(done.results.employeeByStore['1678 - ĐMM_AGI_TTO - Tri Tôn']).toContain('276650 - Quách Trần Phương Thảo\t5\t50\t—\t40\t100\t50.0%');
});
