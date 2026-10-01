import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Userscript 7.13 — Tự động YCX Realtime cho Phân tích, phía report.mwgroup.vn (báo cáo 77).
 * Nạp NGUYÊN userscript thật trên trang giả đúng domain report.mwgroup.vn. Trang giả dựng lại đúng phần mà HAR thật
 * của chủ dự án cho thấy: AngularJS `DashboardController` với `ListCondition` (V_STORESEARCHTYPE, V_MAINGROUPIDLIST,
 * V_STOREIDLIST…), `ExportData()` kiểm "Kho phải chọn Tất cả" bằng alert như trang thật, `continueDownload` khi xuất xong;
 * API Home/SearchMainGroup, Home/SearchStoreArea, ManagerDownload/GetData (kèm 1 dòng lịch sử CŨ để chắc script không
 * lấy nhầm file cũ).
 */
const USERSCRIPT = readFileSync(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');

const TRANG_77 = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<form><input name="__UserName" type="hidden" value="21707"></form>
<div ng-app="DynamicReportApp" ng-controller="DashboardController" id="ctrl">
  <input type="hidden" id="reportId" value="77">
  <div id="conds"></div>
</div>
<script>
  // ---- AngularJS giả: đủ cho angular.element(el).scope() / isolateScope() và $apply ----
  const conds = [
    { PARAMNAME: 'V_FROMDATE', CONTROLTYPE: 'DATE', OBJECTVALUE: '1/10/2026 00:00', ISREQUIRE: false },
    { PARAMNAME: 'V_TODATE', CONTROLTYPE: 'DATE', OBJECTVALUE: '1/10/2026 00:00', ISREQUIRE: false },
    { PARAMNAME: 'V_MAINGROUPIDLIST', CONTROLTYPE: 'MULTISELECT', DATATYPE: 'MAINGROUP', OBJECTVALUE: {}, ISREQUIRE: false, ISPERMISSION: false, CONDITIONNAME: 'Ngành hàng' },
    { PARAMNAME: 'V_STORESEARCHTYPE', CONTROLTYPE: 'COMBOBOX', DATATYPE: 'Timtheo(kho)', OBJECTVALUE: {}, ISREQUIRE: true, CONDITIONNAME: 'Tìm theo (Kho)' },
    { PARAMNAME: 'V_STOREIDLIST', CONTROLTYPE: 'MULTISELECT', DATATYPE: 'STORE', OBJECTVALUE: {}, ISREQUIRE: false, ISPERMISSION: true, PERMISSION: null, CONDITIONNAME: 'Kho' },
  ];
  window.__exportCalls = [];
  const has = (v) => Array.isArray(v) ? v.length > 0 : (typeof v === 'string' ? v !== '' : typeof v === 'number');
  const scope = {
    ListCondition: [], objectDynamicReport: null,
    $apply(fn) { fn && fn(); }, $evalAsync(fn) { fn && fn(); },
    popupdownload: { close() { window.__popupClosed = true; } },
    ExportData() {
      for (const c of scope.ListCondition) {
        if (c.ISREQUIRE && !has(c.OBJECTVALUE)) { alert('Vui lòng chọn ' + c.CONDITIONNAME + ' !'); return; }
        if (c.CONTROLTYPE === 'MULTISELECT' && c.ISPERMISSION && !c.ISREQUIRE && !has(c.OBJECTVALUE)) { alert("Vui lòng chọn " + c.CONDITIONNAME + " là 'Tất cả'"); return; }
      }
      const listParam = scope.ListCondition.map(c => ({ PARAMNAME: c.PARAMNAME, OBJECTVALUE: Array.isArray(c.OBJECTVALUE) ? c.OBJECTVALUE.join(',') : c.OBJECTVALUE }));
      fetch('/Home/ExportExcelDynamicReport', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dynamicReportId: 77, listParam }) })
        .then(r => r.json()).then(t => { if (t.Success) { scope.continueDownload = t.Data.continueDownload; } else alert('Lỗi xuất excel ' + t.Message); });
    },
  };
  const itemScopes = new Map();
  window.angular = { element: (el) => ({
    scope: () => el && el.id === 'ctrl' ? scope : itemScopes.get(el),
    isolateScope: () => el && el.tagName === 'SEARCHSTOREBYAREA'
      ? { componentStoreId: 'kho-tree-xyz', data: { isPermission: true, permissionValue: null, isActive: true, companyids: '', companybrandids: '', areaids: '' } }
      : undefined,
  }) };
  // ---- jQuery + jstree giả cho ô Ngành hàng (đường chính: bấm "Tất cả" trên cây). Ô Kho KHÔNG có cây → đường dự phòng API ----
  const trees = new Map();
  window.jQuery = window.$ = (el) => ({ jstree: (arg) => arg === true ? trees.get(el) : (trees.has(el) ? {} : undefined), data: () => undefined });
  // Trang tải form điều kiện trễ một nhịp, như GetDynamicReport thật
  setTimeout(() => {
    scope.ListCondition = conds;
    scope.objectDynamicReport = { DYNAMICREPORTID: 77, DYNAMICREPORTNAME: 'Chi tiết yêu cầu xuất', TIMEOUT: 60 };
    const box = document.getElementById('conds');
    conds.forEach((c) => {
      const d = document.createElement('div');
      d.setAttribute('ng-repeat', 'item in ListCondition');
      itemScopes.set(d, { item: c });
      if (c.PARAMNAME === 'V_MAINGROUPIDLIST') {
        const t = document.createElement('div'); t.className = 'jstree'; d.appendChild(t);
        trees.set(t, {
          get_json: () => [{ id: 'r', data: { id: 0 } }, { id: 'a', data: { id: 1775 } }, { id: 'b', data: { id: 13 } }],
          select_all: () => { window.__jstreeAll = true; setTimeout(() => { c.OBJECTVALUE = [1775, 13]; }, 50); },
        });
      }
      if (c.PARAMNAME === 'V_STOREIDLIST') {
        d.appendChild(document.createElement('searchstorebyarea'));
        // Như trang thật: cây kho nằm trong cửa sổ Kendo đã bị chuyển ra cuối <body>, KHÔNG nằm trong khối điều kiện
        if (window.__khoCay) {
          const t = document.createElement('div'); t.id = 'kho-tree-xyz'; document.body.appendChild(t);
          trees.set(t, {
            get_json: () => [{ id: 'r', data: { id: 0 } }, { id: 'k', data: { id: 910 } }],
            select_all: () => { window.__khoAll = true; setTimeout(() => { c.OBJECTVALUE = [910]; }, 50); },
          });
        }
      }
      box.appendChild(d);
    });
  }, 300);
</script></body></html>`;

async function dungTrangGia(page: Page, opts: { exportFail?: string; khoCay?: boolean; apiLichSu?: boolean } = {}) {
    const state = { exportBody: null as null | { listParam: { PARAMNAME: string; OBJECTVALUE: unknown }[] }, getDataCalls: 0, storeCalls: 0, xongSauLan: 3 };
    await page.route('https://report.mwgroup.vn/**', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const p = url.pathname;
        if (p.toLowerCase() === '/home/dashboard/77') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: TRANG_77 });
        if (p === '/Home/SearchStoreArea') {
            state.storeCalls++;
            return route.fulfill({ json: [{ STOREGROUPID: 6, ISSTORE: false, LISTCHILDREN: [{ STOREGROUPID: 3882, ISSTORE: false, LISTCHILDREN: [{ STOREGROUPID: 910, ISSTORE: true, LISTCHILDREN: null }] }] }] });
        }
        if (p === '/Home/SearchMainGroup') return route.fulfill({ json: [{ MAINGROUPID: 1775 }, { MAINGROUPID: 13 }] });
        if (p === '/Home/ExportExcelDynamicReport') {
            state.exportBody = req.postDataJSON();
            return route.fulfill({ json: opts.exportFail ? { Success: false, Message: opts.exportFail } : { Success: true, Data: { continueDownload: true } } });
        }
        if (p === '/ManagerDownload') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: TRANG_LICH_SU });
        // Như máy chủ thật (lần chạy 2026-10-01): gọi thẳng GetData bị 415
        if (p === '/ManagerDownload/GetData' && !opts.apiLichSu) return route.fulfill({ status: 415, body: '' });
        if (p === '/ManagerDownload/GetData' || p === '/__lich_su_bang') {
            state.getDataCalls++;
            const cu = { UNIQUEQUERYID: 'cu-1', DYNAMICREPORTNAME: 'Chi tiết yêu cầu xuất 30/09/2026 08:00:00', STARTTIME: '/Date(1759194000000)/', LINKDOWNLOAD: 'https://report.mwgroup.vn/files/cu.xlsx', ISLOADING: false };
            if (!state.exportBody) return route.fulfill({ json: [cu] });
            const moi = state.getDataCalls >= state.xongSauLan
                ? { UNIQUEQUERYID: 'moi-1', DYNAMICREPORTNAME: 'Chi tiết yêu cầu xuất 01/10/2026 09:15:00', STARTTIME: new Date().toISOString(), LINKDOWNLOAD: '/files/YCX-moi.xlsx', ISLOADING: false }
                : { UNIQUEQUERYID: 'moi-1', DYNAMICREPORTNAME: 'Chi tiết yêu cầu xuất 01/10/2026 09:15:00', STARTTIME: new Date().toISOString(), LINKDOWNLOAD: null, ISLOADING: true };
            return route.fulfill({ json: [moi, cu] });
        }
        return route.fulfill({ status: 404, body: '' });
    });
    await page.addInitScript((khoCay) => {
        const w = window as unknown as Record<string, unknown>;
        w.__khoCay = khoCay;
        const store = new Map<string, unknown>();
        w.__gm = store;
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        // HEAD đo kích thước file: báo ổn định ngay; còn lại gọi thật (đi qua route giả)
        w.GM_xmlhttpRequest = (o: { method: string; url: string; headers?: Record<string, string>; data?: string; onload?: (r: unknown) => void; onerror?: () => void }) => {
            if (o.method === 'HEAD') { setTimeout(() => o.onload?.({ status: 200, responseHeaders: 'content-length: 12345\r\n' }), 10); return; }
            fetch(o.url, { method: o.method, headers: o.headers, body: o.data })
                .then((r) => r.text().then((t) => o.onload?.({ status: r.status, responseText: t })), () => o.onerror?.());
        };
        w.__closed = false;
        window.close = () => { w.__closed = true; };
    }, !!opts.khoCay);
    return state;
}

// Trang "Lịch sử xuất excel": bảng Kendo nạp dữ liệu sau khi trang tải (như trang thật)
const TRANG_LICH_SU = `<!doctype html><html><body><div data-role="grid" id="g"></div><script>
  let rows = null;
  setTimeout(() => fetch('/__lich_su_bang').then(r => r.json()).then(j => { rows = j; }), 200);
  window.jQuery = (el) => ({ data: (k) => (k === 'kendoGrid' && rows ? { dataSource: { data: () => ({ toJSON: () => rows }) } } : undefined) });
</script></body></html>`;

const gm = (page: Page, k: string) => page.evaluate((key) => (window as unknown as { __gm: Map<string, unknown> }).__gm.get(key), k);

test('report.mwgroup.vn: đặt Kho tạo + Tất cả ngành hàng + Tất cả kho, xuất excel, chờ Lịch sử xuất (đọc bảng trên trang, GetData 415), báo đúng file MỚI', async ({ page }) => {
    test.setTimeout(90_000);
    const state = await dungTrangGia(page, { khoCay: true });
    const t0 = Date.now();
    await page.goto('https://report.mwgroup.vn/home/dashboard/77?ycx_ycx=realtime&ycx_job=job-1');
    await page.addScriptTag({ content: USERSCRIPT });

    await expect.poll(() => gm(page, 'ycx_ycx_done'), { timeout: 40_000 }).toBeTruthy();
    const done = await gm(page, 'ycx_ycx_done') as { jobId: string; url: string; fileName: string };
    expect(done.jobId).toBe('job-1');
    expect(done.url).toBe('https://report.mwgroup.vn/files/YCX-moi.xlsx');
    expect(done.fileName).toBe('YCX-moi.xlsx');

    // Gói xuất đúng điều kiện
    const p = Object.fromEntries(state.exportBody!.listParam.map((x) => [x.PARAMNAME, x.OBJECTVALUE]));
    expect(p.V_STORESEARCHTYPE).toBe('2');
    expect(p.V_MAINGROUPIDLIST).toBe('1775,13');
    expect(p.V_STOREIDLIST).toBe('910');
    expect(p.V_FROMDATE).toBe('1/10/2026 00:00'); // ngày để mặc định
    expect(await page.evaluate(() => (window as unknown as { __jstreeAll: boolean }).__jstreeAll)).toBe(true);
    // Ô Kho: bấm "Tất cả" trên cây nằm NGOÀI khối điều kiện (cửa sổ Kendo) — không phải chờ rồi gọi API
    expect(await page.evaluate(() => (window as unknown as { __khoAll: boolean }).__khoAll)).toBe(true);
    expect(state.storeCalls).toBe(0);
    console.log('Thời gian cả lượt (giả lập):', Date.now() - t0, 'ms');
    // Chờ qua lượt "đang xuất" chứ không lấy file cũ
    expect(state.getDataCalls).toBeGreaterThanOrEqual(3);
    expect(await gm(page, 'ycx_ycx_job')).toMatchObject({ jobId: 'job-1', status: 'done' });
    await expect(page.locator('#ycx-ycx-banner')).toContainText('Xong');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __closed: boolean }).__closed), { timeout: 5000 }).toBe(true);
    await page.screenshot({ path: test.info().outputPath('report-xong.png') });
});

test('report.mwgroup.vn: MWG báo lỗi khi xuất → ghi lỗi cho Dashboard, không treo', async ({ page }) => {
    test.setTimeout(30_000);
    await dungTrangGia(page, { exportFail: 'Hết thời gian chờ' });
    await page.goto('https://report.mwgroup.vn/home/dashboard/77?ycx_ycx=realtime&ycx_job=job-2');
    await page.addScriptTag({ content: USERSCRIPT });
    await expect.poll(() => gm(page, 'ycx_ycx_error'), { timeout: 20_000 }).toBeTruthy();
    const err = await gm(page, 'ycx_ycx_error') as { jobId: string; step: string; message: string };
    expect(err).toMatchObject({ jobId: 'job-2', step: 'export' });
    expect(err.message).toContain('Hết thời gian chờ');
    expect(await gm(page, 'ycx_ycx_done')).toBeUndefined();
});

test('report.mwgroup.vn: mở trang KHÔNG có lượt nào → userscript không làm gì', async ({ page }) => {
    const state = await dungTrangGia(page);
    await page.goto('https://report.mwgroup.vn/home/dashboard/77');
    await page.addScriptTag({ content: USERSCRIPT });
    await page.waitForTimeout(2000);
    expect(state.exportBody).toBeNull();
    await expect(page.locator('#ycx-ycx-banner')).toHaveCount(0);
});
