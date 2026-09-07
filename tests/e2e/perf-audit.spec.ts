import { test, hasRealDataProfile } from './helpers/realDataContext';

/**
 * ĐO hiệu năng trên dữ liệu thật (chỉ đọc) — dùng làm mốc so sánh trước/sau mỗi đợt tối ưu
 * (KE_HOACH_TONG_THE.md đợt 3–4, 7). Không phải test pass/fail nên không chạy trong bộ mặc định.
 *
 * Chạy: PERF=1 npx playwright test perf-audit
 */
test.setTimeout(240_000);
test.skip(!process.env.PERF, 'Chỉ chạy khi PERF=1 (đây là phép đo, không phải test)');
test.skip(!hasRealDataProfile(), 'Cần profile đăng nhập thật');

test('đo tải trang, bộ nhớ, DOM và thời gian thao tác', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    const tLoad = Date.now() - t0;

    await page.locator('aside').first().waitFor({ state: 'visible', timeout: 60_000 });
    const tAppReady = Date.now() - t0;

    const nav = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const js = res.filter(r => r.name.endsWith('.js'));
        return {
            domContentLoaded: Math.round(n.domContentLoadedEventEnd),
            loadEvent: Math.round(n.loadEventEnd),
            paints: performance.getEntriesByType('paint').map(p => ({ name: p.name, t: Math.round(p.startTime) })),
            jsBytesKB: Math.round(js.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
            totalResources: res.length,
        };
    });

    const t1 = Date.now();
    await page.locator('aside').first().locator('button:has(svg.lucide-users)').first().click();
    await page.getByRole('button', { name: /Tổng quan/i }).first().waitFor({ timeout: 60_000 });
    const tReportBi = Date.now() - t1;

    const t2 = Date.now();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByText('NHÓM THI ĐUA').waitFor({ timeout: 60_000 }).catch(() => undefined);
    const tThiDua = Date.now() - t2;

    const dom = await page.evaluate(() => ({
        nodes: document.getElementsByTagName('*').length,
        rows: document.querySelectorAll('tr').length,
        cells: document.querySelectorAll('td, th').length,
    }));

    const mem = await page.evaluate(() => {
        const m = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
        return m ? { usedMB: Math.round(m.usedJSHeapSize / 1048576), totalMB: Math.round(m.totalJSHeapSize / 1048576) } : null;
    });

    const storage = await page.evaluate(async () => {
        const est = await navigator.storage?.estimate?.();
        return est ? { usageMB: Math.round((est.usage || 0) / 1048576) } : null;
    });

    console.log('\n════════ MỐC HIỆU NĂNG (dữ liệu thật) ════════');
    console.log('Tải trang (ms)                 :', tLoad);
    console.log('App dựng xong (ms)             :', tAppReady);
    console.log('Navigation                     :', JSON.stringify(nav));
    console.log('Vào Report BI (ms)             :', tReportBi);
    console.log('Render bảng Thi đua (ms)       :', tThiDua);
    console.log('DOM                            :', JSON.stringify(dom));
    console.log('JS heap                        :', JSON.stringify(mem));
    console.log('Storage                        :', JSON.stringify(storage));
    console.log('══════════════════════════════════════════════\n');
});
