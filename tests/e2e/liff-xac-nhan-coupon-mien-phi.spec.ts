import { expect, test, type Page } from '@playwright/test';

/**
 * Trang LIFF bấm dùng coupon (public/liff-copy.html) — 2026-10-15 chủ dự án chốt: tin xác nhận gửi DƯỚI TÊN người dùng
 * (liff.sendMessages, miễn phí), bot KHÔNG tự PUSH nữa (tốn hạn mức tin LINE theo số thành viên nhóm). SDK LIFF và máy chủ
 * đều giả lập: đo đúng tin người dùng gửi vào nhóm ở 3 tình huống.
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
    let goiMayChu = 0;
    await page.route('https://static.line-scdn.net/**', r => r.fulfill({ contentType: 'application/javascript', body: SDK_GIA }));
    await page.route('https://linebotwebhook-zrczpxylcq-as.a.run.app/**', async r => {
        goiMayChu++;
        if (treMs) await new Promise(res => setTimeout(res, treMs));
        await r.fulfill({ contentType: 'application/json', body: JSON.stringify(phanHoi) }).catch(() => {});
    });
    await page.goto('/liff-copy.html?code=ABC123&type=PMH&index=3');
    return () => goiMayChu;
}

test('máy chủ ghi nhận xong → người dùng gửi tin xác nhận (bot không push)', async ({ page }) => {
    const soLan = await mo(page, { success: true, updatedCount: 1, quotedSent: false });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __gui: string[] }).__gui.length), { timeout: 10_000 }).toBe(1);
    const tin = await page.evaluate(() => (window as unknown as { __gui: string[] }).__gui[0]);
    expect(tin).toMatch(/PMH 0*3 sử dụng lúc \d\d:\d\d!/);
    expect(tin).toContain('107617 - Nhân');
    expect(soLan()).toBe(1);
});

test('máy chủ chậm > 4 giây → VẪN gửi tin xác nhận (trước đây chờ bot đăng)', async ({ page }) => {
    await mo(page, { success: true, updatedCount: 1, quotedSent: false }, 6000);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __gui: string[] }).__gui.length), { timeout: 12_000 }).toBe(1);
});

test('mã đã có người dùng → KHÔNG gửi tin (tránh spam nhóm)', async ({ page }) => {
    await mo(page, { success: true, updatedCount: 0, alreadyUsed: true, previousUser: '107000 - An', quotedSent: false });
    await expect(page.getByText('Mã này đã được sử dụng!')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { __gui: string[] }).__gui.length)).toBe(0);
});
