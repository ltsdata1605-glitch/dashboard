# DEPLOYMENT.md

## Mục tiêu

Chuẩn hóa quy trình build/deploy để sau mỗi lần refactor lớn vẫn có thể phát hành an toàn.

---

## Quy trình deploy đề xuất

1. Kiểm tra branch/backup.
2. Cài dependencies đúng package manager.
3. Chạy lint/typecheck/test nếu có.
4. Chạy build.
5. Kiểm tra preview/local production build.
6. Deploy staging nếu có.
7. Test nhanh các flow chính.
8. Deploy production.
9. Ghi changelog.
10. Chuẩn bị rollback nếu có lỗi.

---

## Package manager

Claude phải xác định package manager theo lockfile:

```txt
package-lock.json  -> npm
yarn.lock          -> yarn
pnpm-lock.yaml     -> pnpm
bun.lockb          -> bun
```

Không tự ý đổi package manager nếu không được yêu cầu.

---

## Build commands

Kiểm tra `package.json` trước. Các lệnh thường gặp:

```bash
npm install
npm run build
npm run preview
```

hoặc:

```bash
pnpm install
pnpm build
pnpm preview
```

---

## Environment

Tất cả biến môi trường cần được ghi trong `.env.example`.

Không commit `.env` thật.

Checklist env:

```txt
API base URL:
Database URL:
Auth secret:
Public keys:
Feature flags:
```

---

## Pre-deploy checklist

- [ ] Build thành công.
- [ ] Không có lỗi console nghiêm trọng.
- [ ] Trang chính load được.
- [ ] 4 module chính mở được.
- [ ] Filter hoạt động.
- [ ] Modal/popup hoạt động.
- [ ] Table hiển thị đúng.
- [ ] Responsive không vỡ layout.
- [ ] Không lộ env/secret.

---

## Rollback

Nếu deploy lỗi:

1. Xác định lỗi thuộc UI, API, database hay environment.
2. Nếu ảnh hưởng người dùng nghiêm trọng, rollback bản trước.
3. Ghi lỗi vào `CHANGELOG.md` hoặc `TASKS.md`.
4. Sửa trên branch riêng.
5. Test lại trước khi deploy lại.
