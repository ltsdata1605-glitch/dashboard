import { expect, test, type Page } from '@playwright/test';

/**
 * Trang LIFF bấm dùng coupon (public/liff-copy.html) — 2026-10-20 chủ dự án chốt "Tắt tin nhắn xác nhận khi dùng coupon":
 * KHÔNG gửi tin nào vào nhóm (bot không push, người dùng cũng không gửi thay), chỉ copy mã + đánh dấu đã dùng trên máy chủ.
 * SDK LIFF và máy chủ giả lập.
 */
const SDK_GIA = `
window.__gui = []; window.__dong = 0;
window.liff = {
  init: async () => {}, isInClient: () => true,
  getDecodedIDToken: () => ({ name: 'DMST-Nhân-107617SALE' }), getProfile: async () => ({ displayName: 'DMST-Nhân-107617SALE' }),
  sendMessages: async (m) => { window.__gui.push(m[0].text); }, closeWindow: () => { window.__dong++; },
};`;

async function mo(page: Page, phanHoi: object, treMs = 0) {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const goi: string[] = [];
    await page.route('https://static.line-scdn.net/**', r => r.fulfill({ contentType: 'application/javascript', body: SDK_GIA }));
    await page.route('https://linebotwebhook-zrczpxylcq-as.a.run.app/**', async r => {
        goi.push(r.request().url());
        if (treMs) await new Promise(res => setTimeout(res, treMs));
        await r.fulfill({ contentType: 'application/json', body: JSON.stringify(phanHoi) }).catch(() => {});
    });
    await page.goto('/liff-copy.html?code=ABC123&type=PMH&index=3');
    return goi;
}
const soTinGui = (page: Page) => page.evaluate(() => (window as unknown as { __gui: string[] }).__gui.length);
const soLanDong = (page: Page) => page.evaluate(() => (window as unknown as { __dong: number }).__dong);

test('dùng coupon: ghi nhận đã dùng trên máy chủ, KHÔNG gửi tin vào nhóm, tự đóng', async ({ page }) => {
    const goi = await mo(page, { success: true, updatedCount: 1, quotedSent: false });
    await expect.poll(() => soLanDong(page), { timeout: 10_000 }).toBeGreaterThan(0);
    expect(goi).toHaveLength(1);
    expect(goi[0]).toContain('action=mark-used');
    expect(goi[0]).toContain('code=ABC123');
    expect(await soTinGui(page)).toBe(0);
});

test('máy chủ chậm > 4 giây: vẫn đóng, KHÔNG gửi tin', async ({ page }) => {
    await mo(page, { success: true, updatedCount: 1, quotedSent: false }, 6000);
    await expect.poll(() => soLanDong(page), { timeout: 12_000 }).toBeGreaterThan(0);
    expect(await soTinGui(page)).toBe(0);
});

test('mã đã có người dùng: báo rõ, KHÔNG gửi tin', async ({ page }) => {
    await mo(page, { success: true, updatedCount: 0, alreadyUsed: true, previousUser: '107000 - An', quotedSent: false });
    await expect(page.getByText('Mã này đã được sử dụng!')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/107000 - An/)).toBeVisible();
    expect(await soTinGui(page)).toBe(0);
});
