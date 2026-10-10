import { expect, test } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';

/**
 * ẢNH TRƯỚC/SAU cho kế hoạch giao diện chuẩn Apple (KE_HOACH_GIAO_DIEN_APPLE.md, mục 6 bước 4): đăng nhập TÀI KHOẢN TEST
 * THẬT (chỉ đọc — mọi lượt ghi cloud bị chặn), chụp mọi tab ở iPhone 16 Pro Max (440×956) và laptop (1440×900).
 * Ảnh có dữ liệu thật → lưu ở `.anh-apple/` (đã gitignore), KHÔNG commit. Không để trong test-results/ vì Playwright
 * xoá sạch thư mục đó ở mỗi lượt chạy — mất ảnh "trước" đúng lúc cần so.
 *
 *   ANH=1 ANH_NHAN=sau-gd1 npx playwright test tests/e2e/anh-truoc-sau-apple.spec.ts --project=chromium
 * → .anh-apple/<ANH_NHAN>/{m,d}-<tab>.png
 */
test.skip(!process.env.ANH || !hasCustomToken(), 'Chụp ảnh thủ công — đặt ANH=1 (cần tài khoản test)');

const OUT = `.anh-apple/${process.env.ANH_NHAN || 'hien-tai'}`;
const TAB_DT = ['analysis', 'employees', 'check-thuong', 'reports', 'tools-print-sticker', 'tools-phanca', 'tools-line-bot', 'tools-tax', 'tools-coupon', 'settings', 'help'];
const TAB_LAPTOP = ['analysis', 'employees', 'check-thuong', 'reports', 'settings'];

test.use({
    launchOptions: {
        ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
});

test.describe('iPhone 16 Pro Max', () => {
    test.use({
        viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    test('mọi tab + menu Khác', async ({ page }) => {
        test.setTimeout(600_000);
        await chanGhiCloud(page);
        await dangNhapBangToken(page);
        await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
        for (const tab of TAB_DT) {
            await page.goto(`/?tab=${tab}`);
            await page.waitForTimeout(tab === 'analysis' ? 12_000 : 8_000);
            await page.screenshot({ path: `${OUT}/m-${tab}.png` });
            if (tab === 'analysis') await page.screenshot({ path: `${OUT}/m-analysis-full.png`, fullPage: true });
        }
        await page.goto('/?tab=analysis');
        await page.waitForTimeout(8_000);
        await page.locator('[data-app-chrome="tabbar"]').getByRole('button', { name: 'Khác' }).click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/m-menu-khac.png` });
    });
});

test.describe('laptop', () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    test('các tab chính', async ({ page }) => {
        test.setTimeout(300_000);
        await chanGhiCloud(page);
        await dangNhapBangToken(page);
        await expect(page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })).toHaveCount(0, { timeout: 60_000 });
        for (const tab of TAB_LAPTOP) {
            await page.goto(`/?tab=${tab}`);
            await page.waitForTimeout(10_000);
            await page.screenshot({ path: `${OUT}/d-${tab}.png` });
        }
    });
});
