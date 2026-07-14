# CLAUDE.md — Hướng dẫn làm việc trong dự án Dashboard YCX

> File này tổng hợp các quy tắc quan trọng nhất từ `RULES.md`, `AGENT_RULES.md`,
> `DESIGN_SYSTEM.md` và `AUDIT.md`. Đọc file này trước khi sửa bất kỳ code nào.
> Khi có mâu thuẫn: `AGENT_RULES.md` (an toàn) > `RULES.md` (kiến trúc) >
> `DESIGN_SYSTEM.md` (UI) > `AUDIT.md` (chỉ là ghi nhận hiện trạng, không phải luật).
>
> **Nguồn UI mới hơn `DESIGN_SYSTEM.md`**: `DESIGN_SYSTEM_MODERN.md` (chuẩn "Clean
> Executive Analytics", là nguồn chân lý hiện hành cho hướng thiết kế hiện đại) +
> `KE_HOACH_NANG_CAP_GIAO_DIEN.md` (kế hoạch Phần 0→A→B→C). Tiến độ: **Phần 0/A/B đã
> xong** — module "Phân tích" là chuẩn vàng, `SectionCard`/`SectionHeader`/`KpiCard`/
> `EmptyState` đã có sẵn ở `components/shared/ui/`. **Phần C (áp chuẩn đó cho
> `bi-dashboard`/`phan-ca`/`sticker-event`) mới chỉ sửa lẻ tẻ vài điểm, CHƯA hệ thống
> hoá** — đừng giả định 3 module này đã đồng nhất UI với "Phân tích".

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
- 🔴 **Logic tính toán — nguồn duy nhất**: mọi số liệu doanh thu/DTQĐ (doanh thu quy
  đổi) phải tính qua `utils/dataUtils.ts → calculateRowMetrics()`. KHÔNG tự tính lại
  công thức DTQĐ/trọng số ở nơi khác — từng có ~9 file tự tính riêng và gây sai số
  giữa các bảng/biểu đồ (đã hợp nhất xong, xem không tái diễn khi thêm màn hình mới).

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
- Dark mode: **ĐÃ TẮT toàn dự án** (quyết định 2026-07-10, `LayoutContext` ép chế độ
  Sáng). KHÔNG viết class `dark:` mới cho code mới. Class `dark:` cũ trong code cứ để
  yên (vô hiệu, không cần dọn) — `npm run check`/lint-ratchet không chặn vì thiếu `dark:`.
- Bo góc: `rounded-md` (input/button), `rounded-xl` (card/modal), tránh
  `rounded-3xl`. Table dùng `rounded-none` (phẳng), border mỏng
  `border-slate-200 dark:border-slate-700`, header uppercase `text-[11px] font-bold`.
- Shadow: `shadow-sm` cho card tĩnh, `shadow-xl`/`shadow-2xl` cho dropdown/modal —
  tránh lạm dụng `shadow-lg`.
- View có toolbar desktop (portal `#global-header-actions`) bắt buộc có toolbar
  mobile tương ứng — 2 pattern hợp lệ: div inline `lg:hidden`, HOẶC portal riêng vào
  `#mobile-topbar-actions` (dùng ở `Header.tsx`/`SettingsView.tsx`/`BiWrapper.tsx`/
  `CheckThuongView.tsx`) — cả 2 đều được `lint-ratchet` công nhận.
- TypeScript: không dùng `any` trừ khi parse dữ liệu Excel/raw thô.

## 3. Hiện trạng thực tế cần biết (đã kiểm chứng lại 2026-07 — số trong AUDIT.md 04/07
đã lỗi thời, đừng tin số liệu cũ trong đó)

Đừng giả định "chắc đã theo chuẩn" hay tự ý sửa hàng loạt để "khớp chuẩn" khi không
được yêu cầu — nhưng cũng đừng tin số liệu nợ kỹ thuật cũ, hãy đo lại (grep/
`npm run lint:ratchet`) trước khi tin theo bất kỳ con số nào, kể cả số dưới đây:

- Button/Modal: đã dọn xong — 0 `<button>` thô ngoài chính `components/shared/ui/
  Button.tsx`; `shared/ui/Modal` dùng ở ~71 file; `ModalWrapper` cũ chỉ còn tự tham
  chiếu trong `Modal.tsx` (coi như đã hết dùng thật).
- `dbService.ts` (root) đã tách xong, chỉ còn ~22 dòng (re-export shim). God file còn
  lại: `features/sticker-event/services/printService.ts` (~1466 dòng),
  `StickerPrinterView.tsx` (~1277 dòng) — tách nhỏ chỉ khi được yêu cầu refactor riêng.
- `any` type: chỉ còn ~34 chỗ, hầu hết có comment `// any: ...` giải thích lý do giữ
  (parse Excel raw, generic/lifecycle signature đúng ngoại lệ ở mục 2) — không phải
  nợ cần dọn hàng loạt.
- Màu ramp cần phân biệt >5 hạng mục (category/tab/nhóm ngành hàng...): dùng pattern
  "6 họ semantic × 2 tầng sắc độ" (5 màu chuẩn + `indigo`, mỗi họ 2 sắc độ đậm/nhạt) —
  xem `useIndustryAnalysisLogic.ts`/`EmployeeAnalysis.tsx` làm mẫu, không tự chế màu
  ngoài danh sách.
- **UI đồng nhất "Phân tích" làm chuẩn — CHƯA xong ở 3 module còn lại**: xem ghi chú
  đầu file (Phần 0/A/B xong, Phần C mới sửa lẻ tẻ). Nợ đo được (2026-07-14):
  `bi-dashboard` 17× `rounded-2xl` tuỳ tiện + 11 `shadow-lg`/19 `shadow-xl`,
  `sticker-event` 10 `shadow-lg`/8 `shadow-xl`, container max-width mỗi module 1 số
  khác nhau (960/1000/1600/7xl), `SectionCard`/`SectionHeader` chung = 0 file dùng ở
  cả 3 module.
- `services/firebase.ts` có API key hard-code (rủi ro bảo mật đã biết, chưa xử lý) —
  không thêm secret mới hard-code theo mẫu này.

## 4. Deploy

```bash
git add -A && git commit -m "..." && git push origin main
npm run deploy
```
Chỉ chạy khi user yêu cầu rõ ràng. Pre-deploy: `npm run build` không lỗi, không
`console.log` debug sót lại, test cả desktop/mobile viewport (dark mode đã tắt, không
cần test riêng).
