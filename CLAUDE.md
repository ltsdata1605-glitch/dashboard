# CLAUDE.md — Hướng dẫn phát triển & Quy tắc dự án Dashboard YCX

> File này tổng hợp các quy tắc quan trọng nhất từ `RULES.md`, `AGENT_RULES.md`, `DESIGN_SYSTEM.md`, `DESIGN_SYSTEM_MODERN.md` và `AUDIT.md`.
> **Quy tắc ưu tiên**: `AGENT_RULES.md` (an toàn) > `RULES.md` (kiến trúc) > `DESIGN_SYSTEM.md` (giao diện UI).

---

## 0. Quy trình bắt buộc trước khi sửa code

1. **Yêu cầu bắt buộc trước khi sửa lớn**: Agent phải chủ động thực hiện commit trạng thái Git hiện tại trước khi bắt đầu sửa đổi mã nguồn (ví dụ chạy lệnh commit với tin nhắn mô tả rõ trạng thái "trước khi sửa X").
2. **Yêu cầu Backup**: Khi người dùng yêu cầu "backup", "sao lưu", "sao luu"... Agent phải tự động chạy lệnh:
   ```bash
   node archive/backup.cjs
   ```
   Lệnh này tự động nén zip lưu trong `archive` và đồng bộ lên Github.
3. **Lập kế hoạch trước khi sửa**: Luôn tạo hoặc cập nhật tệp `implementation_plan.md` mô tả các tệp thay đổi và thiết kế giải pháp trước khi thực hiện.
4. **Phạm vi tác động**: Chỉ thực hiện đúng phạm vi yêu cầu của task. Không tự ý mở rộng, không tự ý refactor lớn khi task yêu cầu sửa nhỏ, không đổi tên biến/file/route/function nếu không cần thiết.
5. **Bảo mật**: Không được xóa hay thay đổi file cấu hình, `.env`, token, firebase key. Không tự ý hard-code API key mới vào mã nguồn.
6. **Báo cáo hoàn tất**: Sau khi sửa xong, báo cáo rõ ràng: các file đã sửa, lý do sửa, rủi ro, cách kiểm tra.
7. **Xác minh trước khi báo cáo**: Bắt buộc chạy lệnh kiểm tra tự động trước khi báo cáo hoàn thành:
   ```bash
   npm run check
   ```
   (Lệnh này chạy gộp typecheck, eslint, build và lint-ratchet).

---

## 1. Kiến trúc — 4 khu vực song song (QUAN TRỌNG NHẤT)

Dự án thực tế gồm 4 khu vực "mini-app" song song hoạt động độc lập, không phải 1 hệ thống duy nhất:

| Khu vực | Thư mục chứa | Mount point (`App.tsx`) | Ghi chú / Cách ly |
|---|---|---|---|
| **Root** | `components/`, `hooks/`, `services/`, `contexts/`, `utils/` | Trực tiếp trong `TabContent` | `hooks/` và `services/` ở root chỉ dành cho tab `analysis` và `check-thuong`. |
| **bi-dashboard** | `features/bi-dashboard/` | `<BiWrapper />` (tab `employees`) | Hoàn toàn tách biệt khỏi các khu vực còn lại. |
| **phan-ca** | `features/phan-ca/` | `<PhanCaView />` (tab `tools-phanca`) | Hoàn toàn tách biệt khỏi các khu vực còn lại. |
| **sticker-event** | `features/sticker-event/` | `<StickerPrinterView />` (tab `tools-print-sticker`) | Hoàn toàn tách biệt khỏi các khu vực còn lại. |

**Quy tắc cách ly bắt buộc:**
- ❌ Các thư mục `features/*` **không được import chéo lẫn nhau** và **không được import** `hooks/*` hoặc `services/*` ở thư mục gốc.
- ✅ Cả 4 khu vực chỉ được dùng chung đúng 2 thứ: các UI component trong `components/shared/ui/*` và các hàm thuần tiện ích trong `utils/dataUtils.ts`.
- ⚠️ Một hàm cùng tên ở 2 khu vực khác nhau (ví dụ: `formatCurrency` ở sticker-event dùng in nhãn, khác với rút gọn "1.2 Tr" ở dashboard) **không mặc nhiên là trùng lặp cần gộp**. Kiểm tra ngữ cảnh trước khi dedupe.
- 🔴 **Logic tính toán — Nguồn chân lý duy nhất**: Mọi số liệu doanh thu, doanh thu quy đổi (DTQĐ) và số lượng quy đổi (weightedQuantity) bắt buộc phải tính toán qua hàm chuẩn `utils/dataUtils.ts → calculateRowMetrics()`. CẤM tự ý viết lại công thức tính cục bộ ở nơi khác gây sai số chênh lệch.

---

## 1.1. Backend — Cloud Functions & Firestore Rules (bổ sung 2026-07-17)

Ngoài 4 khu vực frontend ở mục 1, dự án có 1 khu vực **backend thật sự** (không chỉ Firebase BaaS thuần client-to-Firestore):

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Cloud Functions | `functions/` (project Node/TypeScript riêng, KHÔNG thuộc build Vite) | `resolveSession`, `requestAccess`, `adminUpdateUser`, `generateWithGemini`, `demoteExpiredUsers` |
| Firestore Rules | `firestore.rules` (repo root) | Chặn client (kể cả admin) ghi trực tiếp field nhạy cảm vào `users/{uid}` |

**Quy tắc bắt buộc:**
- 🔴 Mọi thay đổi `role`, `status`, `departmentId`, `expiresAt`, `requestedRole` của user (kể cả tự sửa hay admin duyệt người khác) **bắt buộc đi qua Cloud Function** (`resolveSession`/`requestAccess`/`adminUpdateUser`). **Cấm** `updateDoc`/`setDoc` trực tiếp các field này từ client — `firestore.rules` đã chặn cứng, code client vi phạm sẽ nhận `permission-denied`.
- ⚠️ Khi thêm **collection/subcollection Firestore mới** ở root hoặc `features/phan-ca` (2 khu vực này dùng chung project Firebase `dashboa-7e20b`), **bắt buộc cập nhật `firestore.rules`** tương ứng. Quên bước này gây lỗi "Missing or insufficient permissions" im lặng (đã xảy ra thật với `users/{uid}/salesData` và `_system/stats` — audit ban đầu bỏ sót vì dùng grep quá hẹp, chỉ bắt `collection(db, 'x')` 1 tham số, không bắt được `collection(db, 'users', uid, 'salesData')` nhiều tham số).
- `functions/` là project TypeScript độc lập (tsconfig/package.json riêng), bị loại trừ khỏi `tsconfig.json` và `eslint.config.js` ở gốc — không chạy qua `npm run check`, phải tự `cd functions && npm run typecheck && npm run build` để kiểm tra riêng.
- Deploy: `npm run deploy:rules` / `npm run deploy:functions` (cần `firebase login` thủ công bằng tài khoản Google có quyền trên project — không tự động hoá, không phải việc agent tự chạy).
- `features/sticker-event` dùng Firebase project riêng/cấu hình động (`firebase-applet-config.json`, gitignored) — **chưa** áp dụng pattern Cloud Functions này, vẫn ghi `role` trực tiếp từ client (xem `services/firebaseService.ts` trong feature đó). Việc này để ngoài phạm vi cho tới khi có yêu cầu cụ thể.

---

## 2. Quy chuẩn Thiết kế & Giao diện (Design System)

- **Màu sắc**: Chỉ dùng bảng màu semantic đã duyệt: `sky` (primary), `slate` (secondary), `emerald` (success), `amber` (warning), `rose` (danger). Cấm khai báo custom property màu sắc mới trong `features/*`.
- **Màu ramp (Xoay vòng)**: Khi phân biệt trên 5 hạng mục dữ liệu, dùng pattern "6 họ semantic x 2 tầng sắc độ" (5 màu chuẩn + `indigo`, mỗi họ 2 sắc độ đậm/nhạt), không tự chế màu ngoài palette.
- **UI Components**: Mọi phần tử tương tác (button, input, modal, confirm dialog, badge, select, dropdown) **bắt buộc** dùng components ở `components/shared/ui/*`. Cấm viết `<button>` thô hoặc tự dựng modal `fixed inset-0` mới.
- **Cấm tuyệt đối `window.alert/confirm/prompt`**: Bắt buộc dùng component `<ConfirmDialog />`.
- **Dark mode**: **ĐÃ TẮT toàn dự án** (áp dụng từ 2026-07-10). Cấm viết class `dark:` mới cho các thay đổi giao diện. Các class `dark:` cũ trong code được giữ nguyên (vô hiệu, không cần dọn dẹp).
- **Bo góc**: `rounded-md` (cho input/button), `rounded-xl` (cho card/modal). Tránh dùng `rounded-3xl`. Bảng biểu dùng `rounded-none` (phẳng).
- **Bảng biểu (Tables)**: Viền mỏng `border-slate-200`, header bảng viết hoa `text-[11px] font-bold tracking-tight`.
- **Đồng nhất thiết kế**: Lấy module **Phân Tích** (`components/views/DashboardView.tsx` và các bảng biểu con của nó) làm chuẩn vàng thiết kế. Tất cả các module khác điều chỉnh theo chuẩn này.

---

## 3. Hiện trạng & Lộ trình rà soát (Tháng 7/2026)

- **Gỡ bỏ any**: Chỉ dùng `any` khi parse dữ liệu Excel raw thô từ Google Sheets hoặc thư viện bên ngoài.
- **Tách tệp cồng kềnh**: Các tệp god-file như `printService.ts` (~1466 dòng) hoặc `StickerPrinterView.tsx` chỉ refactor tách nhỏ khi có yêu cầu cụ thể.
- **Responsive**: View nào có toolbar desktop (portal vào `#global-header-actions`) bắt buộc phải có toolbar mobile `lg:hidden` tương ứng.
- **Tiến độ rà soát**:
  - Đợt 0: Dọn rác nhanh (file chết, unused warnings, console.log).
  - Đợt 1: Hợp nhất logic tính toán DTQĐ về `calculateRowMetrics()` để sửa sai lệch số liệu.
  - Đợt 2: Đồng nhất thiết kế các module còn lại theo module Phân Tích (chuẩn hóa màu, bo góc, border).
  - Đợt 3: Loại bỏ any, hợp nhất modal và tách god-file.
