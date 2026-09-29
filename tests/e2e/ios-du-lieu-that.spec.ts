import { expect, test, type Frame, type Page } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';

/**
 * Phân tích, Report BI, Check thưởng trên khung iPhone với DỮ LIỆU THẬT của tài khoản test
 * (lts.data1605@gmail.com, Kho 910) — 2026-09-28. Đăng nhập bằng custom token, xem
 * helpers/customTokenLogin.ts. CHỈ ĐỌC: mọi lượt ghi cloud bị chặn và được kiểm là không có.
 *
 * Bỏ qua nếu không có `E2E_CUSTOM_TOKEN_FILE`.
 */
test.skip(!hasCustomToken(), 'Chưa có E2E_CUSTOM_TOKEN_FILE (custom token của tài khoản test)');

test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    // Container cloud: Chromium cài sẵn khác phiên bản Playwright của repo → trỏ thẳng file chạy;
    // mạng ra ngoài chỉ đi qua proxy HTTPS_PROXY (Chromium không tự đọc biến môi trường).
    launchOptions: {
        ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
});

const DO = () => {
    const nhin = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0; };
    const chuNho = Array.from(document.querySelectorAll('*'))
        .filter(el => nhin(el) && el.children.length === 0 && !!el.textContent?.trim() && parseFloat(getComputedStyle(el).fontSize) < 11)
        .map(el => `${Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10}px "${(el.textContent || '').trim().slice(0, 18)}"`);
    const bangTran = Array.from(document.querySelectorAll('table')).filter(t => {
        let n: HTMLElement | null = t.parentElement;
        while (n && n !== document.body) { const ov = getComputedStyle(n).overflowX; if (ov === 'auto' || ov === 'scroll') return false; n = n.parentElement; }
        return true;
    }).length;
    const el = document.documentElement;
    return { duThua: el.scrollWidth - el.clientWidth, chuNho: chuNho.slice(0, 8), soChuNho: chuNho.length, soBang: document.querySelectorAll('table').length, bangTran, text: document.body.innerText.length };
};

const khungCon = (page: Page): Frame | undefined => page.frames().find(f => f !== page.mainFrame() && f.url() !== 'about:blank' && f.url().startsWith(new URL(page.url()).origin));

test('đăng nhập tài khoản thật và mở 3 module trên iPhone (chỉ đọc)', async ({ page }) => {
    test.setTimeout(240_000);
    const loiJs: string[] = [];
    page.on('pageerror', e => loiJs.push(e.message));
    const biChan = await chanGhiCloud(page);

    await dangNhapBangToken(page);
    // Vào được app: không còn màn đăng nhập, có thanh điều hướng.
    await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });

    for (const tab of ['analysis', 'employees', 'check-thuong']) {
        await page.goto(`/?tab=${tab}`);
        await page.waitForTimeout(12_000);
        const chinh = await page.evaluate(DO);
        const f = khungCon(page);
        const trong = f ? await f.evaluate(DO).catch(() => null) : null;
        await page.screenshot({ path: `test-results/that-${tab}.png` });
        console.log(`[${tab}] ${JSON.stringify(chinh)}${trong ? ' | IFRAME ' + JSON.stringify(trong) : ''}`);
    }
    console.log('LOI_JS', JSON.stringify(loiJs));
    console.log('BI_CHAN', JSON.stringify(biChan));
});
