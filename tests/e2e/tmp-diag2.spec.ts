import { test, hasRealDataProfile } from './helpers/realDataContext';
test.skip(!hasRealDataProfile(), 'no profile');
test('diag2', async ({ page }) => {
    await page.goto('/');
    const sb = page.locator('aside').first();
    await sb.waitFor({ state: 'visible', timeout: 40_000 });
    await sb.locator('button:has(svg.lucide-users)').first().click();
    await page.getByRole('button', { name: /Nhân viên/i }).first().click();
    await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
    await page.getByRole('button', { name: 'Tổng', exact: true }).first().click({ timeout: 25_000 });
    await page.locator('table tbody tr').first().waitFor({ timeout: 25_000 });
    await page.waitForTimeout(2500);
    const m = () => page.evaluate(() => {
        const t = document.querySelector('table')!;
        const th = t.querySelector('thead')!.getBoundingClientRect();
        const rr = t.querySelector('tbody tr')!.getBoundingClientRect();
        return { chongLan: Math.round(th.bottom - rr.top), theadTop: Math.round(th.top) };
    });
    console.log('TRƯỚC CUỘN :', JSON.stringify(await m()));
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(600);
    console.log('SAU CUỘN 500px:', JSON.stringify(await m()));
    await page.screenshot({ path: '/tmp/fix.png', clip: { x: 500, y: 0, width: 1000, height: 620 } });
});
