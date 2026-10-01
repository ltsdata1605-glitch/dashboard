// Sinh bộ icon + màn khởi động (splash) iOS từ logo public/favicon.svg — chạy lại khi đổi logo:
//   node scripts/pwa/tao-icon-splash.mjs
// Dùng Chromium sẵn có của Playwright (không thêm thư viện xử lý ảnh nào).
// Đầu ra: public/icons/*.png + public/splash/*.png. Danh sách splash phải KHỚP với các thẻ
// <link rel="apple-touch-startup-image"> trong index.html (iOS chỉ dùng ảnh đúng từng px màn hình).
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');
// Bản "full-bleed" (không bo góc, không viền trong suốt): iOS tự bo góc icon, để góc trong suốt
// thì iOS tô ĐEN vào 4 góc. Maskable (Android) cũng cần nền phủ kín.
const fullBleed = svg.replace(/<rect([^>]*?)rx="9"/, '<rect$1');
const svgUrl = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

const icons = [
  ['apple-touch-icon-180.png', 180], ['apple-touch-icon-167.png', 167],
  ['apple-touch-icon-152.png', 152], ['apple-touch-icon-120.png', 120],
  ['icon-192.png', 192], ['icon-512.png', 512],
];
// [rộng CSS, cao CSS, tỉ lệ điểm ảnh] — các iPhone còn hỗ trợ iOS 16+ (SE → 16 Pro Max).
const iphones = [
  [320, 568, 2],  // SE 1
  [375, 667, 2],  // SE 2/3, 8
  [414, 736, 3],  // 8 Plus
  [375, 812, 3],  // X/XS/11 Pro/12 mini/13 mini
  [414, 896, 2],  // XR/11
  [414, 896, 3],  // XS Max/11 Pro Max
  [390, 844, 3],  // 12/13/14
  [428, 926, 3],  // 12/13 Pro Max, 14 Plus
  [393, 852, 3],  // 14 Pro, 15, 15 Pro, 16
  [430, 932, 3],  // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [402, 874, 3],  // 16 Pro
  [440, 956, 3],  // 16 Pro Max
];

mkdirSync('public/icons', { recursive: true });
mkdirSync('public/splash', { recursive: true });
// CHROMIUM_PATH: máy có bản Chromium khác phiên bản Playwright (vd /opt/pw-browsers/chromium).
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();

for (const [name, size] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{margin:0}</style><img src="${svgUrl(fullBleed)}" style="width:${size}px;height:${size}px;display:block">`);
  await page.screenshot({ path: `public/icons/${name}` });
}
// Maskable: logo thu vào vùng an toàn 80% giữa, nền sky phủ kín.
await page.setViewportSize({ width: 512, height: 512 });
await page.setContent(`<style>*{margin:0}body{background:#0284c7;display:grid;place-items:center;width:512px;height:512px}</style><img src="${svgUrl(fullBleed)}" style="width:360px;height:360px">`);
await page.screenshot({ path: 'public/icons/icon-maskable-512.png' });

for (const [w, h, dpr] of iphones) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const p = await ctx.newPage();
  await p.setContent(`<style>*{margin:0}body{background:#f1f5f9;width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font:700 17px -apple-system,system-ui,sans-serif;color:#0f172a}</style><img src="${svgUrl(svg)}" style="width:88px;height:88px"><div>Dashboard YCX</div>`);
  await p.screenshot({ path: `public/splash/iphone-${w * dpr}x${h * dpr}.png` });
  await ctx.close();
}
await browser.close();
console.log('Xong:', icons.length + 1, 'icon,', iphones.length, 'splash');
