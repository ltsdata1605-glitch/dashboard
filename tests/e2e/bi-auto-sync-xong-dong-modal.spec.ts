import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openReportBi } from './helpers/seed';

/**
 * Report BI › Cập nhật › "Tự động Realtime": chạy xong thì modal ĐÓNG NGAY, không hiện bảng "Đã xong" ở Dashboard
 * (chủ dự án 2026-10-01: tiến trình đã xem trên trang MWG). Kết quả báo bằng toast.
 * Userscript được giả lập: trả lời ping với đúng bản mới nhất, rồi bắn sự kiện done như cầu nối thật.
 */
const USERSCRIPT_FILE = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BAN_MOI_NHAT = readFileSync(USERSCRIPT_FILE, 'utf-8').match(/^\/\/\s*@version\s+([\d.]+)/m)![1];

test('chạy Tự động Realtime xong → modal đóng ngay, có toast báo thành công', async ({ page }) => {
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.addInitScript((v) => {
        window.addEventListener('ycx-bi-automation:start-job', (e) => { (window as unknown as { __job?: string }).__job = (e as CustomEvent).detail?.jobId; });
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: v } }));
        });
    }, BAN_MOI_NHAT);
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    await page.getByRole('button', { name: /Tự động Realtime/i }).click();

    const modal = page.getByRole('dialog', { name: /Tự động Cập nhật Realtime/i });
    await expect(modal).toBeVisible();

    // Cầu nối báo tiến trình rồi báo xong (đúng hình dạng payload userscript gửi)
    await page.evaluate(() => {
        const p = { source: 'ycx-bi-automation', type: 'progress', jobId: (window as unknown as { __job?: string }).__job, mode: 'realtime', step: 2, totalSteps: 4, stepName: 'Thi đua', message: '...' };
        window.dispatchEvent(new CustomEvent('ycx-bi-automation:progress', { detail: p }));
    });
    await expect(modal).toContainText('2/4 (50%)');
    await page.evaluate(() => {
        const d = { source: 'ycx-bi-automation', type: 'done', jobId: (window as unknown as { __job?: string }).__job, mode: 'realtime', results: { summary: 'Miền\tDT\n21 - Miền Nam\t14' } };
        window.dispatchEvent(new CustomEvent('ycx-bi-automation:done', { detail: d }));
    });
    await expect(modal).toHaveCount(0, { timeout: 2000 });
    await expect(page.getByText(/Tự động cập nhật thành công/)).toBeVisible();
});

/**
 * Chủ dự án 2026-10-01: dữ liệu cập nhật lâu rồi mà MỖI LẦN mở trang lại có pháo giấy + 4 toast "Tự động cập nhật thành
 * công…". Nguyên nhân: mở trang là cầu nối userscript phát lại kết quả CŨ còn trong bộ nhớ Tampermonkey (qua 2 kênh:
 * event + postMessage), và Dashboard lưu đè + báo thành công. Nay chỉ nhận kết quả đúng lượt trang vừa khởi chạy.
 */
test('mở trang mà cầu nối phát lại kết quả CŨ → không toast, không ghi đè dữ liệu', async ({ page }) => {
    await page.addInitScript((v) => {
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: v } }));
        });
    }, BAN_MOI_NHAT);
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    // Đúng như cầu nối ≤ 7.11 khi mở trang: phát lại lượt cũ qua cả 2 kênh, vài lần
    await page.evaluate(() => {
        const d = { source: 'ycx-bi-automation', type: 'done', jobId: 'bi-job-cu-tu-hom-qua', mode: 'luyke', results: { summary: 'Siêu thị\tSỐ LƯỢNG\nDỮ LIỆU CŨ\t1' } };
        for (let i = 0; i < 2; i++) {
            window.dispatchEvent(new CustomEvent('ycx-bi-automation:done', { detail: d }));
            window.postMessage(d, '*');
        }
    });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Tự động cập nhật thành công/)).toHaveCount(0);
    const summary = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        return new Promise<unknown>((res) => { const g = db.transaction(['settings']).objectStore('settings').get('bi_summary-luy-ke'); g.onsuccess = () => res(g.result); g.onerror = () => res(undefined); });
    });
    expect(String(summary ?? '')).not.toContain('DỮ LIỆU CŨ');
});
