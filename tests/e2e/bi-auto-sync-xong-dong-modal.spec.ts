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
        const p = { source: 'ycx-bi-automation', type: 'progress', jobId: 'job-e2e', mode: 'realtime', step: 2, totalSteps: 4, stepName: 'Thi đua', message: '...' };
        window.dispatchEvent(new CustomEvent('ycx-bi-automation:progress', { detail: p }));
    });
    await expect(modal).toContainText('2/4 (50%)');
    await page.evaluate(() => {
        const d = { source: 'ycx-bi-automation', type: 'done', jobId: 'job-e2e', mode: 'realtime', results: { summary: 'Miền\tDT\n21 - Miền Nam\t14' } };
        window.dispatchEvent(new CustomEvent('ycx-bi-automation:done', { detail: d }));
    });
    await expect(modal).toHaveCount(0, { timeout: 2000 });
    await expect(page.getByText(/Tự động cập nhật thành công/)).toBeVisible();
});
