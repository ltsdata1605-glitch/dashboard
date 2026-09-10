# DESIGN SYSTEM — "Bảng điều khiển ca trực"

Chuẩn thiết kế của dự án Dashboard YCX, chốt ngày **2026-09-10**.

> **Trạng thái**: thay thế bản cũ (khôi phục từ commit `8675fd05^`). Chuẩn mới áp cho **Report BI
> trước** (Đợt 3), rồi **Phân Tích và các module còn lại** đi theo (Đợt 5). Quy tắc cũ *"lấy module
> Phân Tích làm chuẩn vàng"* **không còn đúng**.
>
> Thứ tự ưu tiên khi mâu thuẫn: `AGENT_RULES.md` > `RULES.md` > **file này**.

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
4. **Không thẻ bo góc.** Bảng và vùng dữ liệu vuông góc, không đổ bóng. Bo góc và bóng nói *"tôi ở
   tầng khác"* — chỉ dành cho thứ thật sự nổi lên trên (modal, dropdown). Đừng nói bừa.

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
| Bo góc — bảng, vùng dữ liệu | `0` | |
| Bo góc — nút, ô nhập | `4px` | ~~6px~~ |
| Bo góc — modal, dropdown | `6px` | ~~12px~~ |
| Chiều cao nút | `30px` | trên điện thoại nâng lên `44px` |
| Đổ bóng | chỉ modal/dropdown | bỏ `shadow-sm` trên mọi khối tĩnh |

**Viền dày `2px` chỉ dùng đúng 2 chỗ trong bảng**: mép phải cột ghim, và đầu mỗi nhóm cột.

---

## 4. COMPONENT DÙNG CHUNG

Mọi phần tử tương tác **bắt buộc** dùng `components/shared/ui/*`. Cấm viết `<button>` thô hoặc tự
dựng modal `fixed inset-0`.

### 4.1 Button — 4 kiểu, hết
`primary` (nền `--accent`) · `secondary` (viền `--line-1`, nền trắng) · `danger` (chữ `--bad`) ·
`icon`. **Không có kiểu "ghost" không viền** — trên nền trắng dày đặc, nút không viền trông như chữ
thường và người dùng không biết bấm được.

### 4.2 Input
Tích hợp sẵn ring focus. Không hardcode class ring cục bộ. Bo `4px`.

### 4.3 Modal (`<Modal />`)
Là thứ **duy nhất** được bo góc `6px` và đổ bóng. Luôn có nút `X` góc trên phải, đóng được bằng `Esc`,
thân dài phải `overflow-y-auto`. Con số trong modal dùng đúng thang màu ngữ nghĩa như trong bảng —
không có bảng màu riêng cho modal.
*(Bản cũ nhắc `<ModalWrapper />` — component đó KHÔNG tồn tại, đừng đi tìm.)*

### 4.4 ConfirmDialog
🔴 **Nghiêm cấm `window.alert` / `window.confirm` / `window.prompt`.** Dùng `<ConfirmDialog />`,
nút xác nhận tác vụ rủi ro truyền biến màu `danger`.

### 4.5 Trạng thái tải
Dùng `<Skeleton />`, không hiển thị chữ "Loading...".

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

## 6. TRÊN ĐIỆN THOẠI — cùng chuẩn, không phải chuẩn thứ hai

Bảng nhiều cột không bóp lại được. Trên màn hẹp, mỗi dòng rút về **tên · số chính · %**, giữ nguyên
vạch trạng thái ở mép. Chữ nâng lên `14.5px`, vùng chạm tối thiểu `44px`. Muốn xem đủ cột thì xoay
ngang — bảng vẫn cuộn được, không chặn.

View nào có toolbar desktop (portal vào `#global-header-actions`) **bắt buộc** có toolbar mobile
`lg:hidden` tương ứng.

Hỗ trợ cảm ứng: không để hover state gây kẹt trên điện thoại. Bảng dài có `.scrollbar-hide` cho cuộn
ngang.
