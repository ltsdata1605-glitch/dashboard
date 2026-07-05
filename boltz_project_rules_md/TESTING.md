# TESTING.md

## Mục tiêu

Đảm bảo mỗi lần refactor không phá tính năng đang hoạt động, không làm sai số liệu, không làm vỡ UI và không gây lỗi build.

---

## Lệnh kiểm tra

Claude phải tự kiểm tra `package.json` để xác định lệnh thật. Nếu có, chạy:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Nếu project dùng package manager khác:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

hoặc:

```bash
yarn lint
yarn typecheck
yarn test
yarn build
```

---

## Checklist sau mỗi lần sửa

- [ ] App chạy được ở local.
- [ ] Không có lỗi build mới.
- [ ] Không có lỗi lint/type nghiêm trọng mới.
- [ ] Không có console error mới.
- [ ] UI không vỡ ở màn hình chính.
- [ ] Responsive không vỡ ở desktop/tablet/mobile.
- [ ] Modal/popup mở/đóng đúng.
- [ ] Button đúng style và đúng action.
- [ ] Table hiển thị đúng loading/empty/data.
- [ ] Filter hoạt động đúng và reset đúng.
- [ ] Số liệu tính toán không lệch.
- [ ] 4 module chính vẫn hoạt động.

---

## Test filter

Cần kiểm tra:

- Default filter.
- Đổi từng filter riêng lẻ.
- Đổi nhiều filter cùng lúc.
- Reset filter.
- Filter không có dữ liệu.
- Filter có dữ liệu lớn.
- Filter liên kết giữa nhiều khu vực.
- Pagination/sort nếu có.

---

## Test calculation

Cần kiểm tra:

- Dữ liệu bình thường.
- Dữ liệu rỗng.
- Dữ liệu null/undefined.
- Giá trị 0.
- Giá trị âm nếu nghiệp vụ cho phép.
- Số lớn.
- Làm tròn số.
- Format tiền tệ/phần trăm.
- So sánh kết quả giữa các module dùng cùng công thức.

---

## Test UI component chuẩn

### Button

- [ ] Primary/secondary/ghost/danger đúng style.
- [ ] Disabled state đúng.
- [ ] Loading state đúng nếu có.
- [ ] Icon spacing đúng.

### Modal/Dialog

- [ ] Overlay đúng.
- [ ] Header/body/footer đúng.
- [ ] Close đúng.
- [ ] Confirm action đúng.
- [ ] Mobile không vỡ.

### Table

- [ ] Header đúng.
- [ ] Row đúng.
- [ ] Action column đúng.
- [ ] Empty state đúng.
- [ ] Loading state đúng.
- [ ] Responsive đúng.

---

## Test 4 module

Claude phải điền tên module sau khi audit:

```txt
Module 1:
- Test cases:

Module 2:
- Test cases:

Module 3:
- Test cases:

Module 4:
- Test cases:
```

---

## Quy tắc khi test fail

Nếu test/build fail:

1. Ghi rõ lỗi.
2. Xác định lỗi có sẵn trước refactor hay mới phát sinh.
3. Nếu lỗi mới phát sinh, sửa trước khi tiếp tục.
4. Nếu lỗi cũ, ghi vào `TASKS.md` để xử lý sau.
5. Không che giấu lỗi.
