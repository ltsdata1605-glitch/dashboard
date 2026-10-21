/**
 * Đăng nhập iPhone qua auth.dashboard.pro.vn (2026-10-21): máy chủ tính SẴN phiên (quyền/Kho/claims) lúc trang đó gửi phiên
 * (pwaHandoffStore) và trả kèm khi app nhận phiên (pwaHandoffClaim) → app KHÔNG gọi resolveSession sau khi vào (bớt 1 lượt gọi
 * máy chủ nối tiếp). Kiểm: có hồ sơ tính sẵn cho đúng uid → 0 lượt resolveSession, vẫn vào app; hồ sơ của uid KHÁC → vẫn gọi.
 * Tài khoản thật, CHỈ ĐỌC (chanGhiCloud).
 */
import { expect, test, type Page } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';
test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
test.use({ launchOptions: { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) } });

const demResolve = (page: Page) => {
    const goi: string[] = [];
    page.on('request', r => { if (/\/resolveSession$/.test(r.url())) goi.push(r.url()); });
    return goi;
};

test('có hồ sơ tính sẵn cho đúng tài khoản: vào app KHÔNG gọi resolveSession; uid khác thì vẫn gọi', async ({ browser }) => {
    test.setTimeout(150_000);
    // Lần 1: đăng nhập thường → lấy hồ sơ thật + uid.
    const c1 = await browser.newContext(); const p1 = await c1.newPage();
    await chanGhiCloud(p1);
    let hoSo: Record<string, unknown> | null = null;
    p1.on('response', async r => { if (/\/resolveSession$/.test(r.url())) hoSo = (await r.json().catch(() => ({})))?.result ?? null; });
    await dangNhapBangToken(p1);
    await expect(p1.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
    await expect.poll(() => hoSo, { timeout: 30_000 }).not.toBeNull();
    const uid = await p1.evaluate(async () => {
        const duongDan = '/services/firebase.ts'; // biến → tsc không đòi phân giải đường dẫn trình duyệt
        return ((await import(/* @vite-ignore */ duongDan)) as { auth: { currentUser: { uid: string } } }).auth.currentUser.uid;
    });
    await c1.close();

    for (const [ten, uidHoSo, soLuotMongDoi] of [['dung-uid', uid, 0], ['uid-khac', 'uid-cua-nguoi-khac', 1]] as const) {
        const c = await browser.newContext(); const p = await c.newPage();
        await chanGhiCloud(p);
        await c.addInitScript(([u, h]) => { (globalThis as Record<string, unknown>).__ycxHoSoDaTinhSan = { uid: u, profile: h, at: Date.now() }; }, [uidHoSo, hoSo] as const);
        const goi = demResolve(p);
        const t0 = Date.now();
        await dangNhapBangToken(p);
        await expect(p.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
        await expect(p.getByText(/Cập Nhật Mã Kho/i)).toHaveCount(0);
        await p.waitForTimeout(4000);
        console.log(ten, 'resolveSession:', goi.length, 'luot | vao app sau', Date.now() - t0, 'ms');
        expect(goi.length).toBe(soLuotMongDoi);
        await c.close();
    }
});

test('hồ sơ users/{uid} còn khoá dữ liệu Kho cũ (khoDataCache_*): app tự dọn (lệnh ghi bị chặn — tài khoản test chỉ đọc)', async ({ page }) => {
    test.setTimeout(180_000);
    await chanGhiCloud(page);
    const log: string[] = [];
    page.on('console', m => { if (/khoá dữ liệu Kho cũ/.test(m.text())) log.push(m.text()); });
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
    await expect.poll(() => log.length, { timeout: 90_000 }).toBeGreaterThan(0);
    console.log('LOG_DON', log[0]);
    expect(log[0]).toMatch(/Dọn \d+ khoá dữ liệu Kho cũ/);
});
