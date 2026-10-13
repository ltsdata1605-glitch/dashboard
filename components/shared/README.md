# `components/shared` — MỘT nơi cho mọi thứ dùng chung

Cả 5 khu vực (gốc/Phân tích, `features/bi-dashboard`, `phan-ca`, `sticker-event`, `line-bot`, cùng `khai-thac`) chỉ được dùng chung
những gì nằm ở đây (+ `utils/dataUtils.ts`, `utils/localDbScope.ts` — CLAUDE.md mục 1). ESLint chặn `features/*` import
`components/common` (đồ riêng của Phân tích), `components/views`, `components/layout` (khung app — ngoại lệ duy nhất: Report BI dùng
`layout/FontSelector` vì nó lưu phông toàn app qua `services/dbService` gốc).

Cần một thứ dùng chung mà chưa có → **thêm vào đây** (kèm test), đừng chép một bản riêng trong khu vực của mình — đó chính là cách
sinh ra 2 bản `MultiSelectDropdown`, 17 công tắc tự vẽ, 5 kiểu toast trước GĐ8.

## `ui/` — giao diện (`import { … } from 'components/shared/ui'`)

| Cần gì | Dùng | Ghi chú |
|---|---|---|
| Nút | `Button` | `primary` (một nút/màn) · `secondary` (Huỷ, phụ) · `tinted` (phụ quan trọng) · `destructive` (việc nguy hiểm) · `danger` (chỉ nút xác nhận cuối) · `ghost`. Cỡ `sm/md` tự cao 44px trên điện thoại/cảm ứng. Nút icon trơn cần vùng chạm 44 → thêm lớp `ycx-hit`. |
| Ô nhập / chọn | `Input` (có `leftIcon`, `type="search"`), `Select` | chọn một có ô tìm: `SearchableSelect` |
| Chọn nhiều | `StringMultiSelect` (danh sách chuỗi: kho, ngành hàng — có tìm, "Tất cả", đếm) · `MultiSelectDropdown` (tuỳ chọn có key/nhóm) | |
| Bật/tắt | `Switch` (`size="sm"` trong bảng/menu) | CẤM tự vẽ (`khongCongTacTuVe.test.ts`). Công tắc chỉ để nhìn trong hàng bấm được: bọc `aria-hidden`, `tabIndex={-1}`. |
| Chọn 1 trong 2–5 chế độ | `Tabs variant="segment"` | dải cuộn ngang tự đưa mục đang chọn vào giữa; `underline` cho tab trang |
| Nút "⋯" nhiều lệnh | `ActionMenu` | iPhone là action sheet; mục `destructive` tự xuống nhóm cuối, chữ đỏ |
| Nút trên thanh trên | `usePageActions({ scope, primary, quick, items })` | KHÔNG `createPortal` vào thanh trên. `scope: 'mobile'` khi laptop đã có thanh công cụ riêng |
| Hộp thoại / sheet | `Modal` (`position="bottom"`, `primaryAction`), `ConfirmDialog` | khối tràn sát mép thân modal: `modal-bleed*` (CẤM `-m-5`) |
| Lớp phủ | `Overlay kind="busy"\|"scrim"\|"fullscreen"`, `BusyBar` (tính ngầm không chặn màn) | CẤM tự viết `fixed inset-0` (ratchet `rawOverlay`) |
| Thông báo nhanh | `toast.*`, `toastViecDai()` (việc nhiều bước) | `toast/`. CẤM `react-hot-toast` ngoài module này, cấm dựng toast bằng DOM |
| Thông báo tĩnh trong trang | `Banner tone="info\|success\|warning\|danger"` | có `action`, `onDismiss`; cấm chữ chạy |
| Trang cài đặt / danh sách nhóm | `ListGroup` + `ListRow` | kiểu Cài đặt iOS; hàng `destructive` cho "Vùng nguy hiểm" |
| Trống / chưa có dữ liệu | `EmptyState` | một kiểu cho cả app |
| Thẻ, khối | `SectionCard`, `SectionHeader`, `Card`, `KpiCard`, `StatCard`, `DataTable`, `Badge`, `ProgressBar`, `Tooltip` | |
| Đang tải | `Skeleton*`, `AppIcon name="loading" spin` | |
| Màn chào chưa có dữ liệu | `FeatureLandingLayout` | Phân tích + Report BI |
| Lỗi hiển thị một khu vực | `ErrorBoundary name="…"` | |
| Icon | `AppIcon name="<chức năng>" size="<token>"` | `icon/iconRegistry.ts` là nơi DUY NHẤT import lucide; cấm `size={số}`, cấm emoji làm icon |
| Phông Google | `napPhongGoogle`, `PHONG_GOOGLE` | |
| Hành vi | `usePresence` (vào/ra bằng CSS — thư viện `motion` đã gỡ), `useModalBehavior`, `onActivateKey`, `cn` | |

Chữ dùng thang `type-*` (`type-title`, `type-headline`, `type-body`, `type-subhead`, `type-footnote`, `type-caption`…), bo góc dùng
token (`rounded-control/card/popup/overlay`), màu theo 5 họ semantic — chi tiết `DESIGN_SYSTEM.md` mục 7.

## `export/` — xuất ảnh DUY NHẤT

`exportElementAsImage` / `startExportJob` (preset `standard` · `bi` · `raw`), `ExportOptionsModal` (sheet Tải về / Chia sẻ). CẤM import
`html-to-image`/`html2canvas` ở nơi khác (`khongBanSao.test.ts`; ngoại lệ: trang IN của In Sticker). `services/uiService.ts` và
`features/{phan-ca,sticker-event}/services/uiService.ts` chỉ là lối chuyển tiếp sang đây (giữ để ~20 nơi gọi không đổi đường dẫn);
bản của Report BI gắn preset `bi`.

## Khung app (không nằm ở đây, chỉ để biết)

`components/layout/MobileNavBar.tsx` (thanh trên iPhone), `MobileBottomNav.tsx` (thanh tab + sheet "Khác"), `PageActionsBar.tsx`. Lớp
CSS khung trong `styles.css`: `ycx-hit` (vùng chạm 44 vô hình), `ycx-tranh-dock` (trang tràn ngang laptop chừa lề dock nổi — đặt
`--trang-max` nếu có max-width), `[data-thay-tieu-de]` (màn đưa cả thanh công cụ lên thanh trên: dưới 540px chữ tiêu đề nhường chỗ).
