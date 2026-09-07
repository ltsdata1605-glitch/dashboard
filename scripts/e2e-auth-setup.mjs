/**
 * Đăng nhập MỘT LẦN cho bộ test E2E chạy trên dữ liệu thật.
 *
 * Mở Google Chrome thật với một thư mục profile RIÊNG cho test (`.e2e-chrome-profile/`, đã
 * gitignore) — không đụng tới profile Chrome cá nhân. Người dùng tự đăng nhập Google trong cửa sổ
 * hiện ra; script chỉ chờ tới khi phát hiện đã vào được app rồi đóng cửa sổ. Phiên đăng nhập nằm
 * trong profile đó nên các lần chạy test sau không phải đăng nhập lại.
 *
 * Dùng: node scripts/e2e-auth-setup.mjs [url]
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_DIR = process.env.E2E_CHROME_PROFILE || resolve(ROOT, '.e2e-chrome-profile');
const URL = process.argv[2] || process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const WAIT_MS = 10 * 60 * 1000;

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
});

const page = context.pages()[0] ?? await context.newPage();
await page.goto(URL);

console.log(`\n>>> Cửa sổ Chrome đã mở tại ${URL}`);
console.log('>>> Hãy bấm "Tiếp tục với Cổng Google" và đăng nhập bằng tài khoản của bạn.');
console.log('>>> Script tự đóng khi phát hiện đã vào app (chờ tối đa 10 phút).\n');

const start = Date.now();
let loggedIn = false;
while (Date.now() - start < WAIT_MS) {
    const stillOnLogin = await page.getByRole('button', { name: /Tiếp tục với Cổng Google/i })
        .isVisible()
        .catch(() => false);
    if (!stillOnLogin) {
        const hasApp = await page.locator('aside').first().isVisible().catch(() => false);
        if (hasApp) { loggedIn = true; break; }
    }
    await page.waitForTimeout(2000);
}

console.log(loggedIn
    ? `>>> ĐÃ ĐĂNG NHẬP. Profile lưu tại: ${PROFILE_DIR}`
    : '>>> HẾT THỜI GIAN CHỜ — chưa phát hiện đăng nhập thành công.');

await context.close();
process.exit(loggedIn ? 0 : 1);
