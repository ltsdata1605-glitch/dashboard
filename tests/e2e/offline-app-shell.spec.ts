import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';

/**
 * Offline (chủ dự án chốt 2026-10-08): mở app khi MẤT MẠNG vẫn thấy giao diện, không trang trắng.
 * Service worker chỉ có ở BẢN BUILD (dist/sw.js) nên test dựng `vite preview` trên dist; chưa build thì bỏ qua
 * (chạy: npm run build && npx playwright test tests/e2e/offline-app-shell.spec.ts).
 */
const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}`;
let server: ChildProcess | null = null;

test.skip(!fs.existsSync('dist/sw.js'), 'Chưa build: thiếu dist/sw.js');

test.beforeAll(async () => {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('vite preview không khởi động được');
});
test.afterAll(() => { server?.kill('SIGTERM'); });

test('mất mạng: tải lại trang vẫn dựng được app từ bản lưu của service worker', async ({ page, context }) => {
  const swErrors: string[] = [];
  page.on('console', (m) => { if (/\[SW\]/.test(m.text())) swErrors.push(m.text()); });
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // chờ tải sẵn xong: cache của bản này có đủ file
  await expect.poll(async () => page.evaluate(async () => {
    const keys = (await caches.keys()).filter((k) => k.startsWith('ycx-shell-'));
    if (keys.length !== 1) return 0;
    return (await (await caches.open(keys[0])).keys()).length;
  }), { timeout: 60_000 }).toBeGreaterThan(60);

  await context.setOffline(true);
  await page.reload();
  // Màn đăng nhập thật (không phải màn chờ trắng): chữ "DASHBOARD REPORT" chỉ có khi app đã dựng xong.
  await expect(page.locator('body')).toContainText(/dashboard report/i, { timeout: 30_000 });

  // đường dẫn SPA khác cũng mở được (dùng chung app shell)
  await page.goto(`${BASE}/?tab=tools-line-bot`);
  await expect(page.locator('body')).toContainText(/dashboard report/i, { timeout: 30_000 });
  expect(swErrors).toEqual([]);
});

test('có mạng lại: trang mới vẫn lấy từ mạng (không kẹt bản lưu)', async ({ page, context }) => {
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(false);
  const res = await page.reload();
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator('body')).toContainText(/dashboard report/i, { timeout: 30_000 });
});
