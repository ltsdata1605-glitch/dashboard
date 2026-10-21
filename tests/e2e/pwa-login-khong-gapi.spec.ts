import { test, expect, devices, type Page, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Trang đăng nhập phụ auth.dashboard.pro.vn/pwa-login.html KHÔNG được phụ thuộc khung ẩn gapi (apis.google.com)
 * — 2026-10-21, chủ dự án quay video iPhone mới kẹt ở "Đang mở trang đăng nhập Google…": getAuth() trên iPhone chờ
 * tải gapi + IndexedDB (tới 30–60 s) trước khi chịu chuyển trang. Ở đây apis.google.com bị TREO hẳn (không trả lời)
 * mà trang vẫn phải: sang trang Google, nhận kết quả về, gửi phiên.
 *
 * Dùng mạng thật tới Firebase/Google (trang /__/auth/handler, identitytoolkit) — không cần tài khoản Google: lượt
 * "về từ Google" được giả bằng cách gọi thẳng handler với state thật + error=access_denied (như bấm Huỷ ở Google).
 */
test.use({ ...devices['iPhone 15'], defaultBrowserType: undefined });

const HTML = readFileSync('auth-hosting/pwa-login.html', 'utf8');
const CODE = 'C'.repeat(43);
const API_KEY = HTML.match(/const API_KEY = '([^']+)'/)![1]; // khoá web công khai — lấy từ trang, không chép vào test

async function chuanBi(context: BrowserContext) {
    const gapi: string[] = [];
    // apis.google.com treo: không trả lời gì (giống máy bị chặn/treo mạng tới đó).
    await context.route('https://apis.google.com/**', r => { gapi.push(r.request().url()); return new Promise(() => {}); });
    await context.route(/^https:\/\/auth\.dashboard\.pro\.vn\/pwa-login\.html([?#].*)?$/, r => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
    return gapi;
}

/** Đúng URL app mới (services/firebase.ts → taoUrlDangNhapHandoff) mở: đi thẳng tới trang xử lý của Firebase. */
const urlDiThang = (q: Record<string, string>, thamSo: Record<string, string> = { prompt: 'select_account' }) => {
    const ve = new URL('https://auth.dashboard.pro.vn/pwa-login.html');
    for (const [k, v] of Object.entries(q)) ve.searchParams.set(k, v);
    return 'https://auth.dashboard.pro.vn/__/auth/handler?' + new URLSearchParams({
        apiKey: API_KEY, appName: '[DEFAULT]', authType: 'signInViaRedirect',
        redirectUrl: ve.toString(), v: '12.11.0', providerId: 'google.com', customParameters: JSON.stringify(thamSo),
        scopes: 'profile,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.file',
    });
};

async function sangGoogleRoiHuy(page: Page, duoi = '', diThang?: string) {
    const t0 = Date.now();
    await page.goto(diThang ?? ('https://auth.dashboard.pro.vn/pwa-login.html#c=' + CODE + duoi));
    await page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });
    const msSangGoogle = Date.now() - t0;
    const u = new URL(page.url());
    const state = u.searchParams.get('state');
    const redir = u.searchParams.get('redirect_uri');
    expect(redir).toBe('https://auth.dashboard.pro.vn/__/auth/handler');
    expect(state).toBeTruthy();
    await page.goto(`${redir}?state=${encodeURIComponent(state!)}&error=access_denied`);
    await page.waitForURL(/pwa-login\.html/, { timeout: 15_000 });
    return msSangGoogle;
}

test('apis.google.com treo: vẫn sang Google, bấm Huỷ ở Google thì báo rõ', async ({ page, context }) => {
    test.setTimeout(60_000);
    const gapi = await chuanBi(context);
    const ms = await sangGoogleRoiHuy(page);
    console.log('SANG_GOOGLE_MS', ms);
    await expect(page.locator('#msg')).toContainText('Bạn đã huỷ đăng nhập Google', { timeout: 15_000 });
    await expect(page.locator('#go')).toBeVisible();
    expect(gapi).toEqual([]);
    // Kết quả cũ đã bị xoá: tải lại trang không dùng lại mã.
    expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('firebase:')))).toEqual([]);
});

async function giaThanhCong(context: BrowserContext) {
    let idpBody: Record<string, unknown> | null = null;
    await context.route('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp**', async r => {
        idpBody = r.request().postDataJSON();
        await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ idToken: 'firebase-id-token-gia', oauthIdToken: 'google-id-token-gia', oauthAccessToken: 'google-access-gia', email: 'a@b.vn' }) });
    });
    const stores: { auth: string | null; data: Record<string, unknown> }[] = [];
    await context.route('**/pwaHandoffStore', async r => {
        if (r.request().method() === 'OPTIONS') {
            return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
        }
        stores.push({ auth: r.request().headers()['authorization'] ?? null, data: r.request().postDataJSON().data });
        await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"result":{"ok":true}}' });
    });
    return { stores, idp: () => idpBody };
}

test('mở từ app Màn hình chính (#m=pwa): xong thì nhắc bấm "Xong", KHÔNG tải app vào khung nổi', async ({ page, context }) => {
    test.setTimeout(60_000);
    await chuanBi(context);
    const { stores } = await giaThanhCong(context);
    let moApp = false;
    await context.route('https://dashboard.pro.vn/**', r => { moApp = true; return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>app</p>' }); });
    await sangGoogleRoiHuy(page, '&m=pwa');
    await expect(page.locator('#msg')).toContainText('Bấm "Xong"', { timeout: 15_000 });
    expect(stores.find(s => s.data.code)?.data.code).toBe(CODE);
    await page.waitForTimeout(1500);
    expect(moApp).toBe(false);
    expect(page.url()).toContain('pwa-login.html');
    await expect(page.locator('#back')).toBeHidden();
});

test('về từ Google thành công: gửi phiên kèm Bearer rồi về app', async ({ page, context }) => {
    test.setTimeout(60_000);
    const gapi = await chuanBi(context);
    let idpBody: Record<string, unknown> | null = null;
    await context.route('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp**', async r => {
        idpBody = r.request().postDataJSON();
        await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ idToken: 'firebase-id-token-gia', oauthIdToken: 'google-id-token-gia', oauthAccessToken: 'google-access-gia', email: 'a@b.vn' }) });
    });
    const stores: { auth: string | null; data: Record<string, unknown> }[] = [];
    await context.route('**/pwaHandoffStore', async r => {
        if (r.request().method() === 'OPTIONS') {
            return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
        }
        stores.push({ auth: r.request().headers()['authorization'] ?? null, data: r.request().postDataJSON().data });
        await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"result":{"ok":true}}' });
    });
    await context.route('https://dashboard.pro.vn/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>app</p>' }));

    await sangGoogleRoiHuy(page);
    await page.waitForURL('https://dashboard.pro.vn/', { timeout: 15_000 });

    expect(String(idpBody!.requestUri)).toContain('/__/auth/handler?state=');
    expect(idpBody!.sessionId).toBeTruthy();
    const that = stores.find(s => s.data.code);
    expect(that).toEqual({ auth: 'Bearer firebase-id-token-gia', data: { code: CODE, idToken: 'google-id-token-gia', accessToken: 'google-access-gia' } });
    expect(gapi).toEqual([]);
});

test('luồng mới: app đi THẲNG tới trang Firebase — về trang này KHÔNG nạp thư viện Firebase, gửi phiên, đóng khung (m=pwa)', async ({ page, context }) => {
    test.setTimeout(60_000);
    const gapi = await chuanBi(context);
    const { stores } = await giaThanhCong(context);
    const thuVien: string[] = [];
    page.on('request', r => { if (r.url().includes('/firebasejs/')) thuVien.push(r.url()); });
    const ms = await sangGoogleRoiHuy(page, '', urlDiThang({ c: CODE, m: 'pwa' }));
    console.log('DI_THANG_SANG_GOOGLE_MS', ms);
    await expect(page.locator('#msg')).toContainText('Bấm "Xong"', { timeout: 15_000 });
    expect(stores.find(s => s.data.code)).toEqual({ auth: 'Bearer firebase-id-token-gia', data: { code: CODE, idToken: 'google-id-token-gia', accessToken: 'google-access-gia' } });
    expect(thuVien).toEqual([]);
    expect(gapi).toEqual([]);
});

test('luồng mới, bấm Huỷ ở Google: báo rõ; bấm lại thì vẫn chọn sẵn tài khoản đã nhớ (h=)', async ({ page, context }) => {
    test.setTimeout(60_000);
    await chuanBi(context);
    await sangGoogleRoiHuy(page, '', urlDiThang({ c: CODE, h: 'nv@vd.vn' }, { login_hint: 'nv@vd.vn' }));
    await expect(page.locator('#msg')).toContainText('Bạn đã huỷ đăng nhập Google', { timeout: 15_000 });
    await page.locator('#go').click();
    await page.waitForURL(/accounts\.google\.com/, { timeout: 20_000 });
    expect(decodeURIComponent(page.url())).toContain('login_hint=nv@vd.vn');
});
