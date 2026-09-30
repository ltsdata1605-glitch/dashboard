import { test } from '@playwright/test';
import * as fs from 'node:fs';
/** Chụp màn đăng nhập + màn chào Phân tích (A22), đo CPU khi để yên. Chạy tay: A22_OUT=<thư mục> */
for (const [ten, vp] of [['laptop', { width: 1366, height: 768 }], ['iphone', { width: 390, height: 844 }]] as const) {
    test(`chụp ${ten}`, async ({ page }) => {
        test.skip(!process.env.A22_OUT, 'chạy tay');
        const out = process.env.A22_OUT!; fs.mkdirSync(out, { recursive: true });
        await page.setViewportSize(vp);
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).waitFor();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${out}/dang-nhap-${ten}.png` });
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.getByText('Phân tích siêu tốc').waitFor();
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${out}/man-chao-${ten}.png` });
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');
        const m = async () => Object.fromEntries(((await cdp.send('Performance.getMetrics')) as { metrics: { name: string; value: number }[] }).metrics.map(x => [x.name, x.value]));
        const a = await m(); await page.waitForTimeout(10_000); const b = await m();
        const anim = await page.evaluate(() => document.getAnimations().filter(x => x.playState === 'running').length);
        const kq = `${ten}: CPU ${((b.TaskDuration - a.TaskDuration) * 1000).toFixed(0)}ms/10s, animation đang chạy ${anim}`;
        console.log('CPU', kq); fs.appendFileSync(`${out}/cpu.txt`, kq + '\n');
    });
}
