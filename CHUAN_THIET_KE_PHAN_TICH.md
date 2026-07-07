# CHUẨN THIẾT KẾ "PHÂN TÍCH" — CHUẨN VÀNG (PROMPT 2A)
> Nhiệm vụ CHỈ ĐỌC — không có file code nào bị sửa khi lập checklist này.
> Phạm vi khảo sát: `components/views/DashboardView.tsx` + `components/tables/*`,
> `components/kpis/*`, `components/summary/*`, `components/charts/*` (23 file).

## 1. Bảng màu semantic thực tế

Thống kê tần suất class màu trong toàn bộ phạm vi (không phân biệt sắc độ 50-950):

| Family | Số lần dùng | Ghi chú |
|---|---|---|
| `slate` | 664 (text 364 + bg 300) | Neutral chính — text phụ, nền card, border |
| `indigo` | 156 (text 109 + bg 47) | **Alias primary/sky** theo `styles.css` override — KHÔNG phải vi phạm, xem CLAUDE.md mục 2 |
| `rose` | 103 | Danger/cảnh báo/xóa |
| `emerald` | 85 | Success/tăng trưởng |
| `amber` | 79 | Warning/cảnh báo nhẹ |
| `blue` / `sky` | 69 (blue 45 + sky 41 - tính riêng) | Dùng rải rác song song với sky — **KHÔNG hoàn toàn nhất quán** |
| `violet` | 32 | Chủ yếu làm màu phân loại biểu đồ/badge nhóm (category color), không phải primary/secondary |
| `red` / `green` | 37 (red 20 + green 17) | ⚠️ Xuất hiện cả trong `SummaryTableRow.tsx` (vd `text-green-600`/`text-red-600` cho delta tăng/giảm) — LỆCH so với chuẩn `emerald`/`rose`, kể cả trong chính tab được coi là chuẩn |
| `purple`/`gray`/`yellow` | 12 | Rất ít, rải rác |

**Kết luận quan trọng:** ngay cả tab "Phân Tích" — vốn được chọn làm CHUẨN VÀNG — cũng **không hoàn toàn tinh khiết theo 5 màu semantic**. `indigo` là alias hợp lệ của primary; nhưng `blue`, `violet`, `red`, `green` vẫn xuất hiện ở một số nơi (đặc biệt cặp `red-600`/`green-600` cho số delta tăng/giảm ở `SummaryTableRow.tsx:354`, đáng lẽ phải là `rose-600`/`emerald-600`). Khi đối chiếu khu vực khác (Đợt 2B-2D), **không kỳ vọng 100% khớp tuyệt đối** — ưu tiên sửa `blue/violet/red/green/purple` dùng như *primary/secondary/success/danger*, còn màu dùng làm **category color cho biểu đồ** (phân biệt nhiều nhóm dữ liệu cùng lúc, ví dụ mỗi ngành hàng 1 màu) có thể giữ nguyên vì đó là design pattern hợp lý (semantic 5 màu không đủ để phân biệt >5 nhóm).

**Dark mode:** 551 dòng có `dark:` trên tổng ~1276 dòng có class màu semantic — nghĩa là **không phải mọi chỗ đều có dark:** dù CLAUDE.md nói "không ngoại lệ". Cẩn thận: nhiều trường hợp `dark:` được khai báo ở component cha bao ngoài (ví dụ `border-slate-200 dark:border-slate-700` gộp chung 1 class-string) nên con số chưa hẳn phản ánh vi phạm thật — cần soát tay khi migrate, không suy diễn máy móc theo tỷ lệ.

## 2. Bo góc, border, shadow, spacing

- **Bo góc thực tế đo được**: `rounded-none` (78 lần) > `rounded-lg` (52) > `rounded-md` (43) > `rounded-full` (42, badge/dot/avatar) > `rounded-xl` (30) > `rounded-2xl` (6, hiếm — chỉ ở banner nổi/toast).
  - Bảng dữ liệu (table) luôn `rounded-none` — khớp CLAUDE.md.
  - Card tĩnh: pattern responsive đặc biệt **`rounded-none sm:rounded-xl lg:rounded-none`** (ví dụ khối KPI tổng quan ở `DashboardView.tsx:461`) — mobile phẳng full-width, tablet thành card bo góc, desktop lại phẳng (vì container ngoài đã tạo cảm giác card). Đây là chi tiết KHÔNG có trong DESIGN_SYSTEM.md, cần bổ sung khi áp dụng nơi khác.
  - `rounded-lg`/`rounded-md` áp cho button/input/badge nhỏ — khớp CLAUDE.md (`rounded-md` cho input/button).
- **Shadow**: `shadow-sm` áp đảo (29 lần, card tĩnh) > `shadow-xl` (7, dropdown/slide-menu) > `shadow-md` (6) > `shadow-lg` (3, dùng ít — khớp khuyến nghị "tránh lạm dụng shadow-lg"). Một số `shadow-[custom]` dạng arbitrary value (vd `shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]`) tinh chỉnh riêng cho card KPI — tinh tế hơn shadow-sm mặc định.
- **Border**: `border-slate-200`/`border-slate-700` áp đảo (165/86+79) — border mỏng 1px chuẩn theo CLAUDE.md. Border màu semantic (`border-emerald-200`, `border-amber-200`, `border-rose-*`) chỉ dùng cho banner cảnh báo/trạng thái, không dùng cho border thường.
- **Header bảng**: KHÔNG cố định `text-[11px]` như DESIGN_SYSTEM.md mô tả — thực tế là chuỗi **responsive**: `text-[9px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider` (cột chính) hoặc `text-[9px] sm:text-[10px]`/`text-[10px] sm:text-sm` (cột nhóm). `text-[11px]` chỉ xuất hiện ở cell dữ liệu thường (không phải header), ví dụ `text-[11px] sm:text-[13px]` cho nội dung ô bảng.
- **Spacing chuẩn**: card padding `p-2 lg:p-6`; khoảng cách giữa các section `space-y-2 lg:space-y-6` (mobile rất sát nhau, desktop giãn rộng); container chính `max-w-[960px] mx-auto`.

## 3. Toolbar desktop/mobile

**Phát hiện quan trọng — khác với mô tả tổng quát trong CLAUDE.md/RULES.md:**

Tab "Phân Tích" **KHÔNG dùng pattern portal `#global-header-actions`**. Portal đó chỉ được dùng bởi các VIEW khác cấp Sidebar (`SettingsView`, `CheckThuongView`, `PhanCaView`, `BiWrapper`, `StickerPrinterView` — xác nhận qua grep, 0 kết quả trong phạm vi Phân Tích).

Pattern THẬT của Phân Tích: **toolbar nhúng trực tiếp trong `SectionHeader` (children prop)**, dùng kỹ thuật "double-icon" thay vì 2 khối JSX desktop/mobile riêng biệt:
```tsx
<Icon name="camera" size={4} className="lg:hidden" />       {/* icon nhỏ, mobile */}
<Icon name="camera" size={5} className="hidden lg:block" /> {/* icon to, desktop */}
```
Cùng 1 `<Button>` chứa cả 2 `<Icon>`, ẩn/hiện bằng class — KHÔNG tạo 2 button riêng cho mobile/desktop. Đây là pattern DRY hơn, nên khuyến nghị dùng lại thay vì tạo toolbar mobile `lg:hidden` tách biệt hoàn toàn khỏi toolbar desktop.

## 4. Component `shared/ui` được dùng

| Component | Số lần import trong phạm vi | Ghi chú |
|---|---|---|
| `Button` | 12 | Không có `<button>` thô nào (0/23 file) — sạch tuyệt đối |
| `Select` | 3 | Dropdown chọn filter |
| `Modal` | 3 | Modal thật (KpiCardConfigModal, filter popover con) |
| `Input` | 2 | |
| `ConfirmDialog`, `Badge`, `Skeleton` | 0 trực tiếp | Không nghĩa là vi phạm — Skeleton dùng ở tầng `DashboardView` qua `SkeletonLoader` (KpiCardsSkeleton/ChartSkeleton/TableSkeleton), không phải trong các component con này |

**`window.alert/confirm/prompt`: 0 vi phạm.** **`fixed inset-0` tự viết: 6 chỗ**, nhưng KHÔNG phải modal — toàn bộ là overlay/backdrop hợp lệ (click-outside để đóng popover, toggle fullscreen bảng kho, backdrop slide-menu filter) → đúng tinh thần CLAUDE.md ("overlay/không phải modal → giữ nguyên").

## 5. Checklist rút ra (15 quy tắc để đối chiếu khu vực khác)

1. **Không có `<button>` thô** — 100% dùng `<Button variant="ghost|primary|...">`, kể cả nút icon nhỏ trong toolbar.
2. **Toolbar responsive dùng kỹ thuật double-icon** (`className="lg:hidden"` + `"hidden lg:block"` trong cùng 1 Button) thay vì 2 khối JSX tách biệt — trừ khi nội dung desktop/mobile thực sự khác nhau về mặt bố cục (không chỉ cỡ icon).
3. **KHÔNG dùng portal `#global-header-actions`** trong các component thuộc tab Phân Tích — toolbar nhúng trực tiếp qua `<SectionHeader>{children}</SectionHeader>`.
4. **Bảng dữ liệu luôn `rounded-none`**, border mỏng `border-slate-200 dark:border-slate-700`, không bo góc dù ở bất kỳ breakpoint nào.
5. **Card tĩnh dùng pattern responsive `rounded-none sm:rounded-xl lg:rounded-none`** khi nằm trong container full-width có padding riêng ở desktop — không mặc định `rounded-xl` cố định mọi breakpoint.
6. **Header bảng là chuỗi responsive 3 bậc** kiểu `text-[9px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider`, không phải 1 giá trị `text-[11px]` cố định.
7. **Cell dữ liệu bảng dùng `text-[11px] sm:text-[13px]`** — đây mới là nơi `text-[11px]` xuất hiện, không phải ở header.
8. **Shadow**: card tĩnh `shadow-sm` (hoặc arbitrary value tinh chỉnh riêng), dropdown/slide-menu `shadow-xl`/`shadow-2xl`, tránh `shadow-lg` (chỉ 3/naa lần dùng trong toàn phạm vi).
9. **Số liệu tăng/giảm (delta) phải dùng `emerald-600`/`rose-600`**, KHÔNG dùng `green-600`/`red-600` — phát hiện đây là lỗi lệch chuẩn có thật ngay trong `SummaryTableRow.tsx`, cần sửa khi động tới file đó (không tự ý sửa nếu không nằm trong phạm vi task).
10. **`indigo` là alias hợp lệ của primary/sky`** (qua `styles.css`) — không tự động đổi `indigo`→`sky` hàng loạt, nhưng cũng không viện cớ "đã có indigo nên không cần sửa" khi thấy `blue`/`violet` dùng SAI vai trò primary.
11. **Màu category cho biểu đồ** (mỗi ngành hàng/nhóm 1 màu riêng, ví dụ trong `IndustryGrid.tsx`) được phép dùng ngoài 5 màu semantic (violet, blue, purple...) vì mục đích phân biệt trực quan nhiều nhóm — không phải lỗi cần sửa.
12. **`fixed inset-0` chỉ hợp lệ cho overlay/backdrop** (click-outside-to-close, fullscreen toggle, slide-menu backdrop) — modal thật bắt buộc qua `shared/ui/Modal`.
13. **Spacing chuẩn**: `p-2 lg:p-6` cho padding card, `space-y-2 lg:space-y-6` giữa các section, container `max-w-[960px] mx-auto`.
14. **`window.alert/confirm/prompt`: cấm tuyệt đối** — tab Phân Tích đạt 0 vi phạm, đây là baseline bắt buộc đạt được ở khu vực khác.
15. **Dark mode không đạt 100% ở mọi dòng đơn lẻ** (551/1276) nhưng phần lớn do `dark:` được khai báo gộp ở class cha — khi audit khu vực khác, kiểm tra bằng mắt từng đoạn UI thực tế thay vì đếm tỷ lệ `dark:` theo dòng code (dễ cho kết quả sai lệch).

---
*Không có file code nào bị sửa trong quá trình lập checklist này.*
