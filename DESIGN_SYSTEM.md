# DESIGN SYSTEM — "Bảng điều khiển ca trực"

Chuẩn thiết kế của dự án Dashboard YCX, chốt ngày **2026-09-10**.

> **Trạng thái**: thay thế bản cũ (khôi phục từ commit `8675fd05^`). Chuẩn mới áp cho **Report BI
> trước** (Đợt 3), rồi **Phân Tích và các module còn lại** đi theo (Đợt 5). Quy tắc cũ *"lấy module
> Phân Tích làm chuẩn vàng"* **không còn đúng**.
>
> Thứ tự ưu tiên khi mâu thuẫn: `AGENT_RULES.md` > `RULES.md` > **file này**.
>
> **Cập nhật 2026-10-07 — chuẩn (B), chủ dự án chốt:** GIỮ phong cách đang chạy — thẻ/nút/modal **bo
> mềm, đổ bóng nhẹ**; khung KHỐI DỮ LIỆU lớn và ô bảng vẫn **vuông**. Thay mục 0.4, mục 3 (dòng bo góc
> + đổ bóng), mục 4.2, 4.3 bên dưới. Thang bo góc nằm ở MỘT chỗ: `styles/tokens.css` → class
> `rounded-control` / `rounded-card` / `rounded-popup` / `rounded-overlay` (sinh ở `styles.css`).

**Nguyên tắc gốc**: *mỗi pixel dành cho số, không dành cho trang trí.* Người dùng là quản lý siêu thị
liếc màn hình giữa hai lượt khách — không phải người ngồi ngắm dashboard.

---

## 0. Bốn nguyên tắc — mọi quyết định bên dưới đều suy ra từ đây

1. **Số đứng trước.** Con số là nội dung; nhãn, viền, nền chỉ để định vị con số. Khi phải chọn giữa
   "đẹp hơn" và "thêm được một dòng số", chọn dòng số.
2. **Trạng thái ở mép.** Đạt/chưa đạt mã hoá bằng **vạch màu 3px ở mép trái dòng**, KHÔNG phải viên
   pill giữa bảng. Pill chiếm chiều ngang — thứ khan hiếm nhất ở bảng 48 cột.
3. **Hai cấp đường kẻ, không hơn.** `--line-1` chia khối, `--line-2` chia dòng. Thêm cấp thứ ba là
   bắt đầu có viền lồng viền.
4. **Vùng số vuông, phần tử tương tác bo mềm** *(chuẩn B, 2026-10-07)*. Ô bảng và khung KHỐI DỮ LIỆU
   lớn (khung chứa bảng/biểu đồ trên laptop) vuông góc, không bóng. Thẻ, thẻ KPI, nút, ô nhập, modal,
   popup bo mềm theo đúng thang ở mục 3 — không tự đặt số khác.

---

## 1. MÀU — 13 token, không có màu nào ngoài danh sách

Nền lệch nhẹ về xanh lạnh (`#f4f6f8`) chứ không phải xám trung tính, để ăn với màu nhấn. Ba màu ngữ
nghĩa **đậm hơn bảng cũ một bậc** vì phải đọc được ở cỡ 11–13px trên nền trắng.

| Token | Hex | Dùng ở đâu | Khác bản cũ |
|---|---|---|---|
| `--bg-app` | `#f4f6f8` | Nền ngoài cùng | lệch xanh, không xám trung tính |
| `--bg-surface` | `#ffffff` | Nền bảng, vùng dữ liệu | giữ nguyên |
| `--bg-band` | `#eef1f5` | Dải nhóm trong bảng, đầu bảng phụ | thay `bg-slate-50` |
| `--bg-hover` | `#f1f5f9` | Dòng đang rê chuột | giữ nguyên |
| `--ink-1` | `#0f1720` | Số và chữ chính | đậm hơn `slate-800` |
| `--ink-2` | `#47535f` | Chữ mô tả, chú thích | — |
| `--ink-3` | `#7c8894` | Nhãn cột, đơn vị, số thứ tự | — |
| `--line-1` | `#d8dee5` | Viền khối, viền bảng, cột ghim | thay `slate-200` |
| `--line-2` | `#eaeef2` | Kẻ giữa các dòng | thay `slate-100` |
| `--accent` | `#0369a1` | Nút chính, liên kết, chỉ số trung tính | `sky-600` → `sky-700` |
| `--good` | `#047857` | Đạt, vượt mục tiêu | đậm hơn `emerald-600` |
| `--warn` | `#b45309` | Sát mục tiêu, cần chú ý | đậm hơn `amber-600` |
| `--bad` | `#be123c` | Chưa đạt, số âm | đậm hơn `rose-600` |

Ba màu nền nhạt `--good-bg #ecfdf5` · `--warn-bg #fffbeb` · `--bad-bg #fff1f2` **chỉ dùng cho khối
cảnh báo**, KHÔNG tô nền ô trong bảng — tô nền ô làm mắt nhảy loạn khi có 48 cột.

**Vẫn nằm trong họ sky/slate/emerald/amber/rose** nên `lint-ratchet` không đỏ; chỉ đổi sắc độ.
Cấm khai báo custom property màu mới trong `features/*`.

**Màu ramp (xoay vòng)**: khi phân biệt trên 5 hạng mục, dùng "6 họ semantic × 2 tầng sắc độ"
(5 màu trên + `indigo`). Không tự chế màu ngoài palette.

### 1.1 DARK MODE — ĐÃ TẮT TOÀN DỰ ÁN (từ 2026-07-10)

**Cấm viết class `dark:` mới.** Class `dark:` cũ giữ nguyên (vô hiệu, không cần dọn) — chỉ dọn ở file
vừa tạo mới. Đây là chỗ nhiều skill AI bên ngoài làm sai nhất: phần lớn skill UI đại trà mặc định
"dashboard chuyên nghiệp thì phải có dark mode". Ở dự án này thì không.

---

## 2. CHỮ — 2 phông, 6 cỡ, hết

**Phông — KHÔNG ĐỔI:**

```css
--font-sans: "UTM Avo", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
```

`UTM Avo` tự host tại `public/fonts/UTM Avo.ttf` + `UTM AvoBold.ttf`, có ánh xạ trọng lượng thủ công
(`font-weight: 100 500`) kèm chú thích *"prevent browser artificial fake bolding"*. Đây là phông Việt
được chọn **có chủ đích** vì dấu tiếng Việt (ế, ộ, ữ) hiển thị đúng — không phải mặc định bỏ quên.

Nhãn cột viết hoa dùng **`Roboto Condensed`** — đã nạp sẵn trong `index.html`, có dấu tiếng Việt,
không thêm request nào.

> ⚠️ Đợt 2 từng đề xuất đổi sang IBM Plex Sans / Barlow Semi Condensed. **Đề xuất đó SAI và đã rút
> lại** sau khi kiểm tra ra UTM Avo là phông tự host đã tinh chỉnh. Đừng đề xuất lại.

| Vai trò | Cỡ / đậm | Phông | Dùng ở đâu |
|---|---|---|---|
| Nhãn cột | 11px / 600 | Roboto Condensed, viết hoa, `tracking-wider` | Đầu bảng, dải nhóm, tên chỉ số |
| Số thứ tự, đơn vị | 11.5px / 400 | UTM Avo | Cột #, "Tr", chú thích nhỏ |
| Số trong bảng | 13px / 400–600 | UTM Avo + `tabular-nums` | Toàn bộ ô dữ liệu |
| Chữ nội dung | 15px / 400 | UTM Avo | Mô tả, nội dung modal |
| Số chỉ số | 25px / 600 | UTM Avo + `tabular-nums` | Dải chỉ số đầu màn |
| Tiêu đề màn | 19px / 600 | Roboto Condensed | Tên báo cáo |

🔴 **Cỡ nhỏ nhất là 11px.** Bỏ `text-[10px]` — màn hình siêu thị thường là laptop cũ, độ phân giải
thấp, cỡ 10px không đọc được.

🔴 **Mọi cột số bắt buộc `tabular-nums`** để chữ số thẳng hàng.

---

## 3. MẬT ĐỘ & BO GÓC — số cụ thể để lập trình

| Hạng mục | Giá trị | Ghi chú |
|---|---|---|
| Chiều cao dòng bảng | `26px` | đệm `3px 8px`. Bản cũ ~30px — siết lại thêm được ~4 dòng mỗi màn |
| Chiều cao đầu bảng | `28px` | **bắt buộc** `position: sticky; top: 0` |
| Chiều cao dải nhóm | `24px` | thấp hơn dòng dữ liệu — nó là vách ngăn, không phải nội dung |
| Vạch trạng thái | `3px` | mép trái dòng, thay cho pill |
| Cột ghim trái | `min 148px` | viền phải `2px` để tách khỏi vùng cuộn |
| Bo góc — ô bảng, khung KHỐI DỮ LIỆU lớn trên laptop | `0` (`rounded-none`) | giữ như Phân tích/Report BI đang chạy |
| Bo góc — nút, ô nhập, select | `8px` (`rounded-control`) | token `--btn-radius` / `--input-radius` |
| Bo góc — thẻ, thẻ KPI, khung bảng độc lập (`DataTable`) | `16px` (`rounded-card`) | token `--card-radius` |
| Bo góc — dropdown, menu, popup | `12px` (`rounded-popup`) | token `--popup-radius` |
| Bo góc — modal, sheet | `16px` (`rounded-overlay`) | token `--modal-radius` |
| Bo góc — tooltip | `6px` (`rounded-md`) | |
| Bo góc — huy hiệu, viên, avatar | tròn (`rounded-full`) | |
| Chiều cao nút | `30px` | trên điện thoại nâng lên `44px` |
| Đổ bóng — thẻ tĩnh | `shadow-sm` (`--shadow-card`) | rê chuột: `shadow-md` (`--shadow-card-hover`) |
| Đổ bóng — dropdown/popup | `shadow-lg` (`--shadow-dropdown`) | |
| Đổ bóng — modal | `shadow-xl` (`--shadow-modal`) | |
| Đổ bóng — khối dữ liệu vuông, ô bảng | không | |

*(Thang cũ 4px/6px "Bảng điều khiển ca trực" — token `--console-radius-*` — không dùng cho phần tử
mới.)* Cấm tự đặt `rounded-xl`/`rounded-2xl`/`rounded-[…]` cho thẻ/nút/modal mới: dùng class ngữ nghĩa
ở trên để đổi 1 token là cả app đổi theo.

**Viền dày `2px` chỉ dùng đúng 2 chỗ trong bảng**: mép phải cột ghim, và đầu mỗi nhóm cột.

---

## 4. COMPONENT DÙNG CHUNG

Mọi phần tử tương tác **bắt buộc** dùng `components/shared/ui/*`. Cấm viết `<button>` thô hoặc tự
dựng modal `fixed inset-0`.

### 4.1 Button — Hệ thống kiểu nút (chuẩn hoá 2026-10-11, bổ sung 2026-10-17)
`primary` sky-600 đặc — **mỗi màn chỉ một** · `secondary` "tinted" xám (nền `slate-100`, chữ đậm, không viền — vẫn rõ là
nút vì có nền) · `tinted` nền `sky-50` chữ `sky-700` (hành động phụ quan trọng) · `destructive` nền `rose-50` chữ `rose-600`
(việc nguy hiểm, đặt cuối nhóm) · `danger` đỏ **đặc** — CHỈ nút xác nhận cuối trong ConfirmDialog · `success` emerald-600
đặc (xác nhận tích cực, xuất file, đồng bộ thành công — bổ sung 2026-10-17) · `inline-link` nút dạng liên kết chữ sky-600
gạch chân (bổ sung 2026-10-17 cho các action link gọn gàng). `ghost`/`outline` giữ cho chỗ cũ (nút icon, thanh công cụ dày).
Chữ nút nổi bật `font-semibold`. **Không có nút không nền giữa nội dung** — trên nền trắng dày đặc, nút không nền trông như
chữ thường. *(Bản trước 2026-10-11: 4 kiểu, `secondary` viền xám nền trắng.)*

### 4.1b Card Header Toolbar Action Buttons (Nút công cụ trên Header thẻ/bảng — Chuẩn 2026-10-17)
Các nút thao tác nhanh đặt ở mép phải tiêu đề các khối/thẻ (như *Chi Tiết Theo Kho*, *Tổng Quan Doanh Thu*, *Xu Hướng Doanh Thu*):
- **Kích thước thị giác**: Mobile `w-8 h-8` (32×32px), Laptop/Desktop `lg:w-9 lg:h-9` (36×36px).
- **Kích thước Icon**: `size="md"` (18px) chuẩn `AppIcon` (`exportImage`, `settings`, `bot`, `layers`, `viewList`, `calendar`...).
- **Bo góc**: `rounded-lg` (`rounded-control` = 8px) — đồng nhất với toàn bộ hệ thống điều khiển.
- **Trạng thái Mặc định (Idle)**: Màu xám thanh mảnh `text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200`, hover có nền `hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`.
- **Trạng thái Đang bật / Active (vd nút Bot tự xuất)**: Nền `sky-50 dark:bg-sky-950/60`, chữ `sky-700 dark:text-sky-300`, viền `border border-sky-300 dark:border-sky-700`, đổ bóng `shadow-2xs font-semibold`, có badge dot nếu có trạng thái.
- **Trạng thái Đang xử lý (Loading/Exporting)**: Thay icon bằng `<AppIcon name="loading" size="md" spin />`, disabled opacity 40%.
- **Vùng chạm di động**: BẮT BUỘC gắn class `.ycx-hit` để kích hoạt vùng chạm vô hình 44×44px cho màn hình cảm ứng điện thoại mà không làm phình to kích thước thị giác.
- **Khoảng cách nhóm**: `gap-1.5` đến `gap-2` giữa các nút.

### 4.2 Input
Tích hợp sẵn ring focus. Không hardcode class ring cục bộ. Bo `8px` (`rounded-control`).

### 4.3 Modal (`<Modal />`)
Bo `16px` (`rounded-overlay`), bóng `shadow-xl`. Có nút `X` góc trên phải (hoặc đầu sheet iOS khi truyền `primaryAction`),
đóng được bằng `Esc`, thân **chỉ cuộn dọc** (`overflow-x-hidden`, con `min-w-0` — bảng rộng tự cuộn ngang trong khung riêng).
`position="bottom"` trên iPhone là sheet: thanh nắm, kéo xuống để đóng, né bàn phím ảo (visualViewport). Tiêu đề modal luôn
màu chữ chính — **không tô đỏ/hồng** (đỏ chỉ cho hộp xác nhận xoá). Con số trong modal dùng đúng thang màu ngữ nghĩa như trong bảng —
không có bảng màu riêng cho modal.
*(Bản cũ nhắc `<ModalWrapper />` — component đó KHÔNG tồn tại, đừng đi tìm.)*

### 4.4 ConfirmDialog
🔴 **Nghiêm cấm `window.alert` / `window.confirm` / `window.prompt`.** Dùng `<ConfirmDialog />`,
nút xác nhận tác vụ rủi ro truyền biến màu `danger`.

### 4.4b Lớp phủ không phải hộp thoại (`<Overlay />`, 2026-10-09)
CẤM tự viết `fixed inset-0` ngoài `components/shared/ui` (`lint-ratchet` `rawOverlay` = 0). Hộp thoại → `<Modal />`/`<ConfirmDialog />`. Phần còn lại dùng
`<Overlay kind="…">`: `busy` (màn chờ chặn thao tác — tự có `role=status` + `aria-busy`), `scrim` (lớp nền bắt click-ra-ngoài popover/menu — `aria-hidden`),
`fullscreen` (khung phủ kín có nội dung riêng). Phần tử lúc phủ lúc không (nút "Toàn màn hình" của bảng) dùng hằng `FULLSCREEN_LAYER_CLASS`. Thêm hoạt ảnh: `MotionOverlay`.
Modal nằm trong phần tử có `onClick` (vd dòng bảng) phải chặn nổi bọt click — Modal render qua portal nhưng sự kiện React vẫn nổi lên cha (xem `AvatarPickerModal`).

### 4.4c Toast — một hệ duy nhất (2026-10-10)
Gọi `toast` từ `components/shared/ui/toast` (ESLint cấm import `react-hot-toast` ở nơi khác). Loại: `success` (emerald, 2,5s) ·
`info` (sky, 3s) · `warning` (amber, 5s) · `error` (rose, 6s, `role=alert`, có nút ×) · `loading` (xoay, tới khi xong) ·
`action` (có nút, không tự tắt). Giao diện: viên nang **vật liệu mờ** (`.ycx-material`) bo tròn khi một dòng, thẻ bo `rounded-overlay`
khi có mô tả/nút; icon AppIcon `lg` theo màu loại; tiêu đề 15px (laptop 14px) đậm, mô tả 13px `slate-600`. Vị trí **trên giữa** mọi
thiết bị (iPhone dưới Dynamic Island), tối đa 3 cái, mới nhất trên cùng; vuốt lên/ngang để tắt, rê/chạm giữ để dừng giờ. Không
emoji làm icon, không tự dựng khung thông báo nổi (`fixed bottom-*`) — dùng `toast.action`.

### 4.5 Trạng thái tải
Dùng `<Skeleton />`, không hiển thị chữ "Loading...".

### 4.6 Icon — một chức năng, một icon, một thang size (2026-10-02)

**Gọi icon duy nhất qua** `<AppIcon name="<chức năng>" size="<token>" />` hoặc `<Button icon="<chức năng>">`
(`components/shared/ui/icon/`). Registry (`iconRegistry.ts`) là **nơi duy nhất** được import `lucide-react`.
Không dùng thư viện icon khác, không vẽ SVG icon mới (ngoại lệ: logo thương hiệu, hiện chỉ có LINE).

**Thang size** (`iconTokens.ts` là nguồn duy nhất; mốc laptop/mobile = `lg` 1024px, iPad dọc nhận size mobile):

| Token | Laptop | Mobile | Dùng cho |
|---|---:|---:|---|
| `xs` | 12 | 14 | badge, chữ phụ, link ngoài |
| `sm` | 14 | 16 | dòng bảng 26px, nút trong dòng dữ liệu, mũi tên mở menu (▾), dấu × xoá chip |
| `md` | 16 | 18 | **mặc định** — nút thường, nút chỉ có icon, icon trong ô nhập/tìm kiếm/chọn. Mọi icon chính trên CÙNG một thanh công cụ dùng `md` |
| `lg` | 20 | 22 | thanh điều hướng trái/dưới, menu chính (tab trong trang: `<Tabs>` tự dùng `sm`/`md` theo cỡ tab) |
| `xl` | 24 | 24 | hành động chính, header modal lớn |
| `state` | 32 | 32 | empty state — không dùng trong nút |
| `hero` | 48 | 40 | landing, minh hoạ |

**Quy tắc:** nét luôn `2` (đang chọn phân biệt bằng màu, không bằng nét) · icon cạnh chữ cách `6px` (`gap-1.5`)
và căn bằng `inline-flex items-center` · cùng một nhóm action thì cùng token · nút chỉ có icon trên điện thoại
có vùng bấm ≥ 44px (`Button size="icon"` đã có sẵn) · size px riêng (`px={…}`) chỉ khi có lý do, ghi chú tại chỗ ·
không đặt size bằng `w-*`/`h-*` trên icon. `lint-ratchet` đếm `iconDirectImport`, `iconNumericSize`,
`iconLegacyCall` (đều = 0 từ 2026-10-07) và `iconRawSvg` (= 1: logo Google nhiều màu ở màn đăng nhập), `iconEmoji` (emoji trong .tsx + `icon: '<emoji>'` của toast;
113 chỗ còn lại đều là nội dung — tin nhắn LINE, bookmarklet, tên ngày lễ, văn bản copy ra ngoài) — chỉ được giảm.
**Không dùng emoji (hay ký tự ✓ ✕ ⚠ ★) làm icon giao diện**: mỗi hệ điều hành vẽ emoji một kiểu, không theo thang
size/màu ngữ nghĩa. Icon toast react-hot-toast cũng là AppIcon (`icon: <AppIcon name="copy" size="md" />`; file `.ts` dùng
`createElement`). Toast success/error đã có icon riêng → không thêm emoji vào chữ.
Không đè nét bằng lớp `stroke-[…]` (unit test chặn). Tên `nav*` chỉ cho thanh điều hướng; nơi khác dùng tên chức năng
(`bot`, `coupon`…). Icon cạnh chữ trong một dòng: bọc `inline-flex items-center gap-1`, đừng đặt icon `inline` giữa
chữ (canh theo chân chữ → lệch ~2px). Tên icon kiểu cũ còn trong DỮ LIỆU đã lưu → `resolveIconName()`.
**Ngoại lệ chủ dự án chốt:** dòng danh sách `ListRow` (kiểu Cài đặt iOS) dùng icon `sm` trong ô màu 28px (c9bfa6d, 2026-10-17 — ô
có `data-list-row-icon`, bài đo icon không đòi `md`). Thanh capsule (`CapsuleBar`, cỡ `compact` 32×32) dùng icon `sm` (16px trên điện thoại) — "Icon thanh capsule:
giữ" (2026-10-15); nhãn nút chỉ cho trình đọc màn hình nên bài đo coi đó là nút icon: miễn luật `md`, VẪN phải đủ vùng chạm 44
(`ycx-hit`). Bộ lọc Siêu thị/Bộ phận ở Report BI và dải chế độ In Sticker dùng `sm` (f0a5558). Bài đo icon (`tests/e2e/helpers/iconAudit.ts`)
chạy trên CI: `icon-audit-man-goc`, `icon-audit-bi` ở mỗi lần push (job e2e), `icon-audit-modal` hằng đêm (`design-audit.yml`).

**Icon chuẩn theo chức năng** (đầy đủ trong `iconRegistry.ts`):

| Chức năng | Tên gọi | Icon lucide | Ghi chú |
|---|---|---|---|
| Xuất 1 ảnh | `exportImage` | Camera | chủ dự án chốt "CHUẨN" |
| Xuất ảnh hàng loạt | `exportBatch` | Images | |
| Tải file xuống | `download` | Download | |
| Xuất Excel | `spreadsheet` | FileSpreadsheet | mọi nút "Xuất Excel" (Thuế, Phân tích…) |
| Nhập / tải file lên | `upload` | Upload | đồng bộ cloud: `cloudUpload` / `cloudDownload` |
| Tìm kiếm | `search` | Search | không kết quả: `searchEmpty` |
| Bộ lọc | `filter` | Filter | tuỳ chỉnh hiển thị/cột: `viewOptions` (SlidersHorizontal) |
| Làm mới dữ liệu | `refresh` | RefreshCw | |
| Đặt lại / hoàn tác | `reset` | RotateCcw | khác `refresh` |
| Thêm | `add` | Plus | |
| Sửa | `edit` | Pencil | |
| Xoá | `delete` | Trash2 | |
| Sao chép / Dán | `copy` / `paste` | Copy / ClipboardPaste | |
| Lưu | `save` | Save | |
| Đóng | `close` | X | |
| Quay lại / Tiếp | `back` / `next` | ArrowLeft / ArrowRight | |
| Cài đặt | `settings` | Settings | |
| Thêm tuỳ chọn | `more` | EllipsisVertical | |
| Thành công | `success` | CircleCheck | |
| Lỗi | `error` | CircleX | |
| Cảnh báo | `warning` | TriangleAlert | lưu ý nhẹ: `alert` (CircleAlert) |
| Thông tin | `info` | Info | |
| Đang tải | `loading` | LoaderCircle | luôn kèm `spin` |
| Checkbox | `checkboxOn` / `checkboxOff` | SquareCheck / Square | |
| Realtime | `live` | Radio | |
| Cùng kỳ / thời gian | `clock` | Clock | |
| Lịch | `calendar` | Calendar | |
| Xem nhóm / danh sách | `viewGrid` / `viewList` | LayoutGrid / List | |
| Người dùng / nhóm | `user` / `users` | User / Users | |
| Tiền / thưởng | `money` | CircleDollarSign | |
| Nav: Phân tích YCX | `navAnalysis` | ChartSpline | |
| Nav: Report BI | `navReportBi` | ChartColumn | |
| Nav: Báo cáo | `navReports` | FileText | |
| Nav: Check thưởng | `navRewardCheck` | BadgeCheck | |
| Nav: Khác / công cụ | `navTools` | Wrench | |

Icon của từng tab điều hướng khai **một nơi**: `components/layout/navIcons.ts` (Sidebar, thanh dưới, ô icon
trang trên thanh tiêu đề mobile đều đọc từ đây).

---

## 5. BẢNG NHIỀU CỘT — mẫu bắt buộc

Màn hình khó nhất là **Nhân viên › Thi đua › Tổng: 29 nhân viên × 48 cột**. Ba việc phải làm cùng lúc:

1. **Ghim cột đầu** — `position: sticky; left: 0`, nền đục, viền phải `2px`. Đổi nền theo `:hover` của
   dòng để không bị "rời" khỏi dòng khi cuộn ngang.
2. **Gom cột theo nhóm** — viền trái `2px` ở cột đầu mỗi nhóm.
3. **Đầu bảng dính trên** — `sticky top: 0`, `z-index` cao hơn cột ghim ở phần `thead`.

Vùng cuộn ngang phải nằm trong container riêng có `overflow-x: auto` — **thân trang không bao giờ
được cuộn ngang**.

---

## 5b. ẢNH XUẤT — một chuẩn cho mọi khu vực (2026-10-01)

- Dùng `components/shared/export` (không tự chụp). Bảng co **vừa nội dung**: ô dữ liệu một dòng, tiêu đề xuống dòng
  ở khoảng trắng chỉ khi dài hơn dữ liệu; ảnh rộng bằng bảng rộng nhất, **tối thiểu 680px**. Ô cần xuống dòng có chủ
  đích: class `export-wrap`. Phần tử không được lọt vào ảnh: class `hide-on-export`.
- Chân ảnh chung: "Dashboard YCX · xuất HH:mm dd/mm", 11px, `slate-400`, căn phải.
- Chờ & tiến trình: MỘT bảng chung (modal `rounded-md`, spinner/thanh `sky`, xong `emerald`, có lỗi `amber`/`rose`,
  chữ ≥ 11px). Hàng loạt có thanh %, tên mục đang xuất, thời gian còn lại, nút Huỷ, tổng kết mục lỗi.

## 6. TRÊN ĐIỆN THOẠI — cùng chuẩn, không phải chuẩn thứ hai

🔴 **Dữ liệu dạng bảng LUÔN hiển thị dạng bảng — trên mọi màn hình, kể cả iPhone** (chủ dự án chốt 2026-10-02: *"Vì tính chất dữ liệu nên phải xem trên dạng bảng"*). CẤM chuyển bảng sang dạng thẻ (card/bento) hay danh sách thẻ, kể cả dưới dạng nút chuyển "Bảng/Thẻ". Được phép làm bảng dễ xem hơn: ghim cột đầu, ghim đầu bảng, viền mờ báo còn cột, mật độ, cỡ chữ. "Rút về tên · số chính · %" bên dưới nghĩa là bớt cột của CHÍNH bảng đó, vẫn là dòng × cột.

Bảng nhiều cột không bóp lại được. Trên màn hẹp, mỗi dòng rút về **tên · số chính · %**, giữ nguyên
vạch trạng thái ở mép. Chữ nâng lên `14.5px`, vùng chạm tối thiểu `44px`. Muốn xem đủ cột thì xoay
ngang — bảng vẫn cuộn được, không chặn.

View nào có toolbar desktop (portal vào `#global-header-actions`) **bắt buộc** có toolbar mobile
`lg:hidden` tương ứng.

Hỗ trợ cảm ứng: không để hover state gây kẹt trên điện thoại. Bảng dài có `.scrollbar-hide` cho cuộn
ngang.

---

## 7. LỚP APPLE (2026-10-11) — `KE_HOACH_GIAO_DIEN_APPLE.md`

Áp chuẩn Apple HIG cho dashboard bán lẻ, **giữ nguyên** mọi quyết định đã chốt (bảng luôn là bảng, UTM Avo + Roboto Condensed,
tắt dark mode, bảng màu 5 họ, thang bo góc B, chữ ≥ 11px). Mọi thứ dưới đây nằm ở `components/shared/ui/` + `styles/tokens.css`.

**Thang chữ 10 bậc** — class `type-*` (styles.css), giá trị ở token `--type-*` (tự đổi iPhone/laptop):

| Class | iPhone | Laptop | Dùng cho |
|---|---|---|---|
| `type-large-title` | 28/34 | 26/32 | Tiêu đề trang |
| `type-title` | 20/25 | 20/25 | Tiêu đề sheet/modal lớn |
| `type-headline` | 17/22 | 16/22 | Tiêu đề khối, thanh trên |
| `type-body` | 15/20 | 14/20 | Nội dung, ô nhập, nút |
| `type-subhead` | 13/18 | 13/18 | Phụ đề, **số trong bảng** |
| `type-footnote` | 12/16 | 12/16 | Chú thích, giờ cập nhật |
| `type-caption` | 11/13 | 11/13 | **Nhãn cột** (IN HOA, Roboto Condensed), nhãn thanh tab |
| `type-kpi` / `type-kpi-lg` | 25/28 · 34/38 | như iPhone | Số thẻ KPI (tabular-nums) |
| `type-kpi-xl` | — | 44/48 (chỉ màn ≥ xl) | **Số KPI chính** trên màn lớn — thẻ KPI chạy dải 26 → 28 → 34 → 44px (chủ dự án chọn phương án B 2026-10-21) |

IN HOA chỉ cho `caption`. Tiêu đề viết thường như câu ("Chi tiết theo kho"). Không dùng `font-black`. `lint-ratchet`
`offScaleText` đếm cỡ chữ ngoài thang — chỉ được giảm.

**Component lớp Apple:**

| Component | Thay cho | Ghi chú |
|---|---|---|
| `Switch` | ≥ 15 công tắc tự vẽ mỗi nơi một màu | bật `emerald-500`, 44×26, `role="switch"` |
| `Tabs variant="segment"` | — | segmented control, núm trắng trượt, cao 44px trên cảm ứng |
| `Banner` | dải "THÔNG BÁO" chữ chạy, khối cảnh báo tự vẽ | chữ đứng yên ≤ 2 dòng + "Xem thêm" |
| `ListGroup` / `ListRow` | lưới ô màu, thẻ viền màu ở trang cài đặt | inset grouped như app Cài đặt |
| `ActionMenu` | dàn 5–7 nút icon trên thanh/tiêu đề | laptop: menu thả; iPhone: action sheet; mục `destructive` cuối, đỏ |
| `PageActions` (`usePageActions`) | 7 chỗ `createPortal` vào thanh trên | màn khai báo, khung app tự xếp: 1 nút chính + "⋯" |
| `SectionHeader` v2 (`quick` + `actions`) | cụm nút tự xuống dòng | ≤ 2 nút icon + "⋯", luôn một hàng |
| `BusyBar` | lớp chờ phủ kín màn khi tính lại ngầm | vạch 2px, chỉ hiện khi > 300 ms |
| `EmptyState` (icon theo tên) | 4 kiểu "không có dữ liệu" | |
| `usePresence` | `AnimatePresence` của motion | vào/ra bằng CSS — thư viện motion đã gỡ hẳn (GĐ4) |
| `MobileNavBar` + `PageActionsBar` (khung app) | khối thanh trên dựng tay + 7 chỗ portal nút | tiêu đề 17px, nút 44px, ≤ 1 nút chính + 1 nút nhanh + "⋯" |

**Vật liệu mờ** (`.ycx-material`) chỉ cho 3 vùng nhỏ cố định: thanh trên, thanh tab, toast/action sheet. Chuyển động sheet /
núm công tắc / segmented: `cubic-bezier(0.32, 0.72, 0, 1)` (token `--ease-ios`); tôn trọng `prefers-reduced-motion`.
Test: `tests/e2e/lop-apple-gd3.spec.ts` (harness `helpers/appleUiHarness.tsx`).

**Khung app (GĐ4, 2026-10-12)** — iPhone/iPad: thanh trên vật liệu mờ + đường tóc dưới, [‹][ô icon 32px][tiêu đề 17px / dòng phụ
12px] … [nút màn 44px][⋯][chuông 44px]; thanh tab dưới vật liệu mờ cao 56px + vùng thanh Home, icon 24px, mục đang chọn sky-600 trên
viên nền nhạt (không vạch chỉ báo), chưa chọn slate-500; "Khác" là sheet danh sách nhóm (tài khoản → Công cụ → Hệ thống); chuông mở
sheet "Thông báo". Nút nhỏ (32px) ở thanh trên được nới vùng chạm 44px bằng `::after` — cỡ nhìn thấy giữ nguyên. Laptop: logo tròn
bật/tắt dock nổi 56px (nhớ trạng thái), tiêu đề 2 màu IN HOA, cụm nút nhóm dạng viên (thiết kế chủ dự án 2026-10-12).
