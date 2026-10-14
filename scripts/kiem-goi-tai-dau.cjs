#!/usr/bin/env node
/**
 * NGÂN SÁCH GÓI TẢI ĐẦU — JS + CSS mà dist/index.html bắt trình duyệt tải trước khi vẽ được khung app
 * (script entry, modulepreload, stylesheet). Mục tiêu ≤ 330 KB nén gzip (KE_HOACH_GIAO_DIEN_APPLE.md mục 7).
 *
 * Vì sao có (GĐ9, 2026-10-14): gói này từng lặng lẽ phình lên 345 KB mà không ai thấy — App.tsx import `getGlobalFont` qua
 * barrel services/dbService (`export *` cả salesData) nên Rollup đặt CẢ bộ công thức doanh thu dataUtils + constants vào
 * gói đầu; ~900 luật `dark:` chết (dark mode đã tắt) cũng nằm trong CSS. Sửa xong còn 325,7 KB. Chạy sau `npm run build`.
 *
 * Đỏ thì: `npx vite build --sourcemap --outDir <thư mục nháp>` rồi xem file nào trong gói index-*.js lớn bất thường.
 * Thủ phạm hay gặp: code khung app (App.tsx, contexts/, components/layout/, hooks/useCloudSync…) import thứ chỉ tab tải
 * lười mới cần — barrel `services/dbService` (dùng file con `dbService/core`), `utils/dataUtils` (hàm nhỏ: `utils/basicHelpers`).
 * Chỉ NÂNG ngân sách khi chủ dự án đồng ý, kèm lý do trong commit.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NGAN_SACH_KB = 330;
const dist = path.resolve(__dirname, '..', 'dist');
const htmlPath = path.join(dist, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('[gói tải đầu] Chưa có dist/index.html — chạy `npm run build` trước.');
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');
const refs = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]))];
if (refs.length === 0) {
  console.error('[gói tải đầu] Không tìm thấy script/stylesheet nào trong dist/index.html — cấu trúc build đổi? Sửa script này.');
  process.exit(1);
}
const dong = refs.map((r) => {
  const buf = fs.readFileSync(path.join(dist, r));
  return { file: r, kb: zlib.gzipSync(buf, { level: 9 }).length / 1024 };
}).sort((a, b) => b.kb - a.kb);
const tong = dong.reduce((s, d) => s + d.kb, 0);
for (const d of dong) console.log(`  ${d.kb.toFixed(1).padStart(6)} KB  ${d.file}`);
const msg = `[gói tải đầu] ${tong.toFixed(1)} KB gzip / ngân sách ${NGAN_SACH_KB} KB`;
if (tong > NGAN_SACH_KB) {
  console.error(`${msg} — VƯỢT. Xem chú thích đầu scripts/kiem-goi-tai-dau.cjs để tìm thủ phạm.`);
  process.exit(1);
}
console.log(`${msg} — OK`);
