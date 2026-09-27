import { expect, test, type Page } from '@playwright/test';

/**
 * Xuất ảnh trên Safari iOS (2026-09-27). Máy test chỉ có Chromium nên GIẢ LẬP đúng hành vi Safari:
 * lượt `navigator.share()` đầu tiên bị từ chối `NotAllowedError` (dựng ảnh quá ~1s sau lượt chạm),
 * lượt sau (do người dùng chạm lại) thì được. Chạy trên HÀM THẬT của cả 2 khu vực:
 * Phân tích (services/uiService.ts) và Report BI (features/bi-dashboard/services/uiExport/blobUtils.ts).
 */
test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

const giaLapSafari = async (page: Page) => {
    await page.addInitScript(() => {
        const w = window as unknown as { __share: { lan: number; tenFile: string[] }; __revoke: number; __taiFile: number };
        w.__share = { lan: 0, tenFile: [] };
        w.__revoke = 0;
        w.__taiFile = 0;
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { if (this.download) { w.__taiFile++; return; } return click.call(this); };
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async (d: ShareData) => {
                w.__share.lan++;
                w.__share.tenFile.push(...(d.files || []).map(f => f.name));
                if (w.__share.lan === 1) throw new DOMException('The request is not allowed by the user agent', 'NotAllowedError');
            },
        });
        const goc = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (u: string) => { w.__revoke++; goc(u); };
    });
};

for (const kv of [
    { ten: 'Phân tích', mod: '/services/uiService.ts' },
    { ten: 'Report BI', mod: '/features/bi-dashboard/services/uiExport/blobUtils.ts' },
]) {
    test(`${kv.ten}: share bị Safari từ chối → hiện nút chạm lại, chạm thì mở bảng chia sẻ`, async ({ page }) => {
        await giaLapSafari(page);
        await page.goto('/?tab=analysis');
        await page.waitForLoadState('domcontentloaded');

        await page.evaluate(async (modPath) => {
            const mod = await import(/* @vite-ignore */ modPath) as { downloadBlob: (b: Blob, f: string) => void };
            const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }); // CSP chặn fetch(data:)
            mod.downloadBlob(png, 'Bao_cao_thi_dua.png'); // mobile + ảnh → đi đường share
        }, kv.mod);

        const nut = page.getByRole('button', { name: 'Chia sẻ / Lưu ảnh' });
        await expect(nut, 'không hiện nút chạm lại sau khi Safari từ chối').toBeVisible({ timeout: 5000 });
        // Không lặng lẽ rơi xuống "tải file" (iPhone không mở được Lưu ảnh/LINE/Zalo từ đó)
        expect(await page.evaluate(() => (window as unknown as { __taiFile: number }).__taiFile)).toBe(0);

        await nut.tap();
        await expect.poll(() => page.evaluate(() => (window as unknown as { __share: { lan: number } }).__share.lan)).toBe(2);
        const s = await page.evaluate(() => (window as unknown as { __share: { tenFile: string[] } }).__share);
        expect(s.tenFile[1]).toBe('Bao cao thi dua.png');
        await expect(nut).toBeHidden();
    });
}

test('tải file (vd Excel): KHÔNG thu hồi blob URL ngay — Safari iOS đọc blob không đồng bộ', async ({ page }) => {
    await giaLapSafari(page);
    await page.goto('/?tab=analysis');
    const soLanThuHoi = await page.evaluate(async () => {
        const modPath = '/services/uiService.ts'; // biến: để TypeScript không cố phân giải đường dẫn dev server
        const mod = await import(/* @vite-ignore */ modPath) as { downloadBlob: (b: Blob, f: string) => void };
        mod.downloadBlob(new Blob(['a,b'], { type: 'text/csv' }), 'x.csv');
        await new Promise(r => setTimeout(r, 500));
        return (window as unknown as { __revoke: number }).__revoke;
    });
    expect(soLanThuHoi).toBe(0);
});
