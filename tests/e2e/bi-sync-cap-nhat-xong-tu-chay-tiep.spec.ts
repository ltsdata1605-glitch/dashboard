import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openReportBi } from './helpers/seed';

/**
 * Chủ dự án 2026-10-01: bấm Cập nhật trong Tampermonkey rồi quay lại trang, đáng lẽ tự chạy tiếp nhưng vẫn báo "bản cũ".
 * Nguyên nhân: Tampermonkey chỉ nạp bản mới vào trang TẢI MỚI — trang Dashboard đang mở vẫn giữ bản cũ.
 *
 * Cách làm HIỆN TẠI (chủ dự án đổi ở f0a5558, 2026-10-10 — bỏ "quay lại tab thì tự tải lại cả trang"): khi đang báo "cần
 * cập nhật", Dashboard dò ngầm qua iframe `/userscript-probe.html` (trang tải mới → Tampermonkey nạp bản MỚI vào đó), nạp
 * lại iframe mỗi lần người dùng quay lại tab; thấy bản đủ mới thì lưu phiên bản và TỰ CHẠY TIẾP, KHÔNG tải lại trang (tab
 * MWG mở mới nên chạy bản mới). Test cập nhật theo cách này 2026-10-11 — bản cũ của test đòi trang tự tải lại nên đỏ.
 * Userscript giả lập: bản đang chạy đọc từ localStorage('__fakeVer') lúc MỖI KHUNG nạp (trang hoặc iframe) — "cập nhật" =
 * đổi giá trị này (khung nạp sau mới thấy, đúng như Tampermonkey).
 */
const USERSCRIPT_FILE = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BAN_MOI_NHAT = readFileSync(USERSCRIPT_FILE, 'utf-8').match(/^\/\/\s*@version\s+([\d.]+)/m)![1];

test('cập nhật userscript xong quay lại tab → TỰ CHẠY TIẾP (không tải lại trang, không phải bấm lại)', async ({ page }) => {
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
            sessionStorage.setItem('__soTabMwg', String(Number(sessionStorage.getItem('__soTabMwg') || 0) + 1));
            window.dispatchEvent(new CustomEvent('ycx-bi-automation:open-worker-ok'));
        });
    });
    await openReportBi(page);
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).first().click();

    // 1) Bản cũ → tự mở trang cập nhật, modal báo cần cập nhật
    // Bắt YÊU CẦU ĐIỀU HƯỚNG tới file userscript, không đọc URL của tab mới: Chrome coi đường dẫn `.user.js` là lượt
    // cài userscript — không có Tampermonkey thì TẢI file về rồi đóng tab, URL tab thành ":" (đo 2026-10-02 trên
    // Chromium bản đầy đủ; bản headless-shell thì mở như trang thường). Lọc isNavigationRequest để không nhầm với
    // lượt fetch kiểm phiên bản (`…user.js?t=…`).
    const moTrangCapNhat = page.context().waitForEvent('request', (r) =>
        r.isNavigationRequest() && r.url().includes('/scripts/mwg-auto-thu-thap-diem-thuong.user.js'));
    await page.getByRole('button', { name: /Tự động Realtime/i }).click();
    await moTrangCapNhat;
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toBeVisible();

    // 2) Người dùng bấm Update trong Tampermonkey (giả: đổi bản) rồi quay lại tab Dashboard
    await page.evaluate((v) => localStorage.setItem('__fakeVer', v), BAN_MOI_NHAT);
    let soLanTaiTrang = 0;
    page.on('load', () => { soLanTaiTrang++; });
    await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
    });

    // 3) Iframe dò thấy bản mới → tự chạy tiếp, nhờ userscript mở tab MWG — KHÔNG bấm gì, KHÔNG tải lại trang
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('__openWorker')), { timeout: 30_000 })
        .toContain('baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=realtime');
    const modal = page.getByRole('dialog', { name: /Tự động Cập nhật Realtime/i });
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toHaveCount(0);
    await expect(modal.getByTestId('bi-sync-tien-trinh')).toBeVisible();
    // Chỉ MỘT tab MWG (chủ dự án 2026-10-01: cập nhật xong mở nhiều tab — trang có 2 nơi cùng tự chạy tiếp)
    await page.waitForTimeout(3000);
    expect(await page.evaluate(() => Number(sessionStorage.getItem('__soTabMwg')))).toBe(1);
    // Lượt dở đã được xoá → tải lại lần nữa không tự chạy lại
    expect(await page.evaluate(() => sessionStorage.getItem('ycx-bi-auto-pending'))).toBeNull();
    expect(soLanTaiTrang, 'không cần tải lại cả trang').toBe(0);
});

test('chưa cập nhật mà quay lại tab: vẫn báo cần cập nhật, KHÔNG tải lại trang, không mở thêm tab', async ({ page }) => {
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.addInitScript(() => {
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: '6.4' } }));
        });
    });
    await openReportBi(page);
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).first().click();
    const tab = page.context().waitForEvent('page');
    await page.getByRole('button', { name: /Tự động Realtime/i }).click();
    await tab;
    const quayLai = () => page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
    }).catch(() => { /* trang đang tải lại giữa chừng */ });
    let soLanTaiLai = 0;
    page.on('load', () => { soLanTaiLai++; });
    let soTabMoi = 0;
    page.context().on('page', () => { soTabMoi++; });
    // Quay lại tab nhiều lần (chưa cập nhật) — iframe dò vẫn thấy bản cũ → không làm gì thêm
    for (let lan = 0; lan < 3; lan++) {
        await expect(page.getByTestId('bi-sync-can-cap-nhat')).toBeVisible({ timeout: 30_000 });
        await quayLai();
        await page.waitForTimeout(2500);
    }
    await expect(page.getByTestId('bi-sync-can-cap-nhat')).toBeVisible({ timeout: 30_000 });
    expect(soLanTaiLai, 'không tải lại trang khi chưa cập nhật (vòng tải lại vô ích)').toBe(0);
    expect(soTabMoi, 'không mở thêm tab cập nhật / tab MWG').toBe(0);
});
