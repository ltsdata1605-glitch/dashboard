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
    let claimWarmups = 0;
    let claimReply: object = { result: { ready: false } };
    await context.route('**/pwaHandoffClaim', async route => {
        const d = route.request().postDataJSON()?.data;
        if (d?.warmup) { claimWarmups++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"result":{"ready":false,"warm":true}}' }); }
        claims.push(d?.verifier);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(claimReply) });
    });
    const warmups: unknown[] = [];
    await context.route('**/pwaHandoffStore', async route => {
        warmups.push(route.request().postDataJSON()?.data);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true, warm: true } }) });
    });
    // Không ra mạng thật tới trang đăng nhập: chỉ cần biết app mở đúng URL.
    await context.route('https://auth.dashboard.pro.vn/**', route => route.fulfill({ status: 200, body: 'stub' }));

    await page.goto('/');
    const btn = page.getByRole('button', { name: /Tiếp tục với Cổng Google/ });
    await expect(btn).toBeVisible({ timeout: 30_000 });
    // Dòng gợi ý dưới nút (chữ đổi ở d70baad: mọi thiết bị iOS dùng chung cơ chế handoff).
    await expect(page.getByText('Đăng nhập Google an toàn được tối ưu riêng cho iPhone & iPad.')).toBeVisible();
    await page.waitForTimeout(500); // chờ băm mã sẵn

    const popupP = context.waitForEvent('page');
    await btn.click();
    const popup = await popupP;
    const url = popup.url();
    // 2026-10-21: app đi THẲNG tới trang xử lý của Firebase (bỏ chặng nạp thư viện ở pwa-login.html); xong Firebase đưa về
    // pwa-login.html?c=<mã>&m=pwa (m=pwa: app Màn hình chính → trang đó tự đóng khung khi xong).
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://auth.dashboard.pro.vn/__/auth/handler');
    expect(u.searchParams.get('authType')).toBe('signInViaRedirect');
    expect(u.searchParams.get('providerId')).toBe('google.com');
    expect(u.searchParams.get('scopes')).toContain('https://www.googleapis.com/auth/spreadsheets');
    expect(JSON.parse(u.searchParams.get('customParameters') || '{}')).toEqual({ prompt: 'select_account' }); // máy mới: chưa nhớ tài khoản
    const ve = new URL(u.searchParams.get('redirectUrl') || '');
    expect(ve.origin + ve.pathname).toBe('https://auth.dashboard.pro.vn/pwa-login.html');
    expect(ve.searchParams.get('c')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ve.searchParams.get('m')).toBe('pwa');
    // Trong lúc chờ: màn "Đang hoàn tất đăng nhập…" thay hẳn form (2026-10-13 — form hiện lại làm người dùng tưởng lỗi).
    const waiting = page.getByTestId('login-handoff-waiting');
    await expect(waiting).toBeVisible();
    await expect(page.getByText('Đang hoàn tất đăng nhập…')).toBeVisible();
    await expect(btn).toBeHidden();

    await expect.poll(() => claims.length, { timeout: 10_000 }).toBeGreaterThan(0);
    const verifier = claims[0];
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Mã trong URL đúng là SHA-256 của verifier app giữ.
    const code = await page.evaluate(async v => {
        const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
        return btoa(String.fromCharCode(...d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }, verifier);
    expect(ve.searchParams.get('c')).toBe(code);
    // Bấm nút là đánh thức trước Cloud Function nhận phiên (đỡ khởi động nguội khi trang Google xong).
    expect(warmups).toContainEqual({ warmup: true });
    expect(claimWarmups).toBeGreaterThan(0); // hàm NHẬN phiên cũng được hâm nóng lúc bấm (2026-10-21)

    await page.screenshot({ path: 'test-results/ios-pwa-dang-cho.png' });

    // Máy chủ trả token giả → signInWithCredential lỗi. Từ 2026-10-13: app THÔI CHỜ, quay về nút đăng nhập VÀ
    // báo lỗi rõ (trước đó lỗi bị nuốt, người dùng lặng lẽ bị đẩy về form như chưa từng đăng nhập).
    claimReply = { result: { ready: true, idToken: 'fake', accessToken: null } };
    await expect(waiting).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/Chưa vào được ứng dụng/)).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(page.getByText('Đăng nhập Google an toàn được tối ưu riêng cho iPhone & iPad.')).toBeVisible();
    await page.screenshot({ path: 'test-results/ios-pwa-dang-nhap.png' });
});
