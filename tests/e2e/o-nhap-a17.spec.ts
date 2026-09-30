import { expect, test } from '@playwright/test';

/**
 * Audit A17 (2026-09-30).
 * 1) Input dùng chung: lỗi được nối vào ô (aria-invalid + aria-describedby → đúng dòng lỗi).
 * 2) Check thưởng (iframe, viewport KHÔNG chặn phóng to): ô nhập trên điện thoại ≥16px (Safari không
 *    tự phóng to khi chạm) và cao ≥44px (chuẩn chạm). Chromium giả lập — không phải Safari thật.
 */
test('Input: lỗi nối vào ô cho trình đọc màn hình', async ({ page }) => {
    await page.goto('/');
    const kq = await page.evaluate(async () => {
        (await import('/tests/e2e/helpers/inputHarness.tsx' as string)).mountInput();
        const el = document.getElementById('input-harness')!;
        await new Promise(r => setTimeout(r, 300));
        const input = el.querySelector('input')!;
        const ids = (input.getAttribute('aria-describedby') || '').split(' ');
        return { invalid: input.getAttribute('aria-invalid'), ids, loi: ids.map(i => document.getElementById(i)?.textContent || null) };
    });
    expect(kq.invalid).toBe('true');
    expect(kq.ids[0]).toBe('goi-y'); // describedby sẵn có được giữ
    expect(kq.loi[1]).toBe('Mã kho phải là số');
});

test.describe('Check thưởng trên iPhone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    test('ô nhập ≥16px và cao ≥44px', async ({ page }) => {
        await page.goto('/check-thuong.html');
        const o = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLInputElement>('input.mod-input'))
            // Ô nằm trong khu tìm kiếm ẩn tới khi có dữ liệu → đọc style tính toán (không đọc kích thước vẽ).
            .map(i => ({ id: i.id, font: parseFloat(getComputedStyle(i).fontSize), cao: parseFloat(getComputedStyle(i).height) })));
        console.log('Ô NHẬP:', JSON.stringify(o));
        expect(o.length).toBeGreaterThan(0);
        for (const i of o) {
            expect(i.font, `${i.id} cỡ chữ`).toBeGreaterThanOrEqual(16);
            expect(i.cao, `${i.id} chiều cao`).toBeGreaterThanOrEqual(44);
        }
    });
});
