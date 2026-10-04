/* eslint-disable react-hooks/rules-of-hooks -- `use()` ở đây là API fixture của Playwright,
   không phải React hook; rule react-hooks nhận nhầm vì trùng tên. */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { resolve, join } from 'node:path';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';

const PROFILE_DIR = process.env.E2E_CHROME_PROFILE || resolve(process.cwd(), '.e2e-chrome-profile');

export const hasRealDataProfile = () => existsSync(PROFILE_DIR);

function cleanStaleSingletonLocks(dir: string) {
    try {
        if (!existsSync(dir)) return;
        const files = readdirSync(dir);
        for (const file of files) {
            if (file.startsWith('Singleton')) {
                try {
                    unlinkSync(join(dir, file));
                } catch {}
            }
        }
    } catch {}
}

export const test = base.extend<{ context: BrowserContext; page: Page }>({
    context: async ({}, use) => {
        cleanStaleSingletonLocks(PROFILE_DIR);
        const context = await chromium.launchPersistentContext(PROFILE_DIR, {
            channel: 'chrome',
            headless: true,
            viewport: { width: 1440, height: 900 },
        });
        await use(context);
        await context.close();
        cleanStaleSingletonLocks(PROFILE_DIR);
    },
    page: async ({ context }, use) => {
        const page = context.pages()[0] ?? await context.newPage();
        await use(page);
    },
});

export const expect = base.expect;
