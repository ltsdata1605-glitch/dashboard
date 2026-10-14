import { test } from '@playwright/test';

/**
 * ĐO tốc độ tải & chuyển tab trên BẢN BUILD production — mốc so sánh trước/sau của kế hoạch giao diện chuẩn Apple
 * (KE_HOACH_GIAO_DIEN_APPLE.md mục 4.2). Chế độ Dùng thử (không cần đăng nhập), giả lập iPhone 440×956 + mạng 4G
 * 9 Mbps/60 ms + CPU chậm 4 lần; mỗi lượt xoá cache + gỡ service worker để đo đúng "lần mở đầu".
 *
 * Đây là PHÉP ĐO, không phải test pass/fail — chỉ chạy khi gọi riêng, trên bản build:
 *   npm run build && npx vite preview --port 4173 --host 127.0.0.1 &   (ghi lại PID để tắt)
 *   PERF=1 E2E_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/perf-apple.spec.ts --project=chromium
 * Biến: PERF_RUNS (số lượt, mặc định 3).
 */
test.skip(!process.env.PERF || !process.env.E2E_BASE_URL, 'Phép đo — đặt PERF=1 và E2E_BASE_URL (bản build) để chạy');
test.use({
    viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    launchOptions: {
        ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
});

const LAN = Number(process.env.PERF_RUNS || 3);

test('tốc độ tải + chuyển tab (bản build, iPhone, 4G, CPU x4)', async ({ page, context }) => {
    test.setTimeout(600_000);
    await context.addInitScript(() => { try { localStorage.setItem('ycx_demo_mode', 'true'); } catch { /* */ } });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 9_000_000 / 8, uploadThroughput: 1_500_000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const ketQua: Record<string, number[]> = {};
    const ghi = (k: string, v: number) => { (ketQua[k] ||= []).push(Math.round(v)); };

    for (let i = 0; i < LAN; i++) {
        await cdp.send('Network.clearBrowserCache');
        await context.clearCookies();
        // Bỏ service worker lần trước để đo lượt tải "lần đầu" thật.
        await page.goto('/favicon.svg');
        await page.evaluate(async () => { const r = await navigator.serviceWorker?.getRegistrations?.(); await Promise.all((r || []).map(x => x.unregister())); for (const k of await caches.keys()) await caches.delete(k); });
        const t0 = Date.now();
        await page.goto('/?tab=analysis', { waitUntil: 'commit' });
        await page.locator('nav.mobile-chrome').waitFor({ timeout: 120_000 });
        ghi('khung app hiện (ms)', Date.now() - t0);
        await page.getByText(/Phân tích siêu tốc|Tổng quan doanh thu/i).first().waitFor({ timeout: 120_000 });
        ghi('nội dung Phân tích hiện (ms)', Date.now() - t0);
        const p = await page.evaluate(() => {
            const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0;
            const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            const js = res.filter(r => r.name.endsWith('.js')).reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
            const css = res.filter(r => /\.css|fonts\.googleapis/.test(r.name)).reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
            return { fcp, js, css, n: res.length };
        });
        ghi('FCP (ms)', p.fcp); ghi('JS tải (KB)', p.js / 1024); ghi('CSS tải (KB)', p.css / 1024); ghi('số request', p.n);

        // Check thưởng: chủ dự án viết lại bằng React (2026-10-11, bỏ iframe /check-thuong.html) → đo như 2 tab kia. Chưa có file
        // thưởng thì màn là ô "Tải file thưởng thi đua"; có rồi là "Kết quả tra cứu".
        for (const [nhan, cho] of [['Report BI', 'Nhập dữ liệu Báo cáo BI|SIÊU THỊ'], ['Check thưởng', 'Tải file thưởng thi đua|Kết quả tra cứu'], ['Phân tích', 'Nhập dữ liệu Realtime|Tổng quan doanh thu']] as const) {
            await page.waitForTimeout(1500);
            // ĐỒNG HỒ TRONG TRANG (GĐ9 2026-10-14): từ sự kiện click lên nút thanh tab tới KHUNG HÌNH đầu tiên có nội dung — đúng thứ
            // người dùng cảm nhận. Đo bằng Date.now() quanh `locator.click()` (cách cũ, giữ dòng "gồm Playwright" để so mốc cũ) cộng
            // thêm 150–350 ms của chính Playwright ở CPU x4: dò getByRole (tính tên truy cập cả cây DOM), chờ phần tử đứng yên
            // (2 khung hình), thử trúng đích, rồi waitForFunction hỏi lại mỗi 50 ms.
            // Chỉ tính khi nội dung nằm trong view ĐANG HIỆN (view ẩn có thuộc tính inert và bị đẩy ra ngoài màn).
            await page.evaluate((re) => {
                const w = window as unknown as { __xong: number | null };
                w.__xong = null;
                const r = new RegExp(re, 'i');
                const thay = () => Array.from(document.querySelectorAll('main h1, main h2, main h3, main p, main span, main div'))
                    .some(el => !el.closest('[inert]') && r.test(el.textContent || '') && el.children.length === 0 && el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().width > 0);
                document.addEventListener('click', (ev) => {
                    const vong = () => { if (thay()) requestAnimationFrame(() => { w.__xong = performance.now() - ev.timeStamp; }); else requestAnimationFrame(vong); };
                    requestAnimationFrame(vong);
                }, { capture: true, once: true });
            }, cho);
            const t1 = Date.now();
            await page.locator('nav.mobile-chrome').getByRole('button', { name: nhan }).click();
            await page.waitForFunction(() => (window as unknown as { __xong: number | null }).__xong !== null, null, { timeout: 120_000, polling: 50 });
            ghi(`chuyển sang ${nhan} (ms)`, await page.evaluate(() => (window as unknown as { __xong: number }).__xong));
            ghi(`  ${nhan} gồm Playwright (ms, cách đo cũ)`, Date.now() - t1);
        }
    }
    const tb = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
    console.log('\n══ MỐC TỐC ĐỘ (trung bình ' + LAN + ' lượt) ══');
    for (const [k, v] of Object.entries(ketQua)) console.log(`${k.padEnd(34)} ${String(tb(v)).padStart(7)}   [${v.join(', ')}]`);
});
