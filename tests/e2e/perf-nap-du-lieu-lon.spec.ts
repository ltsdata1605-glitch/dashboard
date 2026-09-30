import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as XLSX from 'xlsx';
if (typeof (XLSX as { set_fs?: unknown }).set_fs === 'function') XLSX.set_fs(fs);
/**
 * ĐO HIỆU NĂNG (tuỳ chọn, mặc định BỎ QUA): nạp file doanh số lớn vào Phân tích và in ra thời gian,
 * heap, số lần khựng luồng chính, top hàm tốn CPU. Chủ dự án (2026-09-29): dữ liệu lớn nhất
 * thường dùng 200.000 dòng (~100MB), 40 NV, 5 kho.
 *   node tests/bench/gen-sales-xlsx.mjs 200000 /tmp/sales-200k.xlsx
 *   npm run build && npx vite preview --port 4173   (bản dev phóng đại chi phí React — đo bản build)
 *   E2E_BASE_URL=http://127.0.0.1:4173 PERF_FILE=/tmp/sales-200k.xlsx npx playwright test perf-nap-du-lieu-lon
 */
test('đo nạp dữ liệu lớn vào Phân tích', async ({ page }) => {
    test.skip(!process.env.PERF_FILE, 'Chỉ chạy khi đặt PERF_FILE');
    test.setTimeout(900_000);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['NhomCha','NhomCon','NhomHang'],['ICT','Smartphone','1491'],['Phụ kiện','Camera','4219'],['Phụ kiện','Pin','12'],['Phụ kiện','Loa','1031'],['Gia dụng','Máy lọc','4171'],['Gia dụng','Nồi cơm','4156']]), 'Ngành hàng');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Hình thức xuất','Tính doanh thu','Hình thức'],['Xuất bán hàng tại siêu thị','Có','Tiền mặt']]), 'Hình thức xuất');
    const cfg = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await page.route('**://docs.google.com/**', r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: cfg }));
    await page.addInitScript(() => {
        const w = window as unknown as { __long: number[] };
        w.__long = [];
        new PerformanceObserver(l => l.getEntries().forEach(e => w.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true });
    });
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Profiler.start');
    const t0 = Date.now();
    await page.locator('input[type="file"]').first().setInputFiles(process.env.PERF_FILE!);
    await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
    const tChon = Date.now();
    await expect(page.locator('#business-overview')).toContainText(/DT Thực\D{0,20}[\d.]+ (Tr|Tỷ)/, { timeout: 800_000 });
    const tXong = Date.now();
    const { profile } = await cdp.send('Profiler.stop') as { profile: { nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number }[]; samples: number[]; timeDeltas: number[] } };
    const self = new Map<number, number>();
    profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
    const agg = new Map<string, number>();
    for (const n of profile.nodes) {
        const t = self.get(n.id) || 0; if (!t) continue;
        const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.replace(/^.*5173/, '').split('?')[0]}:${n.callFrame.lineNumber + 1}`;
        agg.set(key, (agg.get(key) || 0) + t);
    }
    const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1000).toFixed(0)}ms ${k}`);
    console.log('TOP\n' + top.join('\n'));
    // Thời gian tự thân của jsxDEV/createElement, cộng dồn theo component NGƯỜI GỌI gần nhất trong mã app
    const parent = new Map<number, number>();
    profile.nodes.forEach(n => ((n as unknown as { children?: number[] }).children || []).forEach(c => parent.set(c, n.id)));
    const byId = new Map(profile.nodes.map(n => [n.id, n]));
    const caller = new Map<string, number>();
    for (const n of profile.nodes) {
        const t = self.get(n.id) || 0; if (!t) continue;
        if (!/jsxDEV|createElement|ReactElement/.test(n.callFrame.functionName)) continue;
        let p = parent.get(n.id);
        while (p !== undefined) {
            const pn = byId.get(p)!;
            if (!pn.callFrame.url.includes('node_modules') && pn.callFrame.url) {
                const key = `${pn.callFrame.functionName || '(anon)'} ${pn.callFrame.url.replace(/^.*5173/, '').split('?')[0]}:${pn.callFrame.lineNumber + 1}`;
                caller.set(key, (caller.get(key) || 0) + t);
                break;
            }
            p = parent.get(p);
        }
    }
    console.log('JSXCALLER\n' + [...caller.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${(v / 1000).toFixed(0)}ms ${k}`).join('\n'));
    await page.waitForTimeout(3000);
    // Ép dọn rác trước khi đọc heap — không thì số heap lẫn rác chưa thu, không so sánh được giữa 2 lượt.
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(12_000); // quá hạn cache 10s của salesData (nếu còn) rồi dọn lần nữa
    await cdp.send('HeapProfiler.collectGarbage');
    const m = await page.evaluate(() => {
        const w = window as unknown as { __long: number[]; performance: Performance & { memory?: { usedJSHeapSize: number } } };
        const l = w.__long;
        return { heapMB: Math.round((w.performance.memory?.usedJSHeapSize || 0) / 1e6), longCount: l.length, longMax: Math.max(0, ...l), longTotal: l.reduce((a, b) => a + b, 0) };
    });
    console.log('SOLIEU', (await page.locator('#business-overview').innerText()).replace(/\s+/g, ' ').slice(0, 160));
    console.log('PERF', JSON.stringify({ taiFileDenChonCheDo_s: (tChon - t0) / 1000, chonDenHienSo_s: (tXong - tChon) / 1000, ...m }));
});
