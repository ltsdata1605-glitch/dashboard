import { expect, test, type Page } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';

/**
 * Đi hết các màn con của Phân tích và Report BI trên DỮ LIỆU THẬT (lts.data1605, Kho 910) —
 * 2026-09-28. Khung chọn bằng `E2E_VP=laptop|iphone` (mặc định laptop 1366×768 — laptop cũ ở siêu
 * thị). Mỗi màn: chụp ảnh `test-results/tour-<vp>-<màn>.png` và đo: tràn ngang trang, chữ < 11px,
 * chữ bị cắt cụt không có dấu "…", lỗi JS. CHỈ ĐỌC (xem helpers/customTokenLogin.ts).
 */
test.skip(!hasCustomToken(), 'Chưa có E2E_CUSTOM_TOKEN_FILE (custom token của tài khoản test)');

const VP = process.env.E2E_VP === 'iphone' ? 'iphone' : 'laptop';
const moiTruong = {
    launchOptions: {
        ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
};
test.use(VP === 'iphone' ? {
    ...moiTruong,
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
} : { ...moiTruong, viewport: { width: 1366, height: 768 } });

/** Đo trong trang. Chữ bị cắt = phần tử lá có chữ, bị cắt ngang (scrollWidth > clientWidth) bởi
 *  overflow ẩn, mà KHÔNG có text-overflow: ellipsis (người dùng không biết là bị cắt). */
const DO = () => {
    const nhin = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const la = Array.from(document.querySelectorAll('body *')).filter(el => nhin(el) && !!el.textContent?.trim() && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent!.trim()));
    const chuNho = la.filter(el => parseFloat(getComputedStyle(el).fontSize) < 11)
        .map(el => `${parseFloat(getComputedStyle(el).fontSize)}px "${(el.textContent || '').trim().slice(0, 20)}"`);
    const biCat = la.filter(el => {
        const cs = getComputedStyle(el);
        const e = el as HTMLElement;
        return e.scrollWidth > e.clientWidth + 1 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll';
    }).map(el => `"${(el.textContent || '').trim().slice(0, 24)}" ${(el as HTMLElement).clientWidth}/${(el as HTMLElement).scrollWidth}`);
    const el = document.documentElement;
    return { tranNgang: el.scrollWidth - el.clientWidth, chuNho: [...new Set(chuNho)].slice(0, 10), biCat: [...new Set(biCat)].slice(0, 12) };
};

const ketQua: Record<string, unknown> = {};
const chup = async (page: Page, ten: string) => {
    await page.waitForTimeout(1200);
    const r = await page.evaluate(DO);
    ketQua[ten] = r;
    await page.screenshot({ path: `${process.env.E2E_SHOT_DIR || 'test-results'}/tour-${VP}-${ten}.png`, fullPage: true });
    console.log(`[${VP}:${ten}] ${JSON.stringify(r)}`);
};
const bam = async (page: Page, ten: string | RegExp, cho = 1500) => {
    const nut = page.getByRole('button', { name: ten }).filter({ visible: true }).first();
    if (!(await nut.isVisible().catch(() => false))) { console.log(`  (không thấy nút ${ten})`); return false; }
    await nut.click();
    await page.waitForTimeout(cho);
    return true;
};

test('tour Report BI + Phân tích trên dữ liệu thật', async ({ page }) => {
    test.setTimeout(420_000);
    const loiJs: string[] = [];
    const loiConsole: string[] = [];
    page.on('pageerror', e => loiJs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') loiConsole.push(m.text().slice(0, 160)); });
    const biChan = await chanGhiCloud(page);
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });

    // ---- Report BI
    await page.goto('/?tab=employees');
    await page.waitForTimeout(8000);
    await bam(page, /^Siêu thị$/);
    await bam(page, /^Doanh thu$/);
    await chup(page, 'bi-sieuthi-doanhthu');
    await bam(page, /^Thi đua$/);
    await chup(page, 'bi-sieuthi-thidua');

    await bam(page, /^Nhân viên$/, 3000);
    for (const [nhan, ten] of [['Doanh thu', 'doanhthu'], ['Trả chậm', 'tracham'], ['Thi đua', 'thidua'], ['Thưởng', 'thuong']] as const) {
        if (await bam(page, new RegExp(`^${nhan}$`), 2500)) await chup(page, `bi-nhanvien-${ten}`);
    }
    await bam(page, /^Cập nhật$/, 2500);
    await chup(page, 'bi-capnhat');

    // ---- Phân tích: đo cả thời gian lớp "Đang xử lý bộ lọc" tồn tại
    const t0 = Date.now();
    await page.goto('/?tab=analysis');
    const lop = page.getByText(/Đang xử lý bộ lọc/i);
    let conLop = true;
    for (let i = 0; i < 60 && conLop; i++) { await page.waitForTimeout(1000); conLop = await lop.isVisible().catch(() => false); if (i < 3) conLop = true; }
    console.log(`[${VP}] Lớp "Đang xử lý bộ lọc": ${conLop ? 'VẪN CÒN sau 60s' : `tắt sau ~${Math.round((Date.now() - t0) / 1000)}s`}`);
    await chup(page, 'phantich');

    console.log('LOI_JS', JSON.stringify(loiJs));
    console.log('LOI_CONSOLE', JSON.stringify([...new Set(loiConsole)].slice(0, 20)));
    console.log('BI_CHAN', JSON.stringify([...new Set(biChan)]));
    expect(loiJs).toEqual([]);
});
