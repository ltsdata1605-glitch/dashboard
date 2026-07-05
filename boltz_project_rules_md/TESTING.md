# TESTING.md

## Mục tiêu

Đảm bảo mỗi lần refactor không phá tính năng đang hoạt động, không làm sai số liệu, không làm vỡ UI và không gây lỗi build.

---

## Lệnh kiểm tra

Package manager: **npm** (có `package-lock.json`, không dùng yarn/pnpm/bun). Lệnh thật
trong `package.json` (2026-07-05) — **không có test runner** (không Vitest/Jest, chưa có
unit test tự động trong dự án này):

```bash
npm run lint          # thực chất chạy tsc --noEmit (KHÔNG phải eslint)
npm run typecheck      # alias của lint, cũng là tsc --noEmit
npm run lint:eslint    # eslint . thật sự (tên lệnh dễ nhầm với "lint" ở trên)
npm run lint:ratchet   # kiểm tra không có vi phạm mới so với violations-baseline.json
npm run build          # vite build
npm run check          # gộp: typecheck + build + lint:ratchet — dùng lệnh này để verify nhanh
```

Vì không có test runner, việc "test" trong dự án này chủ yếu là:
1. Chạy `npm run check` để bắt lỗi type/build/design-token-regression.
2. Chạy `npx eslint .` riêng để bắt lỗi cấu trúc (zone boundary, raw `<button>`...).
3. Test thủ công qua trình duyệt (`npm run dev`, dùng Playwright nếu cần chụp ảnh/kiểm
   tra tương tác) theo checklist bên dưới — KHÔNG có test tự động thay thế được bước này.

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

Đã audit source code thật (2026-07-05) — 4 zone cách ly theo `RULES.md` §2.0, khớp với
`REQUIREMENTS.md`. Mỗi zone chạy trong `<App />` qua query param `?tab=...` (xem `App.tsx`).

```txt
Module 1: Root/Dashboard (?tab=analysis, check-thuong, settings...)
- Đường dẫn: components/, hooks/, services/, contexts/ (thư mục gốc)
- Test cases:
  - Upload file YCX (.xlsx/.xls) — realtime và lũy kế/quá khứ đều parse đúng.
  - KPI cards hiển thị đúng DTQĐ/DTLK/Trả góp sau khi upload.
  - Filter theo Kho/Trạng thái xuất/khoảng thời gian phản ánh đúng trên toàn bộ dashboard.
  - Đăng nhập Google thật + Chế Độ Dùng Thử (demo/offline) đều vào được app.
  - Đồng bộ Cloud (Firestore) không lỗi khi có mạng, không crash khi mất mạng/demo mode.
  - Modal Cài đặt cấu hình / Thông báo (bell icon) mở/đóng đúng, không lỗi console.
  - "Check thưởng" (iframe nhúng) load được, không xung đột IndexedDB với app chính.

Module 2: bi-dashboard / Report BI (?tab=employees)
- Đường dẫn: features/bi-dashboard/
- Test cases:
  - Tab Nhân Viên: Doanh thu/Thưởng/Thi đua/Trả góp/Bán kèm/Chi tiết đều load đúng dữ liệu.
  - Target Hero: điều chỉnh target + phân bổ bộ phận cập nhật đúng, lưu vào IndexedDB.
  - Thi đua (CompetitionTab): tạo phiên bản mới, lọc nhóm, highlight nhân viên, xuất ảnh.
  - So sánh 2 nhân viên (CompetitionCompareView) hiển thị đúng số liệu head-to-head.
  - Export ảnh hàng loạt (batch export) không bị treo UI với dữ liệu lớn.
  - Không có state/filter nào rò rỉ chéo sang Root hoặc các zone features/* khác.

Module 3: phan-ca / Phân ca (?tab=tools-phanca)
- Đường dẫn: features/phan-ca/
- Test cases:
  - Nhập danh sách nhân viên, tạo lịch phân ca theo tháng/khoảng ngày.
  - Sửa ca (EditShiftModal): đổi ca, cho nghỉ (OFF), hoán đổi ca thủ công/tự động gợi ý.
  - Ca Xoay (EditPatternModal/AiSuggestPatternModal) tạo và áp dụng mẫu ca đúng.
  - Xuất Excel/PDF/Google Sheet, lịch sử thay đổi (HistoryModal) ghi và khôi phục đúng.
  - IndexedDB riêng của zone (`db/idb.ts`) không xung đột với `services/dbService.ts` gốc.

Module 4: sticker-event / In Sticker (?tab=tools-print-sticker)
- Đường dẫn: features/sticker-event/
- Test cases:
  - Đăng nhập theo mã kho (Login.tsx), phân quyền admin/staff đúng theo Firestore `stores/`.
  - Upload file tồn kho/bảng giá, tìm kiếm sản phẩm, quét mã vạch (Scanner).
  - Tạo sticker Giá Sốc/Giờ Vàng/Phiếu Rút Thăm, in đơn/in hàng loạt.
  - Nhập sản phẩm thủ công (ManualInputModal), lưu/tải danh sách đã lưu.
  - Đồng bộ `stores/{storeId}` (productChunks/inventoryChunks) không mất dữ liệu khi chunk lớn.
  - `printService.ts` gọi html2canvas theo từng sticker trong vòng lặp — test in thật trên
    máy in bill 80mm trước khi đổi logic này (rủi ro cao, xem CHANGELOG).
```

---

## Quy tắc khi test fail

Nếu test/build fail:

1. Ghi rõ lỗi.
2. Xác định lỗi có sẵn trước refactor hay mới phát sinh.
3. Nếu lỗi mới phát sinh, sửa trước khi tiếp tục.
4. Nếu lỗi cũ, ghi vào `TASKS.md` để xử lý sau.
5. Không che giấu lỗi.
