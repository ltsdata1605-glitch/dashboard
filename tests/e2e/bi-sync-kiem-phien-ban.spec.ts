import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Bấm "Tự động Realtime/Luỹ kế" → Dashboard đọc @version của userscript đang phát (bản mới nhất), so với bản máy
 * đang chạy (ping/pong). Cũ hơn → TỰ MỞ trang cập nhật userscript (Tampermonkey hiện nút Update) và KHÔNG chạy.
 * (Yêu cầu chủ dự án 2026-10-01.)
 */
const USERSCRIPT_FILE = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BAN_MOI_NHAT = readFileSync(USERSCRIPT_FILE, 'utf-8').match(/^\/\/\s*@version\s+([\d.]+)/m)![1];

async function mo(page: Page, version: string) {
    // Tab worker MWG (khi được chạy) → trả trang rỗng, không ra mạng thật
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.goto('/');
    await page.evaluate(async (v) => (await import('/tests/e2e/helpers/biVersionHarness.tsx' as string)).mountHarness(v), version);
}

test('máy chạy bản cũ (vd 6.4 — bản ≤7.3 luôn tự báo 6.4) → tự mở trang cập nhật userscript, không chạy', async ({ page }) => {
    await mo(page, '6.4');
    const tabMoi = page.context().waitForEvent('page');
    await page.locator('#chay-tu-dong').click();
    const tab = await tabMoi;
    await tab.waitForLoadState('domcontentloaded').catch(() => {});
    expect(tab.url()).toContain('/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
    await expect(page.locator('#ket-qua')).toHaveText(`USERSCRIPT_OUTDATED:6.4:${BAN_MOI_NHAT}`);
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toHaveText(`Cần cập nhật Userscript lên bản mới nhất v${BAN_MOI_NHAT}`);
});

test('máy chạy đúng bản mới nhất → chạy bình thường, KHÔNG mở trang cập nhật', async ({ page }) => {
    await mo(page, BAN_MOI_NHAT);
    const tabMoi = page.context().waitForEvent('page');
    await page.locator('#chay-tu-dong').click();
    const tab = await tabMoi;
    expect(tab.url()).toContain('baocao.dienmayxanh.com/dashboard/revenue-consolidated');
    await expect(page.locator('#ket-qua')).toHaveText('chay');
});

test('"7.10" mới hơn "7.9": bản cao hơn bản đang phát không bị bắt cập nhật', async ({ page }) => {
    await mo(page, '99.10');
    await page.locator('#chay-tu-dong').click();
    await expect(page.locator('#ket-qua')).toHaveText('chay');
});
