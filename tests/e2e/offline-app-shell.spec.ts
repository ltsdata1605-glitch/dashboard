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
  // Màn đăng nhập thật (không phải màn chờ trắng): chữ "Dashboard YCX" chỉ có khi app đã dựng xong (GĐ7 2026-10-13 đổi tên từ
  // "DASHBOARD REPORT" — chữ cũ không còn ở đâu trong app).
  await expect(page.locator('body')).toContainText(/dashboard ycx/i, { timeout: 30_000 });

  // đường dẫn SPA khác cũng mở được (dùng chung app shell)
  await page.goto(`${BASE}/?tab=tools-line-bot`);
  await expect(page.locator('body')).toContainText(/dashboard ycx/i, { timeout: 30_000 });
  expect(swErrors).toEqual([]);
});

test('có mạng lại: trang mới vẫn lấy từ mạng (không kẹt bản lưu)', async ({ page, context }) => {
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(false);
  const res = await page.reload();
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator('body')).toContainText(/dashboard ycx/i, { timeout: 30_000 });
});

test('mạng chậm quá 4 giây: dùng bản lưu nhưng bản mới về trễ VẪN được lưu (không kẹt bản cũ → vòng tải lại 2026-10-21)', async ({ page }) => {
  test.setTimeout(90_000);
  // Máy chủ tĩnh riêng có công tắc "mạng chậm" — page.route không chặn được yêu cầu do service worker tự gửi.
  const http = await import('node:http');
  const path = await import('node:path');
  let cham = false;
  let banMoi = false;
  const loai: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
  const sv = http.createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    let f = path.join('dist', p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join('dist', 'index.html');
    const gui = () => {
      let body: Buffer | string = fs.readFileSync(f);
      if (f.endsWith('index.html') && banMoi) body = body.toString().replace('</body>', '<!--BAN-MOI-VE-TRE--></body>');
      res.writeHead(200, { 'content-type': loai[path.extname(f)] || 'application/octet-stream' });
      res.end(body);
    };
    if (cham && f.endsWith('index.html')) setTimeout(gui, 6000); else gui();
  });
  await new Promise<void>((r) => sv.listen(4180, '127.0.0.1', () => r()));
  try {
    const goc = 'http://127.0.0.1:4180';
    await page.goto(goc);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);
    cham = true; banMoi = true;
    const t0 = Date.now();
    await page.reload();
    const ms = Date.now() - t0;
    console.log('RELOAD_MS', ms);
    expect(ms).toBeLessThan(5_900); // trả bản lưu sau ~4 giây, không chờ mạng 6 giây
    await expect.poll(() => page.evaluate(async () => {
      const k = (await caches.keys()).find((x) => x.startsWith('ycx-shell-'));
      const res = k ? await (await caches.open(k)).match('/index.html') : undefined;
      return res ? (await res.text()).includes('BAN-MOI-VE-TRE') : false;
    }), { timeout: 15_000 }).toBe(true);
  } finally {
    sv.close();
  }
});
