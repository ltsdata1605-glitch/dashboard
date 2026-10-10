import { expect, test, type Page } from '@playwright/test';

/**
 * TOAST THỐNG NHẤT (KE_HOACH_GIAO_DIEN_APPLE.md GĐ1): một API + một giao diện, vị trí TRÊN GIỮA, không bao giờ đè thanh tab
 * iPhone (lỗi #2, #3 trong video chủ dự án 10/10). Bắn toast bằng chính module app đang dùng (cùng URL → cùng kho toast).
 */

type KichBan = 'bon-loai' | 'vuot' | 'nut' | 'laptop';
/** Kịch bản viết sẵn trong trang (CSP của app chặn dựng hàm từ chuỗi nên không truyền mã dạng chuỗi được). */
const banToast = (page: Page, kichBan: KichBan) => page.evaluate(async (k) => {
    const { toast } = await import('/components/shared/ui/toast/toast.ts' as string);
    const w = window as unknown as { __bam?: number };
    if (k === 'bon-loai') {
        toast.success('Đã lưu cấu hình');
        toast.error('Không kết nối được máy chủ', { description: 'Dữ liệu vẫn an toàn trên máy.' });
        toast.warning('Sắp hết hạn mức');
        toast.info('Đang kiểm tra dữ liệu đám mây…', { icon: '☁️' });
    } else if (k === 'vuot') {
        toast.info('Vuốt lên để tắt', { duration: 20000 });
    } else if (k === 'nut') {
        toast.action({ title: 'Ảnh đã sẵn sàng.', kind: 'success', actions: [{ label: 'Chia sẻ / Lưu ảnh', primary: true, onClick: () => { w.__bam = (w.__bam || 0) + 1; } }] });
    } else {
        toast.success('Đã đồng bộ dữ liệu lên đám mây!');
    }
}, kichBan);

const hien = (page: Page) => page.locator('[data-app-toast]').filter({ visible: true });

async function moApp(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await page.waitForTimeout(1200);
}

test.describe('iPhone 16 Pro Max', () => {
    test.use({
        viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });

    test('toast nằm trên giữa, không đè thanh tab; tối đa 3 cái; đúng loại', async ({ page }) => {
        await moApp(page);
        await banToast(page, 'bon-loai');
        await expect(hien(page)).toHaveCount(3);
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/toast-thong-nhat/iphone-3-toast.png' });

        const tab = await page.locator('[data-app-chrome="tabbar"]').boundingBox();
        const vung = await hien(page).evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, kind: el.getAttribute('data-toast-kind') }; }));
        expect(tab).not.toBeNull();
        for (const r of vung) {
            expect(r.top, 'toast phải nằm nửa trên màn hình').toBeLessThan(300);
            expect(r.bottom, 'toast không được chạm thanh tab').toBeLessThan(tab!.y);
            expect(Math.abs((r.left + r.right) / 2 - 220), 'toast canh giữa').toBeLessThan(3);
        }
        // Mới nhất trên cùng: info (bắn cuối) đứng đầu, toast success (bắn đầu) đang chờ lượt.
        const thuTu = [...vung].sort((a, b) => a.top - b.top).map(v => v.kind);
        expect(thuTu).toEqual(['info', 'warning', 'error']);
        // Lỗi đọc bằng trình đọc màn hình ngay (role=alert) và có nút đóng trên điện thoại.
        const loi = page.locator('[data-app-toast][data-toast-kind="error"]');
        await expect(loi).toHaveAttribute('role', 'alert');
        await expect(loi.getByRole('button', { name: 'Đóng thông báo' })).toBeVisible();
        // Emoji kiểu cũ đã quy đổi sang icon chuẩn.
        await expect(page.locator('[data-app-toast][data-toast-kind="info"] svg[data-icon="cloud"]')).toHaveCount(1);
    });

    test('vuốt lên để tắt', async ({ page }) => {
        await moApp(page);
        await banToast(page, 'vuot');
        const t = hien(page).first();
        await expect(t).toBeVisible();
        // Chờ hiệu ứng trượt vào (bắt đầu từ −24px) chạy xong — đo giữa chừng thì điểm chạm rơi ra ngoài mép toast.
        await page.waitForTimeout(500);
        const b = (await t.boundingBox())!;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 20, { steps: 4 });
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 70, { steps: 6 });
        await page.mouse.up();
        await expect(hien(page)).toHaveCount(0, { timeout: 3000 });
    });

    test('toast có nút: bấm nút chạy hành động rồi tắt', async ({ page }) => {
        await moApp(page);
        await banToast(page, 'nut');
        const nut = page.getByRole('button', { name: 'Chia sẻ / Lưu ảnh' });
        await expect(nut).toBeVisible();
        await page.waitForTimeout(500); // chờ hiệu ứng hiện (thu phóng 0.96 → 1) chạy xong rồi mới đo
        const h = await nut.boundingBox();
        expect(h!.height, 'nút trong toast đủ 44px trên điện thoại').toBeGreaterThanOrEqual(43.5);
        await page.screenshot({ path: 'test-results/toast-thong-nhat/iphone-action.png' });
        await nut.click();
        expect(await page.evaluate(() => (window as unknown as { __bam?: number }).__bam)).toBe(1);
        await expect(hien(page)).toHaveCount(0, { timeout: 3000 });
    });
});

test.describe('laptop', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test('toast trên giữa, sát mép trên, có nút đóng khi rê chuột', async ({ page }) => {
        await moApp(page);
        await banToast(page, 'laptop');
        const t = hien(page).first();
        await expect(t).toBeVisible();
        const b = (await t.boundingBox())!;
        expect(b.y).toBeLessThan(40);
        expect(Math.abs(b.x + b.width / 2 - 720)).toBeLessThan(3);
        await t.hover();
        await expect(t.getByRole('button', { name: 'Đóng thông báo' })).toBeVisible();
        await page.screenshot({ path: 'test-results/toast-thong-nhat/laptop.png' });
        await t.getByRole('button', { name: 'Đóng thông báo' }).click();
        await expect(hien(page)).toHaveCount(0, { timeout: 3000 });
    });
});
