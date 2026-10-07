import { test, expect, type Page } from '@playwright/test';

/**
 * Audit 2026-10-07 (GĐ3): máy quét In Sticker DÙNG LẠI 1 AudioContext cho cả phiên quét.
 * Trước đây mỗi mã (quét hoặc gõ tay) tạo 1 AudioContext mới và không đóng — Safari iOS giới hạn số
 * AudioContext đang mở nên quét vài chục mã thì tiếng bíp im hẳn.
 * Dùng đường GÕ MÃ TAY (chung phản hồi âm thanh với camera) — Chromium Linux không có BarcodeDetector.
 */
const AUTH_HOOK_STUB = `
const FAKE_USER = { uid: 'u-audit', email: 'audit@test.local' };
const FAKE_DATA = { uid: 'u-audit', username: 'admin', role: 'admin', storeId: '910', storeHasAdmin: true };
export function useStickerEventAuth() {
  return { user: FAKE_USER, setUser: () => {}, userData: FAKE_DATA, setUserData: () => {},
           isInitializing: false, setIsInitializing: () => {}, handleLoginSuccess: () => {} };
}
`;

async function moInSticker(page: Page) {
    await page.addInitScript(() => {
        const w = window as unknown as { __audioCtxCount: number; AudioContext: typeof AudioContext };
        w.__audioCtxCount = 0;
        const Orig = w.AudioContext;
        w.AudioContext = class extends Orig { constructor(...a: ConstructorParameters<typeof AudioContext>) { super(...a); w.__audioCtxCount++; } } as typeof AudioContext;
    });
    await page.route('**/features/sticker-event/hooks/useStickerEventAuth.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_HOOK_STUB }));
    await page.goto('/?tab=tools-print-sticker&sub=event');
    await page.waitForTimeout(1200);
    const demo = page.getByText(/Kích hoạt Chế độ Dùng Thử/i).first();
    if (await demo.isVisible().catch(() => false)) {
        await demo.click();
        await page.waitForTimeout(2200);
        await page.goto('/?tab=tools-print-sticker&sub=event');
    }
    await page.waitForTimeout(2500);
}

test('gõ 6 mã liên tiếp: chỉ tạo 1 AudioContext', async ({ page, context }) => {
    test.setTimeout(120000);
    await context.grantPermissions(['camera']);
    await page.setViewportSize({ width: 390, height: 844 });
    await moInSticker(page);
    await page.getByRole('button', { name: /Quét mã/i }).first().click();
    await page.getByRole('button', { name: /Nhập mã tay/i }).first().click();
    const input = page.getByPlaceholder('Gõ mã sản phẩm rồi Enter...');
    await input.waitFor({ state: 'visible', timeout: 15000 });
    for (let i = 0; i < 6; i++) {
        await input.fill(`99999${i}`);
        await input.press('Enter');
        await page.waitForTimeout(700);
    }
    const count = await page.evaluate(() => (window as unknown as { __audioCtxCount: number }).__audioCtxCount);
    console.log('SỐ AudioContext đã tạo sau 6 mã:', count);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBe(1);
});
