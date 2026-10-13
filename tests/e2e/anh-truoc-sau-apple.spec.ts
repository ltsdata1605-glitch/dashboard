import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';

/**
 * ẢNH TRƯỚC/SAU cho kế hoạch giao diện chuẩn Apple (KE_HOACH_GIAO_DIEN_APPLE.md, mục 6 bước 4): đăng nhập TÀI KHOẢN TEST
 * THẬT (chỉ đọc — mọi lượt ghi cloud bị chặn), chụp mọi tab ở iPhone 16 Pro Max (440×956) và laptop (1440×900).
 * Ảnh có dữ liệu thật → lưu ở `.anh-apple/` (đã gitignore), KHÔNG commit. Không để trong test-results/ vì Playwright
 * xoá sạch thư mục đó ở mỗi lượt chạy — mất ảnh "trước" đúng lúc cần so.
 *
 *   ANH=1 ANH_NHAN=sau-gd1 npx playwright test tests/e2e/anh-truoc-sau-apple.spec.ts --project=chromium
 * → .anh-apple/<ANH_NHAN>/{m,d,d1280}-<tab>.png
 *
 * GĐ9 (2026-10-13): kèm số đo VỚI DỮ LIỆU THẬT (bộ quét `apple-tuong-thich` chỉ có dữ liệu giả) → `.anh-apple/<ANH_NHAN>/do-*.json`:
 * lỗi runtime từng tab (pageerror + console.error), tràn ngang, chữ < 11px, và trên laptop: chữ/nút nằm DƯỚI 2 dock nổi (menu trái
 * `desktop-nav-menu`, Auto Sync phải `ycx-auto-dock`) — đo bằng khung chữ thật (Range), không phải khung phần tử.
 */
test.skip(!process.env.ANH || !hasCustomToken(), 'Chụp ảnh thủ công — đặt ANH=1 (cần tài khoản test)');

const OUT = `.anh-apple/${process.env.ANH_NHAN || 'hien-tai'}`;
const TAB_DT = ['analysis', 'employees', 'check-thuong', 'reports', 'tools-print-sticker', 'tools-phanca', 'tools-line-bot', 'tools-tax', 'tools-coupon', 'settings', 'help'];
const TAB_LAPTOP = ['analysis', 'employees', 'check-thuong', 'reports', 'tools-print-sticker', 'tools-phanca', 'tools-line-bot', 'settings'];

/** Gom lỗi runtime theo tab đang mở (tab đổi bằng `datTab`). */
const ghiLoi = (page: Page) => {
    const loi: Record<string, string[]> = {};
    let tab = 'dang-nhap';
    const them = (m: string) => { (loi[tab] ||= []).push(m.slice(0, 300)); };
    page.on('pageerror', e => them(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') them(`console: ${m.text()}`); });
    return { loi, datTab: (t: string) => { tab = t; } };
};

/** Số đo một màn: tràn ngang, chữ < 11px, chữ/nút bị dock nổi che (laptop). Bỏ qua chính dock và khung app. */
const doMan = (page: Page) => page.evaluate(() => {
    const hien = (el: Element) => {
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
    };
    const docks = ['desktop-nav-menu', 'ycx-auto-dock'].flatMap(id => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el || !hien(el)) return [];
        const r = el.getBoundingClientRect();
        return r.width && r.height ? [{ id, r }] : [];
    });
    const giao = (a: DOMRect, b: DOMRect) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    /** Phần NHÌN THẤY của khung r: cắt theo mọi khung cuộn tổ tiên (bảng cuộn ngang trong thẻ) — cột đã cuộn khuất trong thẻ
     *  thì dock không "che" nó (lượt đo đầu GĐ9 báo nhầm 6 ô bảng Phân tích đúng vì vậy). */
    const nhinThay = (batDau: Element | null, r: DOMRect) => {
        let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
        for (let a = batDau; a && a !== document.body; a = a.parentElement) {
            const cs = getComputedStyle(a);
            if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
            const k = a.getBoundingClientRect();
            if (cs.overflowX !== 'visible') { x1 = Math.max(x1, k.left); x2 = Math.min(x2, k.right); }
            if (cs.overflowY !== 'visible') { y1 = Math.max(y1, k.top); y2 = Math.min(y2, k.bottom); }
            if (x2 - x1 <= 1 || y2 - y1 <= 1) return null;
        }
        return new DOMRect(x1, y1, x2 - x1, y2 - y1);
    };
    const biChe: { dock: string; chu: string; x: number; y: number }[] = [];
    const chuNho: { chu: string; px: number }[] = [];
    const main = document.querySelector('main');
    const walker = main ? document.createTreeWalker(main, NodeFilter.SHOW_TEXT) : null;
    const range = document.createRange();
    for (let n = walker?.nextNode(); n; n = walker!.nextNode()) {
        const chu = (n.textContent || '').trim();
        const cha = n.parentElement;
        if (!chu || !cha || cha.closest('[data-testid="desktop-nav-menu"],[data-testid="ycx-auto-dock"],[data-app-chrome],[aria-hidden="true"]')) continue;
        if (!hien(cha)) continue;
        range.selectNodeContents(n);
        // Chữ: cắt theo cả chính phần tử chứa nó (vd `truncate`), không chỉ tổ tiên.
        const rects = [...range.getClientRects()].map(r => nhinThay(cha, r)).filter((r): r is DOMRect => !!r && r.bottom > 0 && r.top < innerHeight);
        if (!rects.length) continue;
        const px = parseFloat(getComputedStyle(cha).fontSize);
        if (px < 11 && chuNho.length < 30) chuNho.push({ chu: chu.slice(0, 40), px });
        for (const d of docks) {
            const r = rects.find(x => giao(x, d.r) > 6);
            if (r && biChe.length < 40) biChe.push({ dock: d.id, chu: chu.slice(0, 40), x: Math.round(r.left), y: Math.round(r.top) });
        }
    }
    const nutBiChe = main ? [...main.querySelectorAll('button,a[href],input,select,textarea,[role="button"]')].filter(el => {
        if (el.closest('[data-testid="desktop-nav-menu"],[data-testid="ycx-auto-dock"],[data-app-chrome]') || !hien(el)) return false;
        const r = nhinThay(el.parentElement, el.getBoundingClientRect());
        return !!r && r.bottom > 0 && r.top < innerHeight && docks.some(d => giao(r, d.r) > 16);
    }).slice(0, 20).map(el => ({ nut: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40), x: Math.round(el.getBoundingClientRect().left) })) : [];
    return {
        rong: innerWidth,
        tranNgang: document.documentElement.scrollWidth - innerWidth,
        docks: docks.map(d => ({ id: d.id, trai: Math.round(d.r.left), phai: Math.round(d.r.right), tren: Math.round(d.r.top), duoi: Math.round(d.r.bottom) })),
        biChe, nutBiChe, chuNho,
    };
});

test.use({
    launchOptions: {
        ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
});

test.describe('iPhone 16 Pro Max', () => {
    test.use({
        viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    test('mọi tab + menu Khác', async ({ page }) => {
        test.setTimeout(600_000);
        const { loi, datTab } = ghiLoi(page);
        const biChan = await chanGhiCloud(page);
        await dangNhapBangToken(page);
        await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
        const soDo: Record<string, unknown> = {};
        for (const tab of TAB_DT) {
            datTab(tab);
            await page.goto(`/?tab=${tab}`);
            await page.waitForTimeout(tab === 'analysis' ? 12_000 : 8_000);
            await page.screenshot({ path: `${OUT}/m-${tab}.png` });
            if (tab === 'analysis') await page.screenshot({ path: `${OUT}/m-analysis-full.png`, fullPage: true });
            soDo[tab] = await doMan(page);
        }
        datTab('menu-khac');
        await page.goto('/?tab=analysis');
        await page.waitForTimeout(8_000);
        await page.locator('[data-app-chrome="tabbar"]').getByRole('button', { name: 'Khác' }).click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/m-menu-khac.png` });
        mkdirSync(OUT, { recursive: true });
        writeFileSync(`${OUT}/do-iphone.json`, JSON.stringify({ soDo, loi, biChan }, null, 2));
    });
});

// 1440×900: bộ ảnh trước/sau (`d-<tab>.png`). 1280×720: laptop cũ ở siêu thị — dock nổi sát nội dung nhất (`d1280-<tab>.png`).
for (const [rong, cao] of [[1440, 900], [1280, 720]] as const) {
    const tienTo = rong === 1440 ? 'd' : `d${rong}`;
    test.describe(`laptop ${rong}`, () => {
        test.use({ viewport: { width: rong, height: cao }, deviceScaleFactor: 1 });
        test('các tab chính', async ({ page }) => {
            test.setTimeout(420_000);
            const { loi, datTab } = ghiLoi(page);
            const biChan = await chanGhiCloud(page);
            await dangNhapBangToken(page);
            await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
            const soDo: Record<string, unknown> = {};
            for (const tab of TAB_LAPTOP) {
                datTab(tab);
                await page.goto(`/?tab=${tab}`);
                await page.waitForTimeout(10_000);
                await page.screenshot({ path: `${OUT}/${tienTo}-${tab}.png` });
                soDo[tab] = await doMan(page);
            }
            mkdirSync(OUT, { recursive: true });
            writeFileSync(`${OUT}/do-laptop${rong === 1440 ? '' : `-${rong}`}.json`, JSON.stringify({ soDo, loi, biChan }, null, 2));
        });
    });
}
