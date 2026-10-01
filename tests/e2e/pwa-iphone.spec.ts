import { test, expect } from '@playwright/test';

/**
 * PWA cho iPhone (KE_HOACH_NANG_CAP_MOBILE_APP_IPHONE.md Giai đoạn 1).
 * iOS lặng lẽ bỏ qua icon/splash sai — không báo lỗi gì, chỉ hiện ảnh chụp màn hình thay icon và
 * màn trắng thay splash. Nên test này kiểm từng ảnh: tải được, đúng kích thước px mà thẻ khai báo.
 */
test.describe('PWA iPhone', () => {
    test('manifest + icon + splash khai báo trong index.html đều hợp lệ', async ({ page }) => {
        const cspErrors: string[] = [];
        page.on('console', (m) => { if (/Content-Security-Policy|Refused to/.test(m.text())) cspErrors.push(m.text()); });
        await page.goto('/');

        const meta = await page.evaluate(() => ({
            capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
            statusBar: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content'),
            title: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content'),
            manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
            icons: [...document.querySelectorAll('link[rel="apple-touch-icon"]')].map((l) => ({ href: l.getAttribute('href')!, sizes: l.getAttribute('sizes') })),
            splash: [...document.querySelectorAll('link[rel="apple-touch-startup-image"]')].map((l) => ({ href: l.getAttribute('href')!, media: l.getAttribute('media')! })),
        }));
        expect(meta.capable).toBe('yes');
        expect(meta.statusBar).toBe('default');
        expect(meta.title).toBe('Dashboard YCX');
        expect(meta.splash.length).toBeGreaterThanOrEqual(12);

        const res = await page.request.get(meta.manifest!);
        expect(res.ok()).toBe(true);
        const manifest = await res.json();
        expect(manifest.display).toBe('standalone');
        expect(manifest.start_url).toBe('/');

        const sizeOf = (src: string) => page.evaluate((s) => new Promise<[number, number]>((ok, fail) => {
            const img = new Image();
            img.onload = () => ok([img.naturalWidth, img.naturalHeight]);
            img.onerror = () => fail(new Error('Không tải được ' + s));
            img.src = s;
        }), src);

        for (const icon of manifest.icons as { src: string; sizes: string }[]) {
            expect((await sizeOf(icon.src)).join('x'), icon.src).toBe(icon.sizes);
        }
        for (const icon of meta.icons) {
            const [w, h] = await sizeOf(icon.href);
            expect(w, icon.href).toBe(h);
            if (icon.sizes) expect(`${w}x${h}`, icon.href).toBe(icon.sizes);
        }
        for (const s of meta.splash) {
            const m = s.media.match(/device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)/)!;
            const [w, h, dpr] = [Number(m[1]), Number(m[2]), Number(m[3])];
            expect(await sizeOf(s.href), s.href).toEqual([w * dpr, h * dpr]);
        }
        expect(cspErrors).toEqual([]);
    });

    test.describe('khung iPhone', () => {
        test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

        // Lưu ý: Chromium headless không có thanh công cụ co giãn nên 100vh == 100dvh ở đây; chênh lệch
        // vh/dvh chỉ thấy trên Safari thật — phần đó phải kiểm trên iPhone.
        test('màn đăng nhập không tràn khung nhìn + nút bấm có touch-action: manipulation', async ({ page }) => {
            await page.goto('/');
            await expect(page.getByText('Chế độ Dùng Thử', { exact: false }).first()).toBeVisible();
            const { scrollH, innerH } = await page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, innerH: innerHeight }));
            expect(scrollH).toBeLessThanOrEqual(innerH + 1);
            const ta = await page.evaluate(() => getComputedStyle(document.querySelector('button')!).touchAction);
            expect(ta).toBe('manipulation');
        });
    });
});
