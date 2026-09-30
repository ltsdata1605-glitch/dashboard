import { expect, test, type Page } from '@playwright/test';

/**
 * Audit A14 (2026-09-30) — components/shared/ui/TouchTitleHint.tsx: màn cảm ứng không hiện `title`
 * (≈514 nút chỉ có icon dựa vào nó). Nhấn giữ → bong bóng chữ; chạm thường không đổi.
 * Chromium giả lập cảm ứng (không phải Safari thật) — PointerEvent tổng hợp đúng loại `touch`.
 */
const dungNut = async (page: Page) => {
    await page.goto('/');
    await page.waitForTimeout(800); // App gắn TouchTitleHint trong effect
    await page.evaluate(() => {
        const w = window as unknown as { __bam: number };
        w.__bam = 0;
        const b = document.createElement('button');
        b.id = 'nut-icon';
        b.title = 'Xuất hàng loạt báo cáo chi tiết';
        b.textContent = '⤓';
        b.style.cssText = 'position:fixed;top:200px;left:150px;width:44px;height:44px;z-index:99999';
        b.addEventListener('click', () => { w.__bam++; });
        document.body.appendChild(b);
    });
};
const cham = (page: Page, giuMs: number) => page.evaluate(async (ms) => {
    const b = document.getElementById('nut-icon')!;
    const o = { pointerType: 'touch', bubbles: true, cancelable: true, clientX: 170, clientY: 220, pointerId: 1 } as PointerEventInit;
    b.dispatchEvent(new PointerEvent('pointerdown', o));
    await new Promise(r => setTimeout(r, ms));
    const coBongBong = !!document.querySelector('[data-touch-title-hint]');
    const chu = document.querySelector('[data-touch-title-hint]')?.textContent || '';
    b.dispatchEvent(new PointerEvent('pointerup', o));
    b.click(); // trình duyệt phát click sau khi nhấc tay
    return { coBongBong, chu, bam: (window as unknown as { __bam: number }).__bam };
}, giuMs);

test.describe('màn cảm ứng', () => {
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

    test('nhấn giữ nút có title → hiện chú thích, KHÔNG kích hoạt nút', async ({ page }) => {
        await dungNut(page);
        const kq = await cham(page, 700);
        expect(kq.coBongBong).toBe(true);
        expect(kq.chu).toBe('Xuất hàng loạt báo cáo chi tiết');
        expect(kq.bam, 'nhấn giữ để đọc chú thích lại bấm luôn nút').toBe(0);
    });

    test('chạm nhanh → nút hoạt động bình thường, không hiện bong bóng', async ({ page }) => {
        await dungNut(page);
        const kq = await cham(page, 100);
        expect(kq.coBongBong).toBe(false);
        expect(kq.bam).toBe(1);
    });
});

test('máy tính có chuột: không can thiệp (title gốc của trình duyệt vẫn dùng)', async ({ page }) => {
    await dungNut(page);
    const kq = await cham(page, 700);
    expect(kq.coBongBong).toBe(false);
    expect(kq.bam).toBe(1);
});
