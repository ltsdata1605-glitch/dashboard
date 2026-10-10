# KẾ HOẠCH — Giao diện chuẩn Apple · Toast thống nhất · Tăng tốc · Gom code dùng chung

> Lập **2026-10-10**. Đầu vào thật, không suy đoán:
> - 2 video quay trên **iPhone 16 Pro Max / Safari** (tổng 206 giây, 23:27–23:30 ngày 10/10/2026) — đã tách từng giây để soi.
> - Đọc mã nguồn: ~150.000 dòng TS/TSX (5 khu vực + `functions/`), toàn bộ khung app, bộ component dùng chung, token, CSS.
> - Đo gói build thật (`npm run build` + sourcemap để biết **file nào** nằm trong gói nào).
> - Đo tốc độ trên **bản build production** (giả lập iPhone 440×956, mạng 4G 9 Mbps/60 ms, CPU chậm 4 lần).
> - Chụp lại 14 màn bằng **tài khoản test thật** (chỉ đọc, mọi lượt ghi cloud bị chặn) ở khung iPhone 16 Pro Max và laptop 1440×900.
>
> File này là **kế hoạch**. Nhật ký thi công từng giai đoạn: `implementation_plan.md` mục *"Giao diện chuẩn Apple (2026-10-10)"*.
>
> **Giữ nguyên mọi quyết định chủ dự án đã chốt**: bảng luôn là bảng (kể cả iPhone) · phông **UTM Avo** + nhãn cột **Roboto Condensed** ·
> **tắt dark mode** · bảng màu **sky / slate / emerald / amber / rose** (+ indigo cho dải xoay vòng) · thang bo góc **(B)** ·
> cỡ chữ nhỏ nhất **11px** · cách ly 5 khu vực (`features/*` không import chéo).

---

## 0. Tóm tắt một phút

**Chẩn đoán.** App không xấu vì thiếu trang trí và không chậm vì thiếu tối ưu lẻ tẻ. Có **ba nguyên nhân gốc**:

1. **Không có "khung" dùng chung cho thanh tiêu đề và hành động.** Mỗi khu vực tự đổ nút vào thanh trên bằng `createPortal`
   (7 nơi). Phân tích đổ **6 nút + chuông vào 440px → nút chồng lên nhau**; Report BI dùng 4 icon không chữ; In Sticker nhét cả
   dải chế độ. Nút **Xoá dữ liệu (đỏ) đứng sát nút Đồng bộ**.
2. **Không có thang chữ.** Đo trên code: **~30 cỡ chữ** khác nhau (8 → 38px), **551** chỗ IN HOA, **351** chỗ `font-black`.
   Mắt không biết đọc gì trước — đó là cảm giác "rối, không sang".
3. **Phản hồi/thông báo mỗi nơi một kiểu.** **451 lời gọi toast trong 79 file**, một `Toaster` đặt **góc dưới-phải** nên trên
   iPhone **toast đè thanh tab**; thêm **4 kiểu toast tự vẽ** + 1 thẻ nổi tự vẽ, icon emoji; tải file xong thì pháo giấy +
   2 toast + lớp chờ "ĐANG XỬ LÝ BỘ LỌC" chặn màn **cùng một lúc**.

**Chiến lược.** Sửa **ở gốc dùng chung** — token + component + khung app trong `components/shared/` — để cả 5 khu vực tự đổi
theo, rồi mới tinh chỉnh phần riêng từng màn. 10 giai đoạn, **mỗi giai đoạn tự đứng được**, có test tự động, deploy ngay khi
xong (CLAUDE.md mục 0.0).

**Mục tiêu đo được khi hoàn tất:**

| Chỉ số | Hiện tại (đo 10/10) | Mục tiêu |
|---|---:|---:|
| JS + CSS phải tải lúc mở app (gzip) | ~465 KB | ≤ 330 KB |
| Khung app hiện (iPhone, 4G, CPU ×4) | 2,0 s | ≤ 1,4 s |
| Nội dung tab Phân tích hiện | 3,4 s (lượt lạnh 5,9 s) | ≤ 2,2 s |
| Chuyển tab → Report BI | 0,73 s | ≤ 0,3 s |
| Chuyển tab → Check thưởng | 2,8 s | ≤ 1,0 s |
| Số cỡ chữ khác nhau | ~30 | 9 (theo thang) |
| Số kiểu toast | 6 | 1 |
| Nút chồng nhau / trang tràn ngang ở 6 khung màn hình | có | **0** — test tự động chặn quay lui |

---

## 1. Đóng vai sếp khó tính — những gì nhìn thấy trong video

Ký hiệu **v1:22** = video 1, giây 22. Mức: 🔴 hỏng hoặc khó chịu ngay · 🟠 thiếu chuyên nghiệp · 🟡 đánh bóng cho "sang".

| # | Màn | Sếp thấy gì | Mức | Bằng chứng | Sửa ở |
|---|---|---|---|---|---|
| 1 | Thanh trên · Phân tích | 7 nút icon dàn ngang 440px, **nút Cài đặt và chuông đè lên nhau**; nút **Xoá (đỏ) đứng sát nút Đồng bộ** — bấm nhầm là mất dữ liệu | 🔴 | v2:003–056, ảnh test | GĐ4 |
| 2 | Toàn app | **Toast ở đáy đè lên thanh tab**; 2 toast chồng nhau + pháo giấy + lớp chờ chặn màn cùng lúc | 🔴 | v1:013, 022, 081, 085 | GĐ1 |
| 3 | Toast | 3 kiểu toast trên cùng một màn (viên trắng; viên xanh lá tự vẽ ở Lịch; thẻ bo ở Thưởng tự động); icon emoji ℹ️ ☁️ ⏰ | 🟠 | v1:027, code | GĐ1 |
| 4 | Bảng *Chi tiết theo kho* | Cột MÃ KHO ghim nhưng **lộ mảnh chữ của cột bên dưới** ("A", "IE", "2") ở mép trái | 🔴 | v1:099–100, v2:003 | GĐ5 |
| 5 | Sheet *Cấu hình dãy thẻ KPI* | Sheet **tràn ngang**: có thanh cuộn ngang, chữ bên phải bị cắt ("Xóa the"); 2 cột trong 1 sheet điện thoại → chật | 🔴 | v1:101–108, v2:001 | GĐ3, GĐ5 |
| 6 | Modal *Cấu hình mục tiêu GTĐH* | Nội dung **bị cắt mép trái** ("gành Hàng"); bàn phím bật lên đẩy mất tiêu đề; tiêu đề **màu đỏ**, nút Lưu **màu hồng** (màu của lỗi/xoá) | 🔴 | v1:048–059 | GĐ3, GĐ5 |
| 7 | Lịch doanh thu | Nút "+" xanh **đè lên** nút chụp ảnh | 🔴 | v2:013–018 | GĐ5 |
| 8 | Tuỳ chỉnh › Từ ngày/Đến ngày | Cho chọn **Từ 17/10 → Đến 16/10**; cả trang trống trơn, không một lời giải thích | 🔴 | v1:064–079 | GĐ5 |
| 9 | Đổi bộ lọc | Mỗi lần đổi lọc hiện lớp **"ĐANG XỬ LÝ BỘ LỌC" chặn cả màn** → cảm giác app chậm | 🔴 | v1:038 | GĐ2 |
| 10 | Mọi tab | Thẻ **"Cài Dashboard YCX như app" to, che nội dung** ngay trên thanh tab | 🟠 | ảnh test 8 tab | GĐ4 |
| 11 | Phân quyền | Nút **"Xoá tất cả dữ liệu" đỏ nằm đầu trang** — việc nguy hiểm nhất lại dễ bấm nhất | 🔴 | ảnh test | GĐ7 |
| 12 | Report BI · thanh trên | 4 icon không chữ (biểu đồ tròn / người / đám mây / chữ "T") — **không ai đoán được** | 🟠 | v2:066–098 | GĐ6 |
| 13 | Tiêu đề khối | IN HOA toàn bộ; cụm nút **lúc cùng dòng, lúc rớt xuống dòng 2** (nút chụp ảnh ở *Hiệu quả doanh thu*) | 🟠 | v2:036–046 | GĐ3, GĐ5 |
| 14 | Chữ | ~30 cỡ chữ; tên khách ở *Chi tiết đơn hàng* **IN HOA 16px**, to gấp rưỡi mọi thứ xung quanh | 🟠 | v1:095–098 | GĐ3, GĐ5 |
| 15 | Nút chính | 6 màu nút chính: xanh, **đen** ("Xem báo cáo"), **hồng** ("Lưu mục tiêu"), **cam** ("Realtime"), **vàng** ("Bấm để in"), xanh lá | 🟠 | v1:008, 048; v2:082; ảnh test | GĐ3, GĐ5–7 |
| 16 | Công tắc | *Hiển thị các khu vực*: mỗi công tắc một màu (xanh / xanh lá / đỏ / cam) | 🟠 | v1:026–031 | GĐ3, GĐ5 |
| 17 | Thanh tab dưới | Chữ 11px xám nhạt (tương phản **2,6 : 1**, dưới chuẩn đọc 4,5 : 1); vạch chỉ báo trên đầu kiểu Android | 🟠 | v2 toàn bộ | GĐ4 |
| 18 | Thông báo đỏ | Dải "THÔNG BÁO" **chữ chạy** liên tục — khó đọc, gây phân tâm | 🟠 | v2:003–012 | GĐ4 |
| 19 | Thẻ KPI | Số phụ bị ngắt dòng "806 / Tr" | 🟠 | v2:003 | GĐ5 |
| 20 | Trạng thái trống | 4 kiểu "Không có dữ liệu" khác nhau trên cùng một trang | 🟠 | v1:073–079 | GĐ3, GĐ5 |
| 21 | Modal *Danh sách nhân viên* | Bảng bị cắt cột MÃ NV ở mép trái, ô tìm kiếm hẹp | 🟠 | v1:034–037 | GĐ5 |
| 22 | Bảng *Khai thác › DCNB* | Ô "-" tô nền hồng/đỏ khắp bảng — rối mắt, trái chuẩn "vạch 3px ở mép" | 🟠 | v2:047–052 | GĐ5 |
| 23 | *Chi tiết đơn hàng* | Thanh công cụ 6 nút, mỗi nút một kiểu (vàng / viền / xanh lá / xanh dương) | 🟠 | v1:095 | GĐ5 |
| 24 | Report BI · khẩu hiệu | "DOANH THU KHÔNG TỰ ĐẾN…", "TÔI KHÔNG CHẠY THEO DOANH THU…" in hoa 2 dòng, bị cắt | 🟡 | v2:066, 082 | GĐ6 |
| 25 | Màn chào | Chữ trộn tiếng Anh "Local Processing • Instant Speed • Smart UI" | 🟡 | v1:013 | GĐ5 |
| 26 | Tải file xong | Pháo giấy — vui nhưng không "sang"; còn kéo thêm 11 KB vào gói khởi động | 🟡 | v1:022, 081 | GĐ2, GĐ5 |
| 27 | Laptop | Tiêu đề trang "PHÂN TÍCH" 36px đen đặc in hoa + vạch xanh; dock nổi bên phải gồm 5 ô vuông 5 màu | 🟡 | ảnh laptop | GĐ4 |
| 28 | Lịch · bộ lọc | 4 ô chọn "08/2026 / Ngành / Nhóm / D.THU" nhỏ và chật | 🟡 | v2:013 | GĐ5 |
| 29 | Thi đua cá nhân | Thẻ nền xanh đặc + huy hiệu 4 màu — khác hẳn ngôn ngữ thiết kế phần còn lại | 🟡 | v2:091–098 | GĐ6 |

---

## 2. "Chuẩn Apple" áp vào dự án này

### 2.1 Bốn nguyên tắc (Apple Human Interface Guidelines, lọc cho dashboard bán lẻ)

1. **Nội dung trước, khung lùi lại** — thanh trên/dưới mảnh, vật liệu mờ; số liệu là nhân vật chính (khớp nguyên tắc gốc của
   dự án *"mỗi pixel dành cho số"*).
2. **Rõ ràng** — một thang chữ 9 bậc, tiêu đề viết thường như câu, **mỗi màn chỉ một hành động chính** mang màu nhấn.
3. **Chiều sâu có ý nghĩa** — chỉ lớp nổi (sheet, menu, toast) có bóng + vật liệu mờ; chuyển động lò xo ngắn.
4. **Nhất quán** — một chức năng = một component = một vị trí, ở cả 5 khu vực, cả iPhone lẫn laptop.

### 2.2 Đổi theo chuẩn Apple (quyết định thiết kế mới — mỗi mục đổi ở **một chỗ dùng chung**, lùi lại dễ)

| Hạng mục | Hiện tại | Chuẩn mới |
|---|---|---|
| Tiêu đề khối | IN HOA, 14–18px, đậm | Viết thường như câu, 17px semibold — "Tổng quan doanh thu" |
| Phụ đề khối | IN HOA xám 11px | 13px thường, xám `ink-2` — "Lọc theo kho: tất cả · chờ xuất 227 Tr" |
| Tiêu đề trang (iPhone) | 14px trong thanh trên | Thanh trên 17px semibold; màn chính có **tiêu đề lớn 28px co lại khi cuộn** |
| Tiêu đề trang (laptop) | 36px `font-black` IN HOA + vạch xanh | 26px bold viết thường, không vạch |
| Hành động ở thanh trên | tới 7 icon | tối đa **1 nút chính + nút "⋯" (menu)** + chuông; **xoá nằm cuối menu, chữ đỏ, luôn hỏi xác nhận** |
| Chuyển chế độ xem | icon không chữ trên thanh trên | **Segmented control** có chữ, ngay dưới tiêu đề |
| Thanh tab dưới | trắng đặc, vạch trên đầu, chữ xám nhạt | vật liệu mờ, icon tô màu nhấn khi chọn, chữ 11px `slate-500`, không vạch |
| Công tắc | mỗi cái một màu | một kiểu iOS, bật = xanh lá `emerald-500` |
| Nút phụ | trắng viền xám | **tinted**: nền xám nhạt `slate-100`, chữ đậm, không viền (vẫn rõ là nút — đúng tinh thần DESIGN_SYSTEM 4.1) |
| Nút nguy hiểm | đỏ đặc, có khi ở đầu trang | đỏ tinted (nền `rose-50`, chữ `rose-600`), đặt cuối nhóm; nút xác nhận cuối trong ConfirmDialog mới đỏ đặc |
| Danh sách cài đặt (Tuỳ chỉnh, menu Khác, Phân quyền, Bot LINE) | lưới ô màu | **inset grouped list** như app Cài đặt: nhóm trắng bo 12px, hàng 44px, kẻ mảnh thụt lề, mũi tên › |
| Toast | góc dưới-phải, 6 kiểu | **một kiểu "viên nang"** như Dynamic Island: iPhone **trên giữa**, laptop **trên phải** |
| Thông báo hệ thống | dải chữ chạy | **Banner tĩnh** 1–2 dòng, chạm để đọc đủ, đóng được |
| Đang tính lại khi đổi lọc | lớp mờ chặn cả màn | **thanh tiến trình mảnh** dưới thanh trên, không chặn thao tác, chỉ hiện nếu > 300 ms |
| Tải file thành công | pháo giấy | toast thành công — không pháo giấy |
| Trạng thái trống | 4 kiểu | một `EmptyState` |
| Tiêu đề modal | có nơi tô đỏ | luôn `ink-1`; màu đỏ chỉ dành cho hộp xác nhận xoá |

### 2.3 Thang chữ 9 bậc (token `--type-*`)

Phông UTM Avo cho mọi thứ, trừ nhãn cột (Roboto Condensed — giữ chuẩn bảng). **Cỡ số trong bảng (13px) và nhãn cột (11px) không đổi**
— bảng nhiều cột không bị ảnh hưởng.

| Token | iPhone | Laptop | Đậm | Dùng cho |
|---|---|---|---|---|
| `large-title` | 28 / 34 | 26 / 32 | 700 | Tiêu đề trang (vùng nội dung) |
| `title` | 20 / 25 | 20 / 25 | 600 | Tiêu đề sheet/modal lớn |
| `headline` | 17 / 22 | 16 / 22 | 600 | Tiêu đề khối, tiêu đề thanh trên |
| `body` | 15 / 20 | 14 / 20 | 400 | Nội dung, ô nhập, nút |
| `subhead` | 13 / 18 | 13 / 18 | 400–600 | Phụ đề, **số trong bảng** |
| `footnote` | 12 / 16 | 12 / 16 | 400 | Chú thích, giờ cập nhật |
| `caption` | 11 / 13 | 11 / 13 | 600 | **Nhãn cột** (IN HOA, Roboto Condensed), nhãn thanh tab |
| `kpi` | 25 / 28 | 25 / 28 | 600, `tabular-nums` | Số thẻ KPI |
| `kpi-lg` | 34 / 38 | 34 / 38 | 600, `tabular-nums` | Một con số nổi bật |

Luật: **IN HOA chỉ cho `caption`**. Không dùng `font-black` (900). `lint-ratchet` thêm chỉ số `offScaleText` (cỡ chữ ngoài thang) —
chỉ được giảm.

### 2.4 Vật liệu, màu, đường kẻ

- Nền app `slate-100` (#f1f5f9 — gần `systemGroupedBackground` #F2F2F7 của iOS). Bề mặt trắng.
- **Vật liệu thanh** (thanh trên, thanh tab, toast): `rgba(255,255,255,.78)` + `backdrop-filter: saturate(180%) blur(20px)`, đường
  tóc `rgba(15,23,42,.08)`. Chỉ đúng 3 vùng nhỏ này dùng blur — ngoại lệ có chủ đích với luật "tắt blur trên mobile cho đỡ pin".
- Màu nhấn `sky-600` (nút chính, tab đang chọn), `sky-700` (liên kết). Đỏ chỉ cho lỗi / xoá / số âm. **Không thêm màu mới.**
- Mực chữ: `ink-1` slate-900 · `ink-2` slate-600 · `ink-3` slate-500 · `ink-4` slate-400 (chỉ placeholder, icon phụ).
- Đường kẻ: giữ 2 cấp của DESIGN_SYSTEM; danh sách trên màn retina dùng đường tóc 0,5px.
- Bóng giữ thang (B): thẻ `shadow-sm`, popup `shadow-lg`, sheet/toast `shadow-xl`.

### 2.5 Khoảng cách, vùng chạm, chuyển động

- Lưới 4/8. Lề trang iPhone 16px; khoảng giữa các khối 24px (iPhone) / 24–32px (laptop).
- **Vùng chạm ≥ 44 × 44** cho mọi thứ bấm được trên thiết bị cảm ứng (Button đã có `pointer-coarse:min-h-11`; mở rộng cho nút icon,
  hàng danh sách, ô trong thanh tab).
- Thanh trên iPhone 44px + safe-area; thanh tab 49px + safe-area (đúng số của iOS); thanh tiêu đề laptop 56px.
- Sheet/toast: lò xo ~280 ms; đóng mờ dần 180 ms. **Chuyển tab tức thì** (như iOS, không trượt). Nhấn nút: đổi nền 100 ms, không nảy.
  Tôn trọng `prefers-reduced-motion`.

---

## 3. Đặc tả component dùng chung — tất cả ở `components/shared/ui/`

> Đây là "một nơi để quản lý" mà chủ dự án yêu cầu. Cả 5 khu vực đã được phép import `components/shared/ui/*` (CLAUDE.md mục 1),
> nên gom về đây không phá luật cách ly.

### 3.1 Toast — `components/shared/ui/toast/`
- **Một API**, giữ tương thích `react-hot-toast` để 451 lời gọi hiện có chạy nguyên:
  `toast(msg)` (= info) · `toast.success` · `toast.error` · `toast.info` *(mới)* · `toast.warning` *(mới)* · `toast.loading` ·
  `toast.promise` · `toast.action({ title, description, actions, duration })` *(mới — thay 5 kiểu tự vẽ)* · `toast.dismiss` ·
  `toast.remove` · `toast.custom` (giữ để tương thích, không khuyến khích).
  Tuỳ chọn: `id` (gộp trùng), `duration`, `description`, `icon` (tên AppIcon). Emoji cũ tự quy đổi: ℹ️→info, ☁️→cloud, ⏰→clock, ⚠️→warning.
- **Hình**: viên nang bo tròn cao 44px khi một dòng; thẻ bo 16px khi có mô tả/nút. Vật liệu mờ + `shadow-xl` + viền tóc. Icon 20px
  theo loại (success `emerald-600`, error `rose-600`, warning `amber-600`, info `sky-600`, loading xoay `sky-600`). Tiêu đề 15px/600
  `ink-1`, mô tả 13px `ink-2` (tối đa 3 dòng). Nút trong toast: chữ màu nhấn 15px/600; nút chính có nền tinted.
- **Vị trí**: màn < 1024px **trên giữa**, cách safe-area-top 8px, rộng tối đa min(92vw, 420px); laptop **trên phải**, dưới thanh tiêu đề.
  **Không bao giờ ở đáy** — không đè thanh tab, không đè vùng thanh Home.
- **Hành vi**: tối đa 3 toast cùng lúc, mới nhất trên cùng, cũ hơn thu nhỏ xếp lớp phía sau (như Trung tâm thông báo iOS); vuốt lên (iPhone) /
  vuốt phải (laptop) để tắt; chạm-giữ hoặc rê chuột thì dừng đếm giờ. Thời gian: success 2,5 s · info 3 s · warning 5 s · error 6 s ·
  action không tự tắt (có "Bỏ qua") · loading tới khi xong.
- **Truy cập**: `role="status"` (error dùng `alert`), VoiceOver đọc được.
- **Chặn quay lui**: ESLint cấm import `react-hot-toast` ngoài thư mục toast; ratchet `iconEmoji` (đã có) chặn emoji trong toast.

### 3.2 Thanh trên iPhone `MobileNavBar` + API hành động `usePageActions()`
- Bố cục: [‹ Về (mini-app toàn màn)] [Tiêu đề 17px semibold / dòng phụ 12px] ……… [Nút chính] [⋯] [Chuông].
- View **không portal DOM** vào `#mobile-topbar-actions` / `#global-header-actions` nữa (7 nơi đang làm), mà gọi
  `usePageActions({ title, subtitle, primary, items })`. `items` = `{ id, label, icon, onSelect, destructive?, section? }`.
  Khung tự xếp: tối đa 2 icon ra ngoài, phần còn lại vào "⋯" → **hết chồng nút ở mọi khu vực, mọi khung màn hình**.
- Laptop dùng cùng dữ liệu để vẽ thanh công cụ có chữ trong `PageHeader`.

### 3.3 `PageHeader` (laptop)
Tiêu đề 26px bold viết thường + dòng phụ; bên phải là thanh công cụ (nút có chữ, nhóm cách nhau bằng khoảng trắng — bỏ kiểu
"viên thuốc lồng viên thuốc"). Dính trên khi cuộn, vật liệu mờ.

### 3.4 `ActionMenu` (nút "⋯")
Laptop: popover bo 12px, `shadow-lg`, hàng 36px có icon trái. iPhone: **action sheet** từ đáy kiểu iOS — nhóm trắng bo 14px, hàng 52px,
chữ 17px; mục nguy hiểm màu đỏ ở nhóm riêng cuối; nút "Huỷ" tách riêng. Esc / chạm nền để đóng; bẫy focus dùng lại `useModalBehavior`.

### 3.5 Thanh tab dưới (làm lại giao diện `MobileBottomNav`, giữ nguyên logic)
Vật liệu mờ, đường tóc trên, cao 49px + safe-area. Icon 24px; đang chọn: `sky-600` + nền chấm nhạt phía sau icon; chưa chọn:
`slate-500` (đạt tương phản). Nhãn 11px/500. Không vạch chỉ báo.

### 3.6 `SegmentedControl` — làm lại biến thể `Tabs variant="segment"` (không thêm component trùng)
Rãnh xám nhạt bo 9px, cao 32px (laptop) / 36px + đệm thành vùng chạm 44px (iPhone); "núm" trắng có bóng nhẹ trượt sang mục chọn (lò xo
250 ms); chữ 13px/600. Dùng cho: Report BI (Siêu thị / Nhân viên / Cập nhật), Doanh thu / Thi đua, Realtime / Luỹ kế,
Ca / Ngày / Tuần / Tháng, chế độ In Sticker…

### 3.7 `Switch`
44 × 26 (vùng chạm 44 × 44), rãnh `slate-300` → `emerald-500` khi bật, núm trắng, lò xo 200 ms, `role="switch"` + `aria-checked`.
Thay mọi công tắc tự vẽ.

### 3.8 `ListGroup` / `ListRow` (inset grouped)
Tiêu đề nhóm 13px `ink-3` viết thường + thẻ trắng bo 12px; hàng ≥ 44px: [icon 18px trong ô màu 28px bo 7px] [nhãn 15px]
[giá trị 15px `ink-3`] [công tắc | ›]; đường tóc thụt lề theo nhãn. Dùng cho menu Khác, Tuỳ chỉnh, Phân quyền, cài đặt Bot LINE.

### 3.9 Sheet (`Modal position="bottom"`) — đầu sheet kiểu iOS + chống tràn
- Thanh nắm 36 × 5; khi truyền `primaryAction`: hàng đầu **[Huỷ] — Tiêu đề 17px ở giữa — [Lưu/Xong đậm]**; còn lại giữ nút ×.
- Thân chỉ cuộn dọc: `overflow-x: hidden` + `min-w-0` cho con flex/grid — **gốc của lỗi #5, #6, #21**.
- Bàn phím iOS: sheet co theo `visualViewport` để ô đang nhập không bị che, tiêu đề không bị đẩy mất (lỗi #6).

### 3.10 `SectionHeader` v2
Tiêu đề `headline` viết thường + phụ đề `subhead`; vùng phải **tối đa 2 icon** (thường là Lọc/Cài đặt + Xuất ảnh), icon thứ 3 trở
đi tự vào "⋯". Luôn một hàng, không bao giờ rớt dòng (lỗi #13).

### 3.11 `Banner`
Nền `rose-50` / `amber-50` / `sky-50`, vạch trái 3px màu ngữ nghĩa, icon 20px, chữ 13px **tĩnh** tối đa 2 dòng + "Xem" để mở đủ;
× ẩn đến khi có nội dung mới. Thay dải chữ chạy (lỗi #18) và các khối cảnh báo tự vẽ.

### 3.12 `EmptyState` (đã có — chuẩn hoá và ép dùng)
Icon 32px trong vòng tròn `slate-100`, tiêu đề 15px/600, mô tả 13px `ink-2`, nút hành động nếu có. Thay 4 kiểu đang tồn tại.

### 3.13 `BusyBar` (mới) + `Overlay kind="busy"` (đã có)
`BusyBar`: thanh 2px màu nhấn chạy dưới thanh trên cho việc tính lại ngầm — **không chặn thao tác**. `Overlay busy` chỉ còn cho việc
thật sự phải chặn (đang ghi file, đang nhập Excel lớn).

### 3.14 `Button` — 5 kiểu
`primary` (sky-600 đặc) · `secondary` (tinted xám) · `tinted` (nền sky-50, chữ sky-700 — hành động phụ quan trọng) · `danger` (tinted
đỏ; riêng nút xác nhận trong ConfirmDialog là đỏ đặc) · `icon`. Ở màn nào được làm lại thì bỏ dần `variant="unstyled"` tự tạo kiểu
(hiện **428** chỗ — nguồn gốc của 6 màu nút chính).

---

## 4. Tốc độ — hiện trạng đo được và việc cần làm

### 4.1 Gói phải tải lúc mở app (bản build 10/10)

| Gói | Thô | Gzip | Thành phần đáng chú ý (đo bằng sourcemap) |
|---|---:|---:|---|
| `index` (gói vào) | 443 KB | 132 KB | `GlobalAutoSyncDock` 28 KB (dock chỉ có trên laptop) · `TampermonkeyInstallGuideContent` 18 KB · **~96 KB code Report BI** (auto sync, thưởng tự động) · `canvas-confetti` 11 KB · `LoginView` + `PendingApprovalView` + `CouponConverterView` 27 KB — **đều không cần lúc mở** |
| `vendor-firebase` | 667 KB | 155 KB | cần cho đăng nhập |
| `vendor-react` | 194 KB | 61 KB | |
| `vendor-motion` | 128 KB | 42 KB | bị kéo vào chỉ vì thanh tab + menu Khác dùng hiệu ứng motion |
| `vendor-icons` | 96 KB | 19 KB | |
| `shared-utils` | 27 KB | 8 KB | tailwind-merge |
| CSS | 408 KB | 48 KB | |
| Google Fonts | 7 họ phông | — | **chặn hiển thị**; 6/7 họ chỉ dùng khi người dùng tự chọn phông khác trong FontSelector |

- Tab Phân tích: `DashboardView` 279 KB; `TrendChart` 326 KB, trong đó **`lunar-javascript` 292 KB (90%)** — chỉ cần cho chế độ *Lịch*
  nhưng đang tải ngay cả khi xem biểu đồ cột mặc định.
- Service worker lần cài đầu tải sẵn **7,9 MB / 71 file** — tranh băng thông với lượt tải đầu trên 4G.
- `public/prevent-pull-to-refresh.js` gắn bộ nghe `touchmove` **không thụ động** lên toàn trang → mọi cú cuộn phải chờ JS.

### 4.2 Đo bản build (chế độ Dùng thử, 440 × 956, 4G 9 Mbps / 60 ms, CPU ×4, trung bình 3 lượt)

| Phép đo | Lượt 1 | Lượt 2 | Lượt 3 | TB |
|---|---:|---:|---:|---:|
| Khung app hiện | 2489 | 1775 | 1758 | **2007 ms** |
| Nội dung Phân tích hiện | 5877 | 2105 | 2212 | **3398 ms** |
| First Contentful Paint | 2352 | 1256 | 1268 | **1625 ms** |
| JS tải | 848 KB | 436 KB | 443 KB | 576 KB |
| Chuyển sang Report BI | 765 | 625 | 808 | **733 ms** |
| Chuyển sang Check thưởng (iframe) | 3154 | 2651 | 2711 | **2839 ms** |
| Chuyển về Phân tích | 423 | 340 | 337 | **367 ms** |

Công cụ đo: `tests/e2e/perf-apple.spec.ts` (GĐ0) — chạy lại sau mỗi giai đoạn để ghi số trước/sau.

### 4.3 Việc tăng tốc (GĐ2) và lợi ích ước tính

| # | Việc | Lợi ích ước tính |
|---|---|---|
| 1 | Gói vào "ăn kiêng": lazy `GlobalAutoSyncDock` (chỉ laptop, sau khi rảnh), `LoginView`, `PendingApprovalView`, `CouponConverterView`; tách code Report BI khỏi gói vào | −60~70 KB gzip lúc mở |
| 2 | `RevenueCalendar` + `lunar-javascript` thành gói riêng, chỉ tải khi mở *Lịch* | tab Phân tích nhẹ hơn ~290 KB thô |
| 3 | Google Fonts: chỉ nạp Roboto Condensed (cần cho nhãn cột) theo kiểu không chặn hiển thị; 6 họ còn lại nạp khi người dùng chọn | bỏ 1 yêu cầu chặn vẽ trang |
| 4 | Bỏ `motion` khỏi đường khởi động (thanh tab / menu Khác dùng CSS transition) | −42 KB gzip lúc mở |
| 5 | Service worker: lúc cài chỉ tải sẵn khung + tab đang dùng; phần còn lại tải ngầm khi máy rảnh | lượt đầu trên 4G không bị tranh băng thông |
| 6 | Tải trước 2 tab của thanh dưới sau khi tab hiện tại vẽ xong + rảnh 2 s; Check thưởng: giữ iframe đã nạp, `prefetch` `check-thuong.html` | chuyển tab ≤ 300 ms; Check thưởng ≤ 1 s |
| 7 | Đổi lọc không chặn: bỏ lớp chờ toàn màn → `BusyBar` (> 300 ms mới hiện), số cũ giữ trên màn đến khi số mới về | hết cảm giác "đứng hình" |
| 8 | Thay JS chống kéo-tải-lại bằng CSS `overscroll-behavior-y: none` (Safari ≥ 16), JS giữ làm dự phòng cho Safari cũ | cuộn mượt hơn |

---

## 5. Các giai đoạn

> Mỗi giai đoạn: **Mục tiêu · Việc (file cụ thể) · Xong khi (đo được) · Test · Rủi ro & cách lùi.**
> Thứ tự đã tính phụ thuộc: GĐ0 tạo lưới an toàn; GĐ1–2 có lợi ngay, ít rủi ro; GĐ3 là nền cho GĐ4–7.

### GĐ0 — Lưới an toàn & mốc đo · *nhỏ*
- **Mục tiêu**: có công cụ tự động bắt mọi lỗi kiểu "nút chồng nút / trang tràn ngang / thứ nổi đè thanh tab" ở 6 khung màn hình,
  và mốc tốc độ để so trước/sau.
- **Việc**
  - `tests/e2e/apple-tuong-thich.spec.ts` — quét các tab chính × 6 khung (iPhone SE 375×667 · iPhone 16 393×852 · **iPhone 16 Pro
    Max 440×956** · iPad 820×1180 · laptop 1366×768 · 1920×1080) ở chế độ Dùng thử: (a) trang không tràn ngang; (b) nút ở thanh
    trên/thanh tab không giao nhau; (c) nút ở 2 thanh ≥ 44px trên cảm ứng; (d) chữ ở 2 thanh ≥ 11px; (e) phần tử `fixed` không đè thanh tab.
  - `tests/e2e/perf-apple.spec.ts` — bản chính thức của phép đo ở 4.2 (chỉ chạy khi `PERF=1`, không phải test pass/fail).
  - Ảnh hiện trạng 14 màn (iPhone + laptop) lưu ở `test-results/` — **không commit** (có dữ liệu thật).
- **Xong khi**: 2 spec chạy được; lỗi đã biết được đánh dấu `test.fail()` kèm số lỗi trong bảng mục 1 → mỗi giai đoạn sau gỡ dần.
- **Rủi ro**: thấp (chỉ thêm test).

### GĐ1 — Toast thống nhất · *vừa* (chủ dự án yêu cầu riêng)
- **Việc**
  1. Tạo `components/shared/ui/toast/`: `toast.ts` (API mục 3.1), `AppToaster.tsx` (vị trí theo khung màn, xếp lớp, vuốt tắt),
     `ToastView.tsx` (giao diện), quy đổi emoji → icon, `toast.test.ts` (test đơn vị).
  2. `App.tsx`: `<Toaster position="bottom-right">` → `<AppToaster />`.
  3. Script `scripts/codemod/toast-import.cjs` đổi import ở **79 file** sang toast dùng chung (đường dẫn tương đối như phong cách
     repo; chạy lại nhiều lần không hỏng).
  4. Gộp 5 kiểu tự vẽ: toast cục bộ của `components/charts/TrendChart.tsx`; 2 thân toast tự vẽ của
     `features/bi-dashboard/components/nhanvien/bonus/AutoBonusToasts.tsx`; `components/shared/ui/ShareRetryToast.tsx`;
     `components/shared/ui/BatchShareToast.tsx`; thẻ nổi "Dữ liệu đám mây mới" trong `components/views/DashboardView.tsx`
     → đều thành `toast.action` / `toast.success`.
  5. ~12 chỗ icon emoji (`hooks/useDataManagement.ts`, `features/khai-thac/KhaiThacView.tsx`, `features/line-bot/hooks/useCouponManager.ts`,
     `features/bi-dashboard/components/DataUpdater.tsx`, `features/sticker-event/services/printService.ts`…) → `toast.info` / `toast.warning`.
  6. `eslint.config.js`: `no-restricted-imports` chặn `react-hot-toast` ngoài thư mục toast.
- **Xong khi**: `npm run check` xanh; e2e `toast-thong-nhat.spec.ts`: ở 440×956 toast nằm **trên giữa**, không giao thanh tab, không
  giao safe-area; ở 1440×900 nằm **trên phải** dưới thanh tiêu đề; 3 toast xếp lớp đúng; vuốt lên tắt được; toast có nút bấm được;
  5 loại đúng icon và màu. Không còn file nào import thẳng `react-hot-toast` ngoài thư mục toast.
- **Rủi ro**: vừa — nhiều nơi dùng `id` để thay toast loading bằng success (`toast.loading` → `toast.success({ id })`) hoặc
  `toast.dismiss(id)` → API bọc giữ **nguyên chữ ký và ngữ nghĩa**, có test đơn vị so hành vi. Lùi: đổi lại 1 dòng trong `App.tsx`.

### GĐ2 — Tăng tốc tải & chuyển tab (phần không đụng giao diện) · *vừa*
- **Việc**: 8 mục ở bảng 4.3. File chính: `App.tsx` (lazy + tải trước tab), `components/layout/GlobalAutoSyncDock.tsx` (tách phần BI,
  lazy), `components/charts/TrendChart.tsx` + `RevenueCalendar.tsx` (lazy lịch), `index.html` + `public/load-fonts.js` (phông không
  chặn), `components/layout/FontSelector.tsx` (nạp phông khi chọn), `components/layout/MobileBottomNav.tsx` (CSS thay motion),
  `scripts/sw-template.js` + `vite.config.ts` (tải sẵn có thứ tự), `hooks/useDataManagement.ts` + `components/common/FilterProcessingOverlay.tsx`
  (lọc không chặn), `public/prevent-pull-to-refresh.js` + `styles.css` (overscroll CSS), `hooks/useFileUploadLogic.ts` (bỏ pháo giấy).
- **Xong khi** (đo bằng `perf-apple.spec.ts`, cùng điều kiện 4.2): gói vào ≤ 330 KB gzip; khung app ≤ 1,4 s; nội dung Phân tích
  ≤ 2,2 s; chuyển Report BI ≤ 0,3 s; Check thưởng ≤ 1,0 s. `offline-app-shell.spec.ts` vẫn xanh (mất mạng vẫn mở được app).
- **Rủi ro**: lazy hoá có thể lộ lỗi "chunk tải hỏng" → đã có `lazyWithRetry` + `reload-on-chunk-error.js`; SW đổi chiến lược tải sẵn
  → giữ nguyên tên cache theo VERSION, test offline chạy lại. Lùi: từng mục một commit riêng.

### GĐ3 — Lớp thiết kế Apple: token + component dùng chung · *vừa–lớn*
- **Việc**
  - `styles/tokens.css`: thang chữ `--type-*` (2.3), vật liệu `--material-*`, đường tóc, lò xo. `styles.css`: lớp `.material-bar`
    (được miễn luật "tắt blur trên mobile"), lớp chữ theo thang.
  - Component mới ở `components/shared/ui/`: `PageActions` (context + `usePageActions`), `ActionMenu`, `Switch`, `ListGroup`/`ListRow`,
    `Banner`, `BusyBar`, `MobileNavBar` (dùng ở khung app).
  - Làm lại: `Tabs variant="segment"` → SegmentedControl; `SectionHeader` v2; `EmptyState`; `Modal` (đầu sheet iOS, chống tràn
    ngang, co theo bàn phím); `Button` (5 kiểu).
  - `DESIGN_SYSTEM.md`: thêm mục "Lớp Apple (2026-10)" — thang chữ, vật liệu, bảng component, ảnh minh hoạ.
  - `scripts/lint-ratchet.cjs`: chỉ số `offScaleText` (cỡ chữ ngoài thang) — chỉ được giảm.
- **Xong khi**: mỗi component có harness e2e (`tests/e2e/helpers/*Harness.tsx`) chụp ở 440×956 và 1440×900; test bàn phím
  (Esc/Tab), vùng chạm ≥ 44px, `role`/`aria` đúng; `npm run check` xanh.
- **Rủi ro**: `SectionHeader`/`Modal`/`Tabs` đang được nhiều nơi dùng → đổi giao diện qua prop mặc định, không đổi chữ ký; chạy lại
  `chuan-thiet-ke-b.spec.ts`, `modal-*.spec.ts`, `xuat-anh-*.spec.ts`.

### GĐ4 — Khung ứng dụng: thanh trên, thanh tab, menu Khác, laptop · *lớn*
- **Việc**
  - `App.tsx`: thanh trên mobile → `MobileNavBar` (vật liệu mờ, tối đa 1 nút chính + ⋯ + chuông); thanh tiêu đề laptop → `PageHeader`.
  - Chuyển **7 nơi portal** sang `usePageActions`: `components/layout/Header.tsx` + `components/filters/FilterBar.tsx` (Phân tích:
    nút chính *Tải YCX*; menu: Đồng bộ đám mây · Mở báo cáo BCNB · Quản lý tệp đã lưu · Tuỳ chỉnh & bộ lọc · Phông chữ ·
    — · **Xoá dữ liệu YCX** đỏ + xác nhận), `features/bi-dashboard/components/BiWrapper.tsx`, `components/views/CheckThuongView.tsx`,
    `features/sticker-event/stickerprinter/StickerModeToolbar.tsx`, `features/phan-ca/components/PhanCaToolbar.tsx`,
    `components/views/settings/SettingsAccountTab.tsx`.
  - `components/layout/MobileBottomNav.tsx`: giao diện thanh tab mới; menu "Khác" thành inset grouped list.
  - `components/layout/Sidebar.tsx`, `GlobalAutoSyncDock.tsx`: dock 5 ô màu → một nhóm nút trung tính (tính năng giữ nguyên).
  - Dải "THÔNG BÁO" chữ chạy (`DashboardView.tsx`, `Header.tsx`) → `Banner`.
  - `components/layout/InstallAppHint.tsx`: thẻ to → dải mảnh 1 dòng + "Xem cách cài" (mở sheet hướng dẫn).
  - `components/layout/NotificationDropdown.tsx`: trên iPhone mở dạng sheet.
- **Xong khi**: `apple-tuong-thich.spec.ts` xanh ở 6 khung cho **mọi tab** (gỡ `test.fail` của lỗi #1, #10, #17, #18); ảnh trước/sau.
- **Rủi ro**: chạm cả 5 khu vực → mỗi khu vực chuyển sang `usePageActions` **một commit riêng**; test các luồng đang dùng nút
  thanh trên (`ios-report-bi-check-thuong.spec.ts`, `icon-dieu-huong.spec.ts`, `menu-khac-xoay-ngang.spec.ts`…).

### GĐ5 — Phân tích YCX (màn dùng nhiều nhất) · *lớn*
- **Việc**
  - Tiêu đề khối theo `SectionHeader` v2 ở: `components/kpis/KpiCards.tsx`, `components/summary/WarehouseSummary.tsx`,
    `components/charts/TrendChart.tsx`, `components/charts/IndustryGrid.tsx`, `components/employees/*`, `components/tables/SummaryTable.tsx`,
    `components/pivot/PivotTable.tsx`.
  - Sửa lỗi: #4 cột ghim lộ chữ (`WarehouseSummary` + CSS `table-pin-first`), #7 nút đè nhau ở Lịch, #19 KPI ngắt dòng, #22 ô tô nền
    hồng → vạch 3px, #28 bộ lọc lịch.
  - Tuỳ chỉnh (`components/filters/FilterSection.tsx`): inset grouped list + `Switch`; **kiểm khoảng ngày** (Từ ≤ Đến; chọn ngược
    thì tự đảo và báo bằng toast) — lỗi #8.
  - Modal: `components/kpis/modals/KpiCardConfigModal.tsx` (2 cột → danh sách + màn chi tiết đẩy sang, hết tràn — #5),
    `components/modals/GtdhTargetModal.tsx` (#6), `components/modals/EmployeeManagerModal.tsx` (#21),
    `components/modals/UnshippedOrdersModal.tsx` + `UncollectedOrdersModal.tsx` (thanh công cụ 1 nút chính + ⋯, chữ đúng thang — #14, #23).
  - `components/views/LandingPageView.tsx`: chữ Việt hoá (#25), `EmptyState` thống nhất (#20).
- **Xong khi**: các lỗi #4–8, #13–16, #19–23, #25, #28 có test e2e hoặc ảnh trước/sau xác nhận; xuất ảnh (`xuat-anh-*.spec.ts`)
  vẫn xanh; số liệu không đổi (cùng file → cùng tổng doanh thu/DTQĐ).
- **Rủi ro**: khối Phân tích được xuất ảnh → ảnh xuất đổi theo giao diện mới; nếu chủ dự án muốn ảnh giữ kiểu cũ thì giữ bằng preset
  của `components/shared/export`.

### GĐ6 — Report BI · *vừa–lớn*
- **Việc**: `features/bi-dashboard/components/BiWrapper.tsx` (segmented *Siêu thị / Nhân viên / Cập nhật* thay 4 icon — #12; phông
  chữ vào menu ⋯); tiêu đề và thanh công cụ từng khối (Doanh thu, Thi đua, Ngành hàng, Nhân viên, Thưởng…) theo `SectionHeader` v2;
  khẩu hiệu in hoa → dòng phụ ngắn viết thường (#24); thẻ thi đua cá nhân theo ngôn ngữ chung (#29); nút "Realtime" cam → segmented;
  toggle trong popover "Tuỳ chỉnh hiển thị cột" → `Switch`. Giữ `biDensity.css` (mật độ gọn) và quy tắc bảng vuông.
- **Xong khi**: các spec `bi-*` hiện có xanh; ảnh trước/sau 3 khung; `apple-tuong-thich` xanh cho tab Report BI.
- **Rủi ro**: Report BI có nhiều luồng tự động (userscript, auto sync) bám theo chữ/nút trên giao diện → chỉ đổi phần trình bày,
  giữ nguyên `data-testid`/nhãn mà luồng tự động đọc; chạy toàn bộ `bi-sync-*.spec.ts`.

### GĐ7 — Các mini-app còn lại · *lớn (chia nhỏ theo khu vực)*
Mỗi khu vực một đợt, cùng một khuôn: `PageActions` + `SegmentedControl` + `ListGroup` + `Switch` + nút chính màu nhấn + toast chung.
- **Báo cáo khai thác** (`features/khai-thac/*`): biểu mẫu thành nhóm danh sách; bộ đếm −/+ chuẩn 44px.
- **In Sticker** (`features/sticker-event/*`): dải chế độ thành segmented ở hàng thứ hai (không nhét vào thanh trên); nút "Bấm để in"
  vàng → nút chính chuẩn (giữ màu vàng nếu là màu thương hiệu tem — hỏi lại chủ dự án).
- **Phân ca** (`features/phan-ca/*`): thanh công cụ → `usePageActions`; chip chọn tháng/siêu thị → hàng danh sách.
- **Bot LINE** (`features/line-bot/*`): thẻ viền màu → inset grouped; tab Coupon Event / Coupon Lọc / Gửi Notify / Chat → segmented cuộn ngang.
- **Tính thuế** (`features/tax-calculator/*`), **Rút gọn coupon** (`CouponConverterView.tsx`), **So sánh giá** (`PriceComparisonView.tsx`).
- **Phân quyền** (`UserManagementView.tsx`, `SettingsView`): "Xoá tất cả dữ liệu" xuống nhóm *Vùng nguy hiểm* cuối trang (#11).
- **Đăng nhập / Chờ duyệt / Giới thiệu** (`LoginView`, `PendingApprovalView`, `AboutView`).
- **Check thưởng** (`public/check-thuong.html` chạy trong iframe): đồng bộ màu, chữ, toast theo token (bản HTML riêng nên làm phần nhẹ).
- **Xong khi**: spec hiện có của từng khu vực xanh; `apple-tuong-thich` xanh cho mọi tab; ảnh trước/sau.
- **Rủi ro**: In Sticker / Phân ca có CSS phạm vi riêng (`phanca.css`, preview tem) → không đụng phần in/tem; chỉ đổi khung và điều khiển.

### GĐ8 — Dọn & gom code về một nơi · *vừa*
Bản đồ "trước → sau" (mọi đích đều nằm trong `components/shared/`, nơi cả 5 khu vực được phép dùng):

| Đang rải rác | Về đâu |
|---|---|
| `react-hot-toast` gọi thẳng ở 79 file + 5 kiểu tự vẽ | `components/shared/ui/toast/` (GĐ1) |
| `components/common/MultiSelectDropdown.tsx` (8 nơi dùng) + `shared/ui/MultiSelectDropdown.tsx` (5 nơi) — 2 bản gần giống nhau | một bản ở `shared/ui` |
| `components/common/SearchableSelect.tsx`, `SingleSelectDropdown.tsx` | `shared/ui/Select` (biến thể tìm kiếm) |
| `components/common/SkeletonLoader.tsx` | `shared/ui/Skeleton` |
| `LoadingOverlay`, `ProcessingLoader`, `ExportLoader`, `FilterProcessingOverlay` | `shared/ui/BusyBar` + `Overlay kind="busy"` |
| Công tắc tự vẽ (≥ 10 nơi) | `shared/ui/Switch` |
| Thanh hành động portal (7 nơi) | `shared/ui/PageActions` |
| 4 file "trung chuyển" `*/services/uiService.ts` (chỉ re-export) | import thẳng `components/shared/export` |
| Dải thông báo đỏ (2 nơi) | `shared/ui/Banner` |
| Trạng thái trống 4 kiểu | `shared/ui/EmptyState` |
| Danh mục "cái gì dùng chung, dùng khi nào" | `components/shared/README.md` (mới) |

Kèm luật chặn quay lui: ESLint cấm import các file cũ đã gom; ratchet thêm chỉ số cho `variant="unstyled"` ở màn đã làm lại;
cập nhật `CLAUDE.md` / `RULES.md` / `DESIGN_SYSTEM.md`.
- **Xong khi**: `components/common/` chỉ còn thứ đặc thù Phân tích (hoặc trống); `npm run check` xanh; không file nào import bản cũ.

### GĐ9 — Kiểm thử tương thích 100% & bàn giao · *vừa*
- `apple-tuong-thich.spec.ts` + `toast-thong-nhat.spec.ts` thêm vào job **`e2e-webkit`** của CI (engine của Safari) — container chỉ có
  Chromium giả lập iPhone, WebKit thật chạy ở CI.
- Tour tài khoản test thật (chỉ đọc) qua mọi tab ở 440×956 và 1440×900, chụp ảnh trước/sau từng màn.
- Đo lại `perf-apple.spec.ts`, ghi bảng trước/sau vào `implementation_plan.md`.
- **Checklist cho chủ dự án trên iPhone thật** (những gì máy ảo không kiểm được): bàn phím ảo trong sheet, vuốt tắt toast/sheet,
  Dynamic Island không che toast, cài lên Màn hình chính và mở lại, xoay ngang bảng nhiều cột.

---

## 6. Quy trình bắt buộc ở MỖI giai đoạn

1. Commit trạng thái trước khi sửa (CLAUDE.md mục 0.1); ghi mục giai đoạn vào `implementation_plan.md`.
2. Sửa code — chỉ trong phạm vi giai đoạn.
3. `npm run check` (typecheck + eslint + unit + build + ratchet) + e2e của giai đoạn + `apple-tuong-thich`.
4. Ảnh trước/sau ở 440×956 và 1440×900 bằng tài khoản test thật (chỉ đọc).
5. Commit → push nhánh → merge `main` → push → `npm run build` → `gh-pages -d dist` → `curl https://dashboard.pro.vn` xác nhận
   `assets/index-*.js` và `sw.js` (`ycx-shell-<VERSION>`) là bản mới.
6. Báo cáo: file đã sửa, lý do, rủi ro, cách kiểm tra, **kết quả test thật**.

## 7. Rủi ro tổng và cách lùi

| Rủi ro | Cách giảm | Cách lùi |
|---|---|---|
| Đổi khung app ảnh hưởng 5 khu vực cùng lúc | GĐ0 có test quét 6 khung trước khi đổi; mỗi khu vực một commit | `git revert` từng commit |
| Đổi thang chữ làm vỡ bảng nhiều cột | Không đổi cỡ số (13px) và nhãn cột (11px); chỉ đổi tiêu đề/phụ đề/nút | token ở 1 chỗ |
| Ảnh xuất đổi theo giao diện mới | chạy lại `xuat-anh-*.spec.ts`; giữ kiểu cũ bằng preset nếu chủ dự án muốn | preset `components/shared/export` |
| Luồng tự động (userscript, auto sync) bám vào nút/chữ | giữ nguyên `data-testid`, nhãn, sự kiện; chạy `bi-sync-*`, `ycx-tu-dong-*` | — |
| Blur tốn GPU trên máy yếu | chỉ 3 vùng nhỏ cố định; một biến CSS tắt nhanh | đổi 1 token |
| Máy ảo ≠ iPhone thật | WebKit ở CI + checklist iPhone thật cho chủ dự án | — |

## 8. Mặc định đã chọn (chủ dự án đổi được bất cứ lúc nào — mỗi mục nằm ở một chỗ)

1. Tiêu đề viết thường như câu thay cho IN HOA (đổi ở `SectionHeader` + token).
2. Toast **trên giữa** (iPhone) / **trên phải** (laptop).
3. Bỏ pháo giấy khi tải file thành công.
4. Nút phụ kiểu tinted xám, không viền.
5. Công tắc bật màu xanh lá (chuẩn iOS) thay vì mỗi cái một màu.
6. Laptop: tiêu đề trang 26px viết thường thay 36px in hoa.
