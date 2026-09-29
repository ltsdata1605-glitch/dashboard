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
    // Rút gọn bằng "…" (text-overflow: ellipsis) — không sai về kỹ thuật nhưng người dùng mất chữ;
    // liệt kê ra để soi, không coi là lỗi cứng (tên nhân viên dài trong ô hẹp là chấp nhận được).
    const rutGon = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(e => {
        if (!nhin(e) || !e.textContent?.trim()) return false;
        const cs = getComputedStyle(e);
        return cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
    }).map(e => `"${(e.textContent || '').trim().slice(0, 24)}"`);
    const el = document.documentElement;
    return { tranNgang: el.scrollWidth - el.clientWidth, chuNho: [...new Set(chuNho)].slice(0, 10), biCat: [...new Set(biCat)].slice(0, 12), rutGon: [...new Set(rutGon)].slice(0, 15) };
};

const ketQua: Record<string, unknown> = {};
const THU_MUC = process.env.E2E_SHOT_DIR || 'test-results';
/** Chụp màn hiện tại. App cuộn trong một khung riêng (không cuộn trang) nên `fullPage` không thấy
 *  phần dưới — chụp lần lượt từng "trang" của khung cuộn lớn nhất, tối đa 8 ảnh. */
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
        // Trang tự cuộn (laptop) thì cuộn trang; không thì khung cuộn lớn nhất (điện thoại).
        const trang = document.scrollingElement as HTMLElement;
        const k = trang.scrollHeight > innerHeight + 20 ? trang : (ds[0] || trang);
        (window as unknown as { __khung: HTMLElement }).__khung = k;
        k.scrollTop = 0;
        return Math.min(8, Math.ceil(k.scrollHeight / (k.clientHeight - 60)));
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
    page.on('console', m => { if (m.type() === 'error' || /not found in ICON_MAP/.test(m.text())) loiConsole.push(m.text().slice(0, 160)); });
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
    // Khung xương (animate-pulse) còn = các khối chưa vẽ xong; đo lúc đó thì bỏ sót lỗi của chúng.
    for (let i = 0; i < 30 && await page.locator('.animate-pulse').filter({ visible: true }).count(); i++) await page.waitForTimeout(1000);
    await page.waitForTimeout(6000); // cấu hình ngành hàng về muộn → số liệu còn tính lại vài giây
    await chup(page, 'phantich');

    console.log('LOI_JS', JSON.stringify(loiJs));
    console.log('LOI_CONSOLE', JSON.stringify([...new Set(loiConsole)].slice(0, 20)));
    console.log('BI_CHAN', JSON.stringify([...new Set(biChan)]));
    expect(loiJs).toEqual([]);
});

/** Lớp nổi (modal/dropdown) có nằm trọn trong khung nhìn không — cắt mép là không bấm được nút đóng. */
const DO_LOP_NOI = () => {
    const ds = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="listbox"], [role="menu"], .fixed, [class*="z-50"], [class*="z-[60"]'))
        .filter(e => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 40 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; });
    return ds.map(e => { const r = e.getBoundingClientRect(); return { lop: (e.className || '').toString().slice(0, 40), trai: Math.round(r.left), phai: Math.round(innerWidth - r.right), tren: Math.round(r.top), duoi: Math.round(innerHeight - r.bottom) }; })
        .filter(x => x.trai < -1 || x.phai < -1 || x.tren < -1);
};

test('tương tác: popup, modal, tab con (chỉ đọc)', async ({ page }) => {
    test.setTimeout(420_000);
    const loiJs: string[] = [];
    const iconThieu = new Set<string>();
    page.on('pageerror', e => loiJs.push(e.message));
    page.on('console', m => { const k = m.text().match(/Icon "([^"]+)" not found/); if (k) iconThieu.add(k[1]); });
    await chanGhiCloud(page);
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
    await page.waitForTimeout(4000); // để resolveSession xong trước khi chuyển trang

    const mo = async (ten: string, hanhDong: () => Promise<unknown>) => {
        try { await hanhDong(); } catch (e) { console.log(`  (bỏ qua ${ten}: ${(e as Error).message.split('\n')[0]})`); return; }
        await page.waitForTimeout(1500);
        const lech = await page.evaluate(DO_LOP_NOI);
        if (lech.length) console.log(`[${VP}:${ten}] LỚP NỔI LỆCH ${JSON.stringify(lech)}`);
        await chup(page, ten);
    };
    const nut = (ten: string | RegExp) => page.getByRole('button', { name: ten }).filter({ visible: true }).first();
    const chu = (ten: string | RegExp) => page.getByText(ten).filter({ visible: true }).first();

    // ---- Phân tích
    await page.goto('/?tab=analysis');
    for (let i = 0; i < 30 && await page.locator('.animate-pulse').filter({ visible: true }).count(); i++) await page.waitForTimeout(1000);
    await page.waitForTimeout(5000);
    await mo('pt-qua-han', () => chu(/Xem chi tiết & Cập nhật nhanh/).click({ timeout: 5000 }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    await mo('pt-chua-thu', () => chu(/^Xem danh sách$/).click({ timeout: 5000 }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    await mo('pt-nganh-drill', () => chu(/^Phụ kiện$/i).click({ timeout: 5000 }));
    for (const tab of ['Hiệu Suất', 'Khai Thác', '7 Ngày']) {
        await mo(`pt-nv-${tab.replace(/\s+/g, '').toLowerCase()}`, async () => { const b = nut(new RegExp(`^${tab}$`, 'i')); await b.scrollIntoViewIfNeeded({ timeout: 5000 }); await b.click({ timeout: 5000 }); });
    }

    // ---- Report BI
    await page.goto('/?tab=employees');
    await page.waitForTimeout(6000);
    await nut(/^Siêu thị$/).click().catch(() => {});
    await page.waitForTimeout(1500);
    await mo('bi-chon-cum', () => nut(/CỤM/).click({ timeout: 5000 }));
    await page.keyboard.press('Escape'); await page.mouse.click(5, 300); await page.waitForTimeout(800);
    await mo('bi-luyke', async () => { await nut(/^Realtime$/).click({ timeout: 5000 }); await page.waitForTimeout(800); const lk = chu(/^Luỹ kế$/); if (await lk.isVisible().catch(() => false)) await lk.click(); });
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    await nut(/^Nhân viên$/).click().catch(() => {});
    await page.waitForTimeout(2500);
    await nut(/^Thi đua$/).click().catch(() => {});
    await page.waitForTimeout(1500);
    for (const tab of ['Tổng', 'Tuỳ chỉnh', 'Cá nhân', 'So sánh']) {
        await mo(`bi-nv-thidua-${tab.replace(/\s+/g, '').toLowerCase()}`, () => nut(new RegExp(`^${tab}$`)).click({ timeout: 5000 }));
    }
    console.log('LOI_JS', JSON.stringify(loiJs));
    console.log('ICON_THIEU', JSON.stringify([...iconThieu]));
    expect(loiJs).toEqual([]);
    expect([...iconThieu]).toEqual([]);
});
