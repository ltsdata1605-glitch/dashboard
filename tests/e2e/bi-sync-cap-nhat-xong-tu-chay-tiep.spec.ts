import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openReportBi } from './helpers/seed';

/**
 * Chủ dự án 2026-10-01: bấm Cập nhật trong Tampermonkey rồi quay lại trang, đáng lẽ tự chạy tiếp nhưng vẫn báo "bản cũ",
 * phải tự tải lại trang. Nguyên nhân: Tampermonkey chỉ nạp bản mới khi trang TẢI LẠI.
 * Mong đợi: quay lại tab → trang tự tải lại → mở mục Cập nhật → tự chạy tiếp, nhờ userscript mở tab MWG (GM_openInTab).
 * Userscript giả lập: bản đang chạy đọc từ localStorage('__fakeVer') — "cập nhật" = đổi giá trị này (chỉ có hiệu lực
 * sau khi tải lại, đúng như Tampermonkey).
 */
const USERSCRIPT_FILE = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BAN_MOI_NHAT = readFileSync(USERSCRIPT_FILE, 'utf-8').match(/^\/\/\s*@version\s+([\d.]+)/m)![1];

test('cập nhật userscript xong quay lại tab → tự tải lại và TỰ CHẠY TIẾP, không phải bấm lại', async ({ page }) => {
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.addInitScript(() => {
        // Bản "đang chạy" chốt lúc trang nạp — giống Tampermonkey: đổi bản xong phải tải lại mới có hiệu lực
        const v = localStorage.getItem('__fakeVer') || '6.4';
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: v } }));
        });
        window.addEventListener('ycx-bi-automation:open-worker', (e) => {
            sessionStorage.setItem('__openWorker', (e as CustomEvent).detail.url);
            window.dispatchEvent(new CustomEvent('ycx-bi-automation:open-worker-ok'));
        });
    });
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();

    // 1) Bản cũ → tự mở trang cập nhật, modal báo cần cập nhật
    const tabCapNhat = page.context().waitForEvent('page');
    await page.getByRole('button', { name: /Tự động Realtime/i }).click();
    expect((await tabCapNhat).url()).toContain('/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toBeVisible();

    // 2) Người dùng bấm Update trong Tampermonkey (giả: đổi bản) rồi quay lại tab Dashboard
    await page.evaluate((v) => localStorage.setItem('__fakeVer', v), BAN_MOI_NHAT);
    const taiLai = page.waitForEvent('load');
    await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await taiLai;

    // 3) Sau khi tải lại: tự vào mục Cập nhật, tự chạy, nhờ userscript mở tab MWG — KHÔNG bấm gì
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('__openWorker')), { timeout: 30_000 })
        .toContain('baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=realtime');
    const modal = page.getByRole('dialog', { name: /Tự động Cập nhật Realtime/i });
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toHaveCount(0);
    await expect(modal.getByTestId('bi-sync-tien-trinh')).toBeVisible();
    // Lượt dở đã được xoá → tải lại lần nữa không tự chạy lại
    expect(await page.evaluate(() => sessionStorage.getItem('ycx-bi-auto-pending'))).toBeNull();
});

test('chưa cập nhật mà quay lại tab: tự tải lại tối đa 2 lần rồi thôi (không vòng lặp)', async ({ page }) => {
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.addInitScript(() => {
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: '6.4' } }));
        });
    });
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    const tab = page.context().waitForEvent('page');
    await page.getByRole('button', { name: /Tự động Realtime/i }).click();
    await tab;
    const quayLai = () => page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
    }).catch(() => { /* trang đang tải lại giữa chừng */ });
    let soLanTaiLai = 0;
    page.on('load', () => { soLanTaiLai++; });
    // Quay lại tab nhiều lần (chưa cập nhật) — đếm tổng số lần trang tự tải lại
    for (let lan = 0; lan < 5; lan++) {
        await expect(page.getByTestId('bi-sync-can-cap-nhat')).toBeVisible({ timeout: 30_000 });
        await quayLai();
        await page.waitForTimeout(2500);
    }
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toBeVisible({ timeout: 30_000 });
    expect(soLanTaiLai, 'tự tải lại phải dừng ở tối đa 2 lần').toBeLessThanOrEqual(2);
    expect(soLanTaiLai, 'phải có tự tải lại khi quay lại tab').toBeGreaterThanOrEqual(1);
});
