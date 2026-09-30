import { expect, test, type Page } from '@playwright/test';

/**
 * Đợt 3 audit (2026-09-30) — khâu giao ảnh chung (components/shared/ui/imageDelivery.ts) và các bộ
 * xuất trước đây tự viết riêng: Phân ca / Sticker (A06), Báo cáo khai thác (A07), Check thưởng Top (A08).
 * Chromium GIẢ LẬP iPhone (UA iOS + cảm ứng), không phải Safari thật: hành vi share của Safari được
 * mô phỏng bằng navigator.share giả; trần canvas iOS được kiểm bằng kích thước ảnh ra.
 */
test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
});

type W = Window & { __share: { lan: number; loi?: string; ten: string[] }; __taiFile: string[]; __revokeNgay: number };

const giaLap = async (page: Page, loiShare?: 'NotAllowedError' | 'AbortError') => {
    await page.addInitScript((loi) => {
        const w = window as unknown as W;
        w.__share = { lan: 0, loi: loi || undefined, ten: [] };
        w.__taiFile = [];
        w.__revokeNgay = 0;
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
            if (this.download) { w.__taiFile.push(this.download); return; }
            return click.call(this);
        };
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async (d: ShareData) => {
                w.__share.lan++;
                w.__share.ten.push(...(d.files || []).map(f => f.name));
                if (w.__share.loi) throw new DOMException('mô phỏng Safari', w.__share.loi);
            },
        });
        // Đếm URL bị thu hồi NGAY trong cùng lượt với click() (Safari đọc blob không đồng bộ)
        const goc = URL.revokeObjectURL.bind(URL);
        let trongLuotClick = false;
        const clickGoc = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
            trongLuotClick = true;
            queueMicrotask(() => { trongLuotClick = false; });
            return clickGoc.call(this);
        };
        URL.revokeObjectURL = (u: string) => { if (trongLuotClick) w.__revokeNgay++; goc(u); };
    }, loiShare || '');
    await page.goto('/');
};

const png = () => new Blob([new Uint8Array(600).fill(1)], { type: 'image/png' });

test('deliverImage trên iPhone: mở bảng chia sẻ, trả "shared"', async ({ page }) => {
    await giaLap(page);
    const kq = await page.evaluate(async () => {
        const m = await import(/* @vite-ignore */ '/components/shared/ui/imageDelivery.ts' as string);
        return m.deliverImage(new Blob([new Uint8Array(600)], { type: 'image/png' }), 'Bao_cao_A.png');
    });
    expect(kq).toBe('shared');
    expect(await page.evaluate(() => (window as unknown as W).__share.ten)).toEqual(['Bao cao A.png']);
});

test('deliverImage: Safari từ chối (NotAllowedError) → nút chạm lại, KHÔNG lặng lẽ tải file', async ({ page }) => {
    await giaLap(page, 'NotAllowedError');
    const kq = await page.evaluate(async () => {
        const m = await import(/* @vite-ignore */ '/components/shared/ui/imageDelivery.ts' as string);
        return m.deliverImage(new Blob([new Uint8Array(600)], { type: 'image/png' }), 'x.png');
    });
    expect(kq).toBe('retry-offered');
    await expect(page.getByRole('button', { name: 'Chia sẻ / Lưu ảnh' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as W).__taiFile.length)).toBe(0);
});

test('deliverImage: người dùng đóng bảng chia sẻ → "cancelled", không tải', async ({ page }) => {
    await giaLap(page, 'AbortError');
    const kq = await page.evaluate(async () => {
        const m = await import(/* @vite-ignore */ '/components/shared/ui/imageDelivery.ts' as string);
        return m.deliverImage(new Blob([new Uint8Array(600)], { type: 'image/png' }), 'x.png');
    });
    expect(kq).toBe('cancelled');
    expect(await page.evaluate(() => (window as unknown as W).__taiFile.length)).toBe(0);
});

for (const kv of [
    { ten: 'Phân ca', mod: '/features/phan-ca/services/uiService.ts' },
    { ten: 'In Sticker', mod: '/features/sticker-event/services/uiService.ts' },
]) {
    test(`${kv.ten}: tải file không thu hồi blob URL ngay; iPhone đi đường chia sẻ`, async ({ page }) => {
        await giaLap(page);
        await page.evaluate(async (mod) => {
            const m = await import(/* @vite-ignore */ mod) as { downloadBlob: (b: Blob, f: string, force?: boolean) => void };
            m.downloadBlob(new Blob([new Uint8Array(600)], { type: 'image/png' }), 'lich.png', true); // ép tải
            m.downloadBlob(new Blob([new Uint8Array(600)], { type: 'image/png' }), 'lich2.png');       // mobile → share
        }, kv.mod);
        await expect.poll(() => page.evaluate(() => (window as unknown as W).__share.lan)).toBe(1);
        const w = await page.evaluate(() => { const x = window as unknown as W; return { tai: x.__taiFile, revokeNgay: x.__revokeNgay }; });
        expect(w.tai).toEqual(['lich.png']);
        expect(w.revokeNgay, 'thu hồi blob URL ngay sau click() — Safari tải hỏng').toBe(0);
    });

    test(`${kv.ten}: bảng rất dài trên iPhone không vượt trần diện tích canvas iOS (16 triệu px)`, async ({ page }) => {
        await giaLap(page);
        const kq = await page.evaluate(async (mod) => {
            const m = await import(/* @vite-ignore */ mod) as { exportElementAsImage: (el: HTMLElement, f: string, o: object) => Promise<Blob | null> };
            const el = document.createElement('div');
            el.style.cssText = 'width:1000px;background:#fff';
            el.innerHTML = Array.from({ length: 300 }, (_, i) => `<div style="height:40px;border-bottom:1px solid #ccc">Dòng ${i + 1}</div>`).join('');
            document.body.appendChild(el);
            const blob = await m.exportElementAsImage(el, 'dai.png', { scale: 2, mode: 'blob-only', captureAsDisplayed: true });
            el.remove();
            if (!blob) return null;
            const bmp = await createImageBitmap(blob);
            return { w: bmp.width, h: bmp.height };
        }, kv.mod);
        expect(kq, 'không tạo được ảnh').not.toBeNull();
        console.log(`${kv.ten} — ảnh ${kq!.w}×${kq!.h} = ${(kq!.w * kq!.h / 1e6).toFixed(1)} triệu px`);
        expect(kq!.w * kq!.h).toBeLessThanOrEqual(16_000_000);
    });
}

test('Check thưởng Top: iPhone mở bảng chia sẻ (trước: luôn tải file); tên siêu thị dài không bị cắt "…"', async ({ page }) => {
    await giaLap(page);
    const kq = await page.evaluate(async () => {
        let css = '';
        const mo = new MutationObserver(() => {
            const td = document.querySelector('#check-thuong-capture-target tbody td:nth-child(3)') as HTMLElement | null;
            if (td && !css) css = td.getAttribute('style') || '';
        });
        mo.observe(document.body, { childList: true, subtree: true });
        const m = await import(/* @vite-ignore */ '/features/check-thuong/services/checkThuongImageExport.ts' as string);
        const ketQua = await m.exportLeaderboardToImage({
            stores: [{ storeCode: '1234', storeName: 'ĐMX Siêu Thị Điện Máy Xanh Số 123 Đường Hùng Vương Nối Dài Phường 7 Quận 5', achievedCount: 3, totalCategories: 5, achievedPercent: 60, totalBonus: 12_000_000 }],
        });
        mo.disconnect();
        return { ketQua, css };
    });
    expect(kq.ketQua).toBe('shared');
    expect(await page.evaluate(() => (window as unknown as W).__share.lan)).toBe(1);
    expect(kq.css).not.toContain('text-overflow: ellipsis');
});
