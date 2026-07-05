# DEPLOYMENT.md

## Mục tiêu

Chuẩn hóa quy trình build/deploy để sau mỗi lần refactor lớn vẫn có thể phát hành an toàn.

**Lưu ý (audit 2026-07-05):** Dự án deploy **thủ công từ máy local** lên GitHub Pages
(qua package `gh-pages`) với domain riêng, **không có** CI/CD pipeline (không có
`.github/workflows/`), **không có** môi trường staging riêng — chỉ có 1 môi trường
production duy nhất.

---

## Package manager

**npm** (có `package-lock.json`, xác nhận thật — không dùng yarn/pnpm/bun). Không tự ý
đổi package manager nếu không được yêu cầu.

---

## Quy trình deploy thật

```bash
npm run deploy
```

Lệnh này (định nghĩa trong `package.json`) thực hiện tuần tự:

```bash
git add -A && git commit -m "chore: sync source code and deploy latest web changes" \
  || echo "No changes to commit"
git push origin main
gh-pages -d dist
```

Tức là: **commit + push toàn bộ source code lên nhánh `main`**, sau đó build output
(thư mục `dist/`) được đẩy riêng lên nhánh `gh-pages` (do package `gh-pages` quản lý) để
GitHub Pages phục vụ. Domain thật: `https://dashboard.pro.vn/` (xem field `homepage`
trong `package.json` và file `public/CNAME`).

**Cảnh báo quan trọng:** `npm run deploy` tự động **commit + push origin main** — đây là
hành động ảnh hưởng shared state. KHÔNG tự ý chạy lệnh này thay người dùng trừ khi được
yêu cầu rõ ràng (xem quy tắc "Executing actions with care" — push code cần xác nhận).

Build thô (không deploy) dùng:

```bash
npm install
npm run build      # vite build → xuất ra dist/
npm run preview    # xem thử bản build production tại local
```

---

## Environment

- File thật đang dùng: **`.env.local`** (KHÔNG có `.env.example` được commit trong repo
  này). `.gitignore` đã chặn đúng `.env*` và `.env.local`, không bị lộ.
- Biến môi trường thực tế đang dùng: `GEMINI_API_KEY` (cho tính năng dùng `@google/genai`).
- **Firebase config KHÔNG dùng biến môi trường** — `apiKey`/`projectId`/... được hardcode
  trực tiếp trong `services/firebase.ts`. Đây **không phải lỗ hổng bảo mật** — API key
  Firebase Web SDK vốn được thiết kế để public (bảo vệ thật sự nằm ở Firestore Security
  Rules phía server, không phải ở việc giấu key phía client). Không tự ý "sửa" bằng cách
  chuyển sang env var trừ khi có yêu cầu rõ ràng kèm lý do.
- Google Sheets export (`services/googleSheetsService.ts`) dùng OAuth token người dùng lấy
  lúc runtime, không phải API key tĩnh trong env.

---

## Pre-deploy checklist

- [ ] `npm run check` chạy sạch (gộp typecheck + build + lint:ratchet).
- [ ] `npx eslint .` không có lỗi mới phát sinh.
- [ ] Không có lỗi console nghiêm trọng khi chạy `npm run dev` (test thủ công qua trình duyệt).
- [ ] Cả 4 zone mở được: Root (`?tab=analysis`), Report BI (`?tab=employees`),
      Phân ca (`?tab=tools-phanca`), In Sticker (`?tab=tools-print-sticker`).
- [ ] Chế Độ Dùng Thử (demo/offline mode) vẫn vào được app khi không có mạng/Firebase.
- [ ] Responsive không vỡ layout ở desktop/tablet/mobile.
- [ ] Không lộ secret trong source (đặc biệt: không commit `.env.local`).
- [ ] Đã cập nhật `CHANGELOG.md` cho thay đổi lớn trước khi deploy.

---

## Rollback

Vì không có staging và deploy trực tiếp lên `gh-pages`, rollback thực hiện bằng:

1. Xác định lỗi thuộc UI, Firestore/Firebase, hay chính file build tĩnh.
2. Nếu lỗi nghiêm trọng ảnh hưởng người dùng: checkout lại commit ổn định gần nhất trên
   `main`, chạy lại `npm run build && gh-pages -d dist` để đẩy bản build cũ lên `gh-pages`
   (KHÔNG cần push lại `main` nếu chỉ cần rollback phần hiển thị).
3. Ghi rõ lỗi và hướng xử lý vào `CHANGELOG.md`/`TASKS.md`.
4. Sửa lỗi trên `main` (hoặc branch riêng nếu thay đổi lớn — dự án hiện làm việc trực tiếp
   trên `ui-rebuild-v1`, xem `TASKS.md` Phase 0), test lại kỹ trước khi `npm run deploy` lại.
5. Vì Firestore Security Rules không được quản lý trong repo này (theo audit hiện tại),
   rollback code KHÔNG tự động rollback được thay đổi rule/permission phía Firebase Console
   — cần kiểm tra riêng nếu nghi ngờ liên quan.
