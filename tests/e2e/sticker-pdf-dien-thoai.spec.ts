import { test, expect, type Page } from '@playwright/test';

/**
 * Audit 2026-10-07 (GĐ5, IOS-01 + IOS-08): in tem trên ĐIỆN THOẠI tạo PDF để xem trước.
 *  - Trước: PDF là `data:` URI → iframe xem trước bị CSP `frame-src` chặn → khung trắng trên iPhone.
 *    Sau: Blob URL (`blob:`), CSP cho phép, nội dung đúng là PDF.
 *  - Trước: lỗi giữa chừng để lại khung dựng ẩn (kèm toàn bộ tem) trong DOM. Sau: luôn được gỡ.
 *  - Trước (phát hiện khi viết test này): tem dựng ngay trong trang thừa hưởng màu oklch của Tailwind v4,
 *    html2canvas ném lỗi → in tem trên điện thoại HỎNG HOÀN TOÀN. Sau: dựng trong iframe cách ly.
 * Gọi thẳng hàm thật `printPriceTags` qua Vite dev + CSP thật của index.html, UA iPhone để đi nhánh mobile.
 */
test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });

const SP = (msp: string) => ({ msp, sanPham: `Sản phẩm ${msp}`, thuongERP: 0, thuongNong: 0, tongThuong: 0, giaGoc: '1.990.000', giaGiam: '1.490.000', khuyenMai: '', ngayIn: '', selected: true, quantity: 1 });
const CAI_DAT = { showOriginalPrice: true, showPromotion: true, showBonus: false, showQrCode: true, showEmployeeName: false, tagsPerPage: 4, shortenPrice: false, sortByName: false, stickerStyle: 'default' };

async function inTem(page: Page, loiCanvas: boolean) {
    return page.evaluate(async ({ sps, caiDat, loiCanvas }) => {
        if (loiCanvas) {
            // Canvas chụp tem thuộc iframe dựng (realm riêng) → giả lập lỗi ngay trong iframe đó khi nó xuất hiện.
            new MutationObserver(() => {
                const f = document.querySelector('iframe[data-sticker-render]') as HTMLIFrameElement | null;
                const w = f?.contentWindow as (Window & typeof globalThis) | null;
                if (w) w.HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('canvas hỏng (giả lập)'); };
            }).observe(document.body, { childList: true });
        }
        // @ts-expect-error — đường dẫn module do Vite dev phục vụ trong trình duyệt, không phải đường dẫn TypeScript
        const mod = await import('/features/sticker-event/services/printService.ts');
        // Khung dựng ẩn: bản cũ là <div> opacity 0 / z-index -1, bản mới là iframe [data-sticker-render].
        const anCon = () => [...document.body.children].filter((el) => el.hasAttribute('data-sticker-render') || ((el as HTMLElement).style.zIndex === '-1' && (el as HTMLElement).style.opacity === '0')).length;
        try {
            const url = await mod.printPriceTags(sps, 'NV', caiDat);
            return { url: url as string, loi: null as string | null, khungAnConLai: anCon() };
        } catch (e) {
            return { url: null, loi: String((e as Error).message), khungAnConLai: anCon() };
        }
    }, { sps: [SP('1001'), SP('1002'), SP('1003')], caiDat: CAI_DAT, loiCanvas });
}

test('iPhone: PDF là Blob URL, xem trước trong iframe không bị CSP chặn', async ({ page }) => {
    test.setTimeout(90000);
    const viPham: string[] = [];
    page.on('console', (m) => { if (/Content Security Policy|Refused to frame/i.test(m.text())) viPham.push(m.text()); });
    await page.goto('/');
    await page.waitForTimeout(1500);

    const kq = await inTem(page, false);
    console.log('URL PDF:', kq.url?.slice(0, 40), '| khung ẩn còn lại:', kq.khungAnConLai);
    expect(kq.loi).toBeNull();
    expect(kq.url).toMatch(/^blob:/);
    expect(kq.khungAnConLai).toBe(0);

    const dau = await page.evaluate(async (u) => {
        const b = await (await fetch(u)).blob();
        return { type: b.type, size: b.size, magic: await b.slice(0, 5).text() };
    }, kq.url!);
    console.log('PDF:', dau);
    if (process.env.PDF_OUT) {
        const b64 = await page.evaluate(async (u) => { const buf = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (const x of buf) s += String.fromCharCode(x); return btoa(s); }, kq.url!);
        (await import('node:fs')).writeFileSync(process.env.PDF_OUT, Buffer.from(b64, 'base64'));
    }
    expect(dau.magic).toBe('%PDF-');
    expect(dau.type).toBe('application/pdf');

    // Đặt vào iframe như PdfPreviewModal — CSP thật của trang quyết định có hiện hay không.
    await page.evaluate((u) => new Promise<void>((resolve) => {
        document.addEventListener('securitypolicyviolation', (e) => { (window as unknown as { __csp: string[] }).__csp = [...((window as unknown as { __csp?: string[] }).__csp ?? []), `${e.violatedDirective} ${e.blockedURI}`]; });
        const f = document.createElement('iframe');
        f.src = u; f.onload = () => resolve(); setTimeout(resolve, 3000);
        document.body.appendChild(f);
    }), kq.url!);
    const csp = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    console.log('Vi phạm CSP:', csp, viPham);
    expect(csp).toEqual([]);
    expect(viPham).toEqual([]);
});

test('iPhone: lỗi giữa lúc dựng PDF vẫn gỡ khung dựng ẩn khỏi trang', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/');
    await page.waitForTimeout(1500);
    const kq = await inTem(page, true);
    console.log('Lỗi:', kq.loi, '| khung ẩn còn lại:', kq.khungAnConLai);
    expect(kq.loi).toContain('canvas hỏng');
    expect(kq.khungAnConLai).toBe(0);
});

test('iPhone: khổ bill 80mm — mỗi tem một trang PDF', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/');
    await page.waitForTimeout(1500);
    const kq = await page.evaluate(async ({ sps, caiDat }) => {
        // @ts-expect-error — đường dẫn module do Vite dev phục vụ trong trình duyệt, không phải đường dẫn TypeScript
        const mod = await import('/features/sticker-event/services/printService.ts');
        const url = await mod.printPriceTags(sps, 'NV', caiDat) as string;
        const txt = await (await fetch(url)).text();
        return { url, trang: (txt.match(/\/Type\s*\/Page[^s]/g) ?? []).length };
    }, { sps: [SP('2001'), SP('2002'), SP('2003')], caiDat: { ...CAI_DAT, tagsPerPage: 80 } });
    console.log('Bill 80mm — số trang:', kq.trang);
    expect(kq.url).toMatch(/^blob:/);
    expect(kq.trang).toBe(3);
});
