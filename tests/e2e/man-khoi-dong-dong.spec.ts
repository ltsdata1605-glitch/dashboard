import { test, expect } from '@playwright/test';

/**
 * Màn khởi động động (2026-10-22): index.html #ycx-splash + public/man-cho-khoi-dong.js.
 * - Khung đầu TRÙNG KHÍT ảnh khởi động tĩnh của iOS (public/splash/*.png) → iPhone chuyển ảnh → trang không giật.
 * - Logo "thở" + vệt sáng, chữ có ánh xanh chạy qua, thanh chờ mảnh hiện sau 0,6 s.
 * - App vẽ xong nội dung thật (màn đăng nhập) → mờ dần rồi gỡ khỏi trang; không che nút bấm.
 */
test.use({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, browserName: 'chromium' });

test('khung đầu trùng ảnh khởi động iOS; hiệu ứng chạy; chụp từng khung', async ({ page }) => {
    await page.route(/\/index\.tsx/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export {};' })); // app không chạy → màn chờ đứng yên để soi (tự tắt sau 12 s)
    await page.addInitScript(() => {
        const st = document.createElement('style');
        st.id = 'dung-hieu-ung';
        st.textContent = '#ycx-splash, #ycx-splash *, #ycx-splash *::before, #ycx-splash *::after { animation-play-state: paused !important; }';
        document.documentElement.appendChild(st);
    });
    await page.goto('/');
    await expect(page.locator('#ycx-splash')).toBeVisible();
    await page.waitForTimeout(300);
    const anh = await page.screenshot({ path: 'test-results/khoi-dong-khung-dau.png' });
    // So từng điểm ảnh với ảnh khởi động iOS bằng canvas ngay trong trình duyệt (không cần thư viện ảnh).
    const tiLe = await page.evaluate(async (chupB64) => {
        const nap = (src: string) => new Promise<HTMLImageElement>((ok, loi) => { const i = new Image(); i.onload = () => ok(i); i.onerror = loi; i.src = src; });
        const [a, b] = await Promise.all([nap('/splash/iphone-1179x2556.png'), nap('data:image/png;base64,' + chupB64)]);
        if (a.width !== b.width || a.height !== b.height) return 1;
        const doc = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d')!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
        const da = doc(a), db = doc(b);
        let lech = 0;
        for (let i = 0; i < da.length; i += 4) {
            if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 48) lech++;
        }
        return lech / (a.width * a.height);
    }, anh.toString('base64'));
    console.log('LECH_SO_VOI_PNG', (tiLe * 100).toFixed(3) + '%');
    expect(tiLe).toBeLessThan(0.003);

    // Cho hiệu ứng chạy, chụp từng khung để xem
    await page.evaluate(() => document.getElementById('dung-hieu-ung')?.remove());
    for (const ms of [0, 700, 1100, 1500, 2100]) {
        if (ms) await page.waitForTimeout(ms === 700 ? 700 : 400);
        await page.locator('#ycx-splash .nhom').screenshot({ path: `test-results/khoi-dong-${ms}.png`, scale: 'css' });
    }
});

test('app vẽ xong màn đăng nhập → màn chờ mờ dần và được gỡ, nút bấm được ngay', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-google')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#ycx-splash')).toHaveCount(0, { timeout: 2_000 });
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click({ timeout: 3_000 });
});

test('app Màn hình chính (thanh trạng thái "default"): đẩy cụm logo lên nửa chiều cao thanh trạng thái cho khớp ảnh tĩnh', async ({ page }) => {
    await page.route(/\/index\.tsx/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export {};' }));
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'standalone', { get: () => true });
        Object.defineProperty(screen, 'height', { get: () => 852 + 54 }); // iPhone 15: thanh trạng thái 54pt nằm ngoài khung trang
    });
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('ycx-splash')!).getPropertyValue('--ycx-lech').trim())).toBe('-27px');
});
