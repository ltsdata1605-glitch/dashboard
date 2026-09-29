import { expect, test, type Page } from '@playwright/test';

/**
 * Audit A23 (2026-09-29) — public/prevent-pull-to-refresh.js. Bản cũ chặn MỌI cú kéo xuống khi
 * trang ở đầu, kể cả trong vùng cuộn riêng (modal/bảng) đang cuộn dở và thao tác 2 ngón.
 * Chromium giả lập cảm ứng (không phải Safari thật): kiểm `defaultPrevented` của touchmove thật
 * mà trình duyệt phát ra — đúng thứ quyết định trình duyệt có cuộn hay không.
 */
test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

const keo = (page: Page, targetSel: string, tuY: number, denY: number, soNgon = 1) =>
    page.evaluate(({ targetSel, tuY, denY, soNgon }) => {
        const target = document.querySelector(targetSel)!;
        const mk = (y: number) => Array.from({ length: soNgon }, (_, i) =>
            new Touch({ identifier: i + 1, target, clientX: 100 + i * 50, clientY: y }));
        target.dispatchEvent(new TouchEvent('touchstart', { touches: mk(tuY), bubbles: true, cancelable: true }));
        const move = new TouchEvent('touchmove', { touches: mk(denY), bubbles: true, cancelable: true });
        target.dispatchEvent(move);
        return move.defaultPrevented;
    }, { targetSel, tuY, denY, soNgon });

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
        window.scrollTo(0, 0);
        const box = document.createElement('div');
        box.id = 'vung-cuon';
        box.style.cssText = 'position:fixed;top:100px;left:0;width:300px;height:200px;overflow-y:auto;z-index:99999;background:#fff';
        box.innerHTML = '<div id="noi-dung" style="height:2000px">nội dung dài</div>';
        document.body.appendChild(box);
        box.scrollTop = 500; // đã cuộn xuống dở
        const phang = document.createElement('div');
        phang.id = 'vung-phang';
        phang.style.cssText = 'position:fixed;top:400px;left:0;width:300px;height:100px;z-index:99999;background:#eee';
        document.body.appendChild(phang);
    });
});

test('trong vùng cuộn đang cuộn dở: kéo xuống (để cuộn ngược lên) KHÔNG bị chặn', async ({ page }) => {
    expect(await keo(page, '#noi-dung', 200, 260)).toBe(false);
});

test('vùng không cuộn, trang ở đầu: kéo xuống VẪN bị chặn (giữ chống tải lại trang)', async ({ page }) => {
    expect(await keo(page, '#vung-phang', 420, 480)).toBe(true);
});

test('vùng cuộn đã ở đỉnh: kéo xuống bị chặn (chính là cú kéo sẽ tải lại trang)', async ({ page }) => {
    await page.evaluate(() => { document.getElementById('vung-cuon')!.scrollTop = 0; });
    expect(await keo(page, '#noi-dung', 200, 260)).toBe(true);
});

test('thao tác 2 ngón không bị chặn', async ({ page }) => {
    expect(await keo(page, '#vung-phang', 420, 480, 2)).toBe(false);
});

test('kéo lên không bị chặn', async ({ page }) => {
    expect(await keo(page, '#vung-phang', 480, 420)).toBe(false);
});
