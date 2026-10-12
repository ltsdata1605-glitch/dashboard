import { test, expect, devices } from '@playwright/test';

/**
 * App ở Màn hình chính iPhone (2026-10-12): bấm "Tiếp tục với Cổng Google" phải mở trang
 * auth.dashboard.pro.vn/pwa-login.html#c=<mã> (KHÔNG signInWithRedirect — redirect quay về app tay không),
 * rồi app hỏi pwaHandoffClaim cho tới khi nhận phiên. Xem functions/src/pwaHandoff.ts.
 */
test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

test('iOS PWA: mở trang đăng nhập riêng và hỏi nhận phiên', async ({ page, context }) => {
    await context.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', { get: () => true });
    });
    const claims: string[] = [];
    let claimReply: object = { result: { ready: false } };
    await context.route('**/pwaHandoffClaim', async route => {
        claims.push(route.request().postDataJSON()?.data?.verifier);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(claimReply) });
    });
    // Không ra mạng thật tới trang đăng nhập: chỉ cần biết app mở đúng URL.
    await context.route('https://auth.dashboard.pro.vn/**', route => route.fulfill({ status: 200, body: 'stub' }));

    await page.goto('/');
    const btn = page.getByRole('button', { name: /Tiếp tục với Cổng Google/ });
    await expect(btn).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Mở cửa sổ đăng nhập Google an toàn')).toBeVisible();
    await page.waitForTimeout(500); // chờ băm mã sẵn

    const popupP = context.waitForEvent('page');
    await btn.click();
    const popup = await popupP;
    const url = popup.url();
    expect(url).toMatch(/^https:\/\/auth\.dashboard\.pro\.vn\/pwa-login\.html#c=[A-Za-z0-9_-]{43}$/);
    await expect(page.getByText(/Chọn tài khoản trong cửa sổ Google vừa mở/)).toBeVisible();

    await expect.poll(() => claims.length, { timeout: 10_000 }).toBeGreaterThan(0);
    const verifier = claims[0];
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Mã trong URL đúng là SHA-256 của verifier app giữ.
    const code = await page.evaluate(async v => {
        const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
        return btoa(String.fromCharCode(...d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }, verifier);
    expect(url.endsWith('#c=' + code)).toBe(true);

    // Máy chủ trả token giả → signInWithCredential lỗi → app báo lỗi, thôi chờ.
    claimReply = { result: { ready: true, idToken: 'fake', accessToken: null } };
    await expect(page.getByText(/Chưa nhận được phiên đăng nhập/)).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/ios-pwa-dang-nhap.png' });
});
