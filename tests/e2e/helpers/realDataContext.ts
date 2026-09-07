/* eslint-disable react-hooks/rules-of-hooks -- `use()` ở đây là API fixture của Playwright,
   không phải React hook; rule react-hooks nhận nhầm vì trùng tên. */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Fixture cho các test chạy trên DỮ LIỆU THẬT: dùng profile Chrome riêng đã đăng nhập sẵn
 * (tạo bằng `node scripts/e2e-auth-setup.mjs`), thay vì context trắng như test thường.
 *
 * Mỗi test mở/đóng context riêng và dùng LẠI trang mặc định của persistent context (`pages()[0]`);
 * thử chuyển sang context dùng chung cho cả worker + `newPage()` thì trang mở ra trắng và context
 * bị đóng giữa chừng, nên giữ cách này. Chrome không cho 2 tiến trình dùng chung một thư mục
 * profile ⇒ đừng để cửa sổ đăng nhập còn mở khi chạy test, và giữ `workers: 1`.
 */
const PROFILE_DIR = process.env.E2E_CHROME_PROFILE || resolve(process.cwd(), '.e2e-chrome-profile');

export const hasRealDataProfile = () => existsSync(PROFILE_DIR);

export const test = base.extend<{ context: BrowserContext; page: Page }>({
    context: async ({}, use) => {
        const context = await chromium.launchPersistentContext(PROFILE_DIR, {
            channel: 'chrome',
            headless: true,
            viewport: { width: 1440, height: 900 },
        });
        await use(context);
        await context.close();
    },
    page: async ({ context }, use) => {
        const page = context.pages()[0] ?? await context.newPage();
        await use(page);
    },
});

export const expect = base.expect;
