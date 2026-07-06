# CLAUDE.md — Hướng dẫn làm việc trong dự án Dashboard YCX

> File này tổng hợp các quy tắc quan trọng nhất từ `RULES.md`, `AGENT_RULES.md`,
> `DESIGN_SYSTEM.md` và `AUDIT.md`. Đọc file này trước khi sửa bất kỳ code nào.
> Khi có mâu thuẫn: `AGENT_RULES.md` (an toàn) > `RULES.md` (kiến trúc) >
> `DESIGN_SYSTEM.md` (UI) > `AUDIT.md` (chỉ là ghi nhận hiện trạng, không phải luật).

## 0. Quy trình bắt buộc trước khi sửa code

1. **Trước mỗi đợt sửa lớn: luôn commit trạng thái hiện tại trước** (yêu cầu riêng
   của user — hỏi/thực hiện `git commit` với message mô tả rõ trạng thái "trước khi
   sửa X" trước khi động vào code).
2. Lập kế hoạch ngắn gọn trước khi sửa (module nào, file nào, vì sao).
3. Chỉ làm đúng phạm vi được yêu cầu — không tự ý mở rộng, không refactor lớn khi
   task chỉ cần sửa nhỏ, không đổi tên biến/file/route/function nếu không cần thiết,
   không xóa tính năng hiện có, không thay đổi UI/UX khi chưa được yêu cầu.
4. Không tự ý `git push`, deploy, `reset`, `checkout -- `, `rebase` — chỉ thực hiện
   khi user yêu cầu rõ ràng.
5. Không xóa dữ liệu, `.env`, config, token, key.
6. Sau khi sửa xong, báo cáo: file đã sửa, lý do, rủi ro, cách test, kết quả test.
7. Khi sửa 1 tính năng/menu, chỉ test tính năng/menu đó — không cần chạy toàn bộ
   test app trừ khi sửa file SHARED/CRITICAL (xem mục 2).
8. Trước khi báo cáo hoàn tất bất kỳ thay đổi nào: chạy `npm run check`
   (typecheck + eslint + build + lint:ratchet).

## 1. Kiến trúc — 4 khu vực song song (QUAN TRỌNG NHẤT)

Dự án **không phải 1 hệ thống thống nhất** mà là 4 "mini-app" phát triển độc lập:

| Khu vực | Thư mục | Mount point | Hooks/services riêng |
|---|---|---|---|
| **Root** | `components/` (trừ `employees`), `hooks/`, `services/`, `contexts/`, `utils/` | `TabContent` trong `App.tsx` (`analysis`, `check-thuong`, `settings`...) | `hooks/*`, `services/*` gốc — CHỈ dành cho `analysis`/`check-thuong` |
| **bi-dashboard** | `features/bi-dashboard/` | `<BiWrapper />` — tab `employees` | riêng của feature |
| **phan-ca** | `features/phan-ca/` | `<PhanCaView />` — tab `tools-phanca` | riêng của feature |
| **sticker-event** | `features/sticker-event/` | `<StickerPrinterView />` — tab `tools-print-sticker` | riêng của feature |

**Quy tắc cách ly bắt buộc:**
- ❌ 3 `features/*` **không được import chéo lẫn nhau**.
- ❌ `features/*` **không được import** `hooks/*` hoặc `services/*` ở gốc.
- ✅ Cả 4 khu vực chỉ dùng chung 2 thứ: `components/shared/ui/*` và các hàm thuần
  trong `utils/dataUtils.ts`.
- ⚠️ Hàm cùng tên ở 2 khu vực **không mặc nhiên là trùng lặp cần gộp** — kiểm tra
  ngữ cảnh dùng trước khi "dedupe" (ví dụ `formatCurrency` ở sticker-event dùng để
  in giá, khác mục đích với bản rút gọn "1.2 Tr" ở dashboard).

**Phân loại mức ảnh hưởng khi sửa:**
- 🔴 CRITICAL (`App.tsx`, `index.tsx`, `styles.css`, `styles/tokens.css`,
  `constants.ts`, `types.ts`): chỉ thêm, không sửa/xóa code cũ.
- 🟠 SHARED (`contexts/*`, `services/*`, `hooks/*`, `components/layout/*`,
  `components/shared/ui/*`, `utils/dataUtils.ts`): grep toàn bộ import (kể cả
  `features/*`) trước khi sửa, không đổi tên/signature export đang dùng.
- 🟢 ISOLATED (`components/views/*`, `components/employees/*`, mỗi `features/*`):
  an toàn sửa, không ảnh hưởng khu vực khác.

**Navigation**: không dùng React Router — `activeTab` state trong `LayoutContext`.
Views lazy-mount và **persist** sau lần mount đầu (ẩn bằng CSS, không unmount).
Thêm module mới chỉ cần sửa đúng 3 file: `App.tsx`, `Sidebar.tsx`, `MobileBottomNav.tsx`.

## 2. Design System

- Màu: chỉ dùng scale semantic **sky**(primary)/**slate**(secondary)/
  **emerald**(success)/**amber**(warning)/**rose**(danger). Không thêm màu ngoài
  danh sách. Lưu ý: `styles.css` override `--color-indigo-*` bằng hex của sky làm
  alias "primary" ở một số nơi — không tự ý tìm-thay `indigo` hàng loạt vì có chỗ
  dùng `indigo` như màu riêng biệt.
- Component: mọi button/modal/input/badge/dropdown/skeleton **bắt buộc** dùng
  `components/shared/ui/*`. Cấm viết `<button>` thô hoặc tự dựng modal
  `fixed inset-0` mới.
- Cấm tuyệt đối `window.alert/confirm/prompt` — dùng `<ConfirmDialog />`.
- Dark mode: mọi class màu phải có `dark:` tương ứng, không ngoại lệ.
- Bo góc: `rounded-md` (input/button), `rounded-xl` (card/modal), tránh
  `rounded-3xl`. Table dùng `rounded-none` (phẳng), border mỏng
  `border-slate-200 dark:border-slate-700`, header uppercase `text-[11px] font-bold`.
- Shadow: `shadow-sm` cho card tĩnh, `shadow-xl`/`shadow-2xl` cho dropdown/modal —
  tránh lạm dụng `shadow-lg`.
- View có toolbar desktop (portal `#global-header-actions`) bắt buộc có toolbar
  mobile `lg:hidden` tương ứng.
- TypeScript: không dùng `any` trừ khi parse dữ liệu Excel/raw thô.

## 3. Hiện trạng thực tế cần biết (từ AUDIT.md — để tránh giả định sai)

Tài liệu mô tả chuẩn lý tưởng, nhưng **code thực tế lệch đáng kể** — đừng giả định
"chắc đã theo chuẩn" hay tự ý sửa hàng loạt để "khớp chuẩn" khi không được yêu cầu:

- Component chuẩn tồn tại nhưng ít được dùng (438 `<button>` thô so với 14 file
  dùng `Button` chung); có **3 hệ modal song song** (`shared/ui/Modal`,
  `components/modals/ModalWrapper` cũ, modal tự viết rải rác) — khi sửa 1 modal,
  xác định nó thuộc hệ nào trước, không tự ý migrate sang hệ khác nếu không được yêu cầu.
- `styles/tokens.css`, `styles.css` (`@theme`), `features/phan-ca/phanca.css` là
  3 nguồn token màu không đồng nhất — `phanca.css` không có `dark:` nào.
  `dbService.ts` là god file ~1636 dòng; nhiều file `features/*` >1000 dòng
  (`StickerPrinterView.tsx`, `PhanCaView.tsx`...) — tách nhỏ chỉ khi được yêu cầu
  refactor, không tự ý làm giữa chừng task khác.
- `services/firebase.ts` có API key hard-code (rủi ro bảo mật đã biết, chưa xử lý) —
  không thêm secret mới hard-code theo mẫu này.

## 4. Deploy

```bash
git add -A && git commit -m "..." && git push origin main
npm run deploy
```
Chỉ chạy khi user yêu cầu rõ ràng. Pre-deploy: `npm run build` không lỗi, không
`console.log` debug sót lại, test cả desktop/mobile viewport và dark mode.
