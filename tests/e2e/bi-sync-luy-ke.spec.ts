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

type Call = { endpoint: string; body: Record<string, unknown> };
type Done = { mode: string; results: { competition: string; industryByStore: Record<string, string>; employeeByStore: Record<string, string>; installmentByStore: Record<string, string>; competitionByStore: Record<string, string> } };

async function chayJobLuyKe(page: import('@playwright/test').Page, url: string): Promise<{ calls: Call[]; done: Done }> {
    const calls: Call[] = [];
    await page.route('https://baocao.dienmayxanh.com/**', async (route) => {
        const u = route.request().url();
        if (u.includes('/kb-api/')) {
            const endpoint = u.split('/kb-api/')[1];
            const body = JSON.parse(route.request().postData() || '{}');
            calls.push({ endpoint, body });
            let data: unknown[] = [];
            if (endpoint.endsWith('filter-store-getbyasmlist')) data = [
                { id: 1678, Value: '1678 - ĐMM_AGI_TTO - Tri Tôn' }, { id: 8231, Value: '8231 - ĐMS_AGI_TTO - Lương An Trà' }];
            if (endpoint.endsWith('revenue-consolidated-staff-get')) data = [
                { rowcode: '276650', rowname: 'Quách Trần Phương Thảo', quantity: 5, revenue: 40, revenue_kfactor: 50, target_kfactor: 100, revenue_tragop: 10 }];
            if (endpoint.endsWith('revenue-consolidated-get') && body.GROUPBY === 'BICAT') data = [
                { rowlevel: 'BICAT', rowcode: '11', rowname: 'Điện thoại', quantity: 3, revenue: 20, revenue_kfactor: 30, target_kfactor: 60, avg3month_kfactor: 25, revenue_tragop: 5 }];
            // Đúng hình dạng mẫu API thật 09/2026 (chủ dự án gửi): competitiontype 2 = số lượng, 3 = doanh thu
            // Thi đua cấp NHÂN VIÊN của 1 siêu thị — giả ĐÚNG hành vi trang MWG thật (bản 7.17, ghi màn hình 2026-10-02):
            // chỉ trả nhân viên khi VIEWIDS là mã NỘI BỘ của dòng siêu thị (kho 910 → "9567"), KHÔNG phải mã kho.
            //  · 1678 → "9567": bảng Thi đua lọc 1 siêu thị (ISVIEWSTORE 1) có ngay dòng siêu thị.
            //  · 8231 → "7001": phải khoan COMPANY → AREA "500" → dòng siêu thị (ISVIEWSTORE 1 trả rỗng).
            const NOI_BO: Record<number, string> = { 1678: '9567', 8231: '7001' };
            const motKho = typeof body.STOREIDS === 'string' && !String(body.STOREIDS).includes(',');
            const kho = Number(body.STOREIDS);
            const dongSieuThi = { columnname: 'STORE', programid: 865, programname: 'Bảo hiểm tổng', competitiontype: 4, salegroupid: NOI_BO[kho], salegroupname: 'Siêu thị', quantity: 53, revenue: 269.78, storeid: kho };
            if (endpoint.endsWith('competition-bymsg-get') && body.VIEWLEVEL === 'STORE') {
                data = body.VIEWIDS === NOI_BO[kho] ? [
                    { columnname: 'STAFFUSER', programid: 865, programname: 'Bảo hiểm tổng', competitiontype: 4, salegroupid: '95970', salegroupname: 'Chế Thị Út', revenue_kfactor: 0, quantity: 33, revenue: 154.94, target: null, storeid: kho },
                    { columnname: 'STAFFUSER', programid: 865, programname: 'Bảo hiểm tổng', competitiontype: 4, salegroupid: '17952', salegroupname: 'Đinh Thị Mỹ Hương', revenue_kfactor: 0, quantity: 20, revenue: 114.84, target: null, storeid: kho },
                    { columnname: 'STAFFUSER', programid: 865, programname: 'Bảo hiểm tổng', competitiontype: 4, salegroupid: 'online', salegroupname: 'Online', revenue_kfactor: 0, quantity: 1, revenue: 5, target: null, storeid: kho },
                    { columnname: 'STAFFUSER', programid: 868, programname: 'SIM tổng', competitiontype: 2, salegroupid: '95970', salegroupname: 'Chế Thị Út', revenue_kfactor: 20.5, quantity: 12, revenue: 3.1, target: null, storeid: kho },
                ] : body.VIEWIDS === String(kho) ? [dongSieuThi] : []; // mã kho: chỉ ra dòng siêu thị (số!) — không phải nhân viên
            } else if (endpoint.endsWith('competition-bymsg-get') && motKho && body.VIEWLEVEL === 'COMPANY') {
                data = kho === 1678 ? [dongSieuThi]
                    : body.ISVIEWSTORE === 1 ? [] : [{ columnname: 'AREA', programid: 865, programname: 'Bảo hiểm tổng', competitiontype: 4, salegroupid: '500', salegroupname: 'Khu vực', quantity: 53, revenue: 269.78 }];
            } else if (endpoint.endsWith('competition-bymsg-get') && body.VIEWLEVEL === 'AREA') {
                data = body.VIEWIDS === '500' ? [dongSieuThi] : [];
            } else if (endpoint.endsWith('competition-bymsg-get')) data = [
                { programid: 867, programname: 'SIM MOBIFONE/VINAPHONE/SIM DMX', competitiontype: 2, salegroupname: 'ĐMM_AGI_TTO - Tri Tôn', revenue_kfactor: '160625.95', quantity: '94983.0000', revenue: '29472.64', target: '75241.0000', targetpercent_month: '126.24', targetpercent_predict: '126.24' },
                { programid: 906, programname: 'T09 - T10 IPHONE 18 series, iPhone Duo', competitiontype: 3, salegroupname: 'ĐMM_AGI_TTO - Tri Tôn', quantity: '18406', revenue: '775137.49', target: '2114953.45', targetpercent_month: '36.65', targetpercent_predict: '124.05' },
            ];
            // Trả chậm cấp NHÂN VIÊN (mẫu thật kho 910, rút gọn)
            if (endpoint.endsWith('tra-cham-matrix-get')) data = [
                { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'HomeCredit(HC)', revenue_tg: '417.6129', ratio_tg: '60.23', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' }];
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
    await page.goto(url);
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });
    await page.waitForFunction(() => Boolean((window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_bi_automation_done')), undefined, { timeout: 60_000 });
    const done = await page.evaluate(() => (window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_bi_automation_done')) as Done;
    return { calls, done };
}

test('Luỹ kế THÁNG ĐÃ QUA (09/2026): 01 → 30/09, MONTHKEY 202609, TIMETYPE 2; Thi đua đúng khuôn Luỹ kế', async ({ page }) => {
    const { calls, done } = await chayJobLuyKe(page, `${BI_URL}&ycx_month=202609`);

    // Bản 7.20: có token thì gọi Direct API ngay, KHÔNG bấm nút "Lũy kế" trên trang nữa (chỉ bấm khi rơi về đường UI).
    expect(await page.evaluate(() => (window as unknown as { __clicks: string[] }).__clicks)).not.toContain('rt');
    await expect(page.locator('#acp-bi-sync-overlay')).toContainText('Tự động Cập nhật Luỹ Kế · tháng 09/2026');

    const theoNgay = calls.filter(c => 'FROMDATE' in c.body);
    expect(theoNgay.length).toBe(2 + 2 * 2); // hợp nhất (card + bảng) + ngành hàng & nhân viên × 2 siêu thị
    for (const c of theoNgay) {
        expect(c.body.FROMDATE, c.endpoint).toBe(20260901);
        expect(c.body.TODATE, `${c.endpoint}: tháng đã qua lấy tới NGÀY CUỐI tháng`).toBe(20260930);
    }
    const thiDua = calls.filter(c => c.endpoint === 'reports/competition-bymsg-get' && c.body.VIEWLEVEL === 'COMPANY' && String(c.body.STOREIDS).includes(','));
    expect(thiDua).toHaveLength(1);
    expect(thiDua[0].body.TIMETYPE).toBe(2);
    expect(thiDua[0].body.MONTHKEY).toBe(202609);

    // Thi đua theo NHÂN VIÊN: bản 7.19 thử tải gộp cả cụm (VIEWIDS null) rồi mới dò từng kho — thử mã kho và null
    // trước (rẻ, 1 lượt), không ra nhân viên thì dò mã nội bộ của dòng siêu thị như trang MWG (910 → "9567").
    const thiDuaNv = calls.filter(c => c.endpoint === 'reports/competition-bymsg-get' && String(c.body.STOREIDS).indexOf(',') < 0);
    const storeOk = thiDuaNv.filter(c => c.body.VIEWLEVEL === 'STORE').map(c => `${c.body.STOREIDS}:${c.body.VIEWIDS}`);
    expect(storeOk).toContain('1678:9567');
    expect(storeOk).toContain('8231:7001');
    expect(thiDuaNv.filter(c => c.body.STOREIDS === '1678' && c.body.VIEWLEVEL === 'COMPANY')).toHaveLength(1); // COMPANY lọc kho → STORE 9567
    expect(await page.evaluate(() => (window as unknown as { __gm: Map<string, unknown> }).__gm.get('BI_COMP_STORE_VIEWID_8231'))).toBe('7001');
    for (const c of thiDuaNv) {
        expect(c.body.TIMETYPE).toBe(2);
        expect(c.body.MONTHKEY).toBe(202609);
    }
    const td = done.results.competitionByStore['1678 - ĐMM_AGI_TTO - Tri Tôn'];
    expect(td).toContain('Bảo hiểm tổng\nDOANH THU\n95970 - Chế Thị Út\t154.94\n17952 - Đinh Thị Mỹ Hương\t114.84');
    expect(td).toContain('SIM tổng\nSỐ LƯỢNG\n95970 - Chế Thị Út\t12');
    expect(td).not.toContain('Online');
    expect(td).not.toContain('9567'); // dòng siêu thị không bị nhận nhầm là nhân viên
    expect(done.results.competitionByStore['8231 - ĐMS_AGI_TTO - Lương An Trà']).toContain('Bảo hiểm tổng');
    await expect(page.locator('#acp-bi-sync-overlay')).toContainText('Thi đua & Trả chậm');

    // Trả chậm theo NHÂN VIÊN: từng siêu thị, VIEWLEVEL STAFF, đúng tháng
    const traCham = calls.filter(c => c.endpoint === 'reports/tra-cham-matrix-get');
    expect(traCham.map(c => c.body.STOREIDS).sort()).toEqual(['1678', '8231']);
    for (const c of traCham) {
        expect(c.body.VIEWLEVEL).toBe('STAFF');
        expect(c.body.MONTHKEY).toBe(202609);
    }

    expect(done.mode).toBe('luyke');
    expect(done.results.installmentByStore['1678 - ĐMM_AGI_TTO - Tri Tôn']).toContain('95970 - Chế Thị Út\t693.36\t1403.74\t49.39\t417.61\t60.23');
    // Thi đua Luỹ kế: SIM (type 2) theo SỐ LƯỢNG, iPhone (type 3) theo DOANH THU, có % HT dự kiến
    expect(done.results.competition).toContain('SIM MOBIFONE/VINAPHONE/SIM DMX\tSLLK\tTarget\t% HT Target Tháng\t% HT Dự Kiến');
    expect(done.results.competition).toContain('ĐMM_AGI_TTO - Tri Tôn\t94983\t75241\t126.24%\t126.24%');
    expect(done.results.competition).toContain('T09 - T10 IPHONE 18 series, iPhone Duo\tDTLK');
    expect(done.results.competition).toContain('ĐMM_AGI_TTO - Tri Tôn\t775137\t2114953\t36.65%\t124.05%');
    // Ngành hàng & Nhân viên theo từng siêu thị, có Target & % HT
    expect(Object.keys(done.results.industryByStore)).toEqual(expect.arrayContaining(['1678 - ĐMM_AGI_TTO - Tri Tôn', '8231 - ĐMS_AGI_TTO - Lương An Trà']));
    expect(done.results.industryByStore['1678 - ĐMM_AGI_TTO - Tri Tôn']).toContain('11 - Điện thoại\t3\t30\t100.0%\t20\t60\t50.0%');
    expect(done.results.employeeByStore['1678 - ĐMM_AGI_TTO - Tri Tôn']).toContain('276650 - Quách Trần Phương Thảo\t5\t50\t—\t40\t100\t50.0%');
});

test('Luỹ kế THÁNG HIỆN TẠI (không truyền tháng): 01 → hôm nay của tháng này', async ({ page }) => {
    const { calls } = await chayJobLuyKe(page, BI_URL);
    const { homNay, dauThang, thang } = await page.evaluate(() => {
        const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0');
        return { homNay: Number(`${y}${m}${String(d.getDate()).padStart(2, '0')}`), dauThang: Number(`${y}${m}01`), thang: Number(`${y}${m}`) };
    });
    for (const c of calls.filter(c => 'FROMDATE' in c.body)) {
        expect(c.body.FROMDATE).toBe(dauThang);
        expect(c.body.TODATE).toBe(homNay);
    }
    expect(calls.find(c => c.endpoint === 'reports/competition-bymsg-get')!.body.MONTHKEY).toBe(thang);
});
