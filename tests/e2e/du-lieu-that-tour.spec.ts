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
const THU_MUC = process.env.E2E_SHOT_DIR || 'test-results';
/** Chụp màn hiện tại. App cuộn trong một khung riêng (không cuộn trang) nên `fullPage` không thấy
 *  phần dưới — chụp lần lượt từng "trang" của khung cuộn lớn nhất, tối đa 5 ảnh. */
const chup = async (page: Page, ten: string) => {
    await page.waitForTimeout(1200);
    const r = await page.evaluate(DO);
    ketQua[ten] = r;
    console.log(`[${VP}:${ten}] ${JSON.stringify(r)}`);
    const soTrang = await page.evaluate(() => {
        const ds = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(e => {
            const ov = getComputedStyle(e).overflowY;
            return (ov === 'auto' || ov === 'scroll') && e.scrollHeight > e.clientHeight + 20 && e.clientHeight > 300;
        }).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
        const k = ds[0] || document.scrollingElement as HTMLElement;
        (window as unknown as { __khung: HTMLElement }).__khung = k;
        k.scrollTop = 0;
        return Math.min(5, Math.ceil(k.scrollHeight / k.clientHeight));
    });
    for (let i = 0; i < soTrang; i++) {
        await page.evaluate(i => { const k = (window as unknown as { __khung: HTMLElement }).__khung; k.scrollTop = i * (k.clientHeight - 60); }, i);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${THU_MUC}/tour-${VP}-${ten}-${i + 1}.png` });
    }
    await page.evaluate(() => { (window as unknown as { __khung: HTMLElement }).__khung.scrollTop = 0; });
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

    // ---- Phân tích: đo thời gian tới khi HẾT mọi lớp xử lý (lọc / nạp dữ liệu / AI engine)
    const t0 = Date.now();
    await page.goto('/?tab=analysis');
    const lop = page.getByText(/Đang xử lý bộ lọc|AI ENGINE PROCESSING|Nạp dữ liệu|Đang tải/i).filter({ visible: true });
    let lanTrong = 0;
    const moc: string[] = [];
    for (let i = 0; i < 90 && lanTrong < 4; i++) {
        await page.waitForTimeout(1000);
        const n = await lop.count();
        if (n) { lanTrong = 0; moc.push(`${i + 1}s:${(await lop.first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 40)}`); } else lanTrong++;
    }
    console.log(`[${VP}] Lớp xử lý Phân tích: ${lanTrong >= 4 ? `hết sau ~${Math.round((Date.now() - t0) / 1000) - 4}s` : 'VẪN CÒN sau 90s'} | ${moc.filter((_, i) => i % 3 === 0).join(' · ')}`);
    await chup(page, 'phantich');

    console.log('LOI_JS', JSON.stringify(loiJs));
    console.log('LOI_CONSOLE', JSON.stringify([...new Set(loiConsole)].slice(0, 20)));
    console.log('BI_CHAN', JSON.stringify([...new Set(biChan)]));
    expect(loiJs).toEqual([]);
});
